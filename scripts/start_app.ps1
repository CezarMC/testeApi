$ErrorActionPreference = 'Stop'

$python = Join-Path $PSScriptRoot '..\.venv\Scripts\python.exe'
if (-not (Test-Path $python)) {
    throw 'Python da .venv nao encontrado. Crie o ambiente virtual antes de iniciar o app.'
}

& $python -m streamlit run app.py