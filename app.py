from __future__ import annotations

import streamlit as st


st.set_page_config(page_title="IA Simples", page_icon="IM", layout="centered")

if "chat" not in st.session_state:
    st.session_state.chat = []


def responder(pergunta: str) -> str:
    texto = pergunta.lower().strip()

    if any(t in texto for t in ["oi", "ola", "olá", "bom dia", "boa tarde", "boa noite"]):
        return "Oi. Me conta seu objetivo de marketing e eu te ajudo com um plano direto."

    if "ctr" in texto or "clique" in texto:
        return "Para subir CTR: teste 3 criativos, melhore o gancho inicial e ajuste segmentacao."

    if "convers" in texto or "lead" in texto or "venda" in texto:
        return "Para subir conversao: alinhe anuncio com pagina, reduza friccao e ative remarketing."

    return "Entendi. Me passe objetivo, orcamento diario e gargalo principal para eu montar o proximo passo."


st.title("IA de Marketing")
st.caption("Versao minima e estavel")

col1, col2 = st.columns([1, 1])
with col1:
    if st.button("Limpar conversa"):
        st.session_state.chat = []
        st.rerun()

for msg in st.session_state.chat:
    with st.chat_message(msg["role"]):
        st.write(msg["content"])

pergunta = st.chat_input("Digite sua pergunta")
if pergunta:
    st.session_state.chat.append({"role": "user", "content": pergunta})
    with st.chat_message("user"):
        st.write(pergunta)

    resposta = responder(pergunta)
    st.session_state.chat.append({"role": "assistant", "content": resposta})
    with st.chat_message("assistant"):
        st.write(resposta)
