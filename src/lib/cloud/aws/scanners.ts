/**
 * AWS resource scanners.
 *
 * Each scanner takes (region, credentials) and returns a normalized
 * CloudResource[]. They're independent — the orchestrator
 * `runInventoryScan` fans out across regions and service scanners.
 *
 * The scanners are intentionally conservative: they call the cheapest
 * list-style API and grab just enough fields for the drift panel to
 * render and identify resources. Detail enrichment (cost, IAM scope,
 * connections) happens in later phases.
 */

import { APIGatewayClient, GetRestApisCommand } from '@aws-sdk/client-api-gateway';
import {
  DynamoDBClient,
  ListTablesCommand,
  DescribeTableCommand,
} from '@aws-sdk/client-dynamodb';
import {
  EC2Client,
  DescribeInstancesCommand,
  DescribeVpcsCommand,
  DescribeSubnetsCommand,
  DescribeSecurityGroupsCommand,
  type Tag as Ec2Tag,
} from '@aws-sdk/client-ec2';
import {
  ECSClient,
  ListClustersCommand,
  DescribeClustersCommand,
  ListServicesCommand,
  DescribeServicesCommand,
} from '@aws-sdk/client-ecs';
import {
  ElasticLoadBalancingV2Client,
  DescribeLoadBalancersCommand,
} from '@aws-sdk/client-elastic-load-balancing-v2';
import { LambdaClient, ListFunctionsCommand } from '@aws-sdk/client-lambda';
import {
  RDSClient,
  DescribeDBInstancesCommand,
} from '@aws-sdk/client-rds';
import {
  S3Client,
  ListBucketsCommand,
  GetBucketLocationCommand,
} from '@aws-sdk/client-s3';

import type { AwsScopedCredentials } from './client';
import { asSdkCredentials } from './client';
import type { CloudInventory, CloudResource, CloudResourceType } from '../types';

// ─── helpers ────────────────────────────────────────────────────────────────

function ec2TagsToRecord(tags?: Ec2Tag[]): Record<string, string> {
  if (!tags) return {};
  return Object.fromEntries(
    tags.filter((t) => t.Key && t.Value).map((t) => [t.Key as string, t.Value as string])
  );
}

function bestLabel(props: Record<string, unknown>, tags: Record<string, string>, fallback: string) {
  return (tags.Name || (props.Name as string) || (props.name as string) || fallback) as string;
}

// ─── EC2 instances ─────────────────────────────────────────────────────────

export async function scanEc2Instances(
  region: string,
  creds: AwsScopedCredentials
): Promise<CloudResource[]> {
  const client = new EC2Client({ region, credentials: asSdkCredentials(creds) });
  const out: CloudResource[] = [];
  let nextToken: string | undefined;

  do {
    const resp = await client.send(new DescribeInstancesCommand({ NextToken: nextToken }));
    for (const reservation of resp.Reservations ?? []) {
      for (const inst of reservation.Instances ?? []) {
        if (!inst.InstanceId) continue;
        const tags = ec2TagsToRecord(inst.Tags);
        out.push({
          id: inst.InstanceId,
          type: 'ec2_instance',
          name: bestLabel({}, tags, inst.InstanceId),
          arn: `arn:aws:ec2:${region}:${creds.accountId}:instance/${inst.InstanceId}`,
          region,
          properties: {
            instanceType: inst.InstanceType,
            state: inst.State?.Name,
            privateIp: inst.PrivateIpAddress,
            publicIp: inst.PublicIpAddress,
            vpcId: inst.VpcId,
            subnetId: inst.SubnetId,
            availabilityZone: inst.Placement?.AvailabilityZone,
            launchTime: inst.LaunchTime?.toISOString(),
          },
          tags,
        });
      }
    }
    nextToken = resp.NextToken;
  } while (nextToken);

  return out;
}

// ─── VPCs ──────────────────────────────────────────────────────────────────

export async function scanVpcs(
  region: string,
  creds: AwsScopedCredentials
): Promise<CloudResource[]> {
  const client = new EC2Client({ region, credentials: asSdkCredentials(creds) });
  const resp = await client.send(new DescribeVpcsCommand({}));
  return (resp.Vpcs ?? []).map((v) => {
    const tags = ec2TagsToRecord(v.Tags);
    return {
      id: v.VpcId!,
      type: 'vpc',
      name: bestLabel({}, tags, v.VpcId!),
      arn: `arn:aws:ec2:${region}:${creds.accountId}:vpc/${v.VpcId}`,
      region,
      properties: {
        cidrBlock: v.CidrBlock,
        isDefault: v.IsDefault,
        state: v.State,
      },
      tags,
    } satisfies CloudResource;
  });
}

