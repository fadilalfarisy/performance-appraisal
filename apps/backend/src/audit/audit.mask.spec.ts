import { maskSensitive, MASKED } from './audit.mask';

describe('maskSensitive', () => {
  it('masks deny-listed keys at any depth', () => {
    const input = {
      username: 'budi',
      password: 'super-secret',
      profile: { refreshToken: 'abc', fullName: 'Budi' },
      items: [{ accessToken: 'xyz', name: 'a' }],
    };

    const result = maskSensitive(input) as typeof input;

    expect(result.password).toBe(MASKED);
    expect(result.profile.refreshToken).toBe(MASKED);
    expect(result.items[0].accessToken).toBe(MASKED);
    expect(result.username).toBe('budi');
    expect(result.profile.fullName).toBe('Budi');
    expect(result.items[0].name).toBe('a');
  });

  it('leaves primitives and null untouched', () => {
    expect(maskSensitive(null)).toBeNull();
    expect(maskSensitive(42)).toBe(42);
    expect(maskSensitive('plain')).toBe('plain');
  });
});
