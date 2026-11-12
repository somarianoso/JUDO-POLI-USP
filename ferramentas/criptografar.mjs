#!/usr/bin/env node
// Gera dados.enc.json (dados criptografados com a senha) a partir de um backup do site.
// Uso:  node ferramentas/criptografar.mjs caminho/do/judo-backup.json
// A senha é digitada aqui e nunca é salva em lugar nenhum.

import { readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ITERACOES = 600000;
const saida = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dados.enc.json');
const normalizarUsuario = (u) => u.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const b64 = (buf) => Buffer.from(buf).toString('base64');

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
const linhas = [];
const esperando = [];
rl.on('line', (l) => (esperando.length ? esperando.shift()(l) : linhas.push(l)));
rl.on('close', () => esperando.splice(0).forEach((r) => r('')));
let ocultar = false;
rl._writeToOutput = (s) => { if (!ocultar) process.stdout.write(s); }; // não mostra a senha digitada
async function perguntar(texto, oculto = false) {
  process.stdout.write(texto);
  ocultar = oculto;
  const resp = linhas.length ? linhas.shift() : await new Promise((r) => esperando.push(r));
  ocultar = false;
  if (oculto || !process.stdin.isTTY) process.stdout.write('\n');
  return resp;
}

const arquivo = process.argv[2];
if (!arquivo) {
  console.error('Uso: node ferramentas/criptografar.mjs caminho/do/judo-backup.json');
  process.exit(1);
}

const estado = JSON.parse(await readFile(arquivo, 'utf8'));
if (!Array.isArray(estado.atletas) || typeof estado.pagamentos !== 'object') {
  console.error('Esse arquivo não parece um backup do site (faltam atletas/pagamentos).');
  process.exit(1);
}

const usuario = (await perguntar('Usuário [gestao]: ')) || 'gestao';
const senha = await perguntar('Nova senha: ', true);
if (senha !== await perguntar('Repita a senha: ', true)) {
  console.error('As senhas não conferem.');
  process.exit(1);
}
if (senha.length < 14) {
  console.error('Senha curta demais: use pelo menos 14 caracteres (ex.: 4 ou 5 palavras aleatórias).');
  process.exit(1);
}

rl.close();

const { subtle } = globalThis.crypto;
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await subtle.importKey('raw', new TextEncoder().encode(`${normalizarUsuario(usuario)}:${senha}`),
  'PBKDF2', false, ['deriveKey']);
const chave = await subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERACOES },
  base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const cifrado = await subtle.encrypt({ name: 'AES-GCM', iv }, chave,
  new TextEncoder().encode(JSON.stringify({ estado })));

await writeFile(saida, JSON.stringify({
  formato: 'judo-poli-enc', v: 1, kdf: 'PBKDF2-SHA256', iter: ITERACOES,
  salt: b64(salt), iv: b64(iv), geradoEm: new Date().toISOString(), dados: b64(cifrado),
}));
console.log(`Pronto: ${path.relative(process.cwd(), saida) || saida} (${estado.atletas.length} atletas).`);
console.log('Agora: git add dados.enc.json && git commit -m "atualiza dados" && git push');
