# -*- coding: utf-8 -*-
"""交叉驗證：現有卡片資料 vs Fandom 英文 wiki

用法：
    node tools/dump_mine.js          # 先把 js/data/*.js 匯出成 tools/mine.json
    python tools/verify.py

以 en 欄位（英文卡名）配對，逐欄比對數值。
自製的副本 NPC 卡不在原作卡表中，屬於預期的未命中。
"""
import json, os, re, sys

D = os.path.dirname(os.path.abspath(__file__))

def norm(s):
    return re.sub(r'[^a-z0-9]', '', (s or '').lower().replace('\u2019', "'"))

def main():
    mine = json.load(open(os.path.join(D, 'mine.json'), encoding='utf-8'))
    fd = json.load(open(os.path.join(D, 'fandom_cards.json'), encoding='utf-8'))
    # 有同名不同卡的情況（例如 Lib. Milka 有 Episode 2 與 Episode 5 兩個版本，
    # 後者的頁面標題是 'Lib. Milka(Ep5)'）。以「標題＝卡名」的那筆為準。
    FD = {}
    for c in fd:
        exact = (c.get('title') or '') == (c.get('name') or '')
        for n in {norm(c.get('name')), norm(c.get('title'))}:
            if not n:
                continue
            if n not in FD or (exact and (FD[n].get('title') != FD[n].get('name'))):
                FD[n] = c

    # 已知且已裁決過的分歧：不算失敗，但每次都列出來提醒
    KNOWN = {
        ("Saint's Blessing", 'size'):
            'atwiki 說 2、Fandom 說 3，其餘欄位一致；第三份表格沒有 SIZE 欄可裁決，暫留 2',
    }

    PAIRS = [('atk', 'attack'), ('def', 'defense'), ('sta', 'stamina'),
             ('size', 'size'), ('life', 'life'), ('points', 'points'),
             ('limit', 'limit')]
    hit = 0
    nomatch, conflicts = [], []
    for m in mine:
        if not m.get('en'):
            continue
        f = FD.get(norm(m['en']))
        if not f:
            nomatch.append(m['en']); continue
        hit += 1
        # 自製 NPC 專用版本會刻意把 points/limit 歸零，不算衝突
        npc = m.get('npc') or m.get('points') == 0
        for a, b in PAIRS:
            if m.get(a) is None or f.get(b) is None:
                continue
            if npc and a in ('points', 'limit'):
                continue
            if int(m[a]) != int(f[b]):
                conflicts.append((m['en'], a, m[a], f[b], bool(m.get('prov'))))

    print('配對 %d 張（未命中 %d 張＝自製 NPC 卡）' % (hit, len(nomatch)))
    prov = [c for c in conflicts if c[4]]
    known = [c for c in conflicts if (c[0], c[1]) in KNOWN]
    real = [c for c in conflicts
            if not c[4] and (c[0], c[1]) not in KNOWN]
    print('數值衝突 %d 筆（prov 暫定值 %d、已知未裁決 %d、未處理 %d）'
          % (len(conflicts), len(prov), len(known), len(real)))
    for c in known:
        print('  ~ %-24s %-6s 我方 %s / Fandom %s' % (c[0], c[1], c[2], c[3]))
        print('      %s' % KNOWN[(c[0], c[1])])
    for c in real:
        print('  ✗ %-24s %-6s 我方 %s → Fandom %s' % (c[0], c[1], c[2], c[3]))
    return 1 if real else 0

if __name__ == '__main__':
    sys.exit(main())
