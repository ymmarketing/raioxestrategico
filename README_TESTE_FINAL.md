# Checklist de teste ponta a ponta — Raio-X Estratégico

Faça na ordem, marcando cada item. Use primeiro o **sandbox** do Asaas
(dinheiro fictício); só depois repita em produção com uma compra real.

> Antes de começar: `/api/health` deve responder `"pronto": true` e `"faltando": []`.

---

## Preparação

- [ ] Backend publicado na Vercel
- [ ] Todas as variáveis cadastradas (14 no total)
- [ ] Redeploy feito **depois** de cadastrar as variáveis
- [ ] Webhook configurado no Asaas, ativo, com o token idêntico
- [ ] `API_BASE_MANUAL` preenchido no HTML com a URL do **backend**
- [ ] `SITE_URL` na Vercel com a URL do **site**
- [ ] `index.production.html` publicado (renomeado para `index.html`)

---

## Os 17 passos

### 1. Site abre
- [ ] Abra o endereço do site num navegador.
- [ ] A página carrega, nada quebrado.
- [ ] Abra o console (F12 → Console). **Não deve haver erro de CORS.**

> Erro de CORS → falta o endereço do site em `ALLOWED_ORIGINS`.

### 2. VSL toca
- [ ] O vídeo aparece com a capa (poster) visível.
- [ ] Clique no play → toca.
- [ ] A velocidade abre em **1,2×**. Os botões 1× / 1,2× / 1,5× / 2× funcionam.
- [ ] Dá para pausar.

### 3. Botão "Fazer meu Raio-X" cria cobrança
- [ ] Clique no botão.
- [ ] O botão muda para **"Preparando…"** por um instante.
- [ ] A página **redireciona** (não abre aba nova) para o Asaas.

> **Teste isso no celular também.** O redirect existe justamente porque
> abrir aba nova depois de uma chamada ao servidor é bloqueado no mobile.

### 4. Cliente é enviado ao Asaas
- [ ] A página do Asaas mostra **R$ 97,00**.
- [ ] Mostra **"Raio-X Estratégico — YM Marketing & Negócios"**.
- [ ] Oferece Pix, boleto e cartão.

### 5. Ref é salva
- [ ] Volte ao site (botão voltar do navegador).
- [ ] No console (F12), digite: `lerRef()`
- [ ] Aparece algo como `"ym_raiox_1751337600000_a3f9c1d2e4b5"`.
- [ ] **Copie essa referência.**

### 6. Cliente volta com `?ref=...`
- [ ] Vá de novo ao Asaas e **pague** (no sandbox é um clique).
- [ ] Após pagar, o Asaas **redireciona de volta para o site**.
- [ ] Por um instante a URL tem `?ref=...`, e logo é **limpa**.
- [ ] Você cai direto na tela "Pagamento em confirmação".

> Se não voltar sozinho: `SITE_URL` não está cadastrada na Vercel.
> Não é grave — o polling ainda funciona se a aba ficou aberta.

### 7. Webhook recebe o pagamento
- [ ] Vercel → aba **Logs**. Procure:
      `Status atualizado pelo webhook` com `"status":"approved"`.

> `Webhook com token inválido` → token diferente entre Asaas e Vercel.
> `Falha ao confirmar cobrança` → chave errada ou ambiente trocado
> (chave `$aact_prod_` com `ASAAS_ENV=sandbox`, ou o contrário).

### 8. Status vira approved
- [ ] Abra: `https://SEU-BACKEND.vercel.app/api/pagamento/status?ref=SUA_REF`
- [ ] Responde `{"status":"approved", ...}`

### 9. Quiz libera
- [ ] Na aba do site, em até 5 segundos o **questionário abre sozinho**.
- [ ] Se não abrir, clique em **"Já efetuei o pagamento"**.

### 10. Motor roda
- [ ] Responda o questionário até o fim.
- [ ] Clique em **"Gerar meu Raio-X"**.
- [ ] Aparece **"Analisando o seu negócio"**.

### 11. Relatório gera
- [ ] O relatório aparece com o **nome do seu negócio** no topo.
- [ ] O bloco verde **"O patrimônio que você já tem"** vem **antes** dos problemas.
- [ ] As barras **Existente → Percebido → Convertido** aparecem.
- [ ] O relatório **não menciona preço** no encerramento.

> Se o texto parecer mais "seco", a IA falhou e o **redator local** assumiu.
> O relatório continua correto — o Motor é quem decide tudo. Confira nos
> logs se `/api/relatorio` deu erro.

### 12. Dashboard aparece
- [ ] Clique em **"Ver meu painel executivo"**.
- [ ] O medidor circular de **saúde geral** mostra um percentual.
- [ ] A escala de maturidade mostra o nível certo.
- [ ] As 7 páginas estão lá.
- [ ] Os nomes estão em **linguagem do dono**
      (ex.: "Como seu negócio vende", não "Oferta & Conversão").

### 13. Impressão / PDF funciona
- [ ] Clique em **"Salvar / imprimir painel"**.
- [ ] Escolha "Salvar como PDF". O arquivo sai legível.
- [ ] Os botões de velocidade e o de ajuda **não** aparecem no PDF.

