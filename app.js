'use strict';

/* =========================================================
   Gestão Judô Poli — dados salvos no localStorage do navegador
   ========================================================= */

const STORAGE_KEY = 'judo-poli-usp-v1';
const AUTH_KEY = 'judo-poli-auth';
const EDIT_KEY = 'judo-poli-edicao';
// SHA-256 de "usuario:senha" (usuário sem acento e em minúsculas). Para trocar a senha, veja o README.
const AUTH_HASH = 'e932ed910bde6491cb9874491eb4c81a777b79c2c6e78ac5d5ec661e4f37a379';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MENSALIDADE_PADRAO = 90;
const ATLETAS_INICIAIS = [
  'Thiago', 'Iza', 'Curi', 'Alencar', 'Ita', 'Miguel',
  'Patrick', 'Nakamura', 'Mari', 'Soso', 'Leo Musa', 'Leo Maozinha',
];
const TIPOS_PADRAO = {
  entradas: ['Camiseta', 'Kimono', 'Rifa', 'Evento', 'Doação', 'Outro'],
  gastos: ['Material de treino', 'Compra de camisetas', 'Transporte', 'Inscrição em campeonato', 'Outro'],
};
const novoBloco = (nome, taxa = 0, id = null, emoji = '🎯') =>
  ({ id: id || uid(), nome, emoji, data: '', taxa, participantes: {}, pagamentos: [] });

const estadoPadrao = () => ({
  settings: {
    salario: 1000, mensalidadePadrao: MENSALIDADE_PADRAO, extrasNaMeta: true,
    interusp: { titulo: 'Interusp 2027', data: '2027-05-27' },
  },
  atletas: [],            // {id, nome, mensalidade, ativo}
  pagamentos: {},         // { 'AAAA-MM': { [atletaId]: { valor, data } } }
  receitas: [],           // entradas extras: {id, data, tipo, descricao, valor}
  gastos: [],             // {id, data, tipo, descricao, valor}
  tipos: { entradas: [...TIPOS_PADRAO.entradas], gastos: [...TIPOS_PADRAO.gastos] },
  caixa: { ajustes: {} }, // { 'AAAA-MM': valor em caixa no início do mês (informado à mão) }
  eventos: [],            // {id, data, hora, titulo}
  blocos: [novoBloco('Exame de faixa', 0, 'exame-faixa', '🥋')], // arrecadações separadas da caixinha
});

/* ---------- utilitários ---------- */
const pad = (n) => String(n).padStart(2, '0');
function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
const brl = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (iso) => iso ? iso.split('-').reverse().join('/') : '';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');
const soma = (lista) => lista.reduce((s, x) => s + Number(x.valor || 0), 0);

function nomeMes(ym, comAno = true) {
  const [a, m] = ym.split('-').map(Number);
  const nome = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', comAno ? { month: 'long', year: 'numeric' } : { month: 'long' });
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}
function somarMes(ym, delta) {
  const [a, m] = ym.split('-').map(Number);
  const d = new Date(a, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

let toastTimer;
function aviso(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('visivel');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('visivel'), 2600);
}

/* ---------- SHA-256 (funciona também abrindo o arquivo direto, sem servidor) ---------- */
function sha256Hex(texto) {
  const bytes = new TextEncoder().encode(texto);
  const K = [], H = [];
  const frac = (x) => ((x - Math.floor(x)) * 4294967296) | 0;
  for (let n = 2, c = 0; c < 64; n++) {
    let primo = true;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) { primo = false; break; }
    if (primo) { if (c < 8) H[c] = frac(Math.sqrt(n)); K[c] = frac(Math.cbrt(n)); c++; }
  }
  const len = bytes.length, total = ((len + 9 + 63) >> 6) << 6;
  const m = new Uint8Array(total);
  m.set(bytes); m[len] = 0x80;
  const dv = new DataView(m.buffer);
  dv.setUint32(total - 4, (len * 8) >>> 0);
  dv.setUint32(total - 8, Math.floor((len * 8) / 4294967296));
  const w = new Int32Array(64);
  const rotr = (x, r) => (x >>> r) | (x << (32 - r));
  for (let i = 0; i < total; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = dv.getInt32(i + t * 4);
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[t] + w[t]) | 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    [a, b, c, d, e, f, g, h].forEach((v, k) => { H[k] = (H[k] + v) | 0; });
  }
  return H.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

/* ---------- login ---------- */
const normalizarUsuario = (u) => u.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function lerToken() {
  try { return localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY); } catch { return null; }
}

$('#form-login').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target;
  const hash = sha256Hex(`${normalizarUsuario(f.usuario.value)}:${f.senha.value}`);
  if (hash !== AUTH_HASH) {
    $('#erro-login').hidden = false;
    f.senha.value = ''; f.senha.focus();
    return;
  }
  try { (f.lembrar.checked ? localStorage : sessionStorage).setItem(AUTH_KEY, hash); } catch { /* sem storage */ }
  f.reset();
  $('#erro-login').hidden = true;
  entrar();
});
$('#btn-sair').addEventListener('click', () => {
  try { localStorage.removeItem(AUTH_KEY); sessionStorage.removeItem(AUTH_KEY); } catch { /* ok */ }
  definirEdicao(false);
  $('#app').hidden = true;
  $('#tela-login').hidden = false;
});

let appIniciado = false;
function entrar() {
  $('#tela-login').hidden = true;
  $('#app').hidden = false;
  if (!appIniciado) { iniciarApp(); appIniciado = true; }
}

