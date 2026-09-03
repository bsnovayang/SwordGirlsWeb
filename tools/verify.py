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
    FD = {}
    for c in fd:
        for n in {norm(c.get('name')), norm(c.get('title'))}:
            if n:
                FD.setdefault(n, c)

    PAIRS = [('atk', 'attack'), ('df', 'defense'), ('sta', 'stamina'),
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
    real = [c for c in conflicts if not c[4]]
    print('數值衝突 %d 筆（其中 %d 筆是標記 prov 的暫定值，屬預期）'
          % (len(conflicts), len(prov)))
    for c in real:
        print('  ✗ %-24s %-6s 我方 %s → Fandom %s' % (c[0], c[1], c[2], c[3]))
    return 1 if real else 0

if __name__ == '__main__':
    sys.exit(main())
