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
exports.AIInsightsController = void 0;
const common_1 = require("@nestjs/common");
const ai_insights_service_1 = require("./ai-insights.service");
const create_ai_insight_dto_1 = require("./dto/create-ai-insight.dto");
const update_ai_insight_dto_1 = require("./dto/update-ai-insight.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const business_access_guard_1 = require("../../common/guards/business-access.guard");
const business_id_decorator_1 = require("../../common/decorators/business-id.decorator");
const cash_flow_forecast_service_1 = require("./cash-flow-forecast.service");
const invoice_late_risk_service_1 = require("./invoice-late-risk.service");
let AIInsightsController = class AIInsightsController {
    constructor(s, cashFlowForecast, invoiceLateRisk) {
        this.s = s;
        this.cashFlowForecast = cashFlowForecast;
        this.invoiceLateRisk = invoiceLateRisk;
    }
    forecastCashFlow(businessId, horizon) {
        return this.cashFlowForecast.forecast(businessId, Number(horizon || 30));
    }
    getInvoiceLatePaymentRisk(businessId) {
        return this.invoiceLateRisk.scoreLatePaymentRisk(businessId);
    }
    create(businessId, dto) {
        return this.s.create(businessId, dto);
    }
    findAll(businessId) {
        return this.s.findAll(businessId);
    }
    findOne(businessId, id) {
        return this.s.findOne(businessId, id);
    }
    update(businessId, id, dto) {
        return this.s.update(businessId, id, dto);
    }
    remove(businessId, id) {
        return this.s.remove(businessId, id);
    }
};
exports.AIInsightsController = AIInsightsController;
__decorate([
    (0, common_1.Get)('cash-flow/forecast'),
    __param(0, (0, business_id_decorator_1.BusinessId)()),
    __param(1, (0, common_1.Query)('horizon')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AIInsightsController.prototype, "forecastCashFlow", null);
__decorate([
    (0, common_1.Get)('invoices/late-payment-risk'),
    __param(0, (0, business_id_decorator_1.BusinessId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AIInsightsController.prototype, "getInvoiceLatePaymentRisk", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, business_id_decorator_1.BusinessId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_ai_insight_dto_1.CreateAIInsightDto]),
    __metadata("design:returntype", void 0)
], AIInsightsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, business_id_decorator_1.BusinessId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AIInsightsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, business_id_decorator_1.BusinessId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AIInsightsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, business_id_decorator_1.BusinessId)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_ai_insight_dto_1.UpdateAIInsightDto]),
    __metadata("design:returntype", void 0)
], AIInsightsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, business_id_decorator_1.BusinessId)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AIInsightsController.prototype, "remove", null);
exports.AIInsightsController = AIInsightsController = __decorate([
    (0, common_1.Controller)('ai-insights'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, business_access_guard_1.BusinessAccessGuard),
    __metadata("design:paramtypes", [ai_insights_service_1.AIInsightsService,
        cash_flow_forecast_service_1.CashFlowForecastService,
        invoice_late_risk_service_1.InvoiceLateRiskService])
], AIInsightsController);
//# sourceMappingURL=ai-insights.controller.js.map