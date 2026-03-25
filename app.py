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

st.title("IA de Marketing")
st.caption("Versao simples: so voce e a IA, sem custo de API externa.")

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
