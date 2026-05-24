import { NextResponse } from 'next/server';
import { processArchitectureWithIcons } from '@/ai/middleware/architectureIconProcessor';

export async function GET() {
  try {
    // Create a sample AWS architecture that follows real AWS patterns
    const sampleArchitecture = {
      nodes: [
        // Internet Layer
        {
          id: 'cloudfront-1',
          type: 'awsService',
          position: { x: 400, y: 80 },
          data: {
            label: 'CloudFront CDN',
            service: 'CloudFront',
            description: 'Global content delivery',
            layer: 'internet'
          }
        },
        {
          id: 'route53-1',
          type: 'awsService',
          position: { x: 600, y: 80 },
          data: {
            label: 'Route 53 DNS',
            service: 'Route 53',
            description: 'DNS routing',
            layer: 'internet'
          }
        },
        
        // Public Subnet Layer
        {
          id: 'alb-1',
          type: 'awsService',
          position: { x: 400, y: 220 },
          data: {
            label: 'Application Load Balancer',
            service: 'ELB',
            description: 'Load balancing',
            layer: 'public-subnet'
          }
        },
        {
          id: 'api-gateway-1',
          type: 'awsService',
          position: { x: 600, y: 220 },
          data: {
            label: 'API Gateway',
            service: 'API Gateway',
            description: 'API management',
            layer: 'public-subnet'
          }
        },
        
        // Private Subnet Layer
        {
          id: 'ec2-1',
          type: 'awsService',
          position: { x: 300, y: 420 },
          data: {
            label: 'Web Server',
            service: 'EC2',
            description: 'Application server',
            layer: 'private-subnet'
          }
        },
        {
          id: 'lambda-1',
          type: 'awsService',
          position: { x: 500, y: 420 },
          data: {
            label: 'Business Logic',
            service: 'Lambda',
            description: 'Serverless functions',
            layer: 'private-subnet'
          }
        },
        {
          id: 'ecs-1',
          type: 'awsService',
          position: { x: 700, y: 420 },
          data: {
            label: 'Microservices',
            service: 'ECS',
            description: 'Container orchestration',
            layer: 'private-subnet'
          }
        },
        
        // Database Layer
        {
          id: 'rds-1',
          type: 'awsService',
          position: { x: 300, y: 620 },
          data: {
            label: 'User Database',
            service: 'RDS',
            description: 'Relational database',
            layer: 'database'
          }
        },
        {
          id: 'dynamodb-1',
          type: 'awsService',
          position: { x: 500, y: 620 },
          data: {
            label: 'Session Store',
            service: 'DynamoDB',
            description: 'NoSQL database',
            layer: 'database'
          }
        },
        {
          id: 'elasticache-1',
          type: 'awsService',
          position: { x: 700, y: 620 },
          data: {
            label: 'Redis Cache',
            service: 'ElastiCache',
            description: 'In-memory cache',
            layer: 'database'
          }
        },
        
        // Security Layer
        {
          id: 'cognito-1',
          type: 'awsService',
          position: { x: 200, y: 780 },
          data: {
            label: 'User Authentication',
            service: 'Cognito',
            description: 'Identity management',
            layer: 'security'
          }
        },
        {
          id: 'iam-1',
          type: 'awsService',
          position: { x: 400, y: 780 },
          data: {
            label: 'Access Control',
            service: 'IAM',
            description: 'Identity & access',
            layer: 'security'
          }
        },
        
        // Management Layer
        {
          id: 'cloudwatch-1',
          type: 'awsService',
          position: { x: 600, y: 780 },
          data: {
            label: 'Monitoring',
            service: 'CloudWatch',
            description: 'Metrics & logs',
            layer: 'management'
          }
        }
      ],
      edges: [
        // Internet to Public Subnet
        {
          id: 'edge-1',
          source: 'cloudfront-1',
          target: 'alb-1',
          type: 'smoothstep',
          animated: true,
          label: 'HTTPS',
          style: { stroke: '#FF9900', strokeWidth: 2 },
          data: { dataFlow: 'User Requests', protocol: 'HTTPS' }
        },
        {
          id: 'edge-2',
          source: 'route53-1',
          target: 'api-gateway-1',
          type: 'smoothstep',
          animated: true,
          label: 'DNS',
          style: { stroke: '#2196F3', strokeWidth: 2 },
          data: { dataFlow: 'DNS Resolution', protocol: 'DNS' }
        },
        
        // Public to Private Subnet
        {
          id: 'edge-3',
          source: 'alb-1',
          target: 'ec2-1',
          type: 'smoothstep',
          animated: true,
          label: 'HTTP',
          style: { stroke: '#4CAF50', strokeWidth: 2 },
          data: { dataFlow: 'Web Traffic', protocol: 'HTTP' }
        },
        {
          id: 'edge-4',
          source: 'api-gateway-1',
          target: 'lambda-1',
          type: 'smoothstep',
          animated: true,
          label: 'API Calls',
          style: { stroke: '#4CAF50', strokeWidth: 2 },
          data: { dataFlow: 'API Requests', protocol: 'HTTPS' }
        },
        {
          id: 'edge-5',
          source: 'alb-1',
          target: 'ecs-1',
          type: 'smoothstep',
          animated: true,
          label: 'Container Traffic',
          style: { stroke: '#FF9800', strokeWidth: 2 },
          data: { dataFlow: 'Container Requests', protocol: 'HTTP' }
        },
        
        // Private Subnet to Database
        {
          id: 'edge-6',
          source: 'ec2-1',
          target: 'rds-1',
          type: 'smoothstep',
          animated: false,
          label: 'SQL',
          style: { stroke: '#9C27B0', strokeWidth: 2, strokeDasharray: '5,5' },
          data: { dataFlow: 'Database Queries', protocol: 'SQL' }
        },
        {
          id: 'edge-7',
          source: 'lambda-1',
          target: 'dynamodb-1',
          type: 'smoothstep',
          animated: false,
          label: 'NoSQL',
          style: { stroke: '#9C27B0', strokeWidth: 2, strokeDasharray: '5,5' },
          data: { dataFlow: 'Document Queries', protocol: 'HTTPS' }
        },
        {
          id: 'edge-8',
          source: 'ecs-1',
          target: 'elasticache-1',
          type: 'smoothstep',
          animated: false,
          label: 'Cache',
          style: { stroke: '#E91E63', strokeWidth: 2 },
          data: { dataFlow: 'Cache Operations', protocol: 'Redis' }
        },
        
        // Security Connections
        {
          id: 'edge-9',
          source: 'cognito-1',
          target: 'lambda-1',
          type: 'smoothstep',
          animated: false,
          label: 'Auth',
          style: { stroke: '#F44336', strokeWidth: 2 },
          data: { dataFlow: 'Authentication', protocol: 'JWT' }
        },
        
        // Management Connections
        {
          id: 'edge-10',
          source: 'ec2-1',
          target: 'cloudwatch-1',
          type: 'smoothstep',
          animated: false,
          label: 'Metrics',
          style: { stroke: '#795548', strokeWidth: 1 },
          data: { dataFlow: 'Monitoring Data', protocol: 'CloudWatch' }
        }
      ]
    };

    // Process the architecture to ensure proper icons and positioning
    const processedArchitecture = await processArchitectureWithIcons(sampleArchitecture, 'aws');

    return NextResponse.json({
      ...processedArchitecture,
      metadata: {
        title: 'Sample AWS Web Application Architecture',
        description: 'A typical 3-tier web application with microservices',
        cloudProvider: 'aws',
        region: 'us-east-1',
        created: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating test architecture:', error);
    return NextResponse.json(
      { error: 'Failed to generate test architecture' },
      { status: 500 }
    );
  }
} 