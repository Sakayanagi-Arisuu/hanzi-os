import { describe, expect, it } from 'vitest';
import { hanziPasswordMeetsPolicy } from './hanziPasswordPolicy';
import { validateHanziRegistration } from '../server/hanziPassword';

describe('shared registration and reset password policy', () => {
  it.each(['abcdef1', 'abcdefghijkl', '123456789012', 'PASSWORDONLY123', '汉'.repeat(12) + '1', 'abcdefghijk١', 'a1'.repeat(65), '汉'.repeat(86) + 'a1'])('rejects weak or oversized passwords: %s', password => {
    expect(hanziPasswordMeetsPolicy(password)).toBe(false);
    expect(() => validateHanziRegistration({ username: 'fixture', displayName: 'Fixture', email: 'a@example.invalid', password })).toThrow();
  });
  it.each(['abcdefg1', 'abcdefghijk1', '汉'.repeat(84) + 'a1', ' a1'.padEnd(8, ' ')])('preserves valid Unicode and spaces exactly: %s', password => {
    expect(hanziPasswordMeetsPolicy(password)).toBe(true);
    expect(validateHanziRegistration({ username: 'fixture', displayName: 'Fixture', email: 'a@example.invalid', password }).password).toBe(password);
  });
});
