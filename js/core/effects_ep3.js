/* ═══════════════════════════════════════════════════════════
   Episode 3 卡片效果（68 張裡有效果的 56 張）

   撰寫原則跟 effects.js 一樣：先 say() 宣告效果發動，再做事。

   ★ Episode 3 有大量「四張同款、只差陣營」的卡，所以下面先寫成
     工廠函式再套用，避免同一段邏輯抄四次。
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
  /* 隨機整數 lo~hi（含兩端） */
  function rint(ctx, lo, hi) { return lo + Math.floor(ctx.rnd() * (hi - lo + 1)); }

  /* ═════════ 共用的技能 ═════════ */

  /* 「回合開始時變回原來的能力」—— 給下面那組「防禦者防 = 0」的卡換上 */
  SG.Effects.__ep3_restore = {
    turnStart: function (c) {
      c.say('回合開始　變回原來的能力');
      c.restoreSkills();
    }
  };

  /* ═════════ 工廠函式：EP3 有很多四張同款的卡 ═════════ */

  /* 攻擊前，防禦隨從的防禦力 ≥1 時把它歸零；
     接著這張卡的能力換成「回合開始時變回原來的能力」。 */
  function zeroDefenderDef() {
    return {
      beforeAttack: function (c) {
        var d = c.defender;
        if (!d || d.def < 1) return;
        c.say('攻擊前　防禦隨從「' + d.name + '」防禦力 = 0');
        c.set(d, 'def', 0);
        c.loseSkills();
        c.grantSkill(c.self, '__ep3_restore');
      }
    };
  }

  /* 攻擊前，讓防禦隨從失去技能；接著自己也失去這個能力。 */
  function stripDefenderSkill() {
    return {
      beforeAttack: function (c) {
        var d = c.defender;
        if (!d || !c.hasSkill(d)) return;
        c.say('攻擊前　防禦隨從「' + d.name + '」失去特殊能力（發動後失去這個能力）');
        c.loseSkills(d);
        c.loseSkills();
      }
    };
  }

  /* 攻擊前，此卡防禦 = 0，攻/體 上升「與防禦隨從的防禦力差」（最大 9）。 */
  function zeroSelfDefGap() {
    return {
      beforeAttack: function (c) {
        var d = c.defender;
        if (!d) return;
        var gap = Math.min(9, Math.abs(c.self.def - d.def));
        c.say('攻擊前　此卡防禦 = 0，攻/體 +' + gap + '（與防禦隨從的防禦力差）');
        c.set(c.self, 'def', 0);
        if (gap) c.mod(c.self, { atk: gap, sta: gap });
      }
    };
  }

  /* 防禦前，此卡體力 +n。 */
  function defendStaUp(n) {
    return {
      beforeDefend: function (c) {
        c.say('防禦前　此卡體力 +' + n);
        c.mod(c.self, { sta: n });
      }
    };
  }

  /* 場上同時有「含關鍵字」與「不含關鍵字」的同陣營隨從時，
     隨機兩張該陣營的隨從 攻 +3 / 體 +3。 */
  function pairBuff(keyword, faction) {
    return {
      spell: function (c) {
        var mine = folls(c.myField).filter(function (x) { return isFac(x, faction); });
        var withKw = mine.filter(function (x) { return nameHas(x, keyword); });
        var without = mine.filter(function (x) { return !nameHas(x, keyword); });
        if (!withKw.length || !without.length) return;
        buff(c, pick(c, mine, 2), { atk: 3, sta: 3 },
             '場上同時有「' + keyword + '」與非「' + keyword + '」的隨從　→　隨機 2 張　攻 +3 / 體 +3');
      }
    };
  }

  var E3 = {

    /* ═════════ 公立學校 ═════════ */

    lib_daisy: zeroDefenderDef(),
    lib_manager_lotte: stripDefenderSkill(),
    cook_club_ace: zeroSelfDefGap(),
    sitas_friend_rosie: defendStaUp(2),

    lib_ace: {
      turnStart: function (c) {
        var n = c.self.size;
        buff(c, folls(c.myField).filter(function (x) { return isFac(x, 'vita'); }),
             { atk: n, sta: n }, '我方「公立」隨從　攻/體 +' + n + '（此卡 SIZE）');
      }
    },

    child_sita: {
      turnStart: function (c) {
        var t = [1, 2, 5].map(function (n) {
          var x = c.foeField[n - 1];
          return (x && x.type === 'follower') ? x : null;
        }).filter(Boolean);
        buff(c, t, { sta: -2 }, '敵方 Ⅰ・Ⅱ・Ⅴ 格隨從　體力 −2');
      }
    },

    cord_ball: {
      spell: function (c) {
        if (c.myGrave.length < 6) return;
        var hand = c.myHand.length;
        var hadFoll = c.myHand.some(function (x) { return x.type === 'follower'; });
        if (!hand) return;
        c.say('墓地 ' + c.myGrave.length + ' 張（≥6）　→　手牌 ' + hand + ' 張全部放到牌組下方');
        while (c.myHand.length) c.toDeckBottomHand(0);
        if (hadFoll && hand >= 3) {
          c.say('放回的手牌含隨從且達 3 張　→　墓地隨機 1 張放回牌組下方，此卡除外');
          c.graveToDeckBottom(c.me, 1);
          c.exileSelf();
        }
      }
    },

    shameless_ambition: {
      spell: function (c) {
        var got = c.millDeck(c.me, 3);
        var n = got.filter(function (d) {
          return d && d.type === 'follower' && d.faction === 'vita';
        }).length;
        c.say('牌組上方 3 張送墓　其中「公立」隨從 ' + n + ' 張　→　生命 +' + (n * 3));
        if (n) c.life(c.me, n * 3);
      }
    },

    nights_beckoning: {
      spell: function (c) {
        var g = c.myGrave;
        var hasVita = g.some(function (d) { return d.type === 'follower' && d.faction === 'vita'; });
        var hasOther = g.some(function (d) { return d.type === 'follower' && d.faction !== 'vita'; });
        if (!hasVita || !hasOther) return;
        var sp = cards(c.foeField).filter(function (x) { return x.type === 'spell'; });
        if (!sp.length) {
          c.say('敵方場上沒有咒語　→　此卡進入行動終了');
          c.deactivate(c.self);
          return;
        }
        c.say('墓地兼有「公立」與非「公立」隨從　→　敵方場上 ' + sp.length + ' 張咒語送入墓地');
        sp.forEach(function (x) { c.discard(x); });
      }
    },

    troubleshooting: {
      spell: function (c) {
        var t = folls(c.myField).filter(function (x) { return isFac(x, 'vita'); });
        if (!buff(c, t, { sta: 3 }, '我方「公立」隨從　體力 +3')) return;
        if (c.myDeckSize() <= 10) {
          buff(c, t, { sta: 2 }, '牌組剩 ' + c.myDeckSize() + ' 張（≤10）　→　追加體力 +2');
        }
      }
    },

    court_jester: pairBuff('學生會', 'vita'),

    sages_sermon: {
      spell: function (c) {
        var t = pick(c, folls(c.foeField).filter(function (x) { return c.hasSkill(x); }), 1)[0];
        if (!t) return;
        c.say('敵方隨機 1 張隨從「' + t.name + '」失去特殊能力');
        c.loseSkills(t);
      }
    },

    visitor: {
      spell: function (c) {
        var idx = -1;
        for (var i = 0; i < c.myHand.length; i++) {
          if (c.myHand[i].type === 'follower' && isFac(c.myHand[i], 'vita')) { idx = i; break; }
        }
        if (idx < 0) return;
        var name = c.myHand[idx].name;
        var put = c.handToField(idx);
        if (!put) return;
        var sz = rint(c, 1, 2), gain = rint(c, 3, 5);
        c.say('手牌「' + name + '」放到場上　SIZE = ' + sz + '　攻/體 +' + gain);
        c.set(put, 'size', sz);
        c.mod(put, { atk: gain, sta: gain });
      }
    },

    /* ═════════ 私立學校 ═════════ */

    agent_maid: zeroDefenderDef(),
    cultist_maid: stripDefenderSkill(),
    silent_maid: zeroSelfDefGap(),
    '2s_agent_nine': defendStaUp(2),

    linia_pacifica: {
      turnStart: function (c) {
        var s = c.slotOf(c.self), t = [];
        [s - 1, s, s + 1].forEach(function (i) {
          var x = (i >= 0 && i < 5) ? c.myField[i] : null;
          if (x && x.type === 'follower' && (x === c.self || isFac(x, 'academy'))) t.push(x);
        });
        var n = up(c.self.size / 2);
        buff(c, t, { atk: n, sta: n },
             '此卡與鄰接的「私立」隨從　攻/體 +' + n + '（此卡 SIZE 的一半）');
      }
    },

    child_cinia: {
      turnStart: function (c) {
        var t = pick(c, folls(c.foeField), 1)[0];
        if (!t) return;
        var big = t.size >= 3;
        c.say('敵方隨機 1 張隨從 SIZE ' + t.size + '　→　' + (big ? '攻擊力 −2' : '體力 −2'));
        c.mod(t, big ? { atk: -2 } : { sta: -2 });
      }
    },

    black_magic_plot: {
      spell: function (c) {
        buff(c, pick(c, folls(c.myField).filter(function (x) { return isFac(x, 'academy'); }), 2),
             { atk: 4, sta: -1 }, '我方隨機 2 張「私立」隨從　攻 +4 / 體 −1');
      }
    },

    bargaining_table: {
      spell: function (c) {
        var t = pick(c, folls(c.myField), 2);
        if (!t.length) return;
        c.say('我方隨機 2 張隨從　體力上升各自的 SIZE');
        t.forEach(function (x) { c.mod(x, { sta: x.size }); });
      }
    },

    suicide_mission: {
      spell: function (c) {
        if (!cards(c.foeField).some(function (x) { return x.type === 'spell'; })) return;
        var idx = -1;
        for (var i = 0; i < c.myHand.length; i++) {
          if (c.myHand[i].type === 'follower' && isFac(c.myHand[i], 'academy')) { idx = i; break; }
        }
        if (idx >= 0) {
          c.say('手牌第一張「私立」隨從「' + c.myHand[idx].name + '」放到牌組下方');
          c.toDeckBottomHand(idx);
        }
        var sp = pick(c, cards(c.foeField).filter(function (x) { return x.type === 'spell'; }), 1)[0];
        if (sp) { c.say('敵方隨機 1 張咒語送入墓地'); c.discard(sp); }
      }
    },

    linias_tastes: {
      spell: function (c) {
        if (!folls(c.myField).length) return;
        var t = pick(c, folls(c.foeField), 1)[0];
        if (!t) return;
        c.say('敵方隨機 1 張隨從「' + t.name + '」送入墓地');
        c.discard(t);
        if (c.self.size >= 2) {
          c.say('此卡 SIZE = 1　並放到對手場上');
          c.set(c.self, 'size', 1);
          c.giveToFoe(c.self);
        }
      }
    },

    say_no_evil: {
      spell: function (c) {
        var moved = 0;
        for (var i = c.myHand.length - 1; i >= 0; i--) {
          if (!isFac(c.myHand[i], 'academy')) continue;
          c.modHand(c.myHand[i], { size: -1 });
          c.toDeckBottomHand(i);
          moved++;
        }
        if (!moved) return;
        c.say('手牌「私立」' + moved + ' 張　SIZE −1 後放到牌組下方');
        cards(c.foeField).forEach(function (x) { c.deactivate(x); });
        c.say('對手場上全部進入行動終了');
        for (var j = 0; j < c.foeHand.length; j++) {
          if (c.foeHand[j].type === 'spell') {
            c.say('搶走對手手牌第一張咒語「' + c.foeHand[j].name + '」');
            c.stealHand(j);
            break;
          }
        }
      }
    },

    unmasked_lie: {
      spell: function (c) {
        var n = c.foeHand.filter(function (x) { return x.type === 'spell'; }).length;
        if (!n) return;
        buff(c, pick(c, folls(c.foeField), 2), { def: -n },
             '敵方隨機 2 張隨從　防禦 −' + n + '（對手手牌咒語數）');
      }
    },

    maid_revolution: pairBuff('女僕', 'academy'),

    /* ═════════ 南十字 ═════════ */

    arcana_i_magician: zeroDefenderDef(),
    seeker_ruth: stripDefenderSkill(),
    seeker_director: zeroSelfDefGap(),
    seeker_luthera: defendStaUp(2),

    vanguard_knight: {
      turnStart: function (c) {
        var drew = c.drawUpTo(4);
        var n = c.myHand.filter(function (x) { return isFac(x, 'crux'); }).length;
        c.say('補到 4 張手牌（抽 ' + drew + ' 張）　→　此卡 攻/體 +' + n + '（手牌「南十字」數）');
        if (n) c.mod(c.self, { atk: n, sta: n });
      }
    },

    head_knight_jaina: {
      turnStart: function (c) {
        var t = pick(c, folls(c.myField), 1)[0];
        if (!t) return;
        var odd = c.g.turn % 2 === 1;
        c.say('我方隨機 1 張隨從　攻 +2' + (odd ? ' / 體 +1（奇數回合）' : ''));
        c.mod(t, odd ? { atk: 2, sta: 1 } : { atk: 2 });
      }
    },

    child_luthica: {
      turnStart: function (c) {
        var t = pick(c, folls(c.myField).filter(function (x) { return isFac(x, 'crux'); }), 1)[0];
        if (!t) return;
        var big = t.size >= 3;
        c.say('我方隨機 1 張「南十字」隨從 SIZE ' + t.size + '　→　' + (big ? '攻 +2' : '體 +2'));
        c.mod(t, big ? { atk: 2 } : { sta: 2 });
      }
    },

    sigma: {
      turnStart: function (c) {
        var h = c.myHand.filter(function (x) { return x.type === 'follower'; });
        var hs = pick(c, h, 2);
        if (hs.length) {
          c.say('手牌隨機 ' + hs.length + ' 張隨從　攻/體 +1');
          hs.forEach(function (x) { c.modHand(x, { atk: 1, sta: 1 }); });
        }
        buff(c, pick(c, folls(c.myField), 2), { sta: 1 }, '場上隨機 2 張隨從　體力 +1');
      }
    },

    chrono_clock: {
      spell: function (c) {
        var t = pick(c, folls(c.myField).filter(function (x) { return isFac(x, 'crux'); }), 1)[0];
        if (!t) return;
        var a = rint(c, 1, 3), s = rint(c, 1, 3);
        c.say('我方隨機 1 張「南十字」隨從　攻 +' + a + ' / SIZE −' + s);
        c.mod(t, { atk: a, size: -s });
      }
    },

    undercover_work: {
      spell: function (c) {
        var n = c.myGrave.filter(function (d) {
          return d && d.faction === 'crux';
        }).length;
        if (n < 6) return;
        buff(c, pick(c, folls(c.myField), 1), { sta: 6 },
             '墓地「南十字」' + n + ' 張（≥6）　→　我方隨機 1 張隨從　體力 +6');
      }
    },

    crux_command: {
      spell: function (c) {
        var n = c.myDeckSize();
        var t = pick(c, folls(c.myField), 2);
        if (!t.length) return;
        if (n >= 10) buff(c, t, { def: 2, sta: 2 }, '牌組 ' + n + ' 張（≥10）　→　隨機 2 張隨從　防 +2 / 體 +2');
        else buff(c, t, { size: 1, atk: 6, sta: 6 }, '牌組 ' + n + ' 張（<10）　→　隨機 2 張隨從　SIZE +1 / 攻 +6 / 體 +6');
      }
    },

    power_control: pairBuff('神聖研究會', 'crux'),

    conversion: {
      spell: function (c) {
        var mx = maxBy(folls(c.myField), function (x) { return x.size; });
        if (!mx) return;
        var t = pick(c, folls(c.foeField).filter(function (x) { return x.size < mx.size; }), 1)[0];
        if (!t) return;
        c.say('敵方 SIZE 低於我方最大（' + mx.size + '）的「' + t.name + '」　→　搶過來並進入行動終了');
        if (c.move(c.foe, c.slotOf(t), c.me)) c.deactivate(t);
      }
    },

    recluse: {
      spell: function (c) {
        var t = pick(c, folls(c.myField), 1)[0];
        if (!t) return;
        var drop = t.atk + t.def;
        c.say('我方隨機 1 張隨從「' + t.name + '」攻 = 0 / 防 = 0');
        c.set(t, 'atk', 0); c.set(t, 'def', 0);
        if (drop <= 0) return;
        buff(c, pick(c, folls(c.foeField), 2), { atk: -down(drop / 2) },
             '敵方隨機 2 張隨從　攻擊力 −' + down(drop / 2) + '（下降量的一半）');
      }
    },

    arrest: {
      spell: function (c) {
        var n = c.myHand.length;
        if (!n) return;
        c.say('手牌 ' + n + ' 張全部放到牌組下方');
        while (c.myHand.length) c.toDeckBottomHand(0);
        if (n < 2) return;
        var t = pick(c, folls(c.foeField).filter(function (x) { return x.size >= 4; }), 1)[0];
        if (!t) return;
        c.say('放回 2 張以上　→　敵方 SIZE 4 以上的「' + t.name + '」放到我方牌組下方');
        c.toMyDeckBottom(t);
      }
    },

    /* ═════════ 暗黑族 ═════════ */

    crescent_maze: zeroDefenderDef(),
    dollmaster_elfin_rune: stripDefenderSkill(),
    lantern_witch: zeroSelfDefGap(),
    lost_doll: defendStaUp(2),

    mediator_cabernet: {
      turnStart: function (c) {
        buff(c, folls(c.myField).filter(function (x) { return isFac(x, 'darklore'); }),
             { atk: 2, sta: 2 }, '我方「暗黑」隨從全體　攻/體 +2');
      }
    },

    child_iri: {
      turnStart: function (c) {
        if (c.myHand.length % 2 !== 0) return;
        var t = pick(c, folls(c.foeField), 1)[0];
        if (!t) return;
        c.say('手牌 ' + c.myHand.length + ' 張（偶數）　→　敵方 1 張隨從　攻/防/體 −1');
        c.mod(t, { atk: -1, def: -1, sta: -1 });
      }
    },

    misfortune: {
      spell: function (c) {
        var n = c.exileWhere(c.me, function (d) {
          return d && d.type === 'spell';
        }, 6);
        if (n < 6) return;
        var t = pick(c, folls(c.foeField), 1)[0];
        if (!t) return;
        c.say('除外墓地 6 張咒語　→　敵方隨機 1 張隨從　SIZE +3');
        c.mod(t, { size: 3 });
      }
    },

    alluring_whisper: {
      spell: function (c) {
        var got = c.millDeck(c.me, 3);
        var n = got.filter(function (d) {
          return d && d.type === 'follower' && d.faction === 'darklore';
        }).length;
        if (!n) return;
        buff(c, folls(c.foeField), { atk: -n, def: -n, sta: -n },
             '牌組上方 3 張送墓　其中「暗黑」隨從 ' + n + ' 張　→　敵方全體　攻/防/體 −' + n);
      }
    },

    impulse: {
      spell: function (c) {
        if (isFac(c.myChar, 'darklore')) {
          c.say('角色是「暗黑」　→　我方生命 −1');
          c.life(c.me, -1);
          buff(c, pick(c, folls(c.foeField), 1), { sta: -5 }, '敵方隨機 1 張隨從　體力 −5');
        }
        if (c.myGrave.length >= 8) {
          buff(c, pick(c, folls(c.foeField), 1), { sta: -5 },
               '墓地 ' + c.myGrave.length + ' 張（≥8）　→　敵方隨機 1 張隨從　體力 −5');
          c.exileWhere(c.me, function (d) {
            return d && d.type === 'spell';
          }, 2);
        }
      }
    },

    dollmaster: {
      spell: function (c) {
        var t = c.foeField[2];
        if (!t || t.type !== 'follower') return;
        var n = c.self.size;
        c.say('敵方第 Ⅲ 格隨從　攻/體 −' + n + '（此卡 SIZE）');
        c.mod(t, { atk: -n, sta: -n });
      }
    },

    bad_apple: pairBuff('魔女', 'darklore'),

    midnight_doll_show: {
      spell: function (c) {
        var n = c.myGrave.filter(function (d) {
          return d && d.type === 'follower' && d.faction === 'darklore';
        }).length;
        if (n < 7) return;
        buff(c, folls(c.foeField), { def: -2, sta: -2 },
             '墓地「暗黑」隨從 ' + n + ' 張（≥7）　→　敵方全體　防/體 −2');
      }
    },

    vernikas_world: {
      spell: function (c) {
        var n = c.myHand.filter(function (x) { return x.type === 'spell'; }).length +
                c.foeHand.filter(function (x) { return x.type === 'spell'; }).length;
        if (n) {
          buff(c, folls(c.foeField), { atk: -n, sta: -n },
               '敵方全體隨從　攻/體 −' + n + '（雙方手牌咒語數）');
        }
        if (!isFac(c.myChar, 'darklore')) return;
        c.say('角色是「暗黑族」　→　雙方手牌第一張咒語與敵方場上所有咒語送入墓地');
        var i;
        for (i = 0; i < c.myHand.length; i++) {
          if (c.myHand[i].type === 'spell') { c.discardHand(i); break; }
        }
        for (i = 0; i < c.foeHand.length; i++) {
          if (c.foeHand[i].type === 'spell') { c.discardFoeHand(i); break; }
        }
        cards(c.foeField).forEach(function (x) { if (x.type === 'spell') c.discard(x); });
      }
    },

    /* ═════════ 無所屬 ═════════ */

    guide_rio: {
      beforeAttack: function (c) {
        var n = rint(c, 1, 3);
        c.say('攻擊前　攻擊力 +' + n + '（隨機 1～3）');
        c.mod(c.self, { atk: n });
      },
      beforeDefend: function (c) {
        var n = rint(c, 1, 3);
        c.say('防禦前　體力 +' + n + '（隨機 1～3）');
        c.mod(c.self, { sta: n });
      }
    },

    sage_esprit: {
      beforeAttack: function (c) {
        var d = c.defender;
        if (!d || !c.hasSkill(d)) return;
        c.say('攻擊前　防禦隨從失去技能　→　此卡 攻/防/體 +1');
        c.loseSkills(d);
        c.mod(c.self, { atk: 1, def: 1, sta: 1 });
      },
      beforeDefend: function (c) {
        var a = c.attacker;
        if (!a || !c.hasSkill(a)) return;
        c.say('防禦前　攻擊隨從失去技能　→　此卡 攻/防/體 +1');
        c.loseSkills(a);
        c.mod(c.self, { atk: 1, def: 1, sta: 1 });
      }
    }
  };

  for (var k in E3) SG.Effects[k] = E3[k];
})();
