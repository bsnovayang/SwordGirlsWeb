/* ═══════════════════════════════════════════════════════════
   AI 下牌決策

   兩種強度：
     basic —— 副本用。原作的副本 AI 本來就不強，難度來自 BOSS 的角色能力
               與 LIFE（諾爾德 40、卡涅魯／蓋托 50，玩家只有 30），
               玩家的優勢在出牌策略。這裡刻意維持簡單，讓副本好刷素材。
     smart —— 天梯用。不寫死每張卡的價值，而是「把候選方案推演到回合結束」
               再挑分數最高的，所以它自然懂得咒語與效果的實際效益，
               也懂得格位順序（很多效果指名 Slot）。

   ★ 公平性：原作是雙方同時下牌，誰都看不到對方這回合放了什麼。
     本作流程上 AI 是在玩家按下「確定」之後才決策的，所以它「看得到」對方蓋的牌 ——
     那是原作沒有的資訊優勢（實測後下牌方會多贏 13 個百分點）。
     因此推演時會先把對手本回合蓋下的牌整批移除，改用「對方大概會下 1~3 張
     通用隨從」的機率模型。AI 的決策完全不依賴對方實際下了什麼，
     test/ai.js 有專門的測試驗證這一點。
   ═══════════════════════════════════════════════════════════ */
var SG = window.SG || (window.SG = {});

