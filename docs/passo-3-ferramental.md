# Passo 3 - Escolher o Ferramental e o Ambiente de Desenvolvimento

## Stack definida para a V1
### Linguagem principal
- Python 3.10+

### Framework de interface
- Streamlit

Motivo:
- entrega rapida para uma interface local;
- integra bem com analise de dados;
- reduz complexidade de front-end para a V1.

### Bibliotecas de dados e visualizacao
- pandas para leitura, limpeza e transformacao dos dados;
- plotly para graficos interativos;
- requests para futuras integracoes com APIs;
- python-dotenv para configuracao via ambiente.

### Ambiente de desenvolvimento
- VS Code como IDE principal;
- ambiente virtual local em .venv;
- Jupyter como apoio opcional para exploracao de dados, nao como runtime principal do produto.

## Decisao tecnica
Para esta V1, a stack escolhida privilegia velocidade de entrega, legibilidade e facilidade de manutencao.

Nao foi adotado nesta fase:
- TensorFlow;
- PyTorch;
- FastAPI em producao;
- banco de dados dedicado.

Essas escolhas podem entrar nas proximas fases, quando houver:
- integracao com modelo externo;
- necessidade de API separada;
- pipeline de treino real.

## Setup padrao do ambiente
### Criar e ativar ambiente virtual
No Windows:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### Instalar dependencias
```powershell
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### Rodar o projeto
```powershell
.venv\Scripts\python.exe -m streamlit run app.py --server.address 127.0.0.1 --server.port 8501
```

## Padrao de trabalho recomendado
### Para produto
- app.py como ponto de entrada da aplicacao;
- src/chat_engine.py para logica conversacional;
- src/metrics.py para pipeline de dados e calculo de metricas;
- src/voice_ui.py para interface de voz.

### Para exploracao de dados
- usar Jupyter apenas para testes exploratorios e validacoes pontuais;
- migrar logica consolidada para src/metrics.py.

## Suporte do VS Code adicionado
O workspace agora inclui:
- recomendacao das extensoes Python, Pylance e Jupyter;
- selecao padrao do interpretador local em .venv;
- ativacao automatica do ambiente no terminal integrado.

## Definicao de pronto do Passo 3
- stack principal definida e justificada;
- ambiente local reproduzivel no workspace;
- IDE preparada para desenvolvimento e testes da V1.