/* ---------- estado ---------- */
function normalizar(dados) {
  const base = estadoPadrao();
  const st = dados.settings || {};
  const est = {
    ...base, ...dados,
    settings: { ...base.settings, ...st, interusp: { ...base.settings.interusp, ...(st.interusp || {}) } },
  };
  est.caixa = { ajustes: { ...((dados.caixa && dados.caixa.ajustes) || {}) } };
  est.eventos = Array.isArray(dados.eventos) ? dados.eventos : [];
  est.receitas = Array.isArray(dados.receitas) ? dados.receitas : [];
  est.gastos = Array.isArray(dados.gastos) ? dados.gastos : [];
  est.tipos = {
    entradas: Array.isArray(dados.tipos?.entradas) ? dados.tipos.entradas : [...TIPOS_PADRAO.entradas],
    gastos: Array.isArray(dados.tipos?.gastos) ? dados.tipos.gastos : [...TIPOS_PADRAO.gastos],
  };
  if (Array.isArray(dados.blocos)) {
    est.blocos = dados.blocos.map((b) => ({ ...novoBloco(b.nome, 0, b.id, b.emoji), ...b }));
  } else if (dados.exame) {
    // versão anterior: o exame de faixa era uma aba própria
    est.blocos = [{ ...novoBloco('Exame de faixa', 0, 'exame-faixa', '🥋'), ...dados.exame }];
  }
  delete est.exame;
  return est;
}

// Cadastra a lista inicial de atletas uma única vez (sem duplicar quem já existe)
function cadastrarIniciais(est) {
  if (est.settings.iniciaisCadastrados) return est;
  const existentes = new Set(est.atletas.map((a) => a.nome.trim().toLowerCase()));
  for (const nome of ATLETAS_INICIAIS) {
    if (!existentes.has(nome.toLowerCase())) {
      est.atletas.push({ id: uid(), nome, mensalidade: MENSALIDADE_PADRAO, ativo: true });
    }
  }
  if (est.settings.mensalidadePadrao === 50) est.settings.mensalidadePadrao = MENSALIDADE_PADRAO; // padrão antigo
  est.settings.iniciaisCadastrados = true;
  return est;
}

function carregar() {
  let est;
  try {
    const bruto = localStorage.getItem(STORAGE_KEY);
    est = bruto ? normalizar(JSON.parse(bruto)) : estadoPadrao();
  } catch {
    est = estadoPadrao();
  }
  est = cadastrarIniciais(est);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(est)); } catch { /* sem storage */ }
  return est;
}
function salvar() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
  } catch {
    aviso('Não foi possível salvar no navegador. Faça um backup!');
  }
}

let estado = carregar();
const MES_HOJE = hojeISO().slice(0, 7);
let mesAtual = MES_HOJE;
let abaAtual = 'pagamentos';
let diaSelecionado = null;
let editando = false;
try { editando = sessionStorage.getItem(EDIT_KEY) === '1'; } catch { /* ok */ }

function definirEdicao(ligado) {
  editando = ligado;
  try { sessionStorage.setItem(EDIT_KEY, ligado ? '1' : '0'); } catch { /* ok */ }
  document.body.classList.toggle('editando', ligado);
  $('#btn-editar').textContent = ligado ? '✔ Concluir' : '✏️ Editar';
  $('#btn-editar').classList.toggle('ligado', ligado);
  if (appIniciado) renderTudo();
}

/* ---------- cálculos ---------- */
const atletaPorId = (id) => estado.atletas.find((a) => a.id === id);
const pagamentosDoMes = (ym) => estado.pagamentos[ym] || {};
const doMes = (lista, ym) => lista.filter((r) => r.data.slice(0, 7) === ym);
const blocoPorId = (id) => estado.blocos.find((b) => b.id === id);

// Atletas que aparecem num mês: ativos + quem pagou naquele mês (mesmo se inativo hoje)
function atletasDoMes(ym) {
  const pagos = pagamentosDoMes(ym);
  return estado.atletas.filter((a) => a.ativo || pagos[a.id]).sort(porNome);
}

function totaisDoMes(ym) {
  const pagos = pagamentosDoMes(ym);
  const mensalidades = soma(Object.values(pagos));
  const extras = soma(doMes(estado.receitas, ym));
  const gastos = soma(doMes(estado.gastos, ym));
  const salario = Number(estado.settings.salario) || 0;
  const paraSensei = mensalidades + (estado.settings.extrasNaMeta ? extras : 0);
  return {
    mensalidades, extras, gastos, total: mensalidades + extras, salario, paraSensei,
    faltaSensei: salario - paraSensei,
    pagantes: Object.keys(pagos).length,
    atletas: atletasDoMes(ym).length,
  };
}

/* Caixinha: o caixa do início de um mês é a sobra do mês anterior.
   Sobra do mês = caixa no início + tudo que entrou − gastos − salário do sensei.
   O primeiro valor é informado à mão; qualquer mês pode ser corrigido no modo edição. */
function caixaDoMes(ym) {
  const ajustes = estado.caixa.ajustes;
  const meses = Object.keys(ajustes).sort();
  if (!meses.length || ym < meses[0]) return null;
  let m = meses[0], fim = 0;
  for (;;) {
    const manual = ajustes[m] !== undefined;
    const inicio = manual ? Number(ajustes[m]) : fim;
    const t = totaisDoMes(m);
    fim = inicio + t.total - t.gastos - t.salario;
    if (m === ym) return { inicio, fim, manual, total: t.total, gastos: t.gastos, salario: t.salario };
    m = somarMes(m, 1);
  }
}

function marcarPagamento(ym, atletaId, pago, valor) {
  const atleta = atletaPorId(atletaId);
  if (!atleta) return;
  if (pago) {
    estado.pagamentos[ym] = estado.pagamentos[ym] || {};
    estado.pagamentos[ym][atletaId] = { valor: valor ?? (Number(atleta.mensalidade) || 0), data: hojeISO() };
  } else if (estado.pagamentos[ym]) {
    delete estado.pagamentos[ym][atletaId];
    if (!Object.keys(estado.pagamentos[ym]).length) delete estado.pagamentos[ym];
  }
  salvar();
}

