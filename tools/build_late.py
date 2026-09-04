# -*- coding: utf-8 -*-
"""把 gen_late.py 產生的卡片片段組成完整的 js/data/cards_ep<set>.js。

用法： python tools/build_late.py 5
"""
import io
import json
import os
import re
import subprocess
import sys

D = os.path.dirname(os.path.abspath(__file__))
R = os.path.join(D, '..')
SET = sys.argv[1] if len(sys.argv) > 1 else '5'
key = SET.lower()

HEAD = '''/* ═══════════════════════════════════════════════════════════
   Episode %(title)s 卡片

   資料來源：
     · 數值、卡號、稀有度、效果 → Sword Girls Wiki（英文）
       https://swordgirls.fandom.com/

   ★ 繁中 wiki 的卡片頁到 EX1 就結束了，所以這個章節的**卡名與效果文
     幾乎都是本專案自譯**（見 tools/ep%(key)s_names.json、ep%(key)s_effects.json），
     標了 tl，UI 會顯示「暫譯」。%(extra)s

   ★ 合成配方仍是推導值（provRecipe）。
   ═══════════════════════════════════════════════════════════ */
var SG = window.SG || (window.SG = {});

(function () {
  'use strict';

  function rarity(points) {
    return points >= 50 ? 'Double Rare' : points >= 13 ? 'Rare'
         : points >= 3 ? 'Uncommon' : 'Common';
  }

  function foll(slug, id, name, jp, en, faction, size, atk, def, sta, limit, points, effect, flavor) {
    return {
      slug: slug, id: id, name: name, jp: jp, en: en, type: 'follower', faction: faction,
      size: size, atk: atk, def: def, sta: sta, limit: limit, points: points,
      ep: %(ep)s, provRecipe: true, rarity: rarity(points),
      effect: effect || '', flavor: flavor || ''
    };
  }

  function spell(slug, id, name, jp, en, faction, size, limit, points, effect, flavor) {
    return {
      slug: slug, id: id, name: name, jp: jp, en: en, type: 'spell', faction: faction,
      size: size, limit: limit, points: points,
      ep: %(ep)s, provRecipe: true, rarity: rarity(points),
      effect: effect || '', flavor: flavor || ''
    };
  }

  function chara(slug, id, name, en, faction, life, limit, points, effect, flavor) {
    return {
      slug: slug, id: id, name: name, jp: '', en: en, type: 'character', faction: faction,
      life: life, limit: limit, points: points,
      ep: %(ep)s, provRecipe: true, rarity: rarity(points),
      effect: effect || '', flavor: flavor || ''
    };
  }

  var LIST = [
'''

EXTRA = {
    '5': '\n\n  ★ 只有公立咒語 7 張有官方繁中譯名（繁中 wiki 頁面 109）。'
         '\n     「圖書部的米路卡」與 Episode 2 的同名卡是不同卡（原作就同名），slug 加 _ep5 區別。',
}


def main():
    gen = subprocess.run([sys.executable, os.path.join(D, 'gen_late.py'), SET],
                         capture_output=True, text=True, encoding='utf-8')
    body = gen.stdout
    body = '\n'.join(l for l in body.split('\n') if not l.startswith('//'))
    m = re.search(r'  /\*TL\*/ (\[.*\])', body)
    tl = json.loads(m.group(1))
    body = body[:m.start()].rstrip('\n')

    ep = "'%s'" % SET if not SET.isdigit() else SET
    head = HEAD % {'title': SET, 'key': key, 'ep': ep, 'extra': EXTRA.get(SET, '')}
    tail = ('  ];\n\n  /* 這些卡的名字是自譯（繁中 wiki 沒有收錄） */\n  var TL = '
            + json.dumps(tl, ensure_ascii=False) + ';\n'
            + '  LIST.forEach(function (c) { if (TL.indexOf(c.slug) >= 0) c.tl = true; });\n\n'
            + '  LIST.forEach(function (c) { SG.CARDS[c.slug] = c; });\n})();\n')

    # EX 系列的檔名不加 ep 前綴（cards_ex2.js 比 cards_epex2.js 好讀）
    fname = 'cards_%s.js' % key if key.startswith('ex') else 'cards_ep%s.js' % key
    out = os.path.join(R, 'js', 'data', fname)
    io.open(out, 'w', encoding='utf-8').write(head + body + '\n' + tail)
    print('%s：%d 張（自譯 %d）' % (os.path.basename(out), body.count('foll(') +
                                  body.count('spell(') + body.count('chara('), len(tl)))


main()
