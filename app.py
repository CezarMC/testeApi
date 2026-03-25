from __future__ import annotations

import json
import uuid
from datetime import datetime
from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st

from src.chat_engine import (
    PerfilUsuario,
    detectar_idioma,
    extrair_nome_da_conversa,
    extrair_objetivo_da_conversa,
    gerar_resposta_marketing,
    montar_saudacao_inicial,
)
from src.intent_engine import avaliar_intencoes_csv, avaliar_intencoes_dataframe, classificar_intencao
from src.llm_engine import gerar_resposta_llm, stream_resposta_llm
from src.monitoring import registrar_evento, resumir_eventos
from src.metrics import consolidar_resumo, gerar_dados_demo, normalizar_dataframe_com_relatorio
from src.runtime_config import load_runtime_config
from src.voice_ui import render_tts_button, render_voice_widget


RUNTIME_CONFIG = load_runtime_config()
MEMORY_FILE = Path(RUNTIME_CONFIG.memory_file_path)
INTENT_EVAL_FILE = Path(RUNTIME_CONFIG.validation_file_path)
MONITORING_FILE = Path(RUNTIME_CONFIG.monitoring_file_path)


st.set_page_config(page_title=RUNTIME_CONFIG.app_title, page_icon="IM", layout="wide")

st.markdown(
    """
    <style>
            :root {
                --bg-dark: #6d3d58;
                --bg-mid: #8f5575;
                --panel: rgba(255, 244, 249, 0.92);
                --panel-strong: rgba(255, 248, 251, 0.98);
                --text-dark: #4f2640;
                --text-light: #fff8fc;
                --accent: #f29ac2;
                --accent-soft: #ffd2e6;
                --line: rgba(255, 255, 255, 0.15);
            }
      .stApp {
        background:
                    radial-gradient(circle at top left, rgba(255, 210, 230, 0.35), transparent 24%),
                    radial-gradient(circle at bottom right, rgba(242, 154, 194, 0.20), transparent 22%),
                    linear-gradient(180deg, var(--bg-mid) 0%, var(--bg-dark) 100%);
                color: var(--text-light);
            }
            [data-testid="stHeader"] {
                background: transparent;
            }
            [data-testid="stSidebar"] {
                background: linear-gradient(180deg, #9b5f82 0%, #6d3d58 100%);
                border-right: 1px solid var(--line);
            }
            [data-testid="stSidebar"] * {
                color: #fff8fc;
            }
            [data-testid="stMetric"] {
                background: var(--panel);
                border: 1px solid rgba(162, 94, 132, 0.18);
                padding: 10px 12px;
                border-radius: 18px;
                box-shadow: 0 10px 24px rgba(0, 0, 0, 0.10);
            }
            [data-testid="stMetric"] * {
                color: var(--text-dark) !important;
            }
            [data-testid="stMetricLabel"],
            [data-testid="stMetricValue"] {
                color: var(--text-dark) !important;
            }
            [data-testid="stMetricLabel"] p,
            [data-testid="stMetricValue"] div,
            [data-testid="stMetricDelta"] div,
            [data-testid="stMetricDelta"] svg {
                color: var(--text-dark) !important;
                fill: var(--text-dark) !important;
            }
            [data-baseweb="tab-list"] {
                gap: 8px;
            }
            button[role="tab"] {
                background: rgba(255, 255, 255, 0.08);
                border-radius: 999px;
                color: var(--text-light);
                border: 1px solid rgba(255,255,255,0.08);
            }
            button[role="tab"][aria-selected="true"] {
                                background: rgba(242, 154, 194, 0.26);
                                border-color: rgba(255, 210, 230, 0.45);
      }
      .hero {
        padding: 24px 28px;
        border-radius: 24px;
                                background: linear-gradient(135deg, rgba(170, 98, 137, 0.96), rgba(235, 167, 203, 0.92));
                color: var(--text-light);
                border: 1px solid rgba(255,255,255,0.09);
                                box-shadow: 0 18px 40px rgba(120, 58, 90, 0.28);
        margin-bottom: 18px;
      }
      .hero h1 {
        font-family: Georgia, serif;
        font-size: 40px;
        margin: 0 0 8px 0;
      }
      .hero p {
        font-size: 16px;
        margin: 0;
                color: #fff4fa;
      }
      .note {
        padding: 14px 16px;
        border-radius: 16px;
                background: var(--panel);
                border: 1px solid rgba(173, 103, 141, 0.16);
                color: var(--text-dark);
                box-shadow: 0 12px 28px rgba(120, 58, 90, 0.12);
            }
            .note * {
                color: var(--text-dark) !important;
            }
            [data-testid="stDataFrame"],
            [data-testid="stPlotlyChart"],
            [data-testid="stChatMessage"] {
                background: transparent;
            }
            [data-testid="stDataFrame"] * {
                color: var(--text-dark) !important;
            }
            [data-testid="stTable"] * {
                color: var(--text-dark) !important;
            }
            [data-testid="stMarkdownContainer"],
            .stCaption {
                color: var(--text-light);
            }
            [data-testid="stNumberInput"] input,
            [data-testid="stTextInput"] input,
            [data-testid="stTextArea"] textarea,
            [data-baseweb="select"] > div,
            [data-testid="stFileUploaderDropzone"] {
                background: rgba(255, 248, 251, 0.96) !important;
                color: var(--text-dark) !important;
                border-color: rgba(173, 103, 141, 0.18) !important;
            }
            [data-testid="stNumberInput"] input::placeholder,
            [data-testid="stTextInput"] input::placeholder,
            [data-testid="stTextArea"] textarea::placeholder {
                color: rgba(79, 38, 64, 0.65) !important;
            }
            [data-testid="stSelectbox"] label,
            [data-testid="stTextInput"] label,
            [data-testid="stTextArea"] label,
            [data-testid="stFileUploader"] label,
            [data-testid="stCheckbox"] label,
            [data-testid="stToggle"] label {
                                color: #fff8fc;
      }
    </style>
    <div class="hero">
            <h1>IA de Marketing em Portugues</h1>
      <p>Uma primeira versao local, segura e humana para conversar sobre marketing digital, visualizar metricas e testar voz no navegador.</p>
    </div>
    """,
    unsafe_allow_html=True,
)


