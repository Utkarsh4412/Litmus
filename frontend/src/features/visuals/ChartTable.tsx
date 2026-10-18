import { useId, useState, type ReactNode } from 'react';
import { useT } from '../../lib/i18n';

/** One table: clipped for sighted users initially, still present for screen readers. */
export default function ChartTable({ caption, children }: { caption: string; children: ReactNode }) {
  const t = useT(), id = useId();
  const [open, setOpen] = useState(false);
  return <div className="chart-table">
    <button type="button" className="btn-ghost text-xs" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>{t(open ? 'visual.hideTable' : 'visual.table')}</button>
    <div id={id} className={open ? 'visual-scroll' : 'visual-table-sr'} role="region" aria-label={caption} tabIndex={open ? 0 : undefined} data-scroll={open || undefined}>
      <table><caption className="sr-only">{caption}</caption>{children}</table>
    </div>
  </div>;
}
