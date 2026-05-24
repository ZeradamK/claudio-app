import fs from 'fs';
import path from 'path';

// Common name variations and their mappings
const nameVariations: Record<string, string[]> = {
  'lambda': ['lambda', 'serverless', 'function'],
  'ec2': ['ec2', 'elastic compute', 'compute instance'],
  'dynamodb': ['dynamodb', 'dynamo', 'nosql'],
  's3': ['s3', 'simple storage', 'object storage'],
  'rds': ['rds', 'relational database', 'sql'],
  'apigateway': ['api gateway', 'api', 'gateway'],
  'cloudfront': ['cloudfront', 'cdn', 'content delivery'],
  'route53': ['route 53', 'route53', 'dns'],
  'vpc': ['vpc', 'virtual private cloud', 'network'],
  'iam': ['iam', 'identity', 'access management'],
  'cloudwatch': ['cloudwatch', 'monitoring', 'logs'],
  'sns': ['sns', 'simple notification', 'notification'],
  'sqs': ['sqs', 'simple queue', 'queue'],
  'eventbridge': ['eventbridge', 'event bus', 'events'],
  'cognito': ['cognito', 'authentication', 'auth'],
  'elasticache': ['elasticache', 'cache', 'redis'],
  'aurora': ['aurora', 'postgresql', 'mysql'],
  'ecs': ['ecs', 'container service', 'containers'],
  'fargate': ['fargate', 'serverless containers'],
  'cloudformation': ['cloudformation', 'infrastructure as code', 'iac'],
  'kms': ['kms', 'key management', 'encryption'],
  'waf': ['waf', 'web application firewall'],
  'redshift': ['redshift', 'data warehouse', 'analytics'],
  'kinesis': ['kinesis', 'streaming', 'data stream'],
  'athena': ['athena', 'query', 'sql query'],
  'quicksight': ['quicksight', 'visualization', 'bi'],
  'systemsmanager': ['systems manager', 'ssm', 'parameter store'],
  'cloudtrail': ['cloudtrail', 'audit', 'logging'],
  'backup': ['backup', 'disaster recovery'],
  'efs': ['efs', 'elastic file system', 'file storage'],
  'ebs': ['ebs', 'elastic block store', 'block storage'],
  'fsx': ['fsx', 'file system'],
  'neptune': ['neptune', 'graph database'],
  'documentdb': ['documentdb', 'mongodb'],
  'timestream': ['timestream', 'time series'],
  'keyspaces': ['keyspaces', 'cassandra'],
  'apprunner': ['app runner', 'apprunner', 'container app'],
  'batch': ['batch', 'batch computing'],
  'lightsail': ['lightsail', 'vps', 'virtual server'],
  'stepfunctions': ['step functions', 'workflow', 'orchestration']
};

// Function to normalize service names
function normalizeServiceName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Function to find the best matching icon for a service name
export function findBestIconMatch(serviceName: string, availableIcons: string[]): string {
  const normalizedName = normalizeServiceName(serviceName);
  
  // Try exact match first
  const exactMatch = availableIcons.find(icon => 
    normalizeServiceName(icon) === normalizedName
  );
  if (exactMatch) return exactMatch;

  // Try name variations
  for (const [baseName, variations] of Object.entries(nameVariations)) {
    if (variations.some(v => normalizedName.includes(normalizeServiceName(v)))) {
      const match = availableIcons.find(icon => 
        normalizeServiceName(icon).includes(baseName)
      );
      if (match) return match;
    }
  }

  // Try partial matches
  const partialMatch = availableIcons.find(icon => 
    normalizedName.includes(normalizeServiceName(icon)) ||
    normalizeServiceName(icon).includes(normalizedName)
  );
  if (partialMatch) return partialMatch;

  // Return empty string if no match found
  return '';
}

// Function to get all available AWS icons
export function getAvailableAwsIcons(): string[] {
  const icons: string[] = [];
  const basePath = path.join(process.cwd(), 'public', 'icons', 'aws-icons');

  // Recursively scan all subdirectories
  function scanDirectory(dir: string) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        scanDirectory(fullPath);
      } else if (file.endsWith('.svg')) {
        // Convert to relative path from public directory
        const relativePath = fullPath
          .replace(process.cwd(), '')
          .replace(/\\/g, '/')
          .replace('/public', '');
        icons.push(relativePath);
      }
    });
  }

  scanDirectory(basePath);
  return icons;
}

// Create a mapping of service names to icon paths
export function createIconMapping(): Record<string, string> {
  const availableIcons = getAvailableAwsIcons();
  const mapping: Record<string, string> = {};

  // Create mappings for all known services
  Object.keys(nameVariations).forEach(service => {
    const iconPath = findBestIconMatch(service, availableIcons);
    if (iconPath) {
      mapping[service] = iconPath;
      // Also map variations
      nameVariations[service].forEach(variation => {
        mapping[variation] = iconPath;
      });
    }
  });

  return mapping;
}

// Export the icon mapping
export const awsIconMapping = createIconMapping();

// Function to get icon for a service
export function getAwsIcon(serviceName: string): string {
  const normalizedName = normalizeServiceName(serviceName);
  
  // Try exact match first
  if (awsIconMapping[serviceName]) {
    return awsIconMapping[serviceName];
  }

  // Try normalized match
  const normalizedMatch = Object.entries(awsIconMapping).find(([key]) => 
    normalizeServiceName(key) === normalizedName
  );
  if (normalizedMatch) {
    return normalizedMatch[1];
  }

  // Try partial matches
  const partialMatch = Object.entries(awsIconMapping).find(([key]) => 
    normalizedName.includes(normalizeServiceName(key)) ||
    normalizeServiceName(key).includes(normalizedName)
  );
  if (partialMatch) {
    return partialMatch[1];
  }

  // Return empty string if no match found
  return '';
} 