def carregar_memoria() -> dict:
    if MEMORY_FILE.exists():
        dados = json.loads(MEMORY_FILE.read_text(encoding="utf-8"))
        dados.setdefault("nome", "")
        dados.setdefault("objetivo", "")
        dados.setdefault("historico", [])
        dados.setdefault("conversas_arquivadas", [])
        dados.setdefault("conversa_atual_titulo", "Conversa atual")
        dados.setdefault("cliente_nome", "")
        dados.setdefault("cliente_nicho", "")
        dados.setdefault("cliente_objetivo", "")
        dados.setdefault("cliente_pedido", "")
        dados.setdefault("cliente_restricoes", "")
        return dados
    return {
        "nome": "",
        "objetivo": "",
        "historico": [],
        "conversas_arquivadas": [],
        "conversa_atual_titulo": "Conversa atual",
        "cliente_nome": "",
        "cliente_nicho": "",
        "cliente_objetivo": "",
        "cliente_pedido": "",
        "cliente_restricoes": "",
    }



def salvar_memoria(dados: dict) -> None:
    MEMORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    MEMORY_FILE.write_text(json.dumps(dados, ensure_ascii=False, indent=2), encoding="utf-8")



def limpar_historico() -> None:
    dados = carregar_memoria()
    dados["historico"] = []
    dados["conversa_atual_titulo"] = "Conversa atual"
    salvar_memoria(dados)


def arquivar_historico() -> bool:
    dados = carregar_memoria()
    historico = dados.get("historico", [])
    if not historico:
        return False

    titulo_base = historico[0]["content"][:60] if historico and historico[0].get("content") else "Conversa"
    dados.setdefault("conversas_arquivadas", [])
    dados["conversas_arquivadas"].insert(
        0,
        {
            "titulo": titulo_base,
            "criado_em": datetime.now().strftime("%d/%m/%Y %H:%M"),
            "mensagens": historico,
            "resumo": gerar_resumo_conversa(dados),
        },
    )
    dados["historico"] = []
    dados["conversa_atual_titulo"] = "Conversa atual"
    salvar_memoria(dados)
    return True


