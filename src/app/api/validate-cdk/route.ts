import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

// Helper to run a shell command and return stdout/stderr
function runCommand(cmd: string, cwd: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    exec(cmd, { cwd }, (error, stdout, stderr) => {
      resolve({ stdout, stderr, code: error ? error.code || 1 : 0 });
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code: userCode, language } = body;
    if (!userCode || !language) {
      return NextResponse.json({ result: 'Missing code or language.' }, { status: 400 });
    }

    // 1. Create a temp directory for this validation
    const tempDir = path.join(os.tmpdir(), `cdk-validate-${uuidv4()}`);
    await fs.mkdir(tempDir, { recursive: true });

    let entryFile = '';
    let dockerImage = '';
    let projectFiles: Record<string, string> = {};

    if (language === 'python') {
      entryFile = 'app.py';
      dockerImage = 'amazon/aws-cdk:latest'; // Official CDK Docker image
      projectFiles = {
        'app.py': userCode,
        'cdk.json': JSON.stringify({ app: 'python3 app.py' }, null, 2),
        'requirements.txt': 'aws-cdk-lib\nconstructs\n',
      };
    } else if (language === 'typescript' || language === 'javascript') {
      entryFile = 'app.ts';
      dockerImage = 'amazon/aws-cdk:latest';
      projectFiles = {
        'app.ts': userCode,
        'cdk.json': JSON.stringify({ app: 'npx ts-node app.ts' }, null, 2),
        'package.json': JSON.stringify({
          name: 'cdk-validate',
          version: '1.0.0',
          dependencies: {
            'aws-cdk-lib': '*',
            'constructs': '*',
            'ts-node': '*',
            'typescript': '*',
          },
        }, null, 2),
        'tsconfig.json': JSON.stringify({
          compilerOptions: {
            target: 'ES2020',
            module: 'commonjs',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
          },
        }, null, 2),
      };
    } else {
      return NextResponse.json({ result: 'Unsupported language.' }, { status: 400 });
    }

    // 2. Write all project files
    await Promise.all(
      Object.entries(projectFiles).map(([filename, content]) =>
        fs.writeFile(path.join(tempDir, filename), content)
      )
    );

    // 3. Run local CDK synth (no Docker)
    let synthCmd = '';
    if (language === 'python') {
      synthCmd = 'pip install -r requirements.txt && cdk synth';
    } else {
      synthCmd = 'npm install && npx cdk synth';
    }

    const { stdout, stderr, code } = await runCommand(synthCmd, tempDir);

    // 4. Clean up
    await fs.rm(tempDir, { recursive: true, force: true });

    // 5. Return results
    if (code === 0) {
      return NextResponse.json({ result: '✅ CDK synth succeeded.\n' + stdout });
    } else {
      return NextResponse.json({ result: '❌ CDK synth failed.\n' + stderr });
    }
  } catch (e) {
    return NextResponse.json({ result: 'Validation failed.' }, { status: 500 });
  }
} 