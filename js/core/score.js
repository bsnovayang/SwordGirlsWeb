/* ═══════════════════════════════════════════════════════════
   戰鬥評價與掉落計算

   設計出發點：**一場勝利 ≈ 做得出一張基本卡**。

   實際量過的配方成本（每張，同陣營）：
       Episode 0 普通卡   7 單位   （貓玩偶3 ＋ 陣營礦石2 ＋ 白礦石2）
       Episode 1 普通卡  12 單位   （貓玩偶4 ＋ 陣營礦石3 ＋ 白礦石3 ＋ 竹2）
       罕見 19｜稀有 44｜雙稀有 68

   所以基準訂在「平均一場拿到約 12 單位」，打得漂亮更多、打得勉強更少。

   評價項目參考遊戲王 Duel Links 的結算加分：
       勝利 / 生命殘量 / 速攻 / 殲滅 / 完封
   再乘上副本難度與樓層深度的倍率 —— 越深越賺，長副本才不會吃虧。

   ★ 陣營礦石一律發「你角色的陣營」，不再隨機四選一。
     隨機的話期望值只有 1/4，是整個資源循環最大的瓶頸。
   ═══════════════════════════════════════════════════════════ */
var SG = window.SG || (window.SG = {});

(function () {
  'use strict';

  /* 難度倍率 */
  var TIER_MUL = { Easy: 1, Normal: 1.35, Hard: 1.7, Extra: 2 };

  /* 分數換素材的除數：調這個等於調整整體發放量 */
  var PER_UNIT = 28;

  /* 掉落組成（比例）。dungeon ＝ 該副本的專屬素材，faction ＝ 你角色陣營的礦石 */
  var MIX = [
    { key: 'dungeon',  w: 0.20 },
    { key: 'faction',  w: 0.25 },
    { key: 'ore_white', w: 0.20 },
    { key: 'cat_doll', w: 0.20 },
    { key: 'book',     w: 0.15 }
  ];

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  /* ── 戰鬥評價 ──────────────────────────────────────────
     g   ＝ 結束的對局（g.winner 必須是 0，也就是玩家贏）
     opt ＝ { dungeon, floor, floors, isBoss }
     回傳 { total, lines:[{label,n}], mul, mulLines:[{label,n}] }   */
  SG.battleScore = function (g, opt) {
    opt = opt || {};
    var me = g.players[0], ch = me.character;
    var life = Math.max(0, ch.life), max = ch.maxLife || life || 1;
    var turns = Math.max(1, g.turn);
    var kills = (g.stats && g.stats.kills && g.stats.kills[1]) || 0;

    var lines = [];
    lines.push({ label: '勝利', n: 100 });
    lines.push({ label: '生命殘量 ' + life + '/' + max,
                 n: Math.round(100 * life / max) });
    /* 速攻：第 1 回合結束滿分，每多一回合 -12，第 9 回合起歸零 */
    lines.push({ label: turns + ' 回合結束', n: Math.max(0, 100 - (turns - 1) * 12) });
    if (kills) lines.push({ label: '擊破 ' + kills + ' 張隨從', n: 12 * kills });
    if (life >= max) lines.push({ label: '完封（生命全滿）', n: 60 });

    var base = lines.reduce(function (s, l) { return s + l.n; }, 0);

    var mulLines = [];
    var tier = (opt.dungeon && opt.dungeon.tier) || 'Easy';
    var tm = TIER_MUL[tier] || 1;
    if (tm !== 1) mulLines.push({ label: '難度 ' + tier, n: tm });

    /* 樓層倍率：第 1 層 ×1.0，最深層 ×1.5 —— 越深越賺 */
    var fm = 1;
    if (opt.floors > 1 && opt.floor >= 1) {
      fm = 1 + 0.5 * clamp((opt.floor - 1) / (opt.floors - 1), 0, 1);
      fm = Math.round(fm * 100) / 100;
      if (fm !== 1) mulLines.push({ label: '第 ' + opt.floor + ' 層', n: fm });
    }
    var bm = opt.isBoss ? 1.5 : 1;
    if (opt.isBoss) mulLines.push({ label: 'BOSS 戰', n: bm });

    var mul = tm * fm * bm;
    return {
      total: Math.round(base * mul),
      base: base, mul: Math.round(mul * 100) / 100,
      lines: lines, mulLines: mulLines
    };
  };

  /* ── 分數 → 素材 ──────────────────────────────────────
     score   ＝ battleScore().total
     dg      ＝ 副本（取 dg.ore 當專屬素材）
     faction ＝ 玩家角色的陣營（決定拿哪種陣營礦石）              */
  SG.scoreDrops = function (score, dg, faction) {
    var units = Math.max(1, Math.round(score / PER_UNIT));
    var ore = SG.factionOre(faction);
    var out = {}, i, m, mat;

    for (i = 0; i < MIX.length; i++) {
      m = MIX[i];
      mat = m.key === 'dungeon' ? (dg && dg.ore) || 'ore_white'
          : m.key === 'faction' ? (ore || 'ore_white')
          : m.key;
      out[mat] = (out[mat] || 0) + units * m.w;
    }

    /* 先無條件捨去，剩下的餘額按小數大小補回去，總量才會剛好等於 units */
    var keys = Object.keys(out), frac = [], sum = 0;
    keys.forEach(function (k) {
      var n = Math.floor(out[k]);
      frac.push({ k: k, f: out[k] - n });
      out[k] = n; sum += n;
    });
    frac.sort(function (a, b) { return b.f - a.f; });
    for (i = 0; sum < units && i < frac.length; i++, sum++) out[frac[i].k]++;

    return keys.filter(function (k) { return out[k] > 0; })
               .map(function (k) { return { mat: k, n: out[k] }; });
  };

  /* 給測試與調校用 */
  SG._score = { PER_UNIT: PER_UNIT, MIX: MIX, TIER_MUL: TIER_MUL };
})();
