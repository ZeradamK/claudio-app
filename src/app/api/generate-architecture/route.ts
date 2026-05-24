import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { generateArchitectureWithCohere } from '@/ai/flows/claude-architecture-generator';
import { Architecture, saveArchitecture } from '@/store/architecture-store';
import { withRetry } from '@/utils/retry';
import { getAwsIconPath, getBaseServiceName } from '@/utils/awsIconMapper';
import { jsonrepair } from 'jsonrepair';
import { cohere } from '@/lib/cohere';

// System prompt for node details generation
const SYSTEM_PROMPT = `You are a cloud architecture assistant helping developers understand and implement infrastructure components. For each node in the architecture diagram, provide a rich, context-specific response based on the node's function, service type, and its role in the architecture prompt.

You must return a valid JSON object with the following structure:
{
  "summary": "string",
  "costEstimation": {
    "monthly": {
      "low": "$10/mo",
      "medium": "$80/mo",
      "high": "$250/mo"
    },
    "pricingNotes": "string"
  },
  "resilience": {
    "scaling": "string",
    "failover": "string"
  },
  "cdk": {
    "language": "typescript",
    "code": "string"
  },
  "sdk": {
    "language": "python",
    "code": "string"
  },
  "terraform": {
    "code": "string"
  },
  "security": {
    "recommendations": ["string"]
  },
  "integration": {
    "connectedTo": ["string"],
    "protocols": ["string"]
  }
}`;

// Define types for nodes and edges
interface NodeData {
  label: string;
  service: string;
  description?: string;
  estCost?: string;
  faultTolerance?: string;
  layer?: string;
  domain?: string;
  [key: string]: any;
}

interface Position {
  x: number;
  y: number;
}

interface Node {
  id: string;
  type: string;
  position: Position;
  data: NodeData;
  style?: Record<string, any>;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  label?: string;
  data?: Record<string, any>;
  style?: Record<string, any>;
}

type CloudProvider = 'aws' | 'azure' | 'gcp';

interface ArchitectureData {
  nodes: Node[];
  edges: Edge[];
  [key: string]: any;
}

