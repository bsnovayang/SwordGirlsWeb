/* ═══════════════════════════════════════════════════════════
   Episode 6 卡片效果（40 張裡有效果的 39 張）

   撰寫原則跟 effects.js 一樣：先 say() 宣告效果發動，再做事。

   ★ 這一章繁中 wiki 完全沒有收錄，卡名與效果文都是本專案自譯
     （見 tools/ep6_names.json、ep6_effects.json）。
   ═══════════════════════════════════════════════════════════ */
var SG = window.SG || (window.SG = {});

(function () {
  'use strict';

  function folls(field) {
    var r = [];
    for (var i = 0; i < 5; i++) if (field[i] && field[i].type === 'follower') r.push(field[i]);
    return r;
  }
  function cards(field) {
    var r = [];
    for (var i = 0; i < 5; i++) if (field[i]) r.push(field[i]);
    return r;
  }
  function nameHas(c, s) { return !!c && c.name.indexOf(s) >= 0; }
  function isFac(c, f) { return !!c && c.faction === f; }
  function pick(ctx, list, n) {
    var pool = list.slice(), out = [];
    while (pool.length && out.length < n) out.push(pool.splice(Math.floor(ctx.rnd() * pool.length), 1)[0]);
    return out;
  }
  function maxBy(list, f) {
    var best = null;
    list.forEach(function (c) { if (!best || f(c) > f(best)) best = c; });
    return best;
  }
  function buff(ctx, list, d, text) {
    if (!list.length) return false;
    ctx.say(text);
    list.forEach(function (c) { ctx.mod(c, d); });
    return true;
  }
  function up(n) { return Math.ceil(n); }
  function down(n) { return Math.floor(n); }

  /* 「防禦前，尚未行動時 攻/體 +1」—— 兩張同款 */
  function activeBonus() {
    return {
      beforeDefend: function (c) {
        if (c.self.activated) return;
        c.say('防禦前　此卡尚未行動　→　攻/體 +1');
        c.mod(c.self, { atk: 1, sta: 1 });
      }
    };
  }

  /* 「防禦前，與攻擊者不同陣營 → 攻擊者 攻/體 −1、此卡 攻/體 +1」—— 兩張同款 */
  function crossFaction() {
    return {
      beforeDefend: function (c) {
        var a = c.attacker;
        if (!a || a.faction === c.self.faction) return;
        c.say('防禦前　與攻擊隨從不同陣營　→　攻擊者 攻/體 −1，此卡 攻/體 +1');
        c.mod(a, { atk: -1, sta: -1 });
        c.mod(c.self, { atk: 1, sta: 1 });
      }
    };
  }

  var E6 = {

    /* ═════════ 公立學校 ═════════ */

    vita_principal_treanna: {
      turnStart: function (c) {
        var t = pick(c, folls(c.myField), 1)[0];
        if (!t) return;
        var had = c.hasSkill(t);
        c.say('我方隨機 1 張隨從　攻/體 +2　並失去能力');
        c.mod(t, { atk: 2, sta: 2 });
        if (!had) return;
        c.loseSkills(t);
        c.say('該隨從原本有能力　→　SIZE −1');
        c.mod(t, { size: -1 });
      }
    },

    council_roroa: {
      beforeAttack: function (c) {
        var d = c.defender;
        if (!d || !c.hasSkill(d)) return;
        c.say('攻擊前　防禦隨從失去能力（直到下一回合開始）');
        c.loseSkills(d);
        c.grantSkill(d, '__ep3_restore');
      }
    },

    cook_club_elsfi: activeBonus(),

    council_coordinator: {
      beforeDefend: function (c) {
        var t = folls(c.myField).filter(function (x) { return isFac(x, 'vita'); });
        if (!buff(c, t, { atk: 2 }, '防禦前　我方「公立」隨從全體　攻 +2（發動後失去這個能力）')) return;
        c.loseSkills();
      }
    },

    tennis_lure: {
      turnStart: function (c) {
        var a = pick(c, folls(c.myField), 1)[0];
        var b = pick(c, folls(c.foeField), 1)[0];
        if (!a || !b) return;
        c.say('我方與敵方各隨機 1 張隨從　互換能力');
        var t = a.skills;
        a.skills = b.skills;
        b.skills = t;
      }
    },

    campus_waitress: {
      beforeDefend: function (c) {
        if (c.self.atk < 1) return;
        c.say('防禦前　攻 −1 / 防 +1 / 體 +1');
        c.mod(c.self, { atk: -1, def: 1, sta: 1 });
      }
    },

    council_exec_maron: crossFaction(),

    event_preparation: {
      spell: function (c) {
        if (!c.myChar) return;
        var f = folls(c.myField);
        var same = f.some(function (x) { return x.faction === c.myChar.faction; });
        var diff = f.some(function (x) { return x.faction !== c.myChar.faction; });
        if (!same || !diff) return;
        buff(c, pick(c, f, 2), { atk: 3, sta: 3 },
             '場上同時有與角色同／不同陣營的隨從　→　隨機 2 張　攻 +3 / 體 +3');
      }
    },

    victory_proclamation: {
      spell: function (c) {
        if (!c.myHand.length || !c.foeHand.length) return;
        c.say('交換雙方手牌的第一張');
        c.swapHand(0, 0);
      }
    },

    topsy_turvy: {
      spell: function (c) {
        var seen = {}, n = 0;
        c.myHand.forEach(function (x) { if (!seen[x.faction]) { seen[x.faction] = 1; n++; } });
        buff(c, pick(c, folls(c.myField), 1), { atk: n + 1, sta: n + 1 },
             '我方隨機 1 張隨從　攻/體 +' + (n + 1) + '（1 ＋ 手牌陣營種類 ' + n + '）');
      }
    },

    inhuman_creature: {
      spell: function (c) {
        if (!folls(c.myField).length || !folls(c.foeField).length) return;
        var a = pick(c, folls(c.myField), 1)[0];
        var b = pick(c, folls(c.foeField), 1)[0];
        c.say('雙方各隨機 1 張隨從送入墓地');
        c.discard(a);
        c.discard(b);
      }
    },

    preserver_of_rules: {
      spell: function (c) {
        var n = c.myHand.length;
        var t = pick(c, folls(c.myField).filter(function (x) { return isFac(x, 'vita'); }), 1)[0];
        if (!t) return;
        c.say('我方隨機 1 張「公立」隨從　攻 +' + (n + 1) + ' / 體 +' + Math.max(0, n - 1));
        c.mod(t, { atk: n + 1, sta: Math.max(0, n - 1) });
      }
    },

    morals_crackdown: {
      spell: function (c) {
        if (!folls(c.myField).length) return;
        c.say('雙方所有隨從　防禦 = 0，體力減少防禦的下降量');
        folls(c.myField).concat(folls(c.foeField)).forEach(function (x) {
          var d = x.def;
          if (!d) return;
          c.set(x, 'def', 0);
          c.mod(x, { sta: -d });
        });
      }
    },

    encounter: {
      spell: function (c) {
        var n = 0;
        [[c.me, c.myField], [c.foe, c.foeField]].forEach(function (pair) {
          cards(pair[1]).forEach(function (x) {
            if (x.type === 'spell' && x !== c.self) { c.discard(x); n++; }
          });
        });
        c.say('雙方場上 ' + n + ' 張咒語送入墓地');
        buff(c, pick(c, folls(c.myField), 2), { atk: n + 1, sta: n + 1 },
             '我方隨機 2 張隨從　攻/體 +' + (n + 1));
      }
    },

    /* ═════════ 私立學校 ═════════ */

    pursuit_of_perfection: {
      spell: function (c) {
        var t = folls(c.myField).filter(function (x) {
          return isFac(x, 'academy') && x.size <= 2;
        });
        if (!t.length) return;
        var da = 0, ds = 0;
        c.say('我方 SIZE 2 以下的「私立」隨從　攻 = 1 / 體 = 1');
        t.forEach(function (x) {
          da += Math.max(0, x.atk - 1);
          ds += Math.max(0, x.sta - 1);
          c.set(x, 'atk', 1);
          c.set(x, 'sta', 1);
        });
        var h = c.myHand.filter(function (x) {
          return x.type === 'follower' && isFac(x, 'academy');
        })[0];
        if (!h) return;
        c.say('手牌第一張「私立」隨從　攻 +' + up(da / 2) + ' / 體 +' + up(ds / 2));
        c.modHand(h, { atk: up(da / 2), sta: up(ds / 2) });
      }
    },

    black_magic_preparation: {
      spell: function (c) {
        var t = c.myHand.filter(function (x) { return x.type === 'spell'; });
        if (!t.length) return;
        c.say('手牌所有咒語　SIZE −1');
        t.forEach(function (x) { c.modHand(x, { size: -1 }); });
      }
    },

    ladys_wrath: {
      spell: function (c) {
        var idx = -1;
        for (var i = c.myHand.length - 1; i >= 0; i--) {
          if (isFac(c.myHand[i], 'academy')) { idx = i; break; }
        }
        if (idx < 0) return;
        c.say('手牌最後一張「私立」卡「' + c.myHand[idx].name + '」送入墓地');
        c.discardHand(idx);
        buff(c, pick(c, folls(c.foeField), 1), { atk: -4, sta: -4 },
             '敵方隨機 1 張隨從　攻 −4 / 體 −4');
      }
    },

    shoot: {
      spell: function (c) {
        if (!c.myHand.length) return;
        c.exileHand(c.myHand.length - 1);
        c.say('手牌最後一張從遊戲中除外');
        if (!c.foeHand.length) return;
        if (c.copyToHand(c.foeHand[0])) {
          c.say('把對手手牌第一張「' + c.foeHand[0].name + '」複製一份加入我方手牌');
        }
      }
    },

    servant_of_clarice: {
      spell: function (c) {
        if (!c.millDeck(c.me, 1).length) return;
        c.say('牌組第一張送入墓地');
        if (c.deckTopToBottom(c.me)) c.say('牌組第二張（現在的第一張）放到牌組下方');
        var t = pick(c, folls(c.foeField), 1)[0];
        if (!t) return;
        c.say('敵方隨機 1 張隨從放到對手牌組下方');
        c.toDeckBottom(t);
      }
    },

    ladys_attendant: {
      spell: function (c) {
        var a = c.myHand.length, b = c.foeHand.length;
        buff(c, pick(c, folls(c.myField).filter(function (x) { return isFac(x, 'academy'); }), 2),
             { atk: a, sta: b + 1 },
             '我方隨機 2 張「私立」隨從　攻 +' + a + '（我方手牌）/ 體 +' + (b + 1) + '（對手手牌 +1）');
      }
    },

    push_forward: {
      spell: function (c) {
        buff(c, pick(c, folls(c.foeField), 2), { atk: -4, sta: -4 },
             '敵方隨機 2 張隨從　攻 −4 / 體 −4');
        if (c.self.size <= 1) {
          c.say('此卡 SIZE 1　→　從遊戲中除外');
          c.exileSelf();
        } else {
          c.say('此卡 SIZE = 1 並進入行動終了');
          c.set(c.self, 'size', 1);
          c.deactivate(c.self);
        }
      }
    },

    /* ═════════ 南十字 ═════════ */

    supply_request: {
      spell: function (c) {
        var t = maxBy(folls(c.myField), function (x) { return x.size; });
        if (!t || !c.myHand.length) return;
        var n = t.size - (c.myHand[0].size || 0);
        if (n <= 0) return;
        c.say('我方 SIZE 最高的隨從　SIZE −' + n + '（與手牌第一張的 SIZE 差）');
        c.mod(t, { size: -n });
      }
    },

    miscalculation: {
      spell: function (c) {
        if (c.myHand.length > 3) return;
        var got = c.deckToHand(function (d) { return d && d.type === 'follower'; },
                               4 - c.myHand.length);
        if (got.length) c.say('從牌組補了 ' + got.length + ' 張隨從到手牌（補到 4 張）');
      }
    },

    passcode: {
      spell: function (c) {
        var cnt = {};
        cards(c.myField).forEach(function (x) { cnt[x.size] = (cnt[x.size] || 0) + 1; });
        var sz = null;
        Object.keys(cnt).forEach(function (k) { if (cnt[k] >= 3 && sz === null) sz = +k; });
        if (sz === null) return;
        buff(c, folls(c.myField).filter(function (x) { return x.size === sz; }),
             { atk: 3, sta: 3 }, '場上有 3 張以上 SIZE ' + sz + ' 的卡　→　該 SIZE 的隨從　攻 +3 / 體 +3');
      }
    },

    vacation: {
      spell: function (c) {
        var t = maxBy(folls(c.myField).filter(function (x) { return isFac(x, 'crux'); }),
                      function (x) { return x.sta; });
        if (!t) return;
        var before = t.sta, after = up(before / 2);
        c.say('我方體力最高的「南十字」隨從　體力減半（' + before + ' → ' + after + '）');
        c.set(t, 'sta', after);
        var gain = up((before - after) / 2);
        if (gain) { c.say('防禦 +' + gain + '（減少量的一半）'); c.mod(t, { def: gain }); }
      }
    },

    warriors_resolve: {
      spell: function (c) {
        var a = c.myHand.length, b = Math.max(0, SG.CONST.HAND_MAX - a);
        var hi = Math.max(a, b), lo = Math.max(0, Math.min(a, b) - 1);
        buff(c, pick(c, folls(c.myField).filter(function (x) { return isFac(x, 'crux'); }), 2),
             { atk: hi, sta: lo },
             '我方隨機 2 張「南十字」隨從　攻 +' + hi + ' / 體 +' + lo);
      }
    },

    beach_research: {
      spell: function (c) {
        buff(c, pick(c, folls(c.myField), 2), { size: -1, atk: 1, def: 1, sta: 1 },
             '我方隨機 2 張隨從　SIZE −1 / 攻 +1 / 防 +1 / 體 +1');
      }
    },

    shock: {
      spell: function (c) {
        buff(c, folls(c.myField), { sta: 5 }, '我方所有隨從　體力 +5');
        buff(c, folls(c.foeField), { atk: -2 }, '敵方所有隨從　攻擊力 −2');
        if (isFac(c.myChar, 'crux')) {
          buff(c, folls(c.myField), { atk: 1 }, '角色是「南十字」　→　我方所有隨從再 攻 +1');
        }
      }
    },

    /* ═════════ 暗黑族 ═════════ */

    scardel_unit_felgus: {
      beforeAttack: function (c) {
        var d = c.defender;
        if (!d || !d.def) return;
        c.say('攻擊前　防禦隨從體力 −' + d.def + '（其防禦力）');
        c.mod(d, { sta: -d.def });
      }
    },

    crescent_unit_azoth: {
      beforeDefend: function (c) {
        var n = cards(c.myField).filter(function (x) { return nameHas(x, '斯卡迪魯'); }).length;
        if (!n) return;
        c.say('防禦前　體力 +' + n + '（我方「斯卡迪魯」卡片數）');
        c.mod(c.self, { sta: n });
      }
    },

    gs_spy: activeBonus(),

    gs_fighting_instructor: {
      turnStart: function (c) {
        var f = folls(c.myField);
        buff(c, f.filter(function (x) { return nameHas(x, 'GS'); }), { atk: 1, sta: 1 },
             '我方「GS」隨從　攻/體 +1');
        buff(c, f.filter(function (x) { return !nameHas(x, 'GS'); }), { atk: -1, sta: -1 },
             '我方非「GS」隨從　攻/體 −1');
      }
    },

    lightning_witch: {
      turnStart: function (c) {
        var down2 = c.rnd() < 0.5;
        c.say('回合開始　此卡 SIZE ' + (down2 ? '−2' : '+1') + '（五成機率）');
        c.mod(c.self, { size: down2 ? -2 : 1 });
      }
    },

    creepy_witch: {
      turnStart: function (c) {
        if (c.self.def <= 0) return;
        c.say('回合開始　此卡防禦 −1');
        c.mod(c.self, { def: -1 });
      },
      beforeAttack: function (c) {
        if (c.self.def < 1) return;
        var n = c.self.def;
        c.say('攻擊前　攻/體 +' + n + '（此卡防禦力，發動後暫時失去這個能力）');
        c.mod(c.self, { atk: n, sta: n });
        c.loseSkills();
        c.grantSkill(c.self, '__ep3_restore');
      }
    },

    gs_1st_star: crossFaction(),

    crux_underground: {
      spell: function (c) {
        var first = cards(c.foeField)[0];
        if (!first) return;
        var sz = first.size;
        var n = cards(c.foeField).filter(function (x) { return x.size === sz; }).length;
        buff(c, folls(c.foeField).filter(function (x) { return x.size === sz; }),
             { atk: -n, sta: -n },
             '敵方與第一張同 SIZE（' + sz + '）的隨從　攻/體 −' + n);
      }
    },

    recruitment_act: {
      spell: function (c) {
        var t = pick(c, folls(c.myField), 1)[0];
        if (!t) return;
        c.say('我方隨機 1 張隨從「' + t.name + '」送入墓地　→　對手生命 −1、可重洗次數 −1');
        c.discard(t);
        c.life(c.foe, -1);
        c.shuffles(c.foe, -1);
      }
    },

    marionette: {
      spell: function (c) {
        var t = folls(c.myField)[0];
        if (!t) return;
        var n = up((t.atk + t.sta) / 2);
        c.say('我方第一張隨從　攻/體 = ' + n + '（原本 攻＋體 的一半）');
        c.set(t, 'atk', n);
        c.set(t, 'sta', n);
      }
    },

    mischief: {
      spell: function (c) {
        var n = c.myGrave.filter(function (x) { return x.name === '惡作劇'; }).length * 3;
        if (!n) return;
        buff(c, folls(c.foeField), { sta: -n },
             '敵方所有隨從　體力 −' + n + '（墓地「惡作劇」張數 ×3）');
      }
    }
  };

  for (var k in E6) SG.Effects[k] = E6[k];
})();
