/* ═══════════════════════════════════════════════════════════
   卡包（抽卡）與卡片分解

   為什麼要有這個：合成是「穩定累積、拿得到想要的」，
   卡包是「立刻開出東西」的即時回饋。兩者互補 ——
   合成負責補齊缺的那幾張，卡包負責讓每一場都有驚喜。

   點數：打贏一關 +1，打贏 BOSS +2。一包 1 點，十連抽 10 點。

   ★ 卡包依「陣營 × 章節」分開，不是一個大池。
     全部混在一起的話，指定一張雙稀有要 267 包，而同一張用合成只要 6 場 ——
     卡包會完全沒有存在意義。分開之後縮到約 33 包，
     仍然是「合成精準、卡包碰運氣」的分工，但不再是天壤之別。

   ★ 副本通關 10 次的獎勵角色卡不會進卡池 ——
     那是通關的專屬獎勵，能抽到的話就沒意義了。

   ★ Episode 2 的卡包要先通關一座 Normal 難度的副本才開放。
   ═══════════════════════════════════════════════════════════ */
var SG = window.SG || (window.SG = {});

(function () {
  'use strict';

  var CARDS_PER_PACK = 3;
  var TEN_COST = 10;

  /* 稀有度權重。分層跟合成配方用的是同一套（依分數）。 */
  var WEIGHT = { 'Common': 66, 'Uncommon': 23, 'Rare': 9, 'Double Rare': 2 };

  /* 保底：連續這麼多張沒開出稀有以上，下一張保證稀有以上 */
  var PITY = 30;

  var HIGH = { 'Rare': 1, 'Double Rare': 1 };

  function rarityOf(c) {
    if (c.rarity) return c.rarity;
    var p = c.points || 0;
    return p >= 50 ? 'Double Rare' : p >= 13 ? 'Rare' : p >= 3 ? 'Uncommon' : 'Common';
  }
  SG.rarityOf = rarityOf;

  /* 卡包種類：陣營 × 章節。值為 null／'' ＝ 不限。 */
  SG.PACK_FACTIONS = ['', 'vita', 'academy', 'crux', 'darklore'];
  /* 卡包的章節選項＝資料裡實際有的章節（動態，加新章節不用改這裡）。
     值一律是字串，'' 代表不限 —— EX1／EX2 這種特別彈不是數字。 */
  SG.packEpisodes = function () {
    var seen = {}, out = [];
    SG.collectibleCards().forEach(function (c) {
      var e = String(c.ep === undefined || c.ep === null ? 0 : c.ep);
      if (!seen[e]) { seen[e] = 1; out.push(e); }
    });
    out.sort(function (a, b) {
      var na = /^\d+$/.test(a), nb = /^\d+$/.test(b);
      if (na && nb) return +a - +b;
      if (na !== nb) return na ? -1 : 1;
      return a.localeCompare(b);
    });
    return [''].concat(out);
  };

  /* Episode 2 要先通關一座 Normal 副本才開放 */
  SG.packEpisodeLocked = function (ep, save) {
    if (String(ep) !== '2') return null;
    var d = (save || (SG.Save && SG.Save.data) || {}).dungeons || {};
    var ok = (SG.DUNGEONS || []).some(function (dg) {
      return dg.tier !== 'Easy' && d[dg.id] && d[dg.id].clears > 0;
    });
    return ok ? null : '要先通關一座 Normal 難度的副本';
  };

  /* 卡池：可收集、不是通關獎勵卡，再依 filter 篩選
     filter ＝ { faction, ep }，欄位留空就是不限                */
  function pool(filter) {
    filter = filter || {};
    var rewards = {};
    (SG.DUNGEONS || []).forEach(function (d) { rewards[d.reward] = 1; });
    return SG.collectibleCards().filter(function (c) {
      if (rewards[c.slug]) return false;
      /* 無所屬的卡任何牌組都放得進去，所以每個陣營包都該有 */
      if (filter.faction && c.faction !== filter.faction && c.faction !== 'neutral') return false;
      if (filter.ep !== '' && filter.ep !== null && filter.ep !== undefined &&
          String(c.ep === undefined || c.ep === null ? 0 : c.ep) !== String(filter.ep)) return false;
      return true;
    });
  }
  SG.packPool = pool;

  /* 這個卡包各稀有度的張數與「抽到指定一張」的期望包數，給 UI 顯示 */
  SG.packOdds = function (filter) {
    var by = {};
    pool(filter).forEach(function (c) {
      var r = rarityOf(c);
      by[r] = (by[r] || 0) + 1;
    });
    return Object.keys(WEIGHT).map(function (r) {
      var n = by[r] || 0;
      return { rarity: r, n: n, weight: WEIGHT[r],
               packs: n ? Math.round(1 / ((WEIGHT[r] / 100 / n) * CARDS_PER_PACK)) : 0 };
    });
  };

  /* 依稀有度分組 */
  function byRarity(list) {
    var m = {};
    list.forEach(function (c) {
      var r = rarityOf(c);
      (m[r] = m[r] || []).push(c);
    });
    return m;
  }

  /* 抽一張。rnd ＝ 0~1 的亂數函式；forceHigh ＝ 保底，強制稀有以上 */
  function pullOne(groups, rnd, forceHigh) {
    var keys = Object.keys(WEIGHT).filter(function (k) {
      return groups[k] && groups[k].length && (!forceHigh || HIGH[k]);
    });
    if (!keys.length) keys = Object.keys(groups);
    var total = keys.reduce(function (s, k) { return s + (WEIGHT[k] || 1); }, 0);
    var r = rnd() * total, k, i;
    for (i = 0; i < keys.length; i++) {
      r -= (WEIGHT[keys[i]] || 1);
      if (r <= 0) { k = keys[i]; break; }
    }
    if (!k) k = keys[keys.length - 1];
    var g = groups[k];
    return g[Math.floor(rnd() * g.length)];
  }

  /* ── 抽卡 ─────────────────────────────────────────────
     n     ＝ 要抽幾包
     state ＝ { sinceRare } 保底計數，會被就地更新
     rnd   ＝ 亂數函式（測試可以傳固定序列進來）
     回傳抽到的卡陣列（依抽出順序）                            */
  SG.pullPacks = function (n, state, rnd, filter) {
    rnd = rnd || Math.random;
    state = state || { sinceRare: 0 };
    var groups = byRarity(pool(filter));
    var out = [], i, guaranteed = n >= 10;   // 十連保底至少一張稀有以上
    var gotHigh = false;
    var totalCards = n * CARDS_PER_PACK;

    for (i = 0; i < totalCards; i++) {
      var lastOfTen = guaranteed && !gotHigh && i === totalCards - 1;
      var force = lastOfTen || state.sinceRare >= PITY;
      var c = pullOne(groups, rnd, force);
      if (!c) break;
      if (HIGH[rarityOf(c)]) { gotHigh = true; state.sinceRare = 0; }
      else state.sinceRare++;
      out.push(c);
    }
    return out;
  };

  /* ── 分解 ─────────────────────────────────────────────
     回收配方的 1/4（無條件捨去），至少會回 1 個素材。
     只有「超過牌組上限」的多餘張數可以分解 —— 不會讓玩家把
     還組得進牌組的卡拆掉，避免自己把自己卡死。                 */
  SG.disenchantValue = function (card) {
    if (typeof card === 'string') card = SG.getCard(card);
    var r = card && SG.recipeOf(card);
    if (!r) return null;
    var out = r.map(function (m) { return { mat: m.mat, n: Math.floor(m.n / 4) }; })
               .filter(function (m) { return m.n > 0; });
    if (!out.length) {
      /* 配方太便宜，除以 4 全部歸零 —— 至少回一個最大宗的素材 */
      var big = r.slice().sort(function (a, b) { return b.n - a.n; })[0];
      out = [{ mat: big.mat, n: 1 }];
    }
    return out;
  };

  /* 這張卡有幾張是多餘的（可分解） */
  SG.spareCount = function (slug, owned) {
    var card = SG.getCard(slug);
    if (!card) return 0;
    var have = (owned || {})[slug] || 0;
    return Math.max(0, have - (card.limit || 3));
  };

  SG._pack = { CARDS_PER_PACK: CARDS_PER_PACK, TEN_COST: TEN_COST,
               WEIGHT: WEIGHT, PITY: PITY };
})();
