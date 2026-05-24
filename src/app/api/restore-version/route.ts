import { NextRequest, NextResponse } from 'next/server';
import { getArchitecture, saveArchitecture } from '@/store/architecture-store';

export async function POST(req: NextRequest) {
  try {
    const { architectureId, version } = await req.json();
    if (!architectureId || typeof version !== 'number') {
      return NextResponse.json({ error: 'Missing architectureId or version' }, { status: 400 });
    }
    const arch = await getArchitecture(architectureId);
    if (!arch || !arch.versions) {
      return NextResponse.json({ error: 'Architecture or versions not found' }, { status: 404 });
    }
    const target = arch.versions.find((v: any) => v.version === version);
    if (!target) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }
    // Set as current version and update nodes/edges/metadata
    const updated = {
      ...arch,
      nodes: target.nodes,
      edges: target.edges,
      metadata: target.metadata,
      currentVersion: version,
    };
    await saveArchitecture(architectureId, updated, 'restore');
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
} 