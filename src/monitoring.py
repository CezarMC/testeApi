from __future__ import annotations

import json
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd


def registrar_evento(log_path: str | Path, event_type: str, payload: dict[str, Any]) -> None:
    caminho = Path(log_path)
    caminho.parent.mkdir(parents=True, exist_ok=True)
    evento = {
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "event_type": event_type,
        **payload,
    }
    with caminho.open("a", encoding="utf-8") as arquivo:
        arquivo.write(json.dumps(evento, ensure_ascii=False) + "\n")


def carregar_eventos(log_path: str | Path) -> list[dict[str, Any]]:
    caminho = Path(log_path)
    if not caminho.exists():
        return []

    eventos: list[dict[str, Any]] = []
    with caminho.open("r", encoding="utf-8") as arquivo:
        for linha in arquivo:
            linha = linha.strip()
            if not linha:
                continue
            try:
                eventos.append(json.loads(linha))
            except json.JSONDecodeError:
                continue
    return eventos


def resumir_eventos(log_path: str | Path) -> dict[str, Any]:
    eventos = carregar_eventos(log_path)
    if not eventos:
        return {
            "total_eventos": 0,
            "total_interacoes": 0,
            "total_feedbacks": 0,
            "taxa_feedback_positivo": 0.0,
            "por_intencao": [],
            "por_idioma": [],
            "ultimos_feedbacks": [],
            "eventos": [],
        }

    df = pd.DataFrame(eventos)
    interacoes = df[df["event_type"] == "chat_interaction"].copy() if "event_type" in df.columns else pd.DataFrame()
    feedbacks = df[df["event_type"] == "response_feedback"].copy() if "event_type" in df.columns else pd.DataFrame()

    positivos = 0
    if not feedbacks.empty and "useful" in feedbacks.columns:
        positivos = int(feedbacks["useful"].map(lambda value: bool(value) if pd.notna(value) else False).sum())

    por_intencao: list[dict[str, Any]] = []
    if not interacoes.empty and "intent" in interacoes.columns:
        contador_intencao = Counter(interacoes["intent"].fillna("desconhecida"))
        por_intencao = [
            {"intent": intent, "total": total}
            for intent, total in sorted(contador_intencao.items(), key=lambda item: (-item[1], item[0]))
        ]

    por_idioma: list[dict[str, Any]] = []
    if not interacoes.empty and "language" in interacoes.columns:
        contador_idioma = Counter(interacoes["language"].fillna("desconhecido"))
        por_idioma = [
            {"language": language, "total": total}
            for language, total in sorted(contador_idioma.items(), key=lambda item: (-item[1], item[0]))
        ]

    ultimos_feedbacks = []
    if not feedbacks.empty:
        colunas = [coluna for coluna in ["timestamp", "response_id", "useful", "comment"] if coluna in feedbacks.columns]
        ultimos_feedbacks = feedbacks[colunas].tail(10).to_dict(orient="records")

    return {
        "total_eventos": int(len(df)),
        "total_interacoes": int(len(interacoes)),
        "total_feedbacks": int(len(feedbacks)),
        "taxa_feedback_positivo": (positivos / len(feedbacks)) if len(feedbacks) else 0.0,
        "por_intencao": por_intencao,
        "por_idioma": por_idioma,
        "ultimos_feedbacks": ultimos_feedbacks,
        "eventos": eventos,
    }