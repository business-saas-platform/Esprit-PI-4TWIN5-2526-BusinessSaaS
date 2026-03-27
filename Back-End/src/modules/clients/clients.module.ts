import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ClientsController } from "./clients.controller";
import { ClientsService } from "./clients.service";
import { ClientEntity } from "./entities/client.entity";
import { InvoiceEntity } from "../invoices/entities/invoice.entity";

@Module({
  imports: [TypeOrmModule.forFeature([ClientEntity, InvoiceEntity])],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}