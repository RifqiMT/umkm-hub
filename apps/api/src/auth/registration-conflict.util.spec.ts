import { REGISTRATION_CONFLICT_MESSAGE } from './registration-conflict.util';

describe('REGISTRATION_CONFLICT_MESSAGE', () => {
  it('does not mention username or email specifically as taken', () => {
    expect(REGISTRATION_CONFLICT_MESSAGE).toMatch(/username or email/i);
    expect(REGISTRATION_CONFLICT_MESSAGE.toLowerCase()).not.toMatch(
      /the username ".*"/,
    );
    expect(REGISTRATION_CONFLICT_MESSAGE.toLowerCase()).not.toMatch(
      /the email ".*"/,
    );
  });
});
