import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "../../lib/api/client";
import { useT } from "../../lib/i18n";

/** Reuse the capability cache; never infer a model or key from a provider name. */
export function BackendStatus() {
  const t = useT();
  const { data, isPending } = useQuery({ queryKey: ["health-capabilities"], queryFn: fetchHealth, staleTime: 30_000, retry: false });
  return (
    <div className="backend-status text-xs text-zinc-400" role="status">
      <p>{isPending ? t("common.loading") : data ? t("shell.online") : t("shell.offline")}</p>
      {data && Object.entries(data.providers).map(([name, ready]) => (
        <p key={name}>{ready ? "✓" : "—"} {name} · {t(ready ? "shell.keyReady" : "shell.noKey")}</p>
      ))}
      {data && <p>{t(data.auth_required ? "shell.authOn" : "shell.authOff")}</p>}
      {!isPending && !data && <code className="block break-words">docker compose -f infra/docker-compose.yml up</code>}
    </div>
  );
}
