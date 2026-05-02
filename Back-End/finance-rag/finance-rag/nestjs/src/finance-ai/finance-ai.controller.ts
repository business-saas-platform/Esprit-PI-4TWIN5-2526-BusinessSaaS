// finance-ai.controller.ts
import {
  Controller, Post, Get, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { IsString, IsArray, IsOptional, IsIn } from 'class-validator';
import { FinanceAiService, ChatMessage } from './finance-ai.service';

class MessageDto implements ChatMessage {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  content!: string;
}

class ChatDto {
  @IsString()
  message!: string;

  @IsArray()
  @IsOptional()
  history?: MessageDto[];
}

class IngestDto {
  @IsString()
  text!: string;

  @IsString()
  @IsOptional()
  source?: string;
}

@Controller('finance-ai')
export class FinanceAiController {
  constructor(private readonly financeAi: FinanceAiService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() body: ChatDto) {
    return this.financeAi.chat(body.message, body.history ?? []);
  }

  @Get('health')
  async health() {
    return this.financeAi.health();
  }

  @Post('ingest')
  @HttpCode(HttpStatus.OK)
  async ingest(@Body() body: IngestDto) {
    return this.financeAi.ingestText(body.text, body.source ?? 'api-upload');
  }
}
