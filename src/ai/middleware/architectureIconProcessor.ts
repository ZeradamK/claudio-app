import { resolveServiceIcon } from '@/utils/iconResolver';
import { Node, Edge } from 'reactflow';
import { jsonrepair } from 'jsonrepair';

export interface ProcessedArchitecture {
  nodes: Node[];
  edges: Edge[];
  iconStats?: {
    totalNodes: number;
    nodesWithIcons: number;
    iconSources: Record<string, number>;
  };
}

/**
 * Process architecture JSON from LLM to ensure all nodes have proper icons and AWS-style positioning
 */
export async function processArchitectureWithIcons(
  architecture: { nodes: Node[]; edges: Edge[] },
  cloudProvider: string = 'aws'
): Promise<ProcessedArchitecture> {
  const iconStats = {
    totalNodes: architecture.nodes.length,
    nodesWithIcons: 0,
    iconSources: {
      direct: 0,
      catalog: 0,
      search: 0,
      fallback: 0
    }
  };

  // Process nodes in parallel for better performance
  const processedNodes = await Promise.all(
    architecture.nodes.map(async (node) => {
      // Skip if node already has a valid icon from our catalog
      if (node.data.icon && node.data.icon.startsWith('/icons/aws-icons/')) {
        iconStats.nodesWithIcons++;
        iconStats.iconSources.direct++;
        return node;
      }

      // Resolve icon for this node
      const iconResult = await resolveServiceIcon(
        node.data.service || node.data.label,
        node.data.label,
        cloudProvider
      );

      // Determine AWS layer for proper positioning
      const layer = node.data.layer || determineAWSLayer(node.data.service || node.data.label);

      // Update node with resolved icon and AWS styling
      const updatedNode = {
        ...node,
        type: 'awsService', // Ensure correct node type
        data: {
          ...node.data,
          icon: iconResult.iconUrl,
          iconConfidence: iconResult.confidence,
          iconSource: iconResult.source,
          layer: layer,
          service: iconResult.serviceName || node.data.service
        }
      };

      // Update stats
      if (iconResult.iconUrl && iconResult.iconUrl !== '/icons/aws-icons/aws-generic.svg') {
        iconStats.nodesWithIcons++;
      }
      iconStats.iconSources[iconResult.source]++;

      return updatedNode;
    })
  );

  // Apply AWS-style positioning
  const positionedNodes = applyAWSArchitecturePositioning(processedNodes);

  // Validate and enhance edges with AWS styling
  const enhancedEdges = enhanceEdgesWithAWSStyle(architecture.edges, positionedNodes);

  return {
    nodes: positionedNodes,
    edges: enhancedEdges,
    iconStats
  };
}

/**
 * Apply AWS-style layered positioning following real AWS architecture patterns
 */
function applyAWSArchitecturePositioning(nodes: Node[]): Node[] {
  // AWS Architecture Layers with proper Y positioning and spacing
  const awsLayers = {
    'internet': { y: 50, color: '#E3F2FD', maxNodesPerRow: 4 },
    'public-subnet': { y: 200, color: '#E8F5E8', maxNodesPerRow: 4 },
    'private-subnet': { y: 400, color: '#FFF3E0', maxNodesPerRow: 4 },
    'database': { y: 600, color: '#F3E5F5', maxNodesPerRow: 4 },
    'security': { y: 800, color: '#FFEBEE', maxNodesPerRow: 4 },
    'management': { y: 950, color: '#F1F8E9', maxNodesPerRow: 4 },
    'other': { y: 400, color: '#F5F5F5', maxNodesPerRow: 4 }
  };

  // Ensure every node has a valid layer
  nodes.forEach(node => {
    if (!node.data.layer) {
      node.data.layer = determineAWSLayer(node.data.service || node.data.label);
    }
  });

  // Group nodes by layer
  const nodesByLayer: Record<string, Node[]> = {};
  nodes.forEach(node => {
    const layer = node.data.layer || 'other';
    if (!nodesByLayer[layer]) nodesByLayer[layer] = [];
    nodesByLayer[layer].push(node);
  });

  // Position nodes within each layer
  const positionedNodes = nodes.map(node => {
    const layer = node.data.layer || 'other';
    const layerConfig = awsLayers[layer as keyof typeof awsLayers] || awsLayers.other;
    const layerNodes = nodesByLayer[layer];
    const nodeIndex = layerNodes.indexOf(node);
    const totalNodesInLayer = layerNodes.length;
    const maxNodesPerRow = layerConfig.maxNodesPerRow;
    const rows = Math.ceil(totalNodesInLayer / maxNodesPerRow);
    const row = Math.floor(nodeIndex / maxNodesPerRow);
    const col = nodeIndex % maxNodesPerRow;

    // Improved base spacing
    const baseSpacingX = 300;
    const baseSpacingY = 170;

    // Center nodes horizontally within the layer
    const layerWidth = (Math.min(totalNodesInLayer, maxNodesPerRow) - 1) * baseSpacingX;
    const x = 100 + (col * baseSpacingX) - (layerWidth / 2);
    const y = layerConfig.y + (row * baseSpacingY);

    // Reduced random offset for organic look
    const randomOffset = {
      x: (Math.random() - 0.5) * 10,
      y: (Math.random() - 0.5) * 10
    };

    return {
      ...node,
      position: {
        x: x + randomOffset.x,
        y: y + randomOffset.y
      },
      data: {
        ...node.data,
        layer: layer,
        layerColor: layerConfig.color
      }
    };
  });

  return positionedNodes;
}

/**
 * Determine AWS architectural layer based on service type
 */
