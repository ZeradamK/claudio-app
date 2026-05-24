'use client';

import { useState, useMemo } from 'react';
import { Database, Server, HardDrive, Network, Shield, Cpu, Box, Layers, Globe, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import type { CloudInventory, CloudResource, CloudResourceType } from '@/lib/cloud/types';

const TYPE_META: Record<CloudResourceType, { label: string; icon: typeof Database; color: string }> = {
  ec2_instance: { label: 'EC2 Instances', icon: Server, color: 'text-orange-600 bg-orange-50' },
  rds_instance: { label: 'RDS Databases', icon: Database, color: 'text-blue-600 bg-blue-50' },
  s3_bucket: { label: 'S3 Buckets', icon: HardDrive, color: 'text-green-600 bg-green-50' },
  lambda_function: { label: 'Lambda Functions', icon: Cpu, color: 'text-orange-500 bg-orange-50' },
  vpc: { label: 'VPCs', icon: Network, color: 'text-purple-600 bg-purple-50' },
  subnet: { label: 'Subnets', icon: Layers, color: 'text-purple-500 bg-purple-50' },
  security_group: { label: 'Security Groups', icon: Shield, color: 'text-red-600 bg-red-50' },
  load_balancer: { label: 'Load Balancers', icon: Globe, color: 'text-cyan-600 bg-cyan-50' },
  dynamodb_table: { label: 'DynamoDB Tables', icon: Database, color: 'text-blue-500 bg-blue-50' },
  ecs_cluster: { label: 'ECS Clusters', icon: Box, color: 'text-indigo-600 bg-indigo-50' },
  ecs_service: { label: 'ECS Services', icon: Box, color: 'text-indigo-500 bg-indigo-50' },
  api_gateway: { label: 'API Gateways', icon: Globe, color: 'text-pink-600 bg-pink-50' },
};

export function InventoryView({ inventory }: { inventory: CloudInventory }) {
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState<CloudResourceType | 'all'>('all');

  const grouped = useMemo(() => {
    const g = new Map<CloudResourceType, CloudResource[]>();
    for (const r of inventory.resources) {
      if (!g.has(r.type)) g.set(r.type, []);
      g.get(r.type)!.push(r);
    }
    return g;
  }, [inventory.resources]);

  const filteredResources = useMemo(() => {
    let result = inventory.resources;
    if (activeType !== 'all') {
      result = result.filter((r) => r.type === activeType);
    }
    if (search.trim()) {
      const needle = search.toLowerCase();
      result = result.filter((r) => {
        return (
          r.name.toLowerCase().includes(needle) ||
          (r.arn ?? '').toLowerCase().includes(needle) ||
          r.region.toLowerCase().includes(needle)
        );
      });
    }
    return result;
  }, [inventory.resources, search, activeType]);

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveType('all')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
            activeType === 'all'
              ? 'bg-neutral-900 text-white border-neutral-900'
              : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
          }`}
        >
          All ({inventory.resources.length})
        </button>
        {Array.from(grouped.entries()).map(([type, resources]) => {
          const meta = TYPE_META[type];
          const Icon = meta.icon;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setActiveType(type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                activeType === type
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {meta.label.replace(/s$/, '').replace(/^(EC2|RDS|S3) /, '').trim()} ({resources.length})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, ARN, or region..."
          className="pl-9"
        />
      </div>

      {/* Resource list */}
      <div className="space-y-2">
        {filteredResources.length === 0 ? (
          <Card className="p-8 text-center text-neutral-500 text-sm">
            No resources match the current filter.
          </Card>
        ) : (
          filteredResources.map((r) => <ResourceRow key={r.id} resource={r} />)
        )}
      </div>
    </div>
  );
}

function ResourceRow({ resource }: { resource: CloudResource }) {
  const meta = TYPE_META[resource.type];
  const Icon = meta.icon;

  return (
    <Card className="p-4 flex items-center gap-4 hover:bg-neutral-50 transition-colors">
      <div className={`p-2 rounded-md ${meta.color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-neutral-900 truncate">{resource.name}</span>
          <Badge variant="outline" className="text-xs flex-shrink-0">{resource.region}</Badge>
        </div>
        {resource.arn && (
          <div className="text-xs text-neutral-500 font-mono truncate mt-0.5">{resource.arn}</div>
        )}
      </div>
      <div className="flex-shrink-0 text-xs text-neutral-600 text-right">
        {summaryFor(resource)}
      </div>
    </Card>
  );
}

function summaryFor(r: CloudResource): string {
  const p = r.properties as Record<string, unknown>;
  switch (r.type) {
    case 'ec2_instance':
      return `${p.instanceType ?? '?'} • ${p.state ?? '?'}`;
    case 'rds_instance':
      return `${p.engine ?? '?'} ${p.engineVersion ?? ''} • ${p.instanceClass ?? '?'}`;
    case 'lambda_function':
      return `${p.runtime ?? '?'} • ${p.memorySize ?? '?'}MB`;
    case 'load_balancer':
      return `${p.type ?? '?'} • ${p.scheme ?? '?'}`;
    case 'dynamodb_table':
      return `${p.itemCount ?? 0} items`;
    case 'ecs_cluster':
      return `${p.runningTasks ?? 0} tasks running`;
    case 'ecs_service':
      return `${p.runningCount ?? 0}/${p.desiredCount ?? 0} tasks`;
    case 's3_bucket':
      return p.creationDate ? `Created ${new Date(p.creationDate as string).toLocaleDateString()}` : '';
    case 'vpc':
      return `CIDR ${p.cidrBlock ?? '?'}`;
    case 'subnet':
      return `${p.isPublic ? 'public' : 'private'} • ${p.availabilityZone ?? '?'}`;
    default:
      return '';
  }
}
