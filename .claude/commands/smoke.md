---
description: Roda um smoke test integrado (health + páginas públicas) contra prod ou um preview
---

# /smoke — Teste integrado rápido

Objetivo: depois de um deploy (ou antes de promover um preview), verificar em
segundos se a configuração e os fluxos básicos estão de pé. Foca na classe de
bug que mais nos travou: env/BOM, migração não rodada, rota quebrada.

## Alvo

- Sem argumento: usar **produção** → `https://www.turisguard.com`
- Com argumento: usar a URL informada (ex.: um preview `https://juristur-xxxx.vercel.app`)

`$ARGUMENTS` contém a URL alvo, se houver.

## Passos

### 1. Health check (o mais importante)

1. Ler o `SEED_SECRET` do arquivo `.env.local` (linha `SEED_SECRET=...`).
2. Chamar `GET <alvo>/api/health?key=<SEED_SECRET>` (use PowerShell `Invoke-RestMethod`; se retornar 503 o comando lança erro — capture o corpo mesmo assim).
3. Reportar `status`, `passed/total` e **listar cada item de `failures`** com o `detail`.
   - Se houver `schema:*` falhando → migração SQL não foi rodada no Supabase.
   - Se houver `env:*:limpo` falhando → env var com BOM/espaço (regravar no Vercel).
   - Se houver `env:*` ausente → variável não configurada.

### 2. Páginas públicas (reachability)

Fazer uma requisição a cada rota e conferir o status esperado:

| Rota | Esperado |
|---|---|
| `/` | 200 |
| `/login` | 200 |
| `/cadastro` | 200 |
| `/assinar` | redireciona para `/login` (usuário não autenticado) |
| `/dashboard` | redireciona para `/login` |

Use `curl` via Bash para detectar o status e o redirect sem segui-lo — o
`Invoke-WebRequest` do PowerShell falha no modo não-interativo. Exemplo:
`curl -s -o /dev/null -w "%{http_code}" <url>` para o código, e
`curl -s -D - <url> | grep -i '^location:'` para o destino do redirect.
Não trate o redirect (307/302) para `/login` como erro — é o middleware protegendo a rota.

### 3. Relatório

Apresentar um resumo curto em português:
- ✅/❌ Health (com a lista de falhas, se houver)
- ✅/❌ Páginas públicas
- Uma conclusão de uma linha: "tudo ok" ou "N problemas — ver acima"

Se o health apontar `schema:*` faltando, **lembrar o usuário do SQL de migração** correspondente.

## Fora de escopo (por enquanto)

Fluxos autenticados (cadastro real, criar caso, análise, escalada) exigem
e-mail descartável + estado no banco + custo de API. Deixar para uma evolução
futura (camada Playwright / browser), conforme combinado.
