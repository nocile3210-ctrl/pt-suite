// ==UserScript==
// @name         PT多功能整合增强版 · 嘴贱招来九尾妖狐
// @namespace    https://github.com/yg/pt-suite/嘴贱招来九尾妖狐
// @version      3.1.0
// @description  合并强化版：魔力A值/A@GB计算+曲线、批量认领/保种统计、官种官组统计、批量送魔力、自动感谢、邮件清理、彩虹ID、隐藏认领已满、种子列表过滤+查重、做种隐藏/拷贝链接、娱乐(摇奖/刮刮乐)。内置署名自检：嘴贱招来九尾妖狐
// @author       YG · 嘴贱招来九尾妖狐
// @license      MIT
// @match        *://*/torrents.php*
// @match        *://*/details.php*
// @match        *://*/userdetails.php*
// @match        *://*/mybonus.php*
// @match        *://*/mybonus*
// @match        *://*/bonus.php*
// @match        *://*/ucoin.php*
// @match        *://*/mpshop.php*
// @match        *://*/messages.php*
// @match        *://*/getusertorrentlist.php*
// @match        *://*/plugin_details.php*
// @match        *://*/special*
// @match        *://*/slot/index.html*
// @match        *://*/lottery.php*
// @match        *://*/browse*
// @match        *://totheglory.im/*
// @match        *://kp.m-team.cc/*
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM.xmlHttpRequest
// @connect      *
// @run-at       document-idle
// @noframes
// @ptx-sign     嘴贱招来九尾妖狐
// ==/UserScript==

/* ==========================================================================
 * 说明
 * --------------------------------------------------------------------------
 * 本脚本由 14 个 PT 站点脚本合并而来，统一为一个模块化内核：
 *   1) 魔力计算（原「PT站点魔力计算器」2.2.4 + 「魔力计算器-细分标色」2.0.9）
 *   2) 认领与保种统计（原「PT保种认领合集」+「保种和认领分析」）
 *   3) 官种保种统计（原「官种保种统计」0.16.9）
 *   4) 批量送魔力（原「PT批量送魔力」+「全能美化版」）
 *   5) 自动感谢（原「PT站自动感谢」）
 *   6) 无效邮件清理（原「PT站删除无效邮件」）
 *   7) 彩虹ID（原「PT动态彩虹ID」）
 *   8) 隐藏认领已满（原「隐藏认领已满」）
 *   9) 种子列表过滤 + 查重下载（原「种子列表过滤」1.9.8）
 *  10) 做种隐藏/链接拷贝（原「猫站_隐藏做种,下载中」）
 *  11) 娱乐：摇奖/刮刮乐（原「猫站娱乐助手」）
 * ========================================================================== */

