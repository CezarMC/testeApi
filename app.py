from __future__ import annotations

import io
from dataclasses import dataclass

import pandas as pd
import plotly.express as px
import streamlit as st


st.set_page_config(page_title="Estudo de Metricas Meta", page_icon="MA", layout="wide")


@dataclass
class MetaColumns:
    data: str = "data"
    campanha: str = "campanha"
    conjunto: str = "conjunto"
    anuncio: str = "anuncio"
    impressoes: str = "impressoes"
    cliques: str = "cliques"
    investimento: str = "investimento"
    resultados: str = "resultados"


COLS = MetaColumns()


EXEMPLO_CSV = """data,campanha,conjunto,anuncio,impressoes,cliques,investimento,resultados
2026-03-01,Campanha Conversao A,Conjunto 1,Anuncio Video 1,12000,420,180.50,32
2026-03-01,Campanha Conversao A,Conjunto 2,Anuncio Carrossel 1,9000,260,140.00,18
2026-03-02,Campanha Conversao B,Conjunto 1,Anuncio Imagem 1,15000,390,210.80,28
2026-03-02,Campanha Conversao B,Conjunto 2,Anuncio Video 2,11000,300,165.40,21
2026-03-03,Campanha Conversao C,Conjunto 1,Anuncio Imagem 2,13000,320,190.00,24
"""


def _normalizar_colunas(df: pd.DataFrame) -> pd.DataFrame:
    mapeamento = {
        "date": COLS.data,
        "campaign": COLS.campanha,
        "adset": COLS.conjunto,
        "ad_set": COLS.conjunto,
        "ad": COLS.anuncio,
        "impressions": COLS.impressoes,
        "clicks": COLS.cliques,
        "spend": COLS.investimento,
        "amount_spent": COLS.investimento,
        "results": COLS.resultados,
        "conversions": COLS.resultados,
    }

    novos = []
    for coluna in df.columns:
        chave = str(coluna).strip().lower()
        novos.append(mapeamento.get(chave, chave))

    df.columns = novos
    return df


def _limpar_dados(df: pd.DataFrame) -> pd.DataFrame:
    obrigatorias = [
        COLS.data,
        COLS.campanha,
        COLS.impressoes,
        COLS.cliques,
        COLS.investimento,
        COLS.resultados,
    ]

    faltando = [c for c in obrigatorias if c not in df.columns]
    if faltando:
        raise ValueError(f"Colunas obrigatorias ausentes: {', '.join(faltando)}")

    if COLS.conjunto not in df.columns:
        df[COLS.conjunto] = "(sem conjunto)"
    if COLS.anuncio not in df.columns:
        df[COLS.anuncio] = "(sem anuncio)"

    df[COLS.data] = pd.to_datetime(df[COLS.data], errors="coerce")
    df = df.dropna(subset=[COLS.data]).copy()

    for coluna in [COLS.impressoes, COLS.cliques, COLS.investimento, COLS.resultados]:
        df[coluna] = pd.to_numeric(df[coluna], errors="coerce").fillna(0)
        df[coluna] = df[coluna].clip(lower=0)

    return df


def _enriquecer_metricas(df: pd.DataFrame) -> pd.DataFrame:
    saida = df.copy()
    saida["ctr"] = (saida[COLS.cliques] / saida[COLS.impressoes].replace(0, pd.NA)) * 100
    saida["cpc"] = saida[COLS.investimento] / saida[COLS.cliques].replace(0, pd.NA)
    saida["cpm"] = (saida[COLS.investimento] / saida[COLS.impressoes].replace(0, pd.NA)) * 1000
    saida["cpa"] = saida[COLS.investimento] / saida[COLS.resultados].replace(0, pd.NA)
    saida = saida.fillna(0)
    return saida


def _resumo(df: pd.DataFrame) -> dict[str, float]:
    investimento = float(df[COLS.investimento].sum())
    impressoes = float(df[COLS.impressoes].sum())
    cliques = float(df[COLS.cliques].sum())
    resultados = float(df[COLS.resultados].sum())

    ctr = (cliques / impressoes * 100) if impressoes else 0.0
    cpc = (investimento / cliques) if cliques else 0.0
    cpa = (investimento / resultados) if resultados else 0.0

    return {
        "investimento": investimento,
        "impressoes": impressoes,
        "cliques": cliques,
        "resultados": resultados,
        "ctr": ctr,
        "cpc": cpc,
        "cpa": cpa,
    }


def _insights(df: pd.DataFrame) -> list[str]:
    mensagens: list[str] = []

    agrupado = (
        df.groupby(COLS.campanha, as_index=False)[[COLS.investimento, COLS.resultados, COLS.cliques, COLS.impressoes]].sum()
    )
    agrupado["ctr"] = (agrupado[COLS.cliques] / agrupado[COLS.impressoes].replace(0, pd.NA)) * 100
    agrupado["cpa"] = agrupado[COLS.investimento] / agrupado[COLS.resultados].replace(0, pd.NA)
    agrupado = agrupado.fillna(0)

    if not agrupado.empty:
        melhor = agrupado.sort_values("cpa", ascending=True).iloc[0]
        pior = agrupado.sort_values("cpa", ascending=False).iloc[0]

        mensagens.append(
            f"Melhor campanha por custo por resultado: {melhor[COLS.campanha]} (CPA R$ {melhor['cpa']:.2f})."
        )
        mensagens.append(
            f"Pior campanha por custo por resultado: {pior[COLS.campanha]} (CPA R$ {pior['cpa']:.2f})."
        )

        ctr_med = float(agrupado["ctr"].median())
        ctr_baixo = agrupado[agrupado["ctr"] < ctr_med * 0.7]
        if not ctr_baixo.empty:
            nomes = ", ".join(ctr_baixo[COLS.campanha].head(3).astype(str).tolist())
            mensagens.append(f"Campanhas com CTR abaixo do esperado: {nomes}. Considere revisar criativo e segmentacao.")

        sem_resultado = agrupado[(agrupado[COLS.investimento] > 0) & (agrupado[COLS.resultados] == 0)]
        if not sem_resultado.empty:
            nomes = ", ".join(sem_resultado[COLS.campanha].head(3).astype(str).tolist())
            mensagens.append(f"Campanhas com gasto sem resultados: {nomes}. Recomenda-se pausar e reestruturar.")

    if not mensagens:
        mensagens.append("Dados insuficientes para insights automaticos.")

    return mensagens


