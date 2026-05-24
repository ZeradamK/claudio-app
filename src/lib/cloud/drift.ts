/**
 * Drift detection — compares a Claudio architecture (the *design*) against
 * a CloudInventory (the *deployment*).
 *
 * Strategy:
 *   1. Map each architecture node's loose `data.service` string to one of
 *      our CloudResourceTypes via {@link mapServiceLabelToResourceType}.
 *   2. For each matched type, do a name-based fuzzy join between diagram
 *      nodes and cloud resources of that type.
 *   3. Anything left over on either side falls into in_diagram_only /
 *      in_cloud_only.
 *
 * Match scoring is intentionally simple — exact name → 1.0, normalized
 * contains → 0.7, type-only → 0.3. Phase 7 can swap in a tag-and-edge-aware
 * matcher (e.g. "this Lambda is connected to this RDS, the diagram shows
 * the same wiring, score it higher").
 */

import type { CloudInventory, CloudResource, CloudResourceType, DriftItem, DriftReport } from './types';

// ─── service-label → resource-type mapping ─────────────────────────────────

/**
 * Loose mapping from the human-typed service strings the LLM puts in
 * diagram nodes ("AWS Lambda", "Amazon RDS", "S3", "Elastic Load Balancing"
 * etc.) to our enumerated CloudResourceType. Case-insensitive.
 */
const SERVICE_PATTERNS: Array<{ pattern: RegExp; type: CloudResourceType }> = [
  { pattern: /\b(ec2|elastic\s*compute|virtual\s*machine|instance)\b/i, type: 'ec2_instance' },
  { pattern: /\b(rds|aurora|postgres|mysql|database)\b/i, type: 'rds_instance' },
  { pattern: /\b(s3|simple\s*storage|object\s*storage|bucket)\b/i, type: 's3_bucket' },
  { pattern: /\b(lambda|serverless\s*function|function|faas)\b/i, type: 'lambda_function' },
  { pattern: /\b(vpc|virtual\s*private\s*cloud|network)\b/i, type: 'vpc' },
  { pattern: /\b(subnet)\b/i, type: 'subnet' },
  { pattern: /\b(security\s*group|sg)\b/i, type: 'security_group' },
  { pattern: /\b(load\s*balancer|alb|nlb|elb|application\s*lb|elastic\s*load)\b/i, type: 'load_balancer' },
  { pattern: /\b(dynamodb|dynamo|nosql)\b/i, type: 'dynamodb_table' },
  { pattern: /\b(ecs\s*cluster|fargate\s*cluster|ecs)\b/i, type: 'ecs_cluster' },
  { pattern: /\b(ecs\s*service)\b/i, type: 'ecs_service' },
  { pattern: /\b(api\s*gateway|rest\s*api|apigw)\b/i, type: 'api_gateway' },
];

export function mapServiceLabelToResourceType(service?: string): CloudResourceType | null {
  if (!service) return null;
  for (const { pattern, type } of SERVICE_PATTERNS) {
    if (pattern.test(service)) return type;
  }
  return null;
}

// ─── name normalization & similarity ───────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s\-_\.]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** 0..1 — used to rank candidate matches when more than one is plausible. */
function nameSimilarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.75;
  // Partial overlap: longest common substring length / max length
  const lcs = longestCommonSubstringLength(na, nb);
  return lcs / Math.max(na.length, nb.length);
}

function longestCommonSubstringLength(a: string, b: string): number {
  if (!a || !b) return 0;
  const dp: number[] = new Array(b.length + 1).fill(0);
  let max = 0;
  for (let i = 1; i <= a.length; i++) {
    let prev = 0;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      if (a[i - 1] === b[j - 1]) {
        dp[j] = prev + 1;
        if (dp[j] > max) max = dp[j];
      } else {
        dp[j] = 0;
      }
      prev = tmp;
    }
  }
  return max;
}

// ─── drift report computation ──────────────────────────────────────────────

interface NodeForDrift {
  id: string;
  data?: {
    label?: string;
    service?: string;
    [k: string]: unknown;
  };
}

interface ArchitectureForDrift {
  id: string;
  nodes: NodeForDrift[];
}

export function computeDriftReport(
  arch: ArchitectureForDrift,
  inv: CloudInventory
): DriftReport {
  /** type → resources of that type, mutable so we can pop matched ones. */
  const cloudByType = new Map<CloudResourceType, CloudResource[]>();
  for (const r of inv.resources) {
    if (!cloudByType.has(r.type)) cloudByType.set(r.type, []);
    cloudByType.get(r.type)!.push(r);
  }

  const items: DriftItem[] = [];
  let matched = 0;
  let inDiagramOnly = 0;
  const MATCH_THRESHOLD = 0.5;

  // First pass: match each diagram node to its best cloud candidate
  for (const node of arch.nodes ?? []) {
    const type = mapServiceLabelToResourceType(node.data?.service ?? node.data?.label);
    if (!type) {
      // unknown service mapping — treat as design-only for now
      items.push({
        status: 'in_diagram_only',
        resourceType: 'ec2_instance', // placeholder; UI shows the label string
        label: node.data?.label || node.data?.service || node.id,
        diagramNodeId: node.id,
        diagramService: node.data?.service,
      });
      inDiagramOnly++;
      continue;
    }

    const candidates = cloudByType.get(type) ?? [];
    const diagramLabel = node.data?.label || node.data?.service || node.id;
    let best: { resource: CloudResource; score: number } | null = null;
    for (const cand of candidates) {
      const score = nameSimilarity(diagramLabel, cand.name);
      if (!best || score > best.score) best = { resource: cand, score };
    }

    if (best && best.score >= MATCH_THRESHOLD) {
      items.push({
        status: 'matched',
        resourceType: type,
        label: best.resource.name,
        cloudResource: best.resource,
        diagramNodeId: node.id,
        diagramService: node.data?.service,
        matchConfidence: best.score,
      });
      matched++;
      // remove from candidate pool so it can't double-match
      const arr = cloudByType.get(type)!;
      const idx = arr.indexOf(best.resource);
      if (idx !== -1) arr.splice(idx, 1);
    } else {
      items.push({
        status: 'in_diagram_only',
        resourceType: type,
        label: diagramLabel,
        diagramNodeId: node.id,
        diagramService: node.data?.service,
      });
      inDiagramOnly++;
    }
  }

  // Second pass: everything left in cloudByType is in_cloud_only
  let inCloudOnly = 0;
  for (const [type, leftover] of cloudByType.entries()) {
    for (const r of leftover) {
      items.push({
        status: 'in_cloud_only',
        resourceType: type,
        label: r.name,
        cloudResource: r,
      });
      inCloudOnly++;
    }
  }

  const designedCount = matched + inDiagramOnly;
  const coverageScore = designedCount === 0 ? 0 : matched / designedCount;
  // Penalize extraneous deployed resources: each unmatched cloud resource
  // shaves a small amount. Capped so a noisy account doesn't go negative.
  const totalCloud = inv.resources.length;
  const extraneousRatio = totalCloud === 0 ? 0 : inCloudOnly / Math.max(totalCloud, 1);
  const driftScore = Math.max(0, coverageScore * (1 - 0.5 * extraneousRatio));

  return {
    architectureId: arch.id,
    connectionId: inv.connectionId,
    generatedAt: new Date().toISOString(),
    items,
    summary: {
      matched,
      inDiagramOnly,
      inCloudOnly,
      coverageScore,
      driftScore,
    },
  };
}