/* ---------- renderização ---------- */
function renderTudo() {
  $('#titulo-mes').textContent = nomeMes(mesAtual);
  $('#btn-hoje').hidden = mesAtual === MES_HOJE;
  renderInterusp();
  renderResumo();
  if (editando) renderConfig();
  renderMensalidades();
  if (abaAtual === 'pagamentos') renderMov();
  if (abaAtual === 'blocos') renderBlocos();
  if (abaAtual === 'agenda') renderCalendario();
  if (abaAtual === 'mais') renderHistorico();
}

function renderResumo() {
  const t = totaisDoMes(mesAtual);
  const pago = t.faltaSensei <= 0;
  $('#cartao-sensei').classList.toggle('pago', pago);
  $('#r-sensei-rotulo').textContent = pago ? '🥋 Sensei garantido! ✅' : '🥋 Falta para o sensei';
  $('#r-sensei').textContent = pago ? brl(t.paraSensei) : brl(t.faltaSensei);
  $('#r-sensei-det').textContent = pago
    ? `arrecadado — sobrou ${brl(-t.faltaSensei)} além dos ${brl(t.salario)}`
    : `já entrou ${brl(t.paraSensei)} de ${brl(t.salario)}`;
  $('#barra').style.width = (t.salario > 0 ? Math.min(100, (t.paraSensei / t.salario) * 100) : 100) + '%';

  const c = caixaDoMes(mesAtual);
  $('#caixa-vazia').hidden = !!c;
  $('#caixa-cheia').hidden = !c;
  if (!c) {
    $('#caixa-mes-nome').textContent = nomeMes(mesAtual, false).toLowerCase();
  } else {
    const forte = $('#r-caixa');
    forte.textContent = brl(c.fim);
    forte.classList.toggle('negativo', c.fim < 0);
    $('#r-caixa-conta').textContent =
      `${brl(c.inicio)} ${c.manual ? 'no início' : 'que sobrou do mês passado'} + ${brl(c.total)} entrou` +
      (c.gastos ? ` − ${brl(c.gastos)} gastos` : '') + ` − ${brl(c.salario)} sensei`;
    const inp = $('#form-caixa-editar').valor;
    if (document.activeElement !== inp) inp.value = c.inicio;
  }
}

function renderMensalidades() {
  const t = totaisDoMes(mesAtual);
  const faltam = t.atletas - t.pagantes;
  const pagos = pagamentosDoMes(mesAtual);

  if (editando) {
    $('#dica-mensal').textContent = 'Edite nome e mensalidade de cada atleta. Inativar esconde da lista sem apagar o histórico.';
    $('#lista-mensal').innerHTML = estado.atletas.slice().sort((a, b) => (b.ativo - a.ativo) || porNome(a, b)).map((a) => `
      <li class="pessoa editavel ${a.ativo ? '' : 'inativo'}" data-id="${a.id}">
        <input class="ed-nome cresce" value="${esc(a.nome)}" aria-label="Nome">
        <span class="prefixo">R$</span>
        <input class="ed-mens valor" type="number" step="0.01" min="0" inputmode="decimal" value="${a.mensalidade}" aria-label="Mensalidade de ${esc(a.nome)}">
        <button class="btn" data-ativo="${a.id}">${a.ativo ? 'Inativar' : 'Reativar'}</button>
        <button class="btn-link perigo" data-del-atleta="${a.id}" aria-label="Excluir ${esc(a.nome)}">✕</button>
      </li>`).join('');
    const f = $('#form-atleta');
    if (!f.mensalidade.value) f.mensalidade.value = estado.settings.mensalidadePadrao;
    return;
  }

  $('#dica-mensal').textContent = !t.atletas ? 'Nenhum atleta cadastrado. Toque em ✏️ Editar para cadastrar.' : faltam === 0
    ? '🎉 Todo mundo pagou este mês!'
    : `Toque no nome de quem pagou · faltam ${faltam} de ${t.atletas}`;
  $('#lista-mensal').innerHTML = atletasDoMes(mesAtual).map((a) => {
    const p = pagos[a.id];
    return `<li class="pessoa ${p ? 'pago' : ''}" data-id="${a.id}">
      <label class="pessoa-check">
        <input type="checkbox" class="chk-pago" ${p ? 'checked' : ''}>
        <span class="nome">${esc(a.nome)}</span>${a.ativo ? '' : '<span class="etiqueta">inativo</span>'}
      </label>
      <span class="prefixo">R$</span>
      <input class="valor" type="number" step="0.01" min="0" inputmode="decimal"
        value="${p ? p.valor : a.mensalidade}" aria-label="Valor de ${esc(a.nome)}">
    </li>`;
  }).join('');
}

function preencherTipos() {
  const f = $('#form-mov');
  const lista = estado.tipos[f.sinal.value === 'gasto' ? 'gastos' : 'entradas'];
  const atual = f.tipo.value;
  f.tipo.innerHTML = lista.map((t) => `<option>${esc(t)}</option>`).join('') || '<option value="">(sem tipos)</option>';
  if (lista.includes(atual)) f.tipo.value = atual;
}