st.title("App de Estudo de Metricas do Meta")
st.caption("Importe seu CSV e analise desempenho por periodo, campanha, conjunto e anuncio.")

with st.sidebar:
    st.subheader("Entrada de dados")
    arquivo = st.file_uploader("Importar CSV de metricas", type=["csv"])
    st.download_button(
        label="Baixar CSV de exemplo",
        data=EXEMPLO_CSV.encode("utf-8"),
        file_name="meta_exemplo.csv",
        mime="text/csv",
    )
    usar_demo = st.toggle("Usar base de exemplo", value=arquivo is None)

if arquivo is not None:
    dados_raw = pd.read_csv(arquivo)
elif usar_demo:
    dados_raw = pd.read_csv(io.StringIO(EXEMPLO_CSV))
else:
    st.info("Importe um CSV ou ative a base de exemplo para iniciar a analise.")
    st.stop()

try:
    dados_raw = _normalizar_colunas(dados_raw)
    dados_limpos = _limpar_dados(dados_raw)
    dados = _enriquecer_metricas(dados_limpos)
except Exception as exc:
    st.error(f"Falha ao processar os dados: {exc}")
    st.stop()

st.subheader("Filtros")
col_f1, col_f2, col_f3 = st.columns(3)

with col_f1:
    campanhas = sorted(dados[COLS.campanha].dropna().astype(str).unique().tolist())
    filtro_campanhas = st.multiselect("Campanhas", options=campanhas, default=campanhas)

with col_f2:
    conjuntos = sorted(dados[COLS.conjunto].dropna().astype(str).unique().tolist())
    filtro_conjuntos = st.multiselect("Conjuntos", options=conjuntos, default=conjuntos)

with col_f3:
    data_min = dados[COLS.data].min().date()
    data_max = dados[COLS.data].max().date()
    periodo = st.date_input("Periodo", value=(data_min, data_max), min_value=data_min, max_value=data_max)

if isinstance(periodo, tuple) and len(periodo) == 2:
    inicio, fim = periodo
else:
    inicio, fim = data_min, data_max

filtro = (
    dados[COLS.campanha].astype(str).isin(filtro_campanhas)
    & dados[COLS.conjunto].astype(str).isin(filtro_conjuntos)
    & (dados[COLS.data].dt.date >= inicio)
    & (dados[COLS.data].dt.date <= fim)
)

df = dados[filtro].copy()

if df.empty:
    st.warning("Nenhum dado encontrado com os filtros selecionados.")
    st.stop()

res = _resumo(df)

st.subheader("Visao geral")
k1, k2, k3, k4, k5, k6, k7 = st.columns(7)
k1.metric("Investimento", f"R$ {res['investimento']:,.2f}")
k2.metric("Impressoes", f"{int(res['impressoes']):,}")
k3.metric("Cliques", f"{int(res['cliques']):,}")
k4.metric("Resultados", f"{int(res['resultados']):,}")
k5.metric("CTR", f"{res['ctr']:.2f}%")
k6.metric("CPC", f"R$ {res['cpc']:.2f}")
k7.metric("CPA", f"R$ {res['cpa']:.2f}")

col_g1, col_g2 = st.columns(2)

with col_g1:
    serie = df.groupby(COLS.data, as_index=False)[[COLS.investimento, COLS.resultados]].sum()
    fig = px.line(
        serie,
        x=COLS.data,
        y=[COLS.investimento, COLS.resultados],
        markers=True,
        title="Investimento e resultados ao longo do tempo",
    )
    st.plotly_chart(fig, width="stretch")

with col_g2:
    camp = df.groupby(COLS.campanha, as_index=False)[[COLS.investimento, COLS.resultados]].sum()
    camp["cpa"] = camp[COLS.investimento] / camp[COLS.resultados].replace(0, pd.NA)
    camp = camp.fillna(0).sort_values("cpa", ascending=True)
    fig = px.bar(
        camp,
        x=COLS.campanha,
        y="cpa",
        color=COLS.campanha,
        title="CPA por campanha",
    )
    st.plotly_chart(fig, width="stretch")

st.subheader("Tabela detalhada")
exibir = df[[
    COLS.data,
    COLS.campanha,
    COLS.conjunto,
    COLS.anuncio,
    COLS.impressoes,
    COLS.cliques,
    COLS.investimento,
    COLS.resultados,
    "ctr",
    "cpc",
    "cpm",
    "cpa",
]].copy()

exibir = exibir.sort_values(COLS.data, ascending=False)
exibir[COLS.data] = exibir[COLS.data].dt.strftime("%Y-%m-%d")
st.dataframe(exibir, width="stretch")

st.subheader("Diagnostico rapido")
for item in _insights(df):
    st.markdown(f"- {item}")
