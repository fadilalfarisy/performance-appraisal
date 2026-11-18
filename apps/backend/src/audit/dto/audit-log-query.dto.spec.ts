import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuditLogQueryDto } from './audit-log-query.dto';

const errorsFor = async (input: Record<string, unknown>) =>
  validate(plainToInstance(AuditLogQueryDto, input));

const userId = '7b1e4f5c-2a3d-4e5f-8a9b-0c1d2e3f4a5b';

describe('AuditLogQueryDto', () => {
  it('accepts every supported filter', async () => {
    const errors = await errorsFor({
      occurredFrom: '2026-11-01T00:00:00.000Z',
      occurredTo: '2026-11-18T23:59:59.999Z',
      userId,
      entity: 'user',
      entityId: 'user-1',
      action: 'USER_CREATED',
      actorType: 'SYSTEM',
      search: 'budi',
      page: 1,
      limit: 10,
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects a user id that is not a UUID', async () => {
    const errors = await errorsFor({ userId: 'not-a-uuid' });

    expect(errors.map((error) => error.property)).toEqual(['userId']);
  });

  it('rejects an unknown actor type', async () => {
    const errors = await errorsFor({ actorType: 'ROBOT' });

    expect(errors.map((error) => error.property)).toEqual(['actorType']);
  });

  it('rejects a non-string entity', async () => {
    const errors = await errorsFor({ entity: 5 });

    expect(errors.map((error) => error.property)).toEqual(['entity']);
  });

  it('rejects an invalid date range bound', async () => {
    const errors = await errorsFor({ occurredFrom: 'yesterday' });

    expect(errors.map((error) => error.property)).toEqual(['occurredFrom']);
  });
});
