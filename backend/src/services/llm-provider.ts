import OpenAI from 'openai'
import { env } from '../config/env'

export type LLMMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export interface LLMProvider {
  complete(messages: LLMMessage[]): Promise<string>
  stream(
    messages: LLMMessage[],
    onToken: (token: string) => void,
    signal?: AbortSignal,
  ): Promise<void>
}

class OpenAIProvider implements LLMProvider {
  private client = new OpenAI({ apiKey: env.OPENAI_API_KEY })
  private readonly MODEL = 'gpt-4o-mini'
  private readonly MAX_TOKENS = 1024
  private readonly TEMPERATURE = 0.4

  async complete(messages: LLMMessage[]): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: this.MODEL,
      messages,
      max_tokens: this.MAX_TOKENS,
      temperature: this.TEMPERATURE,
    })
    return completion.choices[0]?.message?.content?.trim() ?? ''
  }

  async stream(
    messages: LLMMessage[],
    onToken: (token: string) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const streamResponse = this.client.chat.completions.stream(
      { model: this.MODEL, messages, max_tokens: this.MAX_TOKENS, temperature: this.TEMPERATURE },
      { signal, timeout: 30_000 },
    )
    for await (const chunk of streamResponse) {
      const token = chunk.choices[0]?.delta?.content ?? ''
      if (token) onToken(token)
    }
  }
}

export const llmProvider: LLMProvider = new OpenAIProvider()
