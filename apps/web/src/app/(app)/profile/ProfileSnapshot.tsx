'use client';

import Link from 'next/link';
import { formatMoney, formatQty } from '@/lib/format-money';
import type {
  CustomerSummary,
  OrderSummary,
  ProductSummary,
} from '@/lib/types';

type WorkspaceSnapshot = {
  products: ProductSummary | null;
  customers: CustomerSummary | null;
  orders: OrderSummary | null;
};

type ProfileSnapshotProps = {
  loading: boolean;
  snapshot: WorkspaceSnapshot;
};

function SnapshotIcon({ kind }: { kind: 'products' | 'customers' | 'orders' | 'margin' }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    'aria-hidden': true,
  };
  switch (kind) {
    case 'products':
      return (
        <svg {...common}>
          <path
            d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M12 12v9M4 7.5 12 12l8-4.5" stroke="currentColor" strokeWidth="1.75" />
        </svg>
      );
    case 'customers':
      return (
        <svg {...common}>
          <path
            d="M16 11a3 3 0 1 0-6 0M4 18v-1a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v1M20 8v6M23 11h-6"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'orders':
      return (
        <svg {...common}>
          <path
            d="M6 4h12l2 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8l2-4Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M4 8h16M9 12h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );
    case 'margin':
      return (
        <svg {...common}>
          <path
            d="M4 18V6m0 12h16M8 14l3-3 3 2 4-5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

export function ProfileSnapshot({ loading, snapshot }: ProfileSnapshotProps) {
  const margin =
    snapshot.orders?.profitMarginRate != null
      ? `${snapshot.orders.profitMarginRate.toFixed(1)}%`
      : '—';

  const cards = [
    {
      key: 'products',
      href: '/products',
      label: 'Products',
      value: loading ? '…' : formatQty(snapshot.products?.productCount ?? 0),
      hint: snapshot.products
        ? `${formatMoney(snapshot.products.inventorySellValue)} stock value`
        : 'Catalog SKUs',
      icon: 'products' as const,
    },
    {
      key: 'customers',
      href: '/customers',
      label: 'Customers',
      value: loading ? '…' : formatQty(snapshot.customers?.customerCount ?? 0),
      hint:
        snapshot.customers?.interestedCount != null
          ? `${formatQty(snapshot.customers.interestedCount)} interested`
          : 'CRM contacts',
      icon: 'customers' as const,
    },
    {
      key: 'orders',
      href: '/orders',
      label: 'Orders',
      value: loading ? '…' : formatQty(snapshot.orders?.orderCount ?? 0),
      hint: snapshot.orders
        ? `${formatMoney(snapshot.orders.totalRevenue)} revenue`
        : 'Active sales',
      icon: 'orders' as const,
    },
    {
      key: 'margin',
      href: '/analytics',
      label: 'Margin',
      value: loading ? '…' : margin,
      hint: 'From orders with known cost',
      icon: 'margin' as const,
    },
  ];

  return (
    <ul className="umkm-profile-stat-cards" aria-busy={loading}>
      {cards.map((card) => (
        <li key={card.key}>
          <Link href={card.href} className="umkm-profile-stat-card">
            <span className="umkm-profile-stat-icon" aria-hidden>
              <SnapshotIcon kind={card.icon} />
            </span>
            <span className="umkm-profile-stat-label">{card.label}</span>
            <strong className="umkm-profile-stat-value">{card.value}</strong>
            <em className="umkm-profile-stat-hint">{card.hint}</em>
            <span className="umkm-profile-stat-go" aria-hidden>
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
