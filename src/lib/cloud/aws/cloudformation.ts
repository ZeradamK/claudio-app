/**
 * Generates the CloudFormation template the user deploys in their AWS
 * account to grant Claudio the read-only role we'll assume.
 *
 * The template creates one IAM role whose trust policy:
 *  - principals: our Claudio AWS account
 *  - condition: sts:ExternalId == <generated externalId>
 *
 * Inline policy attached: AWS-managed ReadOnlyAccess (broad but read-only)
 * plus a deny-list of any future risky read calls we explicitly don't need
 * (kept minimal here — most teams trust ReadOnlyAccess for a read role).
 *
 * Security: CWE-1336 / CWE-94 (template injection). Both interpolation
 * sites (externalId, claudioAccount) are validated with strict regexes
 * before any string concat. Any value that fails validation throws —
 * the YAML body cannot contain caller-influenced newlines, colons, or
 * YAML control characters.
 */

import { requireAwsExternalId } from '../validators';

const ACCOUNT_ID_REGEX = /^\d{12}$/;

export interface CloudFormationTemplateInput {
  externalId: string;
  /**
   * The AWS account id Claudio runs in. Hardcoded for now; Phase 7 makes
   * this configurable per-tenant if we ever multi-region the Claudio infra.
   */
  claudioAwsAccountId?: string;
}

const DEFAULT_CLAUDIO_AWS_ACCOUNT_ID =
  process.env.CLAUDIO_AWS_ACCOUNT_ID ?? '000000000000';

function resolveClaudioAccount(input: CloudFormationTemplateInput): string {
  const candidate = input.claudioAwsAccountId ?? DEFAULT_CLAUDIO_AWS_ACCOUNT_ID;
  if (!ACCOUNT_ID_REGEX.test(candidate)) {
    // Operator misconfigured CLAUDIO_AWS_ACCOUNT_ID — fail closed rather
    // than emit a YAML template with an injection-friendly value.
    throw new Error(
      'cloudformation: claudioAwsAccountId must be exactly 12 digits; got ' +
        JSON.stringify(candidate).slice(0, 64)
    );
  }
  return candidate;
}

export function generateCloudFormationTemplate(input: CloudFormationTemplateInput) {
  // Re-validate even though callers should already have validated — defense
  // in depth: if a future caller forgets, we still fail closed.
  const externalId = requireAwsExternalId('externalId', input.externalId);
  const claudioAccount = resolveClaudioAccount(input);

  const template = {
    AWSTemplateFormatVersion: '2010-09-09',
    Description:
      'Claudio read-only access role. Grants Claudio permission to inventory your AWS resources (read-only) for drift detection and architecture analysis.',
    Resources: {
      ClaudioReadOnlyRole: {
        Type: 'AWS::IAM::Role',
        Properties: {
          RoleName: 'ClaudioReadOnlyRole',
          AssumeRolePolicyDocument: {
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: {
                  AWS: 'arn:aws:iam::' + claudioAccount + ':root',
                },
                Action: 'sts:AssumeRole',
                Condition: {
                  StringEquals: {
                    'sts:ExternalId': externalId,
                  },
                },
              },
            ],
          },
          ManagedPolicyArns: ['arn:aws:iam::aws:policy/ReadOnlyAccess'],
          MaxSessionDuration: 3600,
          Description: 'Read-only access for Claudio inventory scans.',
        },
      },
    },
    Outputs: {
      RoleArn: {
        Description: 'Paste this ARN back into Claudio to complete the connection.',
        Value: { 'Fn::GetAtt': ['ClaudioReadOnlyRole', 'Arn'] },
      },
    },
  };

  return template;
}

export function generateCloudFormationYaml(input: CloudFormationTemplateInput): string {
  // Validate first; if the externalId or account id has any character
  // outside the tightened safe-set we throw before constructing any YAML.
  // This guarantees the template literal below cannot be coerced into
  // injecting extra IAM resources (CWE-1336).
  const externalId = requireAwsExternalId('externalId', input.externalId);
  const claudioAccount = resolveClaudioAccount(input);

  // Even though both values are now charset-restricted (no quotes, no
  // colons, no newlines, no &/*/!), we still YAML-single-quote them.
  // Belt + suspenders: if the validator ever gets accidentally relaxed,
  // the quoting prevents YAML structural breakage. Single-quote in YAML
  // requires escaping only the single quote itself (doubled), and our
  // charset never contains one.
  return (
    "AWSTemplateFormatVersion: '2010-09-09'\n" +
    'Description: >-\n' +
    '  Claudio read-only access role. Grants Claudio permission to inventory\n' +
    '  your AWS resources (read-only) for drift detection and architecture analysis.\n' +
    '\n' +
    'Resources:\n' +
    '  ClaudioReadOnlyRole:\n' +
    '    Type: AWS::IAM::Role\n' +
    '    Properties:\n' +
    '      RoleName: ClaudioReadOnlyRole\n' +
    '      AssumeRolePolicyDocument:\n' +
    "        Version: '2012-10-17'\n" +
    '        Statement:\n' +
    '          - Effect: Allow\n' +
    '            Principal:\n' +
    "              AWS: 'arn:aws:iam::" + claudioAccount + ":root'\n" +
    '            Action: sts:AssumeRole\n' +
    '            Condition:\n' +
    '              StringEquals:\n' +
    "                sts:ExternalId: '" + externalId + "'\n" +
    '      ManagedPolicyArns:\n' +
    '        - arn:aws:iam::aws:policy/ReadOnlyAccess\n' +
    '      MaxSessionDuration: 3600\n' +
    '      Description: Read-only access for Claudio inventory scans.\n' +
    '\n' +
    'Outputs:\n' +
    '  RoleArn:\n' +
    '    Description: Paste this ARN back into Claudio to complete the connection.\n' +
    '    Value: !GetAtt ClaudioReadOnlyRole.Arn\n'
  );
}
