/* ═══════════════════════════════════════════════════════════
   Episode 5 卡片效果（45 張裡有效果的 41 張）

   撰寫原則跟 effects.js 一樣：先 say() 宣告效果發動，再做事。

   ★ 這一章的效果文是從英文 wiki 翻的（繁中 wiki 沒有收錄），
     所以實作是照英文原文寫的，中文敘述見 tools/ep5_effects.json。
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
  function sumSize(field) {
    var n = 0;
    cards(field).forEach(function (c) { n += c.size || 0; });
    return n;
  }

  /* 「防禦前，與角色同陣營 → 對手生命 −1，然後失去這個能力」—— 兩張同款 */
  function pokeThenLose() {
    return {
      beforeDefend: function (c) {
        if (!c.myChar || c.self.faction !== c.myChar.faction) return;
        c.say('防禦前　與角色同陣營　→　對手角色生命 −1（發動後失去這個能力）');
        c.life(c.foe, -1);
        c.loseSkills();
      }
    };
  }

  /* 「回合開始，手牌兩張特定卡放到牌組下方 → 敵方一張退回牌組，然後失去能力」
     —— 圖書部總管的泰姬娜 / 克雷森特長老白詩南 兩張同款，只差關鍵字與陣營 */
  function tuckTwoThenBounce(keyword, faction) {
    return {
      turnStart: function (c) {
        if (!isFac(c.myChar, faction)) return;
        var a = -1, b = -1, i;
        for (i = 0; i < c.myHand.length; i++) {
          var h = c.myHand[i];
          if (!isFac(h, faction)) continue;
          if (a < 0 && nameHas(h, keyword)) a = i;
          else if (b < 0 && !nameHas(h, keyword)) b = i;
        }
        if (a < 0 || b < 0) return;
        c.say('回合開始　手牌一張「' + keyword + '」與一張非「' + keyword + '」放到牌組下方');
        [Math.max(a, b), Math.min(a, b)].forEach(function (k) { c.toDeckBottomHand(k); });
        var t = pick(c, folls(c.foeField), 1)[0];
        if (t) {
          c.say('敵方隨機 1 張退回對手牌組下方');
          c.toDeckBottom(t);
        }
        c.loseSkills();
      }
    };
  }

  var E5 = {

    /* ═════════ 公立學校 ═════════ */

    lib_evenne: pokeThenLose(),

    lib_milka_ep5: {
      beforeDefend: function (c) {
        var t = folls(c.myField).filter(function (x) { return nameHas(x, '圖書部'); })[0];
        if (!t) return;
        c.say('防禦前　我方第一張「圖書部」隨從　體力 +2（此卡暫時失去這個能力）');
        c.mod(t, { sta: 2 });
        c.loseSkills();
        c.grantSkill(c.self, '__ep3_restore');
      }
    },

    lib_hl_tezina: tuckTwoThenBounce('圖書部', 'vita'),

    waitress_gart: {
      beforeDefend: function (c) {
        var a = c.attacker;
        if (!a) return;
        if (isFac(a, 'academy') || isFac(a, 'darklore')) {
          c.say('攻擊者屬於「私立」或「暗黑」　→　該隨從 攻/體 −2');
          c.mod(a, { atk: -2, sta: -2 });
        } else {
          c.say('攻擊者不是「私立／暗黑」　→　此卡 攻/體 +2');
          c.mod(c.self, { atk: 2, sta: 2 });
        }
        c.loseSkills();
        c.grantSkill(c.self, '__ep3_restore');
      }
    },

    battlefield_sita: {
      beforeAttack: function (c) {
        var d = c.defender;
        if (!d) return;
        var n = up(c.self.atk / 2);
        if (!n) return;
        c.say('攻擊前　防禦隨從體力 −' + n + '（此卡攻擊力的一半）');
        c.mod(d, { sta: -n });
        c.say('此卡體力 +' + up(n / 2) + '（減少量的一半）');
        c.mod(c.self, { sta: up(n / 2) });
      }
    },

    council_dispatch_layna: {
      beforeDefend: function (c) {
        c.say('防禦前　攻 +1 / 體 +2');
        c.mod(c.self, { atk: 1, sta: 2 });
      }
    },

    summer_machine_gun: {
      spell: function (c) {
        var pool = c.myHand.concat(cards(c.myField));
        var ok = ['魯卡', '米路卡', '賽莉耶'].every(function (k) {
          return pool.some(function (x) { return nameHas(x, k); });
        });
        if (!ok) return;
        var t = folls(c.myField)[0];
        if (!t) return;
        c.say('手牌與場上湊齊「魯卡」「米路卡」「賽莉耶」　→　第一張隨從 攻 +4 / 體 +4');
        c.mod(t, { atk: 4, sta: 4 });
      }
    },

    detection: {
      spell: function (c) {
        var t = pick(c, folls(c.foeField), 1)[0];
        if (!t) return;
        c.say('敵方隨機 1 張隨從　體力 −' + t.size + '（其 SIZE）　防禦 −1');
        c.mod(t, { sta: -t.size, def: -1 });
      }
    },

    golden_pair: {
      spell: function (c) {
        var f = folls(c.myField), pair = null;
        for (var i = 0; i < f.length && !pair; i++) {
          for (var j = i + 1; j < f.length; j++) {
            if (f[i].name === f[j].name) { pair = [f[i], f[j]]; break; }
          }
        }
        if (!pair) return;
        buff(c, pair, { atk: 3, sta: 3 }, '我方第一組同名隨從「' + pair[0].name + '」　攻 +3 / 體 +3');
      }
    },

    fault: {
      spell: function (c) {
        if (folls(c.myField).filter(function (x) { return nameHas(x, '網球部'); }).length < 2) return;
        c.say('我方「網球部」隨從 2 張以上　→　對手角色生命 −3');
        c.life(c.foe, -3);
      }
    },

    infighting: {
      spell: function (c) {
        var first = folls(c.myField)[0];
        if (!first) return;
        var fac = first.faction, n = 0;
        folls(c.myField).forEach(function (x) { if (x.faction === fac) { c.discard(x); n++; } });
        if (!n) return;
        c.say('與我方第一張隨從同陣營的隨從 ' + n + ' 張送入墓地');
        var e0 = folls(c.foeField)[0];
        if (e0) {
          var m = 0;
          folls(c.foeField).forEach(function (x) {
            if (x !== e0 && x.faction === e0.faction) { c.discard(x); m++; }
          });
          if (m) c.say('敵方同陣營的隨從（第一張除外）' + m + ' 張也送入墓地');
        }
        c.say('此卡從遊戲中除外');
        c.exileSelf();
      }
    },

    minds_in_conflict: {
      spell: function (c) {
        var a = folls(c.myField).filter(function (x) { return c.hasSkill(x); })[0];
        var b = folls(c.foeField).filter(function (x) { return c.hasSkill(x); })[0];
        if (!a || !b) return;
        c.say('我方與敵方第一張有能力的隨從　交換 SIZE / 攻 / 防 / 體 與能力');
        c.swapStats(a, b);
        var t = a.skills;
        a.skills = b.skills;
        b.skills = t;
      }
    },

    'secret_art_wind_slash': {
      spell: function (c) {
        var t = cards(c.foeField).filter(function (x) { return !x.activated; });
        t.forEach(function (x) { c.deactivate(x); });
        var n = t.length;
        if (!n) return;
        c.say('敵方 ' + n + ' 張卡進入行動終了　→　體力 −' + down(n / 2));
        buff(c, folls(c.foeField), { sta: -down(n / 2) }, '敵方隨從　體力 −' + down(n / 2));
        if (nameHas(c.myChar, '西塔')) {
          buff(c, folls(c.foeField), { def: -n }, '角色卡名含「西塔」　→　敵方隨從　防禦 −' + n);
        }
      }
    },

    /* ═════════ 私立學校 ═════════ */

    crimson_witch_cinia: {
      beforeAttack: function (c) {
        var d = c.defender;
        if (!d) return;
        var n = 1 + c.myHand.filter(function (x) { return isFac(x, 'academy'); }).length;
        c.say('攻擊前　防禦隨從體力 −' + n + '（1 ＋ 手牌「私立」數）　此卡體力 +' + n);
        c.mod(d, { sta: -n });
        c.mod(c.self, { sta: n });
      }
    },

    home_study: {
      spell: function (c) {
        var same = c.myHand.filter(function (x) { return x.name === c.self.name; }).length +
                   c.myGrave.filter(function (x) { return x.name === c.self.name; }).length;
        var n = 1 + same;
        var t = c.myHand.filter(function (x) { return x.type === 'follower'; });
        if (!t.length) return;
        c.say('手牌所有隨從　攻/體 +' + n + '（1 ＋ 同名卡 ' + same + ' 張）');
        t.forEach(function (x) { c.modHand(x, { atk: n, sta: n }); });
      }
    },

    maid_experience: {
      spell: function (c) {
        var n = 0, i;
        for (i = c.myHand.length - 1; i >= 0; i--) {
          if (c.myHand[i].name === '家庭學習') { c.exileHand(i); n++; }
        }
        n += c.exileWhere(c.me, function (d) { return d && d.name === '家庭學習'; });
        if (!n) return;
        buff(c, pick(c, folls(c.foeField), 2), { sta: -n * 2 },
             '除外 ' + n + ' 張「家庭學習」　→　敵方隨機 2 張隨從　體力 −' + (n * 2));
      }
    },

    defeat: {
      spell: function (c) {
        var n = Math.min(3, folls(c.foeField).filter(function (x) { return c.hasSkill(x); }).length);
        if (!n) return;
        buff(c, pick(c, folls(c.myField).filter(function (x) { return isFac(x, 'academy'); }), 1),
             { def: n }, '我方隨機 1 張「私立」隨從　防禦 +' + n + '（敵方有能力的隨從數）');
      }
    },

    meeting_master: {
      spell: function (c) {
        var m = folls(c.myField).filter(function (x) { return nameHas(x, '女僕') && !x.activated; })[0];
        if (!m) return;
        c.say('我方第一張「女僕」隨從進入行動終了');
        c.deactivate(m);
        var l = folls(c.myField).filter(function (x) { return nameHas(x, '淑女'); })[0];
        if (!l) return;
        c.say('我方第一張「淑女」隨從　攻/體 +' + m.size);
        c.mod(l, { atk: m.size, sta: m.size });
      }
    },

    comfort: {
      spell: function (c) {
        var t = folls(c.myField).filter(function (x) { return !x.activated; })[0];
        if (!t) return;
        c.say('我方第一張隨從進入行動終了　→　生命 +3');
        c.deactivate(t);
        c.life(c.me, 3);
      }
    },

    curse_of_mistrust: {
      spell: function (c) {
        var m = folls(c.myField)[0];
        if (!m) return;
        var fac = m.faction;
        c.say('我方第一張隨從「' + m.name + '」放到對手牌組下方');
        c.giveToFoe(m);
        c.toDeckBottom(m);
        var t = maxBy(folls(c.foeField).filter(function (x) { return x.faction !== fac; }),
                      function (x) { return x.size; });
        if (!t) return;
        c.say('敵方 SIZE 最高且不同陣營的「' + t.name + '」放到我方牌組下方');
        c.toMyDeckBottom(t);
      }
    },

    el_mundo: {
      spell: function (c) {
        if (isFac(c.myChar, 'academy')) {
          var n = 8 - c.self.size;
          buff(c, pick(c, folls(c.foeField), 1), { sta: -n },
               '角色是「私立」　→　敵方隨機 1 張隨從　體力 −' + n + '（8 − 此卡 SIZE）');
        }
        if (c.self.size < 3) {
          c.say('此卡 SIZE < 3　→　SIZE +1 並回到手牌');
          c.mod(c.self, { size: 1 });
          c.fieldToHand(c.self);
        } else {
          c.say('此卡 SIZE ≥ 3　→　從遊戲中除外');
          c.exileSelf();
        }
      }
    },

    /* ═════════ 南十字 ═════════ */

    crux_nemesis_luthica: {
      beforeAttack: function (c) {
        var n = c.myHand.filter(function (x) { return x.type === 'follower'; }).length;
        if (n) {
          c.say('攻擊前　攻/體 +' + n + '（手牌的隨從數）');
          c.mod(c.self, { atk: n, sta: n });
        }
        for (var i = 0; i < c.myHand.length; i++) {
          if (c.myHand[i].type === 'follower') {
            c.say('手牌第一張隨從放到牌組最上方');
            c.handToDeckTop(i);
            break;
          }
        }
      }
    },

    unity_march: {
      spell: function (c) {
        if (folls(c.myField).filter(function (x) { return isFac(x, 'crux'); }).length < 3) return;
        for (var i = 1; i < 4; i++) {
          var a = c.myField[i - 1], b = c.myField[i], d = c.myField[i + 1];
          if (b && b.type === 'follower' && a && d) {
            c.say('我方兩側都有隨從的第一張隨從「' + b.name + '」體力 +6');
            c.mod(b, { sta: 6 });
            return;
          }
        }
      }
    },

    a_single_flower: {
      spell: function (c) {
        var mine = c.myHand.length, theirs = c.foeHand.length;
        while (c.myHand.length) c.toDeckBottomHand(0);
        while (c.foeHand.length) c.foeHandToDeckBottom(0);
        if (!mine && !theirs) return;
        c.say('雙方手牌全部放回牌組下方（我方 ' + mine + ' 張、對手 ' + theirs + ' 張）');
        var d = mine - theirs;
        if (d) { c.say('生命 ' + (d > 0 ? '+' : '') + d); c.life(c.me, d); }
      }
    },

    protective_chant: {
      spell: function (c) {
        var n = folls(c.myField).length;
        buff(c, folls(c.myField).filter(function (x) { return x.size === n; }),
             { atk: 3, sta: 3 }, '我方 SIZE 等於隨從數（' + n + '）的隨從　攻 +3 / 體 +3');
      }
    },

    blossoming_skill: {
      spell: function (c) {
        var n = Math.min(9, Math.max(0, c.foeChar.life - c.myChar.life));
        if (!n) return;
        buff(c, pick(c, folls(c.myField), 1), { atk: n },
             '我方隨機 1 張隨從　攻擊力 +' + n + '（對手生命高出我方的差）');
      }
    },

    degradation: {
      spell: function (c) {
        var t = folls(c.myField).filter(function (x) { return !c.hasSkill(x); }).slice(0, 2);
        buff(c, t, { atk: 3, sta: 3 }, '我方前 2 張沒有能力的隨從　攻 +3 / 體 +3');
      }
    },

    pilgrimage_of_proof: {
      spell: function (c) {
        if (!folls(c.myField).length) return;
        var n = 4 - c.self.size;
        if (n > 0) {
          buff(c, pick(c, folls(c.foeField), 2), { def: -n },
               '敵方隨機 2 張隨從　防禦 −' + n + '（4 − 此卡 SIZE）');
        }
        if (c.self.size <= 1) {
          c.say('此卡 SIZE 1　→　從遊戲中除外');
          c.exileSelf();
        } else {
          c.say('此卡 SIZE −1 並進入行動終了');
          c.mod(c.self, { size: -1 });
          c.deactivate(c.self);
        }
      }
    },

    /* ═════════ 暗黑族 ═════════ */

    crescrent_aligote: pokeThenLose(),

    gs_agent: {
      beforeDefend: function (c) {
        var got = c.deckToField(function (d) { return d && d.name.indexOf('GS') >= 0; }, 1)[0];
        if (!got) return;
        c.say('防禦前　牌組第一張「GS」放到場上（發動後失去這個能力）');
        c.loseSkills();
      }
    },

    crescent_elder_chenin: tuckTwoThenBounce('克雷森特', 'darklore'),

    vampire_hunter_iri: {
      beforeAttack: function (c) {
        var d = c.defender;
        if (!d) return;
        var n = 2 + Math.abs(c.self.size - d.size);
        c.say('攻擊前　攻/體 +' + n + '（2 ＋ 與防禦隨從的 SIZE 差）');
        c.mod(c.self, { atk: n, sta: n });
        c.loseSkills();
        c.grantSkill(c.self, '__ep3_restore');
      }
    },

    luna_flina: {
      beforeAttack: function (c) {
        var d = c.defender;
        if (!d) return;
        if (cards(c.myField).filter(function (x) { return isFac(x, 'darklore'); }).length < 2) return;
        c.say('我方「暗黑」卡 2 張以上　→　防禦隨從 攻 −1 / 防 −2 / 體 −1');
        c.mod(d, { atk: -1, def: -2, sta: -1 });
      }
    },

    doctor_play: {
      spell: function (c) {
        if (!folls(c.myField).length) return;
        var t = folls(c.foeField)[0];
        if (!t) return;
        var n = Math.abs(c.myDeckSize() - c.foeDeckSize()) % 10;
        if (!n) return;
        c.say('敵方第一張隨從　體力 −' + n + '（雙方牌組張數差的個位數）');
        c.mod(t, { sta: -n });
      }
    },

    tick_time: {
      spell: function (c) {
        var n = down((c.g.turn % 10) / 2);
        if (!n) return;
        buff(c, pick(c, folls(c.myField), 2), { atk: n, sta: n },
             '我方隨機 2 張隨從　攻/體 +' + n + '（回合數個位數的一半）');
      }
    },

    maximum_drive: {
      spell: function (c) {
        var m = folls(c.myField)[0];
        if (!m) return;
        var sz = m.size;
        c.say('我方第一張隨從「' + m.name + '」送入墓地');
        c.discard(m);
        var t = c.foeField[sz - 1];
        if (!t) return;
        c.say('敵方第 ' + sz + ' 格的卡「' + t.name + '」送入墓地');
        c.discard(t);
      }
    },

    intrusion: {
      spell: function (c) {
        if (!buff(c, pick(c, folls(c.myField), 2), { sta: 3 }, '我方隨機 2 張隨從　體力 +3')) return;
        var got = c.foeDrawUpTo(SG.CONST.HAND_MAX);
        if (got) c.say('對手補牌到手牌滿（' + got + ' 張）');
      }
    },

    absolute_power: {
      spell: function (c) {
        var first = c.foeHand[0];
        if (!first) return;
        var isSpell = first.type === 'spell';
        buff(c, folls(c.myField), isSpell ? { def: -1, sta: 5 } : { atk: 3, def: -1 },
             '對手手牌第一張是' + (isSpell ? '咒語　→　我方隨從 防 −1 / 體 +5'
                                          : '隨從　→　我方隨從 攻 +3 / 防 −1'));
      }
    },

    misfit: {
      spell: function (c) {
        var t = folls(c.foeField).filter(function (x) { return x.atk + x.sta >= 22; });
        if (!t.length) return;
        var n = sumSize(c.myField);
        if (isFac(c.myChar, 'darklore')) n = down(n / 2);
        c.say('敵方 攻＋體 ≥22 的隨從　攻/體 = ' + n);
        t.forEach(function (x) { c.set(x, 'atk', n); c.set(x, 'sta', n); });
      }
    },

    lago_de_cisnes: {
      spell: function (c) {
        var f = folls(c.foeField);
        if (!f.length) return;
        var top = maxBy(f, function (x) { return x.atk + x.sta; });
        var t = f.filter(function (x) { return x.atk + x.sta === top.atk + top.sta; });
        c.say('敵方 攻＋體 最高的隨從　攻/體 減半');
        t.forEach(function (x) { c.set(x, 'atk', up(x.atk / 2)); c.set(x, 'sta', up(x.sta / 2)); });
        if (nameHas(c.myChar, '艾莉')) {
          buff(c, t, { atk: -2, def: -2, sta: -2 }, '角色卡名含「艾莉」　→　再 攻/防/體 −2');
        }
      }
    },

    /* ═════════ 無所屬 ═════════ */

    coin_lady: {
      beforeAttack: function (c) {
        var d = c.defender;
        if (!d) return;
        var gap = Math.min(9, Math.abs(c.self.def - d.def));
        c.say('攻擊前　此卡防禦 = 0，攻/體 +' + gap);
        c.set(c.self, 'def', 0);
        if (gap) c.mod(c.self, { atk: gap, sta: gap });
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

  for (var k in E5) SG.Effects[k] = E5[k];
})();
