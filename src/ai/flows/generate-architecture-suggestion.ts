/**
 * Phase 1 compatibility shim — Claude-backed.
 *
 * Originally a Genkit/Google AI flow. Now delegates to the Claude
 * architecture generator. Five legacy routes (adjust, export-cdk, generate-cdk,
 * generate, sidebar-content) still import this name; Phase 3 of the rebuild
 * collapses them all into the unified `/api/architectures` endpoint and this
 * file is removed.
 */

import {
  generateArchitectureWithCohere,
  type ArchitectureGenerationInput,
  type ArchitectureGenerationOutput,
} from './claude-architecture-generator';

export interface GenerateArchitectureSuggestionInput {
  problemStatement: string;
  cloudProvider?: 'aws' | 'azure' | 'gcp';
  complexity?: 'simple' | 'medium' | 'complex';
}

export interface GenerateArchitectureSuggestionOutput
  extends ArchitectureGenerationOutput {
  /**
   * Optional CDK code field — present only if the generator was invoked in
   * code mode. The current Claude-backed implementation does not produce CDK
   * directly; consumers fall back to `architectureSuggestion`. Phase 3 wires
   * up proper CDK generation via Claude tool-use.
   */
  cdkCode?: string;
}

export async function generateArchitectureSuggestion(
  input: GenerateArchitectureSuggestionInput
): Promise<GenerateArchitectureSuggestionOutput> {
  const genInput: ArchitectureGenerationInput = {
    problemStatement: input.problemStatement,
    cloudProvider: input.cloudProvider,
    complexity: input.complexity,
  };
  return generateArchitectureWithCohere(genInput);
}