function determineAWSLayer(serviceName: string): string {
  const serviceToLayer: Record<string, string> = {
    // Internet-facing services
    'CloudFront': 'internet',
    'Route 53': 'internet',
    'Global Accelerator': 'internet',
    
    // Public subnet services
    'ELB': 'public-subnet',
    'ALB': 'public-subnet',
    'NLB': 'public-subnet',
    'API Gateway': 'public-subnet',
    'NAT Gateway': 'public-subnet',
    'Internet Gateway': 'public-subnet',
    
    // Private subnet services
    'EC2': 'private-subnet',
    'Lambda': 'private-subnet',
    'ECS': 'private-subnet',
    'EKS': 'private-subnet',
    'Fargate': 'private-subnet',
    'Auto Scaling': 'private-subnet',
    'Batch': 'private-subnet',
    
    // Database layer
    'RDS': 'database',
    'Aurora': 'database',
    'DynamoDB': 'database',
    'ElastiCache': 'database',
    'Neptune': 'database',
    'DocumentDB': 'database',
    'Timestream': 'database',
    'Redshift': 'database',
    
    // Security services
    'IAM': 'security',
    'Cognito': 'security',
    'WAF': 'security',
    'Shield': 'security',
    'KMS': 'security',
    'Secrets Manager': 'security',
    'Certificate Manager': 'security',
    
    // Management services
    'CloudWatch': 'management',
    'CloudTrail': 'management',
    'CloudFormation': 'management',
    'Systems Manager': 'management',
    'Config': 'management'
  };

  // Check for exact match
  for (const [service, layer] of Object.entries(serviceToLayer)) {
    if (serviceName.includes(service)) {
      return layer;
    }
  }

  // Pattern-based fallback
  const lowerName = serviceName.toLowerCase();
  
  if (/cdn|cloudfront|route53|dns|global/i.test(lowerName)) return 'internet';
  if (/load.?balancer|alb|nlb|elb|gateway|nat/i.test(lowerName)) return 'public-subnet';
  if (/compute|lambda|function|container|instance|server|ec2|ecs|eks/i.test(lowerName)) return 'private-subnet';
  if (/database|db|cache|store|rds|dynamo|aurora/i.test(lowerName)) return 'database';
  if (/security|auth|identity|access|encryption|iam|cognito/i.test(lowerName)) return 'security';
  if (/monitor|log|trail|config|manage/i.test(lowerName)) return 'management';
  
  return 'private-subnet'; // Default to private subnet for most services
}

/**
 * Enhance edges with AWS-style data flow visualization
 */
function enhanceEdgesWithAWSStyle(edges: Edge[], nodes: Node[]): Edge[] {
  return edges.map(edge => {
    // Find source and target nodes
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return edge;

    // Determine edge type based on node layers
    const sourceLayer = sourceNode.data.layer;
    const targetLayer = targetNode.data.layer;
    
    // Calculate edge style based on layer relationship
    let edgeStyle = {
      stroke: '#000000',
      strokeWidth: 2,
      strokeDasharray: 'none',
      animation: 'none'
    };

    // Style edges based on layer relationships
    if (sourceLayer === 'internet' && targetLayer === 'public-subnet') {
      // Internet to public subnet connection
      edgeStyle = {
        ...edgeStyle,
        stroke: '#2563EB', // Blue
        strokeWidth: 2.5,
        animation: 'flow 2s linear infinite'
      };
    } else if (sourceLayer === 'public-subnet' && targetLayer === 'private-subnet') {
      // Public to private subnet connection
      edgeStyle = {
        ...edgeStyle,
        stroke: '#059669', // Green
        strokeWidth: 2.5
      };
    } else if (sourceLayer === 'private-subnet' && targetLayer === 'database') {
      // Private subnet to database connection
      edgeStyle = {
        ...edgeStyle,
        stroke: '#7C3AED', // Purple
        strokeWidth: 2.5,
        strokeDasharray: '5,5'
      };
    } else if (sourceLayer === 'security' || targetLayer === 'security') {
      // Security-related connections
      edgeStyle = {
        ...edgeStyle,
        stroke: '#DC2626', // Red
        strokeWidth: 2.5,
        strokeDasharray: '3,3'
      };
    }

    // Add animation for bidirectional connections
    if (edges.some(e => e.source === edge.target && e.target === edge.source)) {
      edgeStyle.animation = 'flow 2s linear infinite';
    }

    return {
      ...edge,
      type: 'smoothstep',
      animated: edgeStyle.animation !== 'none',
      style: edgeStyle
    };
  });
}

// Export the animation keyframes for client-side use
export const edgeAnimationStyles = `
  @keyframes flow {
    0% {
      stroke-dashoffset: 0;
    }
    100% {
      stroke-dashoffset: -20;
    }
  }
`;

/**
 * Extract service information from LLM-generated text
 */
export function extractServiceInfo(text: string): {
  service: string;
  label: string;
  description?: string;
} {
  // Common patterns used by LLMs
  const patterns = [
    /(?:AWS\s+)?(\w+(?:\s+\w+)*)\s*(?:\(([^)]+)\))?/,
    /(?:Amazon\s+)?(\w+(?:\s+\w+)*)\s*(?:-\s*(.+))?/,
    /(\w+(?:\s+\w+)*)\s*(?:for\s+(.+))?/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const service = match[1].trim();
      const label = match[2]?.trim() || service;
      return { service, label };
    }
  }

  // Fallback
  return {
    service: text.trim(),
    label: text.trim()
  };
}

function cleanAndValidateJSON(input: string): string {
  let jsonString = input;
  try {
    // ... your existing cleaning steps ...

    // Use jsonrepair as a last step
    jsonString = jsonrepair(jsonString);

    // Validate
    JSON.parse(jsonString);

    return jsonString;
  } catch (error) {
    console.error('Error cleaning JSON:', error);
    throw new Error('Failed to clean and validate JSON structure');
  }
} 