function renderMov() {
  preencherTipos();
  const form = $('#form-mov');
  if (!form.data.value || form.data.value.slice(0, 7) !== mesAtual) {
    form.data.value = MES_HOJE === mesAtual ? hojeISO() : `${mesAtual}-01`;
  }
  const lista = [
    ...doMes(estado.receitas, mesAtual).map((r) => ({ ...r, sinal: 'entrada' })),
    ...doMes(estado.gastos, mesAtual).map((r) => ({ ...r, sinal: 'gasto' })),
  ].sort((a, b) => a.data.localeCompare(b.data));
  const ent = soma(lista.filter((x) => x.sinal === 'entrada'));
  const gas = soma(lista.filter((x) => x.sinal === 'gasto'));
  $('#lista-mov').innerHTML = lista.map((r) => `<li class="mov-${r.sinal}">
      <span class="data-chip"><b>${r.data.slice(8)}</b><small>${MESES[+r.data.slice(5, 7) - 1]}</small></span>
      <span class="principal">${esc(r.descricao || r.tipo || r.categoria || '')}
        ${r.tipo && r.descricao ? `<span class="sub">${esc(r.tipo)}</span>` : ''}</span>
      <span class="valor-fixo">${r.sinal === 'gasto' ? '− ' : '+ '}${brl(r.valor)}</span>
      <button class="btn-link perigo so-edicao" data-del-mov="${r.sinal}|${r.id}" aria-label="Excluir">✕</button>
    </li>`).join('') + (lista.length
      ? `<li class="total"><span>Entradas ${brl(ent)}</span><span>Gastos ${brl(gas)}</span></li>` : '');
}

/* ----- arrecadações (blocos) ----- */
const pagoNoBloco = (b, id) => soma(b.pagamentos.filter((p) => p.atletaId === id));

function renderBlocos() {
  $('#blocos').innerHTML = estado.blocos.map((b) => {
    const taxa = Number(b.taxa) || 0;
    const participantes = estado.atletas.filter((a) => b.participantes[a.id]);
    const total = soma(b.pagamentos);
    const esperado = taxa * participantes.length;
    const porMes = {};
    for (const p of b.pagamentos) porMes[p.data.slice(0, 7)] = (porMes[p.data.slice(0, 7)] || 0) + Number(p.valor);
    const partes = Object.keys(porMes).sort().map((m) => `${nomeMes(m, false).toLowerCase()} ${brl(porMes[m])}`);
    const quitados = participantes.filter((a) => taxa > 0 && pagoNoBloco(b, a.id) >= taxa).length;
    const det = !participantes.length
      ? 'Marque abaixo quem participa.'
      : !taxa ? `${participantes.length} participantes · defina o valor por atleta no modo edição`
        : `de ${brl(esperado)} · ${quitados} de ${participantes.length} quitaram` + (partes.length ? ` · ${partes.join(' + ')}` : '');
    const pct = esperado > 0 ? Math.min(100, (total / esperado) * 100) : 0;

    const pessoas = estado.atletas.filter((a) => a.ativo || b.participantes[a.id] || pagoNoBloco(b, a.id))
      .sort((x, y) => (!!b.participantes[y.id] - !!b.participantes[x.id]) || porNome(x, y));
    const linhas = pessoas.map((a) => {
      const participa = !!b.participantes[a.id];
      const pago = pagoNoBloco(b, a.id);
      const quitado = participa && taxa > 0 && pago >= taxa;
      const restante = Math.max(0, taxa - pago);
      const pagtos = b.pagamentos.filter((p) => p.atletaId === a.id).sort((x, y) => x.data.localeCompare(y.data));
      const status = !participa ? '' : quitado
        ? '<span class="ex-status ok">✅ pago</span>'
        : taxa ? `<span class="ex-status falta">falta ${brl(restante)}</span>` : `<span class="ex-status">${brl(pago)}</span>`;
      return `<li class="ex-pessoa ${participa ? 'participa' : ''} ${quitado ? 'quitado' : ''}" data-id="${a.id}">
        <div class="linha">
          <label class="pessoa-check"><input type="checkbox" class="chk-participa" ${participa ? 'checked' : ''}>
            <span class="nome">${esc(a.nome)}</span></label>
          ${status}
        </div>
        ${participa ? `<div class="ex-pagtos">
          ${pagtos.map((p) => `<span class="chip-pagto">${MESES[+p.data.slice(5, 7) - 1]} ${brl(p.valor)}<button class="so-edicao" data-del-pag="${p.id}" aria-label="Remover pagamento">✕</button></span>`).join('')}
          ${quitado ? '' : `<span class="prefixo">R$</span><input class="ex-valor" type="number" step="0.01" min="0.01" inputmode="decimal"
              value="${restante || ''}" aria-label="Valor pago por ${esc(a.nome)}"><button class="btn-primario ex-add" aria-label="Registrar pagamento">+</button>`}
        </div>` : ''}
      </li>`;
    }).join('');

    return `<div class="cartao bloco ${esperado > 0 && total >= esperado ? 'completo' : ''}" data-bloco="${b.id}">
      <span class="rotulo">${esc(b.emoji || '🎯')} ${esc(b.nome)}${b.data ? ` <span class="dica-inline">· ${dataBR(b.data)}</span>` : ''}</span>
      <div class="bloco-edicao so-edicao">
        <label>Nome <input class="bl-nome" value="${esc(b.nome)}"></label>
        <label>Por atleta <span class="campo-valor"><span class="prefixo">R$</span><input class="bl-taxa" type="number" step="0.01" min="0" value="${taxa || ''}" placeholder="0,00"></span></label>
        <label>Data <input class="bl-data" type="date" value="${b.data || ''}"></label>
        <button class="btn-link perigo bl-del">🗑 Excluir bloco</button>
      </div>
      <strong>${brl(total)}</strong>
      <div class="progresso" aria-hidden="true"><div style="width:${pct}%"></div></div>
      <span class="detalhe">${det}</span>
      <ul class="lista-exame">${linhas}</ul>
    </div>`;
  }).join('') || '<p class="vazio">Nenhum bloco. Toque em ✏️ Editar para criar.</p>';
}

