import { UserRole } from '@appraisal/types';
import { DailyNotesService } from './daily-notes.service';

describe('DailyNotesService ADMIN scope', () => {
  let service: DailyNotesService;
  let repository: {
    listNotes: jest.Mock;
    valuesForNotes: jest.Mock;
    allEmployees: jest.Mock;
    subordinateEmployees: jest.Mock;
    employeesByDepartments: jest.Mock;
  };

  beforeEach(() => {
    repository = {
      listNotes: jest.fn().mockResolvedValue([[], 0]),
      valuesForNotes: jest.fn().mockResolvedValue([]),
      allEmployees: jest.fn().mockResolvedValue([{ id: 'emp-1' }]),
      subordinateEmployees: jest.fn(),
      employeesByDepartments: jest.fn(),
    };
    const requestContext = {
      getUser: jest.fn(() => ({
        userId: 'user-1',
        username: 'admin',
        employeeId: null,
        roles: [UserRole.ADMIN],
      })),
    };

    service = new DailyNotesService(
      repository as never,
      {} as never,
      {} as never,
      {} as never,
      requestContext as never,
      {} as never,
    );
  });

  it('lists notes from every department for ADMIN', async () => {
    await service.findAll({ page: 1, limit: 10 } as never);

    expect(repository.listNotes).toHaveBeenCalledWith(expect.anything(), {
      by: 'all',
    });
    expect(repository.subordinateEmployees).not.toHaveBeenCalled();
    expect(repository.employeesByDepartments).not.toHaveBeenCalled();
  });

  it('offers every employee for ADMIN', async () => {
    await service.accessibleEmployees();

    expect(repository.allEmployees).toHaveBeenCalled();
  });
});
