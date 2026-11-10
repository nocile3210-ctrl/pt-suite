#!/usr/bin/env node
/**
 * 署名自检（CI 用）：校验 @version 与 PTX.VERSION 一致、SIG_PARTS 拼回署名、
 * FNV-1a 摘要与 SIG_DIGEST 一致。任何一项不符即退出码 1。
 * 用法： node tools/verify-sign.mjs [文件路径]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2] || path.join(root, 'pt-suite.user.js');
const src = fs.readFileSync(file, 'utf8');

function fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return ('00000000' + h.toString(16)).slice(-8);
}

const fail = [];
const partsMatch = /const SIG_PARTS = \[([^\]]+)\]/.exec(src);
const anchorMatch = /const SIG_ANCHOR = '([^']*)'/.exec(src);
const digestMatch = /const SIG_DIGEST = '([^']*)'/.exec(src);
const verMeta = /\/\/ @version\s+(\S+)/.exec(src);
const verCode = /PTX\.VERSION = '([^']*)';/.exec(src);

if (!partsMatch) fail.push('缺少 SIG_PARTS');
if (!anchorMatch) fail.push('缺少 SIG_ANCHOR');
if (!digestMatch) fail.push('缺少 SIG_DIGEST');
if (!verMeta || !verCode) fail.push('缺少版本声明');

if (!fail.length) {
    const parts = JSON.parse('[' + partsMatch[1] + ']');
    const sign = String.fromCharCode.apply(null, parts);
    const anchor = anchorMatch[1];
    const version = verCode[1];
    const expect = fnv1a(sign + '|' + anchor + '|' + version);

    console.log('署名        : ' + sign);
    console.log('版本(@)     : ' + verMeta[1]);
    console.log('版本(代码)  : ' + version);
    console.log('摘要(记录)  : ' + digestMatch[1]);
    console.log('摘要(计算)  : ' + expect);

    if (sign !== '嘴贱招来九尾妖狐') fail.push('署名文本不符：' + sign);
    if (verMeta[1] !== version) fail.push('@version 与 PTX.VERSION 不一致');
    if (digestMatch[1] !== expect) fail.push('SIG_DIGEST 与重算结果不一致（请运行 node tools/bump.mjs <版本>）');
}

if (fail.length) {
    console.error('\n✗ 署名自检失败：');
    fail.forEach((f) => console.error('  - ' + f));
    process.exit(1);
}
console.log('\n✓ 署名自检通过');
