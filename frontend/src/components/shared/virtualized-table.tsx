import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

interface VirtualizedTableProps<T> {
  data: T[];
  estimateRowHeight?: number;
  overscan?: number;
  className?: string;
  containerClassName?: string;
  header?: React.ReactNode;
  renderRow: (item: T, index: number) => React.ReactNode;
  empty?: React.ReactNode;
  maxHeight?: string;
}

export function VirtualizedTable<T>({
  data,
  estimateRowHeight = 72,
  overscan = 8,
  className,
  containerClassName,
  header,
  renderRow,
  empty,
  maxHeight = '600px',
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateRowHeight,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();

  if (data.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col', containerClassName)}>
      {header && <div className="shrink-0 border-b border-slate-200 bg-slate-50/50">{header}</div>}
      <div
        ref={parentRef}
        className={cn('flex-1 overflow-auto scrollbar-thin', className)}
        style={{ maxHeight }}
      >
        <div
          className="relative w-full"
          style={{
            height: `${virtualizer.getTotalSize()}px`,
          }}
        >
          <div
            className="absolute top-0 left-0 w-full"
            style={{
              transform: `translateY(${virtualItems[0]?.start ?? 0}px)`,
            }}
          >
            {virtualItems.map((virtualRow) => {
              const item = data[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  className="w-full"
                >
                  {renderRow(item, virtualRow.index)}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="shrink-0 border-t border-slate-100 bg-slate-50/30 px-3 py-2 text-[11px] text-slate-400 flex items-center justify-between ">
        <span className='dark: text-black'>
          Showing {data.length} row{data.length !== 1 ? 's' : ''}
        </span>
        <span className="hidden sm:inline dark: text-black">Scroll to load more</span>
      </div>
    </div>
  );
}

export function VirtualizedGrid<T>({
  data,
  columns = 3,
  estimateRowHeight = 220,
  renderItem,
  gap = 16,
}: {
  data: T[];
  columns?: number;
  estimateRowHeight?: number;
  gap?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    const result: T[][] = [];
    for (let i = 0; i < data.length; i += columns) {
      result.push(data.slice(i, i + columns));
    }
    return result;
  }, [data, columns]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateRowHeight,
    overscan: 4,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div ref={parentRef} className="overflow-auto scrollbar-thin" style={{ maxHeight: '80vh' }}>
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        <div
          className="absolute top-0 left-0 w-full"
          style={{ transform: `translateY(${virtualItems[0]?.start ?? 0}px)` }}
        >
          {virtualItems.map((vRow) => {
            const rowItems = rows[vRow.index];
            return (
              <div
                key={vRow.key}
                ref={virtualizer.measureElement}
                data-index={vRow.index}
                className="grid w-full"
                style={{
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  gap: `${gap}px`,
                  paddingBottom: `${gap}px`,
                }}
              >
                {rowItems.map((item, colIdx) => (
                  <div key={colIdx} className="min-w-0">
                    {renderItem(item, vRow.index * columns + colIdx)}
                  </div>
                ))}
                {/* Fill empty cells for last row */}
                {rowItems.length < columns &&
                  Array.from({ length: columns - rowItems.length }).map((_, i) => <div key={`empty-${i}`} />)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
