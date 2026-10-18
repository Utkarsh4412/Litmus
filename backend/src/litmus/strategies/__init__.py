"""RAG strategies- three different ways to answer a question from documents.

- classic:  retrieve top-k by similarity → stuff into prompt → generate
- graph:    pull entities from the question, walk an entity→entity→chunk graph
- agentic:  let Claude drive a tool-use loop (search, fetch, finish)

All strategies return the same `StrategyResult` shape so they can be compared 1:1.
"""
from __future__ import annotations

from litmus.strategies.agentic import AgenticRAG
from litmus.strategies.base import Strategy, StrategyResult
from litmus.strategies.classic import ClassicRAG
from litmus.strategies.graph import GraphRAG

REGISTRY: dict[str, type[Strategy]] = {
    "classic": ClassicRAG,
    "graph": GraphRAG,
    "agentic": AgenticRAG,
}


def get_strategy(name: str) -> Strategy:
    cls = REGISTRY.get(name)
    if cls is None:
        raise ValueError(f"unknown RAG strategy: {name!r}. choose one of {list(REGISTRY)}.")
    return cls()


__all__ = ["Strategy", "StrategyResult", "REGISTRY", "get_strategy"]
