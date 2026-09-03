# -*- coding: utf-8 -*-
"""把 fandom/*.txt 的 {{CardTable}} 解析成 JSON"""
import re, json, os
import fd_fetch as F

NUM = ('size', 'points', 'limit', 'attack', 'defense', 'stamina', 'life', 'level', 'episode')

def parse(title):
    w = F.load(title)
    m0 = re.search(r'\{\{\s*(?:Template:)?CardTable\d?', w)
    if not m0 or title.startswith(('List of', 'Episode 0/')):
        return None
    body = w[m0.start():]
    c = {'title': title}
    # 逐個 |key=value（value 可跨行，直到下一個行首 | 或 }}）
    # 值的結尾：下一個行首的 |key=、同一行後面接的 |key=（wiki 上常見）、或 }}
    END = r'(?=\n\s*\|\s*[A-Za-z0-9_]+\s*=|\|\s*[A-Za-z0-9_]+\s*=|\n?\}\})'
    for m in re.finditer(r'\|\s*([A-Za-z0-9_]+)\s*=\s*(.*?)' + END, body, re.S):
        k, v = m.group(1).strip().lower(), m.group(2).strip()
        if v == '':
            continue
        c[k] = v
    for k in NUM:
        if k in c:
            mm = re.search(r'-?\d+', c[k])
            c[k] = int(mm.group(0)) if mm else None
    # 合成材料收成 list
    mats = []
    for i in range(1, 9):
        n = c.pop('ingredient%d' % i, None)
        a = c.pop('amount%d' % i, None)
        if n:
            try: a = int(re.search(r'\d+', str(a)).group(0))
            except Exception: a = None
            mats.append({'item': n, 'n': a})
    if mats:
        c['materials'] = mats
    c.pop('image', None)
    return c

if __name__ == '__main__':
    import os as _o; _d=_o.path.dirname(_o.path.abspath(__file__))
    titles = json.load(open(_o.path.join(_d,'fandom_titles.json'), encoding='utf-8'))
    cards, bad = [], []
    for t in titles:
        c = parse(t)
        (cards if c else bad).append(c or t)
    json.dump(cards, open(_o.path.join(_d,'fandom_cards.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    print('解析成功 %d 張，無 CardTable %d 張' % (len(cards), len(bad)))
    if bad: print('  ', ', '.join(bad[:10]))
    # 欄位完整度
    from collections import Counter
    ct = Counter(c.get('type', '?') for c in cards)
    print('類型分布:', dict(ct))
    for typ, keys in [('Follower', ('attack', 'defense', 'stamina', 'size')),
                      ('Spell', ('size',)), ('Character', ('life',))]:
        sub = [c for c in cards if c.get('type') == typ]
        full = [c for c in sub if all(c.get(k) is not None for k in keys)]
        print('  %-10s %3d 張｜數值完整 %3d' % (typ, len(sub), len(full)))
    ep = Counter(c.get('episode') for c in cards)
    print('章節分布:', dict(sorted(ep.items(), key=lambda x: (x[0] is None, x[0]))))
    print('有配方的卡:', sum(1 for c in cards if c.get('materials')))
    print('有卡號的卡:', sum(1 for c in cards if c.get('id')))
