# Passo 6 - Testar e Ajustar o Modelo

## Adaptacao ao projeto atual
Como a V1 nao usa um modelo treinado por aprendizado de maquina, o Passo 6 foi adaptado para validar e ajustar o motor heuristico de intencao.

Neste contexto, testar e ajustar significa:
- medir o comportamento do classificador de intencao;
- identificar erros por categoria;
- visualizar confusoes entre intencoes;
- corrigir regras com base nos exemplos reais.

## O que foi implementado
### 1. Relatorio detalhado de validacao
O motor de avaliacao agora retorna:
- total de exemplos;
- total de acertos;
- acuracia geral;
- erros encontrados;
- desempenho por intencao;
- matriz de confusao.

### 2. Aba de validacao no app
Foi adicionada uma area dedicada no aplicativo para:
- validar a base padrao do projeto;
- importar um CSV proprio de avaliacao;
- inspecionar erros e categorias com baixo desempenho.

## Formato do CSV de avaliacao
Colunas obrigatorias:
- texto
- idioma
- intencao_esperada

Exemplos de intencao:
- small_talk
- client_case
- ctr
- conversion
- platform
- next_step
- general_chat
- default_marketing

## Como ajustar o motor
1. rode a avaliacao com a base atual;
2. veja quais exemplos caem na intencao errada;
3. refine termos e conflitos em src/intent_engine.py;
4. reavalie a base;
5. repita ate estabilizar.

## Metricas recomendadas
- acuracia geral >= 0.90 na base rotulada da V1;
- nenhuma intencao critica com acuracia abaixo de 0.80;
- erros novos revisados antes de cada mudanca relevante no motor.

## Definicao de pronto do Passo 6
- processo de teste documentado;
- avaliacao visivel no produto;
- mecanismo simples de ajuste iterativo estabelecido.