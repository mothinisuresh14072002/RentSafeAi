import { Test, TestingModule } from '@nestjs/testing';
import { PropertyService } from './property.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { SandboxGeocodingProvider } from './providers/sandbox-geocoding.provider';
import { Policies } from '../auth/policies';
import { AuditService } from '../common/audit/audit.service';
import { PropertyType } from '@prisma/client';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('PropertyService', () => {
  let service: PropertyService;
  let prisma: PrismaService;
  let policies: Policies;
  let provider: SandboxGeocodingProvider;
  let audit: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertyService,
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn().mockImplementation((cb) => cb(prisma)),
            property: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
            propertyIdentifier: {
              create: jest.fn(),
            },
            propertyVerification: {
              createMany: jest.fn(),
            },
          },
        },
        {
          provide: SandboxGeocodingProvider,
          useValue: {
            geocodeAddress: jest
              .fn()
              .mockResolvedValue({ latitude: 13.0, longitude: 80.0 }),
          },
        },
        {
          provide: Policies,
          useValue: {
            canSubmitProperty: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PropertyService>(PropertyService);
    prisma = module.get<PrismaService>(PrismaService);
    policies = module.get<Policies>(Policies);
    provider = module.get<SandboxGeocodingProvider>(SandboxGeocodingProvider);
    audit = module.get<AuditService>(AuditService);
  });

  const validAddress = {
    buildingNumber: '12A',
    street: 'Main Road',
    locality: 'Adyar',
    city: 'Chennai',
    district: 'Chennai',
    state: 'Tamil Nadu',
    pinCode: '600020',
  };

  describe('registerProperty', () => {
    it('throws if PIN code is invalid', async () => {
      await expect(
        service.registerProperty('u1', {
          propertyType: PropertyType.APARTMENT,
          address: { ...validAddress, pinCode: '500001' },
          identifiers: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws if locality is not supported', async () => {
      await expect(
        service.registerProperty('u1', {
          propertyType: PropertyType.APARTMENT,
          address: { ...validAddress, locality: 'Bangalore' },
          identifiers: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws Conflict if exact address hash exists', async () => {
      jest
        .spyOn(prisma.property, 'findUnique')
        .mockResolvedValue({ id: 'p1' } as any);

      await expect(
        service.registerProperty('u1', {
          propertyType: PropertyType.APARTMENT,
          address: validAddress,
          identifiers: [],
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('registers an inactive claim with a pending verification checklist', async () => {
      jest.spyOn(prisma.property, 'findUnique').mockResolvedValue(null);
      jest
        .spyOn(prisma.property, 'create')
        .mockResolvedValue({ id: 'p1', status: 'INACTIVE' } as any);
      const createIdfSpy = jest
        .spyOn(prisma.propertyIdentifier, 'create')
        .mockResolvedValue({} as any);
      const createVerificationSpy = jest
        .spyOn(prisma.propertyVerification, 'createMany')
        .mockResolvedValue({ count: 3 });

      await service.registerProperty('u1', {
        propertyType: PropertyType.APARTMENT,
        address: validAddress,
        identifiers: [{ type: 'SURVEY_NUMBER', value: '123/4' }],
      });

      expect(policies.canSubmitProperty).toHaveBeenCalledWith('u1');
      expect(provider.geocodeAddress).toHaveBeenCalled();
      expect(createIdfSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            identifierType: 'SURVEY_NUMBER',
            propertyId: 'p1',
          }),
        }),
      );
      expect(createVerificationSpy).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ checkType: 'DOCUMENT_AI', status: 'PENDING' }),
          expect.objectContaining({ checkType: 'REGISTRY_EXISTENCE', status: 'PENDING' }),
          expect.objectContaining({ checkType: 'OWNERSHIP_MATCH', status: 'PENDING' }),
        ]),
      });
      expect(audit.log).toHaveBeenCalledWith(
        prisma,
        expect.objectContaining({
          action: 'PROPERTY_REGISTERED',
        }),
      );
    });
  });
});
