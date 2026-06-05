import { NextResponse } from 'next/server';
import { claudeJson } from '@/lib/ai/claude';
import { getOrCreateUserId } from '@/lib/auth/user';

const SYSTEM_PROMPT = `You are a cloud architecture assistant helping developers understand and implement infrastructure components. For each node in the architecture diagram, provide a rich, context-specific response based on the node's function, service type, and its role in the architecture prompt.

You must return a valid JSON object with the following structure:
{
  "summary": "string",
  "costEstimation": {
    "monthly": {
      "low": "$10/mo",
      "medium": "$80/mo",
      "high": "$250/mo"
    },
    "pricingNotes": "string"
  },
  "resilience": {
    "scaling": "string",
    "failover": "string"
  },
  "cdk": {
    "language": "typescript",
    "code": "string"
  },
  "sdk": {
    "language": "python",
    "code": "string"
  },
  "terraform": {
    "code": "string"
  },
  "security": {
    "recommendations": ["string"]
  },
  "integration": {
    "connectedTo": ["string"],
    "protocols": ["string"]
  }
}

Return ONLY the JSON object, no markdown fences, no prose.`;

export async function POST(req: Request) {
  try {
    const userId = await getOrCreateUserId();
    const { nodeId, serviceName, nodePurpose, userPrompt, connectedNodes } =
      await req.json();

    const prompt = `
Architecture prompt: "${userPrompt}"
Node details:
- ID: ${nodeId}
- Service: ${serviceName}
- Function in diagram: "${nodePurpose}"
- Connected to: ${(connectedNodes ?? []).join(', ')}

Generate a detailed response about this node's role, implementation, and best practices. Include realistic cost estimations, security recommendations, and implementation examples.
`;

    const { data } = await claudeJson({
      userId,
      useCase: 'node-details',
      system: SYSTEM_PROMPT,
      message: prompt,
      temperature: 0.4,
      maxTokens: 2048,
    });

    return NextResponse.json(data);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error generating node details:', error);
    return NextResponse.json(
      { error: 'Failed to generate node details' },
      { status: 500 }
    );
  }
}
