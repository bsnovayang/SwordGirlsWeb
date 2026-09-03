# -*- coding: utf-8 -*-
"""合併 atwiki（繁中卡名／效果文）與 Fandom（數值／卡號／稀有度），
產生 Episode 1 隨從 40 張的 JS 片段。

用法： python tools/gen_ep1_followers.py > tools/ep1_followers.js.txt
"""
import json, os, re, sys

D = os.path.dirname(os.path.abspath(__file__))
J = lambda n: json.load(open(os.path.join(D, n), encoding='utf-8'))

FM = {'Vita': 'vita', 'Academy': 'academy', 'Crux': 'crux', 'Darklore': 'darklore'}

# atwiki 那欄寫了效果，但 Fandom 沒有，且該卡是 p5 Common ——
# EP1 所有 p5/p1 的 Common 都是純數值卡，有效果的一律 p3 Uncommon 以上，
# 所以判定為 atwiki 誤植（內容還跟「藍月、佩琪‧菲莉娜」幾乎一樣）。
NO_EFFECT = {'Lib. Lindt'}

def slug(en):
    s = en.lower().replace('.', '').replace("'", '')
    s = re.sub(r'[^a-z0-9]+', '_', s).strip('_')
    return s

def clean(zh):
    """去掉混進來的日文原文與 wiki 的引號殘渣"""
    zh = zh.strip().strip("'").strip()
    if zh.startswith('▶'):
        zh = zh[1:]
    # 「▶」之後接日文原文，切掉
    parts = re.split(r'\s*▶', zh)
    zh = parts[0].strip().strip("'").strip()
    # 對齊專案既有的用字與標點
    zh = (zh.replace('－１', '-1').replace('根此卡', '跟此卡')
            .replace('防御', '防禦').replace('从者', '隨從').replace('從者', '隨從')
            .replace('(', '（').replace(')', '）'))
    zh = re.sub(r'\s*([+-])\s*([0-9X])', lambda m: ' ' + ('+' if m.group(1) == '+' else '−') + m.group(2), zh)
    zh = re.sub(r'X\s*=\s*', 'X ＝ ', zh)
    zh = re.sub(r'\s+', ' ', zh).replace('（ ', '（').replace(' ）', '）')
    zh = zh.replace('，', '，').strip()
    if zh and zh[-1] != '。':
        zh += '。'
    return zh

def main():
    fd = J('fandom_cards.json')
    f1 = {c['name']: c for c in fd
          if c.get('type') == 'Follower' and c.get('episode') == 1
          and c.get('faction') in FM}
    mp = J('map_ep1_followers.json')
    at = [c for c in J('atwiki_ep1_followers.json') if c['name'].strip("' ")]

    rows = []
    for c in at:
        f = f1[mp[c['name']]]
        eff = '' if f['name'] in NO_EFFECT else clean(c.get('effect') or '')
        rows.append((c, f, eff))
    rows.sort(key=lambda r: (['vita', 'academy', 'crux', 'darklore']
                             .index(FM[r[1]['faction']]), r[1]['size'], r[1]['id']))

    seen = set()
    out = []
    cur = None
    LABEL = {'vita': '公立學校', 'academy': '私立學校',
             'crux': '南十字', 'darklore': '暗黑族'}
    for c, f, eff in rows:
        fac = FM[f['faction']]
        if fac != cur:
            cur = fac
            out.append('\n    /* ── %s ── */' % LABEL[fac])
        sl = slug(f['name'])
        assert sl not in seen, sl
        seen.add(sl)
        args = ["'%s'" % sl, "'%s'" % f['id'], "'%s'" % c['name'],
                "'%s'" % (c.get('jp') or ''),
                ('"%s"' if "'" in f['name'] else "'%s'") % f['name'],
                "'%s'" % fac,
                str(f['size']), str(f['attack']), str(f['defense']),
                str(f['stamina']), str(f['limit']), str(f['points'])]
        line = '    foll(' + ', '.join(args) + ','
        out.append(line)
        out.append("      '%s')," % eff if eff else "      ''),")
    print('\n'.join(out))
    print('\n// 共 %d 張，其中有效果 %d 張'
          % (len(rows), sum(1 for _, _, e in rows if e)), file=sys.stderr)

main()
