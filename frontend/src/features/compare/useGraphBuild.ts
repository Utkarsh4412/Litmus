import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ApiError, errorMessage, get, post } from "../../lib/api/client";
import { useI18n, type I18n } from "../../lib/i18n";
import { BuildJob, JOB_STATUS, POLL_INTERVAL_MS } from "./constants";

/** Graph build and reset need the admin key on top of any API key. */
export function graphBuildError(e: unknown, t: I18n["t"]): string {
  const detail = e instanceof ApiError && e.detail ? ` (${e.detail})` : "";
  if (e instanceof ApiError && e.status === 403) {
    return t("compare.adminNeeded", { detail });
  }
  if (e instanceof ApiError && e.status === 503) {
    return t("compare.buildUnavailable", { detail });
  }
  return errorMessage(e);
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useGraphBuild(
  refetchStats: () => Promise<unknown>,
  setErr: Dispatch<SetStateAction<string | null>>,
  setShowAdminKey: Dispatch<SetStateAction<boolean>>,
) {
  const { t, tp } = useI18n();
  const [buildingGraph, setBuildingGraph] = useState(false);
  const [buildProgress, setBuildProgress] = useState<string | null>(null);

  // Stops the build poller when the page unmounts.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Start a build, then poll its job until it finishes. It can run for minutes. */
  async function buildGraph() {
    if (buildingGraph) return;
    setErr(null);
    setBuildingGraph(true);
    setBuildProgress(t(JOB_STATUS.queued));
    try {
      const started = await post<BuildJob>("/graph/build", {}, { admin: true });
      const jobId = started.job_id ?? started.id;
      if (!jobId) throw new Error(t("compare.noJobId"));
      let job = started;
      while (mounted.current && job.status !== "completed" && job.status !== "failed") {
        await sleep(POLL_INTERVAL_MS);
        if (!mounted.current) return;
        job = await get<BuildJob>(`/graph/build/${encodeURIComponent(jobId)}`, { admin: true });
        setBuildProgress(
          job.total
            ? t("compare.progressChunks", { done: job.completed ?? 0, total: job.total })
            : t(JOB_STATUS[job.status] ?? "compare.status.running"),
        );
      }
      if (!mounted.current) return;
      if (job.status === "failed") {
        setErr(t("compare.buildFailed", { error: job.error ?? t("compare.unknownError") }));
      } else if (job.failures && job.failures.length > 0) {
        setErr(tp("compare.partialFailures", job.failures.length));
      }
      await refetchStats();
    } catch (e) {
      if (!mounted.current) return;
      setErr(graphBuildError(e, t));
      if (e instanceof ApiError && e.status === 403) setShowAdminKey(true);
    } finally {
      if (mounted.current) {
        setBuildingGraph(false);
        setBuildProgress(null);
      }
    }
  }

  return { buildingGraph, buildProgress, buildGraph };
}
