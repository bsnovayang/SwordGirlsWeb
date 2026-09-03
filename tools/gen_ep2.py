# -*- coding: utf-8 -*-
"""合併 atwiki（繁中卡名／效果文）與 Fandom（數值／卡號／稀有度），
產生 Episode 2 卡片的 JS 片段。

用法： python tools/gen_ep2.py > tools/ep2_cards.txt
"""
import json, os, re, sys

D = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, D)
from at_parse import parse_page

PAGES = [('76', 'vita', 'follower'), ('82', 'academy', 'follower'),
         ('88', 'crux', 'follower'), ('94', 'darklore', 'follower'),
         ('106', 'vita', 'spell'), ('114', 'academy', 'spell'),
         ('120', 'crux', 'spell'), ('126', 'darklore', 'spell')]

LABEL = {'vita': '公立學校', 'academy': '私立學校', 'crux': '南十字', 'darklore': '暗黑族'}


def slug(en):
    s = en.lower().replace('.', '').replace("'", '')
    s = re.sub(r'[^a-z0-9]+', '_', s).strip('_')
    return s


def clean(zh):
    """去掉混進來的日文原文、風味文與 wiki 殘渣，只留效果敘述"""
    zh = (zh or '').strip().strip("'").strip()
    # 風味文用［］括起來，可能不只一段、也可能不在開頭 —— 全部拿掉
    zh = re.sub(r'［[^］]*］', ' ', zh)
    if zh.startswith('▶'):
        zh = zh[1:]
    zh = re.split(r'\s*▶', zh)[0].strip().strip("'").strip()
    # atwiki 的譯文夾雜日式漢字與簡體字，統一成繁體
    for a, b in [('防御', '防禦'), ('从者', '隨從'), ('從者', '隨從'), ('攻撃', '攻擊'),
                 ('発', '發'), ('転', '轉'), ('対', '對'), ('変', '變'), ('数', '數'),
                 ('効果', '效果'), ('无', '無'), ('后', '後'), ('时', '時'), ('给', '給'),
                 ('弃', '棄'), ('随机', '隨機'), ('随从', '隨從'), ('场', '場'),
                 ('体力', '體力'), ('墓地', '墓地'), ('(', '（'), (')', '）'), ('･', '・')]:
        zh = zh.replace(a, b)
    zh = re.sub(r'\s*([+-])\s*([0-9X])',
                lambda m: ' ' + ('+' if m.group(1) == '+' else '\u2212') + m.group(2), zh)
    zh = re.sub(r'X\s*=\s*', 'X ＝ ', zh)
    zh = re.sub(r'\s+', ' ', zh).replace('（ ', '（').replace(' ）', '）').strip()
    if zh and zh[-1] not in '。':
        zh += '。'
    return zh


def flavor(zh):
    got = re.findall(r'［[^］]*］', zh or '')
    return ''.join(got)


def main():
    fd = json.load(open(os.path.join(D, 'fandom_cards.json'), encoding='utf-8'))
    # 同名不同卡時取「頁面標題＝卡名」的那筆（見 tools/verify.py 的說明）
    BY = {}
    for c in fd:
        n = c.get('name')
        if not n:
            continue
        if n not in BY or (c.get('title') == n and BY[n].get('title') != n):
            BY[n] = c
    mp = json.load(open(os.path.join(D, 'map_ep2.json'), encoding='utf-8'))

    rows = []
    for pg, fac, typ in PAGES:
        for c in parse_page(pg, typ, fac):
            if not c['name'].strip("' "):
                continue
            f = BY[mp[c['name']]]
            rows.append((c, f, fac, typ))

    seen, out, cur = set(), [], None
    for c, f, fac, typ in sorted(
            rows, key=lambda r: (['vita', 'academy', 'crux', 'darklore'].index(r[2]),
                                 0 if r[3] == 'follower' else 1,
                                 r[1].get('size') or 0, r[1]['id'])):
        head = (fac, typ)
        if head != cur:
            cur = head
            out.append('\n    /* ── %s · %s ── */'
                       % (LABEL[fac], '隨從' if typ == 'follower' else '咒語'))
        sl = slug(f['name'])
        assert sl not in seen, sl
        seen.add(sl)
        q = lambda v: ('"%s"' % v) if "'" in v else ("'%s'" % v)
        eff = clean(c.get('effect'))
        fl = flavor(c.get('effect'))
        if typ == 'follower':
            args = [q(sl), q(f['id']), q(c['name']), q(c.get('jp') or ''), q(f['name']),
                    q(fac), str(f['size']), str(f['attack']), str(f['defense']),
                    str(f['stamina']), str(f['limit']), str(f['points'])]
            out.append('    foll(' + ', '.join(args) + ',')
        else:
            args = [q(sl), q(f['id']), q(c['name']), q(c.get('jp') or ''), q(f['name']),
                    q(fac), str(f['size']), str(f['limit']), str(f['points'])]
            out.append('    spell(' + ', '.join(args) + ',')
        out.append('      %s,' % q(eff) if eff else "      '',")
        out.append('      %s),' % q(fl) if fl else '      \'\'),')

    print('\n'.join(out))
    print('\n// 共 %d 張（隨從 %d／咒語 %d），有效果 %d 張'
          % (len(rows), sum(1 for r in rows if r[3] == 'follower'),
             sum(1 for r in rows if r[3] == 'spell'),
             sum(1 for r in rows if clean(r[0].get('effect')))), file=sys.stderr)


main()
