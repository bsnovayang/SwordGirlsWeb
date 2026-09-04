# -*- coding: utf-8 -*-
"""從 atwiki 的章節頁抽出卡片，並處理「一張卡被拆成兩列」的情況。

有些頁面的表格把繁中卡名放在一列（沒有數值），日文卡名放在下一列（帶著數值
與效果文）。直接解析會變成兩張殘缺的卡，所以這裡把它們合併回一張：
繁中名取前一列、日文名與其餘欄位取後一列。
"""
import os
import sys

D = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, D)
from at_parse import parse_page


def _named(c):
    if not c['name'].strip("' "):
        return False
    # 代幣卡（由別張卡產生，不是可收集的卡）不算
    if '代幣' in (c.get('effect') or ''):
        return False
    return True


def _has_data(c):
    return c.get('size') is not None


KANA = set(range(0x3041, 0x30FF))
BAD = ('攻', '防', '體', '体', '回合', '自己', '對手', '此卡', 'SIZE', '牌組', '手牌')


def _is_jp(t):
    return any(ord(ch) in KANA for ch in t)


def _looks_like_name(t):
    return 0 < len(t) <= 12 and not any(b in t for b in BAD)


def _fix_split_names(cards):
    """卡名在 wiki 上常被斷成兩行 —— 後半（有時連同日文後半）會被折進效果欄。
    例如「GS」＋「戰鬥員 戦闘員」、「煉金術師」＋「克菈莉絲 クラリス」。
    這裡把那些片段接回卡名／日文名，並從效果文裡拿掉。"""
    for c in cards:
        eff = (c.get('effect') or '').strip()
        if not eff:
            continue
        head = eff.split('［')[0].strip()
        if not head or head == eff and '［' not in eff:
            # 整段都沒有風味文時，只在開頭真的像名字片段才動它
            pass
        parts = head.split()
        if not parts or len(parts) > 2 or not all(_looks_like_name(t) for t in parts):
            continue
        for t in parts:
            if _is_jp(t):
                c['jp'] = (c.get('jp') or '') + t
            else:
                c['name'] = c['name'] + t
        c['effect'] = eff[len(head):].strip()
    return cards


def cards_of(page, ctype, faction):
    """回傳這一頁的卡片，已經處理過拆列的情況"""
    raw = [c for c in parse_page(page, ctype, faction) if _named(c)]
    out = []
    i = 0
    while i < len(raw):
        c = raw[i]
        if not _has_data(c) and i + 1 < len(raw) and _has_data(raw[i + 1]):
            # 這一列只有繁中名，資料在下一列（下一列的 name 是日文名）
            nxt = dict(raw[i + 1])
            nxt['jp'] = nxt.get('jp') or nxt['name']
            nxt['name'] = c['name']
            out.append(nxt)
            i += 2
            continue
        out.append(c)
        i += 1
    return _fix_split_names(out)


def collect(pages):
    """pages ＝ [(頁碼, 陣營, 類型), …]，回傳合併後的卡片清單"""
    got = []
    for pg, fac, typ in pages:
        got += [(c, fac, typ) for c in cards_of(pg, typ, fac)]
    return got
