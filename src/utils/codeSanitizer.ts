// Utility to sanitize LLM-generated code blocks for CDK, SDK, Terraform, etc.
import prettier from 'prettier/standalone';
import tsParser from 'prettier/parser-typescript';
import { execSync } from 'child_process';

export async function sanitizeCodeBlock(raw: string, language: string): Promise<{ code: string, lintMessage?: string }> {
  // Remove HTML tags and artifacts
  let code = raw.replace(/<[^>]+>/g, '');
  // Extract the first code block for the given language
  const regex = new RegExp('```' + language + '\s*([\s\S]+?)```', 'i');
  const match = code.match(regex);
  if (match) code = match[1];
  // Remove any lingering markdown
  code = code.replace(/```/g, '').trim();
  let lintMessage: string | undefined = undefined;
  // Format with Prettier if TypeScript
  if (language.toLowerCase().includes('ts')) {
    try {
      const formatted = await prettier.format(code, { parser: 'typescript', plugins: [tsParser], printWidth: 100 });
      if (formatted.trim() !== code.trim()) {
        lintMessage = 'Lint found: Code was auto-formatted with Prettier.';
        code = formatted;
      }
    } catch (err) {
      console.error('Prettier formatting error:', err);
    }
  }
  // Format with Black if Python
  if (language.toLowerCase().includes('python')) {
    try {
      const { mkdtemp, writeFile, readFile, rm } = await import('fs/promises');
      const { tmpdir } = await import('os');
      const path = await import('path');
      const tempDir = await mkdtemp(path.join(tmpdir(), 'pyfmt-'));
      const filePath = path.join(tempDir, 'main.py');
      await writeFile(filePath, code);
      await new Promise((resolve, reject) => {
        execSync(`black ${filePath} --quiet`, { stdio: 'ignore' });
        resolve(true);
      });
      const formatted = await readFile(filePath, 'utf8');
      if (formatted.trim() !== code.trim()) {
        lintMessage = 'Lint found: Code was auto-formatted with Black.';
        code = formatted;
      }
      await rm(tempDir, { recursive: true, force: true });
    } catch (err) {
      console.error('Black formatting error:', err);
    }
  }
  // Format with terraform fmt if Terraform
  if (language.toLowerCase().includes('terraform') || language.toLowerCase().includes('hcl')) {
    try {
      const { mkdtemp, writeFile, readFile, rm } = await import('fs/promises');
      const { tmpdir } = await import('os');
      const path = await import('path');
      const tempDir = await mkdtemp(path.join(tmpdir(), 'tffmt-'));
      const filePath = path.join(tempDir, 'main.tf');
      await writeFile(filePath, code);
      await new Promise((resolve, reject) => {
        execSync(`terraform fmt ${filePath}`, { stdio: 'ignore' });
        resolve(true);
      });
      const formatted = await readFile(filePath, 'utf8');
      if (formatted.trim() !== code.trim()) {
        lintMessage = 'Lint found: Code was auto-formatted with terraform fmt.';
        code = formatted;
      }
      await rm(tempDir, { recursive: true, force: true });
    } catch (err) {
      console.error('Terraform fmt error:', err);
    }
  }
  return { code, lintMessage };
} 