import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
import {
  PaymentMethod,
  PaymentStatus,
  RegistrationStatus,
  SelectedPlan,
} from "../enums/registration-request.enums";

@Entity("registration_requests")
export class RegistrationRequestEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // owner info
  @Index()
  @Column({ type: "varchar", length: 150 })
  ownerEmail!: string;

  @Column({ type: "varchar", length: 150 })
  ownerName!: string;

  // company info
  @Column({ type: "varchar", length: 150 })
  companyName!: string;

  @Column({ type: "varchar", length: 100 })
  companyCategory!: string;

  @Column({ type: "varchar", length: 30, nullable: true })
  companyPhone?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  companyAddress?: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  companyTaxId?: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  teamSize?: string | null;

  @Column({ type: "text", nullable: true })
  message?: string | null;

  @Column({
    type: "enum",
    enum: SelectedPlan,
    nullable: true,
  })
  selectedPlan?: SelectedPlan | null;

  @Column({
    type: "enum",
    enum: PaymentMethod,
    default: PaymentMethod.MANUAL,
  })
  paymentMethod!: PaymentMethod;

  @Column({
    type: "enum",
    enum: PaymentStatus,
    default: PaymentStatus.UNPAID,
  })
  paymentStatus!: PaymentStatus;

  @Column({ type: "varchar", length: 50, nullable: true })
  paymentProvider?: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  paymentReference?: string | null;

  @Column({ type: "text", nullable: true })
  paymentUrl?: string | null;

  @Column({ type: "timestamptz", nullable: true })
  paidAt?: Date | null;

  @Column({
    type: "enum",
    enum: RegistrationStatus,
    default: RegistrationStatus.PENDING,
  })
  status!: RegistrationStatus;

  @Column({ type: "text", nullable: true })
  rejectionReason?: string | null;

  @Column({ type: "uuid", nullable: true })
  reviewedByAdminId?: string | null;

  @Column({ type: "timestamptz", nullable: true })
  reviewedAt?: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}