def aprender_preferencias(memoria: dict, texto: str) -> None:
    nome_extraido = extrair_nome_da_conversa(texto)
    objetivo_extraido = extrair_objetivo_da_conversa(texto)

    if nome_extraido:
        memoria["nome"] = nome_extraido
    if objetivo_extraido:
        memoria["objetivo"] = objetivo_extraido


def gerar_resumo_conversa(memoria: dict) -> str:
    partes: list[str] = []
    nome = memoria.get("nome", "").strip()
    objetivo = memoria.get("objetivo", "").strip()
    cliente_nome = memoria.get("cliente_nome", "").strip()
    cliente_pedido = memoria.get("cliente_pedido", "").strip()
    historico = memoria.get("historico", [])
    ultimas_mensagens_usuario = [item.get("content", "") for item in historico if item.get("role") == "user"][-2:]

    if nome:
        partes.append(f"Pessoa identificada: {nome}.")
    if objetivo:
        partes.append(f"Objetivo aprendido: {objetivo}.")
    if cliente_nome:
        partes.append(f"Cliente em foco: {cliente_nome}.")
    if cliente_pedido:
        partes.append(f"Pedido registrado: {cliente_pedido[:140]}.")
    if ultimas_mensagens_usuario:
        partes.append("Ultimos temas: " + " | ".join(ultimas_mensagens_usuario))

    return " ".join(partes) if partes else "Conversa arquivada sem resumo adicional."


if "memoria" not in st.session_state:
    st.session_state.memoria = carregar_memoria()
if "dados_metricas" not in st.session_state:
    st.session_state.dados_metricas = gerar_dados_demo()
if "ultima_resposta" not in st.session_state:
    st.session_state.ultima_resposta = ""
if "ultimo_idioma" not in st.session_state:
    st.session_state.ultimo_idioma = "pt-BR"
if "relatorio_qualidade" not in st.session_state:
    st.session_state.relatorio_qualidade = {}
if "ultima_resposta_id" not in st.session_state:
    st.session_state.ultima_resposta_id = ""
if "feedback_enviado_ids" not in st.session_state:
    st.session_state.feedback_enviado_ids = []


