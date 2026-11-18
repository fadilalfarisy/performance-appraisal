import { CriteriaService } from './criteria.service';

const set = {
  id: 'set-new',
  departmentId: 'dep-1',
  status: 'DRAFT',
  version: 2,
};

const previous = {
  id: 'set-old',
  departmentId: 'dep-1',
  status: 'ACTIVE',
  version: 1,
};

const criterion = {
  id: 'crit-1',
  code: 'QUALITY',
  name: 'Quality',
  description: null,
  scaleMin: 1,
  scaleMax: 2,
  weight: 100,
  displayOrder: 1,
  scaleDescriptions: [
    { score: 1, description: 'Low' },
    { score: 2, description: 'High' },
  ],
};

describe('CriteriaService activation audit', () => {
  const setup = () => {
    const criteriaRepository = {
      findSetById: jest.fn().mockResolvedValue(set),
      criteriaBySetIds: jest
        .fn()
        .mockResolvedValue({ 'set-new': [criterion] }),
      fieldsBySetIds: jest.fn().mockResolvedValue({ 'set-new': [] }),
      findActiveSet: jest.fn().mockResolvedValue(previous),
      archiveActive: jest.fn(),
      activate: jest.fn(),
    };
    const dbService = {
      transaction: jest.fn((callback: (tx: string) => Promise<unknown>) =>
        callback('tx'),
      ),
    };
    const audit = { record: jest.fn() };
    const requestContext = {
      getUser: jest.fn(() => null),
      getIp: jest.fn(() => null),
      getRequestId: jest.fn(() => null),
    };

    const service = new CriteriaService(
      criteriaRepository as never,
      dbService as never,
      audit as never,
      requestContext as never,
    );

    jest.spyOn(service, 'findOne').mockResolvedValue({ data: {} } as never);

    return { service, criteriaRepository, audit };
  };

  it('audits the archived previous set before the activated one', async () => {
    const { service, audit } = setup();

    await service.activate('set-new');

    expect(audit.record).toHaveBeenCalledWith(
      'tx',
      expect.objectContaining({
        action: 'CRITERIA_SET_ARCHIVED',
        entity: 'criteria_set',
        entityId: 'set-old',
        before: { status: 'ACTIVE' },
        after: { status: 'ARCHIVED' },
        metadata: {
          replacedBy: 'set-new',
          version: 1,
          departmentId: 'dep-1',
        },
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      'tx',
      expect.objectContaining({
        action: 'CRITERIA_SET_ACTIVATED',
        entityId: 'set-new',
      }),
    );
    expect(audit.record.mock.calls[0][1].action).toBe(
      'CRITERIA_SET_ARCHIVED',
    );
  });

  it('writes no archive entry when there was no active set', async () => {
    const { service, criteriaRepository, audit } = setup();
    criteriaRepository.findActiveSet.mockResolvedValue(null);

    await service.activate('set-new');

    expect(audit.record).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledWith(
      'tx',
      expect.objectContaining({ action: 'CRITERIA_SET_ACTIVATED' }),
    );
  });

  it('ignores the global fallback because activation does not archive it', async () => {
    const { service, criteriaRepository, audit } = setup();
    criteriaRepository.findActiveSet.mockResolvedValue({
      id: 'set-global',
      departmentId: null,
      status: 'ACTIVE',
      version: 1,
    });

    await service.activate('set-new');

    expect(audit.record).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledWith(
      'tx',
      expect.objectContaining({ action: 'CRITERIA_SET_ACTIVATED' }),
    );
  });
});
