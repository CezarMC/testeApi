# IA de Marketing em Portugues

Primeira versao local de uma IA focada em marketing digital, com painel de metricas, conversa humanizada em portugues e suporte inicial a voz no navegador.

## O que esta versao entrega

- Interface web local com Streamlit
- Dashboard com graficos de Meta e Google em modo demonstracao ou CSV importado
- Chat consultivo em portugues
- Voz no navegador com reconhecimento e leitura de resposta quando suportado pelo browser
- Memoria local opcional de preferencias e historico recente
- Guardrails de seguranca para primeira validacao local

## Seguranca desta V1

- Hospedagem local no seu computador
- Memoria local controlada por consentimento
- Sem autoaprendizado irrestrito
- Sem coleta automatica de credenciais sensiveis
- Audio processado preferencialmente no navegador

## Requisitos

- Python 3.10+
- Navegador Chrome ou Edge para melhor suporte a voz

## Instalar

```bash
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## Rodar

```bash
.venv\Scripts\python.exe -m streamlit run app.py --server.address 127.0.0.1 --server.port 8501
```

Ou use o script:

```powershell
scripts\start_app.ps1
```

Abra:

http://127.0.0.1:8501

## Habilitar LLM Externo (API)

1. Crie o arquivo .env a partir de .env.example.
2. Configure:

- EXTERNAL_LLM_ENABLED=true
- LLM_API_KEY=sua_chave
- LLM_MODEL=gpt-4o-mini
- LLM_API_BASE_URL=https://api.openai.com/v1/chat/completions

3. Reinicie o app.

Quando a API estiver ativa, o chat usa o LLM externo. Se houver falha, o app faz fallback automatico para o motor heuristico local.

## Formato do CSV de metricas

Colunas obrigatorias:

- data
- plataforma
- campanha
- impressoes
- cliques
- investimento
- conversoes

## Proximos passos sugeridos

1. Integracao real com Meta Ads e Google Ads
2. Chat com modelo de IA externo via API segura
3. Memoria por cliente com consentimento
4. Alertas, insights e planejamento automatico

## Documentacao do projeto

- [Passo 1 - Objetivo](docs/passo-1-objetivo.md)
- [Passo 2 - Dados](docs/passo-2-dados.md)
- [Passo 3 - Ferramental](docs/passo-3-ferramental.md)
- [Passo 4 - Algoritmo](docs/passo-4-algoritmo.md)
- [Passo 5 - Construcao e Treino](docs/passo-5-construcao-treino.md)
- [Passo 6 - Teste e Ajuste](docs/passo-6-teste-ajuste.md)
- [Passo 7 - Integracao e Producao](docs/passo-7-integracao-producao.md)
- [Passo 8 - Monitoramento e Melhoria](docs/passo-8-monitoramento-melhoria.md)
