import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamAiService } from './team-ai.service';
import { TeamAiController } from './team-ai.controller';
import { InvoiceEntity } from '../invoices/entities/invoice.entity';
import { ClientEntity } from '../clients/entities/client.entity';
import { ExpenseEntity } from '../expenses/entities/expense.entity';
import { TeamMemberEntity } from '../team-members/entities/team-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvoiceEntity,
      ClientEntity,
      ExpenseEntity,
      TeamMemberEntity,
    ]),
  ],
  controllers: [TeamAiController],
  providers: [TeamAiService],
})
export class TeamAiModule {}
