# Gestão Judô Poli

Site simples para a gestão da equipe de Judô Poli USP: mensalidades, caixinha, exame de faixa e agenda.

## Rodar no localhost

O site é só HTML, CSS e JavaScript — não precisa instalar dependências. Basta subir um servidor local na pasta do projeto:

```bash
# entrar na pasta do projeto
cd JUDO-POLI-USP

# opção 1: Python (já vem no Linux/Mac; no Windows instale em python.org)
python3 -m http.server 8000
# no Windows, se "python3" não funcionar:
python -m http.server 8000

# opção 2: Node.js
npx serve -l 8000
```

Depois abra **http://localhost:8000** no navegador. Para parar o servidor, aperte `Ctrl + C` no terminal.

> Os dados ficam salvos por endereço: o que você cadastrar em `http://localhost:8000` não aparece se abrir o
> `index.html` direto pelo arquivo (ou em outra porta), e vice-versa. Use sempre o mesmo endereço, ou
> exporte/importe o backup em **⚙️ Mais → Backup**.

## Publicar no GitHub Pages

O site não tem etapa de build: o GitHub Pages publica os arquivos do jeito que estão.

1. Envie o código para o GitHub (`git push origin main`).
2. No repositório, abra **Settings → Pages**.
3. Em **Build and deployment → Source**, escolha **Deploy from a branch**.
4. Em **Branch**, escolha **main** e a pasta **/ (root)**, depois clique em **Save**.
5. Em 1 ou 2 minutos o site estará em **https://somarianoso.github.io/JUDO-POLI-USP/**.

Toda vez que você der `git push` na `main`, o site é atualizado sozinho (acompanhe em **Actions**).

- O arquivo `.nojekyll` faz o GitHub servir os arquivos direto, sem processar com Jekyll.
- Todos os caminhos são relativos (`img/...`, `style.css`), então o site funciona dentro da subpasta `/JUDO-POLI-USP/`.
- Os dados vêm do `dados.enc.json` (veja **Login e dados criptografados**); sem esse arquivo ninguém consegue entrar.

## Login e dados criptografados

Os dados da equipe (atletas, mensalidades, caixinha…) ficam no arquivo **`dados.enc.json`**, **criptografado com a senha**
(AES-256-GCM, chave derivada da senha com PBKDF2-SHA256, 600 mil iterações). O repositório e o site são públicos,
mas sem a senha o arquivo é ilegível. O login funciona tentando abrir esse arquivo: senha errada não abre nada.

- **Usuário:** `gestão` (ou `gestao`) · **Senha:** combinada com a gestão (não fica escrita aqui).
- "Manter conectado" guarda a chave de acesso naquele aparelho; o botão **Sair** apaga essa chave.
- A senha precisa ser **forte** (pelo menos 14 caracteres; ex.: 4 ou 5 palavras aleatórias), porque qualquer pessoa
  pode baixar o arquivo e tentar adivinhar a senha no próprio computador.

### Primeira vez / trocar a senha

Precisa do [Node.js](https://nodejs.org) 20 ou mais novo.

1. Baixe um backup: **⚙️ Mais → Backup → Baixar backup**. Se ainda não existe `dados.enc.json`, tente entrar no
   **http://localhost:8000**: vai aparecer o botão **⬇️ Baixar backup deste navegador** na tela de login.
2. Gere uma senha forte (ou use uma sua, com pelo menos 14 caracteres):

   ```bash
   node ferramentas/gerar-senha.mjs
   ```

   Anote num lugar seguro (ex.: gerenciador de senhas) e passe para a gestão por mensagem privada.
3. Na pasta do projeto, rode o comando abaixo e digite o usuário e a senha nova (a senha não aparece enquanto você digita):

   ```bash
   node ferramentas/criptografar.mjs ~/Downloads/judo-backup-AAAA-MM-DD.json
   ```

   No WSL, a pasta Downloads do Windows fica em `/mnt/c/Users/SEU_USUARIO/Downloads/`.
4. Publique: `git add dados.enc.json && git commit -m "atualiza dados" && git push`
5. Apague o backup sem criptografia do computador (e **nunca** faça commit dele; o `.gitignore` já bloqueia `*backup*.json`).

Ao trocar a senha, todos os aparelhos precisam entrar de novo com a senha nova.

### Publicar alterações para todos

O que você muda no site fica salvo **só no seu navegador** até ser publicado:

1. Ligue **✏️ Editar** e vá em **⚙️ Mais → Backup → 🔒 Gerar arquivo para publicar**. O navegador baixa um `dados.enc.json` novo
   (já criptografado com a mesma senha).
2. Coloque esse arquivo na pasta do projeto, substituindo o antigo (se o navegador salvou como `dados.enc (1).json`, renomeie).
3. `git add dados.enc.json && git commit -m "atualiza dados" && git push`

Quando alguém entrar ou abrir o site depois disso, recebe a versão nova. Se aquele aparelho tiver alterações
que ainda não foram publicadas, o site pergunta se quer substituir pela versão publicada ou manter as alterações dele.

## Como usar

No topo, escolha o mês com as setas **‹ ›**. Tudo na tela mostra aquele mês.

- **🥋 Falta para o sensei:** quanto falta para fechar o salário (R$ 1.000).
- **🐷 Caixinha:** na primeira vez, informe quanto a equipe tem em caixa. A cada mês a conta é
  *caixa no início + tudo que entrou − salário do sensei*, e o que sobrar passa sozinho para o mês seguinte.
  Use **✏️ corrigir** se o valor real em caixa for diferente.

Abas:

- **💰 Mensalidades (no topo da página):** toque no nome de quem pagou — cada um soma R$ 90 (dá para mudar o valor ao lado).
- **💵 Entradas e gastos:** camisetas, rifas, eventos, compras etc.
- **🥋 Exame:** exame de faixa. Defina a taxa por atleta e a data, marque quem vai fazer e registre os pagamentos
  (pode ser em partes) — cada pagamento entra no mês selecionado no topo (ex.: parte em novembro, parte em dezembro).
  Esse dinheiro fica **separado** da caixinha e do salário do sensei.
- **📅 Agenda:** toque num dia e adicione o evento. **📅 Google** abre o Google Agenda com o evento pronto para salvar;
  **Baixar todos do mês (.ics)** gera um arquivo para importar no Google Agenda, celular ou Outlook.
- **⚙️ Mais:** resumo do ano, atletas (cadastrar, editar, inativar), valores (salário, mensalidade padrão), fotos e backup.

## Onde ficam os dados

A versão "oficial" é o `dados.enc.json` publicado (criptografado). Cada navegador guarda uma cópia (localStorage) para usar
e editar; essa cópia só vai para os outros aparelhos depois de **publicar** (veja acima). Use **⚙️ Mais → Backup** de vez em quando.

## Personalizar

- **Interusp:** data em `INTERUSP` no `app.js`.
- **Fotos:** coloque o arquivo em `img/` e inclua na lista `FOTOS` no `app.js`.
