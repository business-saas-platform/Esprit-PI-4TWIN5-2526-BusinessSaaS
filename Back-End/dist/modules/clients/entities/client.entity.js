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
exports.ClientEntity = void 0;
const typeorm_1 = require("typeorm");
let ClientEntity = class ClientEntity {
};
exports.ClientEntity = ClientEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], ClientEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Index)(),
    (0, typeorm_1.Column)({ type: "uuid" }),
    __metadata("design:type", String)
], ClientEntity.prototype, "businessId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 120 }),
    __metadata("design:type", String)
], ClientEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 150 }),
    __metadata("design:type", String)
], ClientEntity.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 30, default: "" }),
    __metadata("design:type", String)
], ClientEntity.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 180, default: "" }),
    __metadata("design:type", String)
], ClientEntity.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 80, default: "" }),
    __metadata("design:type", String)
], ClientEntity.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 20, default: "" }),
    __metadata("design:type", String)
], ClientEntity.prototype, "postalCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 80, default: "Tunisia" }),
    __metadata("design:type", String)
], ClientEntity.prototype, "country", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 30, nullable: true }),
    __metadata("design:type", String)
], ClientEntity.prototype, "taxId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "enum", enum: ["individual", "company"] }),
    __metadata("design:type", String)
], ClientEntity.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: ["active", "inactive"],
        default: "active",
    }),
    __metadata("design:type", String)
], ClientEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "double precision", default: 0 }),
    __metadata("design:type", Number)
], ClientEntity.prototype, "totalRevenue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "double precision", default: 0 }),
    __metadata("design:type", Number)
], ClientEntity.prototype, "outstandingBalance", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ClientEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 50, nullable: true }),
    __metadata("design:type", String)
], ClientEntity.prototype, "lastContactDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], ClientEntity.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 120, nullable: true }),
    __metadata("design:type", String)
], ClientEntity.prototype, "companyName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar", length: 120, nullable: true }),
    __metadata("design:type", String)
], ClientEntity.prototype, "contactPerson", void 0);
exports.ClientEntity = ClientEntity = __decorate([
    (0, typeorm_1.Entity)("clients")
], ClientEntity);
//# sourceMappingURL=client.entity.js.map