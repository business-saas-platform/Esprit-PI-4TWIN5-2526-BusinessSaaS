import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('what_if_scenarios')
export class WhatIfScenarioEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  businessId!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'int' })
  horizon!: number;

  @Column({ type: 'double precision', default: 0 })
  collectionAccelerationPct!: number;

  @Column({ type: 'double precision', default: 0 })
  collectionDelayPct!: number;

  @Column({ type: 'double precision', default: 0 })
  expenseReductionPct!: number;

  @Column({ type: 'double precision', default: 0 })
  expenseIncreasePct!: number;

  @Column({ type: 'double precision', default: 0 })
  baselineExpectedNet!: number;

  @Column({ type: 'double precision', default: 0 })
  simulatedExpectedNet!: number;

  @Column({ type: 'double precision', default: 0 })
  deltaExpectedNet!: number;

  @Column({ type: 'double precision', default: 0 })
  improvementPct!: number;

  @Column({ type: 'varchar', length: 20, default: 'low' })
  baselineRisk!: 'low' | 'medium' | 'high';

  @Column({ type: 'varchar', length: 20, default: 'low' })
  simulatedRisk!: 'low' | 'medium' | 'high';

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