/* ----- calendário ----- */
const todosEventos = () => [
  { id: 'interusp', data: estado.settings.interusp.data, titulo: '🏆 ' + estado.settings.interusp.titulo, hora: '', fixo: true },
  ...estado.blocos.filter((b) => b.data).map((b) => ({ id: 'bloco-' + b.id, data: b.data, titulo: `${b.emoji || '🎯'} ${b.nome}`, hora: '', fixo: true })),
  ...estado.eventos,
];
const eventosDoMes = (ym) => todosEventos()
  .filter((e) => e.data && e.data.slice(0, 7) === ym)
  .sort((a, b) => (a.data + (a.hora || '')).localeCompare(b.data + (b.hora || '')));

function renderCalendario() {
  const [ano, mes] = mesAtual.split('-').map(Number);
  const primeiroDia = new Date(ano, mes - 1, 1).getDay();
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const eventos = eventosDoMes(mesAtual);
  const hoje = hojeISO();

  let html = DIAS_SEMANA.map((d) => `<div class="dow">${d}</div>`).join('');
  for (let i = 0; i < primeiroDia; i++) html += '<div class="vazio-dia"></div>';
  for (let d = 1; d <= diasNoMes; d++) {
    const iso = `${mesAtual}-${pad(d)}`;
    const evs = eventos.filter((e) => e.data === iso);
    html += `<button class="dia ${iso === hoje ? 'hoje' : ''} ${iso === diaSelecionado ? 'selecionado' : ''}" data-dia="${iso}"
        aria-label="${d} de ${nomeMes(mesAtual)}${evs.length ? ', ' + evs.length + ' evento(s)' : ''}">
      <span class="n">${d}</span>
      ${evs.map((e) => `<span class="ev ${e.fixo ? 'especial' : ''}">${e.hora ? e.hora + ' ' : ''}${esc(e.titulo)}</span>`).join('')}
    </button>`;
  }
  $('#calendario').innerHTML = html;

  const form = $('#form-evento');
  if (!form.data.value || form.data.value.slice(0, 7) !== mesAtual) {
    form.data.value = MES_HOJE === mesAtual ? hoje : `${mesAtual}-01`;
  }
  $('#btn-ics').hidden = !eventos.length;
  $('#lista-eventos').innerHTML = eventos.map((e) => `<li>
      <span class="data-chip ${e.fixo ? 'especial' : ''}"><b>${e.data.slice(8)}</b><small>${DIAS_SEMANA[new Date(e.data + 'T12:00').getDay()]}</small></span>
      <span class="principal">${esc(e.titulo)}<span class="sub">${e.hora ? e.hora : 'Dia inteiro'}</span></span>
      <a class="btn" href="${linkGoogle(e)}" target="_blank" rel="noopener" title="Adicionar ao Google Agenda">📅 Google</a>
      ${e.fixo ? '' : `<button class="btn-link perigo so-edicao" data-del-evento="${e.id}" aria-label="Excluir ${esc(e.titulo)}">✕</button>`}
    </li>`).join('');
}

