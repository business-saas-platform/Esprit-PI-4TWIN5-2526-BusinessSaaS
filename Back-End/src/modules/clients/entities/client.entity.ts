import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ClientStatus, ClientType } from "../../../common/enums";

@Entity("clients")
export class ClientEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  businessId!: string;

  @Column({ type: "varchar", length: 120 })
  name!: string;

  @Column({ type: "varchar", length: 150 })
  email!: string;

  @Column({ type: "varchar", length: 30, default: "" })
  phone!: string;

  @Column({ type: "varchar", length: 180, default: "" })
  address!: string;

  @Column({ type: "varchar", length: 80, default: "" })
  city!: string;

  @Column({ type: "varchar", length: 20, default: "" })
  postalCode!: string;

  @Column({ type: "varchar", length: 80, default: "Tunisia" })
  country!: string;

  @Column({ type: "varchar", length: 30, nullable: true })
  taxId?: string;

  @Column({ type: "enum", enum: ["individual", "company"] })
  type!: ClientType;

  @Column({
    type: "enum",
    enum: ["active", "inactive"],
    default: "active",
  })
  status!: ClientStatus;

  @Column({ type: "double precision", default: 0 })
  totalRevenue!: number;

  @Column({ type: "double precision", default: 0 })
  outstandingBalance!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: "varchar", length: 50, nullable: true })
  lastContactDate?: string;

  @Column({ type: "text", nullable: true })
  notes?: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  companyName?: string;

  @Column({ type: "varchar", length: 120, nullable: true })
  contactPerson?: string;
}