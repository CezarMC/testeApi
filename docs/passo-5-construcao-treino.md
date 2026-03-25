# Passo 5 - Construir e Treinar o Modelo

## Adaptacao ao projeto atual
Neste projeto, "construir e treinar" nao significa treinar uma rede neural ou um classificador supervisionado em producao.

Como a V1 usa um motor heuristico, o equivalente tecnico deste passo e:
- estruturar o motor de classificacao de intencao;
- separar regras em um modulo proprio;
- criar uma base rotulada de validacao;
- medir acuracia do comportamento atual;
- ajustar regras iterativamente.

## O que foi implementado
### 1. Modulo de classificacao de intencao
Arquivo: src/intent_engine.py

Responsavel por:
- classificar a intencao da pergunta;
- identificar quando o texto e marketing ou conversa geral;
- avaliar um dataset rotulado de exemplos.

### 2. Integracao com o motor de resposta
Arquivo: src/chat_engine.py

Agora o fluxo de resposta usa uma etapa explicita de classificacao de intencao antes de gerar a resposta consultiva.

### 3. Base inicial de avaliacao
Arquivo: data/avaliacao_intencoes.csv

Essa base serve como conjunto de validacao manual para ajustar o motor heuristico.

## Como este passo substitui treino tradicional
### Em vez de treino supervisionado classico
- nao ha fit de modelo;
- nao ha split de treino, validacao e teste ainda;
- nao ha ajuste de pesos numericos.

### O que existe nesta fase
- regras versionadas em codigo;
- exemplos rotulados para validacao;
- refinamento iterativo das regras conforme erros observados.

## Metricas recomendadas para este passo
- acuracia de classificacao de intencao;
- cobertura das intencoes principais;
- taxa de erro em perguntas comuns;
- estabilidade de resposta para entradas equivalentes.

## Meta inicial sugerida
- acuracia >= 0.85 no dataset rotulado da V1.

## Fluxo de trabalho recomendado
1. adicionar novos exemplos reais no arquivo de avaliacao;
2. rodar avaliacao do motor heuristico;
3. identificar conflitos ou lacunas nas regras;
4. ajustar o modulo de intencao;
5. repetir ate estabilizar.

## Evolucao futura
Quando houver volume suficiente de exemplos reais, este passo pode migrar para treino supervisionado com:
- TF-IDF + Logistic Regression;
- validacao cruzada;
- matriz de confusao por intencao.

## Definicao de pronto do Passo 5
- motor de intencao separado e testavel;
- base rotulada inicial criada;
- processo de ajuste do comportamento documentado.