# -*- coding: utf-8 -*-
"""解析 atwiki 繁中 SwordGirls 卡片頁 → JSON"""
import re, json, os, sys
from at_dump import text

SP = os.path.dirname(os.path.abspath(__file__))
FW = str.maketrans('０１２３４５６７８９：', '0123456789:')

PAGES = [
    ('31',  'character', None),
    ('74',  'follower', 'vita'),     ('80',  'follower', 'academy'),
    ('86',  'follower', 'crux'),     ('92',  'follower', 'darklore'),
    ('110', 'spell',    'vita'),     ('112', 'spell',    'academy'),
    ('118', 'spell',    'crux'),     ('124', 'spell',    'darklore'),
]

def parse_page(pg, ctype, faction):
    L = text(pg)
    # 切成一張張卡
    idx = [i for i, l in enumerate(L) if l == '卡名']
    cards = []
    for k, st in enumerate(idx):
        en = idx[k + 1] if k + 1 < len(idx) else len(L)
        blk = L[st + 1:en]
        c = {'type': ctype, 'faction': faction}
        eff, flavor, mats = [], [], []
        i = 0
        in_mat = False
        while i < len(blk):
            l = blk[i]
            n = l.translate(FW)
            if l == '日文卡名':
                c['jp'] = blk[i + 1] if i + 1 < len(blk) else ''
                i += 2; continue
            if l == '入手方法':
                in_mat = True; i += 1; continue
            if in_mat:
                mats.append(l); i += 1; continue
            m = re.match(r'^限制張數:(\d+)', n)
            if m: c['limit'] = int(m.group(1)); i += 1; continue
            m = re.match(r'^SIZE:(\d+)', n)
            if m: c['size'] = int(m.group(1)); i += 1; continue
            m = re.match(r'^分數:(\d+)', n)
            if m: c['points'] = int(m.group(1)); i += 1; continue
            m = re.match(r'^攻/防/體:(\d+)/(\d+)/(\d+)', n)
            if m:
                c['atk'], c['def'], c['sta'] = int(m.group(1)), int(m.group(2)), int(m.group(3))
                i += 1; continue
            if 'name' not in c:
                c['name'] = l; i += 1; continue
            if l.startswith('[') or l.startswith('「'):
                flavor.append(l); i += 1; continue
            eff.append(l); i += 1
        c['effect'] = ' '.join(eff).strip()
        c['flavor'] = ' '.join(flavor).strip()
        c['mats'] = mats
        if c.get('name'):
            cards.append(c)
    return cards

if __name__ == '__main__':
    out = []
    for pg, ctype, fac in PAGES:
        cs = parse_page(pg, ctype, fac)
        print('page %-4s %-10s %-9s → %d 張' % (pg, ctype, fac or '-', len(cs)), file=sys.stderr)
        out += cs
    json.dump(out, open(os.path.join(SP, 'at_cards.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    for c in out:
        print('%-9s %-8s %-22s lim%s S%-2s P%-2s %s' % (
            c['type'], c['faction'] or '-', c['name'],
            c.get('limit'), c.get('size'), c.get('points'),
            (str(c.get('atk')) + '/' + str(c.get('def')) + '/' + str(c.get('sta'))) if 'atk' in c else ''))
        if c['effect']:
            print('          效果:', c['effect'])
