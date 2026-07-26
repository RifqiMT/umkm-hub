import { OrderStatus, PaymentStatus } from '@prisma/client';
import { buildOrderFilterSql } from './order-filter-sql';

describe('buildOrderFilterSql', () => {
  it('always scopes by profileId', () => {
    const sql = buildOrderFilterSql('profile-1', {});
    expect(sql.values).toContain('profile-1');
  });

  it('binds a small status list (not one bind per matching order)', () => {
    const sql = buildOrderFilterSql('profile-1', {
      status: [OrderStatus.DELIVERED, OrderStatus.SHIPPED],
      paymentStatus: [PaymentStatus.CASH],
      orderDateFrom: '2024-01-01',
      orderDateTo: '2024-12-31',
      search: 'tea',
    });
    // profile + 2 statuses + 1 payment + 2 dates + several search patterns
    expect(sql.values.length).toBeLessThan(32);
    expect(sql.values).toContain('profile-1');
    expect(sql.values).toContain(OrderStatus.DELIVERED);
    expect(sql.values).toContain('%tea%');
  });
});
