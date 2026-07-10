# Backend do Raio-X Estratégico — guia de implantação

Este guia é escrito passo a passo. Você não precisa saber programar.
Leia na ordem e faça um item de cada vez.

> **Tempo estimado:** 40 a 60 minutos, se tudo correr bem.
> **Custo:** R$ 0 (Vercel e Upstash têm plano gratuito suficiente).

---

## Antes de começar, entenda o desenho

Há **duas coisas separadas** rodando em lugares diferentes:

| O quê | Onde mora | O que faz |
|---|---|---|
| **Site** (`index.html`, vídeo) | GitHub Pages | O que o cliente vê |
| **Backend** (esta pasta) | Vercel | Cria a cobrança, ouve o Asaas, gera o relatório |

O site conversa com o backend. As **chaves secretas ficam só no backend**, nunca no site.

O fluxo completo:

```
Cliente clica "Fazer meu Raio-X"
   ↓
Site chama o backend → backend cria uma cobrança no Asaas
   ↓                     com uma referência única (ex.: ym_raiox_1751..._a3f9)
Cliente vai para a página de pagamento do Asaas
   ↓
Cliente paga
   ↓
Asaas avisa o backend (webhook) → backend confere na API do Asaas
   ↓                                se confirmou mesmo, grava "approved"
Site pergunta ao backend: "esse cliente pagou?"
   ↓
"Sim" → questionário abre sozinho
```

---

## Parte 1 — Colocar o backend no ar

### 1.1 Criar o repositório no GitHub

