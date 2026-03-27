export enum RegistrationStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum PaymentMethod {
  MOCK_ONLINE = "mock_online",
  CASH = "cash",
  BANK_TRANSFER = "bank_transfer",
  MANUAL = "manual",
}

export enum PaymentStatus {
  UNPAID = "unpaid",
  PENDING = "pending",
  PENDING_VERIFICATION = "pending_verification",
  PAID = "paid",
  FAILED = "failed",
  WAIVED = "waived",
}

export enum SelectedPlan {
  STARTER = "starter",
  PROFESSIONAL = "professional",
  ENTERPRISE = "enterprise",
}