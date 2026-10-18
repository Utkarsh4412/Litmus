import { useQuery } from "@tanstack/react-query";
import { useI18n } from "../i18n";
import { fetchHealth, type CapabilityName } from "./client";

/** Unknown capabilities preserve compatibility with older/unreachable backends. */
export function useCapabilities() {
  const { t } = useI18n();
  const { data } = useQuery({
    queryKey: ["health-capabilities"],
    queryFn: fetchHealth,
    staleTime: 30_000,
    retry: false,
  });
  return (name: CapabilityName): string | undefined => {
    const capability = data?.capabilities?.[name];
    return capability?.enabled === false
      ? capability.reason || t("compare.unknownError") : undefined;
  };
}
