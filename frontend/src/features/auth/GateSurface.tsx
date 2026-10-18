import { useEffect, useRef, type ReactNode } from "react";
import { useT } from "../../lib/i18n";

/** Native modal supplies focus containment, Escape and focus restoration. */
export default function GateSurface({ modal, title, children }: { modal: boolean; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = useT();
  useEffect(() => {
    if (modal) ref.current?.showModal();
  }, [modal]);
  if (!modal) return <div className="card mb-6">{children}</div>;
  return <>
    <button type="button" className="btn-ghost mb-6" onClick={() => ref.current?.showModal()}>{title}</button>
    <dialog ref={ref} aria-label={title} className="auth-dialog glass-l3" data-transient onKeyDown={event => {
      if (event.key !== "Tab") return;
      const targets = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')];
      const first = targets[0], last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
      <button type="button" className="btn-ghost mb-4" onClick={() => ref.current?.close()}>{t("preferences.close")}</button>
      {children}
    </dialog>
  </>;
}
