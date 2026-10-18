# Reproducing retrieval benchmarks

From the project root with the backend installed:

```sh
python tools/benchmark_retrieval.py --dataset golden_v3 --modes sparse
python tools/benchmark_retrieval.py --dataset golden_v3 --modes dense hybrid --rerank
python tools/measure_retrieval.py --help
```

Dense and hybrid retrieval require the embedding model. Reranking requires the configured reranker. Inspect skipped modes and failure counts before comparing outputs.

The tool writes timestamped JSON and Markdown reports in this directory. Record the dataset, corpus hashes, model identities, configuration and command with each measurement. Compare only compatible configurations and document access scopes. Optional metadata ingestion requires a separate index and measurement.

See [evaluation methodology](../../docs/evaluation-methodology.md). No measured results are included here.