with st.sidebar:
    st.header("Controle do assistente")
    with st.expander("Status de implantacao"):
        st.caption(f"Ambiente: {RUNTIME_CONFIG.app_env}")
        st.caption(f"Dados demo habilitados por padrao: {'sim' if RUNTIME_CONFIG.enable_demo_data else 'nao'}")
        st.caption(f"Memoria local habilitada por padrao: {'sim' if RUNTIME_CONFIG.enable_local_memory else 'nao'}")
        st.caption(f"Meta Ads configurado: {'sim' if RUNTIME_CONFIG.meta_ads_enabled else 'nao'}")
        st.caption(f"Google Ads configurado: {'sim' if RUNTIME_CONFIG.google_ads_enabled else 'nao'}")
        st.caption(f"LLM externo configurado: {'sim' if RUNTIME_CONFIG.external_llm_enabled else 'nao'}")
        st.caption(f"Modelo LLM: {RUNTIME_CONFIG.llm_model}")
        st.caption(f"Chave de API configurada: {'sim' if bool(RUNTIME_CONFIG.llm_api_key.strip()) else 'nao'}")

    st.subheader("Memoria aprendida")
    nome_aprendido = st.session_state.memoria.get("nome", "").strip()
    objetivo_aprendido = st.session_state.memoria.get("objetivo", "").strip()
    if nome_aprendido:
        st.caption(f"Nome lembrado: {nome_aprendido}")
    else:
        st.caption("Ainda nao aprendi seu nome. Pode me contar isso naturalmente na conversa.")
    if objetivo_aprendido:
        st.caption(f"Objetivo lembrado: {objetivo_aprendido}")
    else:
        st.caption("Seu objetivo principal tambem pode ser aprendido no papo, sem formulario.")
    if st.button("Limpar memoria aprendida"):
        st.session_state.memoria["nome"] = ""
        st.session_state.memoria["objetivo"] = ""
        salvar_memoria(st.session_state.memoria)
        st.success("Memoria aprendida limpa.")

    st.subheader("Cliente em analise")
    st.caption("Opcional: voce pode preencher aqui ou simplesmente explicar o caso na conversa.")
    cliente_nome = st.text_input(
        "Nome do cliente final",
        value=st.session_state.memoria.get("cliente_nome", ""),
    )
    cliente_nicho = st.text_input(
        "Nicho ou segmento",
        value=st.session_state.memoria.get("cliente_nicho", ""),
    )
    cliente_objetivo = st.text_area(
        "Objetivo do cliente",
        value=st.session_state.memoria.get("cliente_objetivo", ""),
        height=70,
    )
    cliente_pedido = st.text_area(
        "Pedido ou problema trazido pelo cliente",
        value=st.session_state.memoria.get("cliente_pedido", ""),
        height=90,
        help="Exemplo: o cliente quer mais leads sem subir custo, ou quer entender a metrica do dia.",
    )
    cliente_restricoes = st.text_area(
        "Restricoes, contexto ou cuidados",
        value=st.session_state.memoria.get("cliente_restricoes", ""),
        height=80,
    )
    tom_conversa = st.selectbox(
        "Estilo da conversa",
        options=["consultivo", "acolhedor", "direto", "animado"],
        index=0,
        help="Define a personalidade da resposta em texto e voz.",
    )
    memorizar = st.checkbox(
        "Permitir memorizar preferencias localmente",
        value=RUNTIME_CONFIG.enable_local_memory,
    )
    usar_demo = st.toggle("Modo demonstracao", value=RUNTIME_CONFIG.enable_demo_data)
    mute_ia = st.checkbox("Iniciar com voz da IA silenciada", value=RUNTIME_CONFIG.start_voice_muted)
    mute_microfone = st.checkbox(
        "Iniciar com microfone pausado",
        value=RUNTIME_CONFIG.start_microphone_muted,
    )
    col_side_a, col_side_b = st.columns(2)
    with col_side_a:
        if st.button("Apagar conversa"):
            limpar_historico()
            st.session_state.memoria = carregar_memoria()
            st.session_state.ultima_resposta = ""
            st.success("Conversa apagada.")
    with col_side_b:
        if st.button("Arquivar conversa"):
            if arquivar_historico():
                st.session_state.memoria = carregar_memoria()
                st.session_state.ultima_resposta = ""
                st.success("Conversa arquivada.")
            else:
                st.info("Nao ha conversa para arquivar.")

    arquivo = st.file_uploader(
        "Importar CSV de metricas",
        type=["csv"],
        help="Colunas esperadas: data, plataforma, campanha, impressoes, cliques, investimento, conversoes",
    )
    if arquivo is not None:
        try:
            df_csv = pd.read_csv(arquivo)
            df_norm, relatorio = normalizar_dataframe_com_relatorio(df_csv)
            st.session_state.dados_metricas = df_norm
            st.session_state.relatorio_qualidade = relatorio
            if RUNTIME_CONFIG.enable_monitoring:
                registrar_evento(
                    MONITORING_FILE,
                    "metrics_import",
                    {
                        "status": "success",
                        "rows_input": int(relatorio.get("linhas_entrada", 0)),
                        "rows_output": int(relatorio.get("linhas_saida", 0)),
                    },
                )
            usar_demo = False
            st.success("CSV carregado com sucesso.")
        except Exception as exc:
            if RUNTIME_CONFIG.enable_monitoring:
                registrar_evento(
                    MONITORING_FILE,
                    "metrics_import",
                    {
                        "status": "error",
                        "error": str(exc),
                    },
                )
            st.error(f"Falha ao carregar CSV: {exc}")

if memorizar:
    st.session_state.memoria["cliente_nome"] = cliente_nome
    st.session_state.memoria["cliente_nicho"] = cliente_nicho
    st.session_state.memoria["cliente_objetivo"] = cliente_objetivo
    st.session_state.memoria["cliente_pedido"] = cliente_pedido
    st.session_state.memoria["cliente_restricoes"] = cliente_restricoes
    salvar_memoria(st.session_state.memoria)

if usar_demo:
    st.session_state.dados_metricas = gerar_dados_demo()

df = st.session_state.dados_metricas
resumo = consolidar_resumo(df)

