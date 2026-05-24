/**
 * Enhanced Architecture Intent Detection
 * 
 * This module provides sophisticated intent detection for architecture modifications,
 * including specific AWS service recognition and modification patterns.
 */

export interface ArchitectureIntent {
  type: 'add' | 'remove' | 'modify' | 'connect' | 'replace' | 'scale' | 'secure' | 'optimize';
  confidence: number;
  entities: {
    services?: string[];
    connections?: Array<{ from: string; to: string }>;
    properties?: Record<string, any>;
    layer?: string;
    region?: string;
  };
  subType?: string;
  description: string;
}

// AWS Service patterns for better recognition
const AWS_SERVICES = {
  compute: ['ec2', 'lambda', 'ecs', 'fargate', 'batch', 'lightsail', 'elastic beanstalk'],
  storage: ['s3', 'ebs', 'efs', 'fsx', 'storage gateway', 'backup'],
  database: ['rds', 'dynamodb', 'aurora', 'redshift', 'documentdb', 'neptune', 'timestream', 'memorydb'],
  networking: ['vpc', 'cloudfront', 'route 53', 'api gateway', 'load balancer', 'alb', 'nlb', 'nat gateway', 'internet gateway', 'vpn'],
  security: ['iam', 'cognito', 'waf', 'shield', 'secrets manager', 'kms', 'certificate manager', 'inspector'],
  analytics: ['athena', 'glue', 'kinesis', 'emr', 'quicksight', 'data pipeline', 'lake formation'],
  integration: ['sqs', 'sns', 'eventbridge', 'step functions', 'api gateway', 'app sync'],
  monitoring: ['cloudwatch', 'x-ray', 'cloudtrail', 'config', 'systems manager'],
  ml: ['sagemaker', 'comprehend', 'rekognition', 'textract', 'translate', 'polly', 'lex'],
  containers: ['ecs', 'eks', 'fargate', 'ecr', 'app runner'],
  serverless: ['lambda', 'api gateway', 'dynamodb', 'step functions', 'eventbridge', 'sqs', 'sns']
};

