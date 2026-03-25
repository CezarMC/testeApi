# Passo 2 - Coletar e Preparar os Dados

## Objetivo do Passo 2
Garantir que os dados de entrada tenham qualidade minima para analise e recomendacoes confiaveis no assistente de marketing.

## Fontes de dados recomendadas
- CSV exportado de Meta Ads.
- CSV exportado de Google Ads.
- Planilha consolidada pela operacao (desde que siga o formato padrao).

## Esquema minimo aceito pelo sistema
Colunas obrigatorias:
- data
- plataforma
- campanha
- impressoes
- cliques
- investimento
- conversoes

## Limpeza aplicada automaticamente na aplicacao
Ao importar CSV, o sistema agora executa:
- remocao de linhas duplicadas;
- conversao de tipos (data e campos numericos);
- tratamento de nulos numericos para zero;
- ajuste de valores negativos para zero;
- remocao de linhas com data invalida;
- remocao de linhas com plataforma ou campanha vazias.

## Analise exploratoria minima (EDA) sugerida
- Volume por plataforma e por campanha.
- Evolucao diaria de investimento e conversoes.
- Indicadores consolidados: CTR, CPC e CPA.
- Identificacao de outliers de investimento sem conversao.

## Checklist de pronto do Passo 2
- [ ] Dados coletados de fonte confiavel.
- [ ] CSV no formato padrao do projeto.
- [ ] Relatorio de qualidade verificado apos importacao.
- [ ] Metricas consolidadas sem erro (CTR, CPC, CPA).
- [ ] Base final aprovada para uso no chat consultivo.

## Resultado esperado
Com este passo concluido, o projeto fica com uma entrada de dados consistente e auditavel para suportar as respostas da IA.
