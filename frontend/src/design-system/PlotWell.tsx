import type { ReactNode } from "react";

/** Marks always have an opaque, palette-validated backing. */
export default function PlotWell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`plot-well ${className}`}>{children}</div>;
}