aba_dashboard, aba_chat, aba_conversas, aba_validacao, aba_monitoramento, aba_seguranca = st.tabs(["Painel", "Conversa", "Historico", "Validacao", "Monitoramento", "Seguranca"])

with aba_dashboard:
    st.markdown('<div class="note">A primeira versao roda localmente no seu computador. Para o teste inicial, o painel usa dados demonstrativos ou um CSV importado por voce.</div>', unsafe_allow_html=True)

    c1, c2, c3, c4, c5, c6 = st.columns(6)
    c1.metric("Investimento", f"R$ {resumo['investimento']:,.2f}")
    c2.metric("Impressoes", f"{int(resumo['impressoes']):,}")
    c3.metric("Cliques", f"{int(resumo['cliques']):,}")
    c4.metric("Conversoes", f"{resumo['conversoes']:,.2f}")
    c5.metric("CTR", f"{resumo['ctr']:,.2f}%")
    c6.metric("CPA", f"R$ {resumo['cpa']:,.2f}")

    filtro_plataforma = st.multiselect(
        "Filtrar plataformas",
        options=sorted(df["plataforma"].unique().tolist()),
        default=sorted(df["plataforma"].unique().tolist()),
    )
    df_filtrado = df[df["plataforma"].isin(filtro_plataforma)]

    col_a, col_b = st.columns(2)
    with col_a:
        fig1 = px.line(
            df_filtrado.groupby(["data", "plataforma"], as_index=False)["investimento"].sum(),
            x="data",
            y="investimento",
            color="plataforma",
            markers=True,
            title="Investimento por dia",
        )
        st.plotly_chart(fig1, width="stretch")
    with col_b:
        fig2 = px.bar(
            df_filtrado.groupby("campanha", as_index=False)["conversoes"].sum().sort_values("conversoes", ascending=False),
            x="campanha",
            y="conversoes",
            color="campanha",
            title="Conversoes por campanha",
        )
        st.plotly_chart(fig2, width="stretch")

    st.subheader("Tabela detalhada")
    st.dataframe(df_filtrado, width="stretch")

    relatorio = st.session_state.get("relatorio_qualidade", {})
    if relatorio:
        with st.expander("Relatorio de qualidade do CSV importado"):
            col_q1, col_q2, col_q3, col_q4 = st.columns(4)
            col_q1.metric("Linhas de entrada", f"{int(relatorio.get('linhas_entrada', 0))}")
            col_q2.metric("Linhas finais", f"{int(relatorio.get('linhas_saida', 0))}")
            col_q3.metric("Linhas removidas", f"{int(relatorio.get('linhas_removidas', 0))}")
            col_q4.metric("Duplicadas removidas", f"{int(relatorio.get('duplicadas_removidas', 0))}")

            st.caption(
                "Ajustes aplicados automaticamente: "
                f"nulos numericos tratados = {int(relatorio.get('valores_nulos_numericos', 0))}; "
                f"negativos ajustados = {int(relatorio.get('valores_negativos_ajustados', 0))}; "
                f"datas invalidas removidas = {int(relatorio.get('linhas_data_invalida_removidas', 0))}; "
                f"texto invalido removido = {int(relatorio.get('linhas_texto_invalido_removidas', 0))}."
            )

