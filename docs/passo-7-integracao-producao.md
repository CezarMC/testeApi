# Passo 7 - Integracao e Producao

## Objetivo do passo
Preparar a V1 para rodar de forma mais previsivel fora do modo estritamente experimental, com configuracao por ambiente, ponto unico de inicializacao e base para futuras integracoes externas.

## O que foi implementado
### 1. Configuracao por ambiente
Arquivo: src/runtime_config.py

O projeto agora le configuracoes via variaveis de ambiente, incluindo:
- ambiente atual;
- titulo da aplicacao;
- caminho da memoria local;
- caminho do arquivo de validacao;
- ativacao de dados demo;
- ativacao de memoria local;
- estado inicial de voz e microfone;
- flags de integracao futura com Meta Ads, Google Ads e LLM externo.

### 2. Exemplo de variaveis de ambiente
Arquivo: .env.example

Serve como base para criar um .env local sem editar o codigo.

### 3. Configuracao do Streamlit
Arquivo: .streamlit/config.toml

Centraliza parametros de execucao do app:
- modo headless;
- endereco e porta padrao;
- limite de upload;
- desativacao de coleta de uso.

### 4. Script de inicializacao
Arquivo: scripts/start_app.ps1

Padroniza a subida da aplicacao usando o Python da .venv.

## Integracoes preparadas para a proxima fase
Ainda nao implementadas, mas agora previstas por configuracao:
- Meta Ads;
- Google Ads;
- modelo externo via API.

## Recomendacao de uso
### Ambiente local
Usar .env com:
- APP_ENV=development
- ENABLE_DEMO_DATA=true

### Homologacao ou demonstracao controlada
Usar .env com:
- APP_ENV=staging
- ENABLE_DEMO_DATA=false
- ENABLE_LOCAL_MEMORY conforme necessidade do teste

## Definicao de pronto do Passo 7
- configuracao externa ao codigo estabelecida;
- inicializacao padronizada;
- base pronta para integrar servicos externos depois.