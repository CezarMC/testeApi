from __future__ import annotations

from pathlib import Path
import re

import pandas as pd


MARKETING_TERMS = [
    "campanha",
    "meta ads",
    "google ads",
    "anuncio",
    "anúncio",
    "lead",
    "venda",
    "funil",
    "convers",
    "ctr",
    "cpa",
    "trafego",
    "tráfego",
    "cliente",
    "briefing",
    "demanda",
    "métrica",
    "metrica",
]


INTENT_RULES: dict[str, list[str]] = {
    "small_talk": [
        "meu nome e",
        "me chamo",
        "pode me chamar de",
        "sou o",
        "sou a",
        "como foi seu dia",
        "como esta seu dia",
        "como foi o dia",
        "oi",
        "ola",
        "olá",
        "tudo bem",
        "how was your day",
        "how is your day",
        "hi",
        "hello",
        "how are you",
        "como fue tu dia",
        "como esta tu dia",
        "hola",
        "que tal",
        "como estas",
        "你好",
        "最近怎么样",
    ],
    "client_case": ["cliente", "pedido", "briefing", "demanda"],
    "ctr": ["ctr", "taxa de clique", "clique", "click-through rate"],
    "conversion": [
        "conversao",
        "conversoes",
        "conversion",
        "conversions",
        "conversiones",
        "lead",
        "leads",
        "venda",
        "vendas",
        "sales",
        "ventas",
    ],
    "platform": ["meta", "google", "plataforma"],
    "next_step": ["o que fazer", "proximo passo", "melhorar", "otimizar"],
}


def _contem_termo(texto: str, termo: str) -> bool:
    if any("\u4e00" <= caractere <= "\u9fff" for caractere in termo):
        return termo in texto

    termo_escapado = re.escape(termo)
    padrao = rf"(?<!\w){termo_escapado}(?!\w)"
    return re.search(padrao, texto, flags=re.IGNORECASE) is not None


def eh_tema_marketing(pergunta_lower: str) -> bool:
    return any(_contem_termo(pergunta_lower, termo) for termo in MARKETING_TERMS)


def classificar_intencao(pergunta: str, idioma: str) -> str:
    pergunta_lower = pergunta.lower().strip()

    for intencao, palavras in INTENT_RULES.items():
        if any(_contem_termo(pergunta_lower, palavra) for palavra in palavras):
            return intencao

    if idioma == "pt" and not eh_tema_marketing(pergunta_lower):
        return "general_chat"

    return "default_marketing"


def avaliar_intencoes_dataframe(df: pd.DataFrame) -> dict[str, object]:
    colunas_esperadas = {"texto", "idioma", "intencao_esperada"}
    if not colunas_esperadas.issubset(df.columns):
        raise ValueError("O dataset de avaliacao precisa conter: texto, idioma, intencao_esperada")

    base = df.copy()
    base["intencao_prevista"] = base.apply(
        lambda row: classificar_intencao(str(row["texto"]), str(row["idioma"])),
        axis=1,
    )
    base["acerto"] = base["intencao_prevista"] == base["intencao_esperada"]

    total = int(len(base))
    acertos = int(base["acerto"].sum())
    erros = base.loc[~base["acerto"], ["texto", "idioma", "intencao_esperada", "intencao_prevista"]]
    por_intencao = (
        base.groupby("intencao_esperada", as_index=False)
        .agg(total=("texto", "count"), acertos=("acerto", "sum"))
        .sort_values("intencao_esperada")
    )
    por_intencao["acuracia"] = por_intencao.apply(
        lambda row: (float(row["acertos"]) / float(row["total"])) if row["total"] else 0.0,
        axis=1,
    )
    matriz_confusao = pd.crosstab(
        base["intencao_esperada"],
        base["intencao_prevista"],
        dropna=False,
    ).reset_index()

    return {
        "total": total,
        "acertos": acertos,
        "acuracia": (acertos / total) if total else 0.0,
        "erros": erros.to_dict(orient="records"),
        "por_intencao": por_intencao.to_dict(orient="records"),
        "matriz_confusao": matriz_confusao.to_dict(orient="records"),
    }


def avaliar_intencoes_csv(csv_path: str | Path) -> dict[str, object]:
    df = pd.read_csv(csv_path)
    return avaliar_intencoes_dataframe(df)