### 14. WhatsApp de suporte funciona
- [ ] O botão **"Preciso de ajuda"** aparece fixo no canto.
- [ ] Clicando, abre o WhatsApp com a mensagem já escrita.
- [ ] Na tela de pagamento, **"Enviar comprovante no WhatsApp"** também.

### 15. Código manual funciona (contingência)
- [ ] Abra o site numa **janela anônima**.
- [ ] Vá até a tela de pagamento.
- [ ] Digite um dos **20 códigos de cliente** no campo "Já pagou e não liberou?".
- [ ] O questionário abre.
- [ ] Gere o relatório até o fim → deve funcionar normalmente.
- [ ] Abra **outra janela anônima** e digite o **mesmo código** →
      deve dizer **"já foi utilizado"**.

> O resgate fica registrado no **servidor**, não no navegador. Por isso
> limpar cookies ou abrir aba anônima não devolve o código.
>
> Quem entra por código recebe uma `ref` aprovada criada pelo backend —
> a mesma coisa que quem pagou. Por isso o relatório sai com a IA normalmente.

### 16. Código-mestre funciona **apenas** no staging
- [ ] Abra o `index.staging.html`.
- [ ] Digite o código-mestre → o questionário abre.
- [ ] Confirme que `CODIGO_MESTRE` está cadastrada na Vercel.

### 17. Produção **não tem** código-mestre público
- [ ] Abra o `index.production.html`.
- [ ] Digite o código-mestre → deve dizer **"Código não reconhecido"**.
- [ ] No código-fonte da página (Ctrl+U), procure por `MASTER` →
      só o nome da constante `MESTRE_HABILITADO`, **nenhum hash, nenhum código**.
- [ ] Procure por `CODIGOS_HASH` → **não existe** (os códigos vivem no backend).
- [ ] Abra `/api/health` → `"codigoMestreAtivo": false`.

> **Dupla proteção.** Em `ASAAS_ENV=production`, o backend recusa o mestre
> mesmo que você esqueça a variável `CODIGO_MESTRE` cadastrada. E o
> `index.production.html` nem envia o código ao servidor.
>
> Ainda assim, convém remover a variável. O `/api/health` lembra você.

---

## Teste extra: backend fora do ar

- [ ] Na Vercel, pause o projeto (Settings → *Pause*) ou apague uma variável.
- [ ] Abra o site e clique em "Fazer meu Raio-X".
- [ ] Deve mostrar o aviso de instabilidade e mandar para o **link fixo** do Asaas.
- [ ] O código de acesso continua liberando.
- [ ] O relatório sai pelo redator local.
- [ ] **Reative o projeto depois do teste.**

---

## Teste extra: segurança

- [ ] Abra o console (F12) e digite: `paymentStatus = 'approved'; go('quiz')`
      → o quiz **não abre**. Você fica na tela de pagamento.
- [ ] Ainda no console, force o quiz e chame `runAnalysis()`
      → **nenhum relatório é gerado**. Aparece "Não conseguimos confirmar o
      seu acesso" e você volta para a tela de pagamento.
- [ ] Forje uma referência: `localStorage.setItem('ym_raiox_ref','ym_raiox_9999999999_deadbeef12')`
      e tente de novo → continua bloqueado.
- [ ] Chame `/api/relatorio` sem ref → **403**.
- [ ] Chame `/api/pagamento/status?ref=inventada` → **`pending`**, nunca `approved`.
- [ ] No código-fonte da página (Ctrl+U), procure:
      - `sk-ant` e `aact_` → **nada**
      - `Você é o REDATOR` → **nada** (o prompt está no backend)
      - `CODIGOS_HASH` → **nada** (os códigos estão no backend)

> **O que este teste NÃO prova.** O Motor e o redator local são JavaScript
> e vivem no HTML. Um desenvolvedor pode executar `MOTOR_YM.diagnosticar(...)`
> no console e ver um objeto na tela. Isso não é uma brecha do gate: é
> consequência de o Motor rodar no navegador. Ninguém **entra pelo produto**
> nem consome a sua cota da Anthropic sem autorização do servidor.

---

## Depois: virar a chave para produção

Repita os 17 passos com:
- `ASAAS_API_KEY` = chave de produção (`$aact_prod_...`)
- `ASAAS_ENV` = `production`
- `CODIGO_MESTRE` = **vazia**
- Webhook cadastrado **de novo** no Asaas de produção

E faça **uma compra real de R$ 97**, com o seu próprio cartão.
Só isso prova que o fluxo está no ar de verdade.
Depois você pode estornar pelo painel do Asaas.

---

## Se algo falhar

1. Abra `/api/health` — ele diz o que está faltando e o que está errado.
2. Abra os **Logs da Vercel** — mensagens em português, sem vazar chaves.
3. Confira se o **token do webhook** é idêntico nos dois lados.
4. Confira se **chave e ambiente** combinam.

Enquanto resolve, o site **continua vendendo**: o link fixo do Asaas e o
código de acesso mantêm a operação de pé. Nenhum cliente fica sem o Raio-X.
