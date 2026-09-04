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
    return bool(c['name'].strip("' "))


def _has_data(c):
    return c.get('size') is not None


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
    return out


def collect(pages):
    """pages ＝ [(頁碼, 陣營, 類型), …]，回傳合併後的卡片清單"""
    got = []
    for pg, fac, typ in pages:
        got += [(c, fac, typ) for c in cards_of(pg, typ, fac)]
    return got
