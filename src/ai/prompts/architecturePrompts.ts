/**
 * AWS Architecture-specific prompts that generate real AWS solution patterns
 * Based on AWS Well-Architected Framework and solution architecture best practices
 */

import { AWS_ICON_CATALOG } from '@/utils/awsIconCatalog';

/**
 * Generate AWS solution architecture prompt that creates layered, real-world patterns
 */
export function getAWSArchitecturePrompt(
  currentArchitecture: any,
  userRequest: string,
  editType: string
): string {
  const serviceList = getAvailableServicesPrompt();
  
  return `
You are an AWS Solutions Architect creating production-ready architecture diagrams that follow AWS best practices.

${serviceList}

AWS ARCHITECTURE DESIGN PRINCIPLES:
1. Create LAYERED architecture with proper AWS structure:
   - Internet Gateway layer (y: 50)
   - Public Subnet layer (y: 200) 
   - Private Subnet layer (y: 400)
   - Database layer (y: 600)
   - Management/Security layer (y: 750)

2. POSITIONING RULES (Critical for AWS-style layout):
   - Internet-facing: CloudFront, Route 53, API Gateway (y: 50-150)
   - Public subnet: ALB, NAT Gateway, Bastion (y: 200-300)
   - Private subnet: EC2, Lambda, ECS, Auto Scaling (y: 400-500)
   - Data layer: RDS, DynamoDB, ElastiCache, S3 (y: 600-700)
   - Security/Management: IAM, CloudWatch, KMS (y: 750-850)

3. HORIZONTAL SPACING:
   - Use x-coordinates: 100, 300, 500, 700, 900 for different AZs/components
   - Group related services horizontally
   - Leave space for data flow arrows

4. AWS SOLUTION PATTERNS TO FOLLOW:
   - Web Application: CloudFront → ALB → EC2/Lambda → RDS
   - Microservices: API Gateway → Lambda → DynamoDB
   - Data Pipeline: S3 → Lambda → Kinesis → Analytics
   - Serverless: CloudFront → API Gateway → Lambda → DynamoDB

5. SECURITY & NETWORKING (MANDATORY):
   - Always create a VPC with at least 2 public and 2 private subnets (multi-AZ)
   - Explicitly create and assign Security Groups for all networked resources (EC2, RDS, ALB, Lambda in VPC, etc.)
   - Public subnets: for ALB, NAT Gateway, Bastion hosts
   - Private subnets: for EC2, Lambda, RDS, ECS, etc.
   - Attach NAT Gateways to public subnets for outbound internet from private subnets
   - Use VPC Endpoints for S3/DynamoDB if possible
   - Show clear relationships between subnets, route tables, and gateways

6. COMPLEXITY BASED ON INTENT:
   - For 'complex' or 'enterprise' intent, add:
     - Multi-AZ deployment for all critical resources
     - Auto Scaling Groups for EC2/ECS
     - Dedicated security groups per tier
     - VPC Flow Logs, CloudTrail, and CloudWatch Alarms
     - WAF and Shield for public endpoints
     - S3 versioning and encryption
     - KMS for encryption at rest
     - Backup plans for RDS/DynamoDB
     - PrivateLink or Transit Gateway for hybrid/multi-account

7. TODO: BUDGET, COMPLIANCE, SCALING, REGION (future)
   - Budget constraints: (to be injected)
   - Compliance needs: (to be injected)
   - Scaling requirements: (to be injected)
   - Region: (to be injected)

CURRENT ARCHITECTURE:
\`\`\`json
${JSON.stringify(currentArchitecture, null, 2)}
\`\`\`

USER REQUEST: "${userRequest}"
EDIT TYPE: ${editType}

RESPONSE FORMAT (MANDATORY):
<architecture>
{
  "nodes": [
    {
      "id": "unique-id",
      "type": "awsService",
      "position": {"x": 300, "y": 200},
      "data": {
        "label": "Application Load Balancer",
        "service": "ELB",
        "description": "Distributes traffic across targets",
        "layer": "public-subnet",
        "icon": ""
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "source-id",
      "target": "target-id",
      "type": "smoothstep",
      "animated": true,
      "style": {"stroke": "#FF9900", "strokeWidth": 2},
      "label": "HTTPS",
      "data": {"dataFlow": "User Requests", "protocol": "HTTPS"}
    }
  ]
}
</architecture>

<explanation>
- Brief explanation of the AWS architecture pattern
- Data flow description
- Security and scalability considerations
</explanation>

CRITICAL REQUIREMENTS:
✓ Use exact AWS service names from the catalog
✓ Follow AWS layered positioning (y-coordinates)
✓ Include proper data flow edges with labels
✓ Group services by AWS architectural tiers
✓ Use AWS orange (#FF9900) for primary data flows
`;
}

