# Passo 1 - Definir o Objetivo

## Problema que a IA resolve
Pequenos e medios negocios normalmente tem dificuldade para interpretar metricas de campanhas e transformar dados em decisoes praticas do dia a dia.

## Proposito da IA
Criar uma assistente local de marketing digital, em portugues, que:
- explique metricas de Meta e Google de forma simples;
- responda perguntas consultivas sobre campanhas;
- sugira proximos passos acionaveis com base no contexto da conversa e dos dados.

## Usuario final
- Gestor(a) de trafego
- Dono(a) de pequeno negocio
- Analista de marketing em operacao local

Perfil esperado:
- precisa de respostas rapidas e praticas;
- prefere linguagem clara e humana;
- pode usar texto ou voz para interagir.

## Escopo da V1
Incluido:
- dashboard com metricas e visualizacoes;
- chat consultivo em portugues;
- modo de voz no navegador;
- memoria local opcional para contexto basico.

Nao incluido nesta fase:
- execucao automatica de campanhas;
- integracao oficial com contas de anuncios em producao;
- autoaprendizado irrestrito.

## Criterios de sucesso (metricas)
### 1) Qualidade das respostas
- Taxa de utilidade percebida >= 80% em avaliacao manual simples (resposta util ou nao util).
- Tempo medio de resposta no chat <= 4 segundos no ambiente local.

### 2) Qualidade dos dados e analises
- 100% dos CSVs aceitos devem conter colunas obrigatorias validadas.
- Erros de calculo em CTR, CPC e CPA: 0 em testes basicos de consistencia.

### 3) Experiencia de uso
- Usuario consegue concluir um ciclo completo (carregar dados -> analisar -> pedir recomendacao) em menos de 5 minutos.
- Fluxo de voz funcional em Chrome/Edge com taxa de sucesso >= 90% em testes manuais locais.

## Definicao de pronto do Passo 1
O Passo 1 sera considerado concluido quando:
- houver alinhamento entre objetivo, publico e escopo da V1;
- as metricas acima forem aceitas como referencia inicial;
- o time registrar este documento como base para os proximos passos.

## Pergunta de alinhamento final
Para fechar oficialmente o Passo 1, confirme se o foco principal da V1 e:
1. assistente consultiva para leitura de metricas,
2. copiloto de decisao para campanha,
3. os dois, com prioridade em consultoria.