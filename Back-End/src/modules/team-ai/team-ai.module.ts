import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamAiController } from './team-ai.controller';
import { HrAiService } from './hr-ai.service';
import { TeamMemberEntity } from '../team-members/entities/team-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TeamMemberEntity]),
  ],
  controllers: [TeamAiController],
  providers: [HrAiService],
})
export class TeamAiModule {}
