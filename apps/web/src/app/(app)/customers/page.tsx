'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { confirmDelete } from '@/lib/confirm';
import { ContentSection, DetailGrid, DetailItem, EmptyState, FormSection, PageHeader } from '@/components/PageHeader';
import {
  ViewBlock,
  ViewChip,
  ViewIdentity,
  ViewSheetBody,
  ViewTagRow,
} from '@/components/ViewSheet';
import { CountryCombobox } from '@/components/CountryCombobox';
import { OptionChips } from '@/components/OptionChips';
import { EntityIdBadge, EntityIdDetail } from '@/components/EntityId';
import {
  COMPANY_TYPES,
  CUSTOMER_STATUSES,
  LABELS,
  PARTNERSHIP_STAGES,
  RELATIONSHIP_LEVELS,
} from '@/lib/enums';
import type { Customer, Paginated } from '@/lib/types';

type StatusFilter = 'ALL' | (typeof CUSTOMER_STATUSES)[number];
type SortKey = 'name' | 'company' | 'city' | 'status' | 'relationship' | 'approval';
type SortDir = 'asc' | 'desc';

const emptyForm = {
  name: '',
  title: '',
  companyName: '',
  companyType: 'RESTAURANT',
  email: '',
  phone: '',
  address: '',
  additionalAddress: '',
  postalCode: '',
  city: '',
  province: '',
  country: '',
  partnershipStage: '',
  status: '',
  customerNeeds: '',
  desiredStandards: '',
  promiseAnnualBonus: false,
  promiseOnTimeDelivery: false,
  promisePackagingBox: false,
  relationshipLevel: '',
  approvalPercentage: 0,
  remarks: '',
};

function statusLabel(status?: string | null) {
  if (!status) return null;
  return (
    LABELS.customerStatus[status as keyof typeof LABELS.customerStatus] ??
    status
  );
}

function relationshipLabel(level?: string | null) {
  if (!level) return null;
  return (
    LABELS.relationshipLevel[
      level as keyof typeof LABELS.relationshipLevel
    ] ?? level
  );
}

function companyTypeLabel(type?: string | null) {
  if (!type) return '—';
  return (
    LABELS.companyType[type as keyof typeof LABELS.companyType] ?? type
  );
}

