import { NextResponse } from 'next/server';

import { generateCloudFormationYaml } from '@/lib/cloud/aws/cloudformation';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const externalId = url.searchParams.get('externalId');
  if (!externalId) {
    return NextResponse.json(
      { error: 'externalId is required' },
      { status: 400 }
    );
  }
  const yaml = generateCloudFormationYaml({ externalId });
  return new Response(yaml, {
    headers: {
      'Content-Type': 'text/yaml; charset=utf-8',
      'Content-Disposition': 'attachment; filename="claudio-readonly-role.yaml"',
    },
  });
}
