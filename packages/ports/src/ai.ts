export type AiRole = 'system' | 'user' | 'assistant';

export interface AiMessage {
  role: AiRole;
  content: string;
}

export interface AiCompletionInput {
  modelHint: string | null;
  messages: readonly AiMessage[];
  temperature: number | null;
  maxOutputTokens: number | null;
  metadata: Readonly<Record<string, string>>;
}

export interface AiCompletionResult {
  provider: string;
  model: string;
  text: string;
  inputTokens: number | null;
  outputTokens: number | null;
  providerRequestId: string | null;
}

export interface AiProviderPort {
  complete(input: AiCompletionInput): Promise<AiCompletionResult>;
}
