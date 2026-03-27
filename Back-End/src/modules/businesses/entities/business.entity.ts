import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Index } from "typeorm";

@Entity("businesses")
export class BusinessEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  ownerId!: string; // ✅ NEW (user id متاع business_owner)

  @Column() name!: string;
  @Column() type!: string;
  @Column() address!: string;
  @Column() city!: string;
  @Column() country!: string;
  @Column() taxId!: string;
  @Column() phone!: string;
  @Column({ default: "active" })
status!: string;
@Column({ type: "timestamptz", nullable: true })
subscriptionStartDate?: Date;

@Column({ type: "timestamptz", nullable: true })
subscriptionEndDate?: Date;
@Column({ default: "starter" })
plan!: string;
  @Column() email!: string;
  @Column({ nullable: true }) website?: string;
  @Column() currency!: string;
  @Column() fiscalYearStart!: string;
  @Column() industry!: string;
  @Column({ type: "double precision", default: 0 }) taxRate!: number;
@Column({ type: "boolean", default: false })
isProfileComplete!: boolean;

@Column({ nullable: true })
logoUrl?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
