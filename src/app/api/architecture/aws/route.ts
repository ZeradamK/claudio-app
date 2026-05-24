import { NextRequest, NextResponse } from 'next/server';
import { getAwsIconPath, getBaseServiceName } from '@/utils/awsIconMapper';

// Helper function to determine service layer
function getServiceLayer(serviceName: string): string {
  const serviceToLayer: Record<string, string> = {
    // Frontend
    'CloudFront': 'frontend',
    'S3': 'frontend',
    'Route 53': 'frontend',
    
    // Integration/API
    'API Gateway': 'integration',
    'EventBridge': 'integration',
    'SNS': 'integration',
    'SQS': 'integration',
    'Step Functions': 'integration',
    
    // Compute
    'Lambda': 'compute',
    'EC2': 'compute',
    'ECS': 'compute',
    'Fargate': 'compute',
    'Batch': 'compute',
    'App Runner': 'compute',
    
    // Database
    'DynamoDB': 'database',
    'RDS': 'database',
    'Aurora': 'database',
    'ElastiCache': 'database',
    'Neptune': 'database',
    'DocumentDB': 'database',
    
    // Networking
    'VPC': 'networking',
    'ELB': 'networking',
    
    // Security
    'IAM': 'security',
    'Cognito': 'security',
    'WAF': 'security',
    'KMS': 'security',
    
    // Storage
    'EBS': 'storage',
    'EFS': 'storage',
    'FSx': 'storage',
    'Backup': 'storage',
  };
  
  return serviceToLayer[serviceName] || 'other';
}

// Helper function to get a random pastel color
function getRandomColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 80%)`;
}

interface AwsNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    service: string;
    icon?: string;
    layer: string;
  };
  style: {
    background: string;
    border: string;
    borderRadius: string;
    padding: string;
  };
}

interface AwsEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  animated: boolean;
  style: {
    stroke: string;
    strokeWidth: number;
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { components } = body;

    if (!Array.isArray(components)) {
      return NextResponse.json(
        { error: 'Invalid request: components must be an array' },
        { status: 400 }
      );
    }

    // Group components by layer
    const layerGroups: Record<string, string[]> = {};
    components.forEach(component => {
      const layer = getServiceLayer(component);
      if (!layerGroups[layer]) layerGroups[layer] = [];
      layerGroups[layer].push(component);
    });

    // Create nodes with tree-like positioning
    const nodes: AwsNode[] = [];
    const layerOrder = ['frontend', 'integration', 'compute', 'database', 'networking', 'security', 'storage', 'other'];
    const layerSpacingX = 280;
    const layerSpacingY = 160;
    const nodeSpacingY = 120;
    let baseX = 120;
    let baseY = 80;

    for (const [layerIndex, layer] of layerOrder.entries()) {
      const components = layerGroups[layer] || [];
      for (const [nodeIndex, component] of components.entries()) {
        const baseService = getBaseServiceName(component) || component;
        const iconUrl = await getAwsIconPath(baseService);
        
        // Calculate position based on layer and node index
        let x = baseX + layerIndex * layerSpacingX;
        let y = baseY + (nodeIndex - (components.length - 1) / 2) * nodeSpacingY;
        
        // Add slight randomness for more organic look
        x += (Math.random() - 0.5) * 40;
        y += (Math.random() - 0.5) * 20;

        nodes.push({
          id: `node-${nodes.length + 1}`,
          type: 'awsService',
          position: { x, y },
          data: {
            label: component,
            service: baseService,
            icon: iconUrl,
            layer: layer
          },
          style: {
            background: getRandomColor(),
            border: '2px solid #000',
            borderRadius: '8px',
            padding: '10px',
          }
        });
      }
    }

    // Create connections between nodes in a tree-like structure
    const edges: AwsEdge[] = [];
    const layerConnections: Record<string, string[]> = {
      'frontend': ['integration'],
      'integration': ['compute'],
      'compute': ['database', 'storage'],
      'database': ['storage'],
      'networking': ['compute', 'security'],
      'security': ['compute', 'database'],
      'storage': [],
      'other': []
    };

    // Connect nodes between layers
    layerOrder.forEach((layer) => {
      const currentLayerNodes = nodes.filter(node => node.data.layer === layer);
      const nextLayers = layerConnections[layer] || [];
      
      nextLayers.forEach(nextLayer => {
        const nextLayerNodes = nodes.filter(node => node.data.layer === nextLayer);
        
        // Connect each node in current layer to nodes in next layer
        currentLayerNodes.forEach(node => {
          nextLayerNodes.forEach(nextNode => {
            edges.push({
              id: `edge-${edges.length + 1}`,
              source: node.id,
              target: nextNode.id,
              type: 'smoothstep',
              animated: false,
              style: { stroke: '#000000', strokeWidth: 2 }
            });
          });
        });
      });
    });

    return NextResponse.json({
      nodes,
      edges,
      metadata: {
        cloudProvider: 'aws',
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error generating AWS architecture:', error);
    return NextResponse.json(
      { error: 'Failed to generate architecture' },
      { status: 500 }
    );
  }
} 