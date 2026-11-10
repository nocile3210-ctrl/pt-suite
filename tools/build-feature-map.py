# -*- coding: utf-8 -*-
"""生成 PT 整合脚本的功能对照表 (xlsx)。"""
import os
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "feature-map.xlsx")

HEAD_FILL = PatternFill("solid", fgColor="1E1E2E")
HEAD_FONT = Font(color="FFFFFF", bold=True, size=11)
ALT_FILL = PatternFill("solid", fgColor="F2F2F7")
THIN = Side(style="thin", color="C8C8CE")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
WRAP = Alignment(wrap_text=True, vertical="top")

rows = [
    (1, "PT站点魔力计算器", "2.2.4 / neoblackxt,LaneLau", "魔力计算", "魔力",
     "torrents / mybonus / userdetails",
     "A 值、A@GB 列，B-A 曲线，时魔增量，5 套站点公式",
     "去 jQuery/echarts/crypto-js 依赖；canvas 自绘曲线；点表头三态排序；无 img.time 时按日期列推断"),
    (2, "PT站点魔力计算器-细分标色", "2.0.9 / neoblackxt,LaneLau", "魔力计算", "魔力",
     "torrents / mybonus / search", "A/GB 颜色分级标色",
     "分级阈值并入统一渲染；时魔口径独立阈值"),
    (3, "PT保种认领合集", "1.2.0 / 合并版", "认领 / 保种统计", "认领",
     "userdetails / getusertorrentlist / torrents",
     "全分页认领、关键词与体积筛选、预览高亮、保种统计、隐藏已满",
     "站点适配器合并为 4 类；统计加官种口径；缓存与并发请求去重"),
    (4, "保种和认领分析", "0.5.1 / ootruieo", "认领（官种判定）", "认领",
     "userdetails", "官种正则判定、分页抓取、做种分级统计",
     "官种正则并入配置表；分页抓取统一走 http 层"),
    (5, "官种保种统计", "0.16.9 / ccf2012", "官组统计", "官组",
     "userdetails / getusertorrentlist",
     "28 站官组统计、做种人数分级、分月发种统计",
     "选择器改为列结构自动识别；支持当前页/全部页两种口径；去重复行"),
    (6, "PT批量送魔力", "0.3.1 / XGCM", "送魔力（批量增量）", "送魔力",
     "mybonus / ucoin / mpshop",
     "多收件人批量、分段增量（固定/递增/余额上限）、option 与单批上限自动探测、失败重试、演练、结果汇总",
     "重写为批量增量引擎：多目标解析、三种增量模式、探测站点参数与余额、每批重试、每人结果表可复制"),
    (7, "个人自用PT批量送魔力-全能美化版", "0.5.0 / XGCM,Gemini", "送魔力（UI/重试/演练并入）", "送魔力",
     "mybonus / ucoin", "现代 UI、循环发送、错误中止",
     "UI 并入统一面板；错误信息解析复用；去掉 GM_addElement 依赖"),
    (8, "PT站自动感谢", "2025.2 / ※云※", "自动感谢", "感谢",
     "details / plugin_details / TTG t/*", "后台 AJAX 感谢，30 次重试",
     "扩展选择器兜底链；同页只点一次（持久化去重）；可开关"),
    (9, "PT站删除无效邮件", "0.1 / Pluto", "邮件清理", "邮件",
     "messages.php", "删除中奖通知/获得道具，自动翻页",
     "默认演练；关键词可扩展；翻页上限可设"),
    (10, "PT动态彩虹ID", "1.0 / 陶陶滔滔涛", "彩虹ID", "彩虹",
     "全站", "用户名彩虹渐变",
     "去 jQuery；按 class 池匹配同名节点；可关可还原"),
    (11, "隐藏认领已满", "1.0 / benz1", "认领（隐藏已满）", "认领",
     "torrents", "隐藏认领人数已满的种子行",
     "状态持久化；与做种隐藏互不干扰"),
    (12, "种子列表过滤", "1.9.8 / ccf2012", "种子过滤 + 查重", "过滤 / 设置",
     "torrents / browse / special / details",
     "中字/国语/作种/曾下/标题/描述/大小/评分过滤，复制链接，查重与查&下，认领列",
     "结构自动识别替代逐站选择器；安全正则防非法输入；API 地址与 Key 可在面板改"),
    (13, "猫站_隐藏做种,下载中", "0.1 / xiaoxiao", "做种工具", "做种",
     "torrents", "隐藏做种/下载中、复制全部种子链接、行内链接按钮",
     "去 GM_setClipboard 强制依赖；按 .progbar* 判定；支持恢复"),
    (14, "猫站娱乐助手", "0.4 / ootruieo", "娱乐", "娱乐",
     "slot / lottery", "一键摇奖、刮刮乐批量刮",
     "可中途停止；随机抖动；结果汇总；写操作过署名闸门"),
]

