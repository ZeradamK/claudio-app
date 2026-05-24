import { NextRequest, NextResponse } from 'next/server';
import { generateArchitectureSuggestion } from '@/ai/flows/generate-architecture-suggestion';
import { architectureStore } from '../store';
import { sanitizeCodeBlock } from '@/utils/codeSanitizer';

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { architectureId, language = 'typescript' } = body;

    if (!architectureId) {
      return NextResponse.json(
        { message: 'Invalid request: architectureId is required' },
        { status: 400 }
      );
    }

    // Check if the architecture exists
    const architecture = architectureStore[architectureId];
    if (!architecture) {
      return NextResponse.json(
        { message: `Architecture with ID ${architectureId} not found` },
        { status: 404 }
      );
    }

    // Convert architecture to string representation for the AI prompt
    const architectureNodesStr = JSON.stringify(architecture.nodes, null, 2);
    const architectureEdgesStr = JSON.stringify(architecture.edges, null, 2);
    const originalPrompt = architecture.metadata?.prompt || "Unknown requirements";

    // Determine language-specific instructions
    let languageInstructions = '';
    let languagePrefix = '';
    
    switch (language) {
      case 'javascript':
        languageInstructions = 'JavaScript';
        languagePrefix = 'js';
        break;
      case 'python':
        languageInstructions = 'Python';
        languagePrefix = 'py';
        break;
      case 'java':
        languageInstructions = 'Java';
        languagePrefix = 'java';
        break;
      case 'csharp':
        languageInstructions = 'C# (.NET)';
        languagePrefix = 'csharp';
        break;
      case 'typescript':
      default:
        languageInstructions = 'TypeScript';
        languagePrefix = 'ts';
    }

    // Generate CDK code using AI
    const prompt = `
I have a cloud architecture design with the following details:

Original Requirements:
${originalPrompt}

Architecture Description:
${architecture.metadata?.rationale || "No rationale provided"}

Architecture Nodes (AWS Services):
${architectureNodesStr}

Architecture Edges (Service Connections):
${architectureEdgesStr}

Please generate complete, deployable AWS CDK code in ${languageInstructions} for this architecture. Include:
1. All necessary imports
2. Main stack definition
3. All resources as per the architecture
4. Proper connections between services
5. IAM roles and permissions
6. Security best practices
7. Comments explaining key parts of the code

IMPORTANT:
- Do NOT leave any code lines incomplete (e.g., environment= must be a complete dictionary).
- All resources must be fully connected (e.g., ALB listeners must have targets).
- All required parameters must be provided.
- Use security groups for all networked resources.
- Use cdk.CfnOutput for key endpoints.
- The code must be ready to deploy with 'cdk synth' and 'cdk deploy' with no errors.
- If the user asks for Terraform, generate a complete, deployable Terraform configuration instead, following the same best practices.
- If the user asks for a different cloud provider (Azure, GCP), generate the equivalent code using the best practices and idioms for that provider's IaC tools (e.g., Bicep, ARM, Pulumi, Google Cloud Deployment Manager, etc.).
- Always use correct and complete code blocks (for example: three backticks python ... three backticks, or three backticks typescript ... three backticks), and never leave code blocks open or incomplete.
- If the architecture requires integration between services (e.g., Lambda to S3, API Gateway to Lambda), ensure all permissions, event sources, and environment variables are set up correctly.
- For all networking resources, ensure proper VPC, subnet, and security group configuration.
- For all IAM roles and policies, use least privilege and attach only the necessary permissions.
- For all storage resources, enable encryption and versioning where appropriate.
- For all compute resources, enable logging and monitoring (e.g., CloudWatch Logs, metrics, alarms).
- If the user asks for cost optimization, include recommendations and code for reserved instances, spot instances, or serverless where possible.
- If the user asks for high availability or disaster recovery, include multi-AZ, backups, and failover configurations.
- If the user asks for CI/CD, include a basic pipeline setup (e.g., CodePipeline, GitHub Actions, etc.).
- If the user asks for secrets management, use AWS Secrets Manager or SSM Parameter Store and show how to reference secrets in code.
- If the user asks for API integrations, ensure endpoints, methods, and integrations are fully defined.
- If the user asks for monitoring, include CloudWatch dashboards, alarms, and log groups.
- If the user asks for tagging, add tags to all resources.
- If the user asks for environment-specific configuration, show how to use context or environment variables.
- If the user asks for modular code, use constructs or modules appropriately.
- If the user asks for multi-account or multi-region, show how to structure the code for those scenarios.
- If the user asks for serverless, use Lambda, API Gateway, DynamoDB, S3, etc., and follow serverless best practices.
- If the user asks for containerization, use ECS, EKS, or Fargate, and show how to build and deploy containers.
- If the user asks for networking, include VPC, subnets, route tables, NAT gateways, and peering as needed.
- If the user asks for security, include WAF, Shield, Cognito, and best practices for securing endpoints and data.
- If the user asks for data analytics, include Kinesis, Redshift, Glue, Athena, etc., and show how to connect them.
- If the user asks for edge cases or advanced scenarios, always provide a complete, working example.
- Always explain any non-obvious configuration with comments in the code.
`;

    const result = await generateArchitectureSuggestion({
      problemStatement: prompt
    });

    // Extract CDK code from the AI response
    let cdkCode = result.cdkCode || result.architectureSuggestion;
    const sanitizedResult = await sanitizeCodeBlock(cdkCode, language);
    cdkCode = sanitizedResult.code;
    
    // Update the architecture in the store with the CDK code
    architectureStore[architectureId] = {
      ...architecture,
      metadata: {
        ...architecture.metadata,
        cdkCode,
        cdkLanguage: language,
        cdkGeneratedAt: new Date().toISOString(),
      }
    };

    console.log(`Generated ${languageInstructions} CDK code for architecture ID: ${architectureId}`);

    // Return the CDK code
    return NextResponse.json({
      id: architectureId,
      cdkCode,
      language
    });
  } catch (error: any) {
    console.error('Error in generate-cdk API:', error);
    return NextResponse.json(
      { message: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 