// Data/hora local no formato AAAAMMDDTHHMMSS
const fmtLocal = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const fmtData = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
function intervalo(e) {
  if (e.hora) {
    const ini = new Date(`${e.data}T${e.hora}`);
    const fim = new Date(ini.getTime() + 2 * 3600e3); // duração padrão: 2h
    return { diaInteiro: false, ini: fmtLocal(ini), fim: fmtLocal(fim) };
  }
  const ini = new Date(`${e.data}T12:00`);
  const fim = new Date(ini); fim.setDate(fim.getDate() + 1);
  return { diaInteiro: true, ini: fmtData(ini), fim: fmtData(fim) };
}
function linkGoogle(e) {
  const { ini, fim } = intervalo(e);
  const p = new URLSearchParams({
    action: 'TEMPLATE', text: e.titulo, dates: `${ini}/${fim}`, ctz: 'America/Sao_Paulo', details: 'Evento do Judô Poli USP',
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}
function gerarICS(eventos) {
  const escICS = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
  const agora = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const linhas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Judo Poli USP//Gestao//PT-BR', 'CALSCALE:GREGORIAN'];
  for (const e of eventos) {
    const { diaInteiro, ini, fim } = intervalo(e);
    linhas.push('BEGIN:VEVENT', `UID:${e.id}@judopoliusp`, `DTSTAMP:${agora}`,
      diaInteiro ? `DTSTART;VALUE=DATE:${ini}` : `DTSTART;TZID=America/Sao_Paulo:${ini}`,
      diaInteiro ? `DTEND;VALUE=DATE:${fim}` : `DTEND;TZID=America/Sao_Paulo:${fim}`,
      `SUMMARY:${escICS(e.titulo)}`, 'END:VEVENT');
  }
  linhas.push('END:VCALENDAR');
  return linhas.join('\r\n');
}
function baixar(nome, conteudo, tipo) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function renderHistorico() {
  const ano = mesAtual.slice(0, 4);
  const meses = MESES.map((_, i) => `${ano}-${pad(i + 1)}`);
  $('#titulo-anual').textContent = `📊 Resumo de ${ano}`;
  $('#tb-anual').innerHTML = meses.map((ym, i) => {
    const t = totaisDoMes(ym);
    const c = caixaDoMes(ym);
    return `<tr class="${ym === mesAtual ? 'atual' : ''}">
      <td>${MESES[i]}</td>
      <td class="num">${t.pagantes}/${t.atletas}</td>
      <td class="num">${brl(t.total)}</td>
      <td class="num">${t.gastos ? brl(t.gastos) : '—'}</td>
      <td class="num ${t.faltaSensei > 0 ? 'falta' : 'sobra'}">${t.faltaSensei > 0 ? 'falta ' + brl(t.faltaSensei) : '✅ pago'}</td>
      <td class="num ${c && c.fim < 0 ? 'falta' : ''}">${c ? brl(c.fim) : '—'}</td>
    </tr>`;
  }).join('');

  $('#th-grade').innerHTML = `<tr><th>Atleta</th>${meses.map((ym, i) =>
    `<th class="centro ${ym === mesAtual ? 'atual' : ''}">${MESES[i]}</th>`).join('')}</tr>`;
  const atletas = estado.atletas
    .filter((a) => a.ativo || meses.some((ym) => pagamentosDoMes(ym)[a.id]))
    .sort(porNome);
  $('#tb-grade').innerHTML = atletas.length ? atletas.map((a) => `<tr><td>${esc(a.nome)}</td>${meses.map((ym) => {
    const pago = !!pagamentosDoMes(ym)[a.id];
    return `<td class="cel ${pago ? 'sim' : 'nao'}" data-grade="${a.id}|${ym}">${pago ? '✓' : '·'}</td>`;
  }).join('')}</tr>`).join('') : `<tr><td colspan="13" class="vazio">Nenhum atleta.</td></tr>`;
}

function renderConfig() {
  const f = $('#form-config');
  if (!f.contains(document.activeElement)) {
    f.salario.value = estado.settings.salario;
    f.mensalidadePadrao.value = estado.settings.mensalidadePadrao;
    f.extrasNaMeta.checked = !!estado.settings.extrasNaMeta;
    f.interuspTitulo.value = estado.settings.interusp.titulo;
    f.interuspData.value = estado.settings.interusp.data;
  }
  for (const grupo of ['entradas', 'gastos']) {
    $('#tipos-' + grupo).innerHTML = estado.tipos[grupo].map((t, i) =>
      `<span class="chip-pagto">${esc(t)}<button data-del-tipo="${grupo}|${i}" aria-label="Remover tipo ${esc(t)}">✕</button></span>`).join('')
      || '<span class="dica">Nenhum tipo.</span>';
  }
}

/* ---------- eventos da interface ---------- */
function iniciarApp() {
  // Modo edição
  $('#btn-editar').addEventListener('click', () => {
    definirEdicao(!editando);
    aviso(editando ? '✏️ Modo edição ligado' : '✔ Alterações concluídas');
  });

  // Mês
  const irParaMes = (ym) => { mesAtual = ym; diaSelecionado = null; renderTudo(); };
  $$('.barra-mes [data-mes]').forEach((b) =>
    b.addEventListener('click', () => irParaMes(somarMes(mesAtual, Number(b.dataset.mes)))));
  $('#btn-hoje').addEventListener('click', () => irParaMes(MES_HOJE));

  // Abas
  $$('.abas button').forEach((btn) => btn.addEventListener('click', () => {
    abaAtual = btn.dataset.aba;
    $$('.abas button').forEach((b) => b.classList.toggle('ativa', b === btn));
    $$('.painel').forEach((p) => { p.hidden = p.id !== 'aba-' + abaAtual; });
    renderTudo();
  }));

  // Caixinha
  const salvarCaixa = (valor) => {
    estado.caixa.ajustes[mesAtual] = Number(valor) || 0;
    salvar(); renderTudo(); aviso('Caixinha atualizada');
  };
  $('#form-caixa-inicial').addEventListener('submit', (e) => { e.preventDefault(); salvarCaixa(e.target.valor.value); });
  $('#form-caixa-editar').addEventListener('submit', (e) => { e.preventDefault(); salvarCaixa(e.target.valor.value); });

  // Pagamentos (uso normal) e atletas (modo edição)
  $('#lista-mensal').addEventListener('change', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    const id = li.dataset.id;
    const atleta = atletaPorId(id);
    if (e.target.classList.contains('ed-nome')) {
      const nome = e.target.value.trim();
      if (nome) { atleta.nome = nome; salvar(); aviso('Nome atualizado'); }
      return;
    }
    if (e.target.classList.contains('ed-mens')) {
      atleta.mensalidade = Math.max(0, Number(e.target.value) || 0);
      salvar(); aviso('Mensalidade atualizada');
      return;
    }
    const valor = Math.max(0, Number(li.querySelector('.valor').value) || 0);
    if (e.target.classList.contains('chk-pago')) {
      marcarPagamento(mesAtual, id, e.target.checked, valor);
      if (e.target.checked) aviso(`${atleta.nome} pagou ${brl(valor)} ✔`);
    } else if (e.target.classList.contains('valor')) {
      const p = pagamentosDoMes(mesAtual)[id];
      if (p) p.valor = valor;      // já pagou: corrige o valor deste mês
      else atleta.mensalidade = valor; // ainda não pagou: vira o valor padrão desse atleta
      salvar();
    }
    renderResumo(); renderMensalidades();
  });
  $('#lista-mensal').addEventListener('click', (e) => {
    const { ativo, delAtleta } = e.target.dataset;
    if (ativo) {
      const a = atletaPorId(ativo);
      a.ativo = !a.ativo;
      salvar(); renderTudo();
    } else if (delAtleta) {
      const a = atletaPorId(delAtleta);
      if (!confirm(`Excluir ${a.nome}? Todo o histórico de pagamentos também será apagado.\n\nDica: use "Inativar" para manter o histórico.`)) return;
      estado.atletas = estado.atletas.filter((x) => x.id !== delAtleta);
      for (const ym of Object.keys(estado.pagamentos)) {
        delete estado.pagamentos[ym][delAtleta];
        if (!Object.keys(estado.pagamentos[ym]).length) delete estado.pagamentos[ym];
      }
      for (const b of estado.blocos) {
        delete b.participantes[delAtleta];
        b.pagamentos = b.pagamentos.filter((p) => p.atletaId !== delAtleta);
      }
      salvar(); renderTudo();
    }
  });
  $('#form-atleta').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const nome = f.nome.value.trim();
    if (!nome) return;
    estado.atletas.push({ id: uid(), nome, mensalidade: Number(f.mensalidade.value) || 0, ativo: true });
    salvar();
    f.nome.value = ''; f.mensalidade.value = estado.settings.mensalidadePadrao;
    aviso(`${nome} cadastrado(a)`);
    renderTudo(); f.nome.focus();
  });

  // Entradas e gastos
  $('#form-mov').sinal.addEventListener('change', preencherTipos);
  $('#form-mov').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const item = { id: uid(), data: f.data.value, tipo: f.tipo.value, descricao: f.descricao.value.trim(), valor: Number(f.valor.value) };
    if (!item.data || !(item.valor > 0)) return;
    (f.sinal.value === 'gasto' ? estado.gastos : estado.receitas).push(item);
    salvar();
    f.descricao.value = ''; f.valor.value = '';
    const quando = item.data.slice(0, 7) !== mesAtual ? ` em ${nomeMes(item.data.slice(0, 7))}` : '';
    aviso((f.sinal.value === 'gasto' ? 'Gasto lançado' : 'Entrada lançada') + quando);
    renderTudo(); f.valor.focus();
  });
  $('#lista-mov').addEventListener('click', (e) => {
    const chave = e.target.dataset.delMov;
    if (!chave || !confirm('Excluir este lançamento?')) return;
    const [sinal, id] = chave.split('|');
    if (sinal === 'gasto') estado.gastos = estado.gastos.filter((r) => r.id !== id);
    else estado.receitas = estado.receitas.filter((r) => r.id !== id);
    salvar(); renderTudo();
  });

  // Arrecadações (blocos)
  const blocoDe = (el) => blocoPorId(el.closest('[data-bloco]').dataset.bloco);
  $('#blocos').addEventListener('change', (e) => {
    const b = blocoDe(e.target);
    const t = e.target;
    if (t.classList.contains('chk-participa')) {
      const id = t.closest('li').dataset.id;
      if (t.checked) b.participantes[id] = true; else delete b.participantes[id];
    } else if (t.classList.contains('bl-nome')) {
      if (t.value.trim()) b.nome = t.value.trim();
    } else if (t.classList.contains('bl-taxa')) {
      b.taxa = Math.max(0, Number(t.value) || 0);
    } else if (t.classList.contains('bl-data')) {
      b.data = t.value;
    } else return;
    salvar(); renderBlocos();
  });
  const registrarPagamento = (li) => {
    const b = blocoDe(li);
    const valor = Number(li.querySelector('.ex-valor').value) || 0;
    if (!(valor > 0)) return;
    const data = MES_HOJE === mesAtual ? hojeISO() : `${mesAtual}-01`;
    b.pagamentos.push({ id: uid(), atletaId: li.dataset.id, valor, data });
    salvar(); renderBlocos();
    aviso(`${atletaPorId(li.dataset.id).nome}: ${brl(valor)} (${b.nome}) em ${nomeMes(mesAtual, false).toLowerCase()}`);
  };
  $('#blocos').addEventListener('click', (e) => {
    const t = e.target;
    if (t.classList.contains('ex-add')) registrarPagamento(t.closest('li'));
    if (t.dataset.delPag && confirm('Remover este pagamento?')) {
      const b = blocoDe(t);
      b.pagamentos = b.pagamentos.filter((p) => p.id !== t.dataset.delPag);
      salvar(); renderBlocos();
    }
    if (t.classList.contains('bl-del')) {
      const b = blocoDe(t);
      if (!confirm(`Excluir o bloco "${b.nome}" e todos os pagamentos dele?`)) return;
      estado.blocos = estado.blocos.filter((x) => x !== b);
      salvar(); renderBlocos();
    }
  });
  $('#blocos').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('ex-valor')) { e.preventDefault(); registrarPagamento(e.target.closest('li')); }
  });
  $('#form-bloco').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const nome = f.nome.value.trim();
    if (!nome) return;
    estado.blocos.push(novoBloco(nome, Math.max(0, Number(f.taxa.value) || 0)));
    salvar(); f.reset(); renderBlocos(); aviso(`Bloco "${nome}" criado`);
  });

  // Agenda
  $('#calendario').addEventListener('click', (e) => {
    const dia = e.target.closest('[data-dia]');
    if (!dia) return;
    diaSelecionado = dia.dataset.dia;
    const f = $('#form-evento');
    f.data.value = diaSelecionado;
    renderCalendario();
    f.titulo.focus();
  });
  $('#form-evento').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const ev = { id: uid(), data: f.data.value, hora: f.hora.value, titulo: f.titulo.value.trim() };
    if (!ev.data || !ev.titulo) return;
    estado.eventos.push(ev);
    salvar();
    f.titulo.value = ''; f.hora.value = '';
    aviso(ev.data.slice(0, 7) !== mesAtual ? `Evento salvo em ${nomeMes(ev.data.slice(0, 7))}` : 'Evento salvo');
    renderCalendario();
  });
  $('#lista-eventos').addEventListener('click', (e) => {
    const id = e.target.dataset.delEvento;
    if (!id || !confirm('Excluir este evento?')) return;
    estado.eventos = estado.eventos.filter((x) => x.id !== id);
    salvar(); renderCalendario();
  });
  $('#btn-ics').addEventListener('click', () => {
    baixar(`judo-poli-${mesAtual}.ics`, gerarICS(eventosDoMes(mesAtual)), 'text/calendar');
  });

  // Resumo do ano: grade
  $('#tb-grade').addEventListener('click', (e) => {
    const chave = e.target.dataset.grade;
    if (!chave) return;
    const [id, ym] = chave.split('|');
    marcarPagamento(ym, id, !pagamentosDoMes(ym)[id]);
    renderTudo();
  });

  // Configurações (modo edição)
  $('#form-config').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    estado.settings.salario = Number(f.salario.value) || 0;
    estado.settings.mensalidadePadrao = Number(f.mensalidadePadrao.value) || 0;
    estado.settings.extrasNaMeta = f.extrasNaMeta.checked;
    estado.settings.interusp = { titulo: f.interuspTitulo.value.trim() || 'Interusp', data: f.interuspData.value };
    salvar(); document.activeElement.blur(); renderTudo(); aviso('Configurações salvas');
  });
  $$('.form-tipo').forEach((form) => form.addEventListener('submit', (e) => {
    e.preventDefault();
    const grupo = form.dataset.grupo;
    const nome = form.nome.value.trim();
    if (!nome) return;
    if (!estado.tipos[grupo].some((t) => t.toLowerCase() === nome.toLowerCase())) estado.tipos[grupo].push(nome);
    form.reset(); salvar(); renderTudo(); aviso(`Tipo "${nome}" adicionado`);
  }));
  $('.config-edicao').addEventListener('click', (e) => {
    const chave = e.target.dataset.delTipo;
    if (!chave) return;
    const [grupo, i] = chave.split('|');
    estado.tipos[grupo].splice(Number(i), 1);
    salvar(); renderTudo();
  });

  // Backup
  $('#btn-exportar').addEventListener('click', () => {
    baixar(`judo-backup-${hojeISO()}.json`, JSON.stringify(estado, null, 2), 'application/json');
  });
  $('#inp-importar').addEventListener('change', async (e) => {
    const arq = e.target.files[0];
    e.target.value = '';
    if (!arq) return;
    try {
      const dados = JSON.parse(await arq.text());
      if (!Array.isArray(dados.atletas) || typeof dados.pagamentos !== 'object') throw new Error('formato');
      if (!confirm('Importar este backup vai SUBSTITUIR todos os dados atuais. Continuar?')) return;
      estado = normalizar(dados);
      estado.settings.iniciaisCadastrados = true; // não recadastrar a lista inicial por cima do backup
      salvar(); renderTudo(); aviso('Backup importado');
    } catch {
      aviso('Arquivo de backup inválido');
    }
  });

  iniciarGaleria();
  definirEdicao(editando);
  renderTudo();
  setInterval(atualizarContador, 1000);
}

