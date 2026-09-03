/* ═══════════════════════════════════════════════════════════
   AI 下牌決策（P1 版：貪婪填場）
   ═══════════════════════════════════════════════════════════ */
var SG = window.SG || (window.SG = {});

(function () {
  'use strict';

  /* 單張牌的價值評估：以「每點 SIZE 換到多少戰力」為主 */
  function score(c) {
    if (c.type === 'spell') return 3.2;                 // 法術暫時給固定中等權重
    var power = c.atk * 1.6 + c.sta * 0.7 + c.def * 1.1;
    return power / Math.max(1, c.size);
  }

  /* 回傳事件陣列；AI 會自行完成整個下牌階段 */
  SG.aiPlay = function (g, pi) {
    var ev = [], p = g.players[pi];

    /* 手牌完全放不下、且場上空 → 用一次洗牌換手 */
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

  function hasPlayable(g, pi) {
    var p = g.players[pi];
    for (var i = 0; i < p.hand.length; i++) if (SG.canPlace(g, pi, i)) return true;
    return false;
  }
})();
