import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Admin lists render every row they are given. That is fine with demo data and
 * unusable once a real catalogue or order history lands, so the product, order
 * and customer tables all page through this.
 */
export function usePagination<T>(items: T[], perPage = 25, resetOn: unknown[] = []) {
  const [page, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(items.length / perPage));

  // A filter that shrinks the list can strand the viewer on a page that no
  // longer exists, which reads as "my products disappeared".
  useEffect(() => { setPage(1); }, resetOn);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  const pageItems = useMemo(
    () => items.slice((page - 1) * perPage, page * perPage),
    [items, page, perPage]
  );

  return {
    page,
    setPage,
    pageCount,
    pageItems,
    perPage,
    total: items.length,
    firstIndex: items.length === 0 ? 0 : (page - 1) * perPage + 1,
    lastIndex: Math.min(page * perPage, items.length)
  };
}

interface PaginationProps {
  page: number;
  pageCount: number;
  total: number;
  firstIndex: number;
  lastIndex: number;
  onChange: (page: number) => void;
  noun?: string;
}

export const Pagination = ({
  page,
  pageCount,
  total,
  firstIndex,
  lastIndex,
  onChange,
  noun = 'items'
}: PaginationProps) => {
  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
      <p className="text-xs text-gray-500">
        Showing <span className="font-medium text-gray-900">{firstIndex}</span>–
        <span className="font-medium text-gray-900">{lastIndex}</span> of{' '}
        <span className="font-medium text-gray-900">{total}</span> {noun}
      </p>

      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange(page - 1)}
            disabled={page === 1}
            className="p-2 rounded-lg text-gray-500 hover:bg-white hover:text-brand-dark disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-500 px-2 tabular-nums">
            {page} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => onChange(page + 1)}
            disabled={page === pageCount}
            className="p-2 rounded-lg text-gray-500 hover:bg-white hover:text-brand-dark disabled:opacity-30 disabled:hover:bg-transparent"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