with aba_chat:
    st.markdown('<div class="note">Esta IA foi ajustada para te ajudar a pensar em casos de clientes finais. Voce descreve o pedido do cliente, a situacao e a meta do dia. A IA responde com leitura do problema, indicativos do que fazer, o que evitar e proximos passos. Voz e texto compartilham a mesma conversa.</div>', unsafe_allow_html=True)
    render_voice_widget(
        start_muted=mute_ia,
        latest_response=st.session_state.ultima_resposta,
        latest_language=st.session_state.ultimo_idioma,
    )
    if mute_microfone:
        st.caption("Microfone inicia pausado por sua preferencia.")
    if mute_ia:
        st.caption("A voz da IA inicia silenciada por sua preferencia.")

    if cliente_nome or cliente_pedido:
        st.caption(
            f"Caso atual: {cliente_nome or 'cliente em analise'}"
            + (f" | Pedido: {cliente_pedido[:100]}" if cliente_pedido else "")
        )

    historico = st.session_state.memoria.get("historico", [])
    if not historico:
        with st.chat_message("assistant"):
            st.write(montar_saudacao_inicial(st.session_state.memoria))

    perfil = PerfilUsuario(
        nome=st.session_state.memoria.get("nome", "").strip(),
        objetivo=st.session_state.memoria.get("objetivo", "").strip() or "organizar demandas com clareza e continuidade",
        tom=tom_conversa,
        cliente_nome=cliente_nome.strip(),
        cliente_nicho=cliente_nicho.strip(),
        cliente_objetivo=cliente_objetivo.strip(),
        cliente_pedido=cliente_pedido.strip(),
        cliente_restricoes=cliente_restricoes.strip(),
    )

    if historico:
        st.caption(f"Sessao atual: {st.session_state.memoria.get('conversa_atual_titulo', 'Conversa atual')}")
    for item in historico[-8:]:
        with st.chat_message(item["role"]):
            st.write(item["content"])

    pergunta = st.chat_input("Pergunte sobre a demanda do cliente, metricas do dia, acao recomendada, risco ou proximo passo")
    if pergunta:
        if not historico:
            st.session_state.memoria["conversa_atual_titulo"] = pergunta[:60]
        aprender_preferencias(st.session_state.memoria, pergunta)
        perfil.nome = st.session_state.memoria.get("nome", "").strip()
        perfil.objetivo = st.session_state.memoria.get("objetivo", "").strip() or perfil.objetivo
        historico.append({"role": "user", "content": pergunta})
        with st.chat_message("user"):
            st.write(pergunta)

        resposta_source = "heuristic"
        llm_error = ""
        resposta = ""

        with st.chat_message("assistant"):
            if RUNTIME_CONFIG.external_llm_enabled:
                try:
                    if RUNTIME_CONFIG.llm_streaming_enabled:
                        resposta = st.write_stream(
                            stream_resposta_llm(
                                pergunta=pergunta,
                                perfil=perfil,
                                df=df_filtrado,
                                historico=historico,
                                config=RUNTIME_CONFIG,
                            )
                        )
                    else:
                        resposta = gerar_resposta_llm(
                            pergunta=pergunta,
                            perfil=perfil,
                            df=df_filtrado,
                            historico=historico,
                            config=RUNTIME_CONFIG,
                        )
                        st.write(resposta)
                    resposta_source = "llm_api"
                except Exception as exc:
                    llm_error = str(exc)
                    resposta = gerar_resposta_marketing(pergunta, perfil, df_filtrado, historico)
                    resposta_source = "heuristic_fallback"
                    st.warning("LLM externo indisponivel no momento. Resposta gerada pelo motor local.")
                    st.write(resposta)
            else:
                resposta = gerar_resposta_marketing(pergunta, perfil, df_filtrado, historico)
                st.write(resposta)
            if not mute_ia:
                render_tts_button(resposta, "ouvir_resposta_atual")

        idioma_detectado = detectar_idioma(pergunta)
        intencao_detectada = classificar_intencao(pergunta, idioma_detectado)
        resposta_id = uuid.uuid4().hex
        historico.append({"role": "assistant", "content": resposta})
        st.session_state.ultima_resposta = resposta
        st.session_state.ultima_resposta_id = resposta_id
        st.session_state.ultimo_idioma = {
            "pt": "pt-BR",
            "en": "en-US",
            "es": "es-ES",
            "zh": "zh-CN",
        }.get(idioma_detectado, "pt-BR")
        st.session_state.memoria["historico"] = historico[-20:]
        if RUNTIME_CONFIG.enable_monitoring:
            registrar_evento(
                MONITORING_FILE,
                "chat_interaction",
                {
                    "response_id": resposta_id,
                    "language": idioma_detectado,
                    "intent": intencao_detectada,
                    "response_source": resposta_source,
                    "llm_error": llm_error,
                    "question_length": len(pergunta),
                    "response_length": len(resposta),
                },
            )
        if memorizar:
            salvar_memoria(st.session_state.memoria)

        if RUNTIME_CONFIG.enable_monitoring and resposta_id not in st.session_state.feedback_enviado_ids:
            st.caption("Essa resposta foi util?")
            col_fb1, col_fb2 = st.columns(2)
            with col_fb1:
                if st.button("Util", key=f"feedback_util_{resposta_id}"):
                    registrar_evento(
                        MONITORING_FILE,
                        "response_feedback",
                        {"response_id": resposta_id, "useful": True, "comment": ""},
                    )
                    st.session_state.feedback_enviado_ids.append(resposta_id)
                    st.success("Feedback positivo registrado.")
            with col_fb2:
                if st.button("Nao util", key=f"feedback_nao_util_{resposta_id}"):
                    registrar_evento(
                        MONITORING_FILE,
                        "response_feedback",
                        {"response_id": resposta_id, "useful": False, "comment": ""},
                    )
                    st.session_state.feedback_enviado_ids.append(resposta_id)
                    st.info("Feedback negativo registrado.")

    if st.session_state.ultima_resposta and mute_ia:
        st.caption("A ultima resposta foi gerada em texto. A voz esta silenciada.")

