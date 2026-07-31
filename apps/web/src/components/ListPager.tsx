'use client';

import {
  LIST_PAGE_SIZE_OPTIONS,
  pageSizeLabel,
  type ListPageSize,
} from '@/lib/list-page-size';
import { useTr, useFormatNumber } from '@/components/Tr';

type ListPagerProps = {
  page: number;
  totalPages: number;
  total: number;
  loading?: boolean;
  pageSize: ListPageSize;
  onPageSizeChange: (size: ListPageSize) => void;
  onPrev: () => void;
  onNext: () => void;
  /** e.g. "Orders pages" */
  ariaLabel?: string;
};

export function ListPager({
  page,
  totalPages,
  total,
  loading = false,
  pageSize,
  onPageSizeChange,
  onPrev,
  onNext,
  ariaLabel = 'List pages',
}: ListPagerProps) {
  const tr = useTr();
  const { formatInteger } = useFormatNumber();
  if (total <= 0) return null;

  const showNav = totalPages > 1;

  return (
    <div className="umkm-list-pager" aria-label={tr(ariaLabel)}>
      <label className="umkm-list-pager-size">
        <span className="umkm-list-pager-size-label">{tr('Show')}</span>
        <select
          className="umkm-list-pager-size-select"
          value={String(pageSize)}
          aria-label={tr('Rows per page')}
          disabled={loading}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value) as ListPageSize);
          }}
        >
          {LIST_PAGE_SIZE_OPTIONS.map((opt) => (
            <option key={String(opt)} value={String(opt)}>
              {pageSizeLabel(opt)}
            </option>
          ))}
        </select>
      </label>

      {showNav ? (
        <>
          <button
            type="button"
            className="umkm-btn ghost"
            disabled={loading || page <= 1}
            onClick={onPrev}
          >
            {tr('Previous')}
          </button>
          <span className="umkm-list-pager-status">
            {tr('Page')} {formatInteger(page)} {tr('of')}{' '}
            {formatInteger(totalPages)}
          </span>
          <button
            type="button"
            className="umkm-btn ghost"
            disabled={loading || page >= totalPages}
            onClick={onNext}
          >
            {tr('Next')}
          </button>
        </>
      ) : (
        <span className="umkm-list-pager-status">
          {formatInteger(total)} {tr(total === 1 ? 'row' : 'rows')}
        </span>
      )}
    </div>
  );
}
