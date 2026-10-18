"""GDPR support: PII detection and redaction, erasure, export and retention.

Submodules are imported directly (``from litmus.governance.privacy.pii import redact``)
rather than re-exported here. :mod:`litmus.observability.logs` depends on
:mod:`litmus.governance.privacy.pii`, and the erasure and retention modules reach into the
vector store, so importing them from this package's ``__init__`` would drag the
whole RAG stack into logging setup.

See ``docs/gdpr/README.md`` for what the system stores and how to operate it.
"""
