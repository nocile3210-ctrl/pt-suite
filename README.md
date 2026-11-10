# PT多功能整合增强版 · 嘴贱招来九尾妖狐

把 14 个零散 PT 站点脚本合成**一个** Tampermonkey 用户脚本：统一内核、统一面板、统一署名自检。

- 主文件：[`pt-suite.user.js`](pt-suite.user.js)（单文件，零外部依赖）
- 版本：3.1.0
- 署名：**嘴贱招来九尾妖狐**（内置检测，见第 4 节）

## 安装

1. 装 Tampermonkey（Edge/Chrome/Firefox 均可）。
2. 打开本仓库的 raw 链接，管理器会直接弹出安装页：

```
https://raw.githubusercontent.com/nocile3210-ctrl/pt-suite/main/pt-suite.user.js
```

3. 也可以下载 `pt-suite.user.js` → 管理器「添加新脚本」→ 全选粘贴 → 保存。

装完打开任一 PT 站点，右下角会出现 `PT` 悬浮球。

---

## 1. 合并映射（14 → 11 模块）

| # | 原脚本 | 合并后模块 | 面板页签 | 触发页面 |
|---|---|---|---|---|
| 1 | PT站点魔力计算器 2.2.4 | 魔力计算 | 魔力 | torrents / mybonus / userdetails |
| 2 | PT站点魔力计算器-细分标色 2.0.9 | 魔力计算（颜色分级并入） | 魔力 | 同上 |
| 3 | PT保种认领合集 1.2.0 | 认领 / 保种统计 | 认领 | userdetails / getusertorrentlist / torrents |
| 4 | 保种和认领分析 0.5.1 | 认领（官种判定、分页抓取并入） | 认领 | userdetails |
| 5 | 官种保种统计 0.16.9 | 官组统计 | 官组 | userdetails / getusertorrentlist |
| 6 | PT批量送魔力 0.3.1 | 送魔力（批量增量） | 送魔力 | mybonus / ucoin / mpshop |
| 7 | 个人自用PT批量送魔力-全能美化版 0.5.0 | 送魔力（UI/重试/演练并入） | 送魔力 | 同上 |
| 8 | PT站自动感谢 | 自动感谢 | 感谢 | details / plugin_details / TTG t/* |
| 9 | PT站删除无效邮件 0.1 | 邮件清理 | 邮件 | messages.php |
| 10 | PT动态彩虹ID 1.0 | 彩虹ID | 彩虹 | 全站 |
| 11 | 隐藏认领已满 1.0 | 认领（隐藏已满并入） | 认领 | torrents |
| 12 | 种子列表过滤 1.9.8 | 种子过滤 + 查重 | 过滤 / 设置 | torrents / browse / special |
| 13 | 猫站_隐藏做种,下载中 0.1 | 做种工具 | 做种 | torrents |
| 14 | 猫站娱乐助手 0.4 | 娱乐 | 娱乐 | slot / lottery |

另外内置第 12 个页签 **署名**：署名自检面板。

---

## 2. 相对原脚本的增强

**架构**
- 单内核 + 模块注册表（`module(id, name, when, init)`）：按页面类型自动装载，互不干扰。
- 统一 UI：右下角 `PT` 悬浮球 → 可拖动面板，页签式，内置日志区；不再每个脚本各弹一套控件。
- 统一 HTTP 层：`GM.xmlHttpRequest` 优先，30s 硬超时兜底（管理器回调丢失不会永久挂起），自动带 `X-Requested-With`。
- 统一尺寸解析：`KiB/MiB/GiB/TiB`、千分位逗号、纯字节，全站一致。
- **去掉了全部 `@require`**（jQuery / echarts / Toastify / crypto-js）：B–A 曲线改为 canvas 手绘，M-Team 签名接口改为页面解析 + 手动填参，装完即用、离线可用。

**功能**
- 魔力：A / A@GB 双列 + 颜色分级 + **点表头三态排序**；有「时魔」时自动切换为增量口径（ΔB、ΔB/GB）；无 `img.time` 的做种表按日期列自动推断时间列；支持 5 套站点公式（NexusPHP / Audiences / HDArea v2 / HDSky / HHANClub 跳过）。
- 认领：全站分页抓取 + 关键词 + 最小体积 + 仅官种过滤；4 类站点适配器（SSK `adopt.php`、猫站 `claim`、观众 `claim.php`、通用 `ajax.php addClaim`）；预览高亮、保种统计、隐藏已满。
- 官组：28 个站点配置，按官组 / 做种人数分级出表，当前页与全部分页两种口径，自动去重。
- 送魔力（**批量增量**）：多收件人一次提交，每行 `用户名 [数量]`；三种增量方式 —— 固定步进 / 递增步进（每批 ×倍数，封顶 8×）/ 余额上限（按比例吃掉当前魔力值，显式额度优先、其余平分）；自动探测站点 `option`、单批上限与可用余额，未收录站点走通用 NexusPHP 并可手填；每批失败自动重试（余额/上限类错误立即停），进度条 + 每人结果表 + 一键复制结果，默认演练。
- 自动感谢：按站点选择器兜底链，同一详情页只点一次（持久化去重）。
- 邮件清理：关键词匹配 + 批量 POST + 自动翻页，**默认演练**（只列不删）。
- 过滤：`有中字 / 无国语 / 未作种 / 未曾下 / 标题含不含 / 描述含不含 / 大小区间`，选择器自动识别（无需逐个站点写死），过滤后「复制链接」只取可见行；查重/查&下对接本地 API（地址与 Key 可在「设置」页签改）。
- 做种工具：隐藏做种中/下载中、全部恢复、复制可见种子链接。
- 娱乐：摇奖按余额/1000 与设定次数取小，带结果汇总；刮刮乐按票根分组、卡片阈值提示、随机抖动；均可中途停止。

---

## 3. 使用

1. Tampermonkey → 新建脚本 → 粘贴 `PT多功能整合增强版.user.js` 全文 → 保存。
2. 打开任一 PT 站点，右下角出现 `PT` 圆球；点开即面板，页签按当前页面自动裁剪。
3. `mybonus` 页首次打开会自动解析 `T0/N0/B0/L` 并写入存储；之后 torrents 列表页自动出 A 列。解析失败可在「魔力」页签手填后保存。
4. 会改账号状态的动作（认领 / 送魔力 / 感谢 / 邮件删除 / 查重下载 / 摇奖刮奖）都过署名闸门；署名不通过时按钮直接拦截并写日志。

### 3.1 批量增量送魔力怎么用

1. 打开站点 `mybonus.php`（U2 为 `mpshop.php`），面板切到「送魔力」。
2. 顶部会自动探测：站点名、`option`（魔力值类型索引）、单批上限、当前魔力值；探测不对就直接在下面 `单批 / option` 两个输入框里改。
3. 「收件人」框每行一个，格式：

```
Alice 10000
Bob 2500
Carol
# 井号开头是注释；只写用户名时用「默认额度」
```

分隔符支持空格 / 逗号 / 冒号 / 等号 / 制表符。

4. 「增量方式」三选一：
   - **固定步进**：每批都是「单批上限」那么多，直到凑满额度（原脚本行为，但不再是 setInterval 乱飘）。
   - **递增步进**：每批 ×「增长倍数」（默认 1.5，封顶 8×）。单批 2000、目标 20000 时拆成 `2000+3000+4500+6750+3750` 共 5 批。
   - **余额上限**：按「余额比例%」算出可送总量，显式写了数量的照办，其余按人数平分；例如余额 123456、比例 50%、Alice 写 50000 + 3 个没写数量的人 → Alice 50000，其余每人 3909。
5. 先点「**解析预览**」看每个人的分批明细（这一步不发请求），确认无误后取消「演练模式」再点「开始批量」。
6. 过程中进度条 + 每人结果表；失败会按「重试次数」重试，遇到余额不足/超上限立即停。结束后「复制结果」可把汇总贴到别处。

---

## 4. 署名自检：嘴贱招来九尾妖狐

### 4.1 三段校验

| 校验项 | 做法 | 失败含义 |
|---|---|---|
| 署名指纹 | 首部把署名存成**字符码分片** `[22068,36145,…]`，运行时拼回；再对 `署名|锚点|版本` 做 FNV-1a 32 位摘要，与常量 `SIG_DIGEST` 比对 | 有人改了分片（换署名 / 去署名）→ 摘要不符 |
| 署名文本 | 拼回结果必须是 8 字的 `嘴贱招来九尾妖狐` | 分片被换成别的内容 |
| 元数据署名 | 读 `GM_info.script` 的 `name/namespace/author/description`，必须仍含「九尾妖狐」（管理器不暴露 GM_info 时跳过，不误杀） | 脚本头被改名去署名 |
| DOM 水印 | 左下角固定角标 `嘴贱招来九尾妖狐`（`#ptx-sign-mark` / `data-ptx-sig`），`MutationObserver` 监听移除并补回 | 水印被删；连续删 3 次 → 锁定 |

### 4.2 锁定行为

- 面板标题变 `PT套件 · 嘴贱招来九尾妖狐 · 已锁定`，外框变红。
- 写操作全部拦截，日志给出原因（例如：`⛔ 署名校验失败，已拦截：批量认领｜署名指纹不匹配（代码分片被改写）`）。
- 只读/装饰模块（统计、过滤、魔力计算、彩虹）不受影响——避免误判把工具整个废掉。
- 每次启动、以及 URL 变化（PJAX/局部刷新）都会重新自检；「署名」页签可随时手动重跑并看到逐项结果。
- **临时解锁**：「署名」页签提供「本次会话临时解锁」按钮，用于管理器不暴露 `GM_info` 的误判场景；点过之后写操作放行，但刷新页面 / 触发重检即恢复校验，并在日志与控制台留痕。

### 4.3 自己改署名怎么办

同时改三处，否则自检必然失败：

1. `SIG_PARTS` 字符码数组；
2. `Guard.checkText()` 里的期望字面量；
3. `SIG_DIGEST` —— 用脚本内同款算法重算：

```js
// 在浏览器控制台或 node 里跑
const SIGN = String.fromCharCode(...新分片);
const seed = SIGN + '|PTX-9T-ANCHOR|3.0.0';
let h = 0x811c9dc5;
for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
console.log(('00000000' + h.toString(16)).slice(-8)); // 填回 SIG_DIGEST
```

（改版本号也要重算，因为版本号参与摘要。）

---

## 5. 站点适配速查

| 能力 | 适配方式 |
|---|---|
| 魔力参数 | 页面文本解析 `T0/N0/B0/L/A`，或手动填 |
| 认领 | SSK `adopt.php` / 猫站 `.claim-confirm[data-url]` / 观众 `claim.php` / 通用 `ajax.php addClaim` |
| 官组 | 28 站配置表（见脚本 `OfficialStats.SITES`），可自行加行 |
| 送魔力 | 站点表（option / 单批上限 / 间隔），U2 走 305s 节流 |
| 感谢 | `#ajaxthanks` / `#thanksbutton` / `#saythanks` → 宽松兜底 |
| 过滤 / 做种 | 结构自动识别（`table.torrents` + `.progbar*`），少写死站点选择器 |

---

## 6. 已知限制

- **M-Team 列表页**（`kp.m-team.cc`）为 React 表格，魔力列注入不保证；公式层面已单独列为跳过项，避免出错误数字。
- **HHANClub** 魔力页未给出完整公式参数，脚本明确跳过单种 A 值而不是瞎算。
- 做种表若既无 `img.size` 也无文本表头、且数据行无体积文本，列推断会失败并写 warn 日志（不会硬塞错列）。
- 查重 API 默认指向 `http://192.168.5.10:6006`（原脚本的值），不改就是「本地服务未开」状态，按钮会报错但不会破坏页面。
- 娱乐模块只对猫站生效（原脚本即如此）。

---

## 7. 自测记录（jsdom 无头验证）

| 场景 | 结果 |
|---|---|
| torrents（hdsky / pterclub / pterclub.net / hhanclub / springsunday） | 启动无异常，A 列注入 2 行，7 页签 |
| userdetails + 预设参数 | 列注入成功（7→9 列），官组统计出表（15.88 GB） |
| mybonus | 解析 `T0/N0/B0/L` 成功并落库 |
| details | 自动感谢点击 1 次、二次运行去重；彩虹 ID 生效 |
| messages | 演练模式识别 2 封可删邮件 |
| slot / lottery | 页签正确，无异常 |
| 批量增量送魔力（固定） | Alice 30000 + Bob 5000 → 3 批（20000+10000、5000），payload `username=…&bonusgift=…&option=13` 正确 |
| 批量增量送魔力（递增） | 单批 2000 / 目标 20000 → 5 批 `2000+3000+4500+6750+3750` |
| 批量增量送魔力（余额） | 余额 123456 / 比例 50% / Alice 显式 50000 → 其余 3 人各 3909，合计 61727 |
| 篡改 `SIG_DIGEST` | `locked=true`，感谢页签消失，写操作被拦截 |

---

## 8. 仓库结构与维护

```
pt-suite/
├─ pt-suite.user.js              # 主脚本（唯一产物，直接装这个）
├─ feature-map.xlsx              # 14 脚本 → 模块 → 能力映射 / 增强点 / 署名说明
├─ README.md
├─ CHANGELOG.md
├─ LICENSE                       # MIT
├─ .githooks/pre-commit          # 提交前自动跑语法 + 署名自检（hooksPath 已启用）
├─ docs/ci-verify.yml            # GitHub Actions 模板，见下方「启用 CI」
├─ tools/
│  ├─ bump.mjs                   # 升版本 + 重算署名摘要（一条命令）
│  ├─ verify-sign.mjs            # 署名自检（CI 与本地都能跑）
│  └─ build-feature-map.py       # 重新生成 feature-map.xlsx
└─ .gitattributes                # 强制 .user.js 使用 LF
```

### 启用 CI（可选）

往 `.github/workflows/` 推文件需要 token 带 `workflow` 权限，`gh auth login` 默认不含。要开自动化校验：

```bash
gh auth refresh -h github.com -s workflow            # 补授权，会再走一次设备码
mkdir -p .github/workflows
cp docs/ci-verify.yml .github/workflows/verify.yml
git add -A && git commit -m "ci: enable verify workflow" && git push
```

不开也不影响使用：本地 `.githooks/pre-commit` 已经拦住「语法错」和「改了版本没重算摘要」两种情况。


### 日常改动流程

```bash
# 1. 改 pt-suite.user.js
# 2. 升版本（必须！它会重算 SIG_DIGEST，手动改版本会导致自检锁定）
node tools/bump.mjs 3.1.1
# 3. 本地自检
node tools/verify-sign.mjs && node --check pt-suite.user.js
# 4. 提交
git add -A && git commit -m "feat: xxx" && git push
```

> **为什么版本要靠脚本改**：`SIG_DIGEST` 是对 `署名|锚点|版本` 的 FNV-1a 摘要，手改 `@version` 而不重算，装到浏览器就会判定「署名被篡改」并锁定写操作，同时 CI 也会红。

### 其他命令

```bash
node tools/bump.mjs 4.0.0                       # 大版本
python tools/build-feature-map.py               # 需要 openpyxl
git tag v3.1.0 && git push --tags               # 打标签发版
```

