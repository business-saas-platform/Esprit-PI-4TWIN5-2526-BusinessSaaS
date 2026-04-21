import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const BusinessId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();

    // priority: guard injected -> JWT payload -> header -> query -> body
    return (
      req.businessId ||
      (req.user && req.user.businessId) ||
      req.headers["x-business-id"] ||
      req.query?.businessId ||
      req.body?.businessId ||
      null
    );
  }
);