with aba_conversas:
    st.markdown('<div class="note">Aqui voce organiza o ambiente de conversa. Pode apagar a sessao atual, arquivar e abrir novas consultas sem perder o que quiser guardar.</div>', unsafe_allow_html=True)

    col_hist_a, col_hist_b = st.columns(2)
    with col_hist_a:
        if st.button("Nova conversa", key="nova_conversa_hist"):
            limpar_historico()
            st.session_state.memoria = carregar_memoria()
            st.session_state.ultima_resposta = ""
            st.success("Nova conversa iniciada.")
    with col_hist_b:
        if st.button("Arquivar conversa atual", key="arquivar_hist"):
            if arquivar_historico():
                st.session_state.memoria = carregar_memoria()
                st.session_state.ultima_resposta = ""
                st.success("Conversa arquivada.")
            else:
                st.info("Nao ha conversa ativa para arquivar.")

    conversas_arquivadas = st.session_state.memoria.get("conversas_arquivadas", [])
    if not conversas_arquivadas:
        st.caption("Nenhuma conversa arquivada ainda.")
    else:
        for indice, conversa in enumerate(conversas_arquivadas, start=1):
            with st.expander(f"{indice}. {conversa['titulo']} - {conversa['criado_em']}"):
                if conversa.get("resumo"):
                    st.caption(conversa["resumo"])
                for mensagem in conversa.get("mensagens", []):
                    nome_role = "Voce" if mensagem.get("role") == "user" else "IA"
                    st.markdown(f"**{nome_role}:** {mensagem.get('content', '')}")

with aba_validacao:
    st.markdown('<div class="note">Esta area ajuda a testar e ajustar o motor heuristico de intencao da V1. Voce pode usar a base padrao do projeto ou importar um CSV proprio de avaliacao.</div>', unsafe_allow_html=True)

    resultado_validacao: dict[str, object] | None = None
    origem_validacao = "base padrao do projeto"
    arquivo_validacao = st.file_uploader(
        "Importar CSV de avaliacao de intencoes",
        type=["csv"],
        help="Colunas esperadas: texto, idioma, intencao_esperada",
        key="uploader_avaliacao_intencoes",
    )

    try:
        if arquivo_validacao is not None:
            resultado_validacao = avaliar_intencoes_dataframe(pd.read_csv(arquivo_validacao))
            origem_validacao = "CSV importado"
        elif INTENT_EVAL_FILE.exists():
            resultado_validacao = avaliar_intencoes_csv(INTENT_EVAL_FILE)
    except Exception as exc:
        st.error(f"Falha ao avaliar intencoes: {exc}")

    if resultado_validacao is None:
        st.info("Nenhuma base de avaliacao encontrada.")
    else:
        st.caption(f"Origem da validacao: {origem_validacao}")
        col_v1, col_v2, col_v3 = st.columns(3)
        col_v1.metric("Exemplos avaliados", f"{int(resultado_validacao.get('total', 0))}")
        col_v2.metric("Acertos", f"{int(resultado_validacao.get('acertos', 0))}")
        col_v3.metric("Acuracia", f"{float(resultado_validacao.get('acuracia', 0.0)):.2%}")

        st.subheader("Desempenho por intencao")
        st.dataframe(pd.DataFrame(resultado_validacao.get("por_intencao", [])), width="stretch")

        st.subheader("Matriz de confusao")
        st.dataframe(pd.DataFrame(resultado_validacao.get("matriz_confusao", [])), width="stretch")

        erros = resultado_validacao.get("erros", [])
        st.subheader("Erros encontrados")
        if erros:
            st.dataframe(pd.DataFrame(erros), width="stretch")
        else:
            st.success("Nenhum erro encontrado na base avaliada.")