(function () {
  'use strict';

  /* ═════════ 基礎 AI（副本） ═════════ */

  /* 單張牌的價值：每點 SIZE 換到多少戰力 */
  function score(c) {
    if (c.type === 'spell') return 3.2;
    var power = c.atk * 1.6 + c.sta * 0.7 + c.def * 1.1;
    return power / Math.max(1, c.size);
  }

  function hasPlayable(g, pi) {
    var p = g.players[pi];
    for (var i = 0; i < p.hand.length; i++) if (SG.canPlace(g, pi, i)) return true;
    return false;
  }

  SG.aiPlay = function (g, pi) {
    var ev = [], p = g.players[pi];

    if (p.shuffles > 0 && SG.fieldSize(p.field) === 0 && !hasPlayable(g, pi)) {
      var s = SG.shuffleHand(g, pi);
      if (s) ev.push(s);
    }

    var guard = 0;
    while (guard++ < 10) {
      var best = -1, bestScore = -1;
      for (var i = 0; i < p.hand.length; i++) {
        if (!SG.canPlace(g, pi, i)) continue;
        var sc = score(p.hand[i]);
        if (sc > bestScore) { bestScore = sc; best = i; }
      }
      if (best < 0) break;
      var e = SG.place(g, pi, best);
      if (!e) break;
      ev.push(e);
    }
    p.ready = true;
    return ev;
  };

  /* ═════════ 天梯 AI（推演搜尋） ═════════ */

  var PLANS = 48;      // 候選下牌方案數
  var ROLLOUTS = 5;    // 每個方案推演幾次（戰鬥有隨機性，要平均）

  /* 對手蓋著的牌用這個當替身：EP0 隨從的中位水準 */
  var UNKNOWN = { size: 3, atk: 5, def: 1, sta: 8 };

  function boardValue(field) {
    var v = 0;
    for (var i = 0; i < 5; i++) {
      var c = field[i];
      if (!c || c.type !== 'follower') continue;
      /* 減去 size：那是這張卡陣亡時主人要付的生命 */
      v += c.atk * 1.2 + c.sta * 0.5 + c.def * 0.8 - c.size * 0.8;
    }
    return v;
  }

  function stateScore(sim, pi, base) {
    var me = sim.players[pi], foe = sim.players[1 - pi];
    var s = 0;
    s += (base.foeLife - foe.character.life) * 4;    // 打掉對方多少生命
    s -= (base.myLife - me.character.life) * 4;      // 自己掉了多少
    s += boardValue(me.field) - boardValue(foe.field) * 0.8;
    if (sim.over) s += (sim.winner === pi ? 500 : -500);
    return s;
  }

  var ghostSeq = 0;
  function ghost(owner) {
    return {
      uid: 'g' + (ghostSeq++), id: '?', owner: owner, def_: null,
      name: '？', type: 'follower', faction: 'neutral',
      size: UNKNOWN.size, atk: UNKNOWN.atk, def: UNKNOWN.def, sta: UNKNOWN.sta,
      baseAtk: UNKNOWN.atk, baseDef: UNKNOWN.def, baseSta: UNKNOWN.sta,
      activated: false, faceDown: false
    };
  }

  /* 把對手本回合蓋下的牌整批移除，改用機率模型補上「他大概會下幾張」。
     這樣 AI 的決策就完全不依賴對方實際下了什麼 —— 跟原作的同時下牌一致。 */
  function blindOpponent(sim, pi, rnd) {
    var f = sim.players[1 - pi].field;
    for (var i = 0; i < 5; i++) if (f[i] && f[i].faceDown) f[i] = null;
    var n = 1 + Math.floor(rnd() * 3);                 // 假設對方下 1~3 張
    for (var k = 0; k < 5 && n > 0; k++) {
      if (f[k]) continue;
      f[k] = ghost(1 - pi);
      n--;
    }
  }

  /* 一個「方案」＝ 依序要放的手牌 uid */
  function greedyPlan(g, pi) {
    var sim = SG.cloneGame(g, 'plan');
    var plan = [], guard = 0;
    while (guard++ < 6) {
      var p = sim.players[pi], best = -1, bestScore = -1;
      for (var i = 0; i < p.hand.length; i++) {
        if (!SG.canPlace(sim, pi, i)) continue;
        var sc = score(p.hand[i]);
        if (sc > bestScore) { bestScore = sc; best = i; }
      }
      if (best < 0) break;
      plan.push(p.hand[best].uid);
      SG.place(sim, pi, best);
    }
    return plan;
  }

  function randomPlan(g, pi, rnd) {
    var sim = SG.cloneGame(g, 'plan' + rnd());
    var order = sim.players[pi].hand.map(function (c) { return c.uid; });
    for (var i = order.length - 1; i > 0; i--) {          // 洗一下順序
      var j = Math.floor(rnd() * (i + 1));
      var t = order[i]; order[i] = order[j]; order[j] = t;
    }
    var cap = 1 + Math.floor(rnd() * 5);                  // 這次最多放幾張
    var plan = [];
    for (var k = 0; k < order.length && plan.length < cap; k++) {
      var h = sim.players[pi].hand, idx = -1;
      for (var m = 0; m < h.length; m++) if (h[m].uid === order[k]) { idx = m; break; }
      if (idx < 0 || !SG.canPlace(sim, pi, idx)) continue;
      plan.push(order[k]);
      SG.place(sim, pi, idx);
    }
    return plan;
  }

  function applyPlan(sim, pi, plan) {
    for (var k = 0; k < plan.length; k++) {
      var h = sim.players[pi].hand, idx = -1;
      for (var m = 0; m < h.length; m++) if (h[m].uid === plan[k]) { idx = m; break; }
      if (idx >= 0) SG.place(sim, pi, idx);
    }
  }

  SG.aiPlaySmart = function (g, pi, opts) {
    opts = opts || {};
    var plans = opts.plans || PLANS;
    var rolls = opts.rollouts || ROLLOUTS;
    var rnd = opts.rnd || Math.random;
    var p = g.players[pi];
    var ev = [];

    /* 一張都放不下又還有洗牌次數 → 換手牌 */
    if (p.shuffles > 0 && SG.fieldSize(p.field) === 0 && !hasPlayable(g, pi)) {
      var sh = SG.shuffleHand(g, pi);
      if (sh) ev.push(sh);
    }

    var base = {
      myLife: p.character.life,
      foeLife: g.players[1 - pi].character.life
    };

    /* 候選方案：貪婪一份 ＋ 隨機若干份 ＋ 什麼都不放 */
    var cands = [greedyPlan(g, pi), []], seen = {};
    seen[cands[0].join(',')] = 1; seen[''] = 1;
    for (var t = 0; t < plans * 3 && cands.length < plans; t++) {
      var pl = randomPlan(g, pi, rnd);
      var sig = pl.join(',');
      if (seen[sig]) continue;
      seen[sig] = 1;
      cands.push(pl);
    }

    /* 每個方案推演 rolls 次取平均 */
    var bestPlan = cands[0], bestScore = -Infinity;
    for (var c = 0; c < cands.length; c++) {
      var total = 0;
      for (var r = 0; r < rolls; r++) {
        var sim = SG.cloneGame(g, 'ai' + c + '_' + r + '_' + rnd());
        blindOpponent(sim, pi, rnd);
        applyPlan(sim, pi, cands[c]);
        SG.resolveTurn(sim);
        total += stateScore(sim, pi, base);
      }
      var avg = total / rolls;
      if (avg > bestScore) { bestScore = avg; bestPlan = cands[c]; }
    }

    /* 套用到真正的對局 */
    for (var k = 0; k < bestPlan.length; k++) {
      var h = p.hand, idx = -1;
      for (var m = 0; m < h.length; m++) if (h[m].uid === bestPlan[k]) { idx = m; break; }
      if (idx < 0) continue;
      var e = SG.place(g, pi, idx);
      if (e) ev.push(e);
    }
    p.ready = true;
    return ev;
  };

  /* 依難度取用哪一種 AI */
  SG.AI = {
    basic: SG.aiPlay,
    smart: SG.aiPlaySmart
  };
  SG.aiFor = function (level) { return SG.AI[level] || SG.aiPlay; };
})();
