from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import streamlit as st


MEMORY_FILE = Path("data/memoria_usuario.json")


SYSTEM_PROMPT = (
    "Voce e uma IA de marketing digital. "
    "Responda de forma clara, pratica e objetiva. "
    "Sempre proponha proximos passos acionaveis."
)


def carregar_memoria() -> dict:
    if MEMORY_FILE.exists():
        try:
            data = json.loads(MEMORY_FILE.read_text(encoding="utf-8"))
            data.setdefault("historico", [])
            data.setdefault("nome", "")
            return data
        except Exception:
            return {"historico": [], "nome": ""}
    return {"historico": [], "nome": ""}


def salvar_memoria(data: dict) -> None:
    MEMORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    MEMORY_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def resposta_local(pergunta: str, historico: list[dict[str, str]]) -> str:
    texto = pergunta.lower().strip()

    if any(p in texto for p in ["oi", "ola", "bom dia", "boa tarde", "boa noite"]):
        return "Oi. Me diga o objetivo da sua campanha e o que ja foi testado."

    if any(p in texto for p in ["ctr", "clique", "cliques"]):
        return (
            "Para melhorar CTR: 1) troque o gancho dos primeiros 3 segundos, "
            "2) teste 3 criativos com promessa diferente, 3) refine publico com base nos anuncios vencedores."
        )

    if any(p in texto for p in ["convers", "lead", "venda", "vendas"]):
        return (
            "Para aumentar conversao: 1) alinhe anuncio com pagina, 2) reduza friccao no formulario, "
            "3) faca remarketing para quem clicou e nao converteu."
        )

    if any(p in texto for p in ["meta", "facebook", "instagram", "google ads", "google"]):
        return (
            "Sugestao de alocacao inicial: 70% no canal com melhor CPA historico e 30% em teste controlado. "
            "Revise a cada 3-4 dias com base em custo por resultado."
        )

    contexto = ""
    if historico:
        ultimo_user = [m["content"] for m in historico if m.get("role") == "user"]
        if ultimo_user:
            contexto = f" Contexto recente: {ultimo_user[-1][:120]}."

    return (
        "Entendi. Vou te responder como consultora de marketing em formato pratico." + contexto +
        "\n\nProximo passo: me diga 1) objetivo, 2) orcamento diario, 3) principal gargalo atual."
    )


st.set_page_config(page_title="IA Marketing - Simples", page_icon="IM", layout="wide")

st.markdown(
        """
        <style>
            :root {
                --bg-top: #f6efe7;
                --bg-bottom: #efe5d8;
                --panel: rgba(255, 252, 248, 0.92);
                --panel-strong: rgba(255, 251, 246, 0.98);
                --text-main: #3b2a1f;
                --text-soft: #6a5648;
                --accent: #b56a3d;
                --line: rgba(80, 50, 32, 0.14);
            }

            .stApp {
                background:
                    radial-gradient(circle at top right, rgba(181, 106, 61, 0.12), transparent 26%),
                    radial-gradient(circle at bottom left, rgba(118, 73, 45, 0.08), transparent 24%),
                    linear-gradient(180deg, var(--bg-top) 0%, var(--bg-bottom) 100%);
            }

            [data-testid="stSidebar"] {
                background: linear-gradient(180deg, #f0e4d4 0%, #e8d8c4 100%);
                border-right: 1px solid var(--line);
            }

            [data-testid="stSidebar"] * {
                color: var(--text-main);
            }

            .hero {
                padding: 18px 20px;
                border-radius: 18px;
                background: linear-gradient(135deg, #fffaf4 0%, #f7eadc 100%);
                border: 1px solid var(--line);
                box-shadow: 0 12px 30px rgba(70, 42, 25, 0.08);
                margin-bottom: 14px;
            }

            .hero h1 {
                margin: 0 0 4px 0;
                color: var(--text-main);
                font-family: Georgia, serif;
                font-size: 34px;
            }

            .hero p {
                margin: 0;
                color: var(--text-soft);
                font-size: 14px;
            }

            [data-testid="stChatMessage"] {
                background: var(--panel);
                border: 1px solid var(--line);
                border-radius: 14px;
                box-shadow: 0 8px 22px rgba(64, 36, 20, 0.06);
            }

            [data-testid="stChatMessage"] * {
                color: var(--text-main);
            }

            [data-testid="stChatInput"] {
                background: var(--panel-strong);
                border: 1px solid var(--line);
                border-radius: 12px;
            }

            .stCaption {
                color: var(--text-soft);
            }

            .stButton > button {
                background: linear-gradient(135deg, #b56a3d 0%, #9c5a31 100%);
                color: #fff8f2;
                border: none;
                border-radius: 999px;
                padding: 0.5rem 1rem;
            }
        </style>
        """,
        unsafe_allow_html=True,
)

st.markdown(
        """
        <div class="hero">
            <h1>IA de Marketing</h1>
            <p>Conversa simples, direta e sem custo de API externa.</p>
        </div>
        """,
        unsafe_allow_html=True,
)

with st.sidebar:
    st.subheader("Controle")
    if st.button("Nova conversa"):
        st.session_state.memoria = {"historico": [], "nome": ""}
        salvar_memoria(st.session_state.memoria)
        st.success("Conversa reiniciada.")

    st.markdown("---")
    st.caption("Modo atual: IA local")
    st.caption("LLM externo: desativado")

if "memoria" not in st.session_state:
    st.session_state.memoria = carregar_memoria()

historico = st.session_state.memoria.get("historico", [])

if not historico:
    with st.chat_message("assistant"):
        st.write("Oi. Me conte seu objetivo de marketing que eu te ajudo com um plano direto.")

for item in historico[-20:]:
    with st.chat_message(item["role"]):
        st.write(item["content"])

pergunta = st.chat_input("Digite sua pergunta...")
if pergunta:
    historico.append({"role": "user", "content": pergunta})
    with st.chat_message("user"):
        st.write(pergunta)

    resposta = resposta_local(pergunta, historico)

    historico.append({"role": "assistant", "content": resposta})
    st.session_state.memoria["historico"] = historico[-50:]
    st.session_state.memoria["updated_at"] = datetime.now().isoformat(timespec="seconds")
    salvar_memoria(st.session_state.memoria)

    with st.chat_message("assistant"):
        st.write(resposta)

st.markdown("---")
st.caption(SYSTEM_PROMPT)