// Helper function to get a random pastel color
function getRandomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 80%)`;
}

// Function to detect cloud provider from prompt
function detectCloudProviderFromPrompt(prompt: string): CloudProvider {
  const lowerPrompt = prompt.toLowerCase();
  
  // Check for Azure keywords
  if (lowerPrompt.includes('azure') || lowerPrompt.includes('microsoft')) {
    return 'azure';
  }
  
  // Check for GCP keywords
  if (lowerPrompt.includes('gcp') || lowerPrompt.includes('google cloud')) {
    return 'gcp';
  }
  
  // Default to AWS
  return 'aws';
}

// Function to validate LLM output structure
function validateLLMOutput(data: any): boolean {
  try {
    // Check basic structure
    if (!data || typeof data !== 'object') return false;
    if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) return false;
    
    // Validate nodes
    for (const node of data.nodes) {
      if (!node.id || !node.data || !node.data.label || !node.data.service) {
        return false;
      }
    }
    
    // Validate edges
    for (const edge of data.edges) {
      if (!edge.id || !edge.source || !edge.target) {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}

// Enhanced JSON cleaning function with better error handling
function cleanAndValidateJSON(input: string): string {
  let jsonString = input;
  try {
    // First, try to find JSON object in the string
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }

    // Remove any markdown code block indicators
    jsonString = jsonString.replace(/```json\n?|\n?```/g, '');
    
    // Remove any trailing commas before closing brackets
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');

    // Fix common JSON formatting issues
    jsonString = jsonString
      .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3') // Add quotes to property names
      .replace(/(\w+)(\s*:)/g, '"$1"$2') // Add quotes to any remaining unquoted property names
      .replace(/'/g, '"') // Replace single quotes with double quotes
      .replace(/(\w+):/g, '"$1":') // Ensure property names are quoted
      .replace(/"\s+"/g, '", "') // Fix spacing between array items
      .replace(/"\s*}\s*"/g, '"}') // Fix object endings
      .replace(/"\s*]\s*"/g, '"]') // Fix array endings
      .replace(/\n/g, ' ') // Remove newlines
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // Use jsonrepair as a last step
    jsonString = jsonrepair(jsonString);
    
    // Validate the JSON structure
    const parsed = JSON.parse(jsonString);
    
    // Ensure required fields exist
    if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
      throw new Error('Missing or invalid nodes array');
    }
    if (!parsed.edges || !Array.isArray(parsed.edges)) {
      throw new Error('Missing or invalid edges array');
    }

    // Validate node structure
    parsed.nodes.forEach((node: any, index: number) => {
      if (!node.id || !node.data || !node.position) {
        throw new Error(`Invalid node structure at index ${index}`);
      }
    });

    // Validate edge structure
    parsed.edges.forEach((edge: any, index: number) => {
      if (!edge.id || !edge.source || !edge.target) {
        throw new Error(`Invalid edge structure at index ${index}`);
      }
    });
    
    return jsonString;
  } catch (error) {
    console.error('Error cleaning JSON:', error);
    console.error('Original input:', input);
    console.error('Cleaned JSON string:', jsonString);
    
    // Return a minimal valid JSON structure instead of throwing
    return JSON.stringify({
      nodes: [],
      edges: [],
      metadata: {
        error: 'Failed to parse architecture JSON',
        originalError: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
}

// Helper to normalize service names (consistent with frontend utils)
function normalizeServiceNameForDomain(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/^(amazon |aws )/i, '')
    .replace(/service$/, '')
    .replace(/[^a-z0-9\\-]/g, '')
    .trim();
}

// Function to determine AWS domain based on service name
function determineDomainForService(serviceName?: string): string {
  const defaultDomain = 'Other';
  if (!serviceName) return defaultDomain;

  const baseService = getBaseServiceName(serviceName) || serviceName;
  const normalizedService = baseService.toLowerCase();

  // Map services to domains
  const domainMappings: Record<string, string[]> = {
    'Compute': ['ec2', 'lambda', 'ecs', 'eks', 'fargate', 'batch', 'app runner', 'elastic beanstalk'],
    'Storage': ['s3', 'ebs', 'efs', 'fsx', 'glacier', 'storage gateway'],
    'Database': ['rds', 'dynamodb', 'aurora', 'elasticache', 'neptune', 'documentdb', 'timestream', 'keyspaces', 'memorydb'],
    'Networking': ['vpc', 'route 53', 'cloudfront', 'api gateway', 'elb', 'direct connect', 'cloud wan', 'privatelink'],
    'Security': ['iam', 'cognito', 'waf', 'shield', 'guardduty', 'kms', 'secrets manager', 'certificate manager'],
    'Integration': ['sns', 'sqs', 'eventbridge', 'step functions', 'appsync', 'mq'],
    'Analytics': ['redshift', 'athena', 'emr', 'kinesis', 'glue', 'quicksight', 'opensearch'],
    'AI/ML': ['sagemaker', 'rekognition', 'comprehend', 'polly', 'lex', 'personalize', 'forecast', 'textract'],
    'Management': ['cloudwatch', 'cloudtrail', 'config', 'systems manager', 'organizations', 'control tower', 'service catalog'],
    'Developer Tools': ['codepipeline', 'codebuild', 'codecommit', 'codedeploy', 'x-ray', 'cloud9', 'codestar'],
    'Migration': ['dms', 'sms', 'migration hub', 'datasync', 'transfer family'],
    'Media': ['medialive', 'mediapackage', 'mediastore', 'mediaconvert', 'mediatailor', 'elastic transcoder'],
    'AR/VR': ['sumerian', 'robomaker'],
    'Quantum': ['braket'],
    'Satellite': ['ground station'],
    'Financial': ['billing', 'cost explorer', 'budgets', 'savings plans', 'reserved instance']
  };

  for (const [domain, services] of Object.entries(domainMappings)) {
    if (services.some(service => normalizedService.includes(service))) {
      return domain;
    }
  }

  return defaultDomain;
}

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { prompt, cloudProvider: explicitCloudProvider } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { 
          error: 'validation_error',
          message: 'Invalid request: prompt is required',
          description: 'Please provide a valid prompt to generate the architecture.'
        },
        { status: 400 }
      );
    }

    // Determine the cloud provider - either use explicit or detect from prompt
    const cloudProvider: CloudProvider = explicitCloudProvider || detectCloudProviderFromPrompt(prompt);
    console.log(`Using cloud provider: ${cloudProvider} for prompt: "${prompt}"`);

    // Adjust the prompt based on cloud provider
    let adjustedPrompt = prompt;
    if (cloudProvider === 'azure') {
      adjustedPrompt = `Design a Microsoft Azure architecture for: ${prompt}`;
    } else if (cloudProvider === 'gcp') {
      adjustedPrompt = `Design a Google Cloud Platform (GCP) architecture for: ${prompt}`;
    } else {
      adjustedPrompt = `Design an AWS architecture for: ${prompt}`;
    }

    try {
      // Generate architecture with retries
      const result = await withRetry(
        async () => {
          const genResult = await generateArchitectureWithCohere({
            problemStatement: adjustedPrompt,
            cloudProvider,
            complexity: 'medium'
          });

          // Clean and validate the JSON
          const cleaned = cleanAndValidateJSON(genResult.architectureSuggestion);
          const parsed = JSON.parse(cleaned);
          
          if (!validateLLMOutput(parsed)) {
            throw new Error('Invalid LLM output structure from AI');
          }

          // Ensure nodes in parsed data have a domain, if not provided by LLM
          if (parsed.nodes && Array.isArray(parsed.nodes)) {
            parsed.nodes = parsed.nodes.map((node: any) => {
              if (node.data && !node.data.domain) {
                node.data.domain = determineDomainForService(node.data.service || node.data.label);
              }
              return node;
            });
          }

          return {
            ...genResult,
            architectureSuggestion: JSON.stringify(parsed) // Return the potentially modified parsed data as string
          };
        },
        {
          maxAttempts: 4,
          initialDelay: 2000,
          maxDelay: 15000,
          factor: 2,
          shouldRetry: (error) => {
            const errorMessage = error?.message?.toLowerCase() || '';
            return errorMessage.includes('json') || 
                   errorMessage.includes('parse') || 
                   errorMessage.includes('invalid') ||
                   errorMessage.includes('failed to fetch') ||
                   errorMessage.includes('network');
          }
        }
      );

      console.log(`Architecture generated using: ${result.provider}, rationale: ${result.rationale ? result.rationale.substring(0,50) : 'N/A'}...`);

      // Parse the JSON architecture from the AI response
      let architectureData: ArchitectureData;
      try {
        let jsonString = result.architectureSuggestion; // This is now the stringified parsed (and potentially domain-enriched) data
        
        // No need to call cleanAndValidateJSON again if it was done reliably in retry block
        // console.log("Final JSON string for parsing:", jsonString.substring(0, 100) + "...");
        
        architectureData = JSON.parse(jsonString) as ArchitectureData;
        
        // Final processing of nodes and edges (including ensuring domain again just in case)
        architectureData = await processArchitectureData(architectureData);
        
      } catch (parseError: any) {
        console.error('Error parsing final AI response:', parseError);
        return NextResponse.json(
          {
            error: 'parsing_error',
            message: 'Unable to process the final architecture data',
            description: 'Our servers encountered an issue interpreting the AI response. Please try again.'
          },
          { status: 500 }
        );
      }

      // Generate a unique ID for this architecture
      const id = uuidv4();

      // Extract rationale from the response
      let rationale = result.rationale;
      // Rationale might also be part of the architectureSuggestion if not separated by LLM
      const rationaleMatchInSuggestion = result.architectureSuggestion.match(/<rationale>([\s\S]*?)<\/rationale>/);
      if (!rationale && rationaleMatchInSuggestion) {
        rationale = rationaleMatchInSuggestion[1].trim();
      }

      // Create the architecture object
      const newArchitecture: Architecture = {
        nodes: architectureData.nodes,
        edges: architectureData.edges,
        metadata: {
          prompt,
          rationale: rationale || 'No rationale provided by AI.',
          timestamp: new Date().toISOString(),
          cloudProvider,
          generatedBy: result.provider
        }
      };

      // Store the architecture data
      await saveArchitecture(id, newArchitecture, 'Generator');

      console.log(`Generated ${cloudProvider} architecture with ID: ${id} using ${result.provider}`);

      // Return the ID to the client
      return NextResponse.json({ 
        architectureId: id,
        provider: result.provider
      });
      
    } catch (genError: any) {
      console.error('Error generating architecture:', genError);
      // Check if it's a RetryError to provide more specific feedback
      const isRetryError = genError.name === 'RetryError';
      const genErrorMessage = isRetryError ? 
        `AI failed to generate valid architecture after ${genError.attempts} attempts. Last error: ${genError.lastError?.message}` :
        genError.message;

      return NextResponse.json(
        {
          error: 'generation_error',
          message: 'Failed to generate architecture',
          description: isRetryError ? `Our AI service struggled to create a valid diagram. Please try simplifying your prompt or try again later. (Details: ${genErrorMessage})` : `Our AI service is temporarily unavailable. Please try again later. (Details: ${genErrorMessage})`
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in generate-architecture API:', error);
    return NextResponse.json(
      {
        error: 'server_error',
        message: error.message || 'An unexpected error occurred',
        description: 'Please try again later. If the problem persists, contact support.'
      },
      { status: 500 }
    );
  }
}

// Function to process and enhance architecture data
async function processArchitectureData(data: ArchitectureData): Promise<ArchitectureData> {
  // Process nodes
  const processedNodes = await Promise.all(data.nodes.map(async node => {
    // Add icon for AWS services
    if (node.data.service) {
      const baseService = getBaseServiceName(node.data.service) || node.data.service;
      const iconUrl = await getAwsIconPath(baseService);
      if (iconUrl) {
        node.data.icon = iconUrl;
      }
    }

    // Add layer information if not present
    if (!node.data.layer) {
      node.data.layer = determineDomainForService(node.data.service);
    }

    // Generate node details upfront
    try {
      const response = await cohere.chat({
        message: `
