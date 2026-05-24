import type { NextApiRequest, NextApiResponse } from 'next';
import QuickChart from 'quickchart-js';

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { architectureId } = req.body;
  // TODO: Load real architecture data by ID
  // For now, use mock metrics data
  const chart = new QuickChart();
  chart.setConfig({
    type: 'bar',
    data: {
      labels: ['EC2', 'Lambda', 'DynamoDB', 'ElastiCache', 'CloudFront'],
      datasets: [{
        label: 'Monthly Requests (k)',
        data: [120, 300, 200, 80, 150],
        backgroundColor: '#3b82f6',
      }],
    },
    options: {
      title: { display: true, text: 'Service Usage Metrics' },
      legend: { display: false },
    },
  });
  const imageBuffer = await chart.toBinary();
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', 'inline; filename="metrics-graph.png"');
  res.status(200).send(imageBuffer);
} 