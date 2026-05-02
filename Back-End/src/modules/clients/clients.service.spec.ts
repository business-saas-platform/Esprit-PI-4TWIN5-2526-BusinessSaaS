import { Test, TestingModule } from '@nestjs/testing';
import { ClientsService } from './clients.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClientEntity } from './entities/client.entity';
import { InvoiceEntity } from '../invoices/entities/invoice.entity';

describe('ClientsService', () => {
  let service: ClientsService;

  const mockClientRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((client) => Promise.resolve({ id: '1', ...client })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id: '1', name: 'Test Client' }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockInvoiceRepository = {
    find: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        {
          provide: getRepositoryToken(ClientEntity),
          useValue: mockClientRepository,
        },
        {
          provide: getRepositoryToken(InvoiceEntity),
          useValue: mockInvoiceRepository,
        },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should format client data correctly when creating', async () => {
    const dto = {
      name: ' Test Name ',
      email: ' TEST@example.com ',
      type: 'individual' as any,
    };
    
    const result = await service.create('business-1', dto as any);
    
    expect(result).toBeDefined();
    expect(result.name).toEqual('Test Name'); // should trim
    expect(result.email).toEqual('test@example.com'); // should trim and lowercase
    expect(mockClientRepository.save).toHaveBeenCalled();
  });

  it('should fetch clients successfully', async () => {
    mockClientRepository.find.mockResolvedValueOnce([{ id: '1', name: 'Client 1' }]);
    const result = await service.findAll('business-1');
    expect(result.length).toBe(1);
    expect(result[0].name).toEqual('Client 1');
  });
});
