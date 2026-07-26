import {
  profileNameTakenMessage,
  validateProfileNameFormat,
} from './profile-name-conflict.util';

describe('profileNameTakenMessage', () => {
  it('names the taken username and suggests sign-in by default', () => {
    expect(profileNameTakenMessage('rifqi_tjahyono')).toBe(
      'The username "rifqi_tjahyono" is already taken. Choose a different username, or sign in if this is your account.',
    );
  });

  it('omits sign-in hint when renaming an existing account', () => {
    expect(
      profileNameTakenMessage('shop_a', { suggestSignIn: false }),
    ).toBe(
      'The username "shop_a" is already taken. Choose a different username.',
    );
  });
});

describe('validateProfileNameFormat', () => {
  it('accepts a valid username (null = format ok)', () => {
    expect(validateProfileNameFormat('rifqi_tjahyono')).toBeNull();
  });

  it('rejects short usernames', () => {
    expect(validateProfileNameFormat('ab')?.reason).toBe('too_short');
  });

  it('rejects invalid characters', () => {
    expect(validateProfileNameFormat('bad name!')?.reason).toBe(
      'invalid_chars',
    );
  });
});
