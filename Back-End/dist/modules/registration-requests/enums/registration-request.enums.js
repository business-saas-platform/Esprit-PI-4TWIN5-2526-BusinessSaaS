"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelectedPlan = exports.PaymentStatus = exports.PaymentMethod = exports.RegistrationStatus = void 0;
var RegistrationStatus;
(function (RegistrationStatus) {
    RegistrationStatus["PENDING"] = "pending";
    RegistrationStatus["APPROVED"] = "approved";
    RegistrationStatus["REJECTED"] = "rejected";
})(RegistrationStatus || (exports.RegistrationStatus = RegistrationStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["MOCK_ONLINE"] = "mock_online";
    PaymentMethod["CASH"] = "cash";
    PaymentMethod["BANK_TRANSFER"] = "bank_transfer";
    PaymentMethod["MANUAL"] = "manual";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["UNPAID"] = "unpaid";
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["PENDING_VERIFICATION"] = "pending_verification";
    PaymentStatus["PAID"] = "paid";
    PaymentStatus["FAILED"] = "failed";
    PaymentStatus["WAIVED"] = "waived";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var SelectedPlan;
(function (SelectedPlan) {
    SelectedPlan["STARTER"] = "starter";
    SelectedPlan["PROFESSIONAL"] = "professional";
    SelectedPlan["ENTERPRISE"] = "enterprise";
})(SelectedPlan || (exports.SelectedPlan = SelectedPlan = {}));
//# sourceMappingURL=registration-request.enums.js.map