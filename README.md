# IA de Marketing (Versao Simples)

App enxuto com Streamlit para conversar com uma IA local de marketing digital.

## O que esta versao faz

- Chat direto entre voce e a IA
- Respostas praticas em portugues para temas de marketing
- Memoria local do historico da conversa em `data/memoria_usuario.json`
- Sem dependencias de API externa e sem custo de uso

## Requisitos

- Python 3.10+

## Instalar

```bash
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## Rodar

```bash
.venv\Scripts\python.exe -m streamlit run app.py --server.address 127.0.0.1 --server.port 8501
```

Abra no navegador:

http://127.0.0.1:8501

## Estrutura principal

- `app.py`: app principal simples
- `data/memoria_usuario.json`: memoria local da conversa
- `requirements.txt`: dependencias minimas

## Observacao

Esta versao foi reiniciada para foco em simplicidade e estabilidade.
