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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessEntity = void 0;
const typeorm_1 = require("typeorm");
let BusinessEntity = class BusinessEntity {
};
exports.BusinessEntity = BusinessEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], BusinessEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: "uuid" }),
    __metadata("design:type", String)
], BusinessEntity.prototype, "ownerId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BusinessEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BusinessEntity.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BusinessEntity.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BusinessEntity.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BusinessEntity.prototype, "country", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BusinessEntity.prototype, "taxId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BusinessEntity.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: "active" }),
    __metadata("design:type", String)
], BusinessEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamptz", nullable: true }),
    __metadata("design:type", Date)
], BusinessEntity.prototype, "subscriptionStartDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamptz", nullable: true }),
    __metadata("design:type", Date)
], BusinessEntity.prototype, "subscriptionEndDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: "starter" }),
    __metadata("design:type", String)
], BusinessEntity.prototype, "plan", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BusinessEntity.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], BusinessEntity.prototype, "website", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BusinessEntity.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BusinessEntity.prototype, "fiscalYearStart", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BusinessEntity.prototype, "industry", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "double precision", default: 0 }),
    __metadata("design:type", Number)
], BusinessEntity.prototype, "taxRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "boolean", default: false }),
    __metadata("design:type", Boolean)
], BusinessEntity.prototype, "isProfileComplete", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], BusinessEntity.prototype, "logoUrl", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], BusinessEntity.prototype, "createdAt", void 0);
exports.BusinessEntity = BusinessEntity = __decorate([
    (0, typeorm_1.Entity)("businesses")
], BusinessEntity);
//# sourceMappingURL=business.entity.js.map