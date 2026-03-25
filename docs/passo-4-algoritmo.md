# Passo 4 - Escolher o Algoritmo de Aprendizado

## Decisao para a V1
Para esta versao do projeto, o algoritmo principal escolhido nao e um modelo de aprendizado de maquina treinado.

A V1 usa uma abordagem heuristica e orientada por regras, combinando:
- deteccao simples de intencao por palavras-chave;
- contexto das metricas carregadas no painel;
- memoria local de curto prazo;
- resposta guiada por templates consultivos.

## Por que esta e a escolha correta agora
O objetivo atual do produto e:
- interpretar metricas;
- responder perguntas consultivas;
- sugerir proximos passos.

Esse tipo de entrega, nesta fase, nao exige treino supervisionado nem deep learning.

As vantagens da abordagem atual sao:
- menor complexidade tecnica;
- resposta rapida em ambiente local;
- maior previsibilidade do comportamento;
- mais facilidade para validar a V1 com usuarios reais.

## O que esta sendo usado na pratica
### Camada 1 - Regras de conversa
Classificacao simples da pergunta por temas como:
- CTR e cliques;
- conversoes, leads e vendas;
- comparacao entre plataformas;
- pedidos de proximo passo;
- pequenas interacoes conversacionais.

### Camada 2 - Contexto estruturado
Uso de dados consolidados do CSV para montar contexto real da resposta, incluindo:
- investimento total;
- cliques;
- conversoes;
- CTR medio;
- plataforma com maior investimento;
- campanha com maior volume de conversoes.

### Camada 3 - Personalizacao local
Uso de memoria local para considerar:
- nome do usuario;
- objetivo informado;
- nome do cliente;
- nicho;
- pedido atual;
- restricoes relevantes.

## Algoritmos considerados e nao adotados agora
### Classificacao supervisionada
Exemplos: SVM, Logistic Regression, Random Forest.

Nao adotado porque a V1 ainda nao possui base rotulada suficiente de perguntas e respostas para treino confiavel.

### Deep Learning e LLM local
Exemplos: redes neurais, transformers.

Nao adotado porque aumentaria custo, dependencia de hardware e complexidade operacional sem necessidade para validar a proposta inicial.

### Aprendizado nao supervisionado
Exemplo: K-means.

Nao adotado como motor principal porque o foco atual nao e agrupamento de dados, mas assistencia consultiva contextual.

## Evolucao recomendada para a proxima fase
Quando houver volume suficiente de dados reais, o projeto pode evoluir assim:

### Fase 2 - Classificacao de intencao supervisionada
Treinar um classificador de perguntas para substituir parte das regras manuais.

Algoritmos recomendados:
- Logistic Regression com TF-IDF como baseline;
- Random Forest ou Gradient Boosting para comparacao.

### Fase 3 - Predicao de performance
Criar modelos para prever resultado de campanha.

Problemas possiveis:
- regressao para prever conversoes;
- classificacao para risco de baixa performance.

Algoritmos recomendados:
- Random Forest Regressor;
- XGBoost ou LightGBM, se a base justificar;
- regressao linear como baseline.

## Definicao de pronto do Passo 4
- algoritmo da V1 definido de forma coerente com o problema;
- decisao tecnica registrada;
- proximos caminhos de evolucao mapeados sem antecipar complexidade.

## Conclusao
Para esta V1, o melhor algoritmo e uma arquitetura heuristica com regras, contexto de metricas e memoria local.

Isso atende o objetivo do produto com menor risco e maior velocidade de validacao.