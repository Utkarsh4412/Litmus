import type { AnswerData, StrategyComparison } from '../features/answer/types';
import type { RegressionReport } from '../features/eval/api';
export const cases: Record<string, { answer: AnswerData & Partial<StrategyComparison>; metadata: { groundingMode?: string; refusalReason?: string } }>;
export const comparableReport: RegressionReport;
export const mismatchReport: RegressionReport;
export const disabledHealth: import('../lib/api/client').HealthResponse;
export function strategyResult(name: 'classic' | 'graph' | 'agentic', answer?: AnswerData): StrategyComparison;
