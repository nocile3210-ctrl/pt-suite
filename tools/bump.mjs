#!/usr/bin/env node
/**
 * 版本升级：同时改写 @version、PTX.VERSION 并重算署名摘要 SIG_DIGEST。
 * 用法： node tools/bump.mjs 3.2.0
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'pt-suite.user.js');

function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return ('00000000' + h.toString(16)).slice(-8);
}

const next = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(next || '')) {
    console.error('usage: node tools/bump.mjs <major.minor.patch>');
    process.exit(2);
}

let src = fs.readFileSync(file, 'utf8');

const partsMatch = /const SIG_PARTS = \[([^\]]+)\]/.exec(src);
const anchorMatch = /const SIG_ANCHOR = '([^']*)'/.exec(src);
if (!partsMatch || !anchorMatch) {
    console.error('未找到 SIG_PARTS / SIG_ANCHOR，脚本结构可能被改动');
    process.exit(2);
}

const parts = JSON.parse('[' + partsMatch[1] + ']');
const anchor = anchorMatch[1];
const sign = String.fromCharCode.apply(null, parts);
const digest = fnv1a(sign + '|' + anchor + '|' + next);

src = src
    .replace(/(\/\/ @version\s+)\S+/, '$1' + next)
    .replace(/PTX\.VERSION = '[^']*';/, "PTX.VERSION = '" + next + "';")
    .replace(/const SIG_DIGEST = '[^']*';/, "const SIG_DIGEST = '" + digest + "';");

fs.writeFileSync(file, src, 'utf8');
console.log('bumped -> ' + next + ' | 署名 ' + sign + ' | SIG_DIGEST ' + digest);
