#!/usr/bin/env node
// Gera uma senha aleatória forte, fácil de digitar no celular (ex.: k7m2p-x9fqa-3hd8w-tn4ez).
// Uso:  node ferramentas/gerar-senha.mjs
// Só letras minúsculas e números, sem os que confundem (0/o, 1/l/i). 20 caracteres ≈ 100 bits de força.

import { randomInt } from 'node:crypto';

const ALFABETO = 'abcdefghjkmnpqrstuvwxyz23456789';
const grupo = () => Array.from({ length: 5 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
console.log(Array.from({ length: 4 }, grupo).join('-'));
