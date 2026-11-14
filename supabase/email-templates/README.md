# Templates de e-mail do Supabase Auth

Os e-mails que o Auth dispara (convite, recuperação de senha, confirmação) são
configurados no painel do Supabase, não no código — por isso ficam aqui como
fonte versionada, para colar no painel e para a próxima alteração partir do que
está no repositório.

Onde colar: **Authentication → Emails**, aba do template correspondente.

| Arquivo        | Template no painel | Assunto                                |
| -------------- | ------------------ | -------------------------------------- |
| `convite.html` | *Invite user*      | `Você foi convidado para o TurisGuard` |
| `recuperar-senha.html` | *Reset password* | `Redefina sua senha do TurisGuard` |

O de recuperação não usa `{{ .ConfirmationURL }}`: aponta para
`/auth/confirmar?token_hash=...`, que só gasta o token quando a pessoa clica no
botão. Com o link padrão, antivírus de e-mail (Outlook Safe Links) abriam o
link antes da pessoa e ela recebia "link expirado" logo depois de pedir.

O que ainda está no padrão do Supabase (em inglês) é a confirmação de cadastro
(*Confirm signup*). Vale a mesma tradução quando sobrar um tempo.

## Redirect URLs

O link do convite só leva ao destino que o código pede
(`/resetar-senha`) se esse endereço estiver em **Authentication → URL
Configuration → Redirect URLs**. Fora da lista, o Supabase ignora o destino e
manda a pessoa para a Site URL — a home do site, com os tokens no fragmento da
URL e nenhuma tela para recebê-los.

Precisam estar na lista:

```
https://www.turisguard.com/**
http://localhost:3000/**
```

O segundo é o que permite testar convite e recuperação de senha com o servidor
local (`npm run dev`), que é onde o `NEXT_PUBLIC_APP_URL` do `.env.local`
aponta.