with aba_monitoramento:
    st.markdown('<div class="note">Esta area acompanha uso real, feedback e sinais operacionais da V1 para orientar as proximas melhorias.</div>', unsafe_allow_html=True)

    resumo_monitoramento = resumir_eventos(MONITORING_FILE) if RUNTIME_CONFIG.enable_monitoring else None
    if not RUNTIME_CONFIG.enable_monitoring:
        st.info("Monitoramento desabilitado por configuracao de ambiente.")
    elif not resumo_monitoramento or int(resumo_monitoramento.get("total_eventos", 0)) == 0:
        st.info("Nenhum evento monitorado ainda. Use o chat, importe um CSV e envie feedback para iniciar a coleta.")
    else:
        col_m1, col_m2, col_m3, col_m4 = st.columns(4)
        col_m1.metric("Eventos", f"{int(resumo_monitoramento.get('total_eventos', 0))}")
        col_m2.metric("Interacoes", f"{int(resumo_monitoramento.get('total_interacoes', 0))}")
        col_m3.metric("Feedbacks", f"{int(resumo_monitoramento.get('total_feedbacks', 0))}")
        col_m4.metric("Feedback positivo", f"{float(resumo_monitoramento.get('taxa_feedback_positivo', 0.0)):.2%}")

        st.subheader("Uso por intencao")
        st.dataframe(pd.DataFrame(resumo_monitoramento.get("por_intencao", [])), width="stretch")

        st.subheader("Uso por idioma")
        st.dataframe(pd.DataFrame(resumo_monitoramento.get("por_idioma", [])), width="stretch")

        st.subheader("Ultimos feedbacks")
        feedbacks_df = pd.DataFrame(resumo_monitoramento.get("ultimos_feedbacks", []))
        if feedbacks_df.empty:
            st.caption("Nenhum feedback coletado ainda.")
        else:
            st.dataframe(feedbacks_df, width="stretch")

with aba_seguranca:
    st.subheader("Guardrails desta primeira versao")
    st.markdown(
        """
        1. Hospedagem local no seu computador para o primeiro teste.
        2. Memoria apenas local e opcional, controlada por voce.
        3. Nada de autoaprendizado irrestrito: a IA guarda preferencias, nao reescreve a propria logica.
        4. Sem envio automatico de credenciais sensiveis nesta V1.
        5. Voz feita no navegador para evitar trafego desnecessario de audio.
        6. Os dados podem vir de demonstracao ou CSV importado por voce.
        """
    )

    st.subheader("Algoritmo adotado na V1")
    st.markdown(
        """
        1. Motor heuristico baseado em regras e palavras-chave.
        2. Uso do contexto das metricas carregadas para compor a resposta.
        3. Memoria local opcional para personalizar a conversa.
        4. Sem modelo treinado nesta fase, para manter previsibilidade, velocidade e simplicidade operacional.
        """
    )

    st.subheader("Ideias para a proxima evolucao")
    st.markdown(
        """
        1. Integrar Meta Ads e Google Ads com OAuth e tokens seguros.
        2. Criar memoria por cliente com consentimento explicito.
        3. Adicionar analise automatica de anomalias e alertas.
        4. Gerar plano semanal de marketing com base nas metricas.
        5. Adicionar base de conhecimento do seu negocio para deixar a conversa mais precisa.
        """
    )

    st.subheader("Prontidao para integracao")
    st.markdown(
        f"""
        1. Ambiente atual: {RUNTIME_CONFIG.app_env}.
        2. Arquivo de memoria configurado: {MEMORY_FILE.as_posix()}.
        3. Arquivo padrao de validacao: {INTENT_EVAL_FILE.as_posix()}.
        4. Arquivo de monitoramento: {MONITORING_FILE.as_posix()}.
        5. Flags preparadas para Meta Ads, Google Ads e LLM externo.
        """
    )
