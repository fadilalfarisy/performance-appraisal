import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryDto } from './query.dto';

const errorsFor = async (input: Record<string, unknown>) =>
  validate(plainToInstance(QueryDto, input));

describe('QueryDto', () => {
  it('defaults to page 1 and limit 10', () => {
    const dto = plainToInstance(QueryDto, {});

    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
  });

  it('coerces string query values to numbers', () => {
    const dto = plainToInstance(QueryDto, { page: '2', limit: '100' });

    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(100);
  });

  it('accepts a limit of 100', async () => {
    await expect(errorsFor({ limit: 100 })).resolves.toHaveLength(0);
  });

  it('rejects a limit above 100 on the max constraint', async () => {
    const errors = await errorsFor({ limit: 101 });

    expect(errors.map((error) => error.property)).toEqual(['limit']);
    expect(errors[0]?.constraints).toHaveProperty('max');
  });

  it('rejects a limit below 1', async () => {
    const errors = await errorsFor({ limit: 0 });

    expect(errors.map((error) => error.property)).toEqual(['limit']);
  });

  it('rejects a negative limit', async () => {
    const errors = await errorsFor({ limit: -1 });

    expect(errors.map((error) => error.property)).toEqual(['limit']);
  });
});
