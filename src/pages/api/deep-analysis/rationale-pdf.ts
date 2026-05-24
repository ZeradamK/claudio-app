import type { NextApiRequest, NextApiResponse } from 'next';
import PDFDocument from 'pdfkit';
import { getArchitecture } from '@/store/architecture-store';
import { generateCohereChatCompletion } from '@/ai/cohere-chat';

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
  if (!architectureId || !userPrompt) {
    return res.status(400).json({ error: 'architectureId and userPrompt are required' });
  }

  // 1. Load architecture
  const architecture = await getArchitecture(architectureId);
  if (!architecture) {
    return res.status(404).json({ error: 'Architecture not found' });
  }

  // 2. Build a strong, structured prompt for the LLM
  const systemPrompt = `You are an elite cloud architecture analyst. Given the following AWS architecture and user request, generate a research-grade rationale report.\n\nArchitecture (JSON):\n${JSON.stringify(architecture, null, 2)}\n\nUser Request: ${userPrompt}\n\nYour report must include:\n- Executive summary\n- Per-layer and per-service rationale\n- Risks, tradeoffs, and best practices\n- Actionable recommendations\n- All output in clear, well-structured markdown, suitable for PDF rendering.\n`;

  let rationaleMarkdown = '';
  try {
    rationaleMarkdown = await generateCohereChatCompletion({
      model: 'command-r-plus',
      message: userPrompt,
      promptContext: systemPrompt,
      temperature: 0.3,
      maxTokens: 3000
    });
  } catch (err) {
    console.error('LLM rationale generation failed:', err);
    return res.status(500).json({ error: 'Failed to generate rationale with LLM' });
  }

  // 3. Render markdown to PDF (basic fallback: just text, but keep markdown structure)
  res.setHeader('Content-Disposition', 'attachment; filename="rationale-report.pdf"');
  res.setHeader('Content-Type', 'application/pdf');
  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);
  doc.fontSize(18).text('Architecture Rationale Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12);
  // Simple markdown rendering: bold for #, italics for *, lists, etc.
  const lines = rationaleMarkdown.split('\n');
  lines.forEach(line => {
    if (line.startsWith('# ')) {
      doc.moveDown(0.5).fontSize(16).font('Helvetica-Bold').text(line.replace('# ', ''), { align: 'left' }).fontSize(12).font('Helvetica');
    } else if (line.startsWith('## ')) {
      doc.moveDown(0.3).fontSize(14).font('Helvetica-Bold').text(line.replace('## ', ''), { align: 'left' }).fontSize(12).font('Helvetica');
    } else if (line.startsWith('- ')) {
      doc.text('• ' + line.replace('- ', ''), { indent: 20 });
    } else if (line.startsWith('**') && line.endsWith('**')) {
      doc.font('Helvetica-Bold').text(line.replace(/\*\*/g, ''), { align: 'left' }).font('Helvetica');
    } else if (line.trim() === '') {
      doc.moveDown(0.5);
    } else {
      doc.text(line, { align: 'left' });
    }
  });
  doc.end();
} 