'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { dedupeById } from '@/lib/dedupe-by-id';
import { confirmDelete } from '@/lib/confirm';
import { ContentSection, DetailGrid, DetailItem, EmptyState, FieldLabel, FormSection, PageHeader } from '@/components/PageHeader';
import {
  ViewBlock,
  ViewChip,
  ViewIdentity,
  ViewSheetBody,
  ViewTagRow,
} from '@/components/ViewSheet';
import { CountryCombobox } from '@/components/CountryCombobox';
import { OptionSelect } from '@/components/OptionSelect';
import { MultiSelectFilter } from '@/components/MultiSelectFilter';
import { CollapsibleFilters } from '@/components/CollapsibleFilters';
import {
  FeatureDataTransfer,
  FeatureDataTransferToggle,
} from '@/components/FeatureDataTransfer';
import { CustomerStatisticsSection } from '@/app/(app)/customers/CustomerStatisticsSection';
import {
  CustomerOrderTotalsPerformanceView,
  CustomerOrderTotalsSection,
} from '@/app/(app)/customers/CustomerOrderTotalsSection';
import { ListPager } from '@/components/ListPager';
import type { ListPageSize } from '@/lib/list-page-size';
import { FeatureStage } from '@/components/FeatureStage';
import { EntityIdBadge, EntityIdDetail } from '@/components/EntityId';
import {
  COMPANY_TYPES,
  CUSTOMER_STATUSES,
  PARTNERSHIP_STAGES,
  RELATIONSHIP_LEVELS,
} from '@/lib/enums';
import type {
  Customer,
  CustomerOrderTotals,
  CustomerSummary,
  Paginated,
} from '@/lib/types';
import { formatRatePercent } from '@/lib/format-money';
import { useCustomerLabelHelpers } from '@/hooks/useCustomerLabelHelpers';
import {
  numberDraftToNumber,
  numberInputValue,
  parseNumberDraft,
  type NumberDraft,
} from '@/lib/number-draft';

type SortKey = 'name' | 'company' | 'city' | 'status' | 'relationship' | 'approval';
type SortDir = 'asc' | 'desc';

const emptyForm = {
  name: '',
  title: '',
  companyName: '',
  companyType: 'RESTAURANT',
  npwp: '',
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
  approvalPercentage: '' as NumberDraft,
  remarks: '',
};

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
    npwp: form.npwp.trim() || undefined,
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
    approvalPercentage: numberDraftToNumber(form.approvalPercentage, 0),
    remarks: form.remarks || undefined,
  };
}