/* ---------- contagem regressiva ---------- */
function renderInterusp() {
  const { titulo, data } = estado.settings.interusp;
  $('#interusp-titulo').textContent = '🏆 ' + titulo;
  $('#interusp-data').textContent = data
    ? new Date(data + 'T12:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  atualizarContador();
}
function atualizarContador() {
  const { data } = estado.settings.interusp;
  const diff = new Date(`${data}T00:00:00-03:00`) - Date.now(); // horário de Brasília
  const acabou = !(diff > 0);
  $('#contador').hidden = acabou;
  $('#contador-fim').hidden = !acabou;
  if (acabou) {
    $('#contador-fim').textContent = diff > -24 * 3600e3 ? 'É HOJE! Bora, Poli! 🥋' : 'Já aconteceu — oss! Defina a próxima data no modo edição.';
    return;
  }
  const s = Math.floor(diff / 1000);
  $('#cd-dias').textContent = Math.floor(s / 86400);
  $('#cd-horas').textContent = pad(Math.floor(s / 3600) % 24);
  $('#cd-min').textContent = pad(Math.floor(s / 60) % 60);
  $('#cd-seg').textContent = pad(s % 60);
}

/* ---------- Galeria (fotos do Instagram @judopoliusp) ---------- */
const FOTOS = [
  ['post-2026-06-09', 'Junho de 2026'],
  ['post-2026-06-03', 'Junho de 2026'],
  ['post-2026-03-19', 'As atletas — Bixos 2026'],
  ['post-2026-01-20', 'Bem-vindos bixos 2026!'],
  ['post-2025-11-11', 'Semana da Mulher Politécnica — treino aberto'],
  ['post-2025-08-30', 'Campeonato Paulista Universitário'],
  ['post-2025-06-19', 'Equipe no tatame'],
  ['post-2025-01-22', 'Bem-vindos bixos e bixetes'],
  ['post-2024-12-11', 'Equipe no dojô'],
  ['post-2024-11-17', 'Medalhistas'],
  ['post-2024-03-08', 'Lute como uma mina — 08/03'],
  ['post-2022-11-23', 'Pódio da equipe'],
];
function iniciarGaleria() {
  $('#galeria').innerHTML = FOTOS.map(([arq, legenda]) =>
    `<img src="img/${arq}.jpg" alt="${esc(legenda)}" title="${esc(legenda)}" loading="lazy">`).join('');
  $('#galeria').addEventListener('click', (e) => {
    if (e.target.tagName !== 'IMG') return;
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML = `<img src="${e.target.src}" alt="${esc(e.target.alt)}">`;
    const aoTeclar = (ev) => { if (ev.key === 'Escape') fechar(); };
    const fechar = () => { lb.remove(); document.removeEventListener('keydown', aoTeclar); };
    lb.addEventListener('click', fechar);
    document.addEventListener('keydown', aoTeclar);
    document.body.appendChild(lb);
  });
}

/* ---------- início ---------- */
if (lerToken() === AUTH_HASH) entrar();
else $('#tela-login').hidden = false;
