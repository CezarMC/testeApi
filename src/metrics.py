from __future__ import annotations

from datetime import date, timedelta
import random

import pandas as pd


METRIC_COLUMNS = [
	"data",
	"plataforma",
	"campanha",
	"impressoes",
	"cliques",
	"investimento",
	"conversoes",
]


def _normalizar_dataframe_e_relatorio(df: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, float]]:
	out = df.copy()
	out.columns = [str(col).strip().lower() for col in out.columns]

	missing = [col for col in METRIC_COLUMNS if col not in out.columns]
	if missing:
		raise ValueError(
			"O CSV precisa conter as colunas: " + ", ".join(METRIC_COLUMNS)
		)

	out = out[METRIC_COLUMNS].copy()
	linhas_entrada = float(len(out))

	duplicadas_antes = float(out.duplicated().sum())
	out = out.drop_duplicates().copy()

	out["data"] = pd.to_datetime(out["data"], errors="coerce").dt.date
	out["plataforma"] = out["plataforma"].astype(str).str.strip()
	out["campanha"] = out["campanha"].astype(str).str.strip()

	for coluna in ["impressoes", "cliques", "investimento", "conversoes"]:
		out[coluna] = pd.to_numeric(out[coluna], errors="coerce")

	nulos_numericos = float(out[["impressoes", "cliques", "investimento", "conversoes"]].isna().sum().sum())
	out[["impressoes", "cliques", "investimento", "conversoes"]] = out[
		["impressoes", "cliques", "investimento", "conversoes"]
	].fillna(0)

	negativos = float((out[["impressoes", "cliques", "investimento", "conversoes"]] < 0).sum().sum())
	out[["impressoes", "cliques", "investimento", "conversoes"]] = out[
		["impressoes", "cliques", "investimento", "conversoes"]
	].clip(lower=0)

	invalidas_data = float(out["data"].isna().sum())
	invalidas_texto = float(((out["plataforma"] == "") | (out["campanha"] == "")).sum())
	out = out.dropna(subset=["data"])
	out = out[(out["plataforma"] != "") & (out["campanha"] != "")]

	linhas_saida = float(len(out))
	relatorio = {
		"linhas_entrada": linhas_entrada,
		"linhas_saida": linhas_saida,
		"linhas_removidas": linhas_entrada - linhas_saida,
		"duplicadas_removidas": duplicadas_antes,
		"valores_nulos_numericos": nulos_numericos,
		"valores_negativos_ajustados": negativos,
		"linhas_data_invalida_removidas": invalidas_data,
		"linhas_texto_invalido_removidas": invalidas_texto,
	}

	return enriquecer_metricas(out), relatorio


def gerar_dados_demo(dias: int = 14) -> pd.DataFrame:
	campanhas = {
		"Meta": ["Campanha Leads", "Campanha Remarketing"],
		"Google": ["Pesquisa Marca", "Performance Max"],
	}
	hoje = date.today()
	linhas: list[dict[str, object]] = []
	random.seed(42)

	for plataforma, nomes in campanhas.items():
		for nome in nomes:
			for indice in range(dias):
				dia = hoje - timedelta(days=(dias - indice - 1))
				impressoes = random.randint(1200, 12000)
				cliques = random.randint(40, 420)
				investimento = round(random.uniform(35, 420), 2)
				conversoes = round(random.uniform(1, 24), 2)
				linhas.append(
					{
						"data": dia,
						"plataforma": plataforma,
						"campanha": nome,
						"impressoes": impressoes,
						"cliques": cliques,
						"investimento": investimento,
						"conversoes": conversoes,
					}
				)

	df = pd.DataFrame(linhas)
	return enriquecer_metricas(df)


def normalizar_dataframe(df: pd.DataFrame) -> pd.DataFrame:
	out, _ = _normalizar_dataframe_e_relatorio(df)
	return out


def normalizar_dataframe_com_relatorio(df: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, float]]:
	return _normalizar_dataframe_e_relatorio(df)


def enriquecer_metricas(df: pd.DataFrame) -> pd.DataFrame:
	out = df.copy()
	out["ctr"] = out.apply(
		lambda row: (row["cliques"] / row["impressoes"] * 100) if row["impressoes"] else 0,
		axis=1,
	)
	out["cpc"] = out.apply(
		lambda row: (row["investimento"] / row["cliques"]) if row["cliques"] else 0,
		axis=1,
	)
	out["cpa"] = out.apply(
		lambda row: (row["investimento"] / row["conversoes"]) if row["conversoes"] else 0,
		axis=1,
	)
	return out


def consolidar_resumo(df: pd.DataFrame) -> dict[str, float]:
	impressoes = float(df["impressoes"].sum())
	cliques = float(df["cliques"].sum())
	investimento = float(df["investimento"].sum())
	conversoes = float(df["conversoes"].sum())
	ctr = (cliques / impressoes * 100) if impressoes else 0
	cpc = (investimento / cliques) if cliques else 0
	cpa = (investimento / conversoes) if conversoes else 0
	return {
		"impressoes": impressoes,
		"cliques": cliques,
		"investimento": investimento,
		"conversoes": conversoes,
		"ctr": ctr,
		"cpc": cpc,
		"cpa": cpa,
	}