function IconView() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20h4.5L19 9.5 14.5 5 4 15.5V20Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M12.5 7.5 16.5 11.5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 8h14M10 8V6.5A1.5 1.5 0 0 1 11.5 5h1A1.5 1.5 0 0 1 14 6.5V8M9 8v10.5A1.5 1.5 0 0 0 10.5 20h3a1.5 1.5 0 0 0 1.5-1.5V8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function buildCustomerPayload(form: typeof emptyForm) {
  return {
    name: form.name,
    title: form.title,
    companyName: form.companyName,
    companyType: form.companyType,
    email: form.email || undefined,
    phone: form.phone || undefined,
    address: form.address || undefined,
    additionalAddress: form.additionalAddress || undefined,
    postalCode: form.postalCode || undefined,
    city: form.city || undefined,
    province: form.province || undefined,
    country: form.country || undefined,
    partnershipStage: form.partnershipStage || undefined,
    status: form.status || undefined,
    customerNeeds: form.customerNeeds || undefined,
    desiredStandards: form.desiredStandards || undefined,
    promiseAnnualBonus: form.promiseAnnualBonus,
    promiseOnTimeDelivery: form.promiseOnTimeDelivery,
    promisePackagingBox: form.promisePackagingBox,
    relationshipLevel: form.relationshipLevel || undefined,
    approvalPercentage: form.approvalPercentage,
    remarks: form.remarks || undefined,
  };
}

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [postalLookupStatus, setPostalLookupStatus] = useState<
    'idle' | 'loading' | 'filled' | 'miss'
  >('idle');
  const lastAutoAddress = useRef({ address: '', city: '', province: '' });
  const [viewing, setViewing] = useState<Customer | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const directory = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items;
    if (q) {
      list = list.filter((c) => {
        const hay = [
          c.name,
          c.companyName,
          c.email,
          c.phone,
          c.city,
          c.province,
          c.country,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }
    if (statusFilter !== 'ALL') {
      list = list.filter((c) => c.status === statusFilter);
    }
    return [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name':
          cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
          break;
        case 'company':
          cmp = a.companyName.localeCompare(b.companyName, undefined, {
            sensitivity: 'base',
          });
          break;
        case 'city':
          cmp = (a.city || '').localeCompare(b.city || '', undefined, {
            sensitivity: 'base',
          });
          break;
        case 'status':
          cmp = (statusLabel(a.status) || '').localeCompare(
            statusLabel(b.status) || '',
            undefined,
            { sensitivity: 'base' },
          );
          break;
        case 'relationship':
          cmp = (relationshipLabel(a.relationshipLevel) || '').localeCompare(
            relationshipLabel(b.relationshipLevel) || '',
            undefined,
            { sensitivity: 'base' },
          );
          break;
        case 'approval':
          cmp = a.approvalPercentage - b.approvalPercentage;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [items, search, statusFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir(
      key === 'name' || key === 'company' || key === 'city' ? 'asc' : 'desc',
    );
  }

  function sortMark(key: SortKey) {
    if (sortKey !== key) return undefined;
    return sortDir;
  }

  async function load() {
    try {
      const data = await api<Paginated<Customer>>('/customers', {
        searchParams: { limit: 50 },
      });
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!formOpen) {
      setPostalLookupStatus('idle');
      return;
    }
    const country = form.country.trim();
    const postalCode = form.postalCode.trim();
    if (!country || postalCode.length < 3) {
      setPostalLookupStatus('idle');
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        setPostalLookupStatus('loading');
        try {
          const result = await api<{
            found: boolean;
            address: string;
            city: string;
            province: string;
          }>('/geo/postal-lookup', {
            searchParams: { country, postalCode },
          });
          if (!result.found) {
            setPostalLookupStatus('miss');
            return;
          }

          setForm((prev) => {
            const next = { ...prev };
            const apply = (
              key: 'address' | 'city' | 'province',
              value: string,
            ) => {
              if (!value) return;
              const current = prev[key].trim();
              const wasAuto = current === lastAutoAddress.current[key];
              if (!current || wasAuto) {
                next[key] = value;
              }
            };
            apply('address', result.address);
            apply('city', result.city);
            apply('province', result.province);
            lastAutoAddress.current = {
              address: next.address,
              city: next.city,
              province: next.province,
            };
            return next;
          });
          setPostalLookupStatus('filled');
        } catch (err) {
          console.error('Postal lookup failed', err);
          setPostalLookupStatus('miss');
        }
      })();
    }, 450);

    return () => window.clearTimeout(timer);
  }, [formOpen, form.country, form.postalCode]);

  function startEdit(c: Customer) {
    setViewing(null);
    setFormOpen(true);
    setEditingId(c.id);
    lastAutoAddress.current = { address: '', city: '', province: '' };
    setPostalLookupStatus('idle');
    setForm({
      name: c.name,
      title: c.title,
      companyName: c.companyName,
      companyType: c.companyType,
      email: c.email ?? '',
      phone: c.phone ?? '',
      address: c.address ?? '',
      additionalAddress: c.additionalAddress ?? '',
      postalCode: c.postalCode ?? '',
      city: c.city ?? '',
      province: c.province ?? '',
      country: c.country ?? '',
      partnershipStage: c.partnershipStage ?? '',
      status: c.status ?? '',
      customerNeeds: c.customerNeeds ?? '',
      desiredStandards: c.desiredStandards ?? '',
      promiseAnnualBonus: c.promiseAnnualBonus,
      promiseOnTimeDelivery: c.promiseOnTimeDelivery,
      promisePackagingBox: c.promisePackagingBox,
      relationshipLevel: c.relationshipLevel ?? '',
      approvalPercentage: c.approvalPercentage,
      remarks: c.remarks ?? '',
    });
  }

  function startCreate() {
    setViewing(null);
    setEditingId(null);
    lastAutoAddress.current = { address: '', city: '', province: '' };
    setPostalLookupStatus('idle');
    setForm(emptyForm);
    setFormOpen(true);
  }

  function startView(c: Customer) {
    setFormOpen(false);
    setEditingId(null);
    setViewing(c);
  }

  function resetForm() {
    setFormOpen(false);
    setEditingId(null);
    setViewing(null);
    lastAutoAddress.current = { address: '', city: '', province: '' };
    setPostalLookupStatus('idle');
    setForm(emptyForm);
  }

  function closeView() {
    setViewing(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = buildCustomerPayload(form);
      if (editingId) {
        await api(`/customers/${editingId}`, { method: 'PATCH', body });
      } else {
        await api('/customers', { method: 'POST', body });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string, name?: string) {
    if (!(await confirmDelete('customer', name))) return;
    try {
      await api(`/customers/${id}`, { method: 'DELETE' });
      if (viewing?.id === id) setViewing(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed');
    }
  }

  return (
    <section>
      <PageHeader
        title="Customers"
        description="Required: name, title, company name, company type. Other CRM fields are optional."
        actions={
          !formOpen && !viewing ? (
            <button type="button" className="umkm-btn" onClick={startCreate}>
              Add customer
            </button>
          ) : null
        }
      />
      {error ? <div className="umkm-error">{error}</div> : null}

      {viewing ? (
        <ContentSection
          className="umkm-form-panel umkm-view-sheet"
          eyebrow="Customer"
          title={viewing.name}
          description={
            viewing.title
              ? `${viewing.title} · ${viewing.companyName}`
              : viewing.companyName
          }
          actions={
            <>
              <button
                type="button"
                className="umkm-btn"
                onClick={() => startEdit(viewing)}
              >
                Edit
              </button>
              <button
                type="button"
                className="umkm-btn danger"
                onClick={() => void onDelete(viewing.id, viewing.name)}
              >
                Delete
              </button>
              <button
                type="button"
                className="umkm-btn secondary"
                onClick={closeView}
              >
                Close
              </button>
            </>
          }
        >
          <ViewSheetBody onClose={closeView}>
            <ViewIdentity
              contextLabel="Status"
              chips={
                <>
                  {viewing.status ? (
                    <ViewChip tone="accent">
                      {statusLabel(viewing.status)}
                    </ViewChip>
                  ) : null}
                  <ViewChip>
                    {companyTypeLabel(viewing.companyType)}
                  </ViewChip>
                  {relationshipLabel(viewing.relationshipLevel) ? (
                    <ViewChip>
                      {relationshipLabel(viewing.relationshipLevel)}
                    </ViewChip>
                  ) : null}
                </>
              }
              metricLabel="Approval"
              metricValue={`${viewing.approvalPercentage}%`}
              metricHint={
                viewing.partnershipStage
                  ? (LABELS.partnershipStage[
                      viewing.partnershipStage as keyof typeof LABELS.partnershipStage
                    ] ?? viewing.partnershipStage)
                  : 'Pipeline readiness'
              }
            />

            <EntityIdDetail id={viewing.sku || viewing.id} label="Customer ID" />

            <ViewBlock
              title="Contact"
              description="How to reach this person and their company."
            >
              <DetailGrid>
                <DetailItem label="Email">
                  {viewing.email || '—'}
                </DetailItem>
                <DetailItem label="Phone">
                  {viewing.phone || '—'}
                </DetailItem>
                <DetailItem label="Company" wide>
                  {viewing.companyName}
                </DetailItem>
                <DetailItem label="Title">
                  {viewing.title || '—'}
                </DetailItem>
              </DetailGrid>
            </ViewBlock>

            <ViewBlock
              title="Address"
              description="Delivery and location details."
            >
              <DetailGrid>
                <DetailItem label="Address" wide>
                  {viewing.address || '—'}
                </DetailItem>
                <DetailItem label="Additional" wide>
                  {viewing.additionalAddress || '—'}
                </DetailItem>
                <DetailItem label="Postal code">
                  {viewing.postalCode || '—'}
                </DetailItem>
                <DetailItem label="City">{viewing.city || '—'}</DetailItem>
                <DetailItem label="Province">
                  {viewing.province || '—'}
                </DetailItem>
                <DetailItem label="Country">
                  {viewing.country || '—'}
                </DetailItem>
              </DetailGrid>
            </ViewBlock>

            <ViewBlock
              title="Pipeline"
              description="Needs, standards, and commercial promises."
            >
              <DetailGrid>
                <DetailItem label="Needs" wide>
                  {viewing.customerNeeds || '—'}
                </DetailItem>
                <DetailItem label="Standards" wide>
                  {viewing.desiredStandards || '—'}
                </DetailItem>
                <DetailItem label="Promises" wide>
                  <ViewTagRow
                    tags={[
                      viewing.promiseAnnualBonus ? 'Annual bonus' : '',
                      viewing.promiseOnTimeDelivery ? 'On-time delivery' : '',
                      viewing.promisePackagingBox ? 'Packaging box' : '',
                    ].filter(Boolean)}
                  />
                </DetailItem>
                <DetailItem label="Remarks" wide>
                  {viewing.remarks || '—'}
                </DetailItem>
              </DetailGrid>
            </ViewBlock>
          </ViewSheetBody>
        </ContentSection>
      ) : null}

      {formOpen ? (
        <ContentSection
          className="umkm-form-panel"
          eyebrow="Customer"
          title={editingId ? 'Modify customer' : 'Create customer'}
          description="Required: name, title, company name, and company type."
        >
          <form onSubmit={onSubmit}>
            <FormSection
              title="Identity"
              description="Required contact and company details."
            >
              <div className="umkm-grid two">
                <div className="umkm-field">
                  <label>Customer name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="umkm-field">
                  <label>Title *</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>
                <div className="umkm-field">
                  <label>Company name *</label>
                  <input
                    value={form.companyName}
                    onChange={(e) =>
                      setForm({ ...form, companyName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="umkm-field">
                  <label>Company type *</label>
                  <OptionChips
                    aria-label="Company type"
                    value={
                      form.companyType as (typeof COMPANY_TYPES)[number]
                    }
                    onChange={(companyType) =>
                      setForm({ ...form, companyType })
                    }
                    options={COMPANY_TYPES.map((t) => ({
                      value: t,
                      label: LABELS.companyType[t],
                    }))}
                  />
                </div>
                <div className="umkm-field">
                  <label>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="umkm-field">
                  <label>Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
            </FormSection>

            <FormSection
              title="Address"
              description="Enter postal code and country first — address, city, and province fill in automatically when found."
            >
              <div className="umkm-grid two">
                <div className="umkm-field">
                  <label>Postal code</label>
                  <input
                    value={form.postalCode}
                    onChange={(e) =>
                      setForm({ ...form, postalCode: e.target.value })
                    }
                    autoComplete="postal-code"
                  />
                </div>
                <div className="umkm-field">
                  <label htmlFor="customer-country">Country</label>
                  <CountryCombobox
                    id="customer-country"
                    value={form.country}
                    onChange={(country) => setForm({ ...form, country })}
                  />
                </div>
                <div className="umkm-field umkm-field-span-2">
                  {postalLookupStatus === 'loading' ? (
                    <p className="umkm-sub" role="status">
                      Looking up location from postal code…
                    </p>
                  ) : null}
                  {postalLookupStatus === 'filled' ? (
                    <p className="umkm-sub" role="status">
                      Address fields updated from postal code. You can edit them
                      anytime.
                    </p>
                  ) : null}
                  {postalLookupStatus === 'miss' ? (
                    <p className="umkm-sub" role="status">
                      No match for that postal code yet — fill address fields
                      manually.
                    </p>
                  ) : null}
                </div>
                <div className="umkm-field">
                  <label>Address</label>
                  <input
                    value={form.address}
                    onChange={(e) => {
                      lastAutoAddress.current.address = '';
                      setForm({ ...form, address: e.target.value });
                    }}
                    autoComplete="address-line1"
                  />
                </div>
                <div className="umkm-field">
                  <label>Additional address</label>
                  <input
                    value={form.additionalAddress}
                    onChange={(e) =>
                      setForm({ ...form, additionalAddress: e.target.value })
                    }
                    autoComplete="address-line2"
                  />
                </div>
                <div className="umkm-field">
                  <label>City</label>
                  <input
                    value={form.city}
                    onChange={(e) => {
                      lastAutoAddress.current.city = '';
                      setForm({ ...form, city: e.target.value });
                    }}
                    autoComplete="address-level2"
                  />
                </div>
                <div className="umkm-field">
                  <label>Province</label>
                  <input
                    value={form.province}
                    onChange={(e) => {
                      lastAutoAddress.current.province = '';
                      setForm({ ...form, province: e.target.value });
                    }}
                    autoComplete="address-level1"
                  />
                </div>
              </div>
            </FormSection>

            <FormSection
              title="Pipeline"
              description="Optional CRM stage, status, and relationship signals."
            >
              <div className="umkm-grid two">
                <div className="umkm-field">
                  <label>Partnership stage</label>
                  <OptionChips
                    aria-label="Partnership stage"
                    allowEmpty
                    emptyLabel="None"
                    value={
                      (form.partnershipStage ||
                        '') as (typeof PARTNERSHIP_STAGES)[number] | ''
                    }
                    onChange={(partnershipStage) =>
                      setForm({ ...form, partnershipStage })
                    }
                    options={PARTNERSHIP_STAGES.map((t) => ({
                      value: t,
                      label: LABELS.partnershipStage[t],
                    }))}
                  />
                </div>
                <div className="umkm-field">
                  <label>Status</label>
                  <OptionChips
                    aria-label="Customer status"
                    allowEmpty
                    emptyLabel="None"
                    value={
                      (form.status ||
                        '') as (typeof CUSTOMER_STATUSES)[number] | ''
                    }
                    onChange={(status) => setForm({ ...form, status })}
                    options={CUSTOMER_STATUSES.map((t) => ({
                      value: t,
                      label: LABELS.customerStatus[t],
                    }))}
                  />
                </div>
                <div className="umkm-field">
                  <label>Relationship level</label>
                  <OptionChips
                    aria-label="Relationship level"
                    allowEmpty
                    emptyLabel="None"
                    value={
                      (form.relationshipLevel ||
                        '') as (typeof RELATIONSHIP_LEVELS)[number] | ''
                    }
                    onChange={(relationshipLevel) =>
                      setForm({ ...form, relationshipLevel })
                    }
                    options={RELATIONSHIP_LEVELS.map((t) => ({
                      value: t,
                      label: LABELS.relationshipLevel[t],
                    }))}
                  />
                </div>
                <div className="umkm-field">
                  <label>Approval %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.approvalPercentage}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        approvalPercentage: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="umkm-field">
                <label>Customer needs</label>
                <textarea
                  value={form.customerNeeds}
                  onChange={(e) =>
                    setForm({ ...form, customerNeeds: e.target.value })
                  }
                />
              </div>
              <div className="umkm-field">
                <label>Desired standards</label>
                <textarea
                  value={form.desiredStandards}
                  onChange={(e) =>
                    setForm({ ...form, desiredStandards: e.target.value })
                  }
                />
              </div>
              <div className="umkm-field">
                <label>Customer promise</label>
                <label className="umkm-check">
                  <input
                    type="checkbox"
                    checked={form.promiseAnnualBonus}
                    onChange={(e) =>
                      setForm({ ...form, promiseAnnualBonus: e.target.checked })
                    }
                  />
                  Potential annual bonus
                </label>
                <label className="umkm-check">
                  <input
                    type="checkbox"
                    checked={form.promiseOnTimeDelivery}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        promiseOnTimeDelivery: e.target.checked,
                      })
                    }
                  />
                  On-time delivery
                </label>
                <label className="umkm-check">
                  <input
                    type="checkbox"
                    checked={form.promisePackagingBox}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        promisePackagingBox: e.target.checked,
                      })
                    }
                  />
                  Wrapped in packaging box
                </label>
              </div>
              <div className="umkm-field">
                <label>Remarks</label>
                <textarea
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                />
              </div>
            </FormSection>

            <div className="umkm-actions">
              <button className="umkm-btn" type="submit" disabled={loading}>
                {editingId ? 'Update customer' : 'Add customer'}
              </button>
              <button
                className="umkm-btn secondary"
                type="button"
                onClick={resetForm}
              >
                Cancel
              </button>
            </div>
          </form>
        </ContentSection>
      ) : null}

      {!formOpen && !viewing ? (
      <ContentSection
        eyebrow="Directory"
        title="Customers"
        description="Search and sort contacts by company, status, and pipeline stage."
      >
        <div className="umkm-catalog-toolbar">
          <div className="umkm-field umkm-catalog-search">
            <label htmlFor="customer-search">Search</label>
            <input
              id="customer-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, company, city, email…"
              autoComplete="off"
            />
          </div>
          <div
            className="umkm-catalog-filters"
            role="group"
            aria-label="Filter by status"
          >
            <button
              type="button"
              className={`umkm-filter-chip${statusFilter === 'ALL' ? ' is-active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
              aria-pressed={statusFilter === 'ALL'}
            >
              All
            </button>
            {CUSTOMER_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                className={`umkm-filter-chip${statusFilter === status ? ' is-active' : ''}`}
                onClick={() => setStatusFilter(status)}
                aria-pressed={statusFilter === status}
              >
                {statusLabel(status)}
              </button>
            ))}
          </div>
          <p className="umkm-catalog-count">
            {directory.length} customer{directory.length === 1 ? '' : 's'}
            {statusFilter !== 'ALL' ? ` · ${statusLabel(statusFilter)}` : ''}
          </p>
        </div>

        {items.length === 0 ? (
          <EmptyState
            title="No customers yet"
            description="Add a customer to start tracking partnerships and pipeline status."
          />
        ) : directory.length === 0 ? (
          <EmptyState
            title="No matches"
            description="Try another search or clear the status filter."
          />
        ) : (
          <>
            <div className="umkm-table-wrap umkm-catalog-table-wrap">
              <table className="umkm-table umkm-catalog-table">
                <thead>
                  <tr>
                    <th>
                      <button
                        type="button"
                        className="umkm-th-sort"
                        onClick={() => toggleSort('name')}
                        data-dir={sortMark('name')}
                      >
                        Customer
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        className="umkm-th-sort"
                        onClick={() => toggleSort('company')}
                        data-dir={sortMark('company')}
                      >
                        Company
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        className="umkm-th-sort"
                        onClick={() => toggleSort('city')}
                        data-dir={sortMark('city')}
                      >
                        Location
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        className="umkm-th-sort"
                        onClick={() => toggleSort('status')}
                        data-dir={sortMark('status')}
                      >
                        Status
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        className="umkm-th-sort"
                        onClick={() => toggleSort('relationship')}
                        data-dir={sortMark('relationship')}
                      >
                        Relationship
                      </button>
                    </th>
                    <th className="is-num">
                      <button
                        type="button"
                        className="umkm-th-sort"
                        onClick={() => toggleSort('approval')}
                        data-dir={sortMark('approval')}
                      >
                        Approval
                      </button>
                    </th>
                    <th className="is-actions">
                      <span className="umkm-th-label">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {directory.map((c) => {
                    const contact =
                      [c.email, c.phone].filter(Boolean).join(' · ') ||
                      'No contact yet';
                    const locationSub = [c.province, c.country]
                      .filter(Boolean)
                      .join(', ');
                    return (
                      <tr
                        key={c.id}
                        className="umkm-catalog-row"
                        tabIndex={0}
                        onClick={() => startView(c)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            startView(c);
                          }
                        }}
                      >
                        <td>
                          <div className="umkm-product-cell">
                            <span className="umkm-product-name">{c.name}</span>
                            <div className="umkm-product-meta">
                              <EntityIdBadge
                                id={c.sku || c.id}
                                literal={Boolean(c.sku)}
                                compact
                              />
                              {c.title ? (
                                <span className="umkm-badge sm">{c.title}</span>
                              ) : null}
                              <span className="umkm-num-sub">{contact}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="umkm-num-stack" style={{ alignItems: 'flex-start' }}>
                            <span className="umkm-product-name" style={{ fontSize: '0.95rem' }}>
                              {c.companyName}
                            </span>
                            <span className="umkm-num-sub">
                              {companyTypeLabel(c.companyType)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="umkm-num-stack" style={{ alignItems: 'flex-start' }}>
                            <span>{c.city || '—'}</span>
                            {locationSub ? (
                              <span className="umkm-num-sub">{locationSub}</span>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          {c.status ? (
                            <span className="umkm-badge">
                              {statusLabel(c.status)}
                            </span>
                          ) : (
                            <span className="umkm-num is-empty">—</span>
                          )}
                        </td>
                        <td>
                          {relationshipLabel(c.relationshipLevel) ?? (
                            <span className="umkm-num is-empty">—</span>
                          )}
                        </td>
                        <td className="is-num">
                          <span className="umkm-num">{c.approvalPercentage}%</span>
                        </td>
                        <td className="is-actions">
                          <div
                            className="umkm-row-actions umkm-icon-actions"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          >
                            <button
                              className="umkm-icon-btn"
                              type="button"
                              title="View"
                              aria-label={`View ${c.name}`}
                              onClick={() => startView(c)}
                            >
                              <IconView />
                            </button>
                            <button
                              className="umkm-icon-btn"
                              type="button"
                              title="Edit"
                              aria-label={`Edit ${c.name}`}
                              onClick={() => startEdit(c)}
                            >
                              <IconEdit />
                            </button>
                            <button
                              className="umkm-icon-btn danger"
                              type="button"
                              title="Delete"
                              aria-label={`Delete ${c.name}`}
                              onClick={() => void onDelete(c.id, c.name)}
                            >
                              <IconTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="umkm-catalog-cards">
              {directory.map((c) => {
                return (
                  <li key={c.id} className="umkm-catalog-card">
                    <button
                      type="button"
                      className="umkm-catalog-card-main"
                      onClick={() => startView(c)}
                    >
                      <div className="umkm-catalog-card-identity">
                        <span className="umkm-product-name">{c.name}</span>
                        <div className="umkm-product-meta">
                          <EntityIdBadge
                            id={c.sku || c.id}
                            literal={Boolean(c.sku)}
                            compact
                          />
                          {c.status ? (
                            <span className="umkm-badge sm">
                              {statusLabel(c.status)}
                            </span>
                          ) : null}
                        </div>
                        <div className="umkm-catalog-card-details">
                          <span className="umkm-catalog-card-company">
                            {[c.companyName, c.city].filter(Boolean).join(' · ') ||
                              'No company'}
                          </span>
                          {c.email ? <span>{c.email}</span> : null}
                          {c.phone ? <span>{c.phone}</span> : null}
                          {!c.email && !c.phone ? (
                            <span>No contact details yet</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="umkm-catalog-card-metrics umkm-catalog-card-metrics--pair">
                        <div>
                          <span>Relationship</span>
                          <strong>
                            {relationshipLabel(c.relationshipLevel) ?? '—'}
                          </strong>
                        </div>
                        <div>
                          <span>Approval</span>
                          <strong>{c.approvalPercentage}%</strong>
                        </div>
                      </div>
                    </button>
                    <div className="umkm-row-actions umkm-icon-actions">
                      <button
                        className="umkm-icon-btn"
                        type="button"
                        title="View"
                        aria-label={`View ${c.name}`}
                        onClick={() => startView(c)}
                      >
                        <IconView />
                      </button>
                      <button
                        className="umkm-icon-btn"
                        type="button"
                        title="Edit"
                        aria-label={`Edit ${c.name}`}
                        onClick={() => startEdit(c)}
                      >
                        <IconEdit />
                      </button>
                      <button
                        className="umkm-icon-btn danger"
                        type="button"
                        title="Delete"
                        aria-label={`Delete ${c.name}`}
                        onClick={() => void onDelete(c.id, c.name)}
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </ContentSection>
      ) : null}
    </section>
  );
}
