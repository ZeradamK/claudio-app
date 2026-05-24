import { getIcons } from './localIconDb';

export async function buildAwsNode(serviceName: string, nodeId: string, position?: { x: number; y: number }) {
  try {
    // Query the local icon database for this service
    const icons = await getIcons({ 
      provider: 'aws', 
      service_name: serviceName 
    });
    
    const iconUrl = icons[0]?.icon_url || '';
    
    return {
      id: nodeId,
      type: 'awsService',
      position: position || { x: 0, y: 0 },
      data: {
        label: serviceName,
        service: serviceName,
        icon: iconUrl,
        layer: getServiceLayer(serviceName)
      }
    };
  } catch (error) {
    console.error(`Error building node for ${serviceName}:`, error);
    return {
      id: nodeId,
      type: 'awsService',
      position: position || { x: 0, y: 0 },
      data: {
        label: serviceName,
        service: serviceName,
        icon: '',
        layer: 'other'
      }
    };
  }
}

export async function buildAwsNodes(services: string[]) {
  return await Promise.all(
    services.map(async (service, idx) => 
      await buildAwsNode(service, `node-${idx + 1}`, {
        x: 100 + (idx % 3) * 200,
        y: 100 + Math.floor(idx / 3) * 150
      })
    )
  );
}

function getServiceLayer(serviceName: string): string {
  const serviceToLayer: Record<string, string> = {
    'CloudFront': 'frontend',
    'API Gateway': 'integration',
    'Lambda': 'compute',
    'EC2': 'compute',
    'DynamoDB': 'database',
    'RDS': 'database',
    'S3': 'frontend',
    'VPC': 'vpc',
    'SNS': 'integration',
    'SQS': 'integration',
    'EventBridge': 'integration',
    'Cognito': 'user-management',
    'ElastiCache': 'database',
    'ECS': 'compute',
    'Fargate': 'compute'
  };
  
  return serviceToLayer[serviceName] || 'other';
} 