import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BusinessAccessGuard } from '../../common/guards/business-access.guard';
import { BusinessId } from '../../common/decorators/business-id.decorator';

//
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@Controller('expenses')
@UseGuards(JwtAuthGuard, BusinessAccessGuard, PermissionsGuard)
export class ExpensesController {
  constructor(private readonly s: ExpensesService) {}

  @Post()
  @RequirePermissions('expenses:write')
  create(@BusinessId() businessId: string, @Body() dto: CreateExpenseDto) {
    return this.s.create(businessId, dto);
  }

  @Get()
  @RequirePermissions('expenses:read')
  findAll(@BusinessId() businessId: string) {
    return this.s.findAll(businessId);
  }

  @Get(':id')
  @RequirePermissions('expenses:read')
  findOne(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.s.findOne(businessId, id);
  }

  @Patch(':id')
  @RequirePermissions('expenses:update')
  update(@BusinessId() businessId: string, @Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.s.update(businessId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('expenses:delete')
  remove(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.s.remove(businessId, id);
  }
}
