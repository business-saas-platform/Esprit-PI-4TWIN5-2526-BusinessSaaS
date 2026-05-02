import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesService } from './invoices.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InvoiceEntity } from './entities/invoice.entity';
import { InvoiceItemEntity } from './entities/invoice-item.entity';

describe('InvoicesService', () => {
  let service: InvoicesService;

  const mockInvoiceRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((invoice) => Promise.resolve({ id: 'inv-1', ...invoice })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id: 'inv-1', invoiceNumber: 'INV-001', items: [] }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockInvoiceItemRepository = {
    create: jest.fn().mockImplementation((dtos) => dtos),
    save: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        {
          provide: getRepositoryToken(InvoiceEntity),
          useValue: mockInvoiceRepository,
        },
        {
          provide: getRepositoryToken(InvoiceItemEntity),
          useValue: mockInvoiceItemRepository,
        },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calculate totals correctly when creating an invoice', async () => {
    const dto = {
      invoiceNumber: 'INV-001',
      clientId: 'client-1',
      clientName: 'Client 1',
      items: [
        { quantity: 2, unitPrice: 100, taxRate: 10 }, // subtotal: 200, tax: 20
        { quantity: 1, unitPrice: 50, taxRate: 0 },   // subtotal: 50, tax: 0
      ],
    };

    const result = await service.create('business-1', dto as any);
    
    expect(result).toBeDefined();
    expect(mockInvoiceRepository.create).toHaveBeenCalled();
    // 200 + 50 = 250 subtotal
    // 20 + 0 = 20 tax
    // total = 270
    const createdInvoice = mockInvoiceRepository.create.mock.calls[0][0];
    expect(createdInvoice.subtotal).toBe(250);
    expect(createdInvoice.taxAmount).toBe(20);
    expect(createdInvoice.totalAmount).toBe(270);
  });

  it('should fetch invoices successfully', async () => {
    mockInvoiceRepository.find.mockResolvedValueOnce([{ id: 'inv-1', invoiceNumber: 'INV-001', items: [] }]);
    const result = await service.findAll('business-1');
    expect(result.length).toBe(1);
    expect(result[0].invoiceNumber).toEqual('INV-001');
  });
});
