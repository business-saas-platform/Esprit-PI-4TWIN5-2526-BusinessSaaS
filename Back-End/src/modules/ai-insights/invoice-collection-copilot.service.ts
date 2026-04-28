import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoiceLateRiskService } from './invoice-late-risk.service';
import { InvoiceCollectionActionEntity } from './entities/invoice-collection-action.entity';
import { UpdateInvoiceCollectionActionDto } from './dto/update-invoice-collection-action.dto';

type CopilotChannel = 'email' | 'call' | 'whatsapp';
type CopilotUrgency = 'low' | 'medium' | 'high';

type InvoiceRiskItem = {
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

type CopilotAction = {
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  dueDate: string;
  status: string;
  totalAmount: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  priorityRank: number;
  urgency: CopilotUrgency;
  recommendedChannel: CopilotChannel;
  followUpInHours: number;
  subject: string;
  message: string;
  callScript: string;
  rationale: string[];
  workflow: {
    status: 'pending' | 'snoozed' | 'done';
    snoozedUntil: string | null;
    doneAt: string | null;
    outcomeNote: string | null;
    outcomeAmountCollected: number | null;
    nextStep: string | null;
    updatedAt: string | null;
  };
};

@Injectable()
export class InvoiceCollectionCopilotService {
  constructor(
    private readonly invoiceLateRiskService: InvoiceLateRiskService,
    @InjectRepository(InvoiceCollectionActionEntity)
    private readonly actionsRepo: Repository<InvoiceCollectionActionEntity>
  ) {}

  async generateCollectionPlan(businessId: string, limit = 10) {
    const safeLimit = this.normalizeLimit(limit);
    const risk = await this.invoiceLateRiskService.scoreLatePaymentRisk(businessId);
    const items: InvoiceRiskItem[] = Array.isArray(risk?.items) ? risk.items : [];
    const top = items.slice(0, safeLimit);

    const existing = await this.actionsRepo.find({
      where: { businessId } as any,
    });
    const byInvoice = new Map(existing.map((x) => [x.invoiceId, x]));

    const actions: CopilotAction[] = top.map((item, idx) => {
      const profile = this.buildContactProfile(item);
      const tracked = byInvoice.get(item.invoiceId);
      return {
        ...item,
        priorityRank: idx + 1,
        urgency: profile.urgency,
        recommendedChannel: profile.channel,
        followUpInHours: profile.followUpInHours,
        subject: `Payment follow-up: Invoice ${item.invoiceNumber}`,
        message: this.buildEmailMessage(item, profile),
        callScript: this.buildCallScript(item, profile),
        rationale: this.buildRationale(item, profile),
        workflow: {
          status: tracked?.status ?? 'pending',
          snoozedUntil: this.toIsoOrNull(tracked?.snoozedUntil),
          doneAt: this.toIsoOrNull(tracked?.doneAt),
          outcomeNote: tracked?.outcomeNote ?? null,
          outcomeAmountCollected:
            tracked?.outcomeAmountCollected === null || tracked?.outcomeAmountCollected === undefined
              ? null
              : Number(tracked.outcomeAmountCollected),
          nextStep: tracked?.nextStep ?? null,
          updatedAt: this.toIsoOrNull(tracked?.updatedAt),
        },
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      modelSource: risk?.modelSource ?? 'heuristic-only',
      summary: {
        consideredInvoices: items.length,
        plannedActions: actions.length,
        highUrgency: actions.filter((x) => x.urgency === 'high').length,
        mediumUrgency: actions.filter((x) => x.urgency === 'medium').length,
        lowUrgency: actions.filter((x) => x.urgency === 'low').length,
      },
      debug: risk?.debug ?? null,
      actions,
    };
  }

  async updateActionWorkflow(
    businessId: string,
    invoiceId: string,
    dto: UpdateInvoiceCollectionActionDto
  ) {
    const normalizedStatus = dto.status;
    const existing = await this.actionsRepo.findOne({
      where: { businessId, invoiceId } as any,
    });

    const entity = existing ?? this.actionsRepo.create({ businessId, invoiceId });
    entity.status = normalizedStatus;
    entity.outcomeNote = this.cleanNullableText(dto.outcomeNote);
    entity.nextStep = this.cleanNullableText(dto.nextStep);
    entity.outcomeAmountCollected =
      dto.outcomeAmountCollected === null || dto.outcomeAmountCollected === undefined
        ? null
        : Number(dto.outcomeAmountCollected);

    if (normalizedStatus === 'snoozed') {
      entity.snoozedUntil = this.parseDateOrThrow(dto.snoozedUntil);
      entity.doneAt = null;
    } else if (normalizedStatus === 'done') {
      entity.doneAt = new Date();
      entity.snoozedUntil = null;
    } else {
      entity.doneAt = null;
      entity.snoozedUntil = null;
    }

    const saved = await this.actionsRepo.save(entity);
    return {
      invoiceId: saved.invoiceId,
      status: saved.status,
      snoozedUntil: this.toIsoOrNull(saved.snoozedUntil),
      doneAt: this.toIsoOrNull(saved.doneAt),
      outcomeNote: saved.outcomeNote ?? null,
      outcomeAmountCollected:
        saved.outcomeAmountCollected === null || saved.outcomeAmountCollected === undefined
          ? null
          : Number(saved.outcomeAmountCollected),
      nextStep: saved.nextStep ?? null,
      updatedAt: this.toIsoOrNull(saved.updatedAt),
    };
  }

  private buildContactProfile(item: InvoiceRiskItem): {
    urgency: CopilotUrgency;
    channel: CopilotChannel;
    followUpInHours: number;
    tone: 'firm' | 'professional' | 'friendly';
  } {
    const amount = Number(item.totalAmount || 0);
    const overdue = this.isOverdue(item);

    if (item.riskLevel === 'high') {
      return {
        urgency: 'high',
        channel: amount >= 5000 ? 'call' : 'email',
        followUpInHours: overdue ? 6 : 12,
        tone: 'firm',
      };
    }

    if (item.riskLevel === 'medium') {
      return {
        urgency: 'medium',
        channel: overdue ? 'call' : 'email',
        followUpInHours: overdue ? 24 : 36,
        tone: 'professional',
      };
    }

    return {
      urgency: 'low',
      channel: 'email',
      followUpInHours: 48,
      tone: 'friendly',
    };
  }

  private buildEmailMessage(
    item: InvoiceRiskItem,
    profile: { tone: 'firm' | 'professional' | 'friendly' }
  ) {
    const amount = this.formatAmount(item.totalAmount);
    const dueDate = item.dueDate;

    if (profile.tone === 'firm') {
      return `Hello ${item.clientName}, we are following up regarding invoice ${item.invoiceNumber} (${amount}), due on ${dueDate}. Please confirm payment timing today or share any issue preventing settlement so we can agree on a clear date.`;
    }

    if (profile.tone === 'professional') {
      return `Hello ${item.clientName}, this is a reminder for invoice ${item.invoiceNumber} (${amount}) due on ${dueDate}. Please share your expected payment date. If needed, we can coordinate an appropriate payment arrangement.`;
    }

    return `Hi ${item.clientName}, friendly reminder for invoice ${item.invoiceNumber} (${amount}) due on ${dueDate}. Kindly let us know when payment is planned. Thank you for your continued collaboration.`;
  }

  private buildCallScript(
    item: InvoiceRiskItem,
    profile: { urgency: CopilotUrgency; tone: 'firm' | 'professional' | 'friendly' }
  ) {
    const opening =
      profile.tone === 'firm'
        ? 'calling for a priority payment follow-up'
        : profile.tone === 'professional'
          ? 'calling regarding an invoice follow-up'
          : 'calling with a friendly invoice reminder';

    return `Hello ${item.clientName}, this is your finance team ${opening}. The invoice is ${item.invoiceNumber} for ${this.formatAmount(item.totalAmount)}, due on ${item.dueDate}. Could you confirm payment date and whether any support is needed from our side?`;
  }

  private buildRationale(
    item: InvoiceRiskItem,
    profile: { urgency: CopilotUrgency; channel: CopilotChannel; followUpInHours: number }
  ) {
    const reasons = [...(item.reasons || []).slice(0, 3)];
    reasons.push(`Urgency set to ${profile.urgency} based on ${item.riskLevel} risk profile`);
    reasons.push(`Recommended ${profile.channel} follow-up within ${profile.followUpInHours} hours`);
    return reasons;
  }

  private isOverdue(item: InvoiceRiskItem) {
    return String(item.status || '').toLowerCase() === 'overdue' || this.daysUntilDue(item.dueDate) < 0;
  }

  private daysUntilDue(dueDate: string) {
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) return 0;
    due.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  private normalizeLimit(limit: number) {
    const n = Number.isFinite(Number(limit)) ? Number(limit) : 10;
    return Math.min(50, Math.max(1, Math.round(n)));
  }

  private formatAmount(value: number) {
    return `${Number(value || 0).toFixed(2)} TND`;
  }

  private toIsoOrNull(input?: Date | null) {
    if (!input) return null;
    const dt = new Date(input);
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
  }

  private cleanNullableText(value?: string | null) {
    if (!value) return null;
    const trimmed = String(value).trim();
    return trimmed.length ? trimmed : null;
  }

  private parseDateOrThrow(input?: string) {
    if (!input) {
      throw new BadRequestException('snoozedUntil is required when status is snoozed');
    }
    const dt = new Date(input);
    if (Number.isNaN(dt.getTime())) {
      throw new BadRequestException('Invalid snoozedUntil date');
    }
    return dt;
  }
}
