import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Service name variations mapping
const SERVICE_VARIATIONS: Record<string, string[]> = {
  // Compute
  'EC2': ['Elastic Compute Cloud', 'Amazon EC2', 'EC2 Instance'],
  'Lambda': ['AWS Lambda', 'Serverless Function', 'Function'],
  'ECS': ['Elastic Container Service', 'Container Service', 'Containers'],
  'EKS': ['Elastic Kubernetes Service', 'Kubernetes', 'K8s'],
  'Fargate': ['AWS Fargate', 'Serverless Containers'],
  'Batch': ['AWS Batch', 'Batch Computing'],
  'App Runner': ['AWS App Runner', 'Container App'],
  'Elastic Beanstalk': ['AWS Elastic Beanstalk', 'Beanstalk'],
  
  // Storage
  'S3': ['Simple Storage Service', 'Object Storage', 'Bucket'],
  'EBS': ['Elastic Block Store', 'Block Storage'],
  'EFS': ['Elastic File System', 'File Storage'],
  'FSx': ['FSx for Windows', 'FSx for Lustre', 'FSx for NetApp ONTAP'],
  'Glacier': ['S3 Glacier', 'Archive Storage'],
  'Storage Gateway': ['AWS Storage Gateway'],
  
  // Database
  'RDS': ['Relational Database Service', 'SQL Database'],
  'DynamoDB': ['NoSQL Database', 'Document Database'],
  'Aurora': ['Aurora MySQL', 'Aurora PostgreSQL'],
  'ElastiCache': ['Cache', 'Redis', 'Memcached'],
  'Neptune': ['Graph Database'],
  'DocumentDB': ['MongoDB Compatible'],
  'Timestream': ['Time Series Database'],
  'Keyspaces': ['Cassandra Compatible'],
  'MemoryDB': ['Redis Compatible'],
  
  // Networking
  'VPC': ['Virtual Private Cloud', 'Network'],
  'Route 53': ['DNS', 'Domain Name System'],
  'CloudFront': ['CDN', 'Content Delivery Network'],
  'API Gateway': ['REST API', 'HTTP API', 'WebSocket API'],
  'ELB': ['Elastic Load Balancing', 'Load Balancer', 'ALB', 'NLB'],
  'Direct Connect': ['AWS Direct Connect', 'DX'],
  'Cloud WAN': ['AWS Cloud WAN'],
  'PrivateLink': ['VPC Endpoints'],
  
  // Security
  'IAM': ['Identity and Access Management', 'Users and Groups'],
  'Cognito': ['User Pools', 'Identity Pools'],
  'WAF': ['Web Application Firewall'],
  'Shield': ['DDoS Protection'],
  'GuardDuty': ['Threat Detection'],
  'KMS': ['Key Management Service', 'Encryption'],
  'Secrets Manager': ['Secrets', 'Credentials'],
  'Certificate Manager': ['SSL/TLS', 'Certificates'],
  
  // Integration
  'SNS': ['Simple Notification Service', 'Notifications'],
  'SQS': ['Simple Queue Service', 'Message Queue'],
  'EventBridge': ['CloudWatch Events', 'Event Bus'],
  'Step Functions': ['Workflow', 'State Machine'],
  'AppSync': ['GraphQL API'],
  'MQ': ['Amazon MQ', 'Message Broker'],
  
  // Analytics
  'Redshift': ['Data Warehouse'],
  'Athena': ['SQL Query Service'],
  'EMR': ['Elastic MapReduce', 'Big Data'],
  'Kinesis': ['Streaming Data'],
  'Glue': ['ETL', 'Data Catalog'],
  'QuickSight': ['Business Intelligence', 'BI'],
  'OpenSearch': ['Elasticsearch', 'Search Service'],
  
  // AI/ML
  'SageMaker': ['Machine Learning', 'ML'],
  'Rekognition': ['Image Recognition'],
  'Comprehend': ['Natural Language Processing', 'NLP'],
  'Polly': ['Text to Speech'],
  'Lex': ['Chatbot', 'Conversational AI'],
  'Personalize': ['Recommendations'],
  'Forecast': ['Time Series Prediction'],
  'Textract': ['Document Analysis'],
  
  // Management
  'CloudWatch': ['Monitoring', 'Logs', 'Metrics'],
  'CloudTrail': ['Audit Logs'],
  'Config': ['Configuration Management'],
  'Systems Manager': ['SSM', 'Parameter Store'],
  'Organizations': ['Account Management'],
  'Control Tower': ['Multi-Account Management'],
  'Service Catalog': ['IT Service Management'],
  'Well-Architected Tool': ['Architecture Review'],
  
  // Developer Tools
  'CodePipeline': ['CI/CD', 'Pipeline'],
  'CodeBuild': ['Build Service'],
  'CodeCommit': ['Git Repository'],
  'CodeDeploy': ['Deployment Service'],
  'X-Ray': ['Distributed Tracing'],
  'Cloud9': ['IDE', 'Development Environment'],
  'CodeStar': ['Project Management'],
  
  // Migration
  'DMS': ['Database Migration Service'],
  'SMS': ['Server Migration Service'],
  'Migration Hub': ['Migration Tracking'],
  'DataSync': ['Data Transfer'],
  'Transfer Family': ['SFTP', 'FTPS', 'FTP'],
  
  // Media
  'MediaLive': ['Live Streaming'],
  'MediaPackage': ['Video Packaging'],
  'MediaStore': ['Media Storage'],
  'MediaConvert': ['Video Transcoding'],
  'MediaTailor': ['Ad Insertion'],
  'Elastic Transcoder': ['Video Transcoding'],
  
  // AR/VR
  'Sumerian': ['3D Content'],
  'RoboMaker': ['Robotics'],
  
  // Quantum
  'Braket': ['Quantum Computing'],
  
  // Satellite
  'Ground Station': ['Satellite Communications'],
  
  // Financial
  'Billing': ['Cost Management'],
  'Cost Explorer': ['Cost Analysis'],
  'Budgets': ['Budget Management'],
  'Savings Plans': ['Cost Savings'],
  'Reserved Instance': ['RI', 'Reserved Capacity'],
};

