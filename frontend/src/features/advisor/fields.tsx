import { type ReactNode } from "react";
import { useI18n, type MessageKey } from "../../lib/i18n";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-400">
      {label}
      {children}
    </label>
  );
}

/** A select whose option values stay the API's, labelled in the UI language. */
export function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Record<string, MessageKey>;
}) {
  const { t } = useI18n();
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="input text-sm !py-2">
      <option value="">{t("advisor.fromDescription")}</option>
      {Object.entries(options).map(([o, label]) => (
        <option key={o} value={o}>
          {t(label)}
        </option>
      ))}
    </select>
  );
}
