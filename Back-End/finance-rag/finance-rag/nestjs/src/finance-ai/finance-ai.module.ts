// finance-ai.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FinanceAiService } from './finance-ai.service';
import { FinanceAiController } from './finance-ai.controller';

@Module({
  imports: [
    HttpModule.register({
      baseURL: process.env.FINANCE_AI_URL || 'http://127.0.0.1:8000',
      timeout: 60000,   // 60s — LLM inference can be slow
    }),
  ],
  providers:   [FinanceAiService],
  controllers: [FinanceAiController],
  exports:     [FinanceAiService],
})
export class FinanceAiModule {}
