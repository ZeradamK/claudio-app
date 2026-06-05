import { NextResponse } from 'next/server';

import { generateCloudFormationYaml } from '@/lib/cloud/aws/cloudformation';
import { InvalidInputError, requireAwsExternalId } from '@/lib/cloud/validators';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rawExternalId = url.searchParams.get('externalId');
    if (!rawExternalId) {
      return NextResponse.json({ error: 'externalId is required' }, { status: 400 });
    }
    // Strict charset validation BEFORE interpolation into YAML (CWE-1336).
    // The generator re-validates as defense in depth, but doing it here
    // produces a clean 400 with a clear message instead of a 500.
    const externalId = requireAwsExternalId('externalId', rawExternalId);

    const yaml = generateCloudFormationYaml({ externalId });
    return new Response(yaml, {
      headers: {
        'Content-Type': 'text/yaml; charset=utf-8',
        'Content-Disposition': 'attachment; filename="claudio-readonly-role.yaml"',
        // Defense in depth against any attempt to embed the YAML in an
        // <iframe> via X-Frame-Options + CSP. CloudFormation YAML should
        // be a file download only.
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch (err) {
    if (err instanceof InvalidInputError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('[api/cloud/cloudformation-template] failed:', err);
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 });
  }
}
