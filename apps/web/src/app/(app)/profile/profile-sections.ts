export type ProfileSectionId =
  | 'overview'
  | 'personal'
  | 'invoicing'
  | 'security'
  | 'data'
  | 'danger';

export type ProfileNavIcon =
  | 'overview'
  | 'personal'
  | 'invoicing'
  | 'security'
  | 'data'
  | 'danger';

export type ProfileNavItem = {
  id: ProfileSectionId;
  label: string;
  hint: string;
  icon: ProfileNavIcon;
};

export const PROFILE_NAV: ProfileNavItem[] = [
  { id: 'overview', label: 'Overview', hint: 'Identity & workspace', icon: 'overview' },
  { id: 'personal', label: 'Personal', hint: 'Contact & location', icon: 'personal' },
  { id: 'invoicing', label: 'Invoicing', hint: 'Tax & PDF profile', icon: 'invoicing' },
  { id: 'security', label: 'Security', hint: 'Password & login', icon: 'security' },
  { id: 'data', label: 'Data', hint: 'Export & import', icon: 'data' },
  { id: 'danger', label: 'Danger', hint: 'Delete account', icon: 'danger' },
];

export function profileNavItems(showData: boolean): ProfileNavItem[] {
  return PROFILE_NAV.filter((item) => item.id !== 'data' || showData);
}

export function profileSectionDomId(id: ProfileSectionId): string {
  return `profile-${id}`;
}
