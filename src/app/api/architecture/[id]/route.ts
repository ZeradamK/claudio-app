import { NextRequest, NextResponse } from 'next/server';
import { getArchitecture } from '@/store/architecture-store';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { message: 'Architecture ID is required' },
        { status: 400 }
      );
    }

    // Retrieve architecture from store
    const architecture = await getArchitecture(id);

    if (!architecture) {
      return NextResponse.json(
        { message: `Architecture with ID ${id} not found` },
        { status: 404 }
      );
    }

    console.log(`Retrieved architecture with ID: ${id}`);

    // Return the architecture data
    return NextResponse.json({
      nodes: architecture.nodes,
      edges: architecture.edges,
      metadata: architecture.metadata,
      versions: architecture.versions,
      currentVersion: architecture.currentVersion
    });
  } catch (error: any) {
    console.error('Error in architecture API:', error);
    return NextResponse.json(
      { message: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 