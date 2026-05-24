'use client';

import { useState } from 'react';
import { Copy, Check, ExternalLink, Download } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface Props {
  externalId: string;
}

export function CloudFormationTemplate({ externalId }: Props) {
  const [copied, setCopied] = useState(false);

  const yaml = `AWSTemplateFormatVersion: '2010-09-09'
Description: Claudio read-only access role

Resources:
  ClaudioReadOnlyRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: ClaudioReadOnlyRole
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              AWS: arn:aws:iam::000000000000:root
            Action: sts:AssumeRole
            Condition:
              StringEquals:
                sts:ExternalId: ${externalId}
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/ReadOnlyAccess
      MaxSessionDuration: 3600

Outputs:
  RoleArn:
    Description: Paste this ARN back into Claudio
    Value: !GetAtt ClaudioReadOnlyRole.Arn`;

  const copy = async () => {
    await navigator.clipboard.writeText(yaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'claudio-readonly-role.yaml';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-neutral-700">
          External ID: <code className="bg-neutral-100 px-2 py-0.5 rounded text-xs">{externalId}</code>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={copy}>
            {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
            {copied ? 'Copied' : 'Copy YAML'}
          </Button>
          <Button size="sm" variant="outline" onClick={download}>
            <Download className="w-4 h-4 mr-1.5" />
            Download
          </Button>
        </div>
      </div>

      <pre className="bg-neutral-900 text-neutral-100 p-4 rounded-lg text-xs overflow-x-auto font-mono leading-relaxed">
        {yaml}
      </pre>

      <a
        href="https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
      >
        Open CloudFormation Console
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
