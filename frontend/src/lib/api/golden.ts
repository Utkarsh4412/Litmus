import { get } from "./client";

export interface GoldenQuestion {
  id: string;
  question: string;
  question_type: string;
  difficulty: string | null;
}

export const enc = encodeURIComponent;

/** GET /eval/golden: dataset names. */
export function listGoldenDatasets(): Promise<string[]> {
  return get<string[]>("/eval/golden");
}

/** GET /eval/golden/{dataset}: questions only, never the reference answers. */
export function listGoldenQuestions(dataset: string): Promise<GoldenQuestion[]> {
  return get<GoldenQuestion[]>(`/eval/golden/${enc(dataset)}`);
}