1. Entre em [github.com](https://github.com) e crie um repositório novo.
   Sugestão de nome: `ym-raiox-backend`.
   Deixe **privado** (o código não precisa ser público).
2. Suba os arquivos desta pasta. Pela interface do site: **Add file → Upload files**,
   arraste tudo e clique em **Commit changes**.

A estrutura precisa ficar exatamente assim:

```
ym-raiox-backend/
├── api/
│   ├── health.js
│   ├── relatorio.js
│   ├── acesso/
│   │   └── manual.js          ← valida os códigos de acesso (contingência)
│   ├── asaas/
│   │   └── webhook.js
│   └── pagamento/
│       ├── criar.js
│       └── status.js
├── lib/
│   ├── anthropic.js
│   ├── asaas.js
│   ├── cors.js
│   ├── security.js
│   └── store.js
├── testes/
│   └── smoke.js
├── package.json
├── vercel.json
├── .gitignore
└── .env.example
```

> ⚠️ **Nunca** suba um arquivo chamado `.env` com chaves de verdade.
> O `.gitignore` já impede isso, mas confira.

### 1.2 Criar o banco de dados (Upstash)

O backend precisa "lembrar" quem pagou. É isso que o Upstash faz.

1. Entre em [console.upstash.com](https://console.upstash.com) e crie uma conta.
2. Clique em **Create Database**.
   - Nome: `ym-raiox`
   - Tipo: **Redis**
   - Região: escolha a mais perto do Brasil (ex.: `us-east-1`)
   - Plano: **Free**
3. Abra o banco criado e vá na aba **REST API**.
4. Copie os dois valores. Guarde num bloco de notas:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### 1.3 Pegar a chave do Asaas

1. Entre no painel do Asaas → **Integrações** → **Chave de API**.
2. Gere uma chave.
   ⚠️ **Ela aparece uma única vez.** Copie e guarde imediatamente.
   - Produção começa com `$aact_prod_`
   - Sandbox (teste) começa com `$aact_hmlg_`

> **Recomendação forte:** comece com a chave de **sandbox** e `ASAAS_ENV=sandbox`.
> Assim você testa o fluxo inteiro sem cobrar ninguém de verdade.
> Depois troca para produção.

### 1.4 Inventar o token do webhook

Este valor **você cria**. É uma senha que só o Asaas e o seu backend conhecem.

O Asaas exige um token forte: longo, sem sequências como `12345`, sem 4 letras repetidas.

Gere um assim (ou use qualquer gerador de senha, 40 caracteres):

- Abra [passwordsgenerator.net](https://passwordsgenerator.net) ou similar
- Tamanho 40, com letras e números
- Escreva `whsec_` na frente

Exemplo do formato (**não use este**): `whsec_7Kp2mXq9wR4tYn6vBs8dFj3hLc5zAe1gUo0iN`

Guarde. Você vai colar em dois lugares: na Vercel e no painel do Asaas.

### 1.5 Pegar a chave da Anthropic

1. Entre em [console.anthropic.com](https://console.anthropic.com).
2. Vá em **API Keys** → **Create Key**.
3. Copie e guarde. Começa com `sk-ant-`.

### 1.6 Publicar na Vercel

1. Entre em [vercel.com](https://vercel.com) e faça login com a conta do GitHub.
2. Clique em **Add New → Project**.
3. Escolha o repositório `ym-raiox-backend`.
4. **Não mexa** em nenhuma configuração de build. Clique em **Deploy**.
5. Espere terminar. Anote a URL que aparecer, algo como:
   `https://ym-raiox-backend.vercel.app`

### 1.7 Cadastrar as variáveis na Vercel

No projeto, vá em **Settings → Environment Variables**.
Adicione uma por uma. Em cada uma, marque os três ambientes
(Production, Preview, Development).

| Nome | Valor | Onde você pegou |
|---|---|---|
| `ASAAS_API_KEY` | `$aact_hmlg_...` | Passo 1.3 |
| `ASAAS_WEBHOOK_TOKEN` | `whsec_...` | Passo 1.4 (você inventou) |
| `ASAAS_ENV` | `sandbox` (depois `production`) | — |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Passo 1.5 |
| `UPSTASH_REDIS_REST_URL` | `https://...upstash.io` | Passo 1.2 |
| `UPSTASH_REDIS_REST_TOKEN` | (token longo) | Passo 1.2 |
| `PRODUCT_PRICE` | `97` | — |
| `PRODUCT_NAME` | `Raio-X Estratégico` | — |
| `PUBLIC_BASE_URL` | a URL da Vercel | Passo 1.6 |
| `SITE_URL` | o endereço do **site** | ver abaixo |
| `ALLOWED_ORIGINS` | ver abaixo | — |
| `REQUER_PAGAMENTO_RELATORIO` | `true` | — |
| `CODIGO_MESTRE` | **deixe vazio em produção** | ver Parte 6 |

**`SITE_URL`** é o endereço onde o *site* está publicado (não o backend).
Serve para o Asaas mandar o cliente de volta depois de pagar, com a
referência na URL. Exemplo: `https://seuusuario.github.io`
Se estiver num domínio próprio: `https://ymnegocios.com.br`

**`ALLOWED_ORIGINS`** é a lista de endereços autorizados a chamar o backend.
Coloque o endereço do seu site **e** o da Vercel, separados por vírgula, sem espaço:

```
https://seuusuario.github.io,https://ym-raiox-backend.vercel.app
```

> Se o site estiver num domínio próprio (ex.: `https://ymnegocios.com.br`),
> use esse endereço no lugar do `github.io`.

Depois de cadastrar tudo: **Deployments → ⋯ no último deploy → Redeploy**.
As variáveis só valem depois de um novo deploy.

### 1.8 Testar se subiu

Abra no navegador:

```
https://SEU-PROJETO.vercel.app/api/health
```

Você deve ver algo assim:

```json
{
  "ok": true,
  "pronto": true,
  "config": { "asaas": true, "anthropic": true, "redis": true, "redisConectado": true },
  "faltando": []
}
```

- **`"pronto": true`** e **`"faltando": []`** → está tudo certo.
- Se aparecer algo em `faltando`, é o nome da variável que ficou de fora.
  Volte ao passo 1.7, cadastre, e faça **Redeploy**.

> Esta rota **nunca** mostra o valor das chaves. Só diz se elas existem.

---

## Parte 2 — Configurar o webhook no Asaas

O webhook é o aviso que o Asaas manda quando alguém paga.

1. No painel do Asaas, vá em **Integrações → Webhooks → Adicionar**.
2. Preencha:

| Campo | Valor |
|---|---|
| **Nome** | `Raio-X Estratégico` |
| **URL** | `https://SEU-PROJETO.vercel.app/api/asaas/webhook` |
| **E-mail** | seu e-mail (recebe aviso se der erro) |
| **Token de autenticação** | o mesmo `whsec_...` do passo 1.4 |
| **Versão da API** | v3 |
| **Envio** | Sequencial |

3. Em **Eventos**, marque **pelo menos** estes:

- `PAYMENT_CREATED`
- `PAYMENT_CONFIRMED`
- `PAYMENT_RECEIVED`
- `PAYMENT_OVERDUE`
- `PAYMENT_DELETED`
- `PAYMENT_REFUNDED`
- `PAYMENT_REPROVED_BY_RISK_ANALYSIS`

4. Salve e deixe **ativo**.

> ⚠️ O token precisa ser **exatamente igual** nos dois lados.
> Um espaço a mais e o backend recusa (e faz bem: é assim que ele
> distingue o Asaas de um impostor).

---

## Parte 3 — Ligar o site ao backend

1. Abra o `index.html` do site (o do GitHub Pages).
2. Procure esta linha (está no começo do bloco de código, perto do topo):

```js
const API_BASE_MANUAL = "";   // ← COLE AQUI a URL da Vercel quando publicar
```

3. Troque para a URL da Vercel, **sem barra no final**:

```js
const API_BASE_MANUAL = "https://ym-raiox-backend.vercel.app";
```

4. Salve e suba o arquivo atualizado no repositório do site.

Pronto. O fluxo automático está ligado.

---

## Parte 4 — Testar cada peça

Faça na ordem. Se uma falhar, resolva antes de seguir.

### 4.1 Saúde

```
GET https://SEU-PROJETO.vercel.app/api/health
```
Espere: `"pronto": true`.

### 4.2 Criar cobrança

No terminal (ou use um site como reqbin.com):

```bash
curl -X POST https://SEU-PROJETO.vercel.app/api/pagamento/criar \
  -H "Content-Type: application/json" \
  -d '{"nome":"Teste","email":"teste@exemplo.com"}'
```

Espere:
```json
{ "ok": true, "ref": "ym_raiox_...", "paymentUrl": "https://...asaas.com/i/pay_...", "status": "pending" }
```

Guarde a `ref`.

### 4.3 Consultar status

```bash
curl "https://SEU-PROJETO.vercel.app/api/pagamento/status?ref=COLE_A_REF_AQUI"
```

Espere: `{"status":"pending", ...}`

Teste também com uma ref inventada — deve continuar `pending`, nunca `approved`.

### 4.4 Pagar de verdade (em sandbox)

1. Abra a `paymentUrl` que veio no passo 4.2.
2. No **sandbox**, o Asaas deixa você confirmar o pagamento com um clique.
3. Consulte o status de novo (4.3). Agora deve estar `"approved"`.

Se não virar `approved`:
- Veja os **logs da Vercel** (aba *Logs* do projeto). Procure a mensagem
  `Webhook com token inválido` → o token está diferente entre Asaas e Vercel.
- Veja no Asaas se o webhook está **ativo** e se houve tentativa de envio.

### 4.5 Relatório

```bash
curl -X POST https://SEU-PROJETO.vercel.app/api/relatorio \
  -H "Content-Type: application/json" \
  -d '{"diagnostico":{"pilares":[],"veredito":{}}}'
```

Espere **403** (`Acesso não autorizado`). Isso é o certo: sem pagamento
aprovado, ninguém gera relatório. É o que protege sua cota da Anthropic.

### 4.6 Fluxo completo pelo site

Use o `README_TESTE_FINAL.md` — é o checklist de 17 passos.

---

## Parte 5 — Virar a chave para produção

Quando o sandbox estiver funcionando de ponta a ponta:

1. Gere a chave **de produção** no Asaas (`$aact_prod_...`).
2. Na Vercel, troque:
   - `ASAAS_API_KEY` → a chave de produção
   - `ASAAS_ENV` → `production`
3. **Redeploy**.
4. No Asaas de produção, cadastre o webhook de novo (a configuração de sandbox
   não vai junto). Mesma URL, mesmo token.
5. Faça **uma compra real de R$ 97** você mesma, com o seu cartão.
   Confirme que o questionário abre sozinho. Depois estorne, se quiser.

> Este teste com dinheiro de verdade é o único que prova que está tudo certo.
> Não pule.

---

## Parte 6 — As duas versões do site

Você recebeu **dois arquivos HTML**. Eles são quase idênticos.

| Arquivo | Onde usar | Código-mestre |
|---|---|---|
| `index.production.html` | site público | **não funciona** |
| `index.staging.html` | seu teste | funciona (via backend) |

**No site público**, suba `index.production.html` renomeado para `index.html`.

**Por que dois arquivos?** Um código reutilizável e eterno no HTML público
seria um risco: quem descobrisse entraria para sempre sem pagar. Agora:

- O **hash do código-mestre saiu** dos dois arquivos.
- **Os 20 códigos de cliente também saíram.** Nem em texto, nem em hash.
- Toda validação acontece no backend, em `POST /api/acesso/manual`.
- O `index.production.html` nem tenta o mestre (`MESTRE_HABILITADO = false`).
- Se você deixar `CODIGO_MESTRE` vazia na Vercel, **ninguém** entra por ali,
  nem pelo staging.

**Como o código funciona agora:** quando alguém digita um código válido, o
servidor cria uma **ref aprovada no Redis** — exatamente o que o webhook do
Asaas cria quando alguém paga. Existe um só mecanismo de autorização.

**Uso único de verdade:** o resgate fica no servidor. Limpar cookies ou abrir
aba anônima não devolve o código. (Antes, a marca ficava no navegador.)

**Sem backend, o código não funciona.** É intencional: sem servidor não há
autorização possível. Nesse caso o cliente paga pelo link fixo do Asaas,
manda o comprovante, e você entrega o Raio-X manualmente pelo WhatsApp.

### Como testar com o staging

1. Publique `index.staging.html` num lugar separado (ex.: outro repositório,
   ou o mesmo repositório numa pasta `/staging`).
2. Cadastre `CODIGO_MESTRE` na Vercel com o seu código.
3. Teste à vontade.
4. **Quando terminar, apague a variável `CODIGO_MESTRE`** e faça Redeploy.

O `/api/health` avisa se você esquecer: aparece um alerta dizendo
`CÓDIGO-MESTRE ATIVO EM PRODUÇÃO`.

---

## O que continua sendo manual (contingência)

Mesmo com tudo automático, três situações exigem você:

**1. Cliente pagou em outro dispositivo.**
A referência fica guardada no navegador de quem clicou. Se a pessoa pagou pelo
celular e abriu o site no computador, o site não acha a referência.
→ Ela usa o **código de acesso** que você envia pelo WhatsApp.

**2. Backend fora do ar.**
Se a Vercel ou o Upstash caírem, o site detecta e volta ao link fixo do Asaas.
→ Cliente paga, manda comprovante, **você entrega o Raio-X manualmente**
pelo WhatsApp. O código de acesso **não** funciona sem backend — sem servidor
não há como autorizar ninguém com segurança.

**3. Falha na geração do relatório (Anthropic).**
Se a IA falhar mas o acesso já estiver autorizado, o site monta o relatório
sozinho (redator local). O cliente nem percebe. Se falhar até isso, aparece
o botão do WhatsApp.

Os **20 códigos de acesso** e o **código-mestre** continuam sendo o seu plano B —
mas agora dependem do backend estar no ar. Guarde-os.

---

## Onde olhar quando algo der errado

| Sintoma | Onde olhar | Provável causa |
|---|---|---|
| `/api/health` diz `faltando: [...]` | Vercel → Environment Variables | Variável não cadastrada ou sem Redeploy |
| Status nunca vira `approved` | Vercel → Logs | Token do webhook diferente |
| `Webhook com token inválido` no log | Painel do Asaas | Token digitado errado |
| `Falha ao confirmar cobrança` no log | — | Chave do Asaas errada ou ambiente trocado (prod × sandbox) |
| Site diz "instabilidade" | `/api/health` | Backend fora do ar; contingência assumiu |
| Relatório sempre genérico | Vercel → Logs | Anthropic falhando; redator local assumiu |
| Erro de CORS no navegador | `ALLOWED_ORIGINS` | Endereço do site não está na lista |

**Logs da Vercel:** projeto → aba **Logs**. Eles nunca mostram chaves —
valores sensíveis aparecem como `[REDACTED]`.

---

## Resumo das variáveis

```
ASAAS_API_KEY=              # do painel do Asaas (aparece uma vez só)
ASAAS_WEBHOOK_TOKEN=        # você inventa; mesmo valor no Asaas
ASAAS_ENV=sandbox           # depois: production
ANTHROPIC_API_KEY=          # console.anthropic.com
UPSTASH_REDIS_REST_URL=     # console.upstash.com → aba REST API
UPSTASH_REDIS_REST_TOKEN=   # idem
PRODUCT_PRICE=97
PRODUCT_NAME=Raio-X Estratégico
PUBLIC_BASE_URL=https://SEU-PROJETO.vercel.app
SITE_URL=https://seusite.github.io
ALLOWED_ORIGINS=https://seusite.github.io,https://SEU-PROJETO.vercel.app
REQUER_PAGAMENTO_RELATORIO=true
CODIGO_MESTRE=              # VAZIO em produção. Só preencha em staging.
```

### As quatro URLs — não confunda

| Variável / campo | O que colocar | Exemplo |
|---|---|---|
| `API_BASE_MANUAL` (no HTML) | URL do **backend** | `https://ym-raiox-backend.vercel.app` |
| URL do webhook (no Asaas) | backend + `/api/asaas/webhook` | `https://ym-raiox-backend.vercel.app/api/asaas/webhook` |
| `PUBLIC_BASE_URL` (na Vercel) | URL do **backend** | `https://ym-raiox-backend.vercel.app` |
| `SITE_URL` (na Vercel) | URL do **site** | `https://seuusuario.github.io` |
| `ALLOWED_ORIGINS` (na Vercel) | site **e** backend, com vírgula | `https://seuusuario.github.io,https://ym-raiox-backend.vercel.app` |

> `API_BASE_MANUAL` e `PUBLIC_BASE_URL` são a **mesma URL** (a do backend).
> `SITE_URL` é a **outra** (a do site). Trocar as duas é o erro mais comum.

---

## Segurança — o que este backend garante, e o que não garante

### Garante

- Nenhuma chave aparece no site nem nos logs (aparecem como `[REDACTED]`).
- O `SYSTEM_PROMPT` da YM vive só no servidor. Não está no HTML público.
- Os 20 códigos de acesso vivem só no servidor, como hash. Não estão no HTML.
- **Uso único de verdade:** o resgate de um código fica registrado no Redis.
  Limpar cookies ou abrir aba anônima **não** devolve o código.
- O webhook exige token **e** confere o pagamento direto na API do Asaas.
  Um POST forjado não passa.
- Pagamento de valor **diferente** de R$ 97 não aprova (maior ou menor).
- O mesmo evento do Asaas não é processado duas vezes.
- Referência inexistente, malformada ou ausente → **nunca** libera.
- `/api/relatorio` só responde para quem tem ref aprovada no servidor.
  Isso protege a sua cota da Anthropic.
- Rate limit por IP nas rotas de criação de cobrança e de código de acesso.
- Existe **um só mecanismo de autorização**: a ref aprovada no Redis.
  Ela nasce do webhook do Asaas ou do resgate de um código válido.
  O navegador não consegue criar uma.
- **Trava de ambiente no código-mestre:** com `ASAAS_ENV=production`, o
  backend recusa o mestre mesmo que a variável `CODIGO_MESTRE` tenha ficado
  cadastrada por esquecimento. Só existe mestre em sandbox.
- **Sem backend, ninguém gera relatório.** O HTML público não libera nada
  sozinho. O cliente paga pelo link fixo e é atendido pelo WhatsApp.

### O que NÃO garante — e por quê

O Motor de Diagnóstico e o redator local são JavaScript, e vivem no HTML
público. Um desenvolvedor pode abrir o console do navegador e executar
`MOTOR_YM.diagnosticar(...)` ou `redatorLocal(...)` diretamente, vendo um
objeto JavaScript na tela.

**Isso não é uma brecha do gate.** É consequência de o Motor rodar no
navegador. Para eliminar isso seria preciso mover o Motor para o servidor —
o que mudaria o produto e não foi pedido.

O que o gate impede, e foi testado:

| Tentativa | Resultado |
|---|---|
| `paymentStatus='approved'; go('quiz')` | a tela pisca e o servidor expulsa em ~1s |
| Forçar `renderQuiz()` e chamar `runAnalysis()` | **bloqueado**: nenhum relatório, nenhum dashboard |
| Forjar uma `ref` no `localStorage` | **bloqueado**: o servidor não reconhece |
| Chamar `/api/relatorio` com ref forjada | **403** |
| Reusar um código de acesso | **403**, mesmo em aba anônima |
| Digitar o código-mestre em produção | **bloqueado** no front e no backend |
| Usar o site com o backend fora do ar | nenhum relatório é gerado |

Em resumo: ninguém **entra pelo produto** sem autorização do servidor, e
ninguém consome a sua cota da Anthropic sem ter pago. Um dev curioso pode
brincar com funções soltas no próprio navegador — e não leva nada com isso.

Estas garantias foram testadas: `node testes/smoke.js` roda **41 verificações**.
