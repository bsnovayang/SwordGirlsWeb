/* ═══════════════════════════════════════════════════════════
   Episode EX1 卡片效果（56 張裡有效果的 47 張）

   撰寫原則跟 effects.js 一樣：先 say() 宣告效果發動，再做事。

   ★ EX1 有很多「墓地操作」與「換裝」系列，跟 Episode 4 一樣先寫工廠函式。
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

  /* ═════════ 工廠函式 ═════════ */

  /* 攻擊前：墓地隨機一張除外、另一張放到牌組下方。（三張同款） */
  function graveShuffle() {
    return {
      beforeAttack: function (c) {
        var n = c.exileWhere(c.me, null, 1);
        if (!n) return;
        c.say('攻擊前　墓地隨機 1 張除外');
        if (c.graveToDeckBottom(c.me, 1)) c.say('墓地另外隨機 1 張放到牌組下方');
      }
    };
  }

  /* 回合開始：清掉場上同名的「換裝」，從牌組叫一張出來，然後自己送墓。（兩張同款） */
  function dressUpSwap(keyword) {
    return {
      turnStart: function (c) {
        folls(c.myField).forEach(function (x) {
          if (nameHas(x, keyword)) c.discard(x);
        });
        var got = c.deckToField(function (d) { return d && d.name.indexOf(keyword) >= 0; }, 1)[0];
        if (!got) return;
        c.say('牌組第一張「' + keyword + '」放到場上　SIZE = 5　攻/體 +3');
        c.set(got, 'size', 5);
        c.mod(got, { atk: 3, sta: 3 });
        c.say('此卡送入墓地');
        c.discard(c.self);
      }
    };
  }

  /* 「換裝」本體：清掉同名的，再消耗一張「換裝」，達成才給效果。（三張同款） */
  function dressUpBody(keyword, payoff) {
    return {
      beforeAttack: function (c) {
        folls(c.myField).forEach(function (x) {
          if (x !== c.self && nameHas(x, keyword)) c.discard(x);
        });
        var done = false, i;
        for (i = 0; i < c.myHand.length; i++) {
          if (nameHas(c.myHand[i], '換裝')) { c.discardHand(i); done = true; break; }
        }
        if (!done) done = c.exileWhere(c.me, function (d) { return nameHas(d, '換裝'); }, 1) > 0;
        if (!done) return;
        payoff(c);
      }
    };
  }

  /* 回合開始：對手手牌／牌組少一張，然後此卡體力 +2。（三張同款，來源不同） */
  function drainThenHeal(what) {
    return {
      turnStart: function (c) {
        var done = false;
        if (what === 'spell') {
          for (var i = 0; i < c.foeHand.length; i++) {
            if (c.foeHand[i].type === 'spell') { c.discardFoeHand(i); done = true; break; }
          }
          if (done) c.say('對手手牌隨機一張咒語送入墓地');
        } else if (what === 'follower') {
          var t = pick(c, c.foeHand.filter(function (x) { return x.type === 'follower'; }), 1)[0];
          if (t) { c.discardFoeHand(c.foeHand.indexOf(t)); done = true; c.say('對手手牌隨機一張隨從送入墓地'); }
        } else {
          done = c.millDeck(c.foe, 1).length > 0;
          if (done) c.say('對手牌組第一張送入墓地');
        }
        if (!done) return;
        c.say('此卡體力 +2');
        c.mod(c.self, { sta: 2 });
      }
    };
  }

  /* 防禦前：與角色同陣營時給效果，然後失去這個能力。（兩張同款） */
  function sameFactionThenLose(body) {
    return {
      beforeDefend: function (c) {
        if (!c.myChar || c.self.faction !== c.myChar.faction) return;
        body(c);
        c.loseSkills();
      }
    };
  }

  var EX1 = {

    /* ═════════ 公立學校 ═════════ */

    sanctuary_hunter_asmis: sameFactionThenLose(function (c) {
      c.say('防禦前　與角色同陣營　→　我方生命 +8（發動後失去這個能力）');
      c.life(c.me, 8);
    }),

    sleep_club_president: graveShuffle(),
    council_maron: dressUpSwap('換裝・瑪隆'),

    sister_vermet_vilosa: drainThenHeal('spell'),

    dress_up_maron: dressUpBody('換裝・瑪隆', function (c) {
      if (!c.defender) return;
      c.say('消耗一張「換裝」　→　防禦隨從 攻 −1 / 體 −2');
      c.mod(c.defender, { atk: -1, sta: -2 });
    }),

    over_the_wall: {
      spell: function (c) {
        var t = folls(c.myField).filter(function (x) { return isFac(x, 'vita'); })[0];
        if (!t) return;
        var s = c.slotOf(t);
        if (s !== 4 && !c.myField[4]) {
          c.myField[4] = t;
          c.myField[s] = null;
          c.say('我方第一張「公立」隨從移動到第 Ⅴ 格');
        }
        var n = 0;
        [1, 3].forEach(function (i) { if (c.myField[i]) n += c.myField[i].size || 0; });
        n = Math.min(8, n);
        if (!n) return;
        c.say('第 Ⅱ・Ⅳ 格 SIZE 合計 ' + n + '　→　該隨從 攻/體 +' + n);
        c.mod(t, { atk: n, sta: n });
      }
    },

    uniform_tweak: {
      spell: function (c) {
        var t = pick(c, folls(c.myField).filter(function (x) { return isFac(x, 'vita'); }), 2);
        if (!t.length) return;
        c.say('我方隨機 2 張「公立」隨從　攻擊力 +防禦×2　體力 −防禦的一半');
        t.forEach(function (x) {
          var d = x.def;
          if (d) c.mod(x, { atk: d * 2, sta: -down(d / 2) });
        });
      }
    },

    dress_up_change: {
      spell: function (c) {
        var a = folls(c.myField).filter(function (x) { return nameHas(x, '學生會委員的瑪隆'); })[0];
        var b = folls(c.myField).filter(function (x) { return nameHas(x, '神聖研究會的斯瑪媞雷恩'); })[0];
        if (!a && !b) return;
        if (a) c.discard(a);
        if (b) c.discard(b);
        c.say('把「學生會委員的瑪隆」／「神聖研究會的斯瑪媞雷恩」送入墓地');
        var got = c.deckToField(function (d) {
          return d && (d.name.indexOf('換裝・瑪隆') >= 0 || d.name.indexOf('換裝・斯瑪媞雷恩') >= 0);
        }, 1)[0];
        if (!got) return;
        c.say('牌組第一張「換裝」放到場上　SIZE = 5　攻/體 +3');
        c.set(got, 'size', 5);
        c.mod(got, { atk: 3, sta: 3 });
      }
    },

    /* ═════════ 私立學校 ═════════ */

    arbiter_rivelta_answer: {
      beforeDefend: function (c) {
        if (!c.myChar || c.self.faction !== c.myChar.faction) return;
        var n = c.graveToDeckBottom(c.me, 5);
        if (!n) return;
        c.say('防禦前　墓地 ' + n + ' 張放到牌組下方');
        if (c.attacker) {
          var d = up(n / 2);
          c.say('攻擊隨從攻擊力 −' + d + '（放回張數的一半）');
          c.mod(c.attacker, { atk: -d });
        }
        c.loseSkills();
      }
    },

    fortune_lady: graveShuffle(),

    unlucky_lady: {
      turnStart: function (c) {
        if (c.g.turn % 2 !== 1) return;
        buff(c, folls(c.myField).filter(function (x) { return isFac(x, 'academy'); }),
             { atk: 2, sta: 2 }, '奇數回合　→　我方「私立」隨從全體　攻/體 +2');
      }
    },

    tea_time_lady: {
      turnStart: function (c) {
        buff(c, pick(c, folls(c.foeField), 2), { atk: -1, sta: -1 },
             '敵方隨機 2 張隨從　攻/體 −1');
      }
    },

    '2s_agent_fourteen': {
      turnStart: function (c) {
        var n = Math.max(0, SG.CONST.HAND_MAX - c.foeHand.length);
        if (!n) return;
        var got = c.deckBottomToFoeHand(n);
        if (!got) return;
        c.say('對手牌組最底 ' + got + ' 張移到對手手牌　→　此卡體力 +2');
        c.mod(c.self, { sta: 2 });
      }
    },

    unionize: {
      spell: function (c) {
        var want = Math.max(0, SG.CONST.HAND_MAX - c.myHand.length) + c.self.size;
        var t = cards(c.foeField).filter(function (x) { return x.size === want; })[0];
        if (!t) return;
        c.say('手牌空格＋此卡 SIZE ＝ ' + want + '　→　敵方同 SIZE 的第一張放到牌組下方');
        c.toDeckBottom(t);
      }
    },

    tea_time: {
      spell: function (c) {
        var t = pick(c, folls(c.myField).filter(function (x) { return isFac(x, 'academy'); }), 2);
        if (t.length < 2) return;
        var n = Math.min(4, Math.abs(t[0].size - t[1].size));
        if (!n) return;
        buff(c, t, { atk: n, sta: n }, '我方隨機 2 張「私立」隨從　攻/體 +' + n + '（兩者 SIZE 差）');
      }
    },

    adjustment: {
      spell: function (c) {
        if (!folls(c.myField).length || !c.myHand.length) return;
        c.say('我方手牌第一張送入墓地');
        c.discardHand(0);
        var n = c.myHand.length;
        var gone = 0;
        for (var i = 0; i < n && c.foeHand.length; i++) { c.discardFoeHand(0); gone++; }
        if (gone) c.say('對手手牌 ' + gone + ' 張送入墓地');
        var t = pick(c, folls(c.foeField), 1)[0];
        if (t && n) {
          c.say('敵方一張隨從攻擊力 −' + n + '（我方手牌數）');
          c.mod(t, { atk: -n });
        }
        c.say('此卡從遊戲中除外');
        c.exileSelf();
      }
    },

    /* ═════════ 南十字 ═════════ */

    crux_knight_fleta: sameFactionThenLose(function (c) {
      buff(c, folls(c.myField).filter(function (x) { return isFac(x, 'crux'); }),
           { atk: 3, sta: 3 }, '防禦前　與角色同陣營　→　我方「南十字」隨從全體　攻/體 +3（發動後失去這個能力）');
    }),

    seeker_smartylane: dressUpSwap('換裝・斯瑪媞雷恩'),
    lancer_knight: graveShuffle(),
    medic_knight: drainThenHeal('deck'),

    dress_up_smartylane: dressUpBody('換裝・斯瑪媞雷恩', function (c) {
      c.say('消耗一張「換裝」　→　此卡 攻 +1 / 體 +2');
      c.mod(c.self, { atk: 1, sta: 2 });
    }),

    brilliant_brain: {
      spell: function (c) {
        if (!isFac(c.myChar, 'crux')) return;
        var t = pick(c, cards(c.foeField).filter(function (x) { return x.type === 'spell'; }), 1)[0];
        if (!t) return;
        var n = t.size || 0;
        c.say('敵方隨機 1 張咒語「' + t.name + '」放到牌組下方');
        c.toDeckBottom(t);
        var h = c.myHand.filter(function (x) { return x.type === 'follower'; })[0];
        if (h && n) {
          c.say('手牌第一張隨從　攻/體 +' + n + '（放回卡片的 SIZE）');
          c.modHand(h, { atk: n, sta: n });
        }
      }
    },

    vivid_world_of_kana: {
      spell: function (c) {
        if (!c.myChar) return;
        var fac = c.myChar.faction, put = 0, milled = 0;
        for (var i = 0; i < 2; i++) {
          var top = c.peekDeck(c.me);
          if (!top) break;
          if (top.faction === fac) {
            var got = c.deckToField(function (d) { return d === top; }, 1)[0];
            if (got) { c.set(got, 'size', c.self.size); put++; }
          } else {
            c.millDeck(c.me, 1); milled++;
          }
        }
        if (put || milled) {
          c.say('翻開牌組上方 2 張　→　同陣營 ' + put + ' 張放到場上（SIZE = ' + c.self.size + '），其餘 ' + milled + ' 張送墓');
        }
        c.say('此卡從遊戲中除外');
        c.exileSelf();
      }
    },

    /* ═════════ 暗黑族 ═════════ */

    scardel_elder_barbera: sameFactionThenLose(function (c) {
      var t = null;
      c.myGrave.forEach(function (x) {
        if (x.type === 'follower' && x.faction === 'darklore' && (!t || x.size > t.size)) t = x;
      });
      if (!t) return;
      c.exileWhere(c.me, function (d) { return d === t; }, 1);
      var got = c.spawnById(t.id);
      if (!got) return;
      c.say('除外墓地 SIZE 最大的「暗黑」隨從　→　在場上生成一張複製　攻/體 +' + c.self.def);
      if (c.self.def) c.mod(got, { atk: c.self.def, sta: c.self.def });
    }),

    magic_circle_witch: graveShuffle(),

    contract_witch: {
      beforeDefend: function (c) {
        if (!c.attacker || c.attacker.size >= c.self.size) return;
        c.say('攻擊隨從 SIZE 較低　→　此卡 攻/防 +1');
        c.mod(c.self, { atk: 1, def: 1 });
      }
    },

    crescent_elder_riesling: {
      beforeAttack: function (c) {
        c.say('攻擊前　攻擊力 +1');
        c.mod(c.self, { atk: 1 });
      }
    },

    vampire_hunter_ire_flina: drainThenHeal('follower'),

    the_crescent_enigmas: {
      spell: function (c) {
        var n = 0;
        for (var i = c.myHand.length - 1; i >= 0 && n < 2; i--) {
          if (isFac(c.myHand[i], 'darklore')) { c.discardHand(i); n++; }
        }
        if (!n) return;
        c.say('手牌隨機 ' + n + ' 張「暗黑」卡送入墓地');
        var t = pick(c, folls(c.myField).filter(function (x) { return isFac(x, 'darklore'); }), 1)[0];
        if (!t) return;
        var d = Math.abs(t.atk - t.sta);
        if (!d) return;
        c.say('我方隨機 1 張「暗黑」隨從　攻擊力 +' + d + '（攻與體的差）');
        c.mod(t, { atk: d });
      }
    },

    final_answer: {
      spell: function (c) {
        if (!isFac(c.myChar, 'darklore')) return;
        var t = maxBy(folls(c.foeField), function (x) { return x.atk + x.sta; });
        if (!t) return;
        var n = c.myHand.length + c.foeHand.length;
        if (!n) return;
        c.say('敵方 攻/體 合計最高的「' + t.name + '」　SIZE 與 攻/體 各 −' + n + '（雙方手牌合計）');
        c.mod(t, { size: -n, atk: -n, sta: -n });
      }
    },

    scardel_rite: {
      spell: function (c) {
        var t = folls(c.myField).filter(function (x) {
          return nameHas(x, '斯卡迪魯') || nameHas(x, '克雷森特') || nameHas(x, '菲莉娜');
        });
        if (!t.length) return;
        c.say('我方「斯卡迪魯／克雷森特／菲莉娜」隨從　SIZE = 1');
        t.forEach(function (x) { c.set(x, 'size', 1); });
        var first = null;
        c.myGrave.forEach(function (x) {
          if (!first && x.type === 'follower' && x.faction === 'darklore') first = x;
        });
        if (!first) return;
        c.exileWhere(c.me, function (d) { return d === first; }, 1);
        var got = c.spawnById(first.id);
        if (got) c.say('除外墓地第一張「暗黑」隨從　→　在場上生成一張複製');
      }
    },

    /* ═════════ 沒有官方譯名的那 16 張 ═════════ */

    child_vernika: {
      turnStart: function (c) {
        if (!c.myHand.length) return;
        var sz = c.myHand[0].size || 0;
        c.toDeckBottomHand(0);
        var t = maxBy(folls(c.foeField), function (x) { return x.sta; });
        if (!t) return;
        var d = Math.min(3, up(sz / 2));
        if (!d) return;
        c.say('手牌第一張放到牌組下方　→　敵方體力最高的隨從　防禦 −' + d);
        c.mod(t, { def: -d });
      }
    },

    child_rose: {
      turnStart: function (c) {
        var lim = 9 - sumSize(c.myField);
        var idx = -1;
        for (var i = 0; i < c.myHand.length; i++) {
          var h = c.myHand[i];
          if (h.type === 'spell' && isFac(h, 'academy') && (h.size || 0) < lim) { idx = i; break; }
        }
        if (idx < 0) return;
        var sz = c.myHand[idx].size || 0;
        if (!c.handToField(idx)) return;
        c.say('手牌的「私立」咒語（SIZE < ' + lim + '）放到第一個空格');
        var t = pick(c, folls(c.foeField), 1)[0];
        if (t && sz) {
          c.say('敵方隨機 1 張隨從　攻/體 −' + sz);
          c.mod(t, { atk: -sz, sta: -sz });
        }
      }
    },

    child_jaina: {
      turnStart: function (c) {
        var t = pick(c, folls(c.foeField), 1)[0];
        if (!t) return;
        c.say('敵方隨機 1 張隨從　攻擊力 −1');
        c.mod(t, { atk: -1 });
        buff(c, pick(c, folls(c.myField), 1), { atk: 2 }, '我方隨機 1 張隨從　攻擊力 +2');
      }
    },

    child_ginger: {
      turnStart: function (c) {
        var t = pick(c, folls(c.myField), 1)[0];
        if (t) {
          c.say('我方隨機 1 張隨從　攻擊力 +2　後放到牌組最上方');
          c.mod(t, { atk: 2 });
          c.fieldToDeckTop(t);
        }
        buff(c, pick(c, folls(c.myField), 1), { atk: 2 }, '接著我方隨機 1 張隨從　攻擊力 +2');
      }
    },

    child_laevateinn: {
      turnStart: function (c) {
        var seen = {}, dup = 0;
        c.myHand.forEach(function (x) {
          var s = x.size || 0;
          seen[s] = (seen[s] || 0) + 1;
          if (seen[s] === 2 && s > dup) dup = s;
        });
        if (!dup) return;
        for (var i = c.myHand.length - 1; i >= 0; i--) {
          if ((c.myHand[i].size || 0) === dup) c.toDeckBottomHand(i);
        }
        var n = Math.min(4, up(dup / 2));
        c.say('手牌兩張以上 SIZE ' + dup + ' 的卡放到牌組下方　→　生命 +' + n);
        c.life(c.me, n);
      }
    },

    child_sigma: {
      turnStart: function (c) {
        if (!c.myHand.length) return;
        var sz = c.myHand[0].size || 0;
        c.toDeckBottomHand(0);
        var n = Math.min(4, down(sz / 2));
        if (!n) return;
        buff(c, pick(c, folls(c.myField), 1), { atk: n, sta: n },
             '手牌第一張放到牌組下方　→　我方隨機 1 張隨從　攻/體 +' + n);
      }
    },

    hot_springs_sita: {
      turnStart: function (c) {
        var t = [2, 3, 4].map(function (n) {
          var x = c.foeField[n - 1];
          return (x && x.type === 'follower') ? x : null;
        }).filter(Boolean);
        buff(c, t, { sta: -2 }, '敵方 Ⅱ・Ⅲ・Ⅳ 格隨從　體力 −2');
        buff(c, pick(c, folls(c.foeField), 1), { sta: -1 }, '敵方隨機 1 張隨從　體力 −1');
      }
    },

    hot_springs_cinia: {
      turnStart: function (c) {
        var t = pick(c, folls(c.foeField), 1)[0];
        if (!t) return;
        var hi = t.def >= 1;
        c.say('敵方隨機 1 張隨從（防禦 ' + t.def + '）　→　' + (hi ? '防/體 −1' : '攻/體 −2'));
        c.mod(t, hi ? { def: -1, sta: -1 } : { atk: -2, sta: -2 });
      }
    },

    hot_springs_luthica: {
      turnStart: function (c) {
        var t = pick(c, folls(c.myField), 1)[0];
        if (!t) return;
        var hi = t.def >= 1;
        c.say('我方隨機 1 張隨從（防禦 ' + t.def + '）　→　' + (hi ? '攻/體 +2' : '防/體 +1'));
        c.mod(t, hi ? { atk: 2, sta: 2 } : { def: 1, sta: 1 });
      }
    },

    hot_springs_iri: {
      turnStart: function (c) {
        var big = folls(c.foeField).filter(function (x) { return x.sta >= 10; });
        if (big.length) {
          buff(c, big, { sta: -4 }, '敵方體力 10 以上的隨從　體力 −4');
          return;
        }
        buff(c, pick(c, folls(c.foeField), 1), { atk: -1, def: -1, sta: -1 },
             '敵方沒有體力 10 以上的隨從　→　隨機 1 張　攻/防/體 −1');
      }
    },

    layna_scentriver: {
      turnStart: function (c) {
        buff(c, pick(c, folls(c.myField).filter(function (x) { return isFac(x, 'vita'); }), 1),
             { atk: 1, sta: 1 }, '我方隨機 1 張「公立」隨從　攻/體 +1');
      }
    },

    chief_maid_char: {
      turnStart: function (c) {
        var a = sumSize(c.myField), b = sumSize(c.foeField);
        if (a <= b) return;
        c.say('我方 SIZE 總和 ' + a + ' 高於敵方 ' + b + '　→　敵方角色生命 −1');
        c.life(c.foe, -1);
      }
    },

    new_knight_char: {
      turnStart: function (c) {
        var t = [1, 2, 3].map(function (n) {
          var x = c.foeField[n - 1];
          return (x && x.type === 'follower') ? x : null;
        }).filter(Boolean);
        buff(c, t, { sta: -1 }, '敵方 Ⅰ・Ⅱ・Ⅲ 格隨從　體力 −1');
      }
    },

    nytitch: {
      turnStart: function (c) {
        buff(c, pick(c, folls(c.foeField), 1), { atk: -1, sta: -1 },
             '敵方隨機 1 張隨從　攻/體 −1');
      }
    },

    sweet_lady_isfeldt: {
      beforeAttack: function (c) {
        c.say('攻擊前　體力 +2');
        c.mod(c.self, { sta: 2 });
      },
      beforeDefend: function (c) {
        var a = c.attacker;
        if (!a || a.size > c.self.size) return;
        c.say('攻擊隨從 SIZE 不大於此卡　→　放到其擁有者的牌組最上方（此卡暫時失去這個能力）');
        c.fieldToDeckTop(a);
        c.loseSkills();
        c.grantSkill(c.self, '__ep3_restore');
      }
    },

    education_results: {
      spell: function (c) {
        var idx = -1;
        for (var i = 0; i < c.myHand.length; i++) {
          if (isFac(c.myHand[i], 'crux')) { idx = i; break; }
        }
        if (idx < 0) return;
        c.say('手牌第一張「南十字」卡「' + c.myHand[idx].name + '」送入墓地');
        c.discardHand(idx);
        buff(c, pick(c, folls(c.myField).filter(function (x) { return isFac(x, 'crux'); }), 1),
             { atk: 4, sta: 4 }, '我方隨機 1 張「南十字」隨從　攻 +4 / 體 +4');
      }
    }
  };

  for (var k in EX1) SG.Effects[k] = EX1[k];
})();
