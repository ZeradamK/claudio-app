/**
 * Fixture inventory for development / demo without a real AWS account.
 *
 * When a CloudConnection has `mode: 'mock'` the scanner skips the SDK
 * entirely and returns this snapshot. The shapes match what the real
 * scanners produce so the UI cannot tell the difference.
 */

import type { CloudInventory, CloudResource } from '../types';

const REGION_USE1 = 'us-east-1';
const REGION_USW2 = 'us-west-2';
const MOCK_ACCOUNT = '123456789012';

function arn(service: string, region: string, resource: string): string {
  return `arn:aws:${service}:${region}:${MOCK_ACCOUNT}:${resource}`;
}

function mkResource(partial: Partial<CloudResource> & Pick<CloudResource, 'id' | 'type' | 'name' | 'region'>): CloudResource {
  return {
    properties: {},
    tags: {},
    ...partial,
  };
}

export function buildMockInventory(connectionId: string): CloudInventory {
  const resources: CloudResource[] = [
    // ─── networking ───
    mkResource({
      id: 'vpc-mock-prod-001',
      type: 'vpc',
      name: 'prod-vpc',
      arn: arn('ec2', REGION_USE1, 'vpc/vpc-mock-prod-001'),
      region: REGION_USE1,
      properties: { cidrBlock: '10.0.0.0/16', isDefault: false, state: 'available' },
      tags: { Name: 'prod-vpc', Environment: 'production' },
    }),
    mkResource({
      id: 'subnet-mock-pub-1a',
      type: 'subnet',
      name: 'prod-public-1a',
      arn: arn('ec2', REGION_USE1, 'subnet/subnet-mock-pub-1a'),
      region: REGION_USE1,
      properties: {
        cidrBlock: '10.0.1.0/24',
        vpcId: 'vpc-mock-prod-001',
        availabilityZone: 'us-east-1a',
        isPublic: true,
      },
      tags: { Name: 'prod-public-1a' },
    }),
    mkResource({
      id: 'subnet-mock-pri-1a',
      type: 'subnet',
      name: 'prod-private-1a',
      arn: arn('ec2', REGION_USE1, 'subnet/subnet-mock-pri-1a'),
      region: REGION_USE1,
      properties: {
        cidrBlock: '10.0.10.0/24',
        vpcId: 'vpc-mock-prod-001',
        availabilityZone: 'us-east-1a',
        isPublic: false,
      },
      tags: { Name: 'prod-private-1a' },
    }),
    mkResource({
      id: 'sg-mock-web',
      type: 'security_group',
      name: 'prod-web-sg',
      arn: arn('ec2', REGION_USE1, 'security-group/sg-mock-web'),
      region: REGION_USE1,
      properties: {
        description: 'Allow HTTP/HTTPS from internet',
        vpcId: 'vpc-mock-prod-001',
        ingressRules: 2,
        egressRules: 1,
      },
      tags: { Name: 'prod-web-sg' },
    }),

    // ─── compute ───
    mkResource({
      id: 'i-mock-web-001',
      type: 'ec2_instance',
      name: 'prod-web-01',
      arn: arn('ec2', REGION_USE1, 'instance/i-mock-web-001'),
      region: REGION_USE1,
      properties: {
        instanceType: 't3.medium',
        state: 'running',
        privateIp: '10.0.1.42',
        vpcId: 'vpc-mock-prod-001',
        subnetId: 'subnet-mock-pub-1a',
      },
      tags: { Name: 'prod-web-01', Environment: 'production', Service: 'web' },
    }),
    mkResource({
      id: 'i-mock-worker-001',
      type: 'ec2_instance',
      name: 'prod-worker-01',
      arn: arn('ec2', REGION_USE1, 'instance/i-mock-worker-001'),
      region: REGION_USE1,
      properties: {
        instanceType: 'm6i.large',
        state: 'running',
        privateIp: '10.0.10.55',
        vpcId: 'vpc-mock-prod-001',
        subnetId: 'subnet-mock-pri-1a',
      },
      tags: { Name: 'prod-worker-01', Environment: 'production' },
    }),
    mkResource({
      id: arn('lambda', REGION_USE1, 'function:image-thumbnailer'),
      type: 'lambda_function',
      name: 'image-thumbnailer',
      arn: arn('lambda', REGION_USE1, 'function:image-thumbnailer'),
      region: REGION_USE1,
      properties: {
        runtime: 'nodejs20.x',
        memorySize: 512,
        timeout: 30,
        handler: 'index.handler',
        codeSize: 248_512,
      },
      tags: {},
    }),
    mkResource({
      id: arn('lambda', REGION_USE1, 'function:webhook-handler'),
      type: 'lambda_function',
      name: 'webhook-handler',
      arn: arn('lambda', REGION_USE1, 'function:webhook-handler'),
      region: REGION_USE1,
      properties: {
        runtime: 'python3.12',
        memorySize: 256,
        timeout: 15,
        handler: 'handler.entry',
        codeSize: 89_300,
      },
      tags: {},
    }),

    // ─── networking edge ───
    mkResource({
      id: arn('elasticloadbalancing', REGION_USE1, 'loadbalancer/app/prod-alb/abc123'),
      type: 'load_balancer',
      name: 'prod-alb',
      arn: arn('elasticloadbalancing', REGION_USE1, 'loadbalancer/app/prod-alb/abc123'),
      region: REGION_USE1,
      properties: {
        dnsName: 'prod-alb-1234567890.us-east-1.elb.amazonaws.com',
        scheme: 'internet-facing',
        type: 'application',
        vpcId: 'vpc-mock-prod-001',
        state: 'active',
        availabilityZones: ['us-east-1a', 'us-east-1b'],
      },
      tags: {},
    }),
    mkResource({
      id: 'mock-rest-api-001',
      type: 'api_gateway',
      name: 'public-api',
      arn: `arn:aws:apigateway:${REGION_USE1}::/restapis/mock-rest-api-001`,
      region: REGION_USE1,
      properties: {
        description: 'Public REST API',
        endpointConfiguration: ['EDGE'],
      },
      tags: {},
    }),

    // ─── data ───
    mkResource({
      id: arn('rds', REGION_USE1, 'db:prod-postgres'),
      type: 'rds_instance',
      name: 'prod-postgres',
      arn: arn('rds', REGION_USE1, 'db:prod-postgres'),
      region: REGION_USE1,
      properties: {
        engine: 'postgres',
        engineVersion: '15.4',
        instanceClass: 'db.t4g.medium',
        status: 'available',
        multiAz: true,
        storageGb: 100,
        endpoint: 'prod-postgres.abc123.us-east-1.rds.amazonaws.com',
        publiclyAccessible: false,
      },
      tags: {},
    }),
    mkResource({
      id: arn('dynamodb', REGION_USE1, 'table/prod-sessions'),
      type: 'dynamodb_table',
      name: 'prod-sessions',
      arn: arn('dynamodb', REGION_USE1, 'table/prod-sessions'),
      region: REGION_USE1,
      properties: {
        status: 'ACTIVE',
        itemCount: 142_837,
        sizeBytes: 92_456_192,
        billingMode: 'PAY_PER_REQUEST',
      },
      tags: {},
    }),
    mkResource({
      id: 'claudio-mock-assets',
      type: 's3_bucket',
      name: 'claudio-mock-assets',
      arn: 'arn:aws:s3:::claudio-mock-assets',
      region: REGION_USE1,
      properties: { creationDate: '2024-08-12T10:23:00.000Z' },
      tags: {},
    }),
    mkResource({
      id: 'claudio-mock-backups',
      type: 's3_bucket',
      name: 'claudio-mock-backups',
      arn: 'arn:aws:s3:::claudio-mock-backups',
      region: REGION_USW2,
      properties: { creationDate: '2024-03-04T08:11:00.000Z' },
      tags: {},
    }),

    // ─── containers ───
    mkResource({
      id: arn('ecs', REGION_USE1, 'cluster/prod-services'),
      type: 'ecs_cluster',
      name: 'prod-services',
      arn: arn('ecs', REGION_USE1, 'cluster/prod-services'),
      region: REGION_USE1,
      properties: {
        status: 'ACTIVE',
        runningTasks: 8,
        pendingTasks: 0,
        activeServices: 3,
        registeredInstances: 4,
      },
      tags: {},
    }),
    mkResource({
      id: arn('ecs', REGION_USE1, 'service/prod-services/billing-api'),
      type: 'ecs_service',
      name: 'billing-api',
      arn: arn('ecs', REGION_USE1, 'service/prod-services/billing-api'),
      region: REGION_USE1,
      properties: {
        clusterArn: arn('ecs', REGION_USE1, 'cluster/prod-services'),
        taskDefinition: 'billing-api:42',
        desiredCount: 3,
        runningCount: 3,
        launchType: 'FARGATE',
        status: 'ACTIVE',
      },
      tags: {},
    }),
  ];

  return {
    connectionId,
    syncedAt: new Date().toISOString(),
    resources,
    regionTimings: {
      [REGION_USE1]: 1430,
      [REGION_USW2]: 980,
    },
    errors: [],
  };
}
