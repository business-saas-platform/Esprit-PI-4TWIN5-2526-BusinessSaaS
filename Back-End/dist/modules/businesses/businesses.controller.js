"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessesController = void 0;
const common_1 = require("@nestjs/common");
const businesses_service_1 = require("./businesses.service");
const create_business_dto_1 = require("./dto/create-business.dto");
const update_business_dto_1 = require("./dto/update-business.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const business_access_guard_1 = require("../../common/guards/business-access.guard");
let BusinessesController = class BusinessesController {
    constructor(s) {
        this.s = s;
    }
    listMine(req) {
        return this.s.listByOwner(req.user.id);
    }
    findAll(req) {
        if (req.user.role !== "platform_admin") {
            throw new common_1.ForbiddenException("Only platform admin can access all businesses");
        }
        return this.s.findAll();
    }
    createAsAdmin(req, dto) {
        if (req.user.role !== "platform_admin") {
            throw new common_1.ForbiddenException("Only platform admin can create businesses");
        }
        return this.s.create(dto);
    }
    updateAsAdmin(req, id, dto) {
        if (req.user.role !== "platform_admin") {
            throw new common_1.ForbiddenException("Only platform admin can update businesses");
        }
        return this.s.update(id, dto);
    }
    removeAsAdmin(req, id) {
        if (req.user.role !== "platform_admin") {
            throw new common_1.ForbiddenException("Only platform admin can delete businesses");
        }
        return this.s.remove(id);
    }
    removeAllAsAdmin(req) {
        if (req.user.role !== "platform_admin") {
            throw new common_1.ForbiddenException("Only platform admin can delete all businesses");
        }
        return this.s.removeAll();
    }
    create(req, dto) {
        return this.s.createForOwner(req.user.id, dto);
    }
    completeProfile(id, req, dto) {
        return this.s.completeProfile(id, req.user.id, dto);
    }
    current(req) {
        return this.s.getById(req.businessId);
    }
    getById(req, id) {
        req.businessId = id;
        return this.s.getById(req.businessId);
    }
    update(req, id, dto) {
        return this.s.updateForOwner(req.user.id, id, dto);
    }
    remove(req, id) {
        return this.s.removeForOwner(req.user.id, id);
    }
};
exports.BusinessesController = BusinessesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BusinessesController.prototype, "listMine", null);
__decorate([
    (0, common_1.Get)("all"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BusinessesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)("admin"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_business_dto_1.CreateBusinessDto]),
    __metadata("design:returntype", void 0)
], BusinessesController.prototype, "createAsAdmin", null);
__decorate([
    (0, common_1.Patch)("admin/:id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_business_dto_1.UpdateBusinessDto]),
    __metadata("design:returntype", void 0)
], BusinessesController.prototype, "updateAsAdmin", null);
__decorate([
    (0, common_1.Delete)("admin/:id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BusinessesController.prototype, "removeAsAdmin", null);
__decorate([
    (0, common_1.Delete)("admin/all"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BusinessesController.prototype, "removeAllAsAdmin", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_business_dto_1.CreateBusinessDto]),
    __metadata("design:returntype", void 0)
], BusinessesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(":id/profile"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], BusinessesController.prototype, "completeProfile", null);
__decorate([
    (0, common_1.UseGuards)(business_access_guard_1.BusinessAccessGuard),
    (0, common_1.Get)("current/one"),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BusinessesController.prototype, "current", null);
__decorate([
    (0, common_1.UseGuards)(business_access_guard_1.BusinessAccessGuard),
    (0, common_1.Get)(":id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BusinessesController.prototype, "getById", null);
__decorate([
    (0, common_1.Patch)(":id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_business_dto_1.UpdateBusinessDto]),
    __metadata("design:returntype", void 0)
], BusinessesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(":id"),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BusinessesController.prototype, "remove", null);
exports.BusinessesController = BusinessesController = __decorate([
    (0, common_1.Controller)("businesses"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [businesses_service_1.BusinessesService])
], BusinessesController);
//# sourceMappingURL=businesses.controller.js.map