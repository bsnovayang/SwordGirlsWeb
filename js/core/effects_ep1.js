/* ═══════════════════════════════════════════════════════════
   Episode 1 卡片效果（咒語 20 張 ＋ 角色卡 1 張）

   撰寫原則跟 effects.js 一樣：先 say() 宣告效果發動，再做事。
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
  function slotFoll(field, n) {
    var c = field[n - 1];
    return (c && c.type === 'follower') ? c : null;
  }
  function firstFoll(field) {
    for (var i = 0; i < 5; i++) if (field[i] && field[i].type === 'follower') return field[i];
    return null;
  }
  function nameHas(c, s) { return !!c && c.name.indexOf(s) >= 0; }
  function isFac(c, f) { return !!c && c.faction === f; }
  function pick(ctx, list, n) {
    var pool = list.slice(), out = [];
    while (pool.length && out.length < n) {
      out.push(pool.splice(Math.floor(ctx.rnd() * pool.length), 1)[0]);
    }
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

  var E1 = {

    /* ═════════ 公立學校 ═════════ */

    shrink: {
      spell: function (c) {
        var t = maxBy(folls(c.foeField), function (x) { return x.size; });
        if (!t) return;
        c.say('敵方 SIZE 最大的隨從　SIZE 與 攻/防/體 減半');
        c.set(t, 'size', Math.floor(t.size / 2));
        c.set(t, 'atk', Math.floor(t.atk / 2));
        c.set(t, 'def', Math.floor(t.def / 2));
        c.set(t, 'sta', Math.floor(t.sta / 2));
      }
    },

    equilibrium: {
      spell: function (c) {
        var my = c.myChar.life, foe = c.foeChar.life;
        if (Math.abs(my - foe) <= 25) {
          var half = Math.floor((my + foe) / 2);
          c.say('雙方生命平分　→　各 ' + half);
          c.setLife(c.me, half);
          c.setLife(c.foe, half);

          /* 場上卡片數量拉成一致：多的一方從後面的格位開始送墓 */
          var mine = cards(c.myField).length, theirs = cards(c.foeField).length;
          if (mine !== theirs) {
            var more = mine > theirs ? c.myField : c.foeField;
            var diff = Math.abs(mine - theirs);
            c.say('場上卡片數拉成一致　→　各 ' + Math.min(mine, theirs) + ' 張');
            for (var i = 4; i >= 0 && diff > 0; i--) {
              if (!more[i] || more[i] === c.self) continue;
              c.discard(more[i]);
              diff--;
            }
          }
        }
        /* 手牌處理：角色是公立 → 只送隨從；否則整手送墓 */
        var onlyFollowers = isFac(c.myChar, 'vita');
        c.say(onlyFollowers ? '角色為「公立」　→　手牌的隨從送墓' : '手牌全部送墓');
        for (var k = c.myHand.length - 1; k >= 0; k--) {
          if (!onlyFollowers || c.myHand[k].type === 'follower') c.discardHand(k);
        }
      }
    },

    rumor_of_order: {
      spell: function (c) {
        var t = maxBy(folls(c.myField).filter(function (x) { return isFac(x, 'vita'); }),
                      function (x) { return x.size; });
        if (!t) return;
        c.say('我方 SIZE 最大的「公立」隨從　體 +2 / SIZE −2');
        c.mod(t, { sta: 2 });
        c.set(t, 'size', Math.max(0, t.size - 2));
      }
    },

    omnivore: {
      spell: function (c) {
        var kinds = {};
        c.myHand.forEach(function (h) { if (h.size != null) kinds[h.size] = 1; });
        var x = Object.keys(kinds).length + 1;
        buff(c, pick(c, folls(c.myField), 2), { sta: x },
             '我方隨機 2 張隨從　體力 +' + x + '（手牌 SIZE 種類 +1）');
      }
    },

    volcano: {
      spell: function (c) {
        var x = c.myHand.filter(function (h) {
          return h.type === 'follower' && isFac(h, 'vita');
        }).length;
        if (!x) return;
        buff(c, pick(c, folls(c.foeField), 1), { atk: -x, def: -x, sta: -x },
             '敵方隨機 1 張隨從　攻/防/體 −' + x + '（手牌中的「公立」隨從數）');
      }
    },

    /* ═════════ 私立學校 ═════════ */

    bind: {
      spell: function (c) {
        buff(c, pick(c, folls(c.foeField), 3), { size: 1 }, '敵方隨機 3 張隨從　SIZE +1');
      }
    },

    curse: {
      spell: function (c) {
        if (!isFac(c.myChar, 'academy')) return;
        buff(c, pick(c, folls(c.foeField), 2), { atk: -2, sta: -2 },
             '角色為「私立」　→　敵方隨機 2 張隨從　攻/體 −2');
      }
    },

    swap_magic: {
      spell: function (c) {
        var mine = slotFoll(c.myField, 3), theirs = firstFoll(c.foeField);
        if (!mine || !theirs) return;
        c.say('我方 Ⅲ 格與敵方第一張隨從　所有數值交換');
        c.swapStats(mine, theirs);
      }
    },

    mass_recall: {
      spell: function (c) {
        var foes = folls(c.foeField).filter(function (x) { return x.size <= 3; });
        var mine = cards(c.myField).filter(function (x) {
          return x !== c.self && !isFac(x, 'academy');
        });
        if (!foes.length && !mine.length) return;
        c.say('敵方 SIZE 3 以下的隨從、我方非「私立」的卡片　全部送墓');
        foes.forEach(function (x) { c.discard(x); });
        mine.forEach(function (x) { c.discard(x); });
      }
    },

    forced_entry: {
      spell: function (c) {
        var mine = c.myField[2], theirs = c.foeField[2];
        if (!mine && !theirs) return;
        var ms = mine ? mine.size : -1, ts = theirs ? theirs.size : -1;
        var victim = ms < ts ? mine : theirs;      // SIZE 相同時破壞對手的
        if (!victim) return;
        c.say('雙方 Ⅲ 格比 SIZE　→　破壞「' + victim.name + '」');
        c.destroy(victim);
      }
    },

    /* ═════════ 南十字 ═════════ */

    meadow_holiday: {
      spell: function (c) {
        var x = folls(c.myField).length;
        var t = pick(c, folls(c.myField), 1);
        if (!t.length) return;
        c.say('我方隨機 1 張隨從　攻 +' + (x - 1) + ' / 體 +' + (x + 1) + '（場上隨從數 ' + x + '）');
        c.mod(t[0], { atk: x - 1, sta: x + 1 });
      }
    },

    knight_letter: {
      spell: function (c) {
        if (cards(c.myField).length !== cards(c.foeField).length) return;
        var t = pick(c, cards(c.foeField), 2);
        if (!t.length) return;
        c.say('雙方場上卡片數一致　→　敵方隨機 2 張送回牌組下方');
        t.forEach(function (x) { c.toDeckBottom(x); });
      }
    },

    shield_break: {
      spell: function (c) {
        /* 原文「防御減少自己防御的兩倍」沒指明是誰的防禦，
           這裡解讀為「自己場上最高防禦力 ×2」。 */
        var mineBest = maxBy(folls(c.myField), function (x) { return x.def; });
        var x = (mineBest ? mineBest.def : 0) * 2;
        var t = maxBy(folls(c.foeField), function (x2) { return x2.def; });
        if (!t || !x) return;
        c.say('敵方防禦最高的隨從　防禦 −' + x + '（我方最高防禦 ×2）');
        c.mod(t, { def: -x });
      }
    },

    guard_testimony: {
      spell: function (c) {
        var n = c.myGrave.filter(function (x) { return nameHas(x, '騎士團'); }).length;
        var t = pick(c, folls(c.myField).filter(function (x) { return isFac(x, 'crux'); }), 1);
        if (t.length && n) {
          c.say('我方隨機 1 張「南十字」隨從　攻/體 +' + n + '（墓地的「騎士團」卡片數）');
          c.mod(t[0], { atk: n, sta: n });
        }
        if (c.myGrave.length) {
          c.say('自己墓地全部除外');
          c.exileGrave(c.me);
        }
      }
    },

    peace_treaty: {
      spell: function (c) {
        c.say('場上所有卡片　行動終了（自己的咒語卡除外）');
        [c.myField, c.foeField].forEach(function (f, side) {
          for (var i = 0; i < 5; i++) {
            var x = f[i];
            if (!x) continue;
            if (side === 0 && x.type === 'spell') continue;   // 自己的咒語不受影響
            c.deactivate(x);
          }
        });
        var t = folls(c.myField).filter(function (x) { return isFac(x, 'crux'); });
        if (!t.length) return;
        c.say('我方「南十字」隨從　體 +2 / SIZE −1');
        t.forEach(function (x) {
          c.mod(x, { sta: 2 });
          c.set(x, 'size', Math.max(0, x.size - 1));
        });
      }
    },

    /* ═════════ 暗黑族 ═════════ */

    full_moon_power: {
      spell: function (c) {
        var t = folls(c.myField).filter(function (x) {
          return nameHas(x, '克雷森特') || nameHas(x, '斯卡迪魯') || nameHas(x, '菲莉娜');
        });
        buff(c, t, { atk: 3 }, '我方「克雷森特／斯卡迪魯／菲莉娜」隨從　攻擊力 +3');
      }
    },

    blood_relay: {
      spell: function (c) {
        var t = slotFoll(c.myField, 3);
        if (!t || !isFac(t, 'darklore')) return;
        var sum = 0;
        folls(c.myField).concat(folls(c.foeField)).forEach(function (x) { sum += x.def; });
        var x = Math.min(5, sum);
        if (!x) return;
        c.say('我方 Ⅲ 格「暗黑」隨從　攻/體 +' + x + '（場上防禦總和，上限 5）');
        c.mod(t, { atk: x, sta: x });
      }
    },

    overwhelm: {
      spell: function (c) {
        var life = c.foeChar.life;
        var t = folls(c.foeField).filter(function (x) { return x.def + x.sta > life; });
        var x = Math.floor(life / 2);
        if (!t.length || !x) return;
        buff(c, t, { def: -x }, '敵方「防+體 > 對方生命」的隨從　防禦 −' + x);
      }
    },

    forced_confinement: {
      spell: function (c) {
        if (!isFac(c.myChar, 'darklore')) return;
        var t = maxBy(folls(c.foeField), function (x) { return x.sta; });
        if (!t) return;
        var cost = Math.ceil(t.size / 2);
        c.say('「' + t.name + '」送回敵方牌組最下方　→　自己生命 −' + cost);
        c.toDeckBottom(t);
        c.life(c.me, -cost);
      }
    },

    evil_eye: {
      spell: function (c) {
        var all = folls(c.foeField);
        if (!all.length) return;
        var dark = isFac(c.myChar, 'darklore');
        buff(c, all, dark ? { atk: -2, def: -2, sta: -2 } : { atk: -2, def: -2 },
             dark ? '角色為「暗黑」　→　敵方所有隨從 攻/防/體 −2'
                  : '敵方所有隨從 攻/防 −2');
        if (all.length <= 2) {
          buff(c, folls(c.foeField), { atk: -1, def: -1 }, '敵方隨從 2 張以下　→　追加 攻/防 −1');
        }
      }
    },

    /* ═════════ 竹林鄉 / 邊境遺跡的 BOSS ═════════ */

    // 希妮亞的寵物、佩妮卡
    boss_panica: {
      turnStart: function (c) {
        var odd = c.g.turn % 2 === 1;
        var t = pick(c, folls(c.foeField), 1);
        if (!t.length) return;
        var x = t[0];
        if (odd) {
          var half = Math.ceil(x.atk / 2);
          if (x.atk <= 0) return;
          c.say('奇數回合　→　敵方隨機 1 張隨從　攻擊力減半');
          c.set(x, 'atk', half);
        } else {
          if (x.sta <= 0) return;
          c.say('偶數回合　→　敵方隨機 1 張隨從　體力減半');
          c.set(x, 'sta', Math.ceil(x.sta / 2));
        }
      }
    },

    // 黃昏之狼、辛西亞
    boss_ginger: {
      turnStart: function (c) {
        buff(c, folls(c.myField), { atk: 3 }, '我方全部隨從　攻擊力 +3');
      }
    },

    /* ═════════ 新副本的獎勵角色卡 ═════════ */

    // 佩妮卡
    panica: {
      turnStart: function (c) {
        var odd = c.g.turn % 2 === 1;
        if (odd) {
          buff(c, pick(c, folls(c.myField), 2), { atk: 1 }, '奇數回合　→　我方隨機 2 張隨從　攻 +1');
        } else {
          buff(c, pick(c, folls(c.myField), 1), { sta: 2 }, '偶數回合　→　我方隨機 1 張隨從　體 +2');
        }
      }
    },

    // 辛西亞
    ginger: {
      turnStart: function (c) {
        var x = cards(c.myField).length;
        var t = folls(c.myField).filter(function (f) { return f.size >= x; });
        buff(c, t, { atk: 1, sta: 2 },
             '我方 SIZE ' + x + ' 以上的隨從　攻 +1 / 體 +2（X ＝ 場上卡片數）');
      }
    },

    /* ═════════ 角色卡 ═════════ */

    curious_vernika: {
      turnStart: function (c) {
        var t = maxBy(folls(c.foeField), function (x) { return x.def; });
        if (!t || t.def <= 0) return;
        c.say('敵方防禦最高的隨從　防禦 = 0');
        c.set(t, 'def', 0);
      }
    }
  };

  for (var k in E1) SG.Effects[k] = E1[k];
})();
