from __future__ import annotations

import json
from typing import Generator, Iterable

import pandas as pd
import requests

from src.chat_engine import PerfilUsuario, detectar_idioma, montar_contexto_metricas
from src.runtime_config import RuntimeConfig


def _normalizar_historico(historico: Iterable[dict[str, str]], limite: int = 8) -> list[dict[str, str]]:
    itens = [item for item in historico if item.get("role") in {"user", "assistant"}]
    return itens[-limite:]


def _prompt_sistema(perfil: PerfilUsuario, contexto_metricas: str, idioma: str) -> str:
    idioma_nome = {
        "pt": "portugues",
        "en": "english",
        "es": "espanol",
        "zh": "chinese",
    }.get(idioma, "portugues")

    contexto_cliente = (
        f"Cliente: {perfil.cliente_nome or 'nao informado'} | "
        f"Nicho: {perfil.cliente_nicho or 'nao informado'} | "
        f"Objetivo do cliente: {perfil.cliente_objetivo or 'nao informado'} | "
        f"Pedido atual: {perfil.cliente_pedido or 'nao informado'} | "
        f"Restricoes: {perfil.cliente_restricoes or 'nao informado'}"
    )

    return (
        "Voce e uma assistente de marketing digital, consultiva, objetiva e orientada a acao. "
        f"Responda no idioma {idioma_nome}. "
        f"Tom preferido: {perfil.tom}. "
        f"Usuario: {perfil.nome or 'nao informado'}. Objetivo do usuario: {perfil.objetivo or 'nao informado'}. "
        "Priorize respostas praticas em passos curtos, com foco em decisao de campanha. "
        "Nao invente dados. Se faltar contexto, assuma isso e proponha a proxima pergunta. "
        f"Contexto de metricas: {contexto_metricas} "
        f"Contexto de cliente: {contexto_cliente}"
    )


def _parsear_resposta(payload: dict) -> str:
    choices = payload.get("choices", [])
    if not choices:
        raise ValueError("Resposta da API sem campo choices.")

    message = choices[0].get("message", {})
    content = message.get("content", "")
    if isinstance(content, list):
        trechos = [item.get("text", "") for item in content if isinstance(item, dict)]
        conteudo = "\n".join([trecho for trecho in trechos if trecho.strip()])
        if conteudo.strip():
            return conteudo.strip()
    if isinstance(content, str) and content.strip():
        return content.strip()

    raise ValueError("Resposta da API sem conteudo textual utilizavel.")


def gerar_resposta_llm(
    pergunta: str,
    perfil: PerfilUsuario,
    df: pd.DataFrame | None,
    historico: Iterable[dict[str, str]],
    config: RuntimeConfig,
) -> str:
    if not config.llm_api_key.strip():
        raise ValueError("LLM_API_KEY nao configurada.")

    idioma = detectar_idioma(pergunta)
    contexto_metricas = montar_contexto_metricas(df, idioma)
    system_prompt = _prompt_sistema(perfil, contexto_metricas, idioma)

    mensagens = [{"role": "system", "content": system_prompt}]
    for item in _normalizar_historico(historico, limite=8):
        mensagens.append({"role": item["role"], "content": item["content"]})
    mensagens.append({"role": "user", "content": pergunta})

    headers = {
        "Authorization": f"Bearer {config.llm_api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": config.llm_model,
        "messages": mensagens,
        "temperature": config.llm_temperature,
        "max_tokens": config.llm_max_tokens,
    }

    resposta = requests.post(
        config.llm_api_base_url,
        headers=headers,
        json=body,
        timeout=config.llm_timeout_seconds,
    )
    if resposta.status_code >= 400:
        raise ValueError(f"Erro da API LLM: HTTP {resposta.status_code} - {resposta.text[:300]}")

    return _parsear_resposta(resposta.json())


def stream_resposta_llm(
    pergunta: str,
    perfil: PerfilUsuario,
    df: pd.DataFrame | None,
    historico: Iterable[dict[str, str]],
    config: RuntimeConfig,
) -> Generator[str, None, None]:
    """Versao streaming: yield de fragmentos de texto conforme chegam da API."""
    if not config.llm_api_key.strip():
        raise ValueError("LLM_API_KEY nao configurada.")

    idioma = detectar_idioma(pergunta)
    contexto_metricas = montar_contexto_metricas(df, idioma)
    system_prompt = _prompt_sistema(perfil, contexto_metricas, idioma)

    mensagens: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
    for item in _normalizar_historico(historico, limite=8):
        mensagens.append({"role": item["role"], "content": item["content"]})
    mensagens.append({"role": "user", "content": pergunta})

    headers = {
        "Authorization": f"Bearer {config.llm_api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": config.llm_model,
        "messages": mensagens,
        "temperature": config.llm_temperature,
        "max_tokens": config.llm_max_tokens,
        "stream": True,
    }

    with requests.post(
        config.llm_api_base_url,
        headers=headers,
        json=body,
        timeout=config.llm_timeout_seconds,
        stream=True,
    ) as resposta:
        if resposta.status_code >= 400:
            raise ValueError(f"Erro da API LLM: HTTP {resposta.status_code} - {resposta.text[:300]}")

        for linha in resposta.iter_lines():
            if not linha:
                continue
            decoded = linha.decode("utf-8") if isinstance(linha, bytes) else linha
            if not decoded.startswith("data: "):
                continue
            data = decoded[6:]
            if data.strip() == "[DONE]":
                break
            try:
                chunk = json.loads(data)
                delta = chunk["choices"][0]["delta"].get("content", "")
                if delta:
                    yield delta
            except (json.JSONDecodeError, KeyError, IndexError):
                continue