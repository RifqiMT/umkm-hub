import { ProductUnit } from '@prisma/client';

type LooseWhere = {
  profileId?: string;
  OR?: unknown;
  AND?: unknown[];
};

/**
 * Mirrors ProductsService.buildProductWhere pack-ready merge rules.
 * Kept as a pure check so search OR is never overwritten by pack-ready OR.
 */
function mergePackReady(
  where: LooseWhere,
  packReady: 'ready' | 'not_ready',
): LooseWhere {
  const readyClause = {
    OR: [
      { unit: ProductUnit.PCS },
      { price50: { not: null } },
    ],
  };
  where.AND = [
    ...(Array.isArray(where.AND) ? where.AND : []),
    packReady === 'ready' ? readyClause : { NOT: readyClause },
  ];
  return where;
}

describe('product where pack-ready merge', () => {
  it('keeps search OR when applying pack-ready', () => {
    const where: LooseWhere = {
      profileId: 'p1',
      OR: [{ name: { contains: 'tea' } }, { sku: { contains: 'tea' } }],
    };
    mergePackReady(where, 'ready');
    expect(where.OR).toEqual([
      { name: { contains: 'tea' } },
      { sku: { contains: 'tea' } },
    ]);
    expect(where.AND).toHaveLength(1);
    expect(where.AND?.[0]).toMatchObject({
      OR: expect.any(Array),
    });
  });

  it('ANDs NOT readyClause for not_ready without clearing search', () => {
    const where: LooseWhere = {
      OR: [{ name: { contains: 'x' } }],
    };
    mergePackReady(where, 'not_ready');
    expect(where.OR).toEqual([{ name: { contains: 'x' } }]);
    expect(where.AND?.[0]).toMatchObject({ NOT: expect.any(Object) });
  });
});