// Intent patterns with enhanced recognition
const INTENT_PATTERNS = [
  // Add patterns
  {
    patterns: [
      /(?:add|include|incorporate|introduce|create|deploy|set up|implement)\s+(?:a|an|the)?\s*([^.]+?)(?:\s+(?:to|in|into|for|with)\s+(?:the|my|our)?\s*(?:architecture|system|diagram|setup|infrastructure))?/i,
      /(?:i\s+(?:want|need|would like)\s+(?:to\s+)?(?:add|include|have))\s+(?:a|an|the)?\s*([^.]+)/i,
      /(?:can\s+you\s+(?:add|include|create))\s+(?:a|an|the)?\s*([^.]+)/i,
      /(?:let's\s+(?:add|include|create))\s+(?:a|an|the)?\s*([^.]+)/i
    ],
    type: 'add' as const,
    confidence: 0.9
  },
  
  // Remove patterns
  {
    patterns: [
      /(?:remove|delete|eliminate|drop|take out|get rid of)\s+(?:the|a|an)?\s*([^.]+?)(?:\s+(?:from|in)\s+(?:the|my|our)?\s*(?:architecture|system|diagram))?/i,
      /(?:i\s+(?:want|need|would like)\s+(?:to\s+)?(?:remove|delete))\s+(?:the|a|an)?\s*([^.]+)/i,
      /(?:can\s+you\s+(?:remove|delete))\s+(?:the|a|an)?\s*([^.]+)/i
    ],
    type: 'remove' as const,
    confidence: 0.9
  },
  
  // Connect patterns
  {
    patterns: [
      /(?:connect|link|integrate|attach|join)\s+(?:the|a|an)?\s*([^.]+?)\s+(?:to|with|and)\s+(?:the|a|an)?\s*([^.]+)/i,
      /(?:establish\s+(?:a\s+)?connection\s+between)\s+(?:the|a|an)?\s*([^.]+?)\s+(?:and|to)\s+(?:the|a|an)?\s*([^.]+)/i,
      /(?:route\s+traffic\s+from)\s+(?:the|a|an)?\s*([^.]+?)\s+(?:to|through)\s+(?:the|a|an)?\s*([^.]+)/i
    ],
    type: 'connect' as const,
    confidence: 0.85
  },
  
  // Replace patterns
  {
    patterns: [
      /(?:replace|substitute|swap|change)\s+(?:the|a|an)?\s*([^.]+?)\s+(?:with|for|to)\s+(?:a|an|the)?\s*([^.]+)/i,
      /(?:convert|migrate|move)\s+(?:the|from)?\s*([^.]+?)\s+(?:to|into)\s+(?:a|an|the)?\s*([^.]+)/i,
      /(?:upgrade|modernize)\s+(?:the|a|an)?\s*([^.]+?)(?:\s+(?:to|with)\s+(?:a|an|the)?\s*([^.]+))?/i
    ],
    type: 'replace' as const,
    confidence: 0.85
  },
  
  // Modify patterns
  {
    patterns: [
      /(?:modify|update|change|edit|configure|adjust)\s+(?:the|a|an)?\s*([^.]+)/i,
      /(?:make\s+changes\s+to)\s+(?:the|a|an)?\s*([^.]+)/i,
      /(?:reconfigure|restructure)\s+(?:the|a|an)?\s*([^.]+)/i
    ],
    type: 'modify' as const,
    confidence: 0.8
  },
  
  // Scale patterns
  {
    patterns: [
      /(?:scale|auto.?scale|resize|increase|decrease)\s+(?:the|a|an)?\s*([^.]+)/i,
      /(?:add\s+(?:auto.?)?scaling\s+to)\s+(?:the|a|an)?\s*([^.]+)/i,
      /(?:make\s+(?:the)?\s*([^.]+?)\s+(?:more\s+)?scalable)/i
    ],
    type: 'scale' as const,
    confidence: 0.8
  },
  
  // Security patterns
  {
    patterns: [
      /(?:secure|protect|add\s+security\s+to|implement\s+security\s+for)\s+(?:the|a|an)?\s*([^.]+)/i,
      /(?:add\s+(?:waf|shield|iam|encryption|ssl|tls))\s+(?:to|for)?\s*([^.]*)/i,
      /(?:implement\s+(?:authentication|authorization|access\s+control))\s+(?:for|to)?\s*([^.]*)/i
    ],
    type: 'secure' as const,
    confidence: 0.8
  },
  
  // Optimization patterns
  {
    patterns: [
      /(?:optimize|improve|enhance)\s+(?:the|a|an)?\s*([^.]+)/i,
      /(?:make\s+(?:the)?\s*([^.]+?)\s+(?:more\s+)?(?:efficient|performant|cost.?effective))/i,
      /(?:reduce\s+(?:costs?|latency|response\s+time)\s+(?:for|of))\s+(?:the|a|an)?\s*([^.]+)/i
    ],
    type: 'optimize' as const,
    confidence: 0.75
  }
];

/**
 * Extract AWS services from text
 */
function extractAWSServices(text: string): string[] {
  const services: string[] = [];
  const lowerText = text.toLowerCase();
  
  // Check for specific AWS services
  Object.values(AWS_SERVICES).flat().forEach(service => {
    const servicePattern = new RegExp(`\\b${service.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (servicePattern.test(text)) {
      services.push(service);
    }
  });
  
  // Check for common variations
  const variations: Record<string, string> = {
    'database': 'rds',
    'db': 'rds',
    'cache': 'elasticache',
    'cdn': 'cloudfront',
    'dns': 'route 53',
    'load balancer': 'alb',
    'lb': 'alb',
    'queue': 'sqs',
    'notification': 'sns',
    'storage': 's3',
    'compute': 'ec2',
    'serverless': 'lambda',
    'container': 'ecs',
    'kubernetes': 'eks'
  };
  
  Object.entries(variations).forEach(([key, value]) => {
    if (lowerText.includes(key) && !services.includes(value)) {
      services.push(value);
    }
  });
  
  return [...new Set(services)]; // Remove duplicates
}

/**
 * Extract layer information from text
 */
function extractLayer(text: string): string | undefined {
  const layers = ['frontend', 'backend', 'database', 'cache', 'storage', 'network', 'security', 'monitoring'];
  const lowerText = text.toLowerCase();
  
  for (const layer of layers) {
    if (lowerText.includes(layer)) {
      return layer;
    }
  }
  
  // Check for tier patterns
  if (/(?:web|presentation|ui)\s+tier/i.test(text)) return 'frontend';
  if (/(?:application|app|business)\s+tier/i.test(text)) return 'backend';
  if (/(?:data|database|db)\s+tier/i.test(text)) return 'database';
  
  return undefined;
}

/**
 * Detect architecture intent from user message
 */
export function detectArchitectureIntent(message: string): ArchitectureIntent | null {
  const cleanMessage = message.trim();
  
  for (const intentPattern of INTENT_PATTERNS) {
    for (const pattern of intentPattern.patterns) {
      const match = pattern.exec(cleanMessage);
      if (match) {
        const services = extractAWSServices(cleanMessage);
        const layer = extractLayer(cleanMessage);
        
        // Extract entities based on intent type
        let entities: ArchitectureIntent['entities'] = { services };
        
        if (layer) {
          entities.layer = layer;
        }
        
        // For connect intents, extract source and target
        if (intentPattern.type === 'connect' && match.length >= 3) {
          entities.connections = [{
            from: match[1].trim(),
            to: match[2].trim()
          }];
        }
        
        // For replace intents, extract old and new services
        if (intentPattern.type === 'replace' && match.length >= 3) {
          entities.properties = {
            oldService: match[1].trim(),
            newService: match[2].trim()
          };
        }
        
        return {
          type: intentPattern.type,
          confidence: intentPattern.confidence,
          entities,
          description: `${intentPattern.type} operation detected`,
          subType: services.length > 0 ? services[0] : undefined
        };
      }
    }
  }
  
  return null;
}

/**
 * Check if message contains architecture modification intent
 */
export function isArchitectureModificationIntent(message: string): boolean {
  const intent = detectArchitectureIntent(message);
  return intent !== null && intent.confidence > 0.7;
}

/**
 * Get suggested actions based on detected intent
 */
export function getSuggestedActions(intent: ArchitectureIntent): string[] {
  const actions: string[] = [];
  
  switch (intent.type) {
    case 'add':
      actions.push('Add new service to architecture');
      actions.push('Configure service connections');
      actions.push('Set up proper security groups');
      break;
      
    case 'remove':
      actions.push('Remove service from architecture');
      actions.push('Update dependent connections');
      actions.push('Clean up security configurations');
      break;
      
    case 'connect':
      actions.push('Establish service connections');
      actions.push('Configure network routing');
      actions.push('Set up security rules');
      break;
      
    case 'replace':
      actions.push('Replace existing service');
      actions.push('Migrate data if needed');
      actions.push('Update all connections');
      break;
      
    case 'scale':
      actions.push('Configure auto-scaling');
      actions.push('Set up monitoring');
      actions.push('Optimize resource allocation');
      break;
      
    case 'secure':
      actions.push('Implement security controls');
      actions.push('Configure access policies');
      actions.push('Set up encryption');
      break;
      
    case 'optimize':
      actions.push('Analyze current performance');
      actions.push('Implement optimizations');
      actions.push('Monitor improvements');
      break;
  }
  
  return actions;
} 