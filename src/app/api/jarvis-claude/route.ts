import { NextRequest, NextResponse } from 'next/server';
import { streamingCohereChatCompletion } from '@/ai/cohere-streaming';
import { detectArchitectureIntent } from '@/ai/intent/architectureIntents';
import { generateCohereChatCompletion } from '@/ai/cohere-chat';
import { processArchitectureWithIcons } from '@/ai/middleware/architectureIconProcessor';
import { getArchitecture, saveArchitecture } from '@/store/architecture-store';

export async function POST(req: NextRequest) {
  try {
    const { message, architectureId, cloudProvider = 'aws' } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Detect if this is an architecture modification request
    const intentResult = await detectArchitectureIntent(message);
    
    if (intentResult && architectureId) {
      // Handle architecture modification
      return await handleArchitectureModification(message, architectureId, cloudProvider, intentResult);
    } else {
      // Handle regular chat
      return await handleRegularChat(message, cloudProvider, architectureId);
    }
  } catch (error) {
    console.error('Error in Jarvis chat:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleArchitectureModification(
  message: string,
  architectureId: string,
  cloudProvider: string,
  intentResult: any
) {
  try {
    // Get current architecture
    const currentArchitecture = await getArchitecture(architectureId);
    if (!currentArchitecture) {
      return NextResponse.json({ error: 'Architecture not found' }, { status: 404 });
    }

    // Create context-aware prompt for architecture modification
    const modificationPrompt = `
You are an expert cloud architect. The user wants to modify an existing architecture.

CURRENT ARCHITECTURE:
${JSON.stringify({
  nodes: currentArchitecture.nodes.map(n => ({
    id: n.id,
    service: n.data.service,
    label: n.data.label,
    layer: n.data.layer
  })),
  edges: currentArchitecture.edges.map(e => ({
    source: e.source,
    target: e.target,
    label: e.label
  }))
}, null, 2)}

USER REQUEST: ${message}

DETECTED INTENT: ${intentResult.type} - ${intentResult.entities.services?.join(', ') || 'general modification'}

Generate a COMPLETE updated architecture in JSON format that incorporates the user's requested changes.
Return ONLY valid JSON in this exact format:

{
  "nodes": [
    {
      "id": "unique-id",
      "type": "aws-service",
      "position": {"x": number, "y": number},
      "data": {
        "label": "Service Name",
        "service": "AWS Service Type",
        "description": "Brief description",
        "estCost": "$X/month",
        "faultTolerance": "High/Medium/Low",
        "layer": "presentation/application/data"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-id",
      "source": "source-node-id",
      "target": "target-node-id",
      "type": "smoothstep",
      "animated": true,
      "label": "Connection description"
    }
  ],
  "metadata": {
    "title": "Updated Architecture Title",
    "description": "What was changed",
    "cloudProvider": "${cloudProvider}",
    "estimatedCost": "$X/month",
    "changes": "Summary of changes made"
  }
}`;

    // Generate updated architecture using Cohere Command A
    const response = await generateCohereChatCompletion({
      model: 'command-a-03-2025',
      message: modificationPrompt,
      temperature: 0.3,
      maxTokens: 4000
    });

    // Parse and process the response
    let updatedArchitecture;
    try {
      updatedArchitecture = JSON.parse(response);
    } catch (parseError) {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        updatedArchitecture = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON response from AI');
      }
    }

    // Process with icon resolution
    const processedArchitecture = await processArchitectureWithIcons(updatedArchitecture, cloudProvider);

    // Update the stored architecture
    const newArchitectureData = {
      nodes: processedArchitecture.nodes,
      edges: processedArchitecture.edges,
      metadata: {
        ...currentArchitecture.metadata,
        ...updatedArchitecture.metadata,
        lastModified: new Date().toISOString(),
        modificationHistory: [
          ...(currentArchitecture.metadata?.modificationHistory || []),
          {
            timestamp: new Date().toISOString(),
            request: message,
            changes: updatedArchitecture.metadata?.changes || 'Architecture updated'
          }
        ]
      }
    };

    await saveArchitecture(architectureId, newArchitectureData, 'Claudio Chat');

    // Return success response
    return NextResponse.json({
      success: true,
      message: `✅ Architecture updated successfully! ${updatedArchitecture.metadata?.changes || 'Changes applied.'}`,
      architectureUpdated: true,
      changes: updatedArchitecture.metadata?.changes
    });

  } catch (error) {
    console.error('Error modifying architecture:', error);
    return NextResponse.json({
      success: false,
      message: `❌ Failed to update architecture: ${error instanceof Error ? error.message : 'Unknown error'}`,
      architectureUpdated: false
    });
  }
}

async function handleRegularChat(message: string, cloudProvider: string, architectureId?: string) {
  // Get current architecture context if available
  let architectureContext = '';
  if (architectureId) {
    try {
      const currentArchitecture = await getArchitecture(architectureId);
      if (currentArchitecture) {
        // Create a detailed context of the current architecture
        const services = currentArchitecture.nodes.map(node => ({
          name: node.data.label,
          service: node.data.service,
          description: node.data.description,
          layer: node.data.layer,
          cost: node.data.estCost
        }));

        const connections = currentArchitecture.edges.map(edge => {
          const sourceNode = currentArchitecture.nodes.find(n => n.id === edge.source);
          const targetNode = currentArchitecture.nodes.find(n => n.id === edge.target);
          return {
            from: sourceNode?.data.label || edge.source,
            to: targetNode?.data.label || edge.target,
            type: edge.label || 'connection'
          };
        });

        architectureContext = `

CURRENT ARCHITECTURE CONTEXT:
You are currently viewing an architecture with the following components:

SERVICES (${services.length} total):
${services.map(service => 
  `• ${service.name} (${service.service}): ${service.description || 'Cloud service'} - ${service.cost || 'Cost TBD'} - Layer: ${service.layer || 'application'}`
).join('\n')}

CONNECTIONS (${connections.length} total):
${connections.map(conn => 
  `• ${conn.from} → ${conn.to} (${conn.type})`
).join('\n')}

ARCHITECTURE METADATA:
• Cloud Provider: ${currentArchitecture.metadata?.cloudProvider || cloudProvider}
• Total Estimated Cost: ${currentArchitecture.metadata?.estimatedCost || 'Not calculated'}
• Generated: ${currentArchitecture.metadata?.timestamp ? new Date(currentArchitecture.metadata.timestamp).toLocaleDateString() : 'Unknown'}
${currentArchitecture.metadata?.prompt ? `• Original Prompt: "${currentArchitecture.metadata.prompt}"` : ''}

You can see this architecture diagram to your right. Use this context to provide specific, detailed explanations about the current architecture, its components, connections, costs, and best practices.`;
      }
    } catch (error) {
      console.error('Error fetching architecture context:', error);
    }
  }

  // Create enhanced prompt for general cloud architecture chat
  const chatPrompt = `You are Claudio, an expert cloud architect assistant specializing in ${cloudProvider.toUpperCase()} solutions.

User message: ${message}

${architectureContext}

INSTRUCTIONS:
- If the user asks about "this architecture", "my architecture", or similar, refer to the CURRENT ARCHITECTURE CONTEXT above
- Provide specific explanations about the services, their roles, and how they connect
- Explain costs, scaling considerations, and best practices for the current setup
- If asked about modifications, guide them on how to request specific changes
- Be conversational but professional and technically accurate
- Use the actual service names and details from the current architecture

Keep responses informative and helpful.`;

  // Stream the response using Cohere Command A
  return streamingCohereChatCompletion({
    model: 'command-a-03-2025',
    message: message,
    promptContext: chatPrompt,
    temperature: 0.7,
    maxTokens: 1024
  });
} 