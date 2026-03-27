import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { ClientEntity } from "./entities/client.entity";
import { CreateClientDto } from "./dto/create-client.dto";
import { UpdateClientDto } from "./dto/update-client.dto";
import { toIso } from "../../common/api-mapper";
import { InvoiceEntity } from "../invoices/entities/invoice.entity";

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(ClientEntity)
    private readonly repo: Repository<ClientEntity>,

    @InjectRepository(InvoiceEntity)
    private readonly invoicesRepo: Repository<InvoiceEntity>
  ) {}

  async create(businessId: string, dto: CreateClientDto) {
    const entity = this.repo.create({
      businessId,
      name: dto.name.trim(),
      email: dto.email.trim().toLowerCase(),
      phone: dto.phone?.trim() || "",
      address: dto.address?.trim() || "",
      city: dto.city?.trim() || "",
      postalCode: dto.postalCode?.trim() || "",
      country: dto.country?.trim() || "Tunisia",
      taxId: dto.taxId?.trim() || undefined,
      type: dto.type,
      status: dto.status ?? "active",
      notes: dto.notes?.trim() || undefined,
      lastContactDate: dto.lastContactDate?.trim() || undefined,
      companyName: dto.companyName?.trim() || undefined,
      contactPerson: dto.contactPerson?.trim() || undefined,
      totalRevenue: 0,
      outstandingBalance: 0,
    });

    const saved = await this.repo.save(entity);
    return this.toApi(saved);
  }

  private async computeClientStats(businessId: string, clientId: string) {
    const invoices = await this.invoicesRepo.find({
      where: { businessId, clientId } as any,
    });

    const validInvoices = invoices.filter((inv) => inv.status !== "cancelled");

    const totalRevenue = validInvoices.reduce((sum, inv) => {
      return sum + Number(inv.totalAmount ?? 0);
    }, 0);

    const outstandingBalance = validInvoices.reduce((sum, inv) => {
      const total = Number(inv.totalAmount ?? 0);
      const paid = Number(inv.paidAmount ?? 0);
      return sum + Math.max(total - paid, 0);
    }, 0);

    return {
      totalRevenue,
      outstandingBalance,
    };
  }

  async findAll(businessId: string) {
    const list = await this.repo.find({
      where: { businessId },
      order: { createdAt: "DESC" },
    });

    const enriched = await Promise.all(
      list.map(async (client) => {
        const stats = await this.computeClientStats(businessId, client.id);

        return this.toApi({
          ...client,
          totalRevenue: stats.totalRevenue,
          outstandingBalance: stats.outstandingBalance,
        } as ClientEntity);
      })
    );

    return enriched;
  }

  async findOne(businessId: string, id: string) {
    const client = await this.repo.findOne({
      where: { id, businessId },
    });

    if (!client) {
      throw new NotFoundException("Client not found");
    }

    const stats = await this.computeClientStats(businessId, client.id);

    return this.toApi({
      ...client,
      totalRevenue: stats.totalRevenue,
      outstandingBalance: stats.outstandingBalance,
    } as ClientEntity);
  }

  async update(businessId: string, id: string, dto: UpdateClientDto) {
    const client = await this.repo.findOne({
      where: { id, businessId },
    });

    if (!client) {
      throw new NotFoundException("Client not found");
    }

    if (dto.name !== undefined) {
      client.name = dto.name.trim();
    }

    if (dto.email !== undefined) {
      client.email = dto.email.trim().toLowerCase();
    }

    if (dto.phone !== undefined) {
      client.phone = dto.phone.trim();
    }

    if (dto.address !== undefined) {
      client.address = dto.address.trim();
    }

    if (dto.city !== undefined) {
      client.city = dto.city.trim();
    }

    if (dto.postalCode !== undefined) {
      client.postalCode = dto.postalCode.trim();
    }

    if (dto.country !== undefined) {
      client.country = dto.country.trim() || "Tunisia";
    }

    if (dto.taxId !== undefined) {
      client.taxId = dto.taxId.trim() || undefined;
    }

    if (dto.type !== undefined) {
      client.type = dto.type;
    }

    if (dto.status !== undefined) {
      client.status = dto.status;
    }

    if (dto.notes !== undefined) {
      client.notes = dto.notes.trim() || undefined;
    }

    if (dto.lastContactDate !== undefined) {
      client.lastContactDate = dto.lastContactDate.trim() || undefined;
    }

    if (dto.companyName !== undefined) {
      client.companyName = dto.companyName.trim() || undefined;
    }

    if (dto.contactPerson !== undefined) {
      client.contactPerson = dto.contactPerson.trim() || undefined;
    }

    const saved = await this.repo.save(client);
    const stats = await this.computeClientStats(businessId, saved.id);

    return this.toApi({
      ...saved,
      totalRevenue: stats.totalRevenue,
      outstandingBalance: stats.outstandingBalance,
    } as ClientEntity);
  }

  async remove(businessId: string, id: string) {
    const res = await this.repo.delete({ id, businessId });

    if (!res.affected) {
      throw new NotFoundException("Client not found");
    }

    return { deleted: true, id };
  }

  private toApi(c: ClientEntity) {
    return {
      id: c.id,
      businessId: c.businessId,
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      city: c.city,
      postalCode: c.postalCode,
      country: c.country,
      taxId: c.taxId,
      type: c.type,
      status: c.status,
      totalRevenue: c.totalRevenue,
      outstandingBalance: c.outstandingBalance,
      createdAt: toIso(c.createdAt)!,
      lastContactDate: c.lastContactDate,
      notes: c.notes,
      companyName: c.companyName,
      contactPerson: c.contactPerson,
    };
  }
}