// finance-ai.service.ts
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  answer: string;
  sources: string[];
  chunksUsed: number;
  isFinanceTopic: boolean;
}

export interface HealthStatus {
  status: string;
  model: string;
  embedModel: string;
  totalChunks: number;
}

@Injectable()
export class FinanceAiService {
  private readonly logger = new Logger(FinanceAiService.name);

  constructor(private readonly http: HttpService) {}

  async chat(
    message: string,
    history: ChatMessage[] = [],
  ): Promise<ChatResponse> {
    try {
      const { data } = await firstValueFrom(
        this.http.post('/chat', { message, history }),
      );
      return {
        answer:          data.answer,
        sources:         data.sources,
        chunksUsed:      data.chunks_used,
        isFinanceTopic:  data.is_finance_topic,
      };
    } catch (err: any) {
      this.logger.error('FinanceAI service error', err?.message);
      const detail = err?.response?.data?.detail;
      if (detail) {
        throw new ServiceUnavailableException(detail);
      }
      throw new ServiceUnavailableException(
        'Finance AI service is unavailable. Make sure the Python server is running.',
      );
    }
  }

  async health(): Promise<HealthStatus> {
    const { data } = await firstValueFrom(this.http.get('/health'));
    return {
      status:      data.status,
      model:       data.model,
      embedModel:  data.embed_model,
      totalChunks: data.total_chunks,
    };
  }

  async ingestText(text: string, source: string): Promise<{ ingested: number }> {
    const { data } = await firstValueFrom(
      this.http.post('/ingest-text', { text, source }),
    );
    return { ingested: data.ingested };
  }
}