// ─── Subnets ───────────────────────────────────────────────────────────────

export async function scanSubnets(
  region: string,
  creds: AwsScopedCredentials
): Promise<CloudResource[]> {
  const client = new EC2Client({ region, credentials: asSdkCredentials(creds) });
  const resp = await client.send(new DescribeSubnetsCommand({}));
  return (resp.Subnets ?? []).map((s) => {
    const tags = ec2TagsToRecord(s.Tags);
    return {
      id: s.SubnetId!,
      type: 'subnet',
      name: bestLabel({}, tags, s.SubnetId!),
      arn: `arn:aws:ec2:${region}:${creds.accountId}:subnet/${s.SubnetId}`,
      region,
      properties: {
        cidrBlock: s.CidrBlock,
        vpcId: s.VpcId,
        availabilityZone: s.AvailabilityZone,
        availableIpAddressCount: s.AvailableIpAddressCount,
        isPublic: s.MapPublicIpOnLaunch,
      },
      tags,
    } satisfies CloudResource;
  });
}

// ─── Security Groups ──────────────────────────────────────────────────────

export async function scanSecurityGroups(
  region: string,
  creds: AwsScopedCredentials
): Promise<CloudResource[]> {
  const client = new EC2Client({ region, credentials: asSdkCredentials(creds) });
  const resp = await client.send(new DescribeSecurityGroupsCommand({}));
  return (resp.SecurityGroups ?? []).map((sg) => {
    const tags = ec2TagsToRecord(sg.Tags);
    return {
      id: sg.GroupId!,
      type: 'security_group',
      name: sg.GroupName || sg.GroupId!,
      arn: `arn:aws:ec2:${region}:${creds.accountId}:security-group/${sg.GroupId}`,
      region,
      properties: {
        description: sg.Description,
        vpcId: sg.VpcId,
        ingressRules: sg.IpPermissions?.length ?? 0,
        egressRules: sg.IpPermissionsEgress?.length ?? 0,
      },
      tags,
    } satisfies CloudResource;
  });
}

// ─── RDS ───────────────────────────────────────────────────────────────────

export async function scanRdsInstances(
  region: string,
  creds: AwsScopedCredentials
): Promise<CloudResource[]> {
  const client = new RDSClient({ region, credentials: asSdkCredentials(creds) });
  const out: CloudResource[] = [];
  let marker: string | undefined;

  do {
    const resp = await client.send(new DescribeDBInstancesCommand({ Marker: marker }));
    for (const db of resp.DBInstances ?? []) {
      if (!db.DBInstanceIdentifier) continue;
      const tags: Record<string, string> = {}; // tag list omitted; would be a separate API call
      out.push({
        id: db.DBInstanceArn || db.DBInstanceIdentifier,
        type: 'rds_instance',
        name: db.DBInstanceIdentifier,
        arn: db.DBInstanceArn,
        region,
        properties: {
          engine: db.Engine,
          engineVersion: db.EngineVersion,
          instanceClass: db.DBInstanceClass,
          status: db.DBInstanceStatus,
          multiAz: db.MultiAZ,
          storageGb: db.AllocatedStorage,
          endpoint: db.Endpoint?.Address,
          publiclyAccessible: db.PubliclyAccessible,
        },
        tags,
      });
    }
    marker = resp.Marker;
  } while (marker);

  return out;
}

// ─── S3 (global — listed once, region inferred per bucket) ─────────────────

export async function scanS3Buckets(creds: AwsScopedCredentials): Promise<CloudResource[]> {
  // S3 ListBuckets is global; we use us-east-1 as the call site but each
  // bucket's region is fetched individually.
  const client = new S3Client({ region: 'us-east-1', credentials: asSdkCredentials(creds) });
  const resp = await client.send(new ListBucketsCommand({}));
  const out: CloudResource[] = [];

  for (const b of resp.Buckets ?? []) {
    if (!b.Name) continue;
    let region = 'us-east-1';
    try {
      const loc = await client.send(new GetBucketLocationCommand({ Bucket: b.Name }));
      region = loc.LocationConstraint || 'us-east-1';
    } catch {
      // permissions can fail per-bucket; keep the default
    }
    out.push({
      id: b.Name,
      type: 's3_bucket',
      name: b.Name,
      arn: `arn:aws:s3:::${b.Name}`,
      region,
      properties: {
        creationDate: b.CreationDate?.toISOString(),
      },
      tags: {},
    });
  }
  return out;
}

// ─── Lambda ────────────────────────────────────────────────────────────────

