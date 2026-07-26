import { api } from './api';

export type RegistrationAvailability = {
  available: boolean;
  message?: string;
};

/** Combined check — never reveals whether username or email collided. */
export async function checkRegistrationAvailability(
  profileName: string,
  email: string,
): Promise<RegistrationAvailability> {
  return api<RegistrationAvailability>('/auth/register-availability', {
    method: 'POST',
    auth: false,
    body: {
      profileName: profileName.trim(),
      email: email.trim().toLowerCase(),
    },
  });
}
