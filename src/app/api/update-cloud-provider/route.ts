import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type CloudProvider = 'aws' | 'azure' | 'gcp';

// Cloud provider service mapping (same as in the component)
const cloudServiceMapping: Record<string, Record<CloudProvider, string>> = {
  // Compute services
  "EC2": {
    aws: "EC2",
    azure: "Virtual Machine",
    gcp: "Compute Engine"
  },
  "Lambda": {
    aws: "Lambda",
    azure: "Functions",
    gcp: "Cloud Functions"
  },
  // Storage services
  "S3": {
    aws: "S3",
    azure: "Blob Storage",
    gcp: "Cloud Storage"
  },
  // Database services
  "DynamoDB": {
    aws: "DynamoDB",
    azure: "Cosmos DB",
    gcp: "Firestore"
  },
  "RDS": {
    aws: "RDS",
    azure: "Azure SQL",
    gcp: "Cloud SQL"
  },
  // Load balancers
  "ELB": {
    aws: "ELB",
    azure: "Load Balancer",
    gcp: "Cloud Load Balancing"
  },
  // Networking
  "VPC": {
    aws: "VPC",
    azure: "Virtual Network",
    gcp: "VPC Network"
  },
  // Cache
  "ElastiCache": {
    aws: "ElastiCache",
    azure: "Cache for Redis",
    gcp: "Memorystore"
  },
  // API
  "API Gateway": {
    aws: "API Gateway",
    azure: "API Management",
    gcp: "API Gateway"
  },
  // Default mapping for unknown services
  "Default": {
    aws: "AWS Service",
    azure: "Azure Service",
    gcp: "Google Cloud Service"
  }
};

export async function POST(request: NextRequest) {
  try {
    const { architectureId, cloudProvider } = await request.json();
    
    if (!architectureId) {
      return NextResponse.json({ error: 'Missing architecture ID' }, { status: 400 });
    }
    
    if (!cloudProvider || !['aws', 'azure', 'gcp'].includes(cloudProvider)) {
      return NextResponse.json({ error: 'Invalid cloud provider' }, { status: 400 });
    }
    
    // Get the architecture data
    const dataDir = path.join(process.cwd(), 'data');
    const architectureFile = path.join(dataDir, `architecture-${architectureId}.json`);
    
    if (!fs.existsSync(architectureFile)) {
      return NextResponse.json({ error: 'Architecture not found' }, { status: 404 });
    }
    
    // Read the file
    const architectureData = JSON.parse(fs.readFileSync(architectureFile, 'utf8'));
    
    // Get the current cloud provider
    const currentProvider = architectureData.metadata?.cloudProvider || 'aws';
    
    // Skip if the provider is the same
    if (currentProvider === cloudProvider) {
      return NextResponse.json({ message: 'Cloud provider already set' });
    }
    
    // Transform the architecture
    const transformedNodes = architectureData.nodes.map((node: any) => {
      // Skip if node doesn't have service information
      if (!node.data?.service) return node;
      
      // Get the original service name
      const serviceName = node.data.service;
      
      // Find equivalent service in the target cloud
      let targetService;
      
      // First, try to find a direct mapping
      for (const [awsService, providers] of Object.entries(cloudServiceMapping)) {
        if (providers[currentProvider as CloudProvider] === serviceName) {
          // Found the service, get its equivalent in the target cloud
          targetService = providers[cloudProvider as CloudProvider];
          break;
        }
      }
      
      // If no mapping was found, use a generic name
      if (!targetService) {
        targetService = cloudServiceMapping["Default"][cloudProvider as CloudProvider];
      }
      
      // Return the node with updated service name
      return {
        ...node,
        data: {
          ...node.data,
          service: targetService
        }
      };
    });
    
    // Update the architecture data
    architectureData.nodes = transformedNodes;
    architectureData.metadata = {
      ...architectureData.metadata,
      cloudProvider
    };
    
    // Write the updated data back to the file
    fs.writeFileSync(architectureFile, JSON.stringify(architectureData, null, 2));
    
    return NextResponse.json({ 
      message: 'Cloud provider updated successfully', 
      cloudProvider
    });
    
  } catch (error: any) {
    console.error('Error updating cloud provider:', error);
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
  }
} 