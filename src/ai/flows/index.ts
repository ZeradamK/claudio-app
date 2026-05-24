/**
 * Multi-Layer Processing System
 * 
 * This module exports all components of Jarvis's multi-layer processing system,
 * providing a sophisticated approach to handling different types of user requests.
 */

// Core processing components - temporarily disabled due to Cohere API type issues
// export { 
//   processWithMultiLayer,
//   createStreamingProcessor,
//   type ProcessingOptions 
// } from './multi-layer-processor';

// Connector for external APIs - temporarily disabled due to Cohere API type issues
// export {
//   processJarvisRequestWithLayers,
//   createStreamingResponse,
//   type JarvisConnectorOptions
// } from './jarvis-connector';

// Follow-up suggestion generators
export {
  generateFollowupSuggestions,
  generateArchitectureUpdateSuggestions,
  generateCdkFollowupSuggestions
} from './followup-generator';

/**
 * Use this function to process a request with the multi-layer system
 * 
 * @example
 * ```typescript
 * import { processRequest } from '@/ai/flows';
 * 
 * const result = await processRequest({
 *   message: "Update the architecture to add a CloudFront distribution",
 *   architectureId: "abc123",
 *   architectureContext: architecture,
 *   options: {
 *     debug: true,
 *     customModel: "gpt-4o"
 *   }
 * });
 * ```
 */
export async function processRequest({
  message,
  architectureId,
  architectureContext,
  messageHistory,
  options = {}
}: {
  message: string;
  architectureId: string;
  architectureContext: any;
  messageHistory?: any[];
  options?: {
    debug?: boolean;
    customModel?: string;
    enhancedPrompting?: boolean;
  };
}) {
  // Simple fallback implementation using Cohere
  try {
    const { cohereClient } = await import('../cohere-instance');
    
    const response = await cohereClient.chat({
      message,
      model: options.customModel || 'command-r-plus',
      temperature: 0.7,
    });
    
    return {
      response: response.text,
      metadata: {
        intent: 'general_chat',
        format: 'conversation'
      },
      architectureUpdated: false
    };
  } catch (error) {
    console.error('Error in processRequest:', error);
    return {
      response: "I'm sorry, but I encountered an error while processing your request.",
      metadata: {
        intent: 'general_chat',
        format: 'conversation'
      },
      architectureUpdated: false
    };
  }
} 