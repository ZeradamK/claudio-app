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
 * The user pastes this template into the CloudFormation console, deploys,
 * and copies the resulting role ARN back into Claudio.
 */

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

export function generateCloudFormationTemplate(input: CloudFormationTemplateInput) {
  const claudioAccount = input.claudioAwsAccountId ?? DEFAULT_CLAUDIO_AWS_ACCOUNT_ID;

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
                  AWS: `arn:aws:iam::${claudioAccount}:root`,
                },
                Action: 'sts:AssumeRole',
                Condition: {
                  StringEquals: {
                    'sts:ExternalId': input.externalId,
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
  // Hand-rolled YAML to avoid pulling in a YAML dep just for this. The
  // structure is small and stable.
  const claudioAccount =
    input.claudioAwsAccountId ?? DEFAULT_CLAUDIO_AWS_ACCOUNT_ID;
  return `AWSTemplateFormatVersion: '2010-09-09'
Description: >-
  Claudio read-only access role. Grants Claudio permission to inventory
  your AWS resources (read-only) for drift detection and architecture analysis.

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
              AWS: arn:aws:iam::${claudioAccount}:root
            Action: sts:AssumeRole
            Condition:
              StringEquals:
                sts:ExternalId: ${input.externalId}
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/ReadOnlyAccess
      MaxSessionDuration: 3600
      Description: Read-only access for Claudio inventory scans.

Outputs:
  RoleArn:
    Description: Paste this ARN back into Claudio to complete the connection.
    Value: !GetAtt ClaudioReadOnlyRole.Arn
`;
}
