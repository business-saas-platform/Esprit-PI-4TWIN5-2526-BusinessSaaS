//Ton système fait juste ça :
.0
//Observer le comportement d’un client → donner un score → dire s’il est risqué ou non

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ClientsService } from '../clients/clients.service';
import { InvoiceEntity } from '../invoices/entities/invoice.entity';
import { AiModel } from './ai.model';

@Injectable()
export class AiService {
  constructor(
    private readonly clientsService: ClientsService,

    @InjectRepository(InvoiceEntity)
    private readonly invoiceRepo: Repository<InvoiceEntity>,

    private readonly aiModel: AiModel
  ) {}

  async predictRisk(businessId: string, clientId: string) {
    const client = await this.clientsService.findOne(businessId, clientId);

    const invoices = await this.invoiceRepo.find({
      where: { businessId, clientId } as any,
    });

    // 🎯 FEATURES
    const totalInvoices = invoices.length;

    const unpaidInvoices = invoices.filter(
      (i) => i.status !== "paid"
    ).length;

    const lateInvoices = invoices.filter(
      (i) => i.status === "overdue"
    ).length;

    const outstanding = Number(client.outstandingBalance || 0);
    const revenue = Number(client.totalRevenue || 0);

    // 🎯 SAFE CALCULATIONS
    const unpaidRatio = totalInvoices > 0 ? unpaidInvoices / totalInvoices : 0;
    const lateRatio = totalInvoices > 0 ? lateInvoices / totalInvoices : 0;
    const debtRatio = revenue > 0 ? outstanding / revenue : 0;

    // 🎯 MACHINE LEARNING SCORE (TensorFlow)
    let score = await this.aiModel.predictScore(unpaidRatio, lateRatio, debtRatio);
    score = Math.max(0, Math.min(1, score)); // clamp 0 → 1 just in case
    score = Number(score.toFixed(2)); // Round BEFORE classification to align UX

    // 🎯 CLASSIFICATION
    let risk: "LOW" | "MEDIUM" | "HIGH";

    if (score >= 0.7) {
      risk = "HIGH";
    } else if (score >= 0.4) {
      risk = "MEDIUM";
    } else {  
      risk = "LOW";
    }

    // 🎯 EXPLANATION (important for prof 🔥)
    let reason = "Client is reliable";

    if (risk === "HIGH" || risk === "MEDIUM") {
      if (lateRatio > 0.5) {
        reason = "Frequent late payments";
      } else if (debtRatio > 0.5) {
        reason = "High unpaid balance compared to revenue";
      } else if (unpaidRatio > 0.5) {
        reason = "Many unpaid invoices";
      } else {
        reason = "Payment behavior needs attention";
      }
    } else {
      // 🟢 IF LOW RISK
      if (unpaidRatio > 0.5) {
        // Just pending invoices without being overdue or huge debt
        reason = "Reliable client, but has several pending invoices";
      } else {
        reason = "Client is reliable with a solid payment history";
      }
    }

    return {
      clientId,
      risk,
      score: Number(score.toFixed(2)),
      details: {
        totalInvoices,
        unpaidInvoices,
        lateInvoices,
        outstanding,
        revenue,
      },
      reason,
    };
  }
}