Architecture prompt: "${data.metadata?.prompt || ''}"
Node details:
- ID: ${node.id}
- Service: ${node.data.service}
- Function in diagram: "${node.data.description || node.data.label}"
- Connected to: ${data.edges
  .filter(edge => edge.source === node.id || edge.target === node.id)
  .map(edge => {
    const connectedNode = data.nodes.find(n => 
      n.id === (edge.source === node.id ? edge.target : edge.source)
    );
    return connectedNode?.data.service || connectedNode?.data.label;
  })
  .join(', ')}

Generate a detailed response about this node's role, implementation, and best practices. Include realistic cost estimations, security recommendations, and implementation examples.
Return ONLY the JSON object without any markdown code blocks or additional formatting.`,
        preamble: SYSTEM_PROMPT,
        temperature: 0.7,
        connectors: [{ id: "web-search" }]
      });

      // Clean the response text by removing markdown code blocks if present
      let cleanedText = response.text.replace(/```json\n|\n```/g, '');
      
      // Try to parse the JSON, if it fails, use jsonrepair
      try {
        const nodeDetails = JSON.parse(cleanedText);
        node.data.details = nodeDetails;
      } catch (parseError) {
        console.warn(`Initial JSON parse failed for node ${node.id}, attempting repair...`);
        const repairedJson = jsonrepair(cleanedText);
        node.data.details = JSON.parse(repairedJson);
      }
    } catch (error) {
      console.error(`Error generating details for node ${node.id}:`, error);
      // Set default details if generation fails
      node.data.details = {
        summary: `${node.data.service} service in the architecture`,
        costEstimation: {
          monthly: {
            low: "Varies",
            medium: "Varies",
            high: "Varies"
          },
          pricingNotes: "Cost depends on usage patterns"
        },
        resilience: {
          scaling: "Auto-scaling available",
          failover: "Depends on configuration"
        },
        security: {
          recommendations: ["Follow AWS security best practices"]
        },
        integration: {
          connectedTo: [],
          protocols: []
        }
      };
    }

    // Add default styling
    node.style = {
      ...node.style,
      background: getRandomColor(),
      border: '2px solid #000',
      borderRadius: '8px',
      padding: '10px',
    };

    return node;
  }));

  // Process edges
  const processedEdges = data.edges.map(edge => ({
    ...edge,
    type: 'smoothstep',
    animated: false,
    style: {
        stroke: '#000000',
      strokeWidth: 2,
    },
  }));

  return {
    ...data,
    nodes: processedNodes,
    edges: processedEdges,
  };
} 