(function () {
    'use strict';

    /* ======================================================================
     * 0. 常量 / 署名
     * ==================================================================== */
    const PTX = {};
    PTX.VERSION = '3.1.0';

    // 署名分片（勿手改，改了会触发自检锁定）
    const SIG_PARTS = [22068, 36145, 25307, 26469, 20061, 23614, 22934, 29392];
    const SIG_ANCHOR = 'PTX-9T-ANCHOR';
    const SIG_DIGEST = '951927d5';
    const SIGN = String.fromCharCode.apply(null, SIG_PARTS);

    const HOST = location.hostname.replace(/^www\./, '');
    const PAGE = location.pathname + location.search;
    const LOGTAG = '[PTX|' + SIGN + ']';

    /* ======================================================================
     * 1. 通用工具
     * ==================================================================== */
    const $ = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const rnd = (a, b) => a + Math.random() * (b - a);

    function esc(s) {
        return String(s == null ? '' : s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // 安全正则：非法用户输入不抛异常
    function safeRe(pattern) {
        if (!pattern) return null;
        try { return new RegExp(pattern, 'i'); } catch (e) { return null; }
    }

    // 体积字符串 → 字节（兼容 KiB/MiB/GiB/TiB、逗号、纯字节）
    function sizeToBytes(s) {
        if (s == null) return 0;
        s = String(s).replace(/,/g, '').trim();
        const m = s.match(/([\d.]+)\s*(K|M|G|T|P)i?B/i);
        if (!m) {
            const n = parseFloat(s);
            return isNaN(n) ? 0 : n;
        }
        const n = parseFloat(m[1]);
        const p = { K: 1, M: 2, G: 3, T: 4, P: 5 }[m[2].toUpperCase()] || 0;
        return n * Math.pow(1024, p);
    }
    const sizeToGB = (s) => sizeToBytes(s) / Math.pow(1024, 3);

    function fmtBytes(b) {
        b = Number(b) || 0;
        const u = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        let i = 0;
        while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
        return (i === 0 ? b : b.toFixed(2)) + ' ' + u[i];
    }

    function hostMatch(list) {
        return list.some((h) => HOST === h || HOST.endsWith('.' + h));
    }

    function txt(node) {
        return node ? (node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim() : '';
    }

    // 轻量 DOM 构造器
    function el(tag, attrs) {
        const n = document.createElement(tag);
        if (attrs) {
            for (const k in attrs) {
                const v = attrs[k];
                if (v == null) continue;
                if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
                else if (k === 'class') n.className = v;
                else if (k === 'text') n.textContent = v;
                else if (k === 'html') n.innerHTML = v;
                else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
                else n.setAttribute(k, v);
            }
        }
        for (let i = 2; i < arguments.length; i++) {
            const kid = arguments[i];
            if (kid == null || kid === false) continue;
            if (Array.isArray(kid)) kid.forEach((k) => k != null && n.appendChild(typeof k === 'string' ? document.createTextNode(k) : k));
            else n.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
        }
        return n;
    }

    /* ======================================================================
     * 2. GM API 兼容层
     * ==================================================================== */
    const store = {
        get(k, d) {
            try {
                if (typeof GM_getValue === 'function') {
                    const v = GM_getValue(k);
                    return v === undefined ? d : v;
                }
            } catch (e) { /* ignore */ }
            try {
                const raw = localStorage.getItem('ptx:' + k);
                return raw === null ? d : JSON.parse(raw);
            } catch (e) { return d; }
        },
        set(k, v) {
            try {
                if (typeof GM_setValue === 'function') { GM_setValue(k, v); return; }
            } catch (e) { /* ignore */ }
            try { localStorage.setItem('ptx:' + k, JSON.stringify(v)); } catch (e) { /* ignore */ }
        }
    };

    function addStyle(css) {
        try {
            if (typeof GM_addStyle === 'function') { GM_addStyle(css); return; }
        } catch (e) { /* ignore */ }
        const s = document.createElement('style');
        s.textContent = css;
        (document.head || document.documentElement).appendChild(s);
    }

    function setClipboard(t) {
        try {
            if (typeof GM_setClipboard === 'function') { GM_setClipboard(t, 'text'); return true; }
        } catch (e) { /* ignore */ }
        try { navigator.clipboard.writeText(t); return true; } catch (e) { return false; }
    }

    /**
     * 统一请求：优先 GM.xmlHttpRequest（保留站点 Cookie 语义），退回 fetch。
     * @returns {Promise<{status:number,responseText:string,finalUrl:string}>}
     */
    function http(method, url, data, headers) {
        const hdrs = Object.assign({ 'X-Requested-With': 'XMLHttpRequest' }, headers || {});
        if (typeof data === 'string' && !hdrs['Content-Type']) hdrs['Content-Type'] = 'application/x-www-form-urlencoded';

        return new Promise((resolve, reject) => {
            let gm = null;
            try {
                if (typeof GM_xmlhttpRequest === 'function') gm = GM_xmlhttpRequest;
                else if (typeof GM !== 'undefined' && GM && typeof GM.xmlHttpRequest === 'function') gm = GM.xmlHttpRequest;
            } catch (e) { /* ignore */ }

            let settled = false;
            const timer = setTimeout(() => done(reject, new Error('timeout: ' + url)), 30000);
            function done(fn, v) {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                fn(v);
            }

            if (gm) {
                try {
                    gm({
                        method: method.toUpperCase(),
                        url: url,
                        data: data,
                        headers: hdrs,
                        timeout: 25000,
                        onload: (r) => done(resolve, { status: r.status, responseText: r.responseText || '', finalUrl: r.finalUrl || url }),
                        onerror: (e) => done(reject, e),
                        ontimeout: (e) => done(reject, e)
                    });
                    return;
                } catch (e) { /* 落到 fetch */ }
            }
            fetch(url, { method: method.toUpperCase(), body: data, headers: hdrs, credentials: 'same-origin' })
                .then((r) => r.text().then((t) => done(resolve, { status: r.status, responseText: t, finalUrl: r.url })))
                .catch((e) => done(reject, e));
        });
    }

    /* ======================================================================
     * 3. 署名自检（嘴贱招来九尾妖狐）
     * ==================================================================== */
    function fnv1a(str) {
        let h = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 0x01000193) >>> 0;
        }
        return ('00000000' + h.toString(16)).slice(-8);
    }

    const Guard = {
        ok: false,
        override: false, // 本次会话临时解锁（需手动点，刷新即失效）
        reasons: [],
        checks: [],
        removed: 0,

        seed() { return SIGN + '|' + SIG_ANCHOR + '|' + PTX.VERSION; },

        // 指纹校验：署名分片被改写 → 摘要不符
        checkDigest() {
            const d = fnv1a(this.seed());
            const pass = d === SIG_DIGEST;
            this.checks.push({ name: '署名指纹', pass: pass, detail: 'fnv1a=' + d });
            return pass;
        },

        // 署名文本校验
        checkText() {
            const pass = SIGN.length === 8 && SIGN === '嘴贱招来九尾妖狐';
            this.checks.push({ name: '署名文本', pass: pass, detail: SIGN });
            return pass;
        },

        // 元数据校验：@name/@namespace/@author 中必须保留署名
        checkMeta() {
            let meta = '';
            try {
                if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
                    const s = GM_info.script;
                    meta = [s.name, s.namespace, s.author, s.description].join(' ');
                }
            } catch (e) { /* ignore */ }
            if (!meta) {
                this.checks.push({ name: '元数据署名', pass: true, detail: '当前管理器不暴露 GM_info，跳过' });
                return true;
            }
            const pass = meta.indexOf('九尾妖狐') >= 0;
            this.checks.push({ name: '元数据署名', pass: pass, detail: pass ? '存在' : '已被移除/改名' });
            return pass;
        },

        // DOM 水印校验
        checkMark() {
            const pass = !!document.getElementById('ptx-sign-mark');
            this.checks.push({ name: 'DOM水印', pass: pass, detail: pass ? '在位' : '缺失' });
            return pass;
        },

        run() {
            this.checks = [];
            this.reasons = [];
            this.override = false; // 每次自检都重新收口
            const r1 = this.checkDigest();
            const r2 = this.checkText();
            const r3 = this.checkMeta();
            if (!r1) this.reasons.push('署名指纹不匹配（代码分片被改写）');
            if (!r2) this.reasons.push('署名文本异常');
            if (!r3) this.reasons.push('脚本元数据署名被移除');
            this.ok = r1 && r2 && r3;
            this.installMark();
            const r4 = this.checkMark();
            if (!r4) { this.reasons.push('水印注入失败'); this.ok = false; }
            if (!this.ok) {
                console.warn(LOGTAG, '自检未通过：' + this.reasons.join('；'));
                UI.locked = true;
            } else {
                console.log(LOGTAG, '自检通过 ' + SIGN + ' v' + PTX.VERSION);
            }
            return this.ok;
        },

        // 页面左下角署名水印，被移除会自动补回；连续被移除则锁定
        installMark() {
            const put = () => {
                if (document.getElementById('ptx-sign-mark') || !document.body) return;
                const d = el('div', { id: 'ptx-sign-mark', 'data-ptx-sig': SIG_ANCHOR, title: '署名校验：' + SIGN, text: SIGN });
                Object.assign(d.style, {
                    position: 'fixed', left: '8px', bottom: '8px', zIndex: 2147483000,
                    font: '12px/1.2 system-ui,sans-serif', color: '#ff79c6', opacity: '0.55',
                    pointerEvents: 'none', textShadow: '0 0 6px #000', userSelect: 'none'
                });
                document.body.appendChild(d);
            };
            put();
            if (!this._obs && document.body) {
                this._obs = new MutationObserver(() => {
                    if (!document.getElementById('ptx-sign-mark')) {
                        this.removed++;
                        put();
                        if (this.removed >= 3) {
                            this.ok = false;
                            UI.locked = true;
                            if (this.reasons.indexOf('水印被反复移除') < 0) this.reasons.push('水印被反复移除');
                            UI.refreshLock();
                        }
                    }
                });
                this._obs.observe(document.body, { childList: true });
            }
        }
    };

    // 写操作闸门：署名不通过 → 禁止会改动账号状态的动作
    function needSign(action) {
        if (Guard.ok || Guard.override) return true;
        UI.log('⛔ 署名校验失败，已拦截：' + action + '｜' + Guard.reasons.join('；'), 'err');
        UI.flashLock();
        return false;
    }

    /* ======================================================================
     * 4. UI 框架（悬浮面板 + 多标签 + 日志）
     * ==================================================================== */
    const UI = (function () {
        const tabs = [];
        let panel = null, bodyEl = null, logEl = null, active = null;
        const built = {};

        const CSS = `
        #ptx-fab{position:fixed;right:16px;bottom:16px;z-index:2147482000;width:46px;height:46px;border-radius:50%;
            border:none;cursor:pointer;font:700 13px/1 system-ui,sans-serif;color:#111;
            background:linear-gradient(135deg,#a6e3a1,#94e2d5);box-shadow:0 6px 20px rgba(0,0,0,.35)}
        #ptx-panel{position:fixed;right:16px;bottom:72px;z-index:2147482001;width:372px;max-height:78vh;
            display:flex;flex-direction:column;background:#1e1e2e;color:#cdd6f4;border-radius:14px;
            box-shadow:0 18px 50px rgba(0,0,0,.55);font:13px/1.5 system-ui,"Segoe UI",sans-serif;overflow:hidden}
        #ptx-panel.ptx-lock{box-shadow:0 0 0 2px #f38ba8,0 18px 50px rgba(0,0,0,.55)}
        #ptx-head{display:flex;align-items:center;gap:8px;padding:9px 12px;cursor:move;user-select:none;
            background:linear-gradient(135deg,#a6e3a1,#94e2d5);color:#1e1e2e;font-weight:700}
        #ptx-head .t{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        #ptx-head .x{cursor:pointer;font-weight:700;padding:0 4px}
        #ptx-tabs{display:flex;flex-wrap:wrap;gap:4px;padding:8px 10px 0}
        .ptx-tab{padding:4px 9px;border-radius:8px;background:#313244;color:#a6adc8;cursor:pointer;font-size:12px;
            border:1px solid transparent}
        .ptx-tab.on{background:#45475a;color:#cdd6f4;border-color:#a6e3a1}
        #ptx-body{padding:10px 12px;overflow:auto;flex:1 1 auto}
        #ptx-log{margin:0 12px 10px;height:96px;overflow:auto;background:#181825;border-radius:8px;padding:8px;
            font:11px/1.6 ui-monospace,Menlo,Consolas,monospace}
        .ptx-l-ok{color:#a6e3a1}.ptx-l-err{color:#f38ba8}.ptx-l-info{color:#89b4fa}.ptx-l-warn{color:#f9e2af}
        .ptx-row{display:flex;gap:6px;align-items:center;margin:6px 0;flex-wrap:wrap}
        .ptx-row > label{color:#a6adc8;font-size:12px;min-width:64px}
        .ptx-in{background:#313244;border:1px solid #45475a;border-radius:6px;color:#cdd6f4;padding:4px 7px;
            font-size:12px;outline:none;min-width:0}
        .ptx-in:focus{border-color:#a6e3a1}
        .ptx-btn{background:#45475a;color:#cdd6f4;border:none;border-radius:7px;padding:6px 10px;font-size:12px;
            cursor:pointer}
        .ptx-btn:hover{filter:brightness(1.15)}
        .ptx-btn:disabled{opacity:.45;cursor:not-allowed}
        .ptx-btn.g{background:linear-gradient(135deg,#a6e3a1,#94e2d5);color:#1e1e2e;font-weight:700}
        .ptx-btn.o{background:linear-gradient(135deg,#fab387,#f9e2af);color:#1e1e2e;font-weight:700}
        .ptx-btn.r{background:linear-gradient(135deg,#f38ba8,#cba6f7);color:#1e1e2e;font-weight:700}
        .ptx-tb{width:100%;border-collapse:collapse;font-size:12px}
        .ptx-tb th,.ptx-tb td{border:1px solid #45475a;padding:3px 6px;text-align:left}
        .ptx-tb th{background:#313244;color:#89b4fa;font-weight:600}
        .ptx-tb tr:nth-child(even) td{background:#232336}
        .ptx-hint{color:#6c7086;font-size:11px;margin:4px 0}
        .ptx-badge{background:#313244;color:#f9e2af;border-radius:6px;padding:1px 6px;font-size:11px}
        .ptx-ok{color:#a6e3a1}.ptx-bad{color:#f38ba8}
        `;

        function ensure() {
            if (!panel) build();
            syncTabs();
        }

        function build() {
            addStyle(CSS);

            const fab = el('button', { id: 'ptx-fab', title: 'PT套件 v' + PTX.VERSION, text: 'PT' });
            fab.onclick = () => toggle();
            (document.body || document.documentElement).appendChild(fab);

            panel = el('div', { id: 'ptx-panel' });
            panel.style.display = 'none';

            const head = el('div', { id: 'ptx-head' },
                el('span', { class: 't', text: 'PT套件 · ' + SIGN }),
                el('span', { class: 'x', text: '—', title: '折叠' })
            );
            const tabsEl = el('div', { id: 'ptx-tabs' });
            bodyEl = el('div', { id: 'ptx-body' });
            logEl = el('div', { id: 'ptx-log' });
            panel.appendChild(head);
            panel.appendChild(tabsEl);
            panel.appendChild(bodyEl);
            panel.appendChild(logEl);
            (document.body || document.documentElement).appendChild(panel);

            head.querySelector('.x').onclick = () => toggle();
            drag(panel, head);
            refreshLock();
        }

        // 面板可能先于模块注册被创建（例如锁定提示），这里补齐新增页签
        function syncTabs() {
            if (!panel) return;
            const tabsEl = panel.querySelector('#ptx-tabs');
            if (!tabsEl) return;
            tabs.forEach((t) => {
                if (tabsEl.querySelector('[data-id="' + t.id + '"]')) return;
                const b = el('div', { class: 'ptx-tab', text: t.title, 'data-id': t.id });
                b.onclick = () => activate(t.id);
                tabsEl.appendChild(b);
            });
            if (!active && tabs.length) activate(tabs[0].id);
        }

        function drag(box, handle) {
            let sx = 0, sy = 0, ox = 0, oy = 0, on = false;
            handle.addEventListener('mousedown', (e) => {
                if (e.target.className === 'x') return;
                on = true;
                const r = box.getBoundingClientRect();
                ox = r.left; oy = r.top; sx = e.clientX; sy = e.clientY;
                box.style.right = 'auto'; box.style.bottom = 'auto';
                box.style.left = ox + 'px'; box.style.top = oy + 'px';
                e.preventDefault();
            });
            document.addEventListener('mousemove', (e) => {
                if (!on) return;
                box.style.left = Math.max(0, ox + e.clientX - sx) + 'px';
                box.style.top = Math.max(0, oy + e.clientY - sy) + 'px';
            });
            document.addEventListener('mouseup', () => { on = false; });
        }

        function tab(id, title, render) { tabs.push({ id: id, title: title, render: render }); }

        function activate(id) {
            const t = tabs.filter((x) => x.id === id)[0];
            if (!t) return;
            active = id;
            $$('#ptx-tabs .ptx-tab').forEach((b) => b.classList.toggle('on', b.getAttribute('data-id') === id));
            bodyEl.textContent = '';
            if (!built[id]) {
                built[id] = el('div');
                try { t.render(built[id]); } catch (e) { console.error(LOGTAG, id, e); built[id].textContent = '渲染失败：' + e; }
            }
            bodyEl.appendChild(built[id]);
        }

        function toggle() {
            ensure();
            if (!tabs.length) { alert('当前页面没有可用模块'); return; }
            panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
        }

        function show() { ensure(); panel.style.display = 'flex'; }

        function log(msg, type) {
            type = type || 'info';
            console.log(LOGTAG, msg);
            if (!logEl) return;
            const d = el('div', { class: 'ptx-l-' + type, text: '[' + new Date().toLocaleTimeString() + '] ' + msg });
            logEl.appendChild(d);
            logEl.scrollTop = logEl.scrollHeight;
        }

        function refreshLock() {
            if (!panel) return;
            panel.classList.toggle('ptx-lock', !!UI.locked);
            const t = panel.querySelector('#ptx-head .t');
            if (t) t.textContent = 'PT套件 · ' + SIGN + (UI.locked ? ' · 已锁定' : '');
        }

        function flashLock() {
            refreshLock();
            try { show(); } catch (e) { /* ignore */ }
        }

        return {
            locked: false, tab: tab, activate: activate, log: log, show: show,
            refreshLock: refreshLock, flashLock: flashLock,
            get mounted() { return !!panel; },
            mount() { if (tabs.length && document.body) ensure(); }
        };
    })();

    /* ======================================================================
     * 5. 模块注册
     * ==================================================================== */
    const MODULES = [];
    function module(id, name, when, init) { MODULES.push({ id: id, name: name, when: when, init: init }); }

    /* ----------------------------------------------------------------------
     * 5.1 魔力计算（A值 / A@GB / 时魔；B-A 曲线）
     * -------------------------------------------------------------------- */
    const Bonus = (function () {
        const PROFILES = {
            nexus: {
                name: 'NexusPHP', req: ['T0', 'N0', 'B0', 'L'], chart: true,
                calcA: function (T, S, N, rowText, p) {
                    const c1 = 1 - Math.pow(10, -(T / p.T0));
                    N = N || 1;
                    const c2 = 1 + Math.pow(2, 0.5) * Math.pow(10, -(N - 1) / (p.N0 - 1));
                    return c1 * S * c2;
                },
                calcB: function (A, p) { return p.B0 * (2 / Math.PI) * Math.atan(A / p.L); }
            },
            audiences: {
                name: 'Audiences', req: ['T0', 'N0', 'L'], chart: false,
                calcA: function (T, S, N, rowText, p) {
                    N = N || 1;
                    let adj = S;
                    if (String(rowText).indexOf('零魔') !== -1) {
                        if (N >= 10) return 0;
                        adj = S / 5;
                    }
                    const w = /官组|官組|官方/.test(rowText) ? 1.5 : 0.5;
                    const c1 = 1 - Math.pow(10, -(T / p.T0));
                    const c2 = 1 + Math.pow(2, 0.5) * Math.pow(10, -(N - 1) / (p.N0 - 1));
                    return c1 * adj * c2 * w;
                }
            },
            hdarea: {
                name: 'HDArea v2', req: [], chart: false,
                calcA: function (T, S, N) {
                    N = N || 1;
                    const cnt = S > 5 ? 1 : 0;
                    return cnt + S * (1 + Math.max(T, 0) * 0.02) * (1 + 1 / N) * 0.05;
                }
            },
            hdsky: {
                name: 'HDSky', req: ['T0', 'N0', 'B0', 'L'], chart: true,
                calcA: function (T, S, N, rowText, p, row) {
                    const c1 = 1 - Math.pow(10, -(T / p.T0));
                    N = N || 1;
                    const c2 = 1 + Math.pow(2, 0.5) * Math.pow(10, -(N - 1) / (p.N0 - 1));
                    const K = isOfficial(row) ? 3 : 1;
                    const M = 2;
                    return c1 * S * c2 * K * M / (N + 1);
                },
                calcB: function (A, p) { return p.B0 * (2 / Math.PI) * Math.atan(A / p.L); }
            },
            hhanclub: { name: 'HHANClub', req: [], chart: false, disable: true }
        };

        function isOfficial(row) {
            if (!row) return false;
            return $$('span.optiontag', row).some((s) => /官组|官組/.test(txt(s)));
        }

        function profile() {
            if (HOST === 'audiences.me') return PROFILES.audiences;
            if (HOST === 'hdarea.club') return PROFILES.hdarea;
            if (HOST === 'hhanclub.net') return PROFILES.hhanclub;
            if (HOST === 'hdsky.me') return PROFILES.hdsky;
            return PROFILES.nexus;
        }

        const KEY = 'bonus.' + (HOST.split('.').slice(-2).join('.'));
        function params() {
            const p = store.get(KEY, null) || {};
            return { T0: num(p.T0), N0: num(p.N0), B0: num(p.B0), L: num(p.L), A: num(p.A) };
        }
        function num(v) { const n = parseFloat(v); return isFinite(n) ? n : 0; }
        function saveParams(p) { store.set(KEY, Object.assign({}, params(), p)); }

        function ready(p) {
            const req = profile().req;
            return req.every((k) => isFinite(p[k]) && p[k] !== 0);
        }

        // 从页面文本抽取 T0/N0/B0/L/A
        function scrape(root) {
            const body = document.body;
            const raw = (root && (root.innerText || root.textContent)) || (body && (body.innerText || body.textContent)) || '';
            const text = String(raw).replace(/\s+/g, ' ');
            const out = {};
            ['T0', 'N0', 'B0', 'L'].forEach((k) => {
                const m = text.match(new RegExp('(?:^|[^A-Za-z0-9])' + k + '\\s*(?:=|:|：)\\s*(\\d+(?:\\.\\d+)?)', 'i'));
                if (m) out[k] = parseFloat(m[1]);
            });
            const am = text.match(/(?:^|[^A-Za-z0-9])A(?:值)?\s*(?:=|:|：)\s*(\d+(?:\.\d+)?)/);
            if (am) out.A = parseFloat(am[1]);
            return out;
        }

        function detectCols(headRow, sampleRow) {
            let t = -1, s = -1, n = -1;
            if (headRow) {
                $$('td,th', headRow).forEach((c, i) => {
                    if (c.querySelector('img.time')) t = i;
                    else if (c.querySelector('img.size')) s = i;
                    else if (c.querySelector('img.seeders')) n = i;
                });
            }
            // 无 img.time 时（做种列表常见），按数据行的日期列推断
            if (t < 0 && sampleRow && sampleRow.cells) {
                for (let i = 0; i < sampleRow.cells.length; i++) {
                    const cell = sampleRow.cells[i];
                    const sp = cell.querySelector('span[title]');
                    if (sp && /\d{4}[-\/]\d{1,2}/.test(sp.getAttribute('title') || '')) { t = i; break; }
                    if (/\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/.test(txt(cell))) { t = i; break; }
                }
            }
            if (t < 0 || s < 0 || n < 0) return null;
            return { t: t, s: s, n: n };
        }

        function rowMetrics(row, cols) {
            const td = row.children;
            const tcell = td[cols.t], scell = td[cols.s], ncell = td[cols.n];
            if (!tcell || !scell || !ncell) return null;
            let time = '';
            const sp = tcell.querySelector('span');
            if (sp) time = sp.getAttribute('title') || txt(sp);
            if (!time) time = txt(tcell);
            const T = (Date.now() - new Date(time).getTime()) / 1000 / 86400 / 7;
            const S = sizeToGB(txt(scell));
            const N = parseInt(txt(ncell).replace(/,/g, ''), 10) || 0;
            return { T: isFinite(T) ? T : 0, S: S, N: N };
        }

        function colorAve(v) {
            if (v >= 2) return { color: '#ff0000', weight: 900 };
            if (v >= 1.5) return { color: '#8B4513', weight: 800 };
            if (v >= 1) return { color: '#00008B', weight: 700 };
            return { color: '', weight: 400 };
        }
        function colorNow(v) {
            if (v >= 1) return { color: '#ff0000', weight: 900 };
            if (v >= 0.5) return { color: '#8B4513', weight: 800 };
            if (v >= 0.2) return { color: '#00008B', weight: 700 };
            return { color: '', weight: 400 };
        }

        function addColumns() {
            const table = $('.torrents:last-of-type') || $('table.torrents');
            if (!table) return;
            if ($('#ptx-th-a')) return;
            const headRow = table.querySelector('thead > tr') || table.querySelector('tbody > tr');
            const bodyRows = $$('tbody > tr', table);
            const sample = bodyRows.filter((r) => r !== headRow)[0] || bodyRows[0];
            const cols = detectCols(headRow, sample);
            if (!cols) { UI.log('魔力：未识别时间/大小/做种列，跳过注入', 'warn'); return; }

            const p = params();
            if (!ready(p)) { UI.log('魔力：缺少参数（请到 mybonus 页或手动填写）', 'warn'); return; }
            const prof = profile();
            if (prof.disable) return;

            const hasA = p.A > 0;
            const headTextA = hasA ? '时魔' : 'A';
            const headTextAve = hasA ? '时魔/GB' : 'A/GB';

            const tag = (headRow.parentElement && headRow.parentElement.tagName === 'THEAD') ? 'th' : 'td';
            const hA = el(tag, { class: 'colhead', id: 'ptx-th-a', title: hasA ? '当前做种状态下每小时可获魔力' : 'A值', text: headTextA });
            const hAve = el(tag, { class: 'colhead', id: 'ptx-th-ave', title: '每GB的A值', text: headTextAve });
            headRow.lastElementChild.before(hA, hAve);

            const rows = $$('tbody > tr', table).filter((r) => r !== headRow && r.cells && r.cells.length > cols.n);

            rows.forEach((row) => {
                const m = rowMetrics(row, cols);
                if (!m) return;
                const A = prof.calcA(m.T, m.S, m.N, txt(row), p, row);
                const ave = m.S > 0 ? A / m.S : 0;
                let tdA, tdAve;
                if (hasA && prof.calcB) {
                    const nowB = prof.calcB(p.A, p);
                    const newB = prof.calcB(p.A + A, p);
                    const dB = newB - nowB;
                    const dBpg = m.S > 0 ? dB / m.S : 0;
                    const c = colorNow(dBpg);
                    tdA = el('td', { class: 'rowfollow', 'data-ptx-a': dB, title: 'A: ' + A.toFixed(2), text: dB.toFixed(2) });
                    tdAve = el('td', { class: 'rowfollow', 'data-ptx-ave': dBpg, title: 'A/GB: ' + ave.toFixed(2) },
                        el('span', { style: { color: c.color || '', fontWeight: c.weight }, text: dBpg.toFixed(2) }));
                } else {
                    const c = colorAve(ave);
                    tdA = el('td', { class: 'rowfollow', 'data-ptx-a': A, text: A.toFixed(2) });
                    tdAve = el('td', { class: 'rowfollow', 'data-ptx-ave': ave },
                        el('span', { style: { color: c.color || '', fontWeight: c.weight }, text: ave.toFixed(2) }));
                }
                row.lastElementChild.before(tdA, tdAve);
            });

            UI.log('魔力：已注入 ' + rows.length + ' 行（' + prof.name + '）', 'ok');

            let dir = 0;
            const click = (which) => () => {
                dir = (dir + 1) % 3;
                sortRows(table, which, dir);
            };
            hA.addEventListener('click', click('a'));
            hAve.addEventListener('click', click('ave'));
        }

        function sortRows(table, which, dir) {
            const tbody = table.querySelector('tbody');
            const rows = $$('tr', tbody).filter((r) => r.querySelector('[data-ptx-a]'));
            const key = which === 'a' ? 'ptxA' : 'ptxAve';
            const val = (r) => {
                const c = r.querySelector(which === 'a' ? '[data-ptx-a]' : '[data-ptx-ave]');
                return c ? parseFloat(c.getAttribute(which === 'a' ? 'data-ptx-a' : 'data-ptx-ave')) || 0 : 0;
            };
            if (dir === 0) { rows.sort((a, b) => (a.rowIndex - b.rowIndex)); }
            else {
                rows.sort((a, b) => dir === 1 ? val(b) - val(a) : val(a) - val(b));
            }
            rows.forEach((r) => tbody.appendChild(r));
        }

        // B-A 曲线（canvas 自绘，免 echarts 依赖）
        function drawChart(canvas, p) {
            const prof = profile();
            if (!prof.calcB || !p.L) return;
            const dpr = window.devicePixelRatio || 1;
            const W = canvas.clientWidth || 340, H = 220;
            canvas.width = W * dpr; canvas.height = H * dpr;
            canvas.style.height = H + 'px';
            const g = canvas.getContext('2d');
            if (!g) return; // 无 canvas 上下文（部分环境）直接跳过
            g.scale(dpr, dpr);
            g.clearRect(0, 0, W, H);

            const maxA = Math.max(25 * p.L, (p.A || 0) * 1.1, 1);
            const pts = [];
            for (let a = 0; a <= maxA; a += maxA / 120) pts.push([a, prof.calcB(a, p)]);
            const maxB = Math.max.apply(null, pts.map((q) => q[1])) || 1;

            const padL = 38, padB = 24, padT = 10, padR = 8;
            const x = (a) => padL + (a / maxA) * (W - padL - padR);
            const y = (b) => H - padB - (b / maxB) * (H - padB - padT);

            g.strokeStyle = '#45475a'; g.lineWidth = 1;
            g.beginPath(); g.moveTo(padL, padT); g.lineTo(padL, H - padB); g.lineTo(W - padR, H - padB); g.stroke();
            g.fillStyle = '#6c7086'; g.font = '10px system-ui';
            g.fillText('B', 6, padT + 8);
            g.fillText('A', W - padR - 8, H - padB + 16);

            g.strokeStyle = '#89b4fa'; g.lineWidth = 1.6;
            g.beginPath();
            pts.forEach((q, i) => { i ? g.lineTo(x(q[0]), y(q[1])) : g.moveTo(x(q[0]), y(q[1])); });
            g.stroke();

            if (p.A > 0) {
                const b = prof.calcB(p.A, p);
                g.fillStyle = '#f9e2af';
                g.beginPath(); g.arc(x(p.A), y(b), 3.5, 0, Math.PI * 2); g.fill();
                g.fillText('A=' + p.A.toFixed(0) + ' B=' + b.toFixed(0), Math.min(x(p.A) + 6, W - 70), Math.max(y(b) - 6, 12));
            }
        }

        function addUserdetailsCols() {
            const ka1 = document.getElementById('ka1');
            if (!ka1) return;
            const table = ka1.querySelector('table');
            if (!table) return;
            const head = table.querySelector('tr');
            if (!head || head.querySelector('#ptx-th-a')) return;
            const sample = $$('tr', table).filter((r) => r !== head)[0] || head;
            const cols = detectCols(head, sample);
            if (!cols) return;
            const p = params();
            if (!ready(p)) return;
            const prof = profile();
            head.lastElementChild.before(
                el('td', { class: 'colhead', id: 'ptx-th-a', text: 'A' }),
                el('td', { class: 'colhead', id: 'ptx-th-ave', text: 'A/GB' })
            );
            $$('tr', table).forEach((row) => {
                if (row === head || !row.cells.length) return;
                const m = rowMetrics(row, cols);
                if (!m) return;
                const A = prof.calcA(m.T, m.S, m.N, txt(row), p, row);
                const ave = m.S > 0 ? A / m.S : 0;
                const c = colorAve(ave);
                row.lastElementChild.before(
                    el('td', { class: 'rowfollow', text: A.toFixed(2) }),
                    el('td', { class: 'rowfollow' }, el('span', { style: { color: c.color || '', fontWeight: c.weight }, text: ave.toFixed(2) }))
                );
            });
            let pending = false;
            new MutationObserver(() => {
                if (pending) return;
                pending = true;
                setTimeout(() => { pending = false; const t = $('#ka1 table'); if (t && !t.querySelector('#ptx-th-a')) addUserdetailsCols(); }, 300);
            }).observe(ka1, { childList: true, subtree: true });
        }

        function init() {
            const prof = profile();
            if (prof.disable) { console.warn(LOGTAG, prof.name + ' 暂不支持单种A值计算'); return; }

            if (/mybonus|\/bonus/i.test(PAGE)) {
                const got = scrape();
                const p = params();
                const merged = Object.assign({}, p, got);
                if (got.T0 || got.N0 || got.B0 || got.L) {
                    saveParams(merged);
                    UI.log('魔力：已从页面解析参数 T0/N0/B0/L', 'ok');
                } else {
                    UI.log('魔力：页面未解析到参数，可手动填写', 'warn');
                }
            } else if (/torrents/i.test(PAGE)) {
                addColumns();
            } else if (/userdetails/i.test(PAGE)) {
                addUserdetailsCols();
            }

            UI.tab('bonus', '魔力', (pane) => {
                const p0 = params();
                const wrap = el('div');
                wrap.appendChild(el('div', { class: 'ptx-hint', text: '当前站点配置：' + prof.name + '｜存储键 ' + KEY }));
                const fields = {};
                const rowEl = el('div', { class: 'ptx-row' });
                ['T0', 'N0', 'B0', 'L', 'A'].forEach((k) => {
                    const inp = el('input', { class: 'ptx-in', style: { width: '58px' }, value: p0[k] || '', placeholder: k });
                    fields[k] = inp;
                    rowEl.appendChild(el('label', { text: k }));
                    rowEl.appendChild(inp);
                });
                wrap.appendChild(rowEl);

                const canvas = el('canvas', { style: { width: '100%', display: 'block', marginTop: '8px' } });
                const btnRow = el('div', { class: 'ptx-row' },
                    el('button', {
                        class: 'ptx-btn g', text: '保存参数',
                        onclick: () => {
                            const np = {};
                            ['T0', 'N0', 'B0', 'L', 'A'].forEach((k) => { np[k] = parseFloat(fields[k].value) || 0; });
                            saveParams(np);
                            UI.log('魔力：参数已保存', 'ok');
                            drawChart(canvas, params());
                        }
                    }),
                    el('button', {
                        class: 'ptx-btn', text: '重新解析页面',
                        onclick: () => {
                            const got = scrape();
                            Object.keys(got).forEach((k) => { if (fields[k]) fields[k].value = got[k]; });
                            UI.log('魔力：页面解析结果 ' + JSON.stringify(got), 'info');
                        }
                    }),
                    el('button', {
                        class: 'ptx-btn o', text: '注入列表列',
                        onclick: () => { addColumns(); }
                    })
                );
                wrap.appendChild(btnRow);
                wrap.appendChild(canvas);
                wrap.appendChild(el('div', {
                    class: 'ptx-hint',
                    text: 'A = (1-10^(-T/T0)) × S × (1+√2·10^(-(N-1)/(N0-1)))；B = B0·(2/π)·atan(A/L)。时魔列为在当前 A 基础上追加该种子的增量。'
                }));
                pane.appendChild(wrap);
                setTimeout(() => drawChart(canvas, params()), 30);
            });
        }

        return { init: init, params: params, saveParams: saveParams };
    })();

    /* ----------------------------------------------------------------------
     * 5.2 认领 + 保种统计（含官种筛选）
     * -------------------------------------------------------------------- */
    const Claim = (function () {
        const OFFICIAL = {
            'hdpt.xyz': /[@-]\s?(HDPTWEB|HDPT)(\.mkv|\.mp4|\.ts|\.iso)?$/i,
            'hhanclub.top': /[@-]\s?(HHWEB)(\.mkv|\.mp4|\.ts|\.iso)?$/i,
            'hhanclub.net': /[@-]\s?(HHWEB)(\.mkv|\.mp4|\.ts|\.iso)?$/i,
            'wintersakura.net': /[@-]\s?(WScode|SakuraWEB|SakuraSUB)(\.mkv|\.mp4|\.ts|\.iso)?$/i,
            'piggo.me': /[@-]\s?(PigoHD|PigoWeb|PiGoNF|PigoAD)(\.mkv|\.mp4|\.ts|\.iso)?$/i
        };
        let cache = null, loading = null;

        function officialRe() {
            for (const h in OFFICIAL) if (hostMatch([h])) return OFFICIAL[h];
            return null;
        }

        function adapter() {
            if (hostMatch(['springsunday.net'])) {
                return {
                    get: (row) => { const b = row.querySelector('button[id^="btn"]'); return b ? b.id.replace('btn', '') : ''; },
                    send: (id) => http('POST', '/adopt.php', 'action=add&id=' + encodeURIComponent(id)),
                    ok: (r) => r.status === 200
                };
            }
            if (hostMatch(['pterclub.com'])) {
                return {
                    get: (row) => { const a = row.querySelector('.claim-confirm[data-url]'); return a ? a.getAttribute('data-url') : ''; },
                    send: (p) => http('GET', '/' + String(p).replace(/^\/+/, '')),
                    ok: (r) => /success|添加成功|"ret":0/.test(r.responseText || '')
                };
            }
            if (hostMatch(['audiences.me'])) {
                return {
                    get: (row) => {
                        const a = row.querySelector('a[href*="claim_block"]');
                        if (!a) return '';
                        const m = /claim_block(\d+)/.exec(a.getAttribute('href') || '');
                        return m ? m[1] : '';
                    },
                    send: (id) => http('GET', '/claim.php?act=add&tid=' + encodeURIComponent(id)),
                    ok: (r) => {
                        try { const j = JSON.parse(r.responseText); return !!j.res; } catch (e) { return /success|成功/.test(r.responseText || ''); }
                    }
                };
            }
            // 通用 NexusPHP：ajax.php + action=addClaim
            return {
                get: (row) => {
                    const cells = row.cells;
                    const last = cells[cells.length - 1];
                    const cand = [last && last.querySelector('button[data-torrent_id]'), row.querySelector('button[data-torrent_id]')];
                    for (const b of cand) {
                        if (b && b.style.display !== 'none') return b.getAttribute('data-torrent_id');
                    }
                    return '';
                },
                send: (id) => http('POST', '/ajax.php', 'action=addClaim&params%5Btorrent_id%5D=' + encodeURIComponent(id)),
                ok: (r) => { try { return JSON.parse(r.responseText).ret === 0; } catch (e) { return /"ret":0/.test(r.responseText || ''); } }
            };
        }

        function seedingBlock() {
            if (PAGE.indexOf('getusertorrentlist') >= 0) {
                const tbs = $$('tbody');
                return tbs[tbs.length - 1] || null;
            }
            const ka1 = document.getElementById('ka1');
            if (ka1) {
                const t = ka1.querySelector('table');
                if (t) return t.querySelector('tbody') || t;
            }
            const trs = $$('tr');
            for (const tr of trs) {
                if (tr.cells && tr.cells[0] && txt(tr.cells[0]) === '当前做种') return tr.cells[1];
            }
            return null;
        }

        function currentRows() {
            const block = seedingBlock();
            if (!block) return [];
            const sel = (block.tagName === 'TBODY' || block.tagName === 'THEAD') ? ':scope > tr' : ':scope > tbody > tr, :scope > tr';
            return Array.prototype.slice.call(block.querySelectorAll(sel))
                .filter((r) => r.cells && r.cells.length > 2 && !r.querySelector('th'));
        }

        function detectCols() {
            const ka1 = document.getElementById('ka1');
            const tbl = ka1 ? ka1.querySelector('table') : $('table.torrents');
            const head = tbl ? (tbl.querySelector('thead > tr') || tbl.querySelector('tr')) : null;
            let size = -1, seed = -1, title = -1;
            if (head) {
                $$('td,th', head).forEach((c, i) => {
                    const s = txt(c);
                    if (size < 0 && (c.querySelector('img.size') || /大小|size/i.test(s))) size = i;
                    if (seed < 0 && (c.querySelector('img.seeders') || /做种|seeder|保种/i.test(s))) seed = i;
                    if (title < 0 && (c.querySelector('img.title') || /标题|title|名称/i.test(s))) title = i;
                });
            }
            // 表头只有图标时，用数据行兜底推断大小/做种列
            if (size < 0 || seed < 0) {
                const sample = tbl ? $$('tr', tbl).filter((r) => r.cells && r.cells.length > 3)[1] : null;
                if (sample) {
                    for (let i = 0; i < sample.cells.length; i++) {
                        if (size < 0 && /^\s*\d+(\.\d+)?\s*[KMGT]i?B\s*$/i.test(txt(sample.cells[i]))) size = i;
                    }
                }
            }
            return { size: size >= 0 ? size : 3, seed: seed >= 0 ? seed : 4, title: title >= 0 ? title : 1 };
        }

        async function loadAllRows() {
            if (cache) { UI.log('认领：使用缓存行 ' + cache.length, 'info'); return cache; }
            if (loading) return loading;
            loading = (async () => {
                if (PAGE.indexOf('getusertorrentlist') >= 0) { cache = currentRows(); return cache; }
                const uid = new URLSearchParams(location.search).get('id');
                if (!uid) { cache = currentRows(); return cache; }
                const all = [];
                for (let page = 0; page < 200; page++) {
                    const url = location.origin + '/getusertorrentlistajax.php?page=' + page + '&userid=' + uid + '&type=seeding';
                    let html = '';
                    try { html = (await http('GET', url)).responseText; } catch (e) { UI.log('认领：第 ' + page + ' 页失败', 'err'); break; }
                    const doc = new DOMParser().parseFromString(html, 'text/html');
                    const rows = $$('tr', doc).filter((r) => r.cells && r.cells.length > 2 && !r.querySelector('th'));
                    all.push.apply(all, rows);
                    const next = page + 1;
                    const more = doc.querySelector('a[href*="page=' + next + '"]') || doc.querySelector('a[href*="page%3D' + next + '"]');
                    if (!more) break;
                    await sleep(250);
                }
                cache = all.length ? all : currentRows();
                return cache;
            })();
            const r = await loading;
            loading = null;
            return r;
        }

        function titleOf(row, col) {
            const cell = row.cells[col.title];
            const a = cell && cell.querySelector('a');
            if (!a) return '';
            return (a.getAttribute('title') || txt(a)).trim();
        }

        function filterTargets(rows, keyword, minGB) {
            const ad = adapter();
            const col = detectCols();
            const off = officialRe();
            const onlyOff = store.get('claim.onlyOfficial', false);
            const out = [];
            rows.forEach((row) => {
                const title = titleOf(row, col);
                if (!title) return;
                if (keyword && title.toLowerCase().indexOf(keyword.toLowerCase()) < 0) return;
                if (minGB > 0) {
                    const sizeCell = row.cells[col.size];
                    if (sizeToGB(txt(sizeCell)) < minGB) return;
                }
                if (onlyOff && off && !off.test(title)) return;
                const id = ad.get(row);
                if (!id) return;
                out.push({ id: id, title: title, row: row });
            });
            return out;
        }

        function stats(rows, col) {
            let bytes = 0, n = 0;
            const lv = [5, 10, 20].map((k) => ({ k: k, c: 0, b: 0 }));
            rows.forEach((row) => {
                if (!row.cells || row.cells.length < 3) return;
                n++;
                const b = sizeToBytes(txt(row.cells[col.size]));
                bytes += b;
                const sd = parseInt(txt(row.cells[col.seed]).replace(/,/g, ''), 10);
                if (isNaN(sd)) return;
                lv.forEach((x) => { if (sd <= x.k) { x.c++; x.b += b; } });
            });
            return { n: n, bytes: bytes, lv: lv };
        }

        async function doClaim(btn) {
            if (!needSign('批量认领')) return;
            btn.disabled = true;
            try {
                const keyword = $('#ptx-claim-kw') ? $('#ptx-claim-kw').value.trim() : '';
                const minGB = $('#ptx-claim-min') ? parseFloat($('#ptx-claim-min').value) || 0 : 0;
                const rows = await loadAllRows();
                const targets = filterTargets(rows, keyword, minGB);
                if (!targets.length) { UI.log('认领：没有符合条件的目标', 'warn'); return; }
                if (!confirm('确认认领 ' + targets.length + ' 个种子（共扫描 ' + rows.length + ' 行）？')) return;

                const ad = adapter();
                let ok = 0, fail = 0;
                for (let i = 0; i < targets.length; i++) {
                    const t = targets[i];
                    try {
                        const r = await ad.send(t.id);
                        if (ad.ok(r)) {
                            ok++;
                            t.row.style.backgroundColor = 'rgba(166,227,161,.35)';
                            UI.log('✓ ' + t.title.slice(0, 40), 'ok');
                        } else {
                            fail++;
                            t.row.style.backgroundColor = 'rgba(243,139,168,.35)';
                            UI.log('✗ ' + t.title.slice(0, 40), 'err');
                        }
                    } catch (e) { fail++; UI.log('✗ 请求异常：' + t.title.slice(0, 30), 'err'); }
                    await sleep(500);
                }
                UI.log('认领完成：成功 ' + ok + ' / 失败 ' + fail, ok ? 'ok' : 'err');
            } finally { btn.disabled = false; }
        }

        function doPreview() {
            const keyword = $('#ptx-claim-kw') ? $('#ptx-claim-kw').value.trim() : '';
            const minGB = $('#ptx-claim-min') ? parseFloat($('#ptx-claim-min').value) || 0 : 0;
            const rows = currentRows();
            const col = detectCols();
            const off = officialRe();
            const targets = filterTargets(rows, keyword, minGB);
            rows.forEach((r) => { r.style.outline = ''; });
            targets.forEach((t) => { t.row.style.outline = '2px solid #fab387'; });
            UI.log('预览：当前页命中 ' + targets.length + ' / ' + rows.length + (off ? '（含官种 ' + rows.filter((r) => off.test(titleOf(r, col))).length + '）' : ''), 'warn');
        }

        async function doStats() {
            const rows = await loadAllRows();
            const col = detectCols();
            const s = stats(rows, col);
            const off = officialRe();
            const offCount = off ? rows.filter((r) => off.test(titleOf(r, col))).length : 0;
            let html = '<table class="ptx-tb"><tr><th>项目</th><th>数量</th><th>体积</th></tr>';
            html += '<tr><td>全部做种</td><td>' + s.n + '</td><td>' + fmtBytes(s.bytes) + '</td></tr>';
            if (off) html += '<tr><td>官种</td><td>' + offCount + '</td><td>-</td></tr>';
            s.lv.forEach((x) => { html += '<tr><td>≤' + x.k + ' 人</td><td>' + x.c + '</td><td>' + fmtBytes(x.b) + '</td></tr>'; });
            html += '</table>';
            const box = $('#ptx-claim-stats');
            if (box) box.innerHTML = html;
            UI.log('统计完成：' + s.n + ' 个做种 / ' + fmtBytes(s.bytes), 'ok');
        }

        function hideFull(on) {
            let n = 0;
            $$('.torrents tbody > tr, table.torrents tbody > tr').forEach((row) => {
                const hit = row.querySelector('span[title="认领人数已满"], span[title*="已满"]');
                if (hit) { row.style.display = on ? 'none' : ''; if (on) n++; }
            });
            UI.log((on ? '已隐藏' : '已恢复') + '认领已满的种子' + (on ? '（' + n + ' 行）' : ''), 'info');
        }

        function init() {
            const onTorrents = /torrents/i.test(PAGE);
            if (onTorrents) {
                const on = store.get('claim.hideFull', false);
                if (on) setTimeout(() => hideFull(true), 400);
            }

            UI.tab('claim', '认领', (pane) => {
                const wrap = el('div');
                if (onTorrents) {
                    const cb = el('input', { type: 'checkbox' });
                    cb.checked = store.get('claim.hideFull', false);
                    cb.onchange = () => { store.set('claim.hideFull', cb.checked); hideFull(cb.checked); };
                    wrap.appendChild(el('div', { class: 'ptx-row' }, cb, el('span', { text: '隐藏认领已满的种子' })));
                    wrap.appendChild(el('div', { class: 'ptx-hint', text: '种子列表页功能：过滤已满认领。认领/统计请到 userdetails 页。' }));
                    pane.appendChild(wrap);
                    return;
                }

                const kw = el('input', { class: 'ptx-in', id: 'ptx-claim-kw', placeholder: '标题关键词（空=全部）', style: { flex: '1' } });
                const min = el('input', { class: 'ptx-in', id: 'ptx-claim-min', placeholder: '最小 GB', style: { width: '70px' } });
                const only = el('input', { type: 'checkbox' });
                only.checked = store.get('claim.onlyOfficial', false);
                only.onchange = () => store.set('claim.onlyOfficial', only.checked);

                wrap.appendChild(el('div', { class: 'ptx-row' }, el('label', { text: '关键词' }), kw));
                wrap.appendChild(el('div', { class: 'ptx-row' }, el('label', { text: '最小体积' }), min));
                wrap.appendChild(el('div', { class: 'ptx-row' }, only, el('span', { text: '仅官种（按站点官组正则）' })));

                const statsBox = el('div', { id: 'ptx-claim-stats' });
                const claimBtn = el('button', { class: 'ptx-btn g', text: '批量认领' });
                claimBtn.onclick = () => doClaim(claimBtn);
                wrap.appendChild(el('div', { class: 'ptx-row' },
                    el('button', { class: 'ptx-btn o', text: '预览高亮', onclick: doPreview }),
                    el('button', { class: 'ptx-btn', text: '保种统计', onclick: doStats }),
                    claimBtn,
                    el('button', { class: 'ptx-btn', text: '清缓存', onclick: () => { cache = null; UI.log('认领：缓存已清', 'warn'); } })
                ));
                wrap.appendChild(statsBox);
                wrap.appendChild(el('div', { class: 'ptx-hint', text: '全站分页通过 getusertorrentlistajax.php 抓取；站点适配：NexusPHP ajax.php / SSK adopt.php / 猫站 claim / 观众 claim.php。' }));
                pane.appendChild(wrap);
            });
        }

        return { init: init, currentRows: currentRows, detectCols: detectCols, loadAllRows: loadAllRows };
    })();

    /* ----------------------------------------------------------------------
     * 5.3 官种 / 官组保种统计（多站点）
     * -------------------------------------------------------------------- */
    const OfficialStats = (function () {
        // host: [abbrev, 做种人数分级, 官组列表(逗号分隔)]
        const SITES = {
            'audiences.me': ['Audiences', [3, 5, 7, 11], 'Audies,ADE,ADWeb,ADAudio,ADeBook,ADMusic'],
            'hdsky.me': ['HDSky', [7, 11, 20], 'HDSky,HDS,HDSWEB,HDSTV,HDSPad'],
            'pterclub.com': ['PTer', [3, 5, 7, 11, 20], 'PTer,PTerWEB,PTerMV,PTerTV'],
            'ourbits.club': ['OB', [3, 5, 7, 11, 20], 'OurBits,OurTV,FLTTH,Ao,PbK,MGs,iLoveTV,iLoveHD'],
            'chdbits.co': ['CHD', [2, 3, 4, 5, 7, 11, 20], 'CHD,CHDBits,CHDTV,CHDPAD,CHDWEB,CHDHKTV,StBOX,OneHD'],
            'ptchdbits.co': ['CHD', [2, 3, 4, 5, 7, 11, 20], 'CHD,CHDBits,CHDTV,CHDPAD,CHDWEB,CHDHKTV,StBOX,OneHD'],
            'club.hares.top': ['Hares', [3, 5, 7, 11], 'Hares,HaresWEB,HaresTV'],
            'pthome.net': ['PTH', [3, 5, 7, 11], 'PTHome,PTH,PTHweb,PTHtv,PTHeBook,PTHAudio,PTHmusic'],
            'springsunday.net': ['SSD', [3, 5, 7, 11, 20], 'CMCT,CMCTV,CMCTA,Oldboys,GTR,XY,iFree,RO,CatEDU,Anonymous,Telesto,Lislander,Crazyleikm,NOVOLAND'],
            'hdhome.org': ['HDH', [3, 5, 7, 11], 'HDHome,HDH,HDHTV,HDHPad,HDHWEB'],
            'hdchina.org': ['HDC', [6, 11, 20, 30], 'HDChina,HDCTV,HDC,k9611,tudou,iHD,HDWinG,HDWTV'],
            'hddolby.com': ['DB', [3, 5, 7, 11], 'Dream,DBTV,QHstudIo,HDo'],
            'tjupt.org': ['TJU', [3, 5, 7, 11], 'TJUPT'],
            'leaves.red': ['RedLeaves', [3, 5, 7, 11], 'RL,RL4B'],
            'totheglory.im': ['TTG', [3, 5, 7, 11, 20], 'TTG,Wiki,NGB,DoA,ARiN,ExREN'],
            'ptsbao.club': ['PtSbao', [3, 5, 7, 11], 'OPS,FFansBD,FFansWEB,FFansTV,FFansDVD,FHDMv'],
            'pt.btschool.club': ['Bts', [3, 5, 7, 11, 20], 'BtsHD,BtsTV,BtsPAD,Zone'],
            'pt.hd4fans.org': ['beAst', [3, 5, 7, 11, 20], 'beAst,beAstTV'],
            'pt.eastgame.org': ['TLFbits', [3, 5, 7, 11, 20], 'iNT-TLF,HALFCD-TLF,MiniSD-TLF,MiniHD-TLF,MiniFHD-TLF,TLF'],
            'hhanclub.top': ['HH', [3, 5, 7, 11], 'HHWEB'],
            'hhanclub.net': ['HH', [3, 5, 7, 11], 'HHWEB'],
            'wintersakura.net': ['WS', [5, 10], 'WScode,SakuraWEB,SakuraSUB'],
            'piggo.me': ['PiGo', [5, 10], 'PigoHD,PigoWeb,PiGoNF,PigoAD'],
            'hdpt.xyz': ['HDPT', [5, 10], 'HDPTWEB,HDPT'],
            'pt.soulvoice.club': ['SV', [3, 5, 7, 11], ''],
            'pt.keepfrds.com': ['FRDS', [3, 5, 7, 11], 'FRDS'],
            'lemonhd.club': ['LemonHD', [3, 5, 7, 11], 'LHD,LeagueHD,LeagueNF,LeagueTV,LeagueCD,LeagueWEB,i18n,CiNT'],
            'beitai.pt': ['BeiTai', [3, 5, 7, 11], 'BeiTai'],
            'hd4fans.org': ['beAst', [3, 5, 7, 11], 'beAst']
        };

        function cfg() {
            for (const h in SITES) if (hostMatch([h])) {
                const row = SITES[h];
                const names = String(row[2]).split(',').filter(Boolean);
                return {
                    host: h, abbrev: row[0], levels: row[1],
                    groups: names.map((n) => ({ name: n, re: new RegExp('[@-]\\s?' + esc(n) + '\\b', 'i'), c: 0, b: 0 })),
                    official: names.length ? new RegExp('[@-]\\s?(' + names.map(esc).join('|') + ')\\b', 'i') : null
                };
            }
            return null;
        }

        function collect(rows) {
            const c = cfg();
            if (!c) return null;
            const col = Claim.detectCols();
            let total = 0, totalB = 0, offC = 0, offB = 0;
            const lv = c.levels.map((k) => ({ k: k, c: 0, b: 0 }));
            const seen = new Set();

            rows.forEach((row) => {
                if (!row.cells || row.cells.length < 3) return;
                const title = row.cells[col.title] ? (txt(row.cells[col.title].querySelector('a')) || txt(row.cells[col.title])) : '';
                const key = title + '|' + txt(row.cells[col.size]);
                if (seen.has(key)) return;
                seen.add(key);

                const b = sizeToBytes(txt(row.cells[col.size]));
                total++; totalB += b;

                const isOff = c.official && title && c.official.test(title);
                if (isOff) { offC++; offB += b; }
                if (isOff) {
                    c.groups.forEach((g) => { if (g.re.test(title)) { g.c++; g.b += b; } });
                }
                const sd = parseInt(txt(row.cells[col.seed]).replace(/,/g, ''), 10);
                if (!isNaN(sd)) lv.forEach((x) => { if (sd <= x.k) { x.c++; x.b += b; } });
            });

            return { cfg: c, total: total, totalB: totalB, offC: offC, offB: offB, lv: lv };
        }

        function renderTable(r) {
            let h = '<table class="ptx-tb"><tr><th>项目</th><th>数量</th><th>体积</th></tr>';
            h += '<tr><td>做种总数</td><td>' + r.total + '</td><td>' + fmtBytes(r.totalB) + '</td></tr>';
            if (r.cfg.official) h += '<tr><td>官种合计</td><td>' + r.offC + '</td><td>' + fmtBytes(r.offB) + '</td></tr>';
            h += '</table>';

            const gs = r.cfg.groups.filter((g) => g.c > 0);
            if (gs.length) {
                h += '<table class="ptx-tb" style="margin-top:8px"><tr><th>官组</th><th>数量</th><th>体积</th></tr>';
                gs.forEach((g) => { h += '<tr><td>' + g.name + '</td><td>' + g.c + '</td><td>' + fmtBytes(g.b) + '</td></tr>'; });
                h += '</table>';
            }
            h += '<table class="ptx-tb" style="margin-top:8px"><tr><th>做种人数</th><th>数量</th><th>体积</th></tr>';
            r.lv.forEach((x) => { h += '<tr><td>≤' + x.k + '</td><td>' + x.c + '</td><td>' + fmtBytes(x.b) + '</td></tr>'; });
            h += '</table>';
            return h;
        }

        function init() {
            if (!cfg()) return;
            UI.tab('official', '官组', (pane) => {
                const box = el('div');
                const wrap = el('div');
                wrap.appendChild(el('div', { class: 'ptx-hint', text: '站点：' + cfg().abbrev + '｜自动识别官组、做种人数分级' }));
                wrap.appendChild(el('div', { class: 'ptx-row' },
                    el('button', {
                        class: 'ptx-btn g', text: '统计当前页',
                        onclick: () => {
                            const r = collect(Claim.currentRows());
                            box.innerHTML = r ? renderTable(r) : '无数据';
                            UI.log('官组：当前页统计完成', 'ok');
                        }
                    }),
                    el('button', {
                        class: 'ptx-btn', text: '统计全部页',
                        onclick: async (e) => {
                            const btn = e.target;
                            btn.disabled = true;
                            try {
                                const rows = await Claim.loadAllRows();
                                const r = collect(rows);
                                box.innerHTML = r ? renderTable(r) : '无数据';
                                UI.log('官组：全部分页统计完成（' + r.total + ' 行）', 'ok');
                            } finally { btn.disabled = false; }
                        }
                    })
                ));
                wrap.appendChild(box);
                pane.appendChild(wrap);
            });
        }

        return { init: init };
    })();

    /* ----------------------------------------------------------------------
     * 5.4 批量增量送魔力
     *   多收件人 · 分段增量 · 余额上限 · 站点自动识别 · 失败重试 · 演练
     * -------------------------------------------------------------------- */
    const Gift = (function () {
        const SITES = {
            'hdsky.me': { name: 'HDSky', option: 10, step: 10000, gap: 800 },
            'pterclub.com': { name: '猫站', option: 13, step: 10000, gap: 800 },
            'pterclub.net': { name: '猫站', option: 13, step: 10000, gap: 800 },
            'audiences.me': { name: '观众', option: 7, step: 10000, gap: 800 },
            'club.hares.top': { name: '白兔', option: 7, step: 10000, gap: 800 },
            'zmpt.cc': { name: '织梦', option: 3, step: 5000, gap: 1200 },
            'springsunday.net': { name: '春天', option: 10, step: 10000, gap: 900 },
            'hdhome.org': { name: 'HDHome', option: 7, step: 10000, gap: 900 },
            'hddolby.com': { name: '杜比', option: 7, step: 10000, gap: 900 },
            'ptsbao.club': { name: '堡', option: 7, step: 10000, gap: 900 },
            'hhanclub.top': { name: 'HHClub', option: 13, step: 10000, gap: 900 },
            'u2.dmhy.org': { name: 'U2', option: 13, step: 50000, gap: 305000, url: '/mpshop.php', kind: 'u2' }
        };

        let running = false;

        function cfg() {
            for (const h in SITES) if (hostMatch([h])) return Object.assign({ host: h, known: true }, SITES[h]);
            return { host: HOST, name: HOST, option: 0, step: 10000, gap: 1000, known: false };
        }

        /* ---- 页面探测：option / 单批上限 / 可用余额 ---- */
        function detectOption(c) {
            const sels = $$('select');
            for (const s of sels) {
                if (!/option|type/i.test(s.name || '')) continue;
                const opts = Array.prototype.slice.call(s.options || []);
                const hit = opts.filter((o) => /魔力|积分|bonus/i.test(o.text || ''))[0];
                if (hit) {
                    const v = parseInt(hit.value, 10);
                    if (!isNaN(v)) return v;
                }
            }
            return c.option;
        }

        function detectStep(c) {
            const elx = document.querySelector('input[name="bonusgift"], input[name="amount"], #giftcustom');
            if (elx) {
                const cand = [
                    parseInt(elx.getAttribute('max'), 10),
                    parseInt(elx.getAttribute('data-max'), 10),
                    parseInt((elx.getAttribute('placeholder') || '').replace(/[^\d]/g, ''), 10)
                ].filter((n) => !isNaN(n) && n > 0);
                if (cand.length) return Math.max.apply(null, cand);
            }
            return c.step;
        }

        function detectBalance() {
            const raw = ((document.body && (document.body.innerText || document.body.textContent)) || '').replace(/\s+/g, ' ');
            const m = raw.match(/(?:魔力值|魔力|积分|bonus)[^\d]{0,12}([\d,]{2,})/i);
            if (!m) return 0;
            const n = parseInt(String(m[1]).replace(/,/g, ''), 10);
            return isNaN(n) ? 0 : n;
        }

        /* ---- 目标解析：每行 `用户名 [数量]`，分隔符支持 空格/逗号/冒号/等号/制表 ---- */
        function parseTargets(text, defAmount) {
            const out = [];
            const bad = [];
            String(text || '').split(/\r?\n/).forEach((line) => {
                const s = line.trim();
                if (!s || s[0] === '#') return;
                const m = s.match(/^(\S+?)\s*[\s,，:：=\t]\s*([\d,]+)\s*$/);
                let user, amount, explicit;
                if (m) {
                    user = m[1];
                    amount = parseInt(m[2].replace(/,/g, ''), 10);
                    explicit = true;
                } else {
                    user = s.replace(/[\s,，:：=\t]+$/, '');
                    amount = defAmount;
                    explicit = false;
                }
                if (!user) return;
                if (!amount || amount <= 0) { bad.push(s); return; }
                out.push({ user: user, amount: amount, explicit: explicit });
            });
            return { targets: out, bad: bad };
        }

        /* ---- 增量计划：把总额拆成若干批 ---- */
        function plan(total, baseStep, growth) {
            const out = [];
            let left = Math.max(0, Math.floor(total));
            let step = Math.max(1, Math.floor(baseStep));
            let guard = 0;
            while (left > 0 && guard++ < 20000) {
                const batch = Math.min(left, step);
                out.push(batch);
                left -= batch;
                if (growth > 1) step = Math.min(Math.floor(step * growth), step * 8);
            }
            return out;
        }

        function payload(c, user, amount, msg) {
            if (c.kind === 'u2') {
                return 'recv=' + encodeURIComponent(user) + '&amount=' + amount +
                    '&message=' + encodeURIComponent(msg) + '&event=1003';
            }
            return 'username=' + encodeURIComponent(user) + '&bonusgift=' + amount +
                '&message=' + encodeURIComponent(msg) + '&option=' + c.option +
                '&submit=' + encodeURIComponent('赠送');
        }

        async function sendOne(c, user, amount, msg) {
            const url = location.origin + (c.url || '/mybonus.php?action=exchange');
            const r = await http('POST', url, payload(c, user, amount, msg));
            const t = r.responseText || '';
            if (/错误|失敗|失败|error|上限|不足|不存在/i.test(t)) {
                const m = t.match(/<td class="text">([\s\S]*?)<\/td>/) || t.match(/<b>([\s\S]*?)<\/b>/);
                return { ok: false, msg: (m ? m[1].replace(/<[^>]+>/g, '').trim() : '请求被拒绝') };
            }
            if (r.status >= 400) return { ok: false, msg: 'HTTP ' + r.status };
            return { ok: true };
        }

        /* ---- 单个收件人：按计划逐批发送，失败重试 ---- */
        async function sendTarget(c, t, opt, onTick) {
            const batches = plan(t.amount, opt.step, opt.growth);
            let sent = 0;
            for (let i = 0; i < batches.length; i++) {
                if (!running) return { user: t.user, sent: sent, total: t.amount, state: 'abort' };
                const amount = batches[i];
                if (opt.dry) {
                    UI.log('[演练] ' + t.user + ' 第 ' + (i + 1) + '/' + batches.length + ' 批：' + amount + '（累计 ' + (sent + amount) + '/' + t.amount + '）', 'info');
                    sent += amount;
                    if (onTick) onTick(amount);
                    continue;
                }
                if (!needSign('送魔力')) { running = false; return { user: t.user, sent: sent, total: t.amount, state: 'locked' }; }

                let done = false, lastMsg = '';
                for (let retry = 0; retry <= opt.retry && !done; retry++) {
                    if (retry) { UI.log('↻ ' + t.user + ' 重试第 ' + retry + ' 次：' + lastMsg, 'warn'); await sleep(1200 * retry); }
                    try {
                        const res = await sendOne(c, t.user, amount, opt.msg);
                        if (res.ok) { done = true; }
                        else { lastMsg = res.msg; if (/余额|不足|上限/.test(res.msg)) { retry = opt.retry; } }
                    } catch (e) { lastMsg = '网络异常'; }
                }
                if (!done) {
                    UI.log('✗ ' + t.user + ' 中止：' + lastMsg, 'err');
                    return { user: t.user, sent: sent, total: t.amount, state: 'fail', reason: lastMsg };
                }
                sent += amount;
                if (onTick) onTick(amount);
                UI.log('✓ ' + t.user + ' +' + amount + '（' + sent + '/' + t.amount + '）', 'ok');
                if (i < batches.length - 1) await sleep(c.gap);
            }
            return { user: t.user, sent: sent, total: t.amount, state: 'ok' };
        }

        function stop() { running = false; UI.log('送魔力：已请求停止（当前批次后终止）', 'warn'); }

        function init() {
            const c = cfg();
            const base = {
                option: detectOption(c),
                step: detectStep(c),
                balance: detectBalance()
            };

            UI.tab('gift', '送魔力', (pane) => {
                /* ---- 站点与探测信息 ---- */
                const info = el('div', { class: 'ptx-hint' });
                const renderInfo = () => {
                    info.textContent = '站点：' + c.name + (c.known ? '' : '（未收录，走通用 NexusPHP）') +
                        '｜option=' + optIn.value + '｜单批上限 ' + stepIn.value +
                        '｜间隔 ' + c.gap + 'ms' + (base.balance ? '｜当前魔力值 ' + base.balance : '');
                };

                const optIn = el('input', { class: 'ptx-in', type: 'number', value: String(base.option), style: { width: '64px' } });
                const stepIn = el('input', { class: 'ptx-in', type: 'number', value: String(base.step), style: { width: '88px' } });
                optIn.oninput = stepIn.oninput = renderInfo;

                /* ---- 目标列表 ---- */
                const list = el('textarea', {
                    class: 'ptx-in',
                    placeholder: '每行一个收件人：\nAlice 10000\nBob\n# 井号开头是注释\n（只写用户名时用下方默认额度）',
                    style: { width: '100%', height: '74px', resize: 'vertical', boxSizing: 'border-box' }
                });
                const defAmt = el('input', { class: 'ptx-in', type: 'number', placeholder: '默认额度', style: { width: '96px' } });
                const mode = el('select', { class: 'ptx-in' },
                    el('option', { value: 'fixed', text: '固定步进' }),
                    el('option', { value: 'grow', text: '递增步进' }),
                    el('option', { value: 'balance', text: '余额上限（按比例吃满）' })
                );
                const ratio = el('input', { class: 'ptx-in', type: 'number', value: '100', style: { width: '56px' } });
                const growth = el('input', { class: 'ptx-in', type: 'number', value: '1.5', step: '0.1', style: { width: '56px' } });
                const msgIn = el('input', { class: 'ptx-in', value: 'Gift', style: { flex: '1' } });
                const retryIn = el('input', { class: 'ptx-in', type: 'number', value: '2', style: { width: '48px' } });
                const dry = el('input', { type: 'checkbox' });
                dry.checked = true;

                /* ---- 进度与结果 ---- */
                const bar = el('div', { style: { height: '5px', background: '#313244', borderRadius: '4px', margin: '8px 0', overflow: 'hidden' } });
                const fill = el('div', { style: { height: '100%', width: '0%', background: 'linear-gradient(90deg,#a6e3a1,#94e2d5)' } });
                bar.appendChild(fill);
                const status = el('div', { class: 'ptx-hint' });
                const result = el('div', { style: { maxHeight: '110px', overflow: 'auto' } });

                const collect = () => {
                    const def = parseInt(defAmt.value, 10) || 0;
                    const parsed = parseTargets(list.value, def);
                    let targets = parsed.targets;
                    if (mode.value === 'balance') {
                        const usable = Math.floor(base.balance * ((parseFloat(ratio.value) || 100) / 100));
                        if (!usable) { UI.log('余额上限模式：未探测到魔力值，请改用固定额度', 'warn'); return null; }
                        // 显式写数量的照办，剩下的按人数平分可用余额
                        const expl = targets.filter((t) => t.explicit);
                        const auto = targets.filter((t) => !t.explicit);
                        let left = usable - expl.reduce((a, b) => a + b.amount, 0);
                        if (left < 0) left = 0;
                        const each = auto.length ? Math.floor(left / auto.length) : 0;
                        targets = targets.map((t) => ({ user: t.user, amount: t.explicit ? t.amount : each }))
                            .filter((t) => t.amount > 0);
                        if (!targets.length) { UI.log('余额上限模式：可用余额不足（' + usable + '）', 'warn'); return null; }
                    }
                    return { targets: targets, bad: parsed.bad };
                };

                const preview = () => {
                    const r = collect();
                    if (!r) return;
                    if (!r.targets.length) { status.textContent = '没有可执行的目标'; return; }
                    let lines = [];
                    let grand = 0;
                    r.targets.forEach((t) => {
                        const b = plan(t.amount, parseInt(stepIn.value, 10) || base.step, mode.value === 'grow' ? (parseFloat(growth.value) || 1.5) : 1);
                        grand += t.amount;
                        lines.push(t.user + ' → ' + t.amount + '（' + b.length + ' 批：' + b.slice(0, 6).join('+') + (b.length > 6 ? '+…' : '') + '）');
                    });
                    result.textContent = '';
                    result.appendChild(el('div', { class: 'ptx-hint', text: '共 ' + r.targets.length + ' 人 / 合计 ' + grand + ' 魔力' + (r.bad.length ? '｜忽略 ' + r.bad.length + ' 行格式错误' : '') }));
                    lines.forEach((l) => result.appendChild(el('div', { class: 'ptx-hint', text: l })));
                    status.textContent = '预览完成，未发送';
                };

                const start = async (btn) => {
                    const r = collect();
                    if (!r || !r.targets.length) { UI.log('送魔力：没有有效目标', 'warn'); return; }
                    if (!dry.checked && !needSign('批量送魔力')) return;
                    if (!dry.checked && !confirm('确认向 ' + r.targets.length + ' 人送出合计 ' + r.targets.reduce((a, b) => a + b.amount, 0) + ' 魔力？')) return;

                    const opt = {
                        step: parseInt(stepIn.value, 10) || base.step,
                        growth: mode.value === 'grow' ? (parseFloat(growth.value) || 1.5) : 1,
                        msg: msgIn.value || 'Gift',
                        retry: Math.max(0, parseInt(retryIn.value, 10) || 0),
                        dry: dry.checked
                    };
                    const grand = r.targets.reduce((a, b) => a + b.amount, 0);
                    let done = 0;
                    running = true;
                    btn.disabled = true;
                    fill.style.width = '0%';
                    result.textContent = '';
                    status.textContent = '进行中…';
                    UI.log('批量增量送魔力开始：' + r.targets.length + ' 人 / ' + grand + ' 魔力，单批 ' + opt.step + '，模式 ' + mode.value + (opt.dry ? '（演练）' : ''));

                    const reports = [];
                    for (const t of r.targets) {
                        if (!running) { reports.push({ user: t.user, sent: 0, total: t.amount, state: 'abort' }); continue; }
                        const rep = await sendTarget(c, t, opt, (amt) => {
                            done += amt;
                            fill.style.width = Math.round(done / grand * 100) + '%';
                            status.textContent = '已送 ' + done + ' / ' + grand;
                        });
                        reports.push(rep);
                        if (rep.state === 'fail' || rep.state === 'locked') {
                            if (rep.state === 'locked') break;
                        }
                    }

                    running = false;
                    btn.disabled = false;
                    const okN = reports.filter((x) => x.state === 'ok').length;
                    const failN = reports.filter((x) => x.state === 'fail').length;
                    const sentSum = reports.reduce((a, b) => a + b.sent, 0);
                    status.textContent = '完成：成功 ' + okN + ' 人 / 失败 ' + failN + ' 人 / 已送 ' + sentSum;
                    result.textContent = '';
                    reports.forEach((rep) => {
                        const cls = rep.state === 'ok' ? 'ptx-ok' : (rep.state === 'fail' ? 'ptx-bad' : '');
                        result.appendChild(el('div', {
                            class: 'ptx-hint ' + cls,
                            text: rep.user + '｜' + rep.state + '｜' + rep.sent + '/' + rep.total + (rep.reason ? '｜' + rep.reason : '')
                        }));
                    });
                    UI.log('批量送魔力结束：成功 ' + okN + '，失败 ' + failN + '，合计 ' + sentSum, failN ? 'warn' : 'ok');
                };

                const startBtn = el('button', { class: 'ptx-btn g', text: '开始批量' });
                startBtn.onclick = () => start(startBtn);
                const stopBtn = el('button', { class: 'ptx-btn r', text: '停止' });
                stopBtn.onclick = stop;
                const copyBtn = el('button', {
                    class: 'ptx-btn', text: '复制结果',
                    onclick: () => {
                        const t = Array.from(result.children).map((d) => d.textContent).join('\n');
                        if (!t) { UI.log('没有可复制的结果', 'warn'); return; }
                        setClipboard(t);
                        UI.log('结果已复制', 'ok');
                    }
                });

                renderInfo();

                pane.appendChild(info);
                pane.appendChild(el('div', { class: 'ptx-row' }, el('label', { text: '收件人' }), list));
                pane.appendChild(el('div', { class: 'ptx-row' },
                    el('label', { text: '默认额度' }), defAmt,
                    el('span', { class: 'ptx-hint', text: '每行可单独写数量' })
                ));
                pane.appendChild(el('div', { class: 'ptx-row' },
                    el('label', { text: '增量方式' }), mode,
                    el('span', { class: 'ptx-hint', text: '余额比例%' }), ratio,
                    el('span', { class: 'ptx-hint', text: '增长×' }), growth
                ));
                pane.appendChild(el('div', { class: 'ptx-row' }, el('label', { text: '留言' }), msgIn));
                pane.appendChild(el('div', { class: 'ptx-row' },
                    el('label', { text: '单批/重试' }), stepIn, optIn, retryIn,
                    el('span', { class: 'ptx-hint', text: '↑单批 ↑option' })
                ));
                pane.appendChild(el('div', { class: 'ptx-row' }, dry, el('span', { text: '演练模式（默认勾选，只推算不发送）' })));
                pane.appendChild(bar);
                pane.appendChild(el('div', { class: 'ptx-row' }, el('button', { class: 'ptx-btn o', text: '解析预览', onclick: preview }), startBtn, stopBtn, copyBtn));
                pane.appendChild(status);
                pane.appendChild(result);
                pane.appendChild(el('div', { class: 'ptx-hint', text: '增量方式：固定=每批相同；递增=每批×增长倍数（封顶 8×）；余额上限=按比例吃掉当前魔力值再分批。U2 按其 305s 节流自动等待。' }));
            });
        }

        return { init: init };
    })();

    /* ----------------------------------------------------------------------
     * 5.5 自动感谢
     * -------------------------------------------------------------------- */
    const Thanks = (function () {
        function btn() {
            const map = { 'totheglory.im': '#ajaxthanks', 'hdwing.com': '#thanksbutton', 'hdsky.me': '#saythanks' };
            for (const h in map) if (hostMatch([h])) { const b = $(map[h]); if (b) return b; }
            return $('#saythanks') || $('#ajaxthanks') || $('#thanksbutton') ||
                $('a[href*="thanks"]') || $('button[name="thanks"]') || $('input[value*="感谢"]');
        }

        // 有些站点用 span/a 伪装按钮，统一取可点击节点
        function clickable(b) {
            if (!b) return null;
            if (b.tagName === 'A' || b.tagName === 'BUTTON' || b.tagName === 'INPUT') return b;
            const a = b.querySelector('a,button,input');
            return a || b;
        }

        async function run(retries) {
            retries = retries || 0;
            const b = clickable(btn());
            if (b && !b.disabled) {
                const key = 'thanks.' + location.pathname;
                if (store.get(key, false)) { UI.log('感谢：本页已感谢过，跳过', 'info'); return; }
                b.click();
                store.set(key, true);
                UI.log('感谢：已点击感谢按钮', 'ok');
                return;
            }
            if (retries < 30) { await sleep(200); return run(retries + 1); }
            UI.log('感谢：未找到可用按钮（该站可能不支持）', 'warn');
        }

        function init() {
            if (!needSign('自动感谢')) return;
            const auto = store.get('thanks.auto', true);
            if (auto) setTimeout(() => run(0), 600);
            UI.tab('thanks', '感谢', (pane) => {
                const cb = el('input', { type: 'checkbox' });
                cb.checked = auto;
                cb.onchange = () => store.set('thanks.auto', cb.checked);
                pane.appendChild(el('div', { class: 'ptx-row' }, cb, el('span', { text: '打开详情页自动感谢（默认开）' })));
                pane.appendChild(el('div', { class: 'ptx-row' },
                    el('button', { class: 'ptx-btn g', text: '立即感谢', onclick: () => run(0) }),
                    el('button', { class: 'ptx-btn', text: '清除本页记录', onclick: () => { store.set('thanks.' + location.pathname, false); UI.log('感谢：记录已清', 'warn'); } })
                ));
                pane.appendChild(el('div', { class: 'ptx-hint', text: '识别按钮：#ajaxthanks（TTG）/ #thanksbutton（HDWing）/ #saythanks（通用 NexusPHP）。' }));
            });
        }

        return { init: init, run: run };
    })();

    /* ----------------------------------------------------------------------
     * 5.6 无效邮件清理
     * -------------------------------------------------------------------- */
    const MailClean = (function () {
        const BAD = ['中奖通知', '获得道具'];

        function collectIds() {
            const ids = [];
            $$('form table td > a').forEach((a) => {
                const t = txt(a);
                if (!BAD.some((w) => t.indexOf(w) >= 0)) return;
                const href = a.getAttribute('href') || '';
                const m = /id=(\d+)/.exec(href);
                if (m) ids.push(m[1]);
            });
            return ids;
        }

        async function deleteIds(ids, dry) {
            if (!ids.length) return true;
            if (dry) { UI.log('[演练] 将删除 ' + ids.length + ' 封：' + ids.slice(0, 10).join(',') + (ids.length > 10 ? '…' : ''), 'info'); return true; }
            let body = 'action=moveordel&delete=' + encodeURIComponent('删除') + '&box=1';
            ids.forEach((id) => { body += '&messages%5B%5D=' + id; });
            const r = await http('POST', '/messages.php', body);
            if (r.status === 200) { UI.log('删除成功 ' + ids.length + ' 封', 'ok'); return true; }
            UI.log('删除失败（HTTP ' + r.status + '）', 'err');
            return false;
        }

        async function loop(dry, maxPages) {
            for (let i = 0; i < maxPages; i++) {
                const ids = collectIds();
                if (!ids.length) {
                    const page = parseInt(new URLSearchParams(location.search).get('page') || '1', 10);
                    UI.log('本页无匹配邮件，准备跳到第 ' + (page + 1) + ' 页（演练模式下不跳转）', 'info');
                    if (dry) return;
                    location.href = '?page=' + (page + 1);
                    return;
                }
                const ok = await deleteIds(ids, dry);
                if (dry || !ok) return;
                await sleep(600);
                location.reload();
                return;
            }
        }

        function init() {
            if (!/messages\.php/i.test(PAGE)) return;
            UI.tab('mail', '邮件', (pane) => {
                const dry = el('input', { type: 'checkbox' });
                dry.checked = true;
                const maxPages = el('input', { class: 'ptx-in', type: 'number', value: '5', style: { width: '64px' } });
                pane.appendChild(el('div', { class: 'ptx-hint', text: '清理关键词：' + BAD.join(' / ') + '（本页匹配 ' + collectIds().length + ' 封）' }));
                pane.appendChild(el('div', { class: 'ptx-row' }, dry, el('span', { text: '演练模式（只列不删）' })));
                pane.appendChild(el('div', { class: 'ptx-row' }, el('label', { text: '最大页数' }), maxPages));
                pane.appendChild(el('div', { class: 'ptx-row' },
                    el('button', {
                        class: 'ptx-btn g', text: '开始清理',
                        onclick: async (e) => {
                            if (!dry.checked && !needSign('删除邮件')) return;
                            e.target.disabled = true;
                            try { await loop(dry.checked, parseInt(maxPages.value, 10) || 5); }
                            finally { e.target.disabled = false; }
                        }
                    }),
                    el('button', { class: 'ptx-btn', text: '只扫描', onclick: () => UI.log('扫描到 ' + collectIds().length + ' 封可删邮件', 'info') })
                ));
                pane.appendChild(el('div', { class: 'ptx-hint', text: '删除后自动刷新；无匹配时自动翻页（演练模式不动作）。' }));
            });
        }

        return { init: init };
    })();

    /* ----------------------------------------------------------------------
     * 5.7 彩虹 ID
     * -------------------------------------------------------------------- */
    const Rainbow = (function () {
        const EN = ['彩', '虹'];
        function findName() {
            const cands = [
                '#info_block a[class$="Name"] b', '#info_block b span[class$="Name"]',
                '.userinfo a[class$="Name"] b', '#usermsglink a[class$="Name"] b',
                'a[class$="Name"] b'
            ];
            for (const s of cands) { const n = $(s); if (n && txt(n)) return n; }
            return null;
        }

        function apply() {
            if (store.get('rainbow.off', false)) return true;
            const node = findName();
            if (!node) return false;
            const name = txt(node);
            if (!name) return false;
            const target = node.tagName === 'B' ? node : (node.querySelector('b') || node);
            if (target.style.animation) return true; // 已应用
            addStyle('@keyframes ptxRainbow{0%{background-position:0 0}100%{background-position:-100% 0}}');
            const cls = (node.className || (node.parentElement && node.parentElement.className) || '').split(/\s+/).filter(Boolean)[0];
            const pool = cls ? $$('.' + cls.split(':')[0]) : [node];
            let hit = 0;
            pool.forEach((n) => {
                if (txt(n).indexOf(name) !== 0) return;
                const b = n.tagName === 'B' ? n : (n.querySelector('b') || n);
                b.style.backgroundImage = '-webkit-linear-gradient(left,#ff0000,#ffff00,#00ff00,#007fff,#00ff00,#ffff00,#ff0000)';
                b.style.webkitBackgroundClip = 'text';
                b.style.backgroundClip = 'text';
                b.style.color = 'transparent';
                b.style.backgroundSize = '200% 100%';
                b.style.animation = 'ptxRainbow 2s infinite linear';
                hit++;
            });
            UI.log('彩虹ID：已应用 ' + hit + ' 处', 'ok');
            return true;
        }

        function init() {
            setTimeout(function () {
                if (!apply()) return; // 页面上没有自己的 ID 就不挂监听
                let t = 0;
                document.addEventListener('DOMSubtreeModified', function () {
                    clearTimeout(t);
                    t = setTimeout(apply, 600);
                }, false);
            }, 800);

            UI.tab('rainbow', '彩虹', (pane) => {
                pane.appendChild(el('div', { class: 'ptx-hint', text: '给自己 ID 上彩虹渐变（装饰功能，不影响站点数据）' }));
                pane.appendChild(el('div', { class: 'ptx-row' },
                    el('button', { class: 'ptx-btn g', text: '立即应用', onclick: apply }),
                    el('button', {
                        class: 'ptx-btn', text: '关闭并还原',
                        onclick: () => {
                            store.set('rainbow.off', true);
                            const n = findName();
                            if (n) { const b = n.tagName === 'B' ? n : (n.querySelector('b') || n); b.style.cssText = ''; }
                            UI.log('彩虹ID：已关闭', 'warn');
                        }
                    }),
                    el('button', { class: 'ptx-btn', text: '重新开启', onclick: () => { store.set('rainbow.off', false); apply(); } })
                ));
            });
        }

        return { init: init };
    })();

    /* ----------------------------------------------------------------------
     * 5.8 种子过滤 + 查重下载
     * -------------------------------------------------------------------- */
    const Filter = (function () {
        // 站点级选择器覆盖（其余走自动识别）
        const SITE = {
            'pterclub.net': { list: '#torrenttable > tbody > tr', item: 'table.torrentname td:nth-child(1) a' },
            'hdchina.org': { list: '#form_torrent > table > tbody > tr', item: 'td.t_name h3 a' },
            'totheglory.im': { list: '#torrent_table > tbody > tr', item: 'div.name_left > a' },
            'hhanclub.top': { list: 'div.torrent-table-for-spider > div', item: 'div.torrent-title a' }
        };

        function cfg() {
            for (const h in SITE) if (hostMatch([h])) return SITE[h];
            return {
                list: 'table.torrents > tbody > tr',
                item: 'table.torrentname a[href*="details"], a[href*="details.php"]'
            };
        }

        function rows() {
            const c = cfg();
            let r = $$(c.list);
            if (!r.length) r = $$('table.torrents > tbody > tr');
            return r.filter((x) => x.cells ? x.cells.length > 3 : true);
        }

        function titleOf(row) {
            const a = row.querySelector(cfg().item);
            if (!a) return '';
            return (a.getAttribute('title') || txt(a)).trim();
        }

        function sizeCellOf(row) {
            if (row.cells) {
                for (let i = 0; i < row.cells.length; i++) {
                    if (/^\s*\d+(\.\d+)?\s*[KMGT]i?B\s*$/i.test(txt(row.cells[i]))) return row.cells[i];
                }
            }
            const elx = row.querySelector('.torrent-info-text-size');
            return elx || null;
        }

        function isSeeding(row) {
            return !!row.querySelector('img.progbargreen, .progbargreen, [title*="seeding"], [title*="做种"]');
        }
        function isDownloaded(row) {
            return !!row.querySelector('img.progbarred, img.progbaryellow, .progbarred, .progbaryellow, .progress, .torrents-progress');
        }

        function dlLink(row) {
            const a = row.querySelector('a[href*="download.php"], a[href*="downhash"], a[href*="passkey"], a[href*="download"]');
            if (!a) return '';
            const href = a.href || a.getAttribute('href') || '';
            return href.indexOf('http') === 0 ? href : location.origin + '/' + href.replace(/^\/+/, '');
        }

        function apply(vals) {
            let hidden = 0;
            rows().forEach((row) => {
                const title = titleOf(row);
                if (!title) return;
                const rowText = txt(row);
                let keep = true;

                const sizeCell = sizeCellOf(row);
                const gb = sizeCell ? sizeToGB(txt(sizeCell)) : 0;
                if (vals.minGB && gb < vals.minGB) keep = false;
                if (keep && vals.maxGB && gb > vals.maxGB) keep = false;

                const rNot = safeRe(vals.titleNot), rHas = safeRe(vals.titleHas);
                const dNot = safeRe(vals.descNot), dHas = safeRe(vals.descHas);
                if (keep && rNot && rNot.test(title)) keep = false;
                if (keep && rHas && !rHas.test(title)) keep = false;
                if (keep && dNot && dNot.test(rowText)) keep = false;
                if (keep && dHas && !dHas.test(rowText)) keep = false;

                if (keep && vals.noSeeding && isSeeding(row)) keep = false;
                if (keep && vals.noDownloaded && isDownloaded(row)) keep = false;
                if (keep && vals.needSub && !/中字|字幕|官字/.test(rowText)) keep = false;
                if (keep && vals.noMandarin && /国语|国配|双国/.test(rowText)) keep = false;

                row.style.display = keep ? '' : 'none';
                if (!keep) hidden++;
            });
            return hidden;
        }

        function copyLinks() {
            const out = [];
            rows().forEach((row) => {
                if (row.style.display === 'none') return;
                const u = dlLink(row);
                if (u) out.push(u);
            });
            if (!out.length) { UI.log('过滤：可见行中没有下载链接', 'warn'); return; }
            setClipboard(out.join('\n'));
            UI.log('过滤：已复制 ' + out.length + ' 条下载链接', 'ok');
        }

        function dupeUrl(which) {
            const base = store.get('dupe.base', 'http://192.168.5.10:6006');
            return base.replace(/\/+$/, '') + (which === 'download' ? '/api/v1/download/dupe_check_download' : '/api/v1/download/dupe_check');
        }

        async function dupe(row, download) {
            const title = titleOf(row);
            const sizeCell = sizeCellOf(row);
            const body = JSON.stringify({
                torname: title,
                subtitle: '',
                site: HOST.split('.').slice(-2)[0],
                info_link: (row.querySelector(cfg().item) || {}).href || '',
                download_link: dlLink(row),
                imdb_id: '',
                size_in_bytes: sizeCell ? sizeToBytes(txt(sizeCell)) : 0
            });
            const r = await http('POST', dupeUrl(download ? 'download' : 'check'), body, {
                'Content-Type': 'application/json',
                'X-API-Key': store.get('dupe.key', 'something')
            });
            if (r.status === 409) { row.style.backgroundColor = 'lightgray'; return 'dupe'; }
            if (r.status === 200 || r.status === 202) { row.style.backgroundColor = download ? 'darkseagreen' : 'LightBlue'; return 'ok'; }
            if (r.status === 400) { row.style.backgroundColor = 'darkturquoise'; return 'nodl'; }
            if (r.status === 404) { row.style.backgroundColor = 'lightpink'; return 'tmdb'; }
            row.style.backgroundColor = 'red';
            return 'error';
        }

        async function batchDupe(download) {
            if (!needSign(download ? '查重下载' : '查重')) return;
            let n = 0;
            for (const row of rows()) {
                if (row.style.display === 'none') continue;
                if (!titleOf(row)) continue;
                const st = await dupe(row, download);
                if (st === 'ok' || st === 'dupe') n++;
                UI.log((download ? '查&下' : '查重') + '：' + titleOf(row).slice(0, 30) + ' → ' + st, st === 'error' ? 'err' : 'info');
                await sleep(download ? 1500 : 150);
            }
            UI.log('批量查重完成，命中 ' + n + ' 行', 'ok');
        }

        function init() {
            if (!/torrents|browse|special|officialgroup/i.test(PAGE)) return;
            UI.tab('filter', '过滤', (pane) => {
                const mk = (id, w) => el('input', { class: 'ptx-in', id: id, style: { width: w || '64px' } });
                const titleNot = mk('ptx-f-tnot', '90px'), titleHas = mk('ptx-f-thas', '90px');
                const descNot = mk('ptx-f-dnot', '90px'), descHas = mk('ptx-f-dhas', '90px');
                const minGB = mk('ptx-f-min'), maxGB = mk('ptx-f-max');
                const needSub = el('input', { type: 'checkbox' });
                const noMandarin = el('input', { type: 'checkbox' });
                const noSeeding = el('input', { type: 'checkbox' });
                const noDownloaded = el('input', { type: 'checkbox' });

                const saved = store.get('filter.vals', null) || {};
                if (saved) {
                    titleNot.value = saved.titleNot || ''; titleHas.value = saved.titleHas || '';
                    descNot.value = saved.descNot || ''; descHas.value = saved.descHas || '';
                    minGB.value = saved.minGB || ''; maxGB.value = saved.maxGB || '';
                    needSub.checked = !!saved.needSub; noMandarin.checked = !!saved.noMandarin;
                    noSeeding.checked = !!saved.noSeeding; noDownloaded.checked = !!saved.noDownloaded;
                }

                const read = () => ({
                    titleNot: titleNot.value.trim(), titleHas: titleHas.value.trim(),
                    descNot: descNot.value.trim(), descHas: descHas.value.trim(),
                    minGB: parseFloat(minGB.value) || 0, maxGB: parseFloat(maxGB.value) || 0,
                    needSub: needSub.checked, noMandarin: noMandarin.checked,
                    noSeeding: noSeeding.checked, noDownloaded: noDownloaded.checked
                });

                const box = el('div', { class: 'ptx-row' },
                    el('label', { text: '标题不含' }), titleNot,
                    el('label', { text: '标题含' }), titleHas
                );
                const box2 = el('div', { class: 'ptx-row' },
                    el('label', { text: '描述不含' }), descNot,
                    el('label', { text: '描述含' }), descHas
                );
                const box3 = el('div', { class: 'ptx-row' },
                    el('label', { text: '大小GB' }), minGB, el('span', { text: '-', class: 'ptx-hint' }), maxGB
                );
                const box4 = el('div', { class: 'ptx-row' },
                    needSub, el('span', { text: '有中字' }),
                    noMandarin, el('span', { text: '无国语' }),
                    noSeeding, el('span', { text: '未作种' }),
                    noDownloaded, el('span', { text: '未曾下' })
                );

                const log = el('div', { class: 'ptx-hint', id: 'ptx-f-msg' });
                pane.appendChild(box); pane.appendChild(box2); pane.appendChild(box3); pane.appendChild(box4);
                pane.appendChild(el('div', { class: 'ptx-row' },
                    el('button', {
                        class: 'ptx-btn g', text: '过滤',
                        onclick: () => {
                            const v = read();
                            store.set('filter.vals', v);
                            const h = apply(v);
                            log.textContent = '已过滤 ' + h + ' 行 / 共 ' + rows().length + ' 行';
                            UI.log('过滤：隐藏 ' + h + ' 行', 'ok');
                        }
                    }),
                    el('button', { class: 'ptx-btn', text: '重置', onclick: () => { rows().forEach((r) => { r.style.display = ''; }); log.textContent = '已重置'; } }),
                    el('button', { class: 'ptx-btn o', text: '复制链接', onclick: copyLinks }),
                    el('button', { class: 'ptx-btn', text: '仅查重', onclick: () => batchDupe(false) }),
                    el('button', { class: 'ptx-btn r', text: '查&下', onclick: () => batchDupe(true) })
                ));
                pane.appendChild(log);
                pane.appendChild(el('div', { class: 'ptx-hint', text: '查重服务：' + dupeUrl('check') + '（在“设置”标签可改）' }));
            });

            UI.tab('filtercfg', '设置', (pane) => {
                const base = el('input', { class: 'ptx-in', value: store.get('dupe.base', 'http://192.168.5.10:6006'), style: { flex: '1' } });
                const key = el('input', { class: 'ptx-in', value: store.get('dupe.key', 'something'), style: { width: '96px' } });
                pane.appendChild(el('div', { class: 'ptx-hint', text: '查重 / 查&下 API（本地 torll 等服务）' }));
                pane.appendChild(el('div', { class: 'ptx-row' }, el('label', { text: '服务地址' }), base));
                pane.appendChild(el('div', { class: 'ptx-row' }, el('label', { text: 'X-API-Key' }), key));
                pane.appendChild(el('div', { class: 'ptx-row' },
                    el('button', {
                        class: 'ptx-btn g', text: '保存',
                        onclick: () => {
                            store.set('dupe.base', base.value.trim().replace(/\/+$/, ''));
                            store.set('dupe.key', key.value.trim());
                            UI.log('设置：查重服务已保存', 'ok');
                        }
                    })
                ));
            });
        }

        return { init: init };
    })();

    /* ----------------------------------------------------------------------
     * 5.9 做种隐藏 / 链接拷贝
     * -------------------------------------------------------------------- */
    const SeedTools = (function () {
        function table() { return $('table.torrents') || $('.torrents'); }

        function hideBusy() {
            const t = table();
            if (!t) return 0;
            let n = 0;
            Array.prototype.slice.call(t.rows).slice(1).forEach((row) => {
                const g = row.querySelector('.progbargreen');
                const dl = row.querySelector('.progbaryellow, .progbarrest');
                if (g || dl) { row.style.display = 'none'; n++; }
            });
            return n;
        }

        function showAll() {
            const t = table();
            if (!t) return;
            Array.prototype.slice.call(t.rows).slice(1).forEach((r) => { r.style.display = ''; });
        }

        function allLinks() {
            const t = table();
            if (!t) return [];
            const out = [];
            Array.prototype.slice.call(t.rows).slice(1).forEach((row) => {
                if (row.style.display === 'none') return;
                const a = row.querySelector('a > img.download, a[href*="download.php"]');
                if (!a) return;
                const href = (a.closest('a') || a).href;
                if (href) out.push(href);
            });
            return out;
        }

        function init() {
            if (!/torrents/i.test(PAGE)) return;
            const auto = store.get('seeds.auto', false);
            if (auto) setTimeout(() => hideBusy(), 500);

            UI.tab('seeds', '做种', (pane) => {
                const cb = el('input', { type: 'checkbox' });
                cb.checked = auto;
                cb.onchange = () => store.set('seeds.auto', cb.checked);
                pane.appendChild(el('div', { class: 'ptx-row' }, cb, el('span', { text: '打开列表页自动隐藏做种/下载中' })));
                pane.appendChild(el('div', { class: 'ptx-row' },
                    el('button', { class: 'ptx-btn g', text: '隐藏做种/下载中', onclick: () => { UI.log('隐藏 ' + hideBusy() + ' 行', 'ok'); } }),
                    el('button', { class: 'ptx-btn', text: '全部显示', onclick: showAll }),
                    el('button', {
                        class: 'ptx-btn o', text: '复制可见种子链接',
                        onclick: () => {
                            const l = allLinks();
                            if (!l.length) { UI.log('未找到种子链接', 'warn'); return; }
                            setClipboard(l.join('\n'));
                            UI.log('已复制 ' + l.length + ' 条种子链接', 'ok');
                        }
                    })
                ));
                pane.appendChild(el('div', { class: 'ptx-hint', text: '依据 .progbargreen（做种中）与 .progbaryellow/.progbarrest（下载中）判断。' }));
            });
        }

        return { init: init };
    })();

    /* ----------------------------------------------------------------------
     * 5.10 娱乐：摇奖 / 刮刮乐
     * -------------------------------------------------------------------- */
    const Fun = (function () {
        let stopFlag = false;

        async function slot(cfg) {
            const bonusEl = document.getElementsByClassName('bg-white font-semibold')[0];
            const cur = bonusEl ? parseFloat(bonusEl.innerText.replace(/,/g, '')) || 0 : 0;
            let rounds = Math.floor(cur / 1000);
            if (cfg.count > 0) rounds = Math.min(rounds, cfg.count);
            const map = new Map();
            UI.log('摇奖：余额约 ' + cur + '，计划 ' + rounds + ' 次', 'info');
            for (let i = 0; i < rounds && !stopFlag; i++) {
                if (!needSign('摇奖')) break;
                let t = '';
                try {
                    t = (await http('GET', '/slot.php?get=result')).responseText;
                } catch (e) { UI.log('摇奖：请求异常', 'err'); break; }
                if (t.indexOf('错误') >= 0 || t.indexOf('出错') >= 0) { UI.log('摇奖：站点返回错误，停止', 'err'); break; }
                try {
                    const j = JSON.parse(t);
                    const key = j.prize.type === 'nothing' ? 'nothing' : (j.prize.type + ':' + j.prize.content);
                    map.set(key, (map.get(key) || 0) + 1);
                } catch (e) { UI.log('摇奖：响应解析失败', 'err'); }
                if (i % 10 === 0) UI.log('摇奖进度 ' + (i + 1) + '/' + rounds, 'info');
                await sleep(rnd(5, 40));
            }
            const out = Array.from(map).sort((a, b) => b[1] - a[1]).map((x) => x[0] + ' ×' + x[1]).join('\n');
            UI.log('摇奖结果：\n' + (out || '无'), 'ok');
        }

        async function lottery(cfg) {
            const form = $('div > div > form');
            if (!form) { UI.log('刮刮乐：未找到票根表单', 'warn'); return; }
            const action = form.getAttribute('action') || '';
            const set = (action.match(/set=(\d+)/) || [])[1] || '01';
            const input = form.querySelector('input');
            const data = input ? input.name + '=' + encodeURIComponent(input.value) : '';
            const stopAt = { '01': 13, '02': 20, '03': 20, '04': 26, '05': 30, '06': 38, '07': 20 }[set] || 20;
            let n = 0;
            for (let i = 0; i < cfg.times && !stopFlag; i++) {
                if (!needSign('刮刮乐')) break;
                try {
                    await http('POST', '/dolottery.php?set=' + set, data + '&' + data);
                    await sleep(rnd(700, 1000));
                    const page = (await http('GET', '/lottery.php?action=page' + set)).responseText;
                    if (page.indexOf('错误') >= 0) { UI.log('刮刮乐：站点报错，停止', 'err'); break; }
                    n++;
                } catch (e) { UI.log('刮刮乐：异常中断', 'err'); break; }
                if (i % 5 === 0) UI.log('刮刮乐进度 ' + (i + 1) + '/' + cfg.times, 'info');
                await sleep(rnd(700, 1000));
            }
            UI.log('刮刮乐结束：本页第 ' + set + ' 组，执行 ' + n + ' 次，停止阈值卡片数 ' + stopAt, 'ok');
        }

        function init() {
            if (!hostMatch(['pterclub.com'])) return;
            const isSlot = /slot/i.test(PAGE);
            const isLottery = /lottery/i.test(PAGE);
            if (!isSlot && !isLottery) return;

            UI.tab('fun', '娱乐', (pane) => {
                if (isSlot) {
                    const cnt = el('input', { class: 'ptx-in', type: 'number', value: '100', style: { width: '80px' } });
                    pane.appendChild(el('div', { class: 'ptx-hint', text: '摇摇乐：按余额/1000 与设定次数取较小值' }));
                    pane.appendChild(el('div', { class: 'ptx-row' }, el('label', { text: '最大次数' }), cnt));
                    pane.appendChild(el('div', { class: 'ptx-row' },
                        el('button', { class: 'ptx-btn g', text: '开始摇', onclick: () => { stopFlag = false; slot({ count: parseInt(cnt.value, 10) || 0 }); } }),
                        el('button', { class: 'ptx-btn r', text: '停止', onclick: () => { stopFlag = true; UI.log('摇奖：已请求停止', 'warn'); } })
                    ));
                }
                if (isLottery) {
                    const times = el('input', { class: 'ptx-in', type: 'number', value: '100', style: { width: '80px' } });
                    pane.appendChild(el('div', { class: 'ptx-hint', text: '刮刮乐：每次刮奖后读取卡片进度，达阈值会提示' }));
                    pane.appendChild(el('div', { class: 'ptx-row' }, el('label', { text: '次数' }), times));
                    pane.appendChild(el('div', { class: 'ptx-row' },
                        el('button', { class: 'ptx-btn g', text: '开始刮', onclick: () => { stopFlag = false; lottery({ times: parseInt(times.value, 10) || 100 }); } }),
                        el('button', { class: 'ptx-btn r', text: '停止', onclick: () => { stopFlag = true; UI.log('刮刮乐：已请求停止', 'warn'); } })
                    ));
                }
            });
        }

        return { init: init };
    })();

    /* ----------------------------------------------------------------------
     * 5.11 自检面板（署名检测结果）
     * -------------------------------------------------------------------- */
    function initGuardTab() {
        UI.tab('guard', '署名', (pane) => {
            const box = el('div');
            const render = () => {
                box.textContent = '';
                const r = Guard.run();
                box.appendChild(el('div', {
                    class: 'ptx-row',
                    html: '署名：<b>' + SIGN + '</b> <span class="ptx-badge">v' + PTX.VERSION + '</span>'
                }));
                const tb = el('table', { class: 'ptx-tb' });
                tb.appendChild(el('tr', {}, el('th', { text: '检查项' }), el('th', { text: '结果' }), el('th', { text: '说明' })));
                Guard.checks.forEach((c) => {
                    tb.appendChild(el('tr', {},
                        el('td', { text: c.name }),
                        el('td', { class: c.pass ? 'ptx-ok' : 'ptx-bad', text: c.pass ? '通过' : '失败' }),
                        el('td', { text: String(c.detail || '') })
                    ));
                });
                box.appendChild(tb);
                if (r) box.appendChild(el('div', { class: 'ptx-hint ptx-ok', text: '自检通过：写操作已解锁' }));
                else box.appendChild(el('div', { class: 'ptx-hint ptx-bad', text: '自检失败：' + Guard.reasons.join('；') + '（写操作已锁定）' }));
                UI.refreshLock();
            };
            pane.appendChild(box);
            pane.appendChild(el('div', { class: 'ptx-row' },
                el('button', { class: 'ptx-btn g', text: '重新自检', onclick: render }),
                el('button', {
                    class: 'ptx-btn', text: '清空魔力参数',
                    onclick: () => {
                        store.set('bonus.' + HOST.split('.').slice(-2).join('.'), null);
                        UI.log('署名：已清空本站魔力参数缓存', 'warn');
                    }
                })
            ));
            if (!Guard.ok) {
                pane.appendChild(el('div', {
                    class: 'ptx-row',
                    onclick: () => {
                        Guard.override = true;
                        UI.locked = false;
                        UI.refreshLock();
                        UI.log('署名：已临时解锁（仅本次会话，刷新页面后恢复校验）｜' + SIGN, 'warn');
                    }
                }, el('button', { class: 'ptx-btn o', text: '本次会话临时解锁' })));
                pane.appendChild(el('div', { class: 'ptx-hint', text: '仅当你确认是管理器未暴露元数据导致的误判时使用；解锁记录会写入控制台。' }));
            }
            render();
        });
    }

    /* ======================================================================
     * 6. 模块注册表
     * ==================================================================== */
    const hasKa1 = () => !!document.getElementById('ka1');
    const isUserdetails = () => /userdetails/i.test(PAGE);
    const isTorrents = () => /torrents|browse|special|officialgroup|torrent-table/i.test(PAGE);

    module('bonus', '魔力计算', () => isTorrents() || isUserdetails() || /mybonus|\/bonus|ucoin/i.test(PAGE) || hasKa1(), () => Bonus.init());
    module('claim', '认领/保种', () => isUserdetails() || isTorrents() || PAGE.indexOf('getusertorrentlist') >= 0, () => Claim.init());
    module('official', '官组统计', () => isUserdetails() || PAGE.indexOf('getusertorrentlist') >= 0, () => OfficialStats.init());
    module('gift', '送魔力', () => /mybonus|ucoin|mpshop/i.test(PAGE), () => Gift.init());
    module('thanks', '自动感谢', () => /details\.php|plugin_details|totheglory\.im\/t\//i.test(PAGE), () => Thanks.init());
    module('mail', '邮件清理', () => /messages\.php/i.test(PAGE), () => MailClean.init());
    module('rainbow', '彩虹ID', () => true, () => Rainbow.init());
    module('filter', '种子过滤', () => isTorrents(), () => Filter.init());
    module('seeds', '做种工具', () => isTorrents(), () => SeedTools.init());
    module('fun', '娱乐', () => /slot|lottery/i.test(PAGE), () => Fun.init());
    module('guard', '署名', () => true, () => initGuardTab());

    /* ======================================================================
     * 7. 启动
     * ==================================================================== */
    function boot() {
        console.log(LOGTAG, '启动 v' + PTX.VERSION + ' @ ' + HOST + PAGE);
        try { Guard.run(); } catch (e) { console.error(LOGTAG, '自检异常', e); }

        MODULES.forEach((m) => {
            try {
                if (!m.when()) return;
                m.init();
            } catch (e) {
                console.error(LOGTAG, '模块异常 ' + m.id, e);
            }
        });

        try { UI.mount(); } catch (e) { console.error(LOGTAG, '面板挂载失败', e); }

        // 页面局部刷新（PJAX / Turbo）时重扫
        let lastUrl = location.href;
        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                console.log(LOGTAG, 'URL 变化，重新自检');
                try { Guard.run(); } catch (e) { /* ignore */ }
            }
        }, 1500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})();
