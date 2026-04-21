// src/modules/auth/auth.module.ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";

import { UserEntity } from "../users/entities/user.entity";
import { TeamInvitationEntity } from "../team-members/entities/team-invitation.entity";
import { TeamMemberEntity } from "../team-members/entities/team-member.entity";
import { BusinessEntity } from "../businesses/entities/business.entity";

import { JwtAuthGuard } from "./jwt-auth.guard";
import { OwnerGuard } from "./owner.guard";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, TeamInvitationEntity, TeamMemberEntity, BusinessEntity]),
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET"),
        signOptions: { expiresIn: "7d" },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, OwnerGuard],
  exports: [AuthService, JwtModule, PassportModule, JwtAuthGuard, OwnerGuard],
})
export class AuthModule {}