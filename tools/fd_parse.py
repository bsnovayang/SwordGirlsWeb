# -*- coding: utf-8 -*-
"""把 fandom/*.txt 的 {{CardTable}} 解析成 JSON"""
import re, json, os
import fd_fetch as F

NUM = ('size', 'points', 'limit', 'attack', 'defense', 'stamina', 'life', 'level', 'episode')

def parse(title):
    """回傳這一頁的所有卡片。

    有些頁面放了不只一張卡 —— 角色卡的「變身形態」都寫在同一頁，
    例如 Rose Witch Rosa 那頁就有 6 個 CardTable（含 Rosa Pacifica、
    Wedding Dress Rosa…）。原本只抓第一個起點、卻把整頁的欄位一起吃進來，
    結果六張卡的數值會混在一起。現在改成逐段切開。"""
    w = F.load(title)
    if title.startswith(('List of', 'Episode 0/')):
        return []
    starts = [m.start() for m in re.finditer(r'\{\{\s*(?:Template:)?CardTable\d?', w)]
    if not starts:
        return []
    # 「==Transformations==」之後的區塊是變化後角色卡（原作要變身才拿得到），
    # 標記起來，才不會跟一般可合成的卡混在一起。
    mt = re.search(r'==+\s*Transformations?\s*==+', w, re.I)
    tpos = mt.start() if mt else None

    out = []
    for i, st in enumerate(starts):
        en = starts[i + 1] if i + 1 < len(starts) else len(w)
        c = parse_block(w[st:en], title)
        if not c:
            continue
        if tpos is not None and st > tpos:
            c['transform'] = True
        out.append(c)
    return out


def parse_block(body, title):
    c = {'title': title}
    # 逐個 |key=value（值的結尾：下一個行首的 |key=、
    # 同一行後面接的 |key=（wiki 上常見）、或 }}）
    END = r'(?=\n\s*\|\s*[A-Za-z0-9_]+\s*=|\|\s*[A-Za-z0-9_]+\s*=|\n?\}\})'
    for m in re.finditer(r'\|\s*([A-Za-z0-9_]+)\s*=\s*(.*?)' + END, body, re.S):
        k, v = m.group(1).strip().lower(), m.group(2).strip()
        if v == '':
            continue
        c[k] = v
    for k in NUM:
        if k in c:
            # episode 可能是 'EX1' / 'EX2' 這種特別彈 —— 不能當成數字 1 / 2，
            # 那是完全不同的卡集（原本會被誤判成 Episode 1 / 2）
            if k == 'episode':
                v = str(c[k]).strip().upper()
                mx = re.match(r'^EX\s*(\d+)$', v)
                if mx:
                    c[k] = 'EX' + mx.group(1)
                    continue
            mm = re.search(r'-?\d+', str(c[k]))
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
    # 有些頁面的 name 欄直接寫 {{PAGENAME}}（照頁名帶入），
    # 解析出來會變成字面上的 '{{PAGENAME'，此時真名要用頁面標題。
    if not c.get('name') or c['name'].startswith('{{'):
        c['name'] = title
    return c

if __name__ == '__main__':
    import os as _o; _d=_o.path.dirname(_o.path.abspath(__file__))
    titles = json.load(open(_o.path.join(_d,'fandom_titles.json'), encoding='utf-8'))
    cards, bad = [], []
    for t in titles:
        got = parse(t)
        if got:
            cards += got
        else:
            bad.append(t)
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
    print('章節分布:', dict(sorted(ep.items(), key=lambda x: (x[0] is None, str(x[0])))))
    print('有配方的卡:', sum(1 for c in cards if c.get('materials')))
    print('有卡號的卡:', sum(1 for c in cards if c.get('id')))
