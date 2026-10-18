# Evaluation methodology

Evaluation uses labelled golden examples and the configured retrieval and generation pipeline. The implementation is in [metrics.py](../backend/src/litmus/evaluation/metrics.py); this document reports no measured results.

## Retrieval metrics

[Retrieval scoring](../backend/src/litmus/evaluation/retrieval.py) matches normalized document identities, deduplicates retrieved documents in rank order, and uses binary relevance. `relevant_doc_ids` takes precedence over `expected_sources` when nonempty.

- Precision@K divides relevant documents retrieved in the first K positions by K, including when fewer documents are returned.
- Recall@K divides relevant documents retrieved in the first K positions by the number of relevant documents.
- HitRate@K records whether at least one relevant document appears in the first K positions.
- MRR uses the reciprocal rank of the first relevant document, or zero when none appears.
- nDCG@K discounts binary relevance by log2(rank + 1) and normalizes against an ideal ranking.

An example without relevant-document labels has undefined retrieval metrics and is counted separately from retrieval aggregates.

## Answers, refusals and failures

[Grounding validation](../backend/src/litmus/generation/grounding.py) checks the answer's citation handles against its supplied context. The evidence score is a heuristic derived from the answer contract and citations; it is not a calibrated probability of correctness. A valid citation does not establish that a source is true.

The evaluation harness records `scored`, `judge_failed` and `generation_failed` examples. Examples labelled `expected_behavior=refuse` use deterministic refusal scoring rather than a judge or retrieval score. Correct refusals and false refusals are distinct measurements. Inspect failure counts and the applicable sample count with every aggregate.

[Regression comparison](../backend/src/litmus/evaluation/regression.py) compares compatible configurations and applies the configured thresholds. A missing or incompatible comparator does not establish an improvement.

## Reproduction and limits

```sh
python tools/run_eval.py --dry-run --all-datasets
python tools/benchmark_retrieval.py --dataset golden_v3 --modes sparse
python tools/run_eval.py --dataset golden_v3 --no-judge
python tools/run_eval.py --dataset golden_v3 --fail-on-regression
```

Run commands from the project root with the backend installed and the required services configured. Record corpus hashes, dataset, access scope, models, prompt and rubric identities, configuration, command, failures and skipped modes. Default ingestion uses `data/docs`; optional metadata ingestion changes the evaluation input and needs a separate index and measurement.

Judge outputs depend on the selected model and rubric. Retrieval labels cover the supplied corpus rather than arbitrary knowledge. Latency and resource use depend on hardware, caches, services and provider conditions. Do not infer strategy superiority or general accuracy from a method description, a sample-data screenshot or an unmeasured configuration.