// Icon file name to service name mapping
const ICON_FILE_MAPPING: Record<string, string> = {
  'EC2.svg': 'EC2',
  'S3.svg': 'S3',
  'EBS.svg': 'EBS',
  'EFS.svg': 'EFS',
  'FSx.svg': 'FSx',
  'Backup.svg': 'Backup',
  'WAF.svg': 'WAF',
  'IAM.svg': 'IAM',
  'Cognito.svg': 'Cognito',
  'KMS.svg': 'KMS',
  'VPC.svg': 'VPC',
  'Route-53.svg': 'Route 53',
  'ELB.svg': 'ELB',
  'CloudFront.svg': 'CloudFront',
  'Transfer-Family.svg': 'Transfer Family',
  'SMS.svg': 'SMS',
  'Migration-Hub.svg': 'Migration Hub',
  'DataSync.svg': 'DataSync',
  'MediaLive.svg': 'MediaLive',
  'MediaPackage.svg': 'MediaPackage',
  'MediaStore.svg': 'MediaStore',
  'MediaConvert.svg': 'MediaConvert',
  'MediaTailor.svg': 'MediaTailor',
  'Elastic-Transcoder.svg': 'Elastic Transcoder',
  'Well-Architected-Tool.svg': 'Well-Architected Tool',
  'Systems-Manager.svg': 'Systems Manager',
  'Service-Catalog.svg': 'Service Catalog',
  'Organizations.svg': 'Organizations',
  'OpsWorks.svg': 'OpsWorks',
  'Lambda.svg': 'Lambda',
  'ECS.svg': 'ECS',
  'EKS.svg': 'EKS',
  'Fargate.svg': 'Fargate',
  'Batch.svg': 'Batch',
  'App-Runner.svg': 'App Runner',
  'Elastic-Beanstalk.svg': 'Elastic Beanstalk',
  'Glacier.svg': 'Glacier',
  'Storage-Gateway.svg': 'Storage Gateway',
  'RDS.svg': 'RDS',
  'DynamoDB.svg': 'DynamoDB',
  'Aurora.svg': 'Aurora',
  'ElastiCache.svg': 'ElastiCache',
  'Neptune.svg': 'Neptune',
  'DocumentDB.svg': 'DocumentDB',
  'Timestream.svg': 'Timestream',
  'Keyspaces.svg': 'Keyspaces',
  'MemoryDB.svg': 'MemoryDB',
  'Direct-Connect.svg': 'Direct Connect',
  'Cloud-WAN.svg': 'Cloud WAN',
  'PrivateLink.svg': 'PrivateLink',
  'Shield.svg': 'Shield',
  'GuardDuty.svg': 'GuardDuty',
  'Secrets-Manager.svg': 'Secrets Manager',
  'Certificate-Manager.svg': 'Certificate Manager',
  'SNS.svg': 'SNS',
  'SQS.svg': 'SQS',
  'EventBridge.svg': 'EventBridge',
  'Step-Functions.svg': 'Step Functions',
  'AppSync.svg': 'AppSync',
  'MQ.svg': 'MQ',
  'Redshift.svg': 'Redshift',
  'Athena.svg': 'Athena',
  'EMR.svg': 'EMR',
  'Kinesis.svg': 'Kinesis',
  'Glue.svg': 'Glue',
  'QuickSight.svg': 'QuickSight',
  'OpenSearch.svg': 'OpenSearch',
  'SageMaker.svg': 'SageMaker',
  'Rekognition.svg': 'Rekognition',
  'Comprehend.svg': 'Comprehend',
  'Polly.svg': 'Polly',
  'Lex.svg': 'Lex',
  'Personalize.svg': 'Personalize',
  'Forecast.svg': 'Forecast',
  'Textract.svg': 'Textract',
  'CloudWatch.svg': 'CloudWatch',
  'CloudTrail.svg': 'CloudTrail',
  'Config.svg': 'Config',
  'Control-Tower.svg': 'Control Tower',
  'CodePipeline.svg': 'CodePipeline',
  'CodeBuild.svg': 'CodeBuild',
  'CodeCommit.svg': 'CodeCommit',
  'CodeDeploy.svg': 'CodeDeploy',
  'X-Ray.svg': 'X-Ray',
  'Cloud9.svg': 'Cloud9',
  'CodeStar.svg': 'CodeStar',
  'DMS.svg': 'DMS',
  'Ground-Station.svg': 'Ground Station',
  'RoboMaker.svg': 'RoboMaker',
  'Braket.svg': 'Braket',
  'Sumerian.svg': 'Sumerian'
};

