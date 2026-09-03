/* ═══════════════════════════════════════════════════════════
   合成素材 + 配方

   ★ 配方規律：從英文 wiki 存檔抓到 31 張卡的配方，全部符合同一條規則，
     所以剩下 25 張直接依規則推導（test/craft.js 拿那 31 張逐一驗證）：

       隨從卡：貓玩偶 ×3　＋ 陣營礦石 ×2 ＋ 白礦石 ×2
       咒語卡：書     ×3　＋ 陣營礦石 ×2 ＋ 白礦石 ×2
       角色卡：劍     ×30 ＋ 陣營礦石 ×20 ＋ 白礦石 ×50

     陣營礦石：公立＝綠、私立＝紅、南十字＝藍、暗黑族＝黑
   ═══════════════════════════════════════════════════════════ */
var SG = window.SG || (window.SG = {});

(function () {
  'use strict';

  SG.MATERIALS = {
    sword:     { name: '劍',     en: 'Sword' },
    cat_doll:  { name: '貓玩偶', en: 'Cat Doll' },
    book:      { name: '書',     en: 'Book' },
    ore_white: { name: '白色礦石', en: 'White Ore' },
    ore_green: { name: '綠色礦石', en: 'Green Ore', faction: 'vita' },
    ore_red:   { name: '紅色礦石', en: 'Red Ore',   faction: 'academy' },
    ore_blue:  { name: '藍色礦石', en: 'Blue Ore',  faction: 'crux' },
    ore_black: { name: '黑色礦石', en: 'Black Ore', faction: 'darklore' },
    /* 以下是副本會掉、但 Episode 0 的卡片還用不到的素材（之後章節才會用） */
    stockings: { name: '襪子', en: 'Stockings', unused: true },
    shoes:     { name: '鞋子', en: 'Shoes',     unused: true },
    ribbon:    { name: '緞帶', en: 'Ribbon',    unused: true }
  };

  var FACTION_ORE = {
    vita: 'ore_green', academy: 'ore_red', crux: 'ore_blue', darklore: 'ore_black'
  };
  SG.factionOre = function (f) { return FACTION_ORE[f] || null; };

  SG.matName = function (key) {
    var m = SG.MATERIALS[key];
    return m ? m.name : key;
  };

  /* 一張卡的合成配方，回傳 [{mat, n}, …]；無法合成則回傳 null */
  SG.recipeOf = function (card) {
    if (typeof card === 'string') card = SG.getCard(card);
    if (!card) return null;
    var ore = FACTION_ORE[card.faction];
    if (!ore) return null;                       // 無所屬／NPC 卡不能合成
    if (card.npc) return null;                   // 副本 BOSS 卡只能靠通關取得
    if (card.type === 'character') {
      return [{ mat: 'sword', n: 30 }, { mat: ore, n: 20 }, { mat: 'ore_white', n: 50 }];
    }
    var base = card.type === 'spell' ? 'book' : 'cat_doll';
    return [{ mat: base, n: 3 }, { mat: ore, n: 2 }, { mat: 'ore_white', n: 2 }];
  };

  /* 配方是否湊得齊 */
  SG.canCraft = function (card, bag) {
    var r = SG.recipeOf(card);
    if (!r) return false;
    for (var i = 0; i < r.length; i++) {
      if ((bag[r[i].mat] || 0) < r[i].n) return false;
    }
    return true;
  };
})();
