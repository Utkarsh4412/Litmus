import { post } from "../../lib/api/client";
import { StrategyComparison, StrategyName } from "../answer/types";

export interface CompareStrategiesResponse {
  question: string;
  results: StrategyComparison[];
}

export interface CompareStrategiesRequest {
  question: string;
  strategies?: StrategyName[];
  model?: string;
  evaluate?: boolean;
  reference?: { ideal_answer?: string; relevant_doc_ids?: string[] };
  golden?: { dataset: string; id: string };
}

/** POST /compare/strategies. Evaluation runs a judge call per strategy, so it takes longer. */
export function compareStrategies(req: CompareStrategiesRequest): Promise<CompareStrategiesResponse> {
  return post<CompareStrategiesResponse>("/compare/strategies", req);
}
