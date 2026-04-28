import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TeamMemberEntity } from "./entities/team-member.entity";
import { TeamMembersController } from "./team-members.controller";
import { TeamMembersService } from "./team-members.service";
import { BusinessEntity } from "../businesses/entities/business.entity";
import { TeamInvitationEntity } from "./entities/team-invitation.entity";
import { UserEntity } from "../users/entities/user.entity";
import { MailModule } from "../mail/mail.module";
@Module({
  imports: [TypeOrmModule.forFeature([TeamMemberEntity, BusinessEntity, TeamInvitationEntity, UserEntity]),MailModule],
  controllers: [TeamMembersController],
  providers: [TeamMembersService],
})
export class TeamMembersModule {}
