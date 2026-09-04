/* ═══════════════════════════════════════════════════════════
   Episode EX2 卡片效果（33 張裡有效果的 32 張）

   撰寫原則跟 effects.js 一樣：先 say() 宣告效果發動，再做事。

   ★ 這一章繁中 wiki 完全沒有收錄，卡名與效果文都是本專案自譯
     （見 tools/epex2_names.json、epex2_effects.json）。

   ★ 「萬聖節」三張會把對手手牌的咒語複製一份到我方場上，
     用 ctx.spawnCopy() 做。
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

  /* ── 萬聖節系列會授予的臨時能力 ── */
  SG.Effects.__ex2_atk_down = {
    beforeAttack: function (c) { c.say('萬聖節的詛咒　攻擊前　攻擊力 −1'); c.mod(c.self, { atk: -1 }); }
  };
  SG.Effects.__ex2_sta_down = {
    beforeDefend: function (c) { c.say('萬聖節的詛咒　防禦前　體力 −3'); c.mod(c.self, { sta: -3 }); }
  };
  SG.Effects.__ex2_atk_up = {
    beforeAttack: function (c) { c.say('萬聖節的祝福　攻擊前　攻/體 +1'); c.mod(c.self, { atk: 1, sta: 1 }); }
  };
  SG.Effects.__ex2_sta_up = {
    beforeDefend: function (c) { c.say('萬聖節的祝福　防禦前　體力 +3'); c.mod(c.self, { sta: 3 }); }
  };
  SG.Effects.__ex2_def_up = {
    turnStart: function (c) { c.say('萬聖節的祝福　回合開始　防禦 +2'); c.mod(c.self, { def: 2 }); }
  };
  /* 「碎裂的大地」授予的能力 */
  SG.Effects.__ex2_soak = {
    beforeDefend: function (c) {
      if (!c.attacker) return;
      c.say('防禦前　體力上升攻擊隨從的攻擊力（發動後失去這個能力）');
      c.mod(c.self, { sta: c.attacker.atk });
      c.loseSkills();
    }
  };
  /* 「皇家學園」授予的能力：下個回合把數值變回原本的 */
  SG.Effects.__ex2_revert = {
    turnStart: function (c) {
      c.say('回合開始　攻/防/體 變回原本的數值（發動後失去這個能力）');
      c.set(c.self, 'atk', c.self.baseAtk);
      c.set(c.self, 'def', c.self.baseDef);
      c.set(c.self, 'sta', c.self.baseSta);
      c.loseSkills();
    }
  };

  /* 把對手手牌第一張不含「萬聖節」的咒語複製到我方場上 */
  function halloweenCopy(c) {
    for (var i = 0; i < c.foeHand.length; i++) {
      var h = c.foeHand[i];
      if (h.type === 'spell' && !nameHas(h, '萬聖節')) {
        if (c.spawnCopy(h)) c.say('把對手手牌的「' + h.name + '」複製一份放到我方場上');
        return true;
      }
    }
    return false;
  }

  /* 「○○的裝束」三張同款，只差陣營與人名 */
  function suitSpell(faction, who) {
    return {
      spell: function (c) {
        buff(c, pick(c, folls(c.myField).filter(function (x) { return isFac(x, faction); }), 2),
             { atk: 2, sta: 2 }, '我方隨機 2 張同陣營隨從　攻 +2 / 體 +2');
        buff(c, pick(c, folls(c.myField).filter(function (x) { return nameHas(x, who); }), 2),
             { atk: 1, sta: 1 }, '我方隨機 2 張「' + who + '」隨從　攻 +1 / 體 +1');
      }
    };
  }

  /* 牌組前兩張指定名稱的卡加入手牌，再依 payoff 給後續效果 */
  function tutorTwo(who, payoff) {
    return {
      spell: function (c) {
        var got = c.deckToHand(function (d) { return d && d.name.indexOf(who) >= 0; }, 2);
        if (!got.length) return;
        c.say('牌組前 ' + got.length + ' 張「' + who + '」加入手牌');
        if (payoff) payoff(c, got);
      }
    };
  }

  var EX2 = {

    /* ═════════ 公立學校 ═════════ */

    vernika_answer: {
      turnStart: function (c) {
        var n = 0;
        for (var i = c.foeHand.length - 1; i >= 0; i--) {
          if (c.foeHand[i].type === 'spell') { c.foeHandToDeckBottom(i); n++; }
        }
        if (n) c.say('對手手牌 ' + n + ' 張咒語放到對手牌組下方');
      }
    },

    council_press_student: {
      beforeAttack: function (c) {
        buff(c, folls(c.myField).filter(function (x) { return nameHas(x, '學生會'); }),
             { atk: 1 }, '攻擊前　我方「學生會」隨從　攻 +1');
      },
      beforeDefend: function (c) {
        buff(c, folls(c.myField).filter(function (x) { return nameHas(x, '學生會'); }),
             { sta: 1 }, '防禦前　我方「學生會」隨從　體 +1');
      }
    },

    council_event_inspector: {
      beforeDefend: function (c) {
        c.say('防禦前　體力 +1');
        c.mod(c.self, { sta: 1 });
      }
    },

    tennis_guide: {
      beforeAttack: function (c) {
        c.say('攻擊前　攻擊力 +1');
        c.mod(c.self, { atk: 1 });
      }
    },

    lib_advisor: {
      beforeAttack: function (c) {
        var me = c.self.name;
        var n = c.exileDeck(function (d) { return d && d.name === me; });
        if (!n) return;
        c.say('牌組中 ' + n + ' 張同名卡除外　→　此卡 攻 +' + n + ' / 防 +' + n + ' / 體 +' + (n * 2));
        c.mod(c.self, { atk: n, def: n, sta: n * 2 });
      }
    },

    cook_club_critic: {
      beforeDefend: function (c) {
        var s = c.slotOf(c.self), n = 0;
        [s - 1, s + 1].forEach(function (i) {
          var x = (i >= 0 && i < 5) ? c.myField[i] : null;
          if (x && x.type === 'follower' && x.faction === c.self.faction) n++;
        });
        if (!n) return;
        c.say('防禦前　體力 +' + n + '（相鄰同陣營隨從數）　攻 +' + up(n / 2));
        c.mod(c.self, { sta: n, atk: up(n / 2) });
      }
    },

    council_press_winfield: {
      beforeAttack: function (c) {
        for (var i = 0; i < c.myHand.length; i++) {
          if (nameHas(c.myHand[i], '學生會')) {
            c.say('攻擊前　手牌「' + c.myHand[i].name + '」放到牌組下方　→　此卡 攻 +1 / 體 +2');
            c.toDeckBottomHand(i);
            c.mod(c.self, { atk: 1, sta: 2 });
            return;
          }
        }
      }
    },

    lunia_scentriver: {
      beforeAttack: function (c) {
        var d = c.defender;
        if (!d || !c.hasSkill(d)) return;
        var before = (c.self.skills || []).length;
        c.copySkills(d, c.self, 2);
        var n = (c.self.skills || []).length - before;
        if (!n) return;
        c.say('攻擊前　複製防禦隨從 ' + n + ' 個能力　→　攻/體 +' + n);
        c.mod(c.self, { atk: n, sta: n });
      }
    },

    sword_girls_sita: {
      turnStart: function (c) {
        var got = c.deckToField(function (d) {
          return d && d.type === 'follower' && d.name.indexOf('劍之少女') >= 0;
        }, 1)[0];
        if (!got) return;
        c.restoreSkills(got);
        c.say('牌組第一張「劍之少女」恢復原本能力並放到場上　體力 +3');
        c.mod(got, { sta: 3 });
        c.say('此卡放到牌組下方');
        c.fieldToDeckBottom(c.self);
      },
      beforeAttack: function (c) {
        if (!buff(c, folls(c.myField), { atk: 2, sta: 1 },
                  '攻擊前　我方所有隨從　攻 +2 / 體 +1（發動後失去這個能力）')) return;
        c.loseSkills();
      }
    },

    animal_suit_sita: {
      beforeDefend: function (c) {
        var n = cards(c.myField).filter(function (x) { return nameHas(x, '西塔'); }).length;
        if (!n) return;
        var def = n >= 2 ? 2 : 1;
        var sta = n >= 3 ? 3 : n;
        c.say('我方「西塔」' + n + ' 張　→　防 = ' + def + ' / 體 +' + sta);
        c.set(c.self, 'def', def);
        c.mod(c.self, { sta: sta });
      }
    },

    hot_item: {
      spell: function (c) {
        buff(c, folls(c.myField), { atk: 2, sta: 3 }, '我方所有隨從　攻 +2 / 體 +3');
      }
    },

    principals_story: {
      spell: function (c) {
        if (!c.foeChar) return;
        for (var i = 0; i < c.foeHand.length; i++) {
          if (c.foeHand[i].faction !== c.foeChar.faction) {
            c.say('搶走對手手牌第一張與其角色不同陣營的「' + c.foeHand[i].name + '」');
            c.stealHand(i);
            return;
          }
        }
      }
    },

    low_turnout: {
      spell: function (c) {
        var t = maxBy(folls(c.myField).filter(function (x) { return isFac(x, 'vita'); }),
                      function (x) { return x.def; });
        if (t && t.def) {
          c.say('我方防禦最高的「公立」隨從　體力 +' + (t.def * 2));
          c.mod(t, { sta: t.def * 2 });
        }
        for (var i = 0; i < c.myHand.length; i++) {
          if (isFac(c.myHand[i], 'vita')) {
            c.say('手牌第一張「公立」卡放到牌組下方');
            c.toDeckBottomHand(i);
            return;
          }
        }
      }
    },

    shattered_land: {
      spell: function (c) {
        var t = pick(c, folls(c.myField).filter(function (x) { return isFac(x, 'vita'); }), 2);
        if (!t.length) return;
        c.say('我方隨機 ' + t.length + ' 張「公立」隨從獲得「防禦時吸收攻擊力」的能力');
        t.forEach(function (x) { c.grantSkill(x, '__ex2_soak'); });
      }
    },

    keepsake: {
      spell: function (c) {
        var f = folls(c.myField);
        if (f.length < 2) return;
        var n = f[0].size;
        c.say('第二張隨從　攻/防/體 +' + n + '（第一張的 SIZE）');
        c.mod(f[1], { atk: n, def: n, sta: n });
        if (isFac(c.myChar, 'vita')) {
          c.say('角色是「公立」　→　第一張隨從放到牌組下方');
          c.fieldToDeckBottom(f[0]);
        } else {
          c.say('角色不是「公立」　→　第一張隨從送入墓地');
          c.discard(f[0]);
        }
      }
    },

    sitas_suit: suitSpell('vita', '西塔'),

    perky_girl: tutorTwo('西塔', function (c, got) {
      got.forEach(function (x) { c.modHand(x, { size: -2 }); });
      c.say('那些卡 SIZE −2');
    }),

    halloween_minidevil: {
      spell: function (c) {
        var h = c.myHand.filter(function (x) { return x.type === 'follower'; })[0];
        if (!h) return;
        var t = pick(c, folls(c.foeField), 1)[0];
        if (!t) return;
        c.say('敵方隨機 1 張隨從　體力 −' + h.atk + '（手牌第一張隨從的攻擊力）');
        c.mod(t, { sta: -h.atk });
        halloweenCopy(c);
      }
    },

    /* ═════════ 私立學校 ═════════ */

    inevitable_choice: {
      spell: function (c) {
        if (!isFac(c.myChar, 'academy')) return;
        var t = folls(c.myField).filter(function (x) { return isFac(x, 'academy'); })[0];
        if (!t) return;
        var n = cards(c.myField).filter(function (x) { return isFac(x, 'academy'); }).length;
        var m = cards(c.myField).filter(function (x) { return nameHas(x, '淑女'); }).length;
        c.say('我方第一張「私立」隨從　攻/體 +' + n + ' / SIZE −' + m);
        c.mod(t, { atk: n, sta: n, size: -m });
      }
    },

    table_manners: {
      spell: function (c) {
        var want = c.slotOf(c.self) + 1 + c.self.size;
        var t = cards(c.foeField).filter(function (x) { return x.size === want; })[0];
        if (!t) return;
        c.say('敵方第一張 SIZE ' + want + ' 的卡「' + t.name + '」送入墓地');
        c.discard(t);
        c.deactivate(c.self);
      }
    },

    royle_academy: {
      spell: function (c) {
        if (!c.myChar) return;
        var t = folls(c.myField).filter(function (x) { return x.faction === c.myChar.faction; })[0];
        if (!t) return;
        c.say('我方第一張同陣營隨從　攻/防/體 加倍');
        c.set(t, 'atk', t.atk * 2);
        c.set(t, 'def', t.def * 2);
        c.set(t, 'sta', t.sta * 2);
        c.grantSkill(t, '__ex2_revert');
      }
    },

    cinias_suit: suitSpell('academy', '希妮亞'),

    diligent_girl: tutorTwo('希妮亞', function (c, got) {
      var sum = got.reduce(function (s, x) { return s + (x.size || 0); }, 0);
      var t = folls(c.foeField).filter(function (x) { return x.sta <= sum; })[0];
      if (!t) return;
      c.say('敵方第一張體力不超過 ' + sum + ' 的隨從「' + t.name + '」送入墓地');
      c.discard(t);
    }),

    halloween_countess: {
      spell: function (c) {
        if (!folls(c.myField).length) return;
        var t = pick(c, folls(c.foeField).filter(function (x) { return c.hasSkill(x); }), 1)[0];
        if (!t) return;
        halloweenCopy(c);
        c.say('敵方一張有能力的隨從失去能力，並換上萬聖節的詛咒');
        c.loseSkills(t);
        c.grantSkill(t, c.rnd() < 0.5 ? '__ex2_atk_down' : '__ex2_sta_down');
      }
    },

    /* ═════════ 南十字 ═════════ */

    crux_conference: {
      spell: function (c) {
        buff(c, pick(c, folls(c.foeField), 2), { atk: -1, sta: -3 },
             '敵方隨機 2 張隨從　攻 −1 / 體 −3');
      }
    },

    enemy_within: {
      spell: function (c) {
        var t = folls(c.myField).filter(function (x) {
          return isFac(x, 'crux') && c.hasSkill(x);
        });
        if (!t.length) return;
        var n = t.length;
        c.say('我方 ' + n + ' 張有能力的「南十字」隨從失去能力　→　攻/體 +' + n);
        t.forEach(function (x) { c.loseSkills(x); c.mod(x, { atk: n, sta: n }); });
      }
    },

    commissioned_research: {
      spell: function (c) {
        var f = folls(c.myField).filter(function (x) { return isFac(x, 'crux'); })[0];
        if (!f) return;
        var t = cards(c.foeField).filter(function (x) {
          return x.type === 'spell' && x.size <= f.size;
        });
        if (!t.length) return;
        c.say('敵方 SIZE ≤ ' + f.size + ' 的咒語 ' + t.length + ' 張放到對手牌組下方');
        t.forEach(function (x) { c.toDeckBottom(x); });
      }
    },

    supply_transfer: {
      spell: function (c) {
        if (!c.myChar) return;
        var t = folls(c.myField).filter(function (x) { return x.faction === c.myChar.faction; })[0];
        if (!t) return;
        var n = 2;
        folls(c.myField).forEach(function (x) { if (x !== t) n += x.size || 0; });
        c.say('我方第一張同陣營隨從　攻/體 +' + n + '（2 ＋ 其他隨從 SIZE 總和）');
        c.mod(t, { atk: n, sta: n });
      }
    },

    luthicas_suit: suitSpell('crux', '露西卡'),

    the_hazing: {
      spell: function (c) {
        var n = up(Math.max(0, SG.CONST.HAND_MAX - c.myHand.length) / 2);
        if (n) {
          buff(c, pick(c, folls(c.myField), 2), { def: n },
               '我方隨機 2 張隨從　防禦 +' + n + '（手牌空格的一半）');
        }
        var got = c.deckToHand(function (d) { return d && d.name.indexOf('露西卡') >= 0; }, 2);
        if (got.length) c.say('牌組前 ' + got.length + ' 張「露西卡」加入手牌');
      }
    },

    halloween_witch: {
      spell: function (c) {
        var t = pick(c, folls(c.myField), 1)[0];
        if (!t) return;
        var keys = ['__ex2_atk_up', '__ex2_sta_up', '__ex2_def_up'];
        var k = keys[Math.floor(c.rnd() * keys.length)];
        c.say('我方隨機 1 張隨從獲得萬聖節的祝福');
        c.grantSkill(t, k);
        halloweenCopy(c);
      }
    },

    /* ═════════ 無所屬 ═════════ */

    office_chief_esprit: {
      turnStart: function (c) {
        var n = 0;
        cards(c.myField).forEach(function (x) { n += (x.skills || []).length; });
        if (n <= 2) {
          var t = pick(c, folls(c.foeField).filter(function (x) { return c.hasSkill(x); }), 1)[0];
          if (!t) return;
          c.say('我方場上能力數 ' + n + '（≤2）　→　敵方隨機 1 張隨從失去能力');
          c.loseSkills(t);
        } else {
          buff(c, pick(c, folls(c.myField), 1), { atk: up(n / 2), sta: up(n / 2) },
               '我方場上能力數 ' + n + '（>2）　→　隨機 1 張隨從　攻/體 +' + up(n / 2));
        }
      }
    }
  };

  for (var k in EX2) SG.Effects[k] = EX2[k];
})();