// Cache for icon paths
let iconPathCache: Map<string, string> = new Map();

// Initialize the icon path cache
async function initializeIconCache() {
  if (iconPathCache.size > 0) return;

  const iconsDir = path.join(process.cwd(), 'public', 'icons', 'aws-icons');
  
  try {
    const files = await readdir(iconsDir);
    
    for (const file of files) {
      if (file.endsWith('.svg')) {
        const serviceName = ICON_FILE_MAPPING[file] || file.replace('.svg', '').replace(/-/g, ' ');
        iconPathCache.set(serviceName.toLowerCase(), `/icons/aws-icons/${file}`);
      }
    }
  } catch (error) {
    console.error('Error initializing icon cache:', error);
  }
}

// Normalize service name for matching
function normalizeServiceName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(amazon |aws )/i, '')
    .replace(/service$/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Get icon path for a service
export async function getAwsIconPath(serviceName: string): Promise<string> {
  await initializeIconCache();
  
  const normalizedName = normalizeServiceName(serviceName);
  
  // Direct match
  if (iconPathCache.has(normalizedName)) {
    return iconPathCache.get(normalizedName)!;
  }
  
  // Check variations
  for (const [baseService, variations] of Object.entries(SERVICE_VARIATIONS)) {
    if (normalizeServiceName(baseService) === normalizedName) {
      const baseIconPath = iconPathCache.get(normalizeServiceName(baseService));
      if (baseIconPath) return baseIconPath;
    }
    
    for (const variation of variations) {
      if (normalizeServiceName(variation) === normalizedName) {
        const baseIconPath = iconPathCache.get(normalizeServiceName(baseService));
        if (baseIconPath) return baseIconPath;
      }
    }
  }
  
  // Fallback to generic AWS icon
  return '/icons/aws-icons/aws-generic.svg';
}

// Get all available service names
export function getAvailableServices(): string[] {
  return Array.from(iconPathCache.keys());
}

// Get service variations
export function getServiceVariations(serviceName: string): string[] {
  return SERVICE_VARIATIONS[serviceName] || [];
}

// Get base service name from variation
export function getBaseServiceName(variation: string): string | null {
  for (const [baseService, variations] of Object.entries(SERVICE_VARIATIONS)) {
    if (normalizeServiceName(baseService) === normalizeServiceName(variation)) {
      return baseService;
    }
    if (variations.some(v => normalizeServiceName(v) === normalizeServiceName(variation))) {
      return baseService;
    }
  }
  return null;
} 