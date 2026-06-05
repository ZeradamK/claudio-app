/**
 * Shared types for the Claudio Cloud (Phase 6) layer.
 *
 * A CloudConnection is one tenant's read-only link to a cloud account
 * (AWS now; GCP/Azure scheduled for later). An Inventory is the cached
 * snapshot of resources we scanned the last time the user clicked "Sync."
 * A DriftReport compares an Inventory against an architecture design.
 *
 * All credential material is stored encrypted on disk via
 * `src/lib/cloud/encryption.ts`; nothing here holds raw keys.
 */

export type CloudProvider = 'aws' | 'gcp' | 'azure';

export type CloudConnectionStatus =
  | 'pending' // created but never synced
  | 'connected' // last sync succeeded
  | 'error' // last sync failed
  | 'unauthorized'; // role assumption fails — user revoked or misconfigured

export type CloudConnectionMode =
  | 'live' // calls real cloud SDKs
  | 'mock'; // returns fixture inventory; used for dev/testing without real keys

export interface CloudConnection {
  id: string;
  /**
   * Owner of this connection. Set at create time from the authenticated
   * caller's identity (currently the cookie-derived UUID, Phase 2 → Clerk
   * user id). Every store read/write must filter by this — see CWE-639
   * (Authorization Bypass Through User-Controlled Key) and CWE-285
   * (Improper Authorization).
   */
  userId: string;
  name: string;
  provider: CloudProvider;
  mode: CloudConnectionMode;

  // AWS-specific fields (populated when provider === 'aws')
  aws?: {
    accountId?: string; // 12-digit AWS account id (filled after first sync)
    /** ARN of the IAM role the user created for us to assume. */
    roleArn: string;
    /**
     * External ID supplied to STS:AssumeRole. We generate this at connection
     * creation time and require it in the trust policy of the user's role —
     * prevents the confused-deputy attack.
     */
    externalId: string;
    regions: string[]; // regions we should scan
  };

  status: CloudConnectionStatus;
  /** ISO-8601 timestamps */
  createdAt: string;
  lastSyncedAt?: string;
  lastErrorMessage?: string;
  /** Last full inventory scan, cached so the UI can render without a fresh API call. */
  lastInventory?: CloudInventory;
}

/**
 * The discrete resource types Phase 6 understands. Adding a type means
 * (1) writing a scanner under `aws/scanners/<type>.ts` and (2) extending
 * `mapServiceLabelToResourceType` in `drift.ts` so the diagram's "AWS Lambda"
 * labels line up with our `lambda` resource type.
 */
export type CloudResourceType =
  | 'ec2_instance'
  | 'rds_instance'
  | 's3_bucket'
  | 'lambda_function'
  | 'vpc'
  | 'subnet'
  | 'security_group'
  | 'load_balancer' // ALB or NLB
  | 'dynamodb_table'
  | 'ecs_cluster'
  | 'ecs_service'
  | 'api_gateway';

export interface CloudResource {
  /** Stable id we can use as a React key. Usually ARN; falls back to name@region. */
  id: string;
  type: CloudResourceType;
  /** Human label shown in the UI. */
  name: string;
  /** AWS ARN (or equivalent) — undefined for resources that don't have one (e.g. some VPC entities). */
  arn?: string;
  region: string;
  /** Free-form attributes specific to the resource type (instance size, status, etc.). */
  properties: Record<string, unknown>;
  /** Tags (key→value). Empty object when none. */
  tags: Record<string, string>;
}

export interface CloudInventory {
  connectionId: string;
  syncedAt: string; // ISO-8601
  /** All resources flattened. UI groups by `type` and `region`. */
  resources: CloudResource[];
  /** Per-region scan timings, mostly for the "Last sync took 12s" footer. */
  regionTimings: Record<string, number>;
  /** Resources we attempted but failed to scan; non-fatal. */
  errors: Array<{ region: string; resourceType: CloudResourceType; message: string }>;
}

// ─── Drift detection ───────────────────────────────────────────────────────

export type DriftStatus =
  | 'matched' // both in diagram and cloud
  | 'in_diagram_only' // designed but not deployed
  | 'in_cloud_only'; // deployed but not in design

export interface DriftItem {
  status: DriftStatus;
  resourceType: CloudResourceType;
  /** Friendly label used in the panel. */
  label: string;
  /** The cloud resource (present when status !== 'in_diagram_only'). */
  cloudResource?: CloudResource;
  /** The diagram node id (present when status !== 'in_cloud_only'). */
  diagramNodeId?: string;
  diagramService?: string;
  /** Confidence 0..1 of the match (only meaningful when status === 'matched'). */
  matchConfidence?: number;
}

export interface DriftReport {
  architectureId: string;
  connectionId: string;
  generatedAt: string;
  items: DriftItem[];
  summary: {
    matched: number;
    inDiagramOnly: number;
    inCloudOnly: number;
    /** 0..1 — fraction of designed nodes that have a matching cloud resource. */
    coverageScore: number;
    /** 0..1 — overall similarity. coverage * (1 - extraneous_penalty). */
    driftScore: number;
  };
}

// ─── Request/response DTOs (the public-facing shape over HTTP) ─────────────

export interface CreateConnectionRequest {
  name: string;
  provider: CloudProvider;
  mode: CloudConnectionMode;
  aws?: {
    roleArn: string;
    regions: string[];
  };
}

export interface CreateConnectionResponse {
  connection: CloudConnection;
  /**
   * Present only when the user picked 'live' mode and AWS. They paste this
   * external id into the trust policy of their IAM role before they share
   * the role ARN with us.
   */
  externalId?: string;
}