export default function CustomersPage() {
  const {
    statusLabel,
    relationshipLabel,
    companyTypeLabel,
    partnershipStageLabel,
    labels,
  } = useCustomerLabelHelpers();
  const [items, setItems] = useState<Customer[]>([]);
  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [dataSyncOpen, setDataSyncOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [postalLookupStatus, setPostalLookupStatus] = useState<
    'idle' | 'loading' | 'filled' | 'miss'
  >('idle');
  const lastAutoAddress = useRef({ address: '', city: '', province: '' });
  const [viewing, setViewing] = useState<Customer | null>(null);
  const [performanceViewing, setPerformanceViewing] =
    useState<CustomerOrderTotals | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<ListPageSize>(20);
  const [listMeta, setListMeta] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [companyTypeFilters, setCompanyTypeFilters] = useState<string[]>([]);
  const [relationshipLevelFilters, setRelationshipLevelFilters] = useState<
    string[]
  >([]);
  const [partnershipStageFilters, setPartnershipStageFilters] = useState<
    string[]
  >([]);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const loadSeq = useRef(0);

  const directory = useMemo(() => {
    // List is already filter-scoped by the API; only sort locally.
    return [...items].sort((a, b) => {
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
          cmp = statusLabel(a.status).localeCompare(statusLabel(b.status), undefined, {
            sensitivity: 'base',
          });
          break;
        case 'relationship':
          cmp = relationshipLabel(a.relationshipLevel).localeCompare(
            relationshipLabel(b.relationshipLevel),
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
  }, [items, sortKey, sortDir, statusLabel, relationshipLabel]);

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

  function customerFilterParams(searchTerm = debouncedSearch) {
    return {
      search: searchTerm.trim() || undefined,
      status: statusFilters.length > 0 ? statusFilters : undefined,
      companyType:
        companyTypeFilters.length > 0 ? companyTypeFilters : undefined,
      relationshipLevel:
        relationshipLevelFilters.length > 0
          ? relationshipLevelFilters
          : undefined,
      partnershipStage:
        partnershipStageFilters.length > 0
          ? partnershipStageFilters
          : undefined,
    };
  }

  async function loadSummary(searchTerm = debouncedSearch) {
    const filterParams = customerFilterParams(searchTerm);
    try {
      const customerSummary = await api<CustomerSummary>('/customers/summary', {
        searchParams: filterParams,
      });
      setSummary(customerSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    }
  }

  async function loadList(searchTerm = debouncedSearch, nextPage = page) {
    const seq = ++loadSeq.current;
    setListLoading(true);
    const filterParams = customerFilterParams(searchTerm);
    try {
      const data = await api<Paginated<Customer>>('/customers', {
        searchParams: {
          ...filterParams,
          page: nextPage,
          limit: pageSize,
        },
      });
      if (seq !== loadSeq.current) return;
      setItems(dedupeById(data.items));
      setListMeta(data.meta);
      setPage(data.meta.page);
      setError('');
    } catch (err) {
      if (seq !== loadSeq.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      if (seq === loadSeq.current) setListLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void loadSummary(debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedSearch,
    statusFilters,
    companyTypeFilters,
    relationshipLevelFilters,
    partnershipStageFilters,
  ]);

  useEffect(() => {
    void loadList(debouncedSearch, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page,
    pageSize,
    debouncedSearch,
    statusFilters,
    companyTypeFilters,
    relationshipLevelFilters,
    partnershipStageFilters,
  ]);

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

  function populateEditForm(c: Customer) {
    setViewing(null);
    setPerformanceViewing(null);
    setFormOpen(true);
    setEditingId(c.id);
    lastAutoAddress.current = { address: '', city: '', province: '' };
    setPostalLookupStatus('idle');
    setForm({
      name: c.name,
      title: c.title,
      companyName: c.companyName,
      companyType: c.companyType,
      npwp: c.npwp ?? '',
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
      approvalPercentage:
        c.approvalPercentage === 0 ? '' : c.approvalPercentage,
      remarks: c.remarks ?? '',
    });
  }

  async function startEdit(c: Customer) {
    try {
      const full = await api<Customer>(`/customers/${c.id}`);
      populateEditForm(full);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer');
    }
  }

  function startCreate() {
    setViewing(null);
    setPerformanceViewing(null);
    setEditingId(null);
    lastAutoAddress.current = { address: '', city: '', province: '' };
    setPostalLookupStatus('idle');
    setForm(emptyForm);
    setFormOpen(true);
  }

  async function startView(c: Customer) {
    setFormOpen(false);
    setEditingId(null);
    setPerformanceViewing(null);
    try {
      const full = await api<Customer>(`/customers/${c.id}`);
      setViewing(full);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer');
    }
  }

  function resetForm() {
    setFormOpen(false);
    setEditingId(null);
    setViewing(null);
    setPerformanceViewing(null);
    lastAutoAddress.current = { address: '', city: '', province: '' };
    setPostalLookupStatus('idle');
    setForm(emptyForm);
  }

  function closeView() {
    setViewing(null);
  }

  function openPerformanceView(row: CustomerOrderTotals) {
    setFormOpen(false);
    setEditingId(null);
    setViewing(null);
    setPerformanceViewing(row);
  }

  function closePerformanceView() {
    setPerformanceViewing(null);
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
      await Promise.all([
        loadSummary(debouncedSearch),
        loadList(debouncedSearch, page),
      ]);
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
      if (performanceViewing?.id === id) setPerformanceViewing(null);
      await Promise.all([
        loadSummary(debouncedSearch),
        loadList(debouncedSearch, page),
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed');
    }
  }

  const chipFiltersActive =
    statusFilters.length > 0 ||
    companyTypeFilters.length > 0 ||
    relationshipLevelFilters.length > 0 ||
    partnershipStageFilters.length > 0;
  const filtersActive =
    debouncedSearch.trim().length > 0 || chipFiltersActive;
  const stageSummary = summary;
  const statisticsLoading = listLoading && !stageSummary?.statistics;
  const statLabelForKey = useMemo(
    () => ({
      companyType: (key: string) =>
        key === 'UNSET' ? 'Not set' : companyTypeLabel(key),
      partnershipStage: (key: string) =>
        key === 'UNSET' ? 'Not set' : partnershipStageLabel(key),
      status: (key: string) =>
        key === 'UNSET' ? 'Not set' : statusLabel(key),
      relationshipLevel: (key: string) =>
        key === 'UNSET' ? 'Not set' : relationshipLabel(key),
      geo: (key: string) => {
        if (key === 'EMPTY') return 'Not set';
        if (key === 'OTHER') return 'Other';
        return key;
      },
    }),
    [companyTypeLabel, partnershipStageLabel, statusLabel, relationshipLabel],
  );

  const focusMode =
    formOpen || Boolean(viewing) || Boolean(performanceViewing);

  return (
    <section>
      {!focusMode ? (
        <>
        <FeatureStage
          title="Customers"
          loading={listLoading && !stageSummary}
          subtitle={
            stageSummary
              ? `${stageSummary.customerCount.toLocaleString('en-US')} contact${stageSummary.customerCount === 1 ? '' : 's'}${filtersActive ? ' in view' : ''} · Pipeline health and reachability`
              : 'Required: name, title, company name, company type.'
          }
          action={
            <>
              <FeatureDataTransferToggle
                open={dataSyncOpen}
                controlsId="feature-sync-customers"
                onClick={() => setDataSyncOpen((open) => !open)}
              />
              <button type="button" className="umkm-btn" onClick={startCreate}>
                Add customer
              </button>
            </>
          }
          stats={[
            {
              label: 'Customers',
              hero: true,
              tip: {
                description: 'Contacts in the current customer view.',
              },
              value: stageSummary
                ? stageSummary.customerCount.toLocaleString('en-US')
                : '···',
            },
            {
              label: 'Avg approval',
              tip: {
                description: 'Average approval score across these contacts.',
              },
              value: stageSummary
                ? formatRatePercent(stageSummary.avgApproval)
                : '···',
            },
            {
              label: 'Interested',
              tip: {
                description: 'How many contacts are marked Interested.',
              },
              value: stageSummary
                ? stageSummary.interestedCount.toLocaleString('en-US')
                : '···',
            },
          ]}
          ratesLabel="Customer rates"
          rates={[
            {
              tone: 'tone-paid',
              label: 'Interested',
              tip: {
                description: 'Share of contacts marked as Interested.',
                detail: 'Interested ÷ customers in view',
              },
              value: stageSummary?.interestedRate,
            },
            {
              tone: 'tone-margin',
              label: 'Closing',
              tip: {
                description:
                  'Share of contacts at Closing / first-order stage.',
                detail: 'Closing ÷ customers in view',
              },
              value: stageSummary?.closingRate,
            },
            {
              tone: 'tone-discount',
              label: 'Promises',
              tip: {
                description:
                  'Share of contacts with at least one commercial promise on file.',
                detail: 'With promises ÷ customers in view',
              },
              value: stageSummary?.promiseRate,
            },
            {
              tone: 'tone-cancel',
              label: 'Contact',
              tip: {
                description:
                  'Share of contacts that have an email or phone number.',
                detail: 'Reachable ÷ customers in view',
              },
              value: stageSummary?.contactRate,
            },
          ]}
        />
        {dataSyncOpen ? (
          <FeatureDataTransfer
            entity="customers"
            label="Customers"
            onImported={() => {
              void loadSummary(debouncedSearch);
              void loadList(debouncedSearch, page);
            }}
          />
        ) : null}
        </>
      ) : (
        <PageHeader
          title="Customers"
          description="Manage buyer contacts and company details. Name, title, company name, and company type are required."
        />
      )}
      {error ? <div className="umkm-error">{error}</div> : null}

      {performanceViewing ? (
        <CustomerOrderTotalsPerformanceView
          row={performanceViewing}
          onClose={closePerformanceView}
        />
      ) : null}

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
          actionsPlacement="foot"
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
                  {viewing.relationshipLevel ? (
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
                  ? partnershipStageLabel(viewing.partnershipStage)
                  : 'Pipeline readiness'
              }
            />

            <EntityIdDetail id={viewing.customerId || viewing.id} label="Customer ID" />

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
                <DetailItem label="NPWP">
                  {viewing.npwp?.trim() ? viewing.npwp : '—'}
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
                <DetailItem label="Partnership stage">
                  {viewing.partnershipStage
                    ? partnershipStageLabel(viewing.partnershipStage)
                    : '—'}
                </DetailItem>
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
          description="Enter name, title, company name, and company type. Other CRM fields are optional."
      >
          <form onSubmit={onSubmit}>
            <FormSection
              title="Identity"
              description="Contact and company details needed to save this customer."
            >
              <div className="umkm-grid two">
                <div className="umkm-field">
                  <FieldLabel>Customer name *</FieldLabel>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="umkm-field">
                  <FieldLabel>Title *</FieldLabel>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>
                <div className="umkm-field">
                  <FieldLabel>Company name *</FieldLabel>
                  <input
                    value={form.companyName}
                    onChange={(e) =>
                      setForm({ ...form, companyName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="umkm-field">
                  <FieldLabel>Company type *</FieldLabel>
                  <OptionSelect
                    aria-label="Company type"
                    value={
                      form.companyType as (typeof COMPANY_TYPES)[number]
                    }
                    onChange={(companyType) =>
                      setForm({ ...form, companyType })
                    }
                    options={COMPANY_TYPES.map((t) => ({
                      value: t,
                      label: labels.companyType[t],
                    }))}
                    required
                  />
                </div>
                <div className="umkm-field">
                  <FieldLabel>Email</FieldLabel>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="umkm-field">
                  <FieldLabel>Phone</FieldLabel>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="umkm-field">
                  <FieldLabel>NPWP (buyer)</FieldLabel>
                  <input
                    value={form.npwp}
                    onChange={(e) => setForm({ ...form, npwp: e.target.value })}
                    maxLength={20}
                    placeholder="Optional, for B2B invoices and e-Faktur"
                    inputMode="numeric"
                    autoComplete="off"
                  />
                  <p className="umkm-product-meta-line">
                    Used on PDF invoices and e-Faktur export when this customer
                    is billed.
                  </p>
                </div>
              </div>
            </FormSection>

            <FormSection
              title="Address"
              description="Enter postal code and country first. Address, city, and province fill in automatically when a match is found."
            >
              <div className="umkm-grid two">
                <div className="umkm-field">
                  <FieldLabel>Postal code</FieldLabel>
                  <input
                    value={form.postalCode}
                    onChange={(e) =>
                      setForm({ ...form, postalCode: e.target.value })
                    }
                    autoComplete="postal-code"
                  />
                </div>
                <div className="umkm-field">
                  <FieldLabel htmlFor="customer-country">Country</FieldLabel>
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
                      No match for that postal code yet. Fill address fields
                      manually.
                    </p>
                  ) : null}
                </div>
                <div className="umkm-field">
                  <FieldLabel>Address</FieldLabel>
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
                  <FieldLabel>Additional address</FieldLabel>
                  <input
                    value={form.additionalAddress}
                    onChange={(e) =>
                      setForm({ ...form, additionalAddress: e.target.value })
                    }
                    autoComplete="address-line2"
                  />
                </div>
                <div className="umkm-field">
                  <FieldLabel>City</FieldLabel>
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
                  <FieldLabel>Province</FieldLabel>
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
                  <FieldLabel>Partnership stage</FieldLabel>
                  <OptionSelect
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
                      label: labels.partnershipStage[t],
                    }))}
                  />
                </div>
                <div className="umkm-field">
                  <FieldLabel>Status</FieldLabel>
                  <OptionSelect
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
                      label: labels.customerStatus[t],
                    }))}
                  />
                </div>
                <div className="umkm-field">
                  <FieldLabel>Relationship level</FieldLabel>
                  <OptionSelect
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
                      label: labels.relationshipLevel[t],
                    }))}
                  />
                </div>
                <div className="umkm-field">
                  <FieldLabel>Approval %</FieldLabel>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={numberInputValue(form.approvalPercentage)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        approvalPercentage: parseNumberDraft(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="umkm-field">
                <FieldLabel>Customer needs</FieldLabel>
                <textarea
                  value={form.customerNeeds}
                  onChange={(e) =>
                    setForm({ ...form, customerNeeds: e.target.value })
                  }
                />
              </div>
              <div className="umkm-field">
                <FieldLabel>Desired standards</FieldLabel>
                <textarea
                  value={form.desiredStandards}
                  onChange={(e) =>
                    setForm({ ...form, desiredStandards: e.target.value })
                  }
                />
              </div>
              <div className="umkm-field">
                <FieldLabel>Customer promise</FieldLabel>
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
                <FieldLabel>Remarks</FieldLabel>
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

      {!focusMode ? (
      <>
      <ContentSection
        eyebrow="Directory"
        title="Customers"
        description="Search and sort contacts by company, status, and pipeline stage."
      >
        <div className="umkm-catalog-toolbar">
          <div className="umkm-field umkm-catalog-search">
            <FieldLabel htmlFor="customer-search">Search</FieldLabel>
            <input
              id="customer-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, company, city, email…"
              autoComplete="off"
            />
          </div>
          <CollapsibleFilters
            activeCount={
              (statusFilters.length > 0 ? 1 : 0) +
              (companyTypeFilters.length > 0 ? 1 : 0) +
              (relationshipLevelFilters.length > 0 ? 1 : 0) +
              (partnershipStageFilters.length > 0 ? 1 : 0)
            }
          >
            <MultiSelectFilter
              id="customer-status-filter"
              label="Status"
              allLabel="All statuses"
              value={statusFilters}
              onChange={(next) => {
                setStatusFilters(next);
                setPage(1);
              }}
              options={CUSTOMER_STATUSES.map((status) => ({
                value: status,
                label: statusLabel(status),
              }))}
            />
            <MultiSelectFilter
              id="customer-company-type-filter"
              label="Company type"
              allLabel="All company types"
              value={companyTypeFilters}
              onChange={(next) => {
                setCompanyTypeFilters(next);
                setPage(1);
              }}
              options={COMPANY_TYPES.map((type) => ({
                value: type,
                label: companyTypeLabel(type),
              }))}
            />
            <MultiSelectFilter
              id="customer-relationship-filter"
              label="Relationship"
              allLabel="All relationship levels"
              value={relationshipLevelFilters}
              onChange={(next) => {
                setRelationshipLevelFilters(next);
                setPage(1);
              }}
              options={RELATIONSHIP_LEVELS.map((level) => ({
                value: level,
                label: relationshipLabel(level),
              }))}
            />
            <MultiSelectFilter
              id="customer-partnership-filter"
              label="Partnership stage"
              allLabel="All partnership stages"
              value={partnershipStageFilters}
              onChange={(next) => {
                setPartnershipStageFilters(next);
                setPage(1);
              }}
              options={PARTNERSHIP_STAGES.map((stage) => ({
                value: stage,
                label: partnershipStageLabel(stage),
              }))}
            />
          </CollapsibleFilters>
          <p className="umkm-catalog-count">
            {listLoading
              ? 'Loading…'
                : listMeta.total === 0
                  ? filtersActive
                    ? 'No matches'
                    : 'No customers yet'
                  : items.length >= listMeta.total
                    ? `Showing all ${listMeta.total.toLocaleString('en-US')} customers`
                    : `Showing ${(listMeta.page - 1) * listMeta.limit + 1}–${Math.min(listMeta.page * listMeta.limit, listMeta.total)} of ${listMeta.total.toLocaleString('en-US')}`}
          </p>
        </div>

        {listLoading && directory.length === 0 ? null : listMeta.total === 0 ? (
          <EmptyState
            title={filtersActive ? 'No matches' : 'No customers yet'}
            description={
              filtersActive
                ? 'Try another search or clear the filters.'
                : 'Add a customer to start tracking partnerships and pipeline status.'
            }
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
                                id={c.customerId || c.id}
                                literal={Boolean(c.customerId)}
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
                          {c.relationshipLevel ? (
                            relationshipLabel(c.relationshipLevel)
                          ) : (
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
                            id={c.customerId || c.id}
                            literal={Boolean(c.customerId)}
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
                            {c.relationshipLevel
                              ? relationshipLabel(c.relationshipLevel)
                              : '—'}
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
            <ListPager
              ariaLabel="Customers pages"
              page={listMeta.page}
              totalPages={listMeta.totalPages}
              total={listMeta.total}
              loading={listLoading}
              pageSize={pageSize}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() =>
                setPage((p) => Math.min(listMeta.totalPages, p + 1))
              }
            />
          </>
        )}
      </ContentSection>

      <CustomerOrderTotalsSection
        filters={{
          search: debouncedSearch,
          status: statusFilters,
          companyType: companyTypeFilters,
          relationshipLevel: relationshipLevelFilters,
          partnershipStage: partnershipStageFilters,
        }}
        onView={openPerformanceView}
      />

      <ContentSection eyebrow="Statistics" quiet>
        <CustomerStatisticsSection
          statistics={stageSummary?.statistics}
          customerCount={stageSummary?.customerCount ?? 0}
          loading={statisticsLoading}
          labelForKey={statLabelForKey}
        />
      </ContentSection>
      </>
      ) : null}
    </section>
  );
}
