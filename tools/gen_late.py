# -*- coding: utf-8 -*-
"""產生 Episode 5／6／EX2 的卡片 JS。

這三個章節跟前面不一樣：繁中 wiki 的卡片頁到 EX1 就結束了，
所以卡名幾乎都是本專案自譯（`tools/<set>_names.json`），
只有 Episode 5 的公立咒語有官方譯名（`tools/map_ep5.json`）。

效果文也一律是從英文 wiki 翻的，放在 `tools/<set>_effects.json`
（沒有寫在裡面的就留白，之後再補）。

用法： python tools/gen_late.py 5 > tools/ep5_cards.txt
"""
import json
import os
import re
import sys

D = os.path.dirname(os.path.abspath(__file__))
FM = {'Vita': 'vita', 'Academy': 'academy', 'Crux': 'crux',
      'Darklore': 'darklore', 'Neutral': 'neutral'}
LABEL = {'vita': '公立學校', 'academy': '私立學校', 'crux': '南十字',
         'darklore': '暗黑族', 'neutral': '無所屬'}
TYPE_LABEL = {'Follower': '隨從', 'Spell': '咒語', 'Character': '角色'}
ORDER = ['vita', 'academy', 'crux', 'darklore', 'neutral']


def load(name):
    p = os.path.join(D, name)
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}


def slug(en, taken):
    s = en.lower().replace('.', '').replace("'", '')
    s = re.sub(r'[^a-z0-9]+', '_', s).strip('_')
    if s in taken:                       # 跨章節同名（例如 Lib. Milka 有兩版）
        s = s + '_ep' + str(SET).lower()
    return s


def q(v):
    # 換行要寫成 JS 的跳脫字元，不然會斷成兩行變成語法錯誤
    v = v.replace(chr(92), chr(92) * 2).replace(chr(10), chr(92) + 'n')
    return ('"%s"' % v) if "'" in v else ("'%s'" % v)


def main():
    fd = json.load(open(os.path.join(D, 'fandom_cards.json'), encoding='utf-8'))
    key = str(SET)
    names = load('ep%s_names.json' % key.lower())
    effects = load('ep%s_effects.json' % key.lower())
    official = {v: k for k, v in load('map_ep%s.json' % key.lower()).items()}

    cs = [c for c in fd
          if str(c.get('episode')) == key and (c.get('limit') or 0) > 0
          and not c.get('transform') and c.get('type') in ('Follower', 'Spell', 'Character')]
    cs.sort(key=lambda c: (ORDER.index(FM.get(c.get('faction'), 'neutral')),
                           ['Follower', 'Spell', 'Character'].index(c['type']), c['id']))

    # 已經被前面章節用掉的 slug
    taken = set()
    self_file = 'cards_ep%s.js' % key.lower()
    for f in os.listdir(os.path.join(D, '..', 'js', 'data')):
        if not f.startswith('cards') or f == self_file:
            continue          # 重新產生時不要跟自己的舊檔撞 slug
        txt = open(os.path.join(D, '..', 'js', 'data', f), encoding='utf-8').read()
        taken |= set(re.findall(r"slug: '([a-z0-9_]+)'", txt))
        taken |= set(re.findall(r"(?:foll|spell|chara)\('([a-z0-9_]+)'", txt))

    out, cur, tl = [], None, []
    for c in cs:
        fac = FM.get(c.get('faction'), 'neutral')
        head = (fac, c['type'])
        if head != cur:
            cur = head
            out.append('\n    /* ── %s · %s ── */' % (LABEL[fac], TYPE_LABEL[c['type']]))
        zh = official.get(c['name']) or names.get(c['name']) or c['name']
        sl = slug(c['name'], taken)
        taken.add(sl)
        if c['name'] not in official:
            tl.append(sl)
        eff = effects.get(c['name'], '')
        if c['type'] == 'Character':
            args = [q(sl), q(c['id']), q(zh), q(c['name']), q(fac),
                    str(c['life']), str(c['limit']), str(c['points'])]
            out.append('    chara(' + ', '.join(args) + ',')
        elif c['type'] == 'Follower':
            args = [q(sl), q(c['id']), q(zh), "''", q(c['name']), q(fac),
                    str(c['size']), str(c['attack']), str(c['defense']),
                    str(c['stamina']), str(c['limit']), str(c['points'])]
            out.append('    foll(' + ', '.join(args) + ',')
        else:
            args = [q(sl), q(c['id']), q(zh), "''", q(c['name']), q(fac),
                    str(c['size']), str(c['limit']), str(c['points'])]
            out.append('    spell(' + ', '.join(args) + ',')
        out.append('      %s,' % q(eff) if eff else "      '',")
        out.append("      ''),")

    print('\n'.join(out))
    print('  /*TL*/ ' + json.dumps(tl, ensure_ascii=False))
    print('\n// 共 %d 張，官方譯名 %d，自譯 %d，有效果文 %d'
          % (len(cs), len(cs) - len(tl), len(tl),
             sum(1 for c in cs if effects.get(c['name']))), file=sys.stderr)


SET = sys.argv[1] if len(sys.argv) > 1 else '5'
main()
