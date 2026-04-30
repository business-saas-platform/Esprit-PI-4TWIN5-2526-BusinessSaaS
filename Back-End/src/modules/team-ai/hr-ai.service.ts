/**
 * hr-ai.service.ts
 * ─────────────────
 * Calls the FastAPI ML microservice to predict attrition risk
 * for every active team member of a given business.
 *
 * FastAPI must be running on http://localhost:8000
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamMemberEntity } from '../team-members/entities/team-member.entity';

// ── Types ────────────────────────────────────────────────────────────────────

/** Payload sent to FastAPI POST /predict/batch */
interface MlEmployeeInput {
  employee_id:           string;
  name:                  string;
  satisfaction_level:    number;
  last_evaluation:       number;
  number_project:        number;
  average_monthly_hours: number;
  time_spend_company:    number;
  work_accident:         number;
  promotion_last_5years: number;
  department:            string;
  salary:                string;
}

/** Response from FastAPI */
interface MlPredictionResult {
  employee_id: string;
  name:        string;
  risk:        number;   // 0.0 → 1.0
  level:       string;   // low | medium | high
  will_leave:  boolean;
}

/** Final shape returned to the frontend */
export interface EmployeeRiskResult {
  id:         string;
  name:       string;
  email:      string;
  role:       string;
  status:     string;
  risk:       number;
  level:      string;
  will_leave: boolean;
}

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class HrAiService {
  private readonly logger    = new Logger(HrAiService.name);
  private readonly ML_URL    = process.env.ML_SERVICE_URL ?? 'http://localhost:8000';

  constructor(
    @InjectRepository(TeamMemberEntity)
    private readonly teamRepo: Repository<TeamMemberEntity>,
  ) {}

  // ── Public method ──────────────────────────────────────────────────────────

  async getTeamRisk(businessId: string): Promise<{
    employees: EmployeeRiskResult[];
    summary:   { total: number; high: number; medium: number; low: number; avgRisk: number };
  }> {
    // 1. Fetch ALL team members (not just active)
    const members = await this.teamRepo.find({
      where: { businessId },
    });

    if (members.length === 0) {
      return {
        employees: [],
        summary: { total: 0, high: 0, medium: 0, low: 0, avgRisk: 0 },
      };
    }

    // 2. Map DB records → ML input (use sensible defaults for missing HR fields)
    const mlPayload: MlEmployeeInput[] = members.map((m) =>
      this.toMlInput(m),
    );

    // 3. Call FastAPI
    let predictions: MlPredictionResult[];
    try {
      predictions = await this.callFastApi(mlPayload);
    } catch (err) {
      this.logger.error('FastAPI call failed — returning fallback data', err);
      // Return members with unknown risk so the frontend doesn't break
      return this.buildFallback(members);
    }

    // 4. Merge ML results back with DB data
    const predMap = new Map(predictions.map((p) => [p.employee_id, p]));

    const employees: EmployeeRiskResult[] = members.map((m) => {
      const pred = predMap.get(m.id);
      return {
        id:         m.id,
        name:       m.name,
        email:      m.email,
        role:       m.role,
        status:     m.status,
        risk:       pred?.risk       ?? 0,
        level:      pred?.level      ?? 'unknown',
        will_leave: pred?.will_leave ?? false,
      };
    });

    // Sort by risk descending (highest risk first)
    employees.sort((a, b) => b.risk - a.risk);

    // 5. Build summary
    const summary = this.buildSummary(employees);

    return { employees, summary };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Maps a TeamMemberEntity to the ML feature vector.
   * Since your DB doesn't store HR-specific fields (satisfaction, hours, etc.)
   * we use realistic defaults based on role & tenure.
   * In production you'd store these fields in the DB.
   */
  private toMlInput(m: TeamMemberEntity): MlEmployeeInput {
    const yearsAtCompany = m.joinedAt
      ? Math.max(1, Math.floor((Date.now() - new Date(m.joinedAt).getTime()) / (1000 * 60 * 60 * 24 * 365)))
      : 2;

    const deptMap: Record<string, string> = {
      business_admin: 'management',
      accountant:     'accounting',
      team_member:    'technical',
    };

    const salaryMap: Record<string, string> = {
      business_admin: 'high',
      accountant:     'medium',
      team_member:    'low',
    };

    return {
      employee_id:           m.id,
      name:                  m.name,
      // Use real HR data if available, otherwise use neutral defaults
      satisfaction_level:    m.satisfactionLevel    ?? 0.6,
      last_evaluation:       m.lastEvaluation       ?? 0.7,
      number_project:        m.numberOfProjects     ?? 3,
      average_monthly_hours: m.averageMonthlyHours  ?? 180,
      time_spend_company:    yearsAtCompany,
      work_accident:         m.workAccident         ?? 0,
      promotion_last_5years: m.promotionLast5years  ?? 0,
      department:            deptMap[m.role]    ?? 'technical',
      salary:                salaryMap[m.role]  ?? 'low',
    };
  }

  private async callFastApi(payload: MlEmployeeInput[]): Promise<MlPredictionResult[]> {
    const response = await fetch(`${this.ML_URL}/predict/batch`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`FastAPI responded with ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<MlPredictionResult[]>;
  }

  private buildSummary(employees: EmployeeRiskResult[]) {
    const high   = employees.filter((e) => e.level === 'high').length;
    const medium = employees.filter((e) => e.level === 'medium').length;
    const low    = employees.filter((e) => e.level === 'low').length;
    const avgRisk = employees.length
      ? parseFloat((employees.reduce((s, e) => s + e.risk, 0) / employees.length).toFixed(3))
      : 0;

    return { total: employees.length, high, medium, low, avgRisk };
  }

  private buildFallback(members: TeamMemberEntity[]) {
    const employees: EmployeeRiskResult[] = members.map((m) => ({
      id:         m.id,
      name:       m.name,
      email:      m.email,
      role:       m.role,
      status:     m.status,
      risk:       0,
      level:      'unknown',
      will_leave: false,
    }));
    return {
      employees,
      summary: { total: members.length, high: 0, medium: 0, low: 0, avgRisk: 0 },
    };
  }
}
