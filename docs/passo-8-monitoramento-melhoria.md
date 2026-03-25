# Passo 8 - Monitorar e Melhorar

## Objetivo do passo
Criar um ciclo simples e continuo de observacao do uso real da V1 para orientar melhorias sem depender apenas de impressao subjetiva.

## O que foi implementado
### 1. Monitoramento local de eventos
Arquivo: src/monitoring.py

O projeto agora registra eventos locais em arquivo JSONL, incluindo:
- interacoes do chat;
- feedback de utilidade da resposta;
- importacao de CSV com sucesso ou erro.

### 2. Resumo operacional no app
Foi adicionada uma aba de monitoramento com:
- total de eventos;
- total de interacoes;
- total de feedbacks;
- taxa de feedback positivo;
- distribuicao por intencao;
- distribuicao por idioma;
- ultimos feedbacks coletados.

### 3. Base para melhoria continua
Agora a V1 passa a ter insumos objetivos para priorizar ajustes, como:
- intencoes mais frequentes;
- idiomas mais usados;
- respostas com baixa utilidade percebida;
- falhas recorrentes na importacao de dados.

## Como usar este passo
1. rode o app normalmente;
2. use o chat com casos reais;
3. marque se a resposta foi util ou nao util;
4. acompanhe a aba de monitoramento;
5. ajuste regras, validacao e UX com base nos dados coletados.

## Metricas recomendadas
- taxa de feedback positivo >= 80%;
- crescimento gradual da base de feedbacks reais;
- reducao de erros recorrentes em importacao e intencao;
- estabilidade do comportamento apos ajustes.

## Definicao de pronto do Passo 8
- coleta de eventos habilitada;
- feedback real integrado ao produto;
- painel local de monitoramento funcionando;
- processo de melhoria continua viavel sem infraestrutura externa.