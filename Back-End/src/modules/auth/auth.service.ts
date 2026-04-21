// src/modules/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DeepPartial, Repository, IsNull, Not } from "typeorm";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";

import { UserEntity } from "../users/entities/user.entity";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { TeamInvitationEntity } from "../team-members/entities/team-invitation.entity";
import { AcceptInviteDto } from "./dto/accept-invite.dto";
import { TeamMemberEntity } from "../team-members/entities/team-member.entity";
import { BusinessEntity } from "../businesses/entities/business.entity";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(TeamInvitationEntity)
    private readonly invites: Repository<TeamInvitationEntity>,

    @InjectRepository(TeamMemberEntity)
    private readonly members: Repository<TeamMemberEntity>,

    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,

    @InjectRepository(BusinessEntity)
    private readonly businesses: Repository<BusinessEntity>,

    private readonly jwt: JwtService
  ) {}

  // =====================================================
  // REGISTER (internal/testing OR non-approval flows)
  // =====================================================
  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();

    const exists = await this.users.findOne({ where: { email } });
    if (exists) throw new ConflictException("Email already used");

    if (!this.isStrongPassword(dto.password)) {
      throw new BadRequestException(
        "Weak password (need 1 uppercase, 1 lowercase, 1 number, min 8)"
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.users.create({
      email,
      name: dto.name,
      role: (dto.role ?? "business_owner") as any,
      businessId: dto.businessId,
      passwordHash,
      mustChangePassword: false,
      loginAttempts: 0,
      lockedUntil: null,
      permissions: ["*"], // ✅ default
    } as DeepPartial<UserEntity>);

    const saved = await this.users.save(user);
    const token = await this.sign(saved);

    return {
      access_token: token,
      user: this.toPublic(saved),
      mustChangePassword: saved.mustChangePassword,
    };
  }

  // =====================================================
  // LOGIN (3 attempts => lock 1 hour)
  // =====================================================
  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.users.findOne({ where: { email } });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
      throw new UnauthorizedException("Account locked. Try again later.");
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);

    if (!ok) {
      user.loginAttempts = (user.loginAttempts ?? 0) + 1;

      if (user.loginAttempts >= 3) {
        user.lockedUntil = new Date(Date.now() + 60 * 60 * 1000);
        user.loginAttempts = 0;
      }

      await this.users.save(user);
      throw new UnauthorizedException("Invalid credentials");
    }

    user.loginAttempts = 0;
    user.lockedUntil = null;
    await this.users.save(user);

    const token = await this.sign(user);

    return {
      access_token: token,
      user: this.toPublic(user),
      mustChangePassword: !!user.mustChangePassword,
    };
  }

  // =====================================================
  // ME
  // =====================================================
  async me(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.toPublic(user);
  }

  // =====================================================
  // FIRST LOGIN - CHANGE PASSWORD (mustChangePassword)
  // =====================================================
  async changePasswordFirst(userId: string, newPassword: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    if (!user.mustChangePassword) {
      throw new BadRequestException("Password change not required");
    }

    if (!this.isStrongPassword(newPassword)) {
      throw new BadRequestException(
        "Weak password (need 1 uppercase, 1 lowercase, 1 number, min 8)"
      );
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;

    user.loginAttempts = 0;
    user.lockedUntil = null;

    const saved = await this.users.save(user);
    const token = await this.sign(saved);

    return { ok: true, access_token: token, user: this.toPublic(saved) };
  }

  // =====================================================
  // ACCEPT INVITE (role + permissions ✅)
  // =====================================================
  async acceptInvite(dto: AcceptInviteDto) {
    const token = (dto.token || "").trim();
    if (!token) throw new BadRequestException("Invalid invitation token");

    const inv = await this.invites.findOne({ where: { token } });
    if (!inv) throw new BadRequestException("Invalid invitation token");
    if (inv.status !== "pending") throw new BadRequestException("Invitation already used");
    if (new Date(inv.expiresAt).getTime() < Date.now()) throw new BadRequestException("Invitation expired");

    const email = inv.email.toLowerCase().trim();

    if (!this.isStrongPassword(dto.password)) {
      throw new BadRequestException(
        "Weak password (need 1 uppercase, 1 lowercase, 1 number, min 8)"
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // ✅ existing OAuth user allowed, attach to business
    let user = await this.users.findOne({ where: { email } });

    if (user) {
      if (user.businessId && user.businessId !== inv.businessId) {
        throw new ConflictException("This email already belongs to another business");
      }

      user.name = user.name || inv.name;
      user.passwordHash = passwordHash;
      user.businessId = inv.businessId;
      user.role = inv.role as any;

      // ✅ permissions from invitation
      user.permissions = (inv.permissions ?? user.permissions ?? []) as any;

      user.mustChangePassword = false;
      user.loginAttempts = 0;
      user.lockedUntil = null;

      user = await this.users.save(user);
    } else {
      user = await this.users.save(
        this.users.create({
          email,
          name: inv.name,
          role: inv.role as any,
          passwordHash,
          businessId: inv.businessId,
          mustChangePassword: false,
          loginAttempts: 0,
          lockedUntil: null,
          permissions: inv.permissions ?? [],
        } as DeepPartial<UserEntity>)
      );
    }

    // ✅ TeamMember record (joinedAt must be Date, not string)
    let member = await this.members.findOne({
      where: { businessId: inv.businessId, email },
    });

    if (!member) {
      member = this.members.create({
        businessId: inv.businessId,
        name: inv.name,
        email,
        role: inv.role as any,
        status: "active" as any,
        permissions: inv.permissions ?? [],
        joinedAt: new Date(), // ✅ FIX
      } as DeepPartial<TeamMemberEntity>);
    } else {
      member.status = "active" as any;
      member.permissions = inv.permissions ?? member.permissions ?? [];
      member.role = inv.role as any;
      member.joinedAt = member.joinedAt ?? new Date(); // ✅ FIX
    }

    await this.members.save(member);

    inv.status = "accepted";
    await this.invites.save(inv);

    const jwtToken = await this.sign(user);

    return {
      access_token: jwtToken,
      user: this.toPublic(user),
      mustChangePassword: !!user.mustChangePassword,
    };
  }

  // =====================================================
  // OAUTH SUPPORT (GOOGLE + GITHUB)
  // =====================================================
  async validateOAuthUser(payload: { email: string; name: string; provider: string }) {
    const email = payload.email?.toLowerCase().trim();
    if (!email) throw new UnauthorizedException("OAuth email not provided");

    let user = await this.users.findOne({ where: { email } });

    if (!user) {
      user = this.users.create({
        email,
        name: payload.name,
        role: "business_owner" as any,
        passwordHash: undefined,
        mustChangePassword: false,
        loginAttempts: 0,
        lockedUntil: null,
        permissions: [],
      } as DeepPartial<UserEntity>);

      user = await this.users.save(user);
    }

    return user;
  }

  async generateJwt(user: UserEntity) {
    return this.sign(user);
  }

  // =====================================================
  // GITHUB / OAUTH LOGIN
  // =====================================================
  async loginWithOAuth(oauthUser: {
    provider?: "github" | "google" | string;
    providerId: string;
    username?: string;
    email?: string | null;
    avatar?: string;
    name?: string;
  }) {
    const email = oauthUser.email ? oauthUser.email.toLowerCase().trim() : null;

    let user = await this.users.findOne({
      where: [
        { githubId: oauthUser.providerId } as any,
        ...(email ? [{ email } as any] : []),
      ],
    });

    if (!user) {
      user = this.users.create({
        email: email ?? undefined,
        name: oauthUser.name || oauthUser.username || "oauth_user",
        role: "business_owner" as any,
        githubId: oauthUser.providerId,
        avatar: oauthUser.avatar,
        passwordHash: undefined,
        mustChangePassword: false,
        loginAttempts: 0,
        lockedUntil: null,
        permissions: [],
      } as DeepPartial<UserEntity>);

      user = await this.users.save(user);
    } else {
      if (!(user as any).githubId) (user as any).githubId = oauthUser.providerId;
      if (!user.avatar && oauthUser.avatar) user.avatar = oauthUser.avatar as any;
      user = await this.users.save(user);
    }

    const access_token = await this.sign(user);
    return { access_token, user: this.toPublic(user) };
  }

  // =====================================================
  // INTERNAL HELPERS
  // =====================================================
  private async sign(user: UserEntity) {
    let businessId = user.businessId;

    // ✅ If no businessId but user is business_owner, find their business
    if (!businessId && user.role === "business_owner") {
      const business = await this.businesses.findOne({
        where: { ownerId: user.id },
      });
      businessId = business?.id || undefined;
      console.log(
        `[Auth] User ${user.id} is business_owner, found businessId: ${businessId}`
      );
    }

    return this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      businessId: businessId,
      permissions: user.permissions ?? [], // ✅ in JWT
    });
  }

  private toPublic(u: UserEntity) {
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      avatar: u.avatar,
      businessId: u.businessId,
      permissions: u.permissions ?? [], // ✅ for frontend
      mustChangePassword: !!u.mustChangePassword,
      lockedUntil: u.lockedUntil ? new Date(u.lockedUntil).toISOString() : null,
      createdAt: u.createdAt ? u.createdAt.toISOString() : new Date().toISOString(),
    };
  }

  private isStrongPassword(pw: string) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pw);
  }
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await this.users.findOne({ where: { id: userId } });
  if (!user) throw new UnauthorizedException();

  if (!user.passwordHash) throw new BadRequestException("No password set. Use OAuth login.");

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw new UnauthorizedException("Current password is incorrect.");

  if (!this.isStrongPassword(newPassword)) {
    throw new BadRequestException(
      "Weak password (need 1 uppercase, 1 lowercase, 1 number, min 8)"
    );
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.mustChangePassword = false;
  await this.users.save(user);

  return { ok: true, message: "Password changed successfully." };
}

  // =====================================================
  // FACE RECOGNITION
  // =====================================================
  async saveFaceDescriptor(userId: string, descriptor: string | null) {
    if (descriptor === null) {
      // Delete face descriptor
      await this.users.update(userId, { 
        faceDescriptor: null as any
      });
    } else {
      // Save face descriptor
      await this.users.update(userId, { 
        faceDescriptor: descriptor 
      });
    }
  }

  async loginWithFace(inputDescriptor: number[]) {
    // Get all users who have face registered
    const users = await this.users.find({
      where: { 
        faceDescriptor: Not(IsNull()),
      },
    });

    // All users from this query have faceDescriptor
    const usersWithFace = users;

    if (usersWithFace.length === 0) {
      throw new UnauthorizedException(
        "Aucun utilisateur avec Face ID configuré"
      );
    }

    let bestMatch = null;
    let bestDistance = 1.0;

    for (const user of usersWithFace) {
      const stored = JSON.parse(user.faceDescriptor!) as number[];
      
      // Calculate Euclidean distance between descriptors
      const distance = Math.sqrt(
        inputDescriptor.reduce((sum, val, i) => 
          sum + Math.pow(val - stored[i], 2), 0)
      );

      console.log(`[Face Match] User: ${user.email}, Distance: ${distance.toFixed(4)}`);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = user;
      }
    }

    // 0.6 is the standard threshold for face-api.js
    if (bestMatch && bestDistance < 0.6) {
      console.log(`[Face Login Success] User: ${bestMatch.email}, Distance: ${bestDistance.toFixed(4)}`);
      
      // Reset login attempts
      bestMatch.loginAttempts = 0;
      bestMatch.lockedUntil = null;
      await this.users.save(bestMatch);

      // Generate JWT token same as normal login
      const token = await this.sign(bestMatch);

      return {
        access_token: token,
        user: this.toPublic(bestMatch),
        mustChangePassword: !!bestMatch.mustChangePassword,
      };
    }

    console.log(`[Face Login Failed] Best distance: ${bestDistance.toFixed(4)} (threshold: 0.6)`);
    
    throw new UnauthorizedException(
      "Visage non reconnu. Veuillez réessayer."
    );
  }

}