import { profileSectionDomId, type ProfileSectionId } from '@/app/(app)/profile/profile-sections';

type ProfileHealthItem = {
  id: string;
  label: string;
  done: boolean;
  section: ProfileSectionId;
  cta: string;
};

export type ProfileHealth = {
  done: number;
  total: number;
  percent: number;
  items: ProfileHealthItem[];
  incomplete: ProfileHealthItem[];
};

export function computeProfileHealth(input: {
  firstName: string;
  lastName: string;
  email?: string | null;
  emailVerified: boolean;
  locationCity: string;
  locationCountry: string;
  businessName: string;
}): ProfileHealth {
  const hasName =
    input.firstName.trim().length > 0 || input.lastName.trim().length > 0;
  const hasLocation =
    input.locationCity.trim().length > 0 ||
    input.locationCountry.trim().length > 0;
  const hasBusiness = input.businessName.trim().length > 0;
  const hasEmail = Boolean(input.email?.trim());

  const items: ProfileHealthItem[] = [
    {
      id: 'name',
      label: 'Display name',
      done: hasName,
      section: 'personal',
      cta: 'Add name',
    },
    ...(hasEmail
      ? [
          {
            id: 'email',
            label: 'Email verified',
            done: input.emailVerified,
            section: 'personal' as const,
            cta: 'Verify email',
          },
        ]
      : []),
    {
      id: 'location',
      label: 'Business location',
      done: hasLocation,
      section: 'personal',
      cta: 'Add location',
    },
    {
      id: 'invoicing',
      label: 'Invoice header',
      done: hasBusiness,
      section: 'invoicing',
      cta: 'Set up invoicing',
    },
  ];

  const done = items.filter((i) => i.done).length;
  const total = items.length;
  const percent = total === 0 ? 100 : Math.round((done / total) * 100);

  return {
    done,
    total,
    percent,
    items,
    incomplete: items.filter((i) => !i.done),
  };
}

export function profileHealthHref(section: ProfileSectionId): string {
  return `#${profileSectionDomId(section)}`;
}

export function profileSectionAlerts(
  health: ProfileHealth,
): Partial<Record<ProfileSectionId, number>> {
  const map: Partial<Record<ProfileSectionId, number>> = {};
  for (const item of health.incomplete) {
    map[item.section] = (map[item.section] ?? 0) + 1;
  }
  return map;
}
