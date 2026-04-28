import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoiceEntity } from '../invoices/entities/invoice.entity';

type InvoiceRiskFeature = {
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  dueDate: string;
  status: string;
  totalAmount: number;
  daysToDue: number;
  clientLateRatio90d: number;
  clientInvoiceCount90d: number;
  businessLateRatio30d: number;
  month: number;
  weekday: number;
  isMonthEnd: number;
};

type RiskItem = {
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  dueDate: string;
  status: string;
  totalAmount: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  reasons: string[];
};

@Injectable()
export class InvoiceLateRiskService {
  constructor(
    @InjectRepository(InvoiceEntity)
    private readonly invoicesRepo: Repository<InvoiceEntity>
  ) {}

  async scoreLatePaymentRisk(businessId: string) {
    const invoices = await this.invoicesRepo.find({
      where: { businessId } as any,
      order: { dueDate: 'ASC' } as any,
    });

    const openStatuses = new Set(['sent', 'viewed', 'overdue']);
    const openInvoices = invoices.filter((x) =>
      openStatuses.has(String(x.status || '').toLowerCase())
    );

    if (!openInvoices.length) {
      return {
        generatedAt: new Date().toISOString(),
        modelSource: 'no-open-invoices',
        summary: {
          scoredInvoices: 0,
          highRisk: 0,
          mediumRisk: 0,
          lowRisk: 0,
          averageRisk: 0,
        },
        debug: {
          mlConfigured: this.hasMlService(),
          mlAttempted: false,
          mlUsed: false,
          fallbackUsed: false,
          mlError: null,
          totalInvoices: invoices.length,
          openInvoices: 0,
        },
        items: [] as RiskItem[],
      };
    }

    const businessLateRatio30d = this.computeBusinessLateRatio30d(invoices);
    const features = openInvoices.map((inv) =>
      this.toFeatures(inv, invoices, businessLateRatio30d)
    );

    const mlResult = await this.tryMlRiskPrediction(features);
    const items = mlResult.items ?? this.heuristicFallback(features);

    const highRisk = items.filter((i) => i.riskLevel === 'high').length;
    const mediumRisk = items.filter((i) => i.riskLevel === 'medium').length;
    const lowRisk = items.filter((i) => i.riskLevel === 'low').length;
    const averageRisk = items.length
      ? this.round4(items.reduce((sum, i) => sum + i.riskScore, 0) / items.length)
      : 0;

    return {
      generatedAt: new Date().toISOString(),
      modelSource: mlResult.used
        ? 'ml-inference'
        : this.hasMlService()
          ? 'heuristic-fallback'
          : 'heuristic-only',
      summary: {
        scoredInvoices: items.length,
        highRisk,
        mediumRisk,
        lowRisk,
        averageRisk,
      },
      debug: {
        mlConfigured: this.hasMlService(),
        mlAttempted: mlResult.attempted,
        mlUsed: mlResult.used,
        fallbackUsed: !mlResult.used,
        mlError: mlResult.error ?? null,
        totalInvoices: invoices.length,
        openInvoices: openInvoices.length,
      },
      items,
    };
  }

