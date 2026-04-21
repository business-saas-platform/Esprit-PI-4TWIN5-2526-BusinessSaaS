import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TenantRequest } from "../middleware/tenant.middleware";
import { BusinessEntity } from "../../modules/businesses/entities/business.entity";
import { UserEntity } from "../../modules/users/entities/user.entity";

@Injectable()
export class BusinessAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(BusinessEntity)
    private readonly businesses: Repository<BusinessEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>
  ) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<TenantRequest & { user?: any }>();
    const user = req.user;
    
    // Get businessId from header, middleware, or JWT
    const businessId = req.businessId || (user && user.businessId);

    if (!user) throw new ForbiddenException("Not authenticated");
    if (!businessId) throw new ForbiddenException("Missing business context");

    // Platform admin => full access
    if (user.role === "platform_admin") return true;

    // Owner can access any business he owns
    if (user.role === "business_owner") {
      const b = await this.businesses.findOne({
        where: { id: businessId, ownerId: user.sub },
        select: { id: true },
      });
      if (!b) throw new ForbiddenException("No access to this business");
      return true;
    }

    // Other roles: must match their assigned businessId
    const u = await this.users.findOne({
      where: { id: user.sub },
      select: { id: true, businessId: true, role: true },
    });
    if (!u || u.businessId !== businessId) {
      throw new ForbiddenException("No access to this business");
    }
    return true;
  }
}