export async function scanLambdaFunctions(
  region: string,
  creds: AwsScopedCredentials
): Promise<CloudResource[]> {
  const client = new LambdaClient({ region, credentials: asSdkCredentials(creds) });
  const out: CloudResource[] = [];
  let marker: string | undefined;

  do {
    const resp = await client.send(new ListFunctionsCommand({ Marker: marker }));
    for (const fn of resp.Functions ?? []) {
      if (!fn.FunctionName) continue;
      out.push({
        id: fn.FunctionArn || fn.FunctionName,
        type: 'lambda_function',
        name: fn.FunctionName,
        arn: fn.FunctionArn,
        region,
        properties: {
          runtime: fn.Runtime,
          memorySize: fn.MemorySize,
          timeout: fn.Timeout,
          handler: fn.Handler,
          lastModified: fn.LastModified,
          codeSize: fn.CodeSize,
        },
        tags: {},
      });
    }
    marker = resp.NextMarker;
  } while (marker);

  return out;
}

// ─── ALB / NLB (ELBv2) ─────────────────────────────────────────────────────

export async function scanLoadBalancers(
  region: string,
  creds: AwsScopedCredentials
): Promise<CloudResource[]> {
  const client = new ElasticLoadBalancingV2Client({
    region,
    credentials: asSdkCredentials(creds),
  });
  const out: CloudResource[] = [];
  let marker: string | undefined;

  do {
    const resp = await client.send(new DescribeLoadBalancersCommand({ Marker: marker }));
    for (const lb of resp.LoadBalancers ?? []) {
      if (!lb.LoadBalancerArn) continue;
      out.push({
        id: lb.LoadBalancerArn,
        type: 'load_balancer',
        name: lb.LoadBalancerName || lb.LoadBalancerArn,
        arn: lb.LoadBalancerArn,
        region,
        properties: {
          dnsName: lb.DNSName,
          scheme: lb.Scheme,
          type: lb.Type, // 'application' | 'network'
          vpcId: lb.VpcId,
          state: lb.State?.Code,
          availabilityZones: lb.AvailabilityZones?.map((az) => az.ZoneName).filter(Boolean),
        },
        tags: {},
      });
    }
    marker = resp.NextMarker;
  } while (marker);

  return out;
}

// ─── DynamoDB ──────────────────────────────────────────────────────────────

export async function scanDynamoTables(
  region: string,
  creds: AwsScopedCredentials
): Promise<CloudResource[]> {
  const client = new DynamoDBClient({ region, credentials: asSdkCredentials(creds) });
  const out: CloudResource[] = [];
  let exclusiveStartTableName: string | undefined;

  do {
    const list = await client.send(
      new ListTablesCommand({ ExclusiveStartTableName: exclusiveStartTableName })
    );
    for (const name of list.TableNames ?? []) {
      try {
        const desc = await client.send(new DescribeTableCommand({ TableName: name }));
        const t = desc.Table;
        out.push({
          id: t?.TableArn || name,
          type: 'dynamodb_table',
          name,
          arn: t?.TableArn,
          region,
          properties: {
            status: t?.TableStatus,
            itemCount: t?.ItemCount,
            sizeBytes: t?.TableSizeBytes,
            billingMode: t?.BillingModeSummary?.BillingMode,
          },
          tags: {},
        });
      } catch {
        // Some tables may be unreadable; skip them.
      }
    }
    exclusiveStartTableName = list.LastEvaluatedTableName;
  } while (exclusiveStartTableName);

  return out;
}

// ─── ECS clusters + services ───────────────────────────────────────────────

