"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const tenant_middleware_1 = require("./common/middleware/tenant.middleware");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_config_1 = require("./config/typeorm.config");
const communication_module_1 = require("./modules/communication/communication.module");
const businesses_module_1 = require("./modules/businesses/businesses.module");
const users_module_1 = require("./modules/users/users.module");
const clients_module_1 = require("./modules/clients/clients.module");
const invoices_module_1 = require("./modules/invoices/invoices.module");
const expenses_module_1 = require("./modules/expenses/expenses.module");
const team_members_module_1 = require("./modules/team-members/team-members.module");
const ai_insights_module_1 = require("./modules/ai-insights/ai-insights.module");
const auth_module_1 = require("./modules/auth/auth.module");
const mail_module_1 = require("./modules/mail/mail.module");
const registration_requests_module_1 = require("./modules/registration-requests/registration-requests.module");
const tenant_module_1 = require("./common/tenant/tenant.module");
const security_questions_module_1 = require("./modules/security-questions/security-questions.module");
const ai_module_1 = require("./modules/IA/ai.module");
const nestjs_prometheus_1 = require("@willsoto/nestjs-prometheus");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(tenant_middleware_1.TenantMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            typeorm_1.TypeOrmModule.forRootAsync({ useFactory: typeorm_config_1.typeOrmConfig }),
            businesses_module_1.BusinessesModule,
            users_module_1.UsersModule,
            clients_module_1.ClientsModule,
            invoices_module_1.InvoicesModule,
            communication_module_1.CommunicationModule,
            ai_module_1.AiModule,
            tenant_module_1.TenantModule,
            mail_module_1.MailModule,
            expenses_module_1.ExpensesModule,
            team_members_module_1.TeamMembersModule,
            ai_insights_module_1.AIInsightsModule,
            registration_requests_module_1.RegistrationRequestsModule,
            auth_module_1.AuthModule,
            security_questions_module_1.SecurityQuestionsModule,
            nestjs_prometheus_1.PrometheusModule.register()
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map