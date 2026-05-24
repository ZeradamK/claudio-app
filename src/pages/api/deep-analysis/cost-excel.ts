import type { NextApiRequest, NextApiResponse } from 'next';
import XLSX from 'xlsx';
import { getArchitecture } from '@/store/architecture-store';
import { cohere } from '@/lib/cohere';

// Placeholder: Local AWS pricing table (to be replaced with a real one)
const AWS_PRICING = {
  EC2: 0.0416, // t3.medium per hour
  Lambda: 0.00001667, // per GB-second
  DynamoDB: 1.25, // per million write request units
  ElastiCache: 0.017, // cache.t3.micro per hour
  CloudFront: 0.085, // per TB data out
  // ... add more as needed
};

function getNodeCost(node: any, months: number = 1): number {
  // Simple cost estimation based on service type and quantity
  const { service } = node.data || {};
  const price = AWS_PRICING[service as keyof typeof AWS_PRICING] || 10; // fallback price
  // For demo: assume 730 hours/month for hourly services
  if (service === 'EC2' || service === 'ElastiCache') {
    return price * 730 * months;
  }
  // For Lambda: assume 1M invocations, 128MB, 100ms avg duration
  if (service === 'Lambda') {
    return price * 1000000 * months;
  }
  // For DynamoDB: assume 1M write units
  if (service === 'DynamoDB') {
    return price * months;
  }
  // For CloudFront: assume 1TB data out
  if (service === 'CloudFront') {
    return price * months;
  }
  // Default: flat per month
  return price * months;
}

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { architectureId, userPrompt } = req.body;
  console.log('Received request:', { architectureId, userPrompt });
  if (!architectureId || !userPrompt) {
    console.error('Missing architectureId or userPrompt');
    return res.status(400).json({ error: 'architectureId and userPrompt are required' });
  }

  // 1. Load architecture
  const architecture = await getArchitecture(architectureId);
  console.log('Loaded architecture:', architecture);
  if (!architecture) {
    console.error('Architecture not found for ID:', architectureId);
    return res.status(404).json({ error: 'Architecture not found' });
  }

  // 2. AGI-grade LLM intent extraction
  let intent = {
    timeRange: 1, // months
    granularity: 'monthly',
    focus: 'all',
    layer: null,
    service: null,
    forecast: false,
    businessContext: '',
    outputFormat: 'detailed',
  };
  try {
    const cohereIntentPrompt = `You are an elite cloud cost analysis AGI. Extract the following fields from the user's request for a cloud cost Excel report, considering all business and technical context:
- timeRange: number of months or years (default 1 month)
- granularity: 'monthly', 'quarterly', 'yearly', etc.
- focus: 'all', 'layer', or 'service'
- layer: if focus is 'layer', which layer (e.g. DB, Web, App, etc.)
- service: if focus is 'service', which service (e.g. EC2, Lambda, etc.)
- forecast: true if user wants a forecast over time
- businessContext: any business or usage context implied by the prompt
- outputFormat: 'detailed', 'summary', or 'custom' (if user specifies)

User request: "${userPrompt}"

Return a valid JSON object with these fields. If any field is not specified, infer the best default for a cloud architect.`;
    const cohereResp = await cohere.generate({
      model: process.env.COHERE_MODEL || 'command-a-03-2025',
      prompt: cohereIntentPrompt,
      maxTokens: 300,
      temperature: 0.2,
    });
    const text = cohereResp.generations?.[0]?.text || '{}';
    intent = { ...intent, ...JSON.parse(text) };
    console.log('AGI intent extraction:', intent);
  } catch (e) {
    console.error('Error parsing AGI intent with Cohere:', e);
    // fallback to defaults
  }

  // 3. Filter nodes based on intent
  let nodes = architecture.nodes || [];
  if (intent.focus === 'layer' && intent.layer) {
    nodes = nodes.filter((n: any) => (n.data?.layer || '').toLowerCase() === String(intent.layer).toLowerCase());
  } else if (intent.focus === 'service' && intent.service) {
    nodes = nodes.filter((n: any) => (n.data?.service || '').toLowerCase() === String(intent.service).toLowerCase());
  }
  console.log('Filtered nodes:', nodes);

  // 4. Calculate costs
  const months = intent.timeRange || 1;
  const costRows = nodes.map((n: any) => ({
    Layer: n.data?.layer || '',
    Service: n.data?.service || '',
    Label: n.data?.label || '',
    Cost: getNodeCost(n, months),
  }));
  const totalCost = costRows.reduce((sum, row) => sum + row.Cost, 0);
  console.log('Cost rows:', costRows);
  console.log('Total cost:', totalCost);

  // 5. Generate Excel sheets
  const wb = XLSX.utils.book_new();
  // Summary sheet
  const summaryData = [
    { Description: 'Total Cost', Value: totalCost },
    { Description: 'Time Range', Value: `${months} month(s)` },
    { Description: 'Granularity', Value: intent.granularity },
    { Description: 'Focus', Value: intent.focus },
    { Description: 'Layer', Value: intent.layer || '' },
    { Description: 'Service', Value: intent.service || '' },
    { Description: 'Business Context', Value: intent.businessContext || '' },
    { Description: 'Output Format', Value: intent.outputFormat || '' },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), 'Summary');
  // Breakdown sheet
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(costRows), 'Breakdown');
  // Forecast sheet (if requested)
  if (intent.forecast) {
    const forecastRows = [];
    for (let m = 1; m <= months; m++) {
      const monthCost = costRows.reduce((sum, row) => sum + row.Cost / months, 0);
      forecastRows.push({ Month: m, Cost: monthCost });
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(forecastRows), 'Forecast');
    console.log('Forecast rows:', forecastRows);
  }

  // 6. AGI-grade expert commentary and orchestration
  let commentary = '';
  try {
    const explainPrompt = `You are an AGI-level cloud cost analyst. Given the following architecture and cost breakdown, generate a world-class Excel report commentary in structured markdown, including:
- Executive summary (1-2 paragraphs)
- Per-layer and per-service cost breakdown tables
- Forecast tables (if requested)
- Actionable optimization recommendations (bulleted)
- Risks, anomalies, and best practices (bulleted)
- Any business context or usage patterns
- All output should be clear, structured, and ready for Excel/BI import

ARCHITECTURE CONTEXT:
${JSON.stringify(architecture, null, 2)}

FILTERED NODES:
${JSON.stringify(nodes, null, 2)}

COST BREAKDOWN:
${JSON.stringify(costRows, null, 2)}

USER REQUEST: "${userPrompt}"

Return only the markdown commentary.`;
    const explainResp = await cohere.generate({
      model: process.env.COHERE_MODEL || 'command-a-03-2025',
      prompt: explainPrompt,
      maxTokens: 800,
      temperature: 0.3,
    });
    commentary = explainResp.generations?.[0]?.text || '';
    console.log('AGI commentary:', commentary);
  } catch (e) {
    commentary = 'No commentary available.';
    console.error('Error generating AGI commentary with Cohere:', e);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[commentary]]), 'Expert Commentary');

  // 7. Return Excel file
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  console.log('Excel file generated, sending response.');
  res.setHeader('Content-Disposition', 'attachment; filename="cost-breakdown.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.status(200).send(buf);
} 