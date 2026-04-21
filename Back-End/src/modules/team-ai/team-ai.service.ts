import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { InvoiceEntity } from '../invoices/entities/invoice.entity';
import { ClientEntity } from '../clients/entities/client.entity';
import { ExpenseEntity } from '../expenses/entities/expense.entity';
import { TeamMemberEntity } from '../team-members/entities/team-member.entity';

@Injectable()
export class TeamAiService {
  constructor(
    @InjectRepository(InvoiceEntity)
    private readonly invoiceRepository: Repository<InvoiceEntity>,

    @InjectRepository(ClientEntity)
    private readonly clientRepository: Repository<ClientEntity>,

    @InjectRepository(ExpenseEntity)
    private readonly expenseRepository: Repository<ExpenseEntity>,

    @InjectRepository(TeamMemberEntity)
    private readonly teamRepository: Repository<TeamMemberEntity>
  ) {}

  async getPredictions(businessId: string) {
    console.log('\n══════════════════════════════════════════════════════════════════');
    console.log('SERVICE: getPredictions called');
    console.log('businessId used for query:', businessId);
    
    // DEBUG: First check if ANY data exists in database
    const allExpensesInDB = await this.expenseRepository.find();
    console.log('📊 Total expenses in entire DB:', allExpensesInDB.length);
    if (allExpensesInDB.length > 0) {
      console.log('  Sample expense businessId:', allExpensesInDB[0]?.businessId);
    }
    
    // STEP A: Fetch all real data from DB
    const [invoices, clients, expenses, teamMembers] = await Promise.all([
      this.invoiceRepository.find({
        where: { businessId },
        order: { issueDate: 'DESC' },
      }),
      this.clientRepository.find({
        where: { businessId },
      }),
      this.expenseRepository.find({
        where: { businessId },
      }),
      this.teamRepository.find({
        where: { businessId },
      }),
    ]);

    console.log('\n📈 Query Results for businessId:', businessId);
    console.log('  ✓ invoices found:', invoices.length);
    console.log('  ✓ clients found:', clients.length);
    console.log('  ✓ expenses found:', expenses.length);
    console.log('  ✓ teamMembers found:', teamMembers.length);
    
    const totalData = invoices.length + clients.length + expenses.length + teamMembers.length;
    console.log('  Total data points:', totalData);

    // Check if we have MINIMUM data to proceed
    if (totalData < 1) {
      console.log('⚠️ INSUFFICIENT DATA: No data found for this businessId');
      console.log('Expected businessId: a2f6db7e-7f36-4360-b8cf-6344d4949b31');
      console.log('Used businessId:', businessId);
      console.log('This might indicate JWT businessId mismatch!');
      return {
        success: false,
        businessContext: null,
        aiPredictions: null,
        error: 'Pas assez de données pour générer les prédictions. Commencez par ajouter des factures, clients et membres d\'équipe.',
        generatedAt: new Date().toISOString(),
      };
    }

    console.log('✅ Data validation passed, proceeding with KPI calculations');

    // STEP B: Calculate KPIs
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    // Monthly revenue trend
    const revenueThisMonth = invoices
      .filter(
        (i) =>
          new Date(i.issueDate) >= lastMonth &&
          (i.status === 'paid')
      )
      .reduce((s, i) => s + Number(i.totalAmount || 0), 0);

    const revenueLastMonth = invoices
      .filter((i) => {
        const d = new Date(i.issueDate);
        return (
          d >= twoMonthsAgo &&
          d < lastMonth &&
          (i.status === 'paid')
        );
      })
      .reduce((s, i) => s + Number(i.totalAmount || 0), 0);

    const growthRate =
      revenueLastMonth > 0
        ? (
            ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) *
            100
          ).toFixed(1)
        : '0';

    // Total financials
    const totalRevenue = invoices
      .filter((i) => i.status === 'paid')
      .reduce((s, i) => s + Number(i.totalAmount || 0), 0);

    const totalExpenses = expenses.reduce(
      (s, e) => s + Number(e.amount || 0),
      0
    );

    const monthlyExpenses = expenses
      .filter((e) => new Date(e.createdAt || e.date) >= lastMonth)
      .reduce((s, e) => s + Number(e.amount || 0), 0);

    // Team workload
    const invoicesPerMember =
      teamMembers.length > 0 ? (invoices.length / teamMembers.length).toFixed(1) : invoices.length;

