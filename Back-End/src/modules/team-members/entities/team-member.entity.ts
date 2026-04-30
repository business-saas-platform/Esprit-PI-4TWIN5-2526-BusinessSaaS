import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("team_members")
export class TeamMemberEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid" })
  businessId!: string;

  @Index()
  @Column()
  email!: string;

  @Column()
  name!: string;

  @Column({ type: "enum", enum: ["business_admin", "accountant", "team_member"] })
  role!: "business_admin" | "accountant" | "team_member";

  @Column({ type: "enum", enum: ["invited", "active", "disabled"], default: "invited" })
  status!: "invited" | "active" | "disabled";

  @Column({ type: "text", array: true, default: () => "ARRAY[]::text[]" })
  permissions!: string[];

  @Column({ type: "timestamptz", nullable: true })
  joinedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  // ── HR Analytics fields (filled by manager) ──────────────────────────────

  @Column({ type: "float", nullable: true })
  satisfactionLevel!: number | null;

  @Column({ type: "float", nullable: true })
  lastEvaluation!: number | null;

  @Column({ type: "int", nullable: true })
  numberOfProjects!: number | null;

  @Column({ type: "int", nullable: true })
  averageMonthlyHours!: number | null;

  @Column({ type: "int", default: 0 })
  workAccident!: number;

  @Column({ type: "int", default: 0 })
  promotionLast5years!: number;
}