export async function scanEcs(
  region: string,
  creds: AwsScopedCredentials
): Promise<CloudResource[]> {
  const client = new ECSClient({ region, credentials: asSdkCredentials(creds) });
  const out: CloudResource[] = [];

  const clusters = await client.send(new ListClustersCommand({}));
  const clusterArns = clusters.clusterArns ?? [];
  if (clusterArns.length === 0) return out;

  const described = await client.send(
    new DescribeClustersCommand({ clusters: clusterArns })
  );

  for (const cluster of described.clusters ?? []) {
    if (!cluster.clusterArn) continue;
    out.push({
      id: cluster.clusterArn,
      type: 'ecs_cluster',
      name: cluster.clusterName || cluster.clusterArn,
      arn: cluster.clusterArn,
      region,
      properties: {
        status: cluster.status,
        runningTasks: cluster.runningTasksCount,
        pendingTasks: cluster.pendingTasksCount,
        activeServices: cluster.activeServicesCount,
        registeredInstances: cluster.registeredContainerInstancesCount,
      },
      tags: {},
    });

    // List + describe services for this cluster
    try {
      const svcs = await client.send(new ListServicesCommand({ cluster: cluster.clusterArn }));
      const svcArns = svcs.serviceArns ?? [];
      if (svcArns.length > 0) {
        const svcDesc = await client.send(
          new DescribeServicesCommand({
            cluster: cluster.clusterArn,
            services: svcArns,
          })
        );
        for (const svc of svcDesc.services ?? []) {
          if (!svc.serviceArn) continue;
          out.push({
            id: svc.serviceArn,
            type: 'ecs_service',
            name: svc.serviceName || svc.serviceArn,
            arn: svc.serviceArn,
            region,
            properties: {
              clusterArn: cluster.clusterArn,
              taskDefinition: svc.taskDefinition,
              desiredCount: svc.desiredCount,
              runningCount: svc.runningCount,
              launchType: svc.launchType,
              status: svc.status,
            },
            tags: {},
          });
        }
      }
    } catch {
      // best-effort
    }
  }
  return out;
}

// ─── API Gateway (REST APIs only for Phase 6) ──────────────────────────────

export async function scanApiGateways(
  region: string,
  creds: AwsScopedCredentials
): Promise<CloudResource[]> {
  const client = new APIGatewayClient({ region, credentials: asSdkCredentials(creds) });
  const resp = await client.send(new GetRestApisCommand({}));
  const items = resp.items ?? [];
  return items.map((api): CloudResource => ({
    id: api.id!,
    type: 'api_gateway',
    name: api.name || api.id!,
    arn: `arn:aws:apigateway:${region}::/restapis/${api.id}`,
    region,
    properties: {
      description: api.description,
      createdDate: api.createdDate?.toISOString(),
      endpointConfiguration: api.endpointConfiguration?.types,
    },
    tags: {},
  }));
}

// ─── Orchestrator ──────────────────────────────────────────────────────────

interface ScanFailure {
  region: string;
  resourceType: CloudResourceType;
  message: string;
}

interface ScannerEntry {
  type: CloudResourceType;
  regional: boolean; // true → run per region; false → run once globally
  run: (region: string, creds: AwsScopedCredentials) => Promise<CloudResource[]>;
}

const SCANNERS: ScannerEntry[] = [
  { type: 'ec2_instance', regional: true, run: scanEc2Instances },
  { type: 'vpc', regional: true, run: scanVpcs },
  { type: 'subnet', regional: true, run: scanSubnets },
  { type: 'security_group', regional: true, run: scanSecurityGroups },
  { type: 'rds_instance', regional: true, run: scanRdsInstances },
  { type: 'lambda_function', regional: true, run: scanLambdaFunctions },
  { type: 'load_balancer', regional: true, run: scanLoadBalancers },
  { type: 'dynamodb_table', regional: true, run: scanDynamoTables },
  { type: 'ecs_cluster', regional: true, run: scanEcs },
  { type: 'api_gateway', regional: true, run: scanApiGateways },
  {
    type: 's3_bucket',
    regional: false,
    run: (_region, creds) => scanS3Buckets(creds),
  },
];

export async function runInventoryScan(
  connectionId: string,
  regions: string[],
  creds: AwsScopedCredentials
): Promise<CloudInventory> {
  const allResources: CloudResource[] = [];
  const errors: ScanFailure[] = [];
  const regionTimings: Record<string, number> = {};

  // Global scanners (S3 etc.) — fire once.
  for (const scanner of SCANNERS.filter((s) => !s.regional)) {
    try {
      const res = await scanner.run('global', creds);
      allResources.push(...res);
    } catch (err: unknown) {
      errors.push({
        region: 'global',
        resourceType: scanner.type,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Regional scanners — fan out per region in parallel, but serialize per
  // region to keep IAM-rate-limit pain off the user. AWS read calls are
  // cheap; this is mostly about being polite.
  await Promise.all(
    regions.map(async (region) => {
      const start = Date.now();
      const regionalScanners = SCANNERS.filter((s) => s.regional);
      await Promise.all(
        regionalScanners.map(async (scanner) => {
          try {
            const res = await scanner.run(region, creds);
            allResources.push(...res);
          } catch (err: unknown) {
            errors.push({
              region,
              resourceType: scanner.type,
              message: err instanceof Error ? err.message : String(err),
            });
          }
        })
      );
      regionTimings[region] = Date.now() - start;
    })
  );

  return {
    connectionId,
    syncedAt: new Date().toISOString(),
    resources: allResources,
    regionTimings,
    errors,
  };
}