  private toFeatures(
    invoice: InvoiceEntity,
    allInvoices: InvoiceEntity[],
    businessLateRatio30d: number
  ): InvoiceRiskFeature {
    const dueDate = this.parseDate(invoice.dueDate);
    const now = this.startOfDay(new Date());
    const daysToDue = dueDate ? this.daysBetween(now, dueDate) : 0;

    const clientHistory = allInvoices.filter((x) => x.clientId === invoice.clientId);
    const clientLate = clientHistory.filter(
      (x) => String(x.status || '').toLowerCase() === 'overdue'
    );

    const clientLateRatio90d = clientHistory.length
      ? this.round4(clientLate.length / clientHistory.length)
      : 0;

    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      clientId: invoice.clientId,
      clientName: invoice.clientName,
      dueDate: this.normalizeDate(invoice.dueDate) ?? invoice.dueDate,
      status: String(invoice.status || 'sent').toLowerCase(),
      totalAmount: Number(invoice.totalAmount || 0),
      daysToDue,
      clientLateRatio90d,
      clientInvoiceCount90d: clientHistory.length,
      businessLateRatio30d,
      month: dueDate ? dueDate.getMonth() + 1 : 1,
      weekday: dueDate ? dueDate.getDay() : 0,
      isMonthEnd: dueDate && this.isMonthEnd(dueDate) ? 1 : 0,
    };
  }

  private heuristicFallback(features: InvoiceRiskFeature[]): RiskItem[] {
    const items = features.map((f) => {
      // Heuristic fallback used only when ML inference is unavailable.
      // Keep it dynamic to avoid flat scores when invoice profiles differ.
      let score = 0.08;

      if (f.status === 'overdue') {
        score += 0.5;
      } else if (f.status === 'viewed') {
        score += 0.05;
      } else if (f.status === 'sent') {
        score += 0.02;
      }

      if (f.daysToDue < 0) {
        score += Math.min(0.25, Math.abs(f.daysToDue) / 90);
      } else if (f.daysToDue <= 7) {
        score += 0.12;
      } else if (f.daysToDue <= 14) {
        score += 0.07;
      } else if (f.daysToDue <= 30) {
        score += 0.03;
      }

      score += 0.35 * f.clientLateRatio90d;
      score += 0.2 * f.businessLateRatio30d;

      if (f.totalAmount >= 10000) {
        score += 0.12;
      } else if (f.totalAmount >= 5000) {
        score += 0.08;
      }

      score = Math.max(0, Math.min(1, score));

      const level: 'low' | 'medium' | 'high' =
        score >= 0.7 ? 'high' : score >= 0.4 ? 'medium' : 'low';

      return {
        ...f,
        riskScore: this.round4(score),
        riskLevel: level,
        reasons: this.buildReasons(f, this.round4(score), level),
      };
    });

    return items.sort((a, b) => b.riskScore - a.riskScore);
  }

  private async tryMlRiskPrediction(features: InvoiceRiskFeature[]): Promise<{
    items: RiskItem[] | null;
    attempted: boolean;
    used: boolean;
    error?: string;
  }> {
    const url = this.getMlServiceUrl();
    if (!url) {
      return { items: null, attempted: false, used: false };
    }

    try {
      const response = await fetch(`${url.replace(/\/$/, '')}/predict-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoices: features }),
      });

      if (!response.ok) {
        return {
          items: null,
          attempted: true,
          used: false,
          error: `Invoice risk ML responded with HTTP ${response.status}`,
        };
      }

      const payload = (await response.json()) as {
        predictions?: Array<{
          invoiceId: string;
          invoiceNumber: string;
          clientId: string;
          clientName: string;
          dueDate: string;
          status: string;
          totalAmount: number;
          riskScore: number;
          riskLevel: 'low' | 'medium' | 'high';
        }>;
      };

      if (!Array.isArray(payload.predictions)) {
        return {
          items: null,
          attempted: true,
          used: false,
          error: 'Invoice risk ML response shape mismatch',
        };
      }

      const byInvoice = new Map(features.map((f) => [f.invoiceId, f]));

      const items: RiskItem[] = payload.predictions
        .map((p) => {
          const feature = byInvoice.get(p.invoiceId);
          const level = p.riskLevel;
          const riskScore = this.round4(Number(p.riskScore || 0));
          return {
            invoiceId: p.invoiceId,
            invoiceNumber: p.invoiceNumber,
            clientId: p.clientId,
            clientName: p.clientName,
            dueDate: this.normalizeDate(p.dueDate) ?? p.dueDate,
            status: p.status,
            totalAmount: Number(p.totalAmount || 0),
            riskScore,
            riskLevel: level,
            reasons: feature ? this.buildReasons(feature, riskScore, level) : [],
          };
        })
        .sort((a, b) => b.riskScore - a.riskScore);

      return { items, attempted: true, used: true };
    } catch (error) {
      return {
        items: null,
        attempted: true,
        used: false,
        error: error instanceof Error ? error.message : 'Unknown invoice risk ML error',
      };
    }
  }

  private buildReasons(
    f: InvoiceRiskFeature,
    score: number,
    level: 'low' | 'medium' | 'high'
  ): string[] {
    const reasons: string[] = [];

    if (f.status === 'overdue' || f.daysToDue < 0) {
      reasons.push('Invoice is overdue');
    }
    if (f.clientLateRatio90d >= 0.4) {
      reasons.push('Client has high late-payment history');
    }
    if (f.totalAmount >= 5000) {
      reasons.push('High invoice amount increases collection risk');
    }
    if (f.businessLateRatio30d >= 0.25) {
      reasons.push('Business has elevated late-payment trend recently');
    }
    if (!reasons.length) {
      reasons.push(`Overall ${level} risk score (${score.toFixed(2)}) from model profile`);
    }

    return reasons;
  }

  private computeBusinessLateRatio30d(invoices: InvoiceEntity[]): number {
    const today = this.startOfDay(new Date());
    const start = new Date(today);
    start.setDate(start.getDate() - 30);

    const recent = invoices.filter((x) => {
      const d = this.parseDate(x.dueDate);
      return d ? d >= start && d <= today : false;
    });

    if (!recent.length) return 0;
    const late = recent.filter((x) => String(x.status || '').toLowerCase() === 'overdue').length;
    return this.round4(late / recent.length);
  }

  private hasMlService() {
    return Boolean(this.getMlServiceUrl());
  }

  private getMlServiceUrl() {
    const envUrl = process.env.INVOICE_RISK_ML_URL;
    if (envUrl && String(envUrl).trim().length > 0) {
      return String(envUrl).trim();
    }

    // Local default so backend can still call ML if service runs on standard port.
    return 'http://127.0.0.1:8001';
  }

  private parseDate(input?: string | null): Date | null {
    if (!input) return null;
    const raw = String(input).trim();
    if (!raw) return null;

    const direct = new Date(raw);
    if (!Number.isNaN(direct.getTime())) return this.startOfDay(direct);

    const m = raw.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
    if (m) {
      const day = Number(m[1]);
      const month = Number(m[2]);
      const year = Number(m[3]);
      const dt = new Date(year, month - 1, day);
      if (!Number.isNaN(dt.getTime())) return this.startOfDay(dt);
    }

    return null;
  }

  private normalizeDate(input?: string | null) {
    const dt = this.parseDate(input);
    return dt ? this.toDateKey(dt) : null;
  }

  private startOfDay(d: Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  private toDateKey(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  private daysBetween(a: Date, b: Date) {
    const ms = b.getTime() - a.getTime();
    return Math.round(ms / (1000 * 60 * 60 * 24));
  }

  private isMonthEnd(d: Date) {
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    return next.getMonth() !== d.getMonth();
  }

  private round4(n: number) {
    return Math.round((n + Number.EPSILON) * 10000) / 10000;
  }
}
