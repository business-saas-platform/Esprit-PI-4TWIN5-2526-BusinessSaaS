import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

export interface TenantRequest extends Request {
  businessId?: string;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: TenantRequest, _res: Response, next: NextFunction) {
    // Try to get businessId from header first
    const businessId = req.header("x-business-id");
    if (businessId) req.businessId = businessId;
    
    // If not in header, try to extract from JWT (user object is populated by JwtAuthGuard)
    if (!req.businessId && req.user && (req.user as any).businessId) {
      req.businessId = (req.user as any).businessId;
    }
    
    next();
  }
}
