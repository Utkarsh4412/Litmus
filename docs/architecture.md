# Litmus architecture

The backend is a Python package named `litmus`; its FastAPI application exposes version `0.3.0`.

## Python modules

The module inventory below lists Python source files in the backend package.

| Module | Source |
| --- | --- |
| `litmus.__init__` | [backend/src/litmus/__init__.py](../backend/src/litmus/__init__.py) |
| `litmus.advisor.__init__` | [backend/src/litmus/advisor/__init__.py](../backend/src/litmus/advisor/__init__.py) |
| `litmus.advisor.profile` | [backend/src/litmus/advisor/profile.py](../backend/src/litmus/advisor/profile.py) |
| `litmus.advisor.schemas` | [backend/src/litmus/advisor/schemas.py](../backend/src/litmus/advisor/schemas.py) |
| `litmus.advisor.scoring` | [backend/src/litmus/advisor/scoring.py](../backend/src/litmus/advisor/scoring.py) |
| `litmus.advisor.validate` | [backend/src/litmus/advisor/validate.py](../backend/src/litmus/advisor/validate.py) |
| `litmus.api.__init__` | [backend/src/litmus/api/__init__.py](../backend/src/litmus/api/__init__.py) |
| `litmus.api.admin` | [backend/src/litmus/api/admin.py](../backend/src/litmus/api/admin.py) |
| `litmus.api.advisor` | [backend/src/litmus/api/advisor.py](../backend/src/litmus/api/advisor.py) |
| `litmus.api.ask` | [backend/src/litmus/api/ask.py](../backend/src/litmus/api/ask.py) |
| `litmus.api.compare` | [backend/src/litmus/api/compare.py](../backend/src/litmus/api/compare.py) |
| `litmus.api.evaluation` | [backend/src/litmus/api/evaluation.py](../backend/src/litmus/api/evaluation.py) |
| `litmus.api.graph` | [backend/src/litmus/api/graph.py](../backend/src/litmus/api/graph.py) |
| `litmus.api.ingest` | [backend/src/litmus/api/ingest.py](../backend/src/litmus/api/ingest.py) |
| `litmus.api.metrics` | [backend/src/litmus/api/metrics.py](../backend/src/litmus/api/metrics.py) |
| `litmus.api.privacy` | [backend/src/litmus/api/privacy.py](../backend/src/litmus/api/privacy.py) |
| `litmus.api.traces` | [backend/src/litmus/api/traces.py](../backend/src/litmus/api/traces.py) |
| `litmus.capabilities` | [backend/src/litmus/capabilities.py](../backend/src/litmus/capabilities.py) |
| `litmus.config` | [backend/src/litmus/config.py](../backend/src/litmus/config.py) |
| `litmus.evaluation.__init__` | [backend/src/litmus/evaluation/__init__.py](../backend/src/litmus/evaluation/__init__.py) |
| `litmus.evaluation.dataset` | [backend/src/litmus/evaluation/dataset.py](../backend/src/litmus/evaluation/dataset.py) |
| `litmus.evaluation.human_ratings` | [backend/src/litmus/evaluation/human_ratings.py](../backend/src/litmus/evaluation/human_ratings.py) |
| `litmus.evaluation.judge` | [backend/src/litmus/evaluation/judge.py](../backend/src/litmus/evaluation/judge.py) |
| `litmus.evaluation.metrics` | [backend/src/litmus/evaluation/metrics.py](../backend/src/litmus/evaluation/metrics.py) |
| `litmus.evaluation.online` | [backend/src/litmus/evaluation/online.py](../backend/src/litmus/evaluation/online.py) |
| `litmus.evaluation.regression` | [backend/src/litmus/evaluation/regression.py](../backend/src/litmus/evaluation/regression.py) |
| `litmus.evaluation.retrieval` | [backend/src/litmus/evaluation/retrieval.py](../backend/src/litmus/evaluation/retrieval.py) |
| `litmus.evaluation.rubric` | [backend/src/litmus/evaluation/rubric.py](../backend/src/litmus/evaluation/rubric.py) |
| `litmus.generation.__init__` | [backend/src/litmus/generation/__init__.py](../backend/src/litmus/generation/__init__.py) |
| `litmus.generation.generate` | [backend/src/litmus/generation/generate.py](../backend/src/litmus/generation/generate.py) |
| `litmus.generation.grounding` | [backend/src/litmus/generation/grounding.py](../backend/src/litmus/generation/grounding.py) |
| `litmus.generation.prompts.__init__` | [backend/src/litmus/generation/prompts/__init__.py](../backend/src/litmus/generation/prompts/__init__.py) |
| `litmus.generation.prompts.loader` | [backend/src/litmus/generation/prompts/loader.py](../backend/src/litmus/generation/prompts/loader.py) |
| `litmus.generation.providers.__init__` | [backend/src/litmus/generation/providers/__init__.py](../backend/src/litmus/generation/providers/__init__.py) |
| `litmus.generation.providers.anthropic_provider` | [backend/src/litmus/generation/providers/anthropic_provider.py](../backend/src/litmus/generation/providers/anthropic_provider.py) |
| `litmus.generation.providers.base` | [backend/src/litmus/generation/providers/base.py](../backend/src/litmus/generation/providers/base.py) |
| `litmus.generation.providers.local` | [backend/src/litmus/generation/providers/local.py](../backend/src/litmus/generation/providers/local.py) |
| `litmus.generation.providers.openai_provider` | [backend/src/litmus/generation/providers/openai_provider.py](../backend/src/litmus/generation/providers/openai_provider.py) |
| `litmus.generation.response_clean` | [backend/src/litmus/generation/response_clean.py](../backend/src/litmus/generation/response_clean.py) |
| `litmus.governance.__init__` | [backend/src/litmus/governance/__init__.py](../backend/src/litmus/governance/__init__.py) |
| `litmus.governance.access` | [backend/src/litmus/governance/access.py](../backend/src/litmus/governance/access.py) |
| `litmus.governance.audit` | [backend/src/litmus/governance/audit.py](../backend/src/litmus/governance/audit.py) |
| `litmus.governance.auth` | [backend/src/litmus/governance/auth.py](../backend/src/litmus/governance/auth.py) |
| `litmus.governance.oidc` | [backend/src/litmus/governance/oidc.py](../backend/src/litmus/governance/oidc.py) |
| `litmus.governance.privacy.__init__` | [backend/src/litmus/governance/privacy/__init__.py](../backend/src/litmus/governance/privacy/__init__.py) |
| `litmus.governance.privacy.erasure` | [backend/src/litmus/governance/privacy/erasure.py](../backend/src/litmus/governance/privacy/erasure.py) |
| `litmus.governance.privacy.export` | [backend/src/litmus/governance/privacy/export.py](../backend/src/litmus/governance/privacy/export.py) |
| `litmus.governance.privacy.pii` | [backend/src/litmus/governance/privacy/pii.py](../backend/src/litmus/governance/privacy/pii.py) |
| `litmus.governance.privacy.retention` | [backend/src/litmus/governance/privacy/retention.py](../backend/src/litmus/governance/privacy/retention.py) |
| `litmus.governance.privacy.usage` | [backend/src/litmus/governance/privacy/usage.py](../backend/src/litmus/governance/privacy/usage.py) |
| `litmus.main` | [backend/src/litmus/main.py](../backend/src/litmus/main.py) |
| `litmus.observability.__init__` | [backend/src/litmus/observability/__init__.py](../backend/src/litmus/observability/__init__.py) |
| `litmus.observability.logs` | [backend/src/litmus/observability/logs.py](../backend/src/litmus/observability/logs.py) |
| `litmus.observability.metrics` | [backend/src/litmus/observability/metrics.py](../backend/src/litmus/observability/metrics.py) |
| `litmus.observability.pricing` | [backend/src/litmus/observability/pricing.py](../backend/src/litmus/observability/pricing.py) |
| `litmus.observability.request_metrics` | [backend/src/litmus/observability/request_metrics.py](../backend/src/litmus/observability/request_metrics.py) |
| `litmus.observability.timing` | [backend/src/litmus/observability/timing.py](../backend/src/litmus/observability/timing.py) |
| `litmus.observability.tracing.__init__` | [backend/src/litmus/observability/tracing/__init__.py](../backend/src/litmus/observability/tracing/__init__.py) |
| `litmus.observability.tracing.instrument` | [backend/src/litmus/observability/tracing/instrument.py](../backend/src/litmus/observability/tracing/instrument.py) |
| `litmus.observability.tracing.langfuse_exporter` | [backend/src/litmus/observability/tracing/langfuse_exporter.py](../backend/src/litmus/observability/tracing/langfuse_exporter.py) |
| `litmus.observability.tracing.policy` | [backend/src/litmus/observability/tracing/policy.py](../backend/src/litmus/observability/tracing/policy.py) |
| `litmus.observability.tracing.spans` | [backend/src/litmus/observability/tracing/spans.py](../backend/src/litmus/observability/tracing/spans.py) |
| `litmus.observability.tracing.stages` | [backend/src/litmus/observability/tracing/stages.py](../backend/src/litmus/observability/tracing/stages.py) |
| `litmus.observability.tracing.wandb_tracer` | [backend/src/litmus/observability/tracing/wandb_tracer.py](../backend/src/litmus/observability/tracing/wandb_tracer.py) |
| `litmus.platform.__init__` | [backend/src/litmus/platform/__init__.py](../backend/src/litmus/platform/__init__.py) |
| `litmus.platform.i18n` | [backend/src/litmus/platform/i18n.py](../backend/src/litmus/platform/i18n.py) |
| `litmus.platform.middleware.__init__` | [backend/src/litmus/platform/middleware/__init__.py](../backend/src/litmus/platform/middleware/__init__.py) |
| `litmus.platform.middleware.request_id` | [backend/src/litmus/platform/middleware/request_id.py](../backend/src/litmus/platform/middleware/request_id.py) |
| `litmus.platform.resilience` | [backend/src/litmus/platform/resilience.py](../backend/src/litmus/platform/resilience.py) |
| `litmus.retrieval.__init__` | [backend/src/litmus/retrieval/__init__.py](../backend/src/litmus/retrieval/__init__.py) |
| `litmus.retrieval.chunking` | [backend/src/litmus/retrieval/chunking.py](../backend/src/litmus/retrieval/chunking.py) |
| `litmus.retrieval.collection_model` | [backend/src/litmus/retrieval/collection_model.py](../backend/src/litmus/retrieval/collection_model.py) |
| `litmus.retrieval.embed` | [backend/src/litmus/retrieval/embed.py](../backend/src/litmus/retrieval/embed.py) |
| `litmus.retrieval.fusion` | [backend/src/litmus/retrieval/fusion.py](../backend/src/litmus/retrieval/fusion.py) |
| `litmus.retrieval.ingest` | [backend/src/litmus/retrieval/ingest.py](../backend/src/litmus/retrieval/ingest.py) |
| `litmus.retrieval.ingest_parsers.__init__` | [backend/src/litmus/retrieval/ingest_parsers/__init__.py](../backend/src/litmus/retrieval/ingest_parsers/__init__.py) |
| `litmus.retrieval.ingest_parsers.archive` | [backend/src/litmus/retrieval/ingest_parsers/archive.py](../backend/src/litmus/retrieval/ingest_parsers/archive.py) |
| `litmus.retrieval.ingest_parsers.base` | [backend/src/litmus/retrieval/ingest_parsers/base.py](../backend/src/litmus/retrieval/ingest_parsers/base.py) |
| `litmus.retrieval.ingest_parsers.docx` | [backend/src/litmus/retrieval/ingest_parsers/docx.py](../backend/src/litmus/retrieval/ingest_parsers/docx.py) |
| `litmus.retrieval.ingest_parsers.eml` | [backend/src/litmus/retrieval/ingest_parsers/eml.py](../backend/src/litmus/retrieval/ingest_parsers/eml.py) |
| `litmus.retrieval.ingest_parsers.html` | [backend/src/litmus/retrieval/ingest_parsers/html.py](../backend/src/litmus/retrieval/ingest_parsers/html.py) |
| `litmus.retrieval.ingest_parsers.ocr` | [backend/src/litmus/retrieval/ingest_parsers/ocr.py](../backend/src/litmus/retrieval/ingest_parsers/ocr.py) |
| `litmus.retrieval.ingest_parsers.odf` | [backend/src/litmus/retrieval/ingest_parsers/odf.py](../backend/src/litmus/retrieval/ingest_parsers/odf.py) |
| `litmus.retrieval.ingest_parsers.pdf` | [backend/src/litmus/retrieval/ingest_parsers/pdf.py](../backend/src/litmus/retrieval/ingest_parsers/pdf.py) |
| `litmus.retrieval.ingest_parsers.pptx` | [backend/src/litmus/retrieval/ingest_parsers/pptx.py](../backend/src/litmus/retrieval/ingest_parsers/pptx.py) |
| `litmus.retrieval.ingest_parsers.registry` | [backend/src/litmus/retrieval/ingest_parsers/registry.py](../backend/src/litmus/retrieval/ingest_parsers/registry.py) |
| `litmus.retrieval.ingest_parsers.structure` | [backend/src/litmus/retrieval/ingest_parsers/structure.py](../backend/src/litmus/retrieval/ingest_parsers/structure.py) |
| `litmus.retrieval.ingest_parsers.text` | [backend/src/litmus/retrieval/ingest_parsers/text.py](../backend/src/litmus/retrieval/ingest_parsers/text.py) |
| `litmus.retrieval.query` | [backend/src/litmus/retrieval/query.py](../backend/src/litmus/retrieval/query.py) |
| `litmus.retrieval.rerank` | [backend/src/litmus/retrieval/rerank.py](../backend/src/litmus/retrieval/rerank.py) |
| `litmus.retrieval.retrieve` | [backend/src/litmus/retrieval/retrieve.py](../backend/src/litmus/retrieval/retrieve.py) |
| `litmus.retrieval.sparse` | [backend/src/litmus/retrieval/sparse.py](../backend/src/litmus/retrieval/sparse.py) |
| `litmus.retrieval.store` | [backend/src/litmus/retrieval/store.py](../backend/src/litmus/retrieval/store.py) |
| `litmus.schemas.__init__` | [backend/src/litmus/schemas/__init__.py](../backend/src/litmus/schemas/__init__.py) |
| `litmus.strategies.__init__` | [backend/src/litmus/strategies/__init__.py](../backend/src/litmus/strategies/__init__.py) |
| `litmus.strategies.agentic` | [backend/src/litmus/strategies/agentic.py](../backend/src/litmus/strategies/agentic.py) |
| `litmus.strategies.base` | [backend/src/litmus/strategies/base.py](../backend/src/litmus/strategies/base.py) |
| `litmus.strategies.classic` | [backend/src/litmus/strategies/classic.py](../backend/src/litmus/strategies/classic.py) |
| `litmus.strategies.graph` | [backend/src/litmus/strategies/graph.py](../backend/src/litmus/strategies/graph.py) |
| `litmus.strategies.graph_extract` | [backend/src/litmus/strategies/graph_extract.py](../backend/src/litmus/strategies/graph_extract.py) |
| `litmus.strategies.graph_store` | [backend/src/litmus/strategies/graph_store.py](../backend/src/litmus/strategies/graph_store.py) |