/**
 * Generate enhanced architecture update prompt with service guidance
 */
export function getCohereArchitectureUpdatePrompt(
  currentArchitecture: any,
  userRequest: string,
  editType: string
): string {
  const serviceList = getAvailableServicesPrompt();
  
  return `
You are an expert AWS cloud architect. Your task is to modify the provided architecture JSON based on the user's request.

${serviceList}

CRITICAL INSTRUCTIONS FOR COHERE:
1. ALWAYS return valid JSON wrapped in <architecture></architecture> tags
2. Use EXACT service names from the list above
3. Maintain all existing node IDs unless explicitly removing nodes
4. Ensure all edges reference valid node IDs

CURRENT ARCHITECTURE:
\`\`\`json
${JSON.stringify(currentArchitecture, null, 2)}
\`\`\`

USER REQUEST: "${userRequest}"
EDIT TYPE: ${editType}

RESPONSE FORMAT (MANDATORY):
<architecture>
{
  "nodes": [
    {
      "id": "unique-node-id",
      "type": "awsService", 
      "position": {"x": 100, "y": 100},
      "data": {
        "label": "Descriptive Label",
        "service": "ExactServiceName",
        "description": "Brief description",
        "icon": ""
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "source-node-id",
      "target": "target-node-id",
      "type": "smoothstep"
    }
  ]
}
</architecture>

<explanation>
- Brief explanation of changes made
- List key modifications
</explanation>

VALIDATION CHECKLIST:
✓ JSON is valid and complete
✓ All node IDs are unique
✓ All edge source/target IDs exist in nodes
✓ Service names match the provided list
✓ Response is wrapped in proper tags
`;
}

/**
 * Generate a list of all available AWS services for the prompt
 */
export function getAvailableServicesPrompt(): string {
  const services = Object.values(AWS_ICON_CATALOG)
    .filter(entry => entry.serviceName !== 'AWS Service') // Exclude generic
    .map(entry => `- ${entry.serviceName}: ${entry.aliases.slice(0, 3).join(', ')}`)
    .join('\n');
  
  return `
AVAILABLE AWS SERVICES (use these exact names for best icon matching):
${services}
`;
}

/**
 * Get service name suggestions for common terms
 */
export function getServiceSuggestions(term: string): string[] {
  const searchTerm = term.toLowerCase();
  const suggestions: string[] = [];
  
  for (const [id, entry] of Object.entries(AWS_ICON_CATALOG)) {
    if (entry.serviceName === 'AWS Service') continue; // Skip generic
    
    // Check if any alias or keyword matches
    const matches = entry.aliases.some(alias => alias.toLowerCase().includes(searchTerm)) ||
                   entry.keywords.some(keyword => keyword.includes(searchTerm));
    
    if (matches) {
      suggestions.push(entry.serviceName);
    }
  }
  
  return suggestions.slice(0, 5); // Return top 5 suggestions
}

/**
 * Generate a service mapping guide for the LLM
 */
export function getServiceMappingGuide(): string {
  return `
SERVICE MAPPING GUIDE:
When users mention these terms, use the corresponding AWS service:

COMPUTE:
- "function", "serverless function" → Lambda
- "server", "instance", "vm", "virtual machine" → EC2
- "container", "docker" → ECS or Fargate
- "kubernetes", "k8s" → EKS

STORAGE:
- "storage", "files", "bucket" → S3
- "block storage", "disk", "volume" → EBS
- "file system", "shared storage" → EFS

DATABASE:
- "nosql", "document db", "key-value" → DynamoDB
- "sql", "relational", "mysql", "postgres" → RDS or Aurora
- "cache", "redis", "memcached" → ElastiCache
- "graph database" → Neptune

NETWORKING:
- "cdn", "content delivery" → CloudFront
- "dns", "domain" → Route 53
- "api", "rest api", "http api" → API Gateway
- "load balancer", "alb", "nlb" → ELB
- "network", "vpc", "subnet" → VPC

INTEGRATION:
- "queue", "message queue" → SQS
- "notification", "topic", "pub/sub" → SNS
- "event", "event bus" → EventBridge
- "workflow", "state machine" → Step Functions

SECURITY:
- "auth", "authentication", "users" → Cognito
- "identity", "access", "permissions" → IAM
- "firewall", "waf" → WAF
- "encryption", "keys" → KMS

ANALYTICS:
- "streaming", "real-time data" → Kinesis
- "data warehouse" → Redshift
- "query", "sql query" → Athena
- "etl", "data pipeline" → Glue

Always prefer the official service name over descriptive terms.
`;
} 