import { useCapabilities } from "../../lib/api/useCapabilities";
import { useState } from "react";
import Tooltip from "../../design-system/Tooltip";
import { getAdminKey, setAdminKey } from "../../lib/api/client";
import { useI18n } from "../../lib/i18n";
import { GraphStats } from "./constants";

/** Optional admin key, sent as X-Admin-Key on graph build. Kept in this browser only. */
export function AdminKeyField({ open, onToggle }: { open: boolean; onToggle: (open: boolean) => void }) {
  const { t, rich } = useI18n();
  const [value, setValue] = useState(getAdminKey() ?? "");
  const [stored, setStored] = useState(!!getAdminKey());

  function save(e: React.FormEvent) {
    e.preventDefault();
    setAdminKey(value);
    setStored(!!value.trim());
  }

  function clear() {
    setAdminKey(null);
    setValue("");
    setStored(false);
  }

  return (
    <details
      open={open}
      onToggle={(e) => onToggle((e.currentTarget as HTMLDetailsElement).open)}
      className="text-xs text-zinc-500"
    >
      <summary className="cursor-pointer select-none hover:text-zinc-300">
        {t("compare.adminKey")} {stored ? t("compare.adminSaved") : t("compare.adminNeededHint")}
      </summary>
      <form onSubmit={save} className="mt-2 flex gap-2 flex-wrap items-center">
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("compare.adminPlaceholder")}
          autoComplete="off"
          spellCheck={false}
          aria-label={t("compare.adminKey")}
          className="flex-1 min-w-[14rem] rounded border border-bg-border bg-bg-base px-3 py-1.5 text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="rounded border border-bg-border px-3 py-1.5 text-sm text-zinc-200 hover:border-accent disabled:opacity-40 transition-colors"
        >
          {t("common.save")}
        </button>
        {stored && (
          <button
            type="button"
            onClick={clear}
            className="rounded px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {t("common.clear")}
          </button>
        )}
        <span className="basis-full text-[11px] text-zinc-600">
          {rich("compare.adminHelp", { header: <code className="font-mono">X-Admin-Key</code> })}
        </span>
      </form>
    </details>
  );
}

export function GraphStatus({
  stats,
  busy,
  progress,
  onBuild,
}: {
  stats: GraphStats | null;
  busy: boolean;
  progress: string | null;
  onBuild: () => void;
}) {
  const { t, rich, formatNumber } = useI18n();
  const unavailable = useCapabilities();
  const buildReason = unavailable("graph_build") ?? unavailable("graph");
  const ready = !!stats && stats.triples > 0;
  return (
    <div className="flex items-center gap-2">
      <Tooltip label={buildReason ?? t("compare.graphTip")} side="top">
        <div className={`text-xs font-mono px-2.5 py-1.5 rounded border flex items-center gap-2 cursor-help ${
          ready
            ? "bg-violet-500/10 border-violet-500/40 text-violet-300"
            : "bg-amber-500/10 border-amber-500/40 text-amber-300"
        }`}>
          <span className={`w-2 h-2 rounded-full ${ready ? "bg-violet-400" : "bg-amber-400"}`} aria-hidden="true" />
          {stats ? (
            <span>
              {rich("compare.triples", {
                count: <span className="font-semibold">{formatNumber(stats.triples)}</span>,
              })}
            </span>
          ) : (
            <span>{t("compare.graphNotBuilt")}</span>
          )}
        </div>
      </Tooltip>
      <button
        onClick={onBuild}
        disabled={busy || !!buildReason}
        title={buildReason}
        className={`text-xs px-3 py-1.5 rounded font-medium transition-colors min-h-[44px] flex items-center ${
          busy
            ? "bg-zinc-700/40 text-zinc-500 cursor-not-allowed"
            : "bg-violet-500/20 border border-violet-500/40 text-violet-300 hover:bg-violet-500/30 hover:border-violet-500/60"
        }`}
        aria-label={t("compare.buildAria")}
      >
        {busy
          ? t("compare.building", { progress: progress ?? "" }).trim()
          : ready
            ? t("compare.rebuild")
            : t("compare.buildGraph")}
      </button>
    </div>
  );
}
