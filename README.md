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
- Os dados do site publicado ficam separados dos dados do localhost (são endereços diferentes).
  Para levar o que você já cadastrou, use **⚙️ Mais → Backup**: baixe no localhost e importe no site publicado.

## Login

- **Usuário:** `gestão` (ou `gestao`) · **Senha:** combinada com a gestão (não fica escrita aqui, porque o repositório é público).
- "Manter conectado" lembra o login naquele aparelho; o botão **Sair** desconecta.

⚠️ O login é só uma "porta" para quem cair no site sem querer. Como o site não tem servidor, ele **não é segurança de verdade**:
quem souber mexer no código do navegador consegue passar. Não guarde dados sensíveis aqui.

Para trocar a senha, gere o novo código e substitua `AUTH_HASH` no `app.js`:

```bash
python3 -c "import hashlib;print(hashlib.sha256('gestao:NOVASENHA'.encode()).hexdigest())"
```

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

Os dados ficam guardados **no navegador** (localStorage) do aparelho em que você usa o site. Eles não são compartilhados
entre aparelhos e podem ser perdidos se você limpar os dados do navegador. Use **⚙️ Mais → Backup** de vez em quando.

## Personalizar

- **Interusp:** data em `INTERUSP` no `app.js`.
- **Fotos:** coloque o arquivo em `img/` e inclua na lista `FOTOS` no `app.js`.
