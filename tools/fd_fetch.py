# -*- coding: utf-8 -*-
"""從 swordgirls.fandom.com 以 MediaWiki API 批次取得卡片 wikitext。

有禮貌的抓法：
  * 用 API 而非爬 HTML —— 一次 50 個標題，549 張卡只要約 11 次請求
  * User-Agent 標明用途與聯絡方式（MediaWiki 的禮儀要求）
  * maxlag=5：伺服器忙碌時主動退讓
  * 每次請求間隔 1.5 秒，429/503 指數退避
  * 全部落地快取，重跑不會再打伺服器
"""
import json, os, time, urllib.parse, urllib.request

API = 'https://swordgirls.fandom.com/api.php'
UA = ('SwordGirlsWeb-fanremake/1.0 (personal offline fan remake of the '
      'defunct 2011 game; contact: bluesign.usa@gmail.com) python-urllib')
DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fandom')
DELAY = 1.5

def get(params, tries=5):
    params = dict(params, format='json', maxlag='5')
    url = API + '?' + urllib.parse.urlencode(params)
    wait = 3.0
    for n in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA,
                                                       'Accept-Encoding': 'identity'})
            with urllib.request.urlopen(req, timeout=60) as r:
                d = json.loads(r.read().decode('utf-8'))
            if 'error' in d and d['error'].get('code') == 'maxlag':
                time.sleep(wait); wait *= 2; continue     # 伺服器忙，等
            return d
        except Exception as e:
            code = getattr(e, 'code', None)
            if n == tries - 1:
                raise
            time.sleep(wait if code in (429, 503) else 2.0)
            wait *= 2
    return None

def members(cat):
    """列出分類下的所有主命名空間頁面（含 continue 分頁）"""
    out, cont = [], {}
    while True:
        d = get(dict({'action': 'query', 'list': 'categorymembers',
                      'cmtitle': 'Category:' + cat, 'cmlimit': '500',
                      'cmnamespace': '0'}, **cont))
        out += [m['title'] for m in d['query']['categorymembers']]
        if 'continue' not in d:
            return out
        cont = d['continue']
        time.sleep(DELAY)

def wikitext(titles):
    """批次取 wikitext，結果寫進 fandom/<title>.txt 快取"""
    todo = [t for t in titles if not os.path.exists(cache_path(t))]
    for i in range(0, len(todo), 50):
        batch = todo[i:i + 50]
        d = get({'action': 'query', 'prop': 'revisions', 'rvprop': 'content',
                 'rvslots': 'main', 'titles': '|'.join(batch)})
        pages = d.get('query', {}).get('pages', {})
        norm = {n['to']: n['from'] for n in d.get('query', {}).get('normalized', [])}
        for p in pages.values():
            t = norm.get(p['title'], p['title'])
            try:
                txt = p['revisions'][0]['slots']['main']['*']
            except (KeyError, IndexError):
                txt = ''
            with open(cache_path(t), 'w', encoding='utf-8') as f:
                f.write(txt)
        print('  取得 %d/%d' % (min(i + 50, len(todo)), len(todo)), flush=True)
        time.sleep(DELAY)

def cache_path(title):
    safe = ''.join(c if (c.isalnum() or c in ' -_.') else '_' for c in title)
    return os.path.join(DIR, safe[:120] + '.txt')

def load(title):
    p = cache_path(title)
    return open(p, encoding='utf-8').read() if os.path.exists(p) else ''


if __name__ == '__main__':
    os.makedirs(DIR, exist_ok=True)
    tp = os.path.join(os.path.dirname(DIR), 'fandom_titles.json')
    titles = []
    for cat in ('Follower Cards', 'Spell Cards', 'Character Cards'):
        m = members(cat)
        print('%-18s %d' % (cat, len(m)))
        titles += m
        time.sleep(DELAY)
    titles = sorted(set(titles))
    with open(tp, 'w', encoding='utf-8') as f:
        json.dump(titles, f, ensure_ascii=False)
    print('唯一卡片頁 %d，開始抓取…' % len(titles))
    wikitext(titles)
    print('完成，快取於', DIR)