## HTTP endpoints

Routes combine the application router prefixes with route decorators. Authentication and feature availability are enforced by the route dependencies and implementation.

| Method | Path | Handler | Source |
| --- | --- | --- | --- |
| POST | `/admin/keys` | `create_key` | [backend/src/litmus/api/admin.py:122](../backend/src/litmus/api/admin.py#L122) |
| GET | `/admin/keys` | `list_keys` | [backend/src/litmus/api/admin.py:166](../backend/src/litmus/api/admin.py#L166) |
| POST | `/admin/keys/{key_id}/deactivate` | `deactivate_key` | [backend/src/litmus/api/admin.py:177](../backend/src/litmus/api/admin.py#L177) |
| PUT | `/admin/keys/{key_id}/access` | `set_key_access` | [backend/src/litmus/api/admin.py:200](../backend/src/litmus/api/admin.py#L200) |
| GET | `/admin/audit` | `audit_log` | [backend/src/litmus/api/admin.py:228](../backend/src/litmus/api/admin.py#L228) |
| GET | `/admin/health` | `health` | [backend/src/litmus/api/admin.py:264](../backend/src/litmus/api/admin.py#L264) |
| POST | `/ask` | `ask` | [backend/src/litmus/api/ask.py:20](../backend/src/litmus/api/ask.py#L20) |
| POST | `/compare` | `compare` | [backend/src/litmus/api/compare.py:54](../backend/src/litmus/api/compare.py#L54) |
| POST | `/compare/strategies` | `compare_strategies` | [backend/src/litmus/api/compare.py:135](../backend/src/litmus/api/compare.py#L135) |
| GET | `/graph/stats` | `stats` | [backend/src/litmus/api/graph.py:48](../backend/src/litmus/api/graph.py#L48) |
| GET | `/graph/entities` | `entities` | [backend/src/litmus/api/graph.py:55](../backend/src/litmus/api/graph.py#L55) |
| POST | `/graph/reset` | `reset` | [backend/src/litmus/api/graph.py:79](../backend/src/litmus/api/graph.py#L79) |
| POST | `/graph/build` | `build` | [backend/src/litmus/api/graph.py:240](../backend/src/litmus/api/graph.py#L240) |
| GET | `/graph/build/{job_id}` | `build_status` | [backend/src/litmus/api/graph.py:285](../backend/src/litmus/api/graph.py#L285) |
| POST | `/ingest` | `ingest_document` | [backend/src/litmus/api/ingest.py:24](../backend/src/litmus/api/ingest.py#L24) |
| GET | `/ingest/stats` | `stats` | [backend/src/litmus/api/ingest.py:132](../backend/src/litmus/api/ingest.py#L132) |
| GET | `/ingest/formats` | `formats` | [backend/src/litmus/api/ingest.py:138](../backend/src/litmus/api/ingest.py#L138) |
| GET | `/metrics` | `metrics` | [backend/src/litmus/api/metrics.py:39](../backend/src/litmus/api/metrics.py#L39) |
| DELETE | `/privacy/documents/{doc_id}` | `erase_document` | [backend/src/litmus/api/privacy.py:69](../backend/src/litmus/api/privacy.py#L69) |
| DELETE | `/privacy/sources` | `erase_source` | [backend/src/litmus/api/privacy.py:82](../backend/src/litmus/api/privacy.py#L82) |
| DELETE | `/privacy/principals/{principal_id}` | `erase_principal` | [backend/src/litmus/api/privacy.py:91](../backend/src/litmus/api/privacy.py#L91) |
| GET | `/privacy/export/{principal_id}` | `export` | [backend/src/litmus/api/privacy.py:99](../backend/src/litmus/api/privacy.py#L99) |
| POST | `/privacy/retention/run` | `retention_run` | [backend/src/litmus/api/privacy.py:112](../backend/src/litmus/api/privacy.py#L112) |
| GET | `/traces/{trace_id}` | `trace` | [backend/src/litmus/api/traces.py:9](../backend/src/litmus/api/traces.py#L9) |
| POST | `/advise` | `advise` | [backend/src/litmus/api/advisor.py:30](../backend/src/litmus/api/advisor.py#L30) |
| POST | `/advise/validate` | `validate` | [backend/src/litmus/api/advisor.py:84](../backend/src/litmus/api/advisor.py#L84) |
| POST | `/eval/run` | `run` | [backend/src/litmus/api/evaluation.py:27](../backend/src/litmus/api/evaluation.py#L27) |
| GET | `/eval/golden` | `golden_datasets` | [backend/src/litmus/api/evaluation.py:85](../backend/src/litmus/api/evaluation.py#L85) |
| GET | `/eval/golden/{dataset}` | `golden_dataset_questions` | [backend/src/litmus/api/evaluation.py:93](../backend/src/litmus/api/evaluation.py#L93) |
| GET | `/eval/runs` | `runs` | [backend/src/litmus/api/evaluation.py:116](../backend/src/litmus/api/evaluation.py#L116) |
| GET | `/eval/runs/{run_id}` | `run_detail` | [backend/src/litmus/api/evaluation.py:122](../backend/src/litmus/api/evaluation.py#L122) |
| GET | `/eval/runs/{run_id}/regression` | `run_regression` | [backend/src/litmus/api/evaluation.py:138](../backend/src/litmus/api/evaluation.py#L138) |
| POST | `/eval/human-rate` | `human_rate` | [backend/src/litmus/api/evaluation.py:164](../backend/src/litmus/api/evaluation.py#L164) |
| GET | `/eval/human-ratings` | `human_ratings` | [backend/src/litmus/api/evaluation.py:170](../backend/src/litmus/api/evaluation.py#L170) |
| GET | `/health` | `health` | [backend/src/litmus/main.py:178](../backend/src/litmus/main.py#L178) |

## Settings

The fields below are declared on `Settings`. Values and validation rules are defined in the linked source; credentials must be supplied locally.

| Field | Type | Source |
| --- | --- | --- |
| `anthropic_api_key` | `str` | [backend/src/litmus/config.py:111](../backend/src/litmus/config.py#L111) |
| `openai_api_key` | `str` | [backend/src/litmus/config.py:115](../backend/src/litmus/config.py#L115) |
| `openai_base_url` | `str` | [backend/src/litmus/config.py:119](../backend/src/litmus/config.py#L119) |
| `qdrant_url` | `str` | [backend/src/litmus/config.py:128](../backend/src/litmus/config.py#L128) |
| `qdrant_api_key` | `str &#124; None` | [backend/src/litmus/config.py:132](../backend/src/litmus/config.py#L132) |
| `qdrant_collection` | `str` | [backend/src/litmus/config.py:136](../backend/src/litmus/config.py#L136) |
| `postgres_url` | `str` | [backend/src/litmus/config.py:143](../backend/src/litmus/config.py#L143) |
| `langfuse_host` | `str` | [backend/src/litmus/config.py:149](../backend/src/litmus/config.py#L149) |
| `langfuse_public_key` | `str` | [backend/src/litmus/config.py:153](../backend/src/litmus/config.py#L153) |
| `langfuse_secret_key` | `str` | [backend/src/litmus/config.py:154](../backend/src/litmus/config.py#L154) |
| `wandb_api_key` | `str` | [backend/src/litmus/config.py:157](../backend/src/litmus/config.py#L157) |
| `wandb_project` | `str` | [backend/src/litmus/config.py:158](../backend/src/litmus/config.py#L158) |
| `wandb_mode` | `str` | [backend/src/litmus/config.py:159](../backend/src/litmus/config.py#L159) |
| `wandb_enabled` | `bool` | [backend/src/litmus/config.py:162](../backend/src/litmus/config.py#L162) |
| `wandb_base_url` | `str` | [backend/src/litmus/config.py:166](../backend/src/litmus/config.py#L166) |
| `telemetry_mode` | `str` | [backend/src/litmus/config.py:172](../backend/src/litmus/config.py#L172) |
| `telemetry_allowed_hosts` | `str` | [backend/src/litmus/config.py:176](../backend/src/litmus/config.py#L176) |
| `telemetry_cloud_opt_in` | `bool` | [backend/src/litmus/config.py:180](../backend/src/litmus/config.py#L180) |
| `telemetry_include_content` | `bool` | [backend/src/litmus/config.py:184](../backend/src/litmus/config.py#L184) |
| `telemetry_queue_size` | `int` | [backend/src/litmus/config.py:191](../backend/src/litmus/config.py#L191) |
| `metrics_enabled` | `bool` | [backend/src/litmus/config.py:199](../backend/src/litmus/config.py#L199) |
| `embedding_model` | `str` | [backend/src/litmus/config.py:205](../backend/src/litmus/config.py#L205) |
| `embedding_query_prefix` | `str &#124; None` | [backend/src/litmus/config.py:214](../backend/src/litmus/config.py#L214) |
| `embedding_passage_prefix` | `str &#124; None` | [backend/src/litmus/config.py:221](../backend/src/litmus/config.py#L221) |
| `reranker_model` | `str` | [backend/src/litmus/config.py:228](../backend/src/litmus/config.py#L228) |
| `generator_provider` | `str` | [backend/src/litmus/config.py:240](../backend/src/litmus/config.py#L240) |
| `generator_model` | `str` | [backend/src/litmus/config.py:244](../backend/src/litmus/config.py#L244) |
| `openai_generator_model` | `str` | [backend/src/litmus/config.py:248](../backend/src/litmus/config.py#L248) |
| `ollama_host` | `str` | [backend/src/litmus/config.py:254](../backend/src/litmus/config.py#L254) |
| `ollama_model` | `str` | [backend/src/litmus/config.py:257](../backend/src/litmus/config.py#L257) |
| `judge_model` | `str` | [backend/src/litmus/config.py:262](../backend/src/litmus/config.py#L262) |
| `graph_extraction_model` | `str` | [backend/src/litmus/config.py:265](../backend/src/litmus/config.py#L265) |
| `agentic_model` | `str` | [backend/src/litmus/config.py:269](../backend/src/litmus/config.py#L269) |
| `chunk_size_tokens` | `int` | [backend/src/litmus/config.py:279](../backend/src/litmus/config.py#L279) |
| `chunk_overlap_tokens` | `int` | [backend/src/litmus/config.py:282](../backend/src/litmus/config.py#L282) |
| `chunk_strategy` | `str` | [backend/src/litmus/config.py:285](../backend/src/litmus/config.py#L285) |
| `chunk_max_model_tokens` | `int` | [backend/src/litmus/config.py:293](../backend/src/litmus/config.py#L293) |
| `retrieval_mode` | `str` | [backend/src/litmus/config.py:305](../backend/src/litmus/config.py#L305) |
| `retrieval_top_k` | `int` | [backend/src/litmus/config.py:309](../backend/src/litmus/config.py#L309) |
| `dense_top_k` | `int` | [backend/src/litmus/config.py:315](../backend/src/litmus/config.py#L315) |
| `bm25_top_k` | `int` | [backend/src/litmus/config.py:318](../backend/src/litmus/config.py#L318) |
| `rrf_k` | `int` | [backend/src/litmus/config.py:321](../backend/src/litmus/config.py#L321) |
| `rerank_top_k` | `int` | [backend/src/litmus/config.py:324](../backend/src/litmus/config.py#L324) |
| `final_context_k` | `int` | [backend/src/litmus/config.py:327](../backend/src/litmus/config.py#L327) |
| `max_answer_tokens` | `int` | [backend/src/litmus/config.py:333](../backend/src/litmus/config.py#L333) |
| `agentic_max_iters` | `int` | [backend/src/litmus/config.py:338](../backend/src/litmus/config.py#L338) |
| `graph_data_dir` | `str` | [backend/src/litmus/config.py:343](../backend/src/litmus/config.py#L343) |
| `extra_allowed_models` | `str` | [backend/src/litmus/config.py:350](../backend/src/litmus/config.py#L350) |
| `model_pricing_path` | `str` | [backend/src/litmus/config.py:359](../backend/src/litmus/config.py#L359) |
| `data_dir` | `str` | [backend/src/litmus/config.py:368](../backend/src/litmus/config.py#L368) |
| `eval_concurrency` | `int` | [backend/src/litmus/config.py:375](../backend/src/litmus/config.py#L375) |
| `max_upload_mb` | `int` | [backend/src/litmus/config.py:380](../backend/src/litmus/config.py#L380) |
| `max_uncompressed_mb` | `int` | [backend/src/litmus/config.py:383](../backend/src/litmus/config.py#L383) |
| `ocr_enabled` | `bool` | [backend/src/litmus/config.py:394](../backend/src/litmus/config.py#L394) |
| `ocr_languages` | `str` | [backend/src/litmus/config.py:401](../backend/src/litmus/config.py#L401) |
| `ocr_max_pages` | `int` | [backend/src/litmus/config.py:406](../backend/src/litmus/config.py#L406) |
| `ocr_min_chars_per_page` | `int` | [backend/src/litmus/config.py:409](../backend/src/litmus/config.py#L409) |
| `provider_timeout_seconds` | `float` | [backend/src/litmus/config.py:417](../backend/src/litmus/config.py#L417) |
| `provider_max_retries` | `int` | [backend/src/litmus/config.py:420](../backend/src/litmus/config.py#L420) |
| `require_api_key` | `bool` | [backend/src/litmus/config.py:425](../backend/src/litmus/config.py#L425) |
| `admin_key` | `str` | [backend/src/litmus/config.py:433](../backend/src/litmus/config.py#L433) |
| `pii_mode_ingest` | `str` | [backend/src/litmus/config.py:439](../backend/src/litmus/config.py#L439) |
| `pii_redact_logs` | `bool` | [backend/src/litmus/config.py:447](../backend/src/litmus/config.py#L447) |
| `pii_redact_traces` | `bool` | [backend/src/litmus/config.py:450](../backend/src/litmus/config.py#L450) |
| `retention_traces_days` | `int` | [backend/src/litmus/config.py:454](../backend/src/litmus/config.py#L454) |
| `retention_eval_runs_days` | `int` | [backend/src/litmus/config.py:457](../backend/src/litmus/config.py#L457) |
| `retention_audit_days` | `int` | [backend/src/litmus/config.py:460](../backend/src/litmus/config.py#L460) |
| `default_tenant` | `str` | [backend/src/litmus/config.py:465](../backend/src/litmus/config.py#L465) |
| `acl_default_public` | `bool` | [backend/src/litmus/config.py:475](../backend/src/litmus/config.py#L475) |
| `acl_legacy_public` | `bool` | [backend/src/litmus/config.py:482](../backend/src/litmus/config.py#L482) |
| `audit_store_questions` | `bool` | [backend/src/litmus/config.py:490](../backend/src/litmus/config.py#L490) |
| `oidc_issuer` | `str` | [backend/src/litmus/config.py:499](../backend/src/litmus/config.py#L499) |
| `oidc_audience` | `str` | [backend/src/litmus/config.py:506](../backend/src/litmus/config.py#L506) |
| `oidc_groups_claim` | `str` | [backend/src/litmus/config.py:509](../backend/src/litmus/config.py#L509) |
| `oidc_admin_group` | `str` | [backend/src/litmus/config.py:517](../backend/src/litmus/config.py#L517) |
| `oidc_tenant_claim` | `str` | [backend/src/litmus/config.py:520](../backend/src/litmus/config.py#L520) |
| `oidc_algorithms` | `str` | [backend/src/litmus/config.py:527](../backend/src/litmus/config.py#L527) |
| `oidc_jwks_ttl_seconds` | `int` | [backend/src/litmus/config.py:531](../backend/src/litmus/config.py#L531) |
| `cors_origins` | `str` | [backend/src/litmus/config.py:536](../backend/src/litmus/config.py#L536) |

## Reading the implementation

Start with [application assembly](../backend/src/litmus/main.py), [configuration](../backend/src/litmus/config.py), and [API schemas](../backend/src/litmus/schemas/__init__.py). See the [retrieval walkthrough](guides/rag-walkthrough.md) and [evaluation methodology](evaluation-methodology.md) for the algorithm and measurement contracts.
