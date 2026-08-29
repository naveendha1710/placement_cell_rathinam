import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '../ui/Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}) => {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 bg-white border-t border-zinc-200 text-xs text-zinc-600">
      {/* Items Summary & Page Size Selector */}
      <div className="flex items-center gap-3">
        <span>
          Showing <span className="font-bold text-zinc-900">{startItem}</span> to{' '}
          <span className="font-bold text-zinc-900">{endItem}</span> of{' '}
          <span className="font-bold text-zinc-900">{totalItems}</span> entries
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-zinc-500">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="py-1 px-2 rounded border border-zinc-300 bg-white font-medium text-xs text-zinc-800 focus:ring-2 focus:ring-zinc-900"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page Navigation Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-1.5 h-8 w-8"
          title="First Page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 h-8 w-8"
          title="Previous Page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="px-3 font-semibold text-zinc-900">
          Page {currentPage} of {totalPages || 1}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1.5 h-8 w-8"
          title="Next Page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className="p-1.5 h-8 w-8"
          title="Last Page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
