# Painel Meta Business com IA

Aplicacao web para gerenciar varios clientes de trafego pago com metricas da Meta, autenticacao por usuario, isolamento de dados por conta e recomendacoes com Claude.

## Estrutura

- `index.html`: interface principal.
- `app.js`: autenticacao Supabase, fluxo do painel e chamadas para a API.
- `api/health.js`: endpoint de saude.
- `api/app-config.js`: valida configuracao publica e privada.
- `api/user-token.js`: salva, consulta e remove o token da Meta criptografado por usuario.
- `api/user-clients.js`: CRUD dos clientes do usuario autenticado.
- `api/meta-insights.js`: proxy seguro para consultar Meta Insights.
- `api/claude-helper.js`: recomendacoes com Claude ou fallback local.
- `supabase/schema.sql`: tabelas e politicas RLS.
- `vercel.json`: runtime das funcoes na Vercel.

## Variaveis de ambiente

Cadastre na Vercel:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (Publishable key/anon)
- `SUPABASE_SERVICE_ROLE_KEY` (Secret key/Service Role)
- `ENCRYPTION_KEY`
- `ANTHROPIC_API_KEY` (opcional)

`ENCRYPTION_KEY` deve ter 64 caracteres hex (32 bytes). Gere com:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Banco no Supabase

1. Crie um projeto no Supabase.
2. Abra o SQL Editor.
3. Execute o arquivo `supabase/schema.sql`.
4. Em Authentication, habilite email/password.
5. Configure o redirect URL de recuperacao de senha para o dominio publicado na Vercel.

## Deploy na Vercel

1. Importe esta pasta na Vercel.
2. Adicione as variaveis de ambiente.
3. Faça o deploy.
4. Teste `/api/health`.
5. Abra a aplicacao e crie uma conta.

## Uso rapido

1. Crie uma conta ou entre com um usuario existente.
2. Salve o token da Meta.
3. Cadastre um ou mais clientes com nome e ID da conta de anuncio.
4. Escolha periodo e tipo de relatorio.
5. Atualize as metricas.
6. Gere dicas da IA se `ANTHROPIC_API_KEY` estiver configurada.

## Observacoes de seguranca

- O token da Meta nao vai para o navegador.
- Cada usuario tem seus proprios registros no banco.
- O token da Meta fica criptografado com AES-256-GCM.
- As tabelas usam RLS para impedir acesso cruzado entre contas.
