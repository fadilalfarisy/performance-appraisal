import { ArgumentsHost } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();
  const response = {
    status: jest.fn(),
    json: jest.fn(),
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;

  beforeEach(() => {
    jest.clearAllMocks();
    response.status.mockReturnValue(response);
  });

  it('maps a Drizzle-wrapped exclusion violation to 422 CONTRACT_OVERLAP', () => {
    filter.catch(
      {
        query: 'insert into "contracts" ...',
        cause: {
          code: '23P01',
          constraint: 'contracts_no_overlap',
          detail: 'conflicting key value violates exclusion constraint',
        },
      },
      host,
    );

    expect(response.status).toHaveBeenCalledWith(422);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 422,
      code: 'CONTRACT_OVERLAP',
      message: 'This contract overlaps another active contract for the employee',
      details: {},
    });
  });

  it('maps a Drizzle-wrapped unique violation to 409', () => {
    filter.catch(
      {
        query: 'insert into "contracts" ...',
        cause: {
          code: '23505',
          detail: 'Key (employee_id, start_date)=(emp-1, 2026-10-01) already exists.',
        },
      },
      host,
    );

    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'UNIQUE_VIOLATION' }),
    );
  });
});
