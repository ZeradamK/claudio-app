import { NextRequest, NextResponse } from 'next/server';
import { claudeChat, isClaudeConfigured } from '@/lib/ai/claude';
import { getOrCreateUserId } from '@/lib/auth/user';

export async function POST(request: NextRequest) {
  try {
    const userId = await getOrCreateUserId();
    const { service, label, language, cloudProvider = 'aws' } = await request.json();

    if (!service || !language) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    let implementation = '';

    try {
      if (isClaudeConfigured()) {
        implementation = await generateWithClaude(userId, service, language, cloudProvider);
      } else {
        implementation = generateMockImplementation(service, label, language, cloudProvider);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error generating SDK implementation:', error);
      implementation = generateMockImplementation(service, label, language, cloudProvider);
    }

    return NextResponse.json({ implementation });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error processing SDK implementation request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

async function generateWithClaude(userId: string, service: string, language: string, cloudProvider: string) {
  const prompt = `Generate realistic, accurate, and well-formatted ${language} code for implementing the ${service} service on ${cloudProvider.toUpperCase()}.

The code should:
1. Include necessary imports and library references
2. Show initialization of the service client
3. Include a basic example function demonstrating common operations
4. Include relevant error handling
5. Follow best practices for the ${language} language
6. Be specific to ${cloudProvider.toUpperCase()} services
7. Include helpful comments

Output only the code, no explanations before or after, no markdown fences.`;

  const { content } = await claudeChat({
    userId,
    useCase: 'sdk-snippet',
    message: prompt,
    temperature: 0.3,
    maxTokens: 1024,
  });

  // Strip any code fences Claude may have added despite instructions
  const fenceMatch = content.trim().match(/^```(?:[\w]+)?\s*\n?([\s\S]*?)\n?```\s*$/);
  return (fenceMatch ? fenceMatch[1] : content).trim();
}

// Generate mock SDK implementation
function generateMockImplementation(service: string, label: string, language: string, cloudProvider: string = 'aws') {
  // Map of cloud provider services to their SDK package names
  const sdkMapping: Record<string, Record<string, Record<string, string>>> = {
    "aws": {
      "javascript": {
        "prefix": "aws-sdk",
        "importStyle": "import { %SERVICE% } from 'aws-sdk';",
        "clientInit": "const client = new %SERVICE%({ region: 'us-west-2' });"
      },
      "typescript": {
        "prefix": "@aws-sdk/client",
        "importStyle": "import { %SERVICE%Client, %SERVICE%ServiceException } from '@aws-sdk/client-%SERVICE_LOWER%';",
        "clientInit": "const client = new %SERVICE%Client({ region: 'us-west-2' });"
      },
      "python": {
        "prefix": "boto3",
        "importStyle": "import boto3\nimport botocore.exceptions",
        "clientInit": "client = boto3.client('%SERVICE_LOWER%', region_name='us-west-2')"
      },
      "java": {
        "prefix": "software.amazon.awssdk",
        "importStyle": "import software.amazon.awssdk.regions.Region;\nimport software.amazon.awssdk.services.%SERVICE_LOWER%.%SERVICE%Client;\nimport software.amazon.awssdk.services.%SERVICE_LOWER%.model.*;",
        "clientInit": "%SERVICE%Client client = %SERVICE%Client.builder()\n    .region(Region.US_WEST_2)\n    .build();"
      },
      "go": {
        "prefix": "github.com/aws/aws-sdk-go",
        "importStyle": "import (\n    \"github.com/aws/aws-sdk-go/aws\"\n    \"github.com/aws/aws-sdk-go/aws/session\"\n    \"github.com/aws/aws-sdk-go/service/%SERVICE_LOWER%\"\n)",
        "clientInit": "sess := session.Must(session.NewSession())\nclient := %SERVICE_LOWER%.New(sess, aws.NewConfig().WithRegion(\"us-west-2\"))"
      }
    },
    "azure": {
      "javascript": {
        "prefix": "@azure/",
        "importStyle": "import { %SERVICE%Client } from '@azure/%SERVICE_LOWER%';\nimport { DefaultAzureCredential } from '@azure/identity';",
        "clientInit": "const credential = new DefaultAzureCredential();\nconst client = new %SERVICE%Client(credential);"
      },
      "typescript": {
        "prefix": "@azure/",
        "importStyle": "import { %SERVICE%Client } from '@azure/%SERVICE_LOWER%';\nimport { DefaultAzureCredential } from '@azure/identity';\nimport { %SERVICE%Models } from '@azure/%SERVICE_LOWER%/models';",
        "clientInit": "const credential = new DefaultAzureCredential();\nconst client = new %SERVICE%Client(credential);"
      },
      "python": {
        "prefix": "azure.",
        "importStyle": "from azure.identity import DefaultAzureCredential\nfrom azure.%SERVICE_LOWER% import %SERVICE%Client",
        "clientInit": "credential = DefaultAzureCredential()\nclient = %SERVICE%Client(credential)"
      },
      "java": {
        "prefix": "com.azure.",
        "importStyle": "import com.azure.identity.DefaultAzureCredential;\nimport com.azure.%SERVICE_LOWER%.%SERVICE%Client;\nimport com.azure.%SERVICE_LOWER%.%SERVICE%ClientBuilder;",
        "clientInit": "DefaultAzureCredential credential = new DefaultAzureCredential();\n%SERVICE%Client client = new %SERVICE%ClientBuilder()\n    .credential(credential)\n    .buildClient();"
      },
      "go": {
        "prefix": "github.com/Azure/azure-sdk-for-go",
        "importStyle": "import (\n    \"github.com/Azure/azure-sdk-for-go/services/%SERVICE_LOWER%\"\n    \"github.com/Azure/go-autorest/autorest/azure/auth\"\n)",
        "clientInit": "authorizer, _ := auth.NewAuthorizerFromEnvironment()\nclient := %SERVICE_LOWER%.New%SERVICE%Client()\nclient.Authorizer = authorizer"
      }
    },
    "gcp": {
      "javascript": {
        "prefix": "@google-cloud/",
        "importStyle": "import { %SERVICE% } from '@google-cloud/%SERVICE_LOWER%';",
        "clientInit": "const client = new %SERVICE%();"
      },
      "typescript": {
        "prefix": "@google-cloud/",
        "importStyle": "import { %SERVICE%, %SERVICE%Client } from '@google-cloud/%SERVICE_LOWER%';\nimport { protos } from '@google-cloud/%SERVICE_LOWER%';",
        "clientInit": "const client = new %SERVICE%Client();"
      },
      "python": {
        "prefix": "google.cloud.",
        "importStyle": "from google.cloud import %SERVICE_LOWER%\nfrom google.api_core import exceptions",
        "clientInit": "client = %SERVICE_LOWER%.%SERVICE%Client()"
      },
      "java": {
        "prefix": "com.google.cloud.",
        "importStyle": "import com.google.cloud.%SERVICE_LOWER%.%SERVICE%;\nimport com.google.cloud.%SERVICE_LOWER%.%SERVICE%Options;",
        "clientInit": "%SERVICE% client = %SERVICE%.getService();"
      },
      "go": {
        "prefix": "cloud.google.com/go",
        "importStyle": "import (\n    \"context\"\n    \"cloud.google.com/go/%SERVICE_LOWER%\"\n    \"google.golang.org/api/option\"\n)",
        "clientInit": "ctx := context.Background()\nclient, err := %SERVICE_LOWER%.New%SERVICE%Client(ctx)"
      }
    }
  };

  // Normalize service name
  let normalizedService = service.replace(/\s+/g, '');
  let serviceLower = normalizedService.toLowerCase();
  
  // Generate mock implementation based on language and cloud provider
  const providerSdk = sdkMapping[cloudProvider]?.[language] || sdkMapping.aws.javascript;
  
  // Replace placeholders in the import style and client initialization
  const importCode = providerSdk.importStyle
    .replace(/%SERVICE%/g, normalizedService)
    .replace(/%SERVICE_LOWER%/g, serviceLower);
    
  const clientInitCode = providerSdk.clientInit
    .replace(/%SERVICE%/g, normalizedService)
    .replace(/%SERVICE_LOWER%/g, serviceLower);
  
  // Sample function names for different languages
  const functionNames: Record<string, string> = {
    "javascript": `async function get${normalizedService}Details(id) {`,
    "typescript": `async function get${normalizedService}Details(id: string): Promise<any> {`,
    "python": `def get_${serviceLower}_details(id):`,
    "java": `public Map<String, Object> get${normalizedService}Details(String id) throws Exception {`,
    "go": `func get${normalizedService}Details(id string) (map[string]interface{}, error) {`
  };
  
  // Function implementations for different languages
  const functionImpls: Record<string, string[]> = {
    "javascript": [
      `  try {`,
      `    // Call the ${service} API to get details`,
      `    const response = await client.get${normalizedService}({ Id: id });`,
      `    console.log('Successfully retrieved details:', response);`,
      `    return response;`,
      `  } catch (error) {`,
      `    console.error('Error getting ${service} details:', error);`,
      `    throw error;`,
      `  }`,
      `}`
    ],
    "typescript": [
      `  try {`,
      `    // Call the ${service} API to get details`,
      `    const response = await client.get${normalizedService}({ Id: id });`,
      `    console.log('Successfully retrieved details:', response);`,
      `    return response;`,
      `  } catch (error) {`,
      `    console.error('Error getting ${service} details:', error);`,
      `    throw error;`,
      `  }`,
      `}`
    ],
    "python": [
      `    try:`,
      `        # Call the ${service} API to get details`,
      `        response = client.get_${serviceLower}(id=id)`,
      `        print(f"Successfully retrieved details: {response}")`,
      `        return response`,
      `    except exceptions.NotFound:`,
      `        print(f"${service} with ID {id} not found")`,
      `        raise`,
      `    except Exception as e:`,
      `        print(f"Error getting ${service} details: {e}")`,
      `        raise`
    ],
    "java": [
      `    try {`,
      `        // Call the ${service} API to get details`,
      `        Get${normalizedService}Request request = Get${normalizedService}Request.builder()`,
      `            .id(id)`,
      `            .build();`,
      `        Get${normalizedService}Response response = client.get${normalizedService}(request);`,
      `        System.out.println("Successfully retrieved details: " + response);`,
      `        `,
      `        // Convert response to a Map for easier handling`,
      `        Map<String, Object> result = new HashMap<>();`,
      `        result.put("id", response.id());`,
      `        result.put("name", response.name());`,
      `        return result;`,
      `    } catch (Exception e) {`,
      `        System.err.println("Error getting ${service} details: " + e.getMessage());`,
      `        throw e;`,
      `    }`,
      `}`
    ],
    "go": [
      `    // Create the request`,
      `    req := &${serviceLower}.Get${normalizedService}Request{`,
      `        Id: id,`,
      `    }`,
      `    `,
      `    // Call the ${service} API to get details`,
      `    resp, err := client.Get${normalizedService}(ctx, req)`,
      `    if err != nil {`,
      `        fmt.Printf("Error getting ${service} details: %v\\n", err)`,
      `        return nil, err`,
      `    }`,
      `    `,
      `    fmt.Printf("Successfully retrieved details: %v\\n", resp)`,
      `    `,
      `    // Convert response to a map for easier handling`,
      `    result := make(map[string]interface{})`,
      `    result["id"] = resp.Id`,
      `    result["name"] = resp.Name`,
      `    `,
      `    return result, nil`,
      `}`
    ]
  };
  
  // Get the appropriate function name and implementation for the language
  const functionName = functionNames[language] || functionNames.javascript;
  const functionImpl = functionImpls[language] || functionImpls.javascript;
  
  // Build the full implementation
  const fullImplementation = [
    `// ${cloudProvider.toUpperCase()} ${service} implementation in ${language}`,
    importCode,
    '',
    '// Initialize the client',
    clientInitCode,
    '',
    '// Function to get details about a specific resource',
    functionName,
    ...functionImpl
  ].join('\n');
  
  return fullImplementation;
} 