enh = [
    ("架构", "模块注册表 + 按页装载", "12 个模块各自声明 when()，互不影响；异常隔离，单模块报错不影响其它"),
    ("架构", "统一 UI 面板", "悬浮球 + 可拖动 + 页签 + 日志区，替代 14 套各弹各的按钮"),
    ("架构", "统一 HTTP 层", "GM.xmlHttpRequest 优先、30s 硬超时兜底、自动 X-Requested-With"),
    ("架构", "统一尺寸解析", "KiB/MiB/GiB/TiB、千分位、纯字节，全脚本共用一套"),
    ("架构", "零外部依赖", "移除 jQuery / echarts / Toastify / crypto-js 四个 @require"),
    ("署名", "三段自检", "字符码分片 + FNV-1a 摘要 + GM_info 元数据 + DOM 水印"),
    ("署名", "写操作闸门", "认领/送魔力/感谢/删邮件/查重下载/娱乐 全部过 needSign()"),
    ("署名", "水印自愈与锁定", "MutationObserver 补回角标；连续移除 3 次锁定"),
    ("署名", "自检面板", "「署名」页签显示逐项结果，可手动重跑；URL 变化自动重检"),
    ("健壮性", "请求超时兜底", "管理器回调丢失时 30s 拒绝，不永久挂起"),
    ("健壮性", "正则安全封装", "用户输入走 safeRe()，非法正则不抛异常"),
    ("健壮性", "列自动识别", "表头图标( img.size/img.seeders )与数据行文本双路推断"),
    ("功能", "批量增量送魔力", "多收件人一次提交（每行 `用户名 数量`）；固定步进 / 递增×1.5 / 余额比例三种增量；自动探测 option、单批上限、当前魔力值；每批重试（余额/上限类错误立即停）；每人结果表可一键复制"),
    ("体验", "演练模式", "送魔力与邮件删除支持 dry-run，先看流程再动真格"),
    ("体验", "进度与中断", "送魔力进度条、娱乐可停止、认领逐条日志"),
]

wb = Workbook()

# ---------- Sheet 1 ----------
ws = wb.active
ws.title = "合并映射"
headers = ["#", "原脚本", "版本 / 作者", "合并后模块", "面板页签", "触发页面", "核心能力", "本次增强"]
ws.append(headers)
for c in range(1, len(headers) + 1):
    cell = ws.cell(row=1, column=c)
    cell.fill = HEAD_FILL
    cell.font = HEAD_FONT
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    cell.border = BORDER

for r in rows:
    ws.append(list(r))

for i in range(2, ws.max_row + 1):
    for c in range(1, len(headers) + 1):
        cell = ws.cell(row=i, column=c)
        cell.alignment = WRAP
        cell.border = BORDER
        if i % 2 == 0:
            cell.fill = ALT_FILL
    ws.cell(row=i, column=1).alignment = Alignment(horizontal="center", vertical="top")

widths = [4, 30, 24, 18, 12, 30, 44, 52]
for i, w in enumerate(widths, start=1):
    ws.column_dimensions[get_column_letter(i)].width = w
ws.freeze_panes = "A2"
ws.row_dimensions[1].height = 28

# ---------- Sheet 2 ----------
ws2 = wb.create_sheet("增强点清单")
h2 = ["类别", "增强项", "说明"]
ws2.append(h2)
for c in range(1, 4):
    cell = ws2.cell(row=1, column=c)
    cell.fill = HEAD_FILL
    cell.font = HEAD_FONT
    cell.alignment = Alignment(horizontal="center", vertical="center")
    cell.border = BORDER
for r in enh:
    ws2.append(list(r))
for i in range(2, ws2.max_row + 1):
    for c in range(1, 4):
        cell = ws2.cell(row=i, column=c)
        cell.alignment = WRAP
        cell.border = BORDER
        if i % 2 == 0:
            cell.fill = ALT_FILL
for i, w in enumerate([10, 26, 78], start=1):
    ws2.column_dimensions[get_column_letter(i)].width = w
ws2.freeze_panes = "A2"

# ---------- Sheet 3 ----------
ws3 = wb.create_sheet("署名自检")
h3 = ["校验项", "实现", "失败后果"]
ws3.append(h3)
checks = [
    ("署名指纹", "字符码分片拼回署名，对「署名|锚点|版本」做 FNV-1a 32 位摘要，与 SIG_DIGEST 比对", "摘要不符 → 判定分片被改写 → 锁定写操作"),
    ("署名文本", "拼回结果必须等于 8 字署名「嘴贱招来九尾妖狐」", "文本异常 → 锁定"),
    ("元数据署名", "读 GM_info.script 的 name/namespace/author/description，须仍含「九尾妖狐」；管理器不暴露时跳过", "被改名去署名 → 锁定"),
    ("DOM 水印", "左下角 #ptx-sign-mark 角标 + data-ptx-sig 锚点；MutationObserver 监听移除", "被删自动补回；连续 3 次 → 锁定"),
    ("重检时机", "启动时、URL 变化（PJAX）时、面板「重新自检」按钮", "—"),
]
for r in checks:
    ws3.append(list(r))
for c in range(1, 4):
    cell = ws3.cell(row=1, column=c)
    cell.fill = HEAD_FILL
    cell.font = HEAD_FONT
    cell.alignment = Alignment(horizontal="center", vertical="center")
    cell.border = BORDER
for i in range(2, ws3.max_row + 1):
    for c in range(1, 4):
        cell = ws3.cell(row=i, column=c)
        cell.alignment = WRAP
        cell.border = BORDER
        if i % 2 == 0:
            cell.fill = ALT_FILL
for i, w in enumerate([16, 62, 40], start=1):
    ws3.column_dimensions[get_column_letter(i)].width = w
ws3.freeze_panes = "A2"

wb.save(OUT)
print("saved:", OUT)
