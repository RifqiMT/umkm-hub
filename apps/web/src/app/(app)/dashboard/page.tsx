'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ContentSection, PageHeader } from '@/components/PageHeader';
import type { Customer, Order, Paginated, Product } from '@/lib/types';

export default function DashboardPage() {
  const [counts, setCounts] = useState({
    products: 0,
    customers: 0,
    orders: 0,
    interested: 0,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [products, customers, orders] = await Promise.all([
          api<Paginated<Product>>('/products', { searchParams: { limit: 1 } }),
          api<Paginated<Customer>>('/customers', { searchParams: { limit: 1 } }),
          api<Paginated<Order>>('/orders', { searchParams: { limit: 1 } }),
        ]);
        const interested = await api<Paginated<Customer>>('/customers', {
          searchParams: { limit: 1, status: 'INTERESTED' },
        });
        setCounts({
          products: products.meta.total,
          customers: customers.meta.total,
          orders: orders.meta.total,
          interested: interested.meta.total,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <section>
      <PageHeader
        title="Dashboard"
        description="A calm snapshot of catalog, pipeline, and orders in your workspace."
        actions={
          <>
            <Link className="umkm-btn secondary" href="/warehouse">
              Warehouse
            </Link>
            <Link className="umkm-btn" href="/orders">
              New order
            </Link>
          </>
        }
      />
      {error ? <div className="umkm-error">{error}</div> : null}

      <ContentSection
        eyebrow="Overview"
        title="Workspace metrics"
        description="Live counts from your catalog, CRM, and orders."
        quiet
      >
        <div className="umkm-metrics">
          <div className="umkm-stat">
            <span>Products</span>
            <strong>{loading ? '—' : counts.products}</strong>
          </div>
          <div className="umkm-stat">
            <span>Customers</span>
            <strong>{loading ? '—' : counts.customers}</strong>
          </div>
          <div className="umkm-stat">
            <span>Orders</span>
            <strong>{loading ? '—' : counts.orders}</strong>
          </div>
          <div className="umkm-stat">
            <span>Interested</span>
            <strong>{loading ? '—' : counts.interested}</strong>
          </div>
        </div>
      </ContentSection>

      <ContentSection
        eyebrow="Navigate"
        title="Jump into work"
        description="Open the area you need next—no detours."
        quiet
      >
        <div className="umkm-quick-links">
          <Link className="umkm-quick-link" href="/products">
            <strong>Products</strong>
            <span>Catalog, packs, and pricing</span>
          </Link>
          <Link className="umkm-quick-link" href="/warehouse">
            <strong>Warehouse</strong>
            <span>Stock, sell value, and cost</span>
          </Link>
          <Link className="umkm-quick-link" href="/customers">
            <strong>Customers</strong>
            <span>CRM pipeline and addresses</span>
          </Link>
          <Link className="umkm-quick-link" href="/orders">
            <strong>Orders</strong>
            <span>Pack-based fulfillment</span>
          </Link>
          <Link className="umkm-quick-link" href="/targets">
            <strong>Targets</strong>
            <span>Monthly & annual revenue goals</span>
          </Link>
          <Link className="umkm-quick-link" href="/analytics">
            <strong>Analytics</strong>
            <span>Monthly & annual revenue graphs</span>
          </Link>
        </div>
      </ContentSection>
    </section>
  );
}
