import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DeepPartial, Repository } from "typeorm";
import { InvoiceEntity } from "./entities/invoice.entity";
import { InvoiceItemEntity } from "./entities/invoice-item.entity";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";
import { UpdateInvoiceDto } from "./dto/update-invoice.dto";

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(InvoiceEntity)
    private readonly repo: Repository<InvoiceEntity>,

    @InjectRepository(InvoiceItemEntity)
    private readonly itemsRepo: Repository<InvoiceItemEntity>
  ) {}

  private calcTotals(items: { quantity: number; unitPrice: number; taxRate?: number }[]) {
    const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);

    const taxAmount = items.reduce(
      (sum, it) => sum + it.quantity * it.unitPrice * ((it.taxRate ?? 0) / 100),
      0
    );

    const totalAmount = subtotal + taxAmount;
    return { subtotal, taxAmount, totalAmount };
  }

  async create(businessId: string, dto: CreateInvoiceDto) {
    const list = Array.isArray(dto.items) ? dto.items : [];
    if (!list.length) throw new BadRequestException("Invoice items are required");

    const { subtotal, taxAmount, totalAmount } = this.calcTotals(
      list.map((it) => ({
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        taxRate: Number(it.taxRate ?? 0),
      }))
    );

    // ✅ IMPORTANT: create ONE invoice entity (NOT array)
    const invoice: InvoiceEntity = this.repo.create({
      businessId,
      invoiceNumber: dto.invoiceNumber,
      clientId: dto.clientId,
      clientName: dto.clientName,
      issueDate: dto.issueDate,
      dueDate: dto.dueDate,
      status: (dto.status ?? "draft") as any,
      currency: dto.currency ?? "TND",
      notes: dto.notes ?? null,
      paidAmount: dto.paidAmount ?? 0,
      subtotal,
      taxAmount,
      totalAmount,
    } as DeepPartial<InvoiceEntity>);

    // ✅ IMPORTANT: save ONE => saved is InvoiceEntity (not array)
    const saved: InvoiceEntity = await this.repo.save(invoice);

    // ✅ BEST FIX: create ALL items in one call => returns InvoiceItemEntity[]
    const itemEntities: InvoiceItemEntity[] = this.itemsRepo.create(
      list.map(
        (it) =>
          ({
            invoice: saved, // ✅ relation (no invoiceId column in your entity)
            description: String(it.description ?? "").trim(),
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            taxRate: Number(it.taxRate ?? 0),
            amount: Number(it.quantity) * Number(it.unitPrice),
          } as DeepPartial<InvoiceItemEntity>)
      )
    ) as InvoiceItemEntity[];

    await this.itemsRepo.save(itemEntities);

    // ✅ reload (items are eager already, but safe)
    const full = await this.repo.findOne({
      where: { id: saved.id, businessId } as any,
    });

    return this.toApi(full ?? saved);
  }

  async findAll(businessId: string) {
    const list = await this.repo.find({
      where: { businessId } as any,
      order: { issueDate: "DESC" } as any,
    });
    return list.map((inv) => this.toApi(inv));
  }

  async findOne(businessId: string, id: string) {
    const inv = await this.repo.findOne({ where: { id, businessId } as any });
    if (!inv) throw new NotFoundException("Invoice not found");
    return this.toApi(inv);
  }

async update(businessId: string, id: string, dto: UpdateInvoiceDto) {
  const inv = await this.repo.findOne({ where: { id, businessId } as any });
  if (!inv) throw new NotFoundException("Invoice not found");

  const previousStatus = inv.status;

  Object.assign(inv, dto as any);

  // ✅ logique métier des statuts
  if (dto.status === "paid" && previousStatus !== "paid") {
    inv.paidAmount = Number(inv.totalAmount ?? 0);
  }

  // si on quitte "paid" vers un autre statut => reset
  if (
    dto.status &&
    dto.status !== "paid" &&
    previousStatus === "paid"
  ) {
    inv.paidAmount = 0;
  }

  const saved: InvoiceEntity = await this.repo.save(inv);

  const full = await this.repo.findOne({
    where: { id: saved.id, businessId } as any,
  });

  return this.toApi(full ?? saved);
}

  async remove(businessId: string, id: string) {
    const res = await this.repo.delete({ id, businessId } as any);
    if (!res.affected) throw new NotFoundException("Invoice not found");
    return { deleted: true, id };
  }

  private toApi(inv: InvoiceEntity) {
    return {
      id: inv.id,
      businessId: inv.businessId,
      invoiceNumber: inv.invoiceNumber,
      clientId: inv.clientId,
      clientName: inv.clientName,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      status: inv.status,
      subtotal: inv.subtotal,
      taxAmount: inv.taxAmount,
      totalAmount: inv.totalAmount,
      paidAmount: inv.paidAmount,
      currency: inv.currency,
      notes: inv.notes,
      items: (inv.items ?? []).map((it) => ({
        id: it.id,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        taxRate: it.taxRate,
        amount: it.amount,
      })),
    };
  }
}