    const clientsPerMember =
      teamMembers.length > 0 ? (clients.length / teamMembers.length).toFixed(1) : clients.length;

    // Workload percentage (benchmark: 30 invoices/member = 100%)
    const workloadPercent = Math.min(
      Math.round((Number(invoicesPerMember) / 30) * 100),
      100
    );

    // Pending invoices (not paid or cancelled)
    const pendingInvoices = invoices.filter(
      (i) => i.status !== 'paid' && i.status !== 'cancelled'
    );
    const pendingAmount = pendingInvoices.reduce(
      (s, i) => s + Number(i.totalAmount || 0),
      0
    );

    // STEP C: Build data context for Ollama
    const businessContext = {
      team: {
        currentSize: teamMembers.length,
        workloadPercent,
        invoicesPerMember,
        clientsPerMember,
      },
      finances: {
        totalRevenue: totalRevenue.toFixed(2),
        totalExpenses: totalExpenses.toFixed(2),
        monthlyExpenses: monthlyExpenses.toFixed(2),
        netProfit: (totalRevenue - totalExpenses).toFixed(2),
        growthRate: `${growthRate}%`,
        revenueThisMonth: revenueThisMonth.toFixed(2),
        revenueLastMonth: revenueLastMonth.toFixed(2),
      },
      operations: {
        totalClients: clients.length,
        totalInvoices: invoices.length,
        pendingInvoices: pendingInvoices.length,
        pendingAmount: pendingAmount.toFixed(2),
      },
    };

    // STEP D: Call Ollama for AI predictions
    const prompt = `Tu es un expert en ressources humaines et stratégie d'entreprise.
Analyse ces données réelles et génère des prédictions précises.
Réponds UNIQUEMENT en JSON valide, sans texte avant ou après.

DONNÉES DE L'ENTREPRISE:
${JSON.stringify(businessContext, null, 2)}

Génère exactement ce JSON:
{
  "workloadStatus": {
    "percentage": ${workloadPercent},
    "level": "critique|élevé|modéré|optimal",
    "message": "message court sur la charge actuelle"
  },
  "predictions": {
    "thirtyDays": {
      "urgency": "critique|haute|moyenne|faible",
      "recommendation": "que faire dans 30 jours",
      "hiringNeeded": true,
      "roleNeeded": "titre du poste ou null",
      "estimatedBudget": "fourchette en TND ou null",
      "reason": "pourquoi cette recommandation"
    },
    "ninetyDays": {
      "urgency": "critique|haute|moyenne|faible",
      "recommendation": "que faire dans 90 jours",
      "hiringNeeded": true,
      "rolesNeeded": ["liste des postes"],
      "estimatedBudget": "fourchette totale en TND",
      "projectedRevenue": "CA prévu dans 90 jours en TND",
      "reason": "analyse détaillée"
    },
    "sixMonths": {
      "recommendation": "vision stratégique à 6 mois",
      "idealTeamStructure": {
        "description": "description de l'équipe idéale",
        "roles": [
          {"title": "titre", "count": 1, "priority": "haute|moyenne|faible"}
        ]
      },
      "projectedRevenue": "CA prévu en TND",
      "roiOfHiring": "ROI estimé du recrutement"
    }
  },
  "skillGaps": [
    {
      "skill": "compétence manquante",
      "urgency": "critique|haute|moyenne",
      "impact": "impact sur le business"
    }
  ],
  "hiringTimeline": [
    {
      "week": "Semaine 1-2",
      "action": "action à faire",
      "deadline": false
    }
  ],
  "budgetForecast": {
    "currentTeamCost": "coût actuel estimé en TND",
    "optimalTeamCost": "coût optimal estimé en TND",
    "canAffordHiring": true,
    "reasoning": "explication basée sur les données"
  },
  "overallScore": {
    "value": 75,
    "label": "Équipe en croissance",
    "color": "green"
  }
}`;

    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3:latest',
          prompt: prompt,
          stream: false,
          format: 'json',
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`);
      }

      const data = await response.json();
      const aiResult = JSON.parse(data.response);

      return {
        success: true,
        businessContext,
        aiPredictions: aiResult,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Ollama error:', error);
      // Return calculated data without AI if Ollama fails
      return {
        success: false,
        businessContext,
        aiPredictions: null,
        error: 'IA temporairement indisponible',
        generatedAt: new Date().toISOString(),
      };
    }
  }
}
