/* ═══════════════════════════════════════════════════════════
   Episode 4 卡片效果（66 張裡有效果的 62 張）

   撰寫原則跟 effects.js 一樣：先 say() 宣告效果發動，再做事。

   ★ EP4 一樣有很多「四張同款、只差陣營」的卡，先寫工廠函式再套用。
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
  function minBy(list, f) {
    var best = null;
    list.forEach(function (c) { if (!best || f(c) < f(best)) best = c; });
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

  /* ═════════ 工廠函式 ═════════ */

  /* 攻擊前，防禦隨從 SIZE +1；接著自己失去這個能力。（四張同款） */
  function bloatDefender() {
    return {
      beforeAttack: function (c) {
        if (!c.defender) return;
        c.say('攻擊前　防禦隨從「' + c.defender.name + '」SIZE +1（發動後失去這個能力）');
        c.mod(c.defender, { size: 1 });
        c.loseSkills();
      }
    };
  }

  /* 青十字會系列：手牌 2 張以下時受罰，4 張以上時失去這個能力。 */
  function blueCross(penalty, text, when) {
    var o = {};
    o[when] = function (c) {
      if (c.myHand.length >= 4) {
        c.say('手牌 ' + c.myHand.length + ' 張（≥4）　→　失去這個能力');
        c.loseSkills();
        return;
      }
      if (c.myHand.length > 2) return;
      c.say('手牌 ' + c.myHand.length + ' 張（≤2）　→　' + text);
      if (typeof penalty === 'function') penalty(c);
      else c.mod(c.self, penalty);
    };
    return o;
  }

  /* 防禦前，角色同陣營時：手牌前兩張放牌組下方，並讓一張行動終了的隨從恢復行動；
     再依 extra 給額外效果。（四張同款，只差陣營與 extra） */
  function rallyCombo(faction, extra) {
    return {
      beforeDefend: function (c) {
        if (!isFac(c.myChar, faction)) return;
        var moved = 0;
        while (moved < 2 && c.myHand.length) { c.toDeckBottomHand(0); moved++; }
        if (!moved) return;
        c.say('防禦前　手牌前 ' + moved + ' 張放到牌組下方');
        var done = pick(c, folls(c.myField).filter(function (x) { return x.activated; }), 1)[0];
        if (done) {
          c.say('我方隨機 1 張行動終了的隨從「' + done.name + '」恢復行動');
          done.activated = false;
        }
        extra(c);
      }
    };
  }

  /* 「換裝」系列：牌組第一張指定名稱的卡放到場上，SIZE = 5、攻/體 +3。 */
  function summonDressUp(keyword) {
    return function (c) {
      var got = c.deckToField(function (d) { return d && d.name.indexOf(keyword) >= 0; }, 1)[0];
      if (!got) return null;
      c.say('牌組第一張「' + keyword + '」放到場上　SIZE = 5　攻/體 +3');
      c.set(got, 'size', 5);
      c.mod(got, { atk: 3, sta: 3 });
      return got;
    };
  }

  var E4 = {

    /* ═════════ 公立學校 ═════════ */

    lib_student: bloatDefender(),

    council_student: {
      beforeAttack: function (c) {
        var t = folls(c.myField).filter(function (x) { return nameHas(x, '學生會'); })[0];
        if (!t) return;
        c.say('攻擊前　我方第一張「學生會」隨從　體力 +3（發動後失去這個能力）');
        c.mod(t, { sta: 3 });
        c.loseSkills();
      }
    },

    sleep_club_advisor: {
      beforeAttack: function (c) {
        if (!c.defender || c.defender.activated) return;
        c.say('攻擊前　防禦隨從「' + c.defender.name + '」進入行動終了（發動後失去這個能力）');
        c.deactivate(c.defender);
        c.loseSkills();
      }
    },

    council_weekly_help: {
      beforeDefend: function (c) {
        var a = c.attacker;
        if (!a) return;
        c.say('防禦前　與攻擊隨從交換攻擊力（' + c.self.atk + ' ⇄ ' + a.atk + '）');
        var t = c.self.atk;
        c.set(c.self, 'atk', a.atk);
        c.set(a, 'atk', t);
      }
    },

    lib_lotte_serie: rallyCombo('vita', function (c) {
      var t = pick(c, folls(c.myField), 1)[0];
      if (!t) return;
      c.say('我方隨機 1 張隨從　SIZE −1 / 攻・防 +1');
      c.mod(t, { size: -1, atk: 1, def: 1 });
    }),

    lib_milty: {
      beforeAttack: function (c) {
        var n = c.myHand.filter(function (x) { return nameHas(x, '圖書部'); }).length;
        if (!n) return;
        c.say('攻擊前　體力 +' + n + '（手牌「圖書部」隨從數）' + (n >= 3 ? '　攻擊力 +1' : ''));
        c.mod(c.self, n >= 3 ? { sta: n, atk: 1 } : { sta: n });
      }
    },

    council_vp_tieria: {
      beforeAttack: function (c) {
        var n = cards(c.myField).filter(function (x) { return nameHas(x, '學生會'); }).length;
        if (!n) return;
        c.say('攻擊前　攻/體 +' + n + '（我方「學生會」卡片數）');
        c.mod(c.self, { atk: n, sta: n });
        c.loseSkills();
        c.grantSkill(c.self, '__ep3_restore');
      }
    },

    child_gart: {
      turnStart: function (c) {
        var t = pick(c, folls(c.myField), 1)[0];
        if (!t) return;
        var even = c.g.turn % 2 === 0;
        c.say('我方隨機 1 張隨從　體力 +3' + (even ? ' / 攻擊力 +1（偶數回合）' : ''));
        c.mod(t, even ? { sta: 3, atk: 1 } : { sta: 3 });
      }
    },

    medusa_glasses: {
      spell: function (c) {
        var t = folls(c.foeField);
        if (!buff(c, t, { atk: -1 }, '敵方全體隨從　攻擊力 −1')) return;
        buff(c, pick(c, folls(c.myField).filter(function (x) { return isFac(x, 'vita'); }), 1),
             { sta: t.length }, '我方隨機 1 張「公立」隨從　體力 +' + t.length + '（下降總量）');
      }
    },

    comparison: {
      spell: function (c) {
        var a = minBy(folls(c.myField).filter(function (x) { return isFac(x, 'vita'); }),
                      function (x) { return x.size; });
        var b = folls(c.foeField)[0];
        if (!a || !b) return;
        c.say('我方 SIZE 最小的「公立」隨從與敵方第一張隨從　攻/防/體 互換');
        c.swapStats(a, b);
      }
    },

    spring_fever: {
      spell: function (c) {
        var t = pick(c, folls(c.myField).filter(function (x) { return isFac(x, 'vita'); }), 2);
        if (!t.length) return;
        c.say('我方隨機 2 張「公立」隨從　防禦 = 0，體力上升下降量的兩倍');
        t.forEach(function (x) {
          var d = x.def;
          c.set(x, 'def', 0);
          if (d) c.mod(x, { sta: d * 2 });
        });
      }
    },

    one_way_trip: {
      spell: function (c) {
        var t = folls(c.myField).filter(function (x) { return isFac(x, 'vita'); });
        if (!t.length) return;
        c.say('我方「公立」隨從依卡名分別強化');
        t.forEach(function (x) {
          if (nameHas(x, '料理研究部')) c.mod(x, { size: -1, sta: 2 });
          else if (nameHas(x, '圖書部')) c.mod(x, { atk: 1, sta: 1 });
          else if (nameHas(x, '學生會')) c.mod(x, { def: 1, sta: 1 });
          else c.mod(x, { atk: 1, def: 1 });
        });
      }
    },

    seize: {
      spell: function (c) {
        var mine = cards(c.myField).filter(function (x) { return x !== c.self; })[0];
        var theirs = cards(c.foeField)[0];
        if (!mine || !theirs) return;
        c.say('我方第一張卡與敵方第一張卡交換位置後回到手牌');
        var ms = c.slotOf(mine), ts = c.slotOf(theirs);
        c.move(c.me, ms, c.foe);
        c.move(c.foe, ts, c.me);
      }
    },

    breakdown: {
      spell: function (c) {
        var mine = folls(c.myField).filter(function (x) { return !c.hasSkill(x); })[0];
        var theirs = folls(c.foeField).filter(function (x) { return c.hasSkill(x); })[0];
        if (!mine || !theirs) return;
        c.say('我方一張沒有能力的隨從「' + mine.name + '」得到「' + theirs.name + '」的特殊能力');
        c.copySkills(theirs, mine, 1);
      }
    },

    absolute_control: {
      spell: function (c) {
        if (!isFac(c.myChar, 'vita') || !folls(c.myField).length) return;
        var t = pick(c, folls(c.foeField), 1)[0];
        if (t) { c.say('敵方隨機 1 張隨從送入墓地'); c.discard(t); }
        var sp = pick(c, cards(c.foeField).filter(function (x) { return x.type === 'spell'; }), 1)[0];
        if (sp) { c.say('敵方隨機 1 張咒語放到牌組下方'); c.toDeckBottom(sp); }
      }
    },

    /* ═════════ 私立學校 ═════════ */

    dispatch_maid: bloatDefender(),

    peace_lady: {
      beforeAttack: function (c) {
        var idx = -1;
        for (var i = 0; i < c.myHand.length; i++) {
          if (nameHas(c.myHand[i], '女僕')) { idx = i; break; }
        }
        if (idx < 0) return;
        c.say('攻擊前　手牌「' + c.myHand[idx].name + '」放到牌組最上方　此卡 攻 +1 / 體 +2');
        c.handToDeckTop(idx);
        c.mod(c.self, { atk: 1, sta: 2 });
      }
    },

    picnic_maid: {
      beforeDefend: function (c) {
        var n = c.myHand.filter(function (x) {
          return nameHas(x, '女僕') || nameHas(x, '淑女');
        }).length;
        if (!n) return;
        var t = pick(c, folls(c.foeField), 1)[0];
        if (!t) return;
        c.say('防禦前　敵方隨機 1 張隨從　體力 −' + n + '（手牌「女僕／淑女」數）');
        c.mod(t, { sta: -n });
        c.loseSkills();
        c.grantSkill(c.self, '__ep3_restore');
      }
    },

    chief_mop_maid: rallyCombo('academy', function (c) {
      var t = pick(c, folls(c.foeField), 1)[0];
      if (!t) return;
      c.say('敵方隨機 1 張隨從　SIZE +1 / 攻 −1 / 體 −2');
      c.mod(t, { size: 1, atk: -1, sta: -2 });
    }),

    justice_lady: {
      turnStart: function (c) {
        folls(c.myField).forEach(function (x) {
          if (nameHas(x, '換裝路賽')) c.discard(x);
        });
        var got = summonDressUp('換裝路賽')(c);
        if (!got) return;
        c.say('此卡送入墓地');
        c.discard(c.self);
      }
    },

    meteor_call_lady: {
      beforeAttack: function (c) {
        var n = cards(c.myField).filter(function (x) { return nameHas(x, '淑女'); }).length + 1;
        var t = pick(c, folls(c.foeField), 1)[0];
        if (!t) return;
        c.say('攻擊前　敵方隨機 1 張隨從　體力 −' + n + '（我方「淑女」數 +1）');
        c.mod(t, { sta: -n });
        c.loseSkills();
        c.grantSkill(c.self, '__ep3_restore');
      }
    },

    dress_up_lucerrie: {
      beforeAttack: function (c) {
        folls(c.myField).forEach(function (x) {
          if (x !== c.self && nameHas(x, '換裝路賽')) c.discard(x);
        });
        var done = false;
        for (var i = 0; i < c.myHand.length; i++) {
          if (nameHas(c.myHand[i], '換裝')) { c.exileHand(i); done = true; break; }
        }
        if (!done) done = c.exileWhere(c.me, function (d) { return nameHas(d, '換裝'); }, 1) > 0;
        if (!done) return;
        c.say('除外一張「換裝」　→　對手隨機捨棄一張手牌');
        if (c.foeHand.length) c.discardFoeHand(Math.floor(c.rnd() * c.foeHand.length));
      }
    },

    alchemist_clarice: {
      turnStart: function (c) {
        folls(c.myField).forEach(function (x) {
          if (nameHas(x, '人造護衛')) c.discard(x);
        });
        if (c.spawnById('artificial_guard', true)) {
          c.say('在最後一個空格生成一張「人造護衛」（5/0/5）');
        }
      }
    },

    child_nold: {
      turnStart: function (c) {
        if (c.g.turn % 2 !== c.myHand.length % 2) return;
        var t = pick(c, folls(c.myField).filter(function (x) { return x.size >= 2; }), 1)[0];
        if (!t) return;
        c.say('回合數與手牌數奇偶相同　→　我方隨機 1 張 SIZE 2 以上的隨從　SIZE −2');
        c.mod(t, { size: -2 });
      }
    },

    child_cannelle: {
      turnStart: function (c) {
        var t = pick(c, c.foeHand.filter(function (x) { return x.type === 'follower'; }), 1)[0];
        if (!t) return;
        c.say('對手手牌隨機 1 張隨從　SIZE = 1，攻/防/體 = 5/0/7');
        c.modHand(t, { size: 1 - t.size, atk: 5 - t.atk, def: -t.def, sta: 7 - t.sta });
      }
    },

    child_panica: {
      turnStart: function (c) {
        var t = pick(c, folls(c.myField), 1)[0];
        if (!t) return;
        var even = c.g.turn % 2 === 0;
        c.say('我方隨機 1 張隨從　體力 +3' + (even ? ' / 攻擊力 +1（偶數回合）' : ''));
        c.mod(t, even ? { sta: 3, atk: 1 } : { sta: 3 });
      }
    },

    dress_up_rise: {
      spell: function (c) {
        if (!folls(c.myField).some(function (x) { return nameHas(x, '換裝'); })) return;
        var t = pick(c, cards(c.foeField), 1)[0];
        if (!t) return;
        c.say('場上有「換裝」隨從　→　敵方隨機 1 張卡放到牌組下方');
        c.toDeckBottom(t);
      }
    },

    shift_change: {
      spell: function (c) {
        var m = folls(c.myField).filter(function (x) { return nameHas(x, '女僕'); })[0];
        if (m) {
          c.say('我方第一張「女僕」隨從　攻 +2 / 體 +2　放到牌組最上方');
          c.mod(m, { atk: 2, sta: 2 });
          c.fieldToDeckTop(m);
        }
        for (var i = 0; i < c.myHand.length; i++) {
          if (c.myHand[i].type === 'follower' && isFac(c.myHand[i], 'academy')) {
            var name = c.myHand[i].name;
            var put = c.handToField(i);
            if (put) {
              c.say('手牌第一張「私立」隨從「' + name + '」放到場上　攻 +2 / 體 +2');
              c.mod(put, { atk: 2, sta: 2 });
            }
            break;
          }
        }
      }
    },

    refreshments: {
      spell: function (c) {
        var n = 0;
        for (var i = c.myHand.length - 1; i >= 0; i--) {
          if (c.myHand[i].type === 'follower' && isFac(c.myHand[i], 'academy')) {
            c.toDeckBottomHand(i); n++;
          }
        }
        if (!n) return;
        c.say('手牌「私立」隨從 ' + n + ' 張放到牌組下方');
        var moved = 0;
        for (var j = c.foeHand.length - 1; j >= 0 && moved < n; j--) {
          if (c.foeHand[j].type === 'spell') {
            c.modHand(c.foeHand[j], { size: 1 });
            c.foeHandToDeckBottom(j);
            moved++;
          }
        }
        if (moved) c.say('對手手牌 ' + moved + ' 張咒語　SIZE +1 後放到牌組下方');
      }
    },

    servants_ward: {
      spell: function (c) {
        if (!isFac(c.myChar, 'academy')) return;
        var t = maxBy(cards(c.foeField), function (x) { return x.size; });
        if (!t) return;
        var drop = t.size - 1;
        c.say('敵方 SIZE 最大的「' + t.name + '」SIZE = 1');
        c.set(t, 'size', 1);
        if (drop <= 0) return;
        buff(c, pick(c, folls(c.foeField), 2), { atk: -(drop + 1), sta: -(drop + 1) },
             '敵方隨機 2 張隨從　攻/體 −' + (drop + 1) + '（下降量 +1）');
      }
    },

    obedience: {
      spell: function (c) {
        if (!isFac(c.myChar, 'academy')) return;
        var t = pick(c, folls(c.foeField).filter(function (x) { return x.size <= 4; }), 1)[0];
        if (!t) return;
        c.say('敵方隨機 1 張 SIZE 4 以下的隨從　SIZE +2');
        c.mod(t, { size: 2 });
        if (t.size >= 5) { c.say('SIZE 達 5 以上　→　體力 −3'); c.mod(t, { sta: -3 }); }
      }
    },

    meteor_call: {
      spell: function (c) {
        var mine = folls(c.myField).length, theirs = folls(c.foeField).length;
        buff(c, folls(c.foeField), { sta: -mine }, '敵方全體隨從　體力 −' + mine + '（我方隨從數）');
        buff(c, folls(c.myField), { sta: -theirs }, '我方全體隨從　體力 −' + theirs + '（敵方隨從數）');
      }
    },

    doubt: {
      spell: function (c) {
        if (!isFac(c.myChar, 'academy')) return;
        var m = folls(c.myField)[0];
        if (m) { c.say('我方第一張隨從「' + m.name + '」送入墓地'); c.discard(m); }
        var t = nameHas(c.myChar, '希妮亞')
          ? maxBy(folls(c.foeField).filter(function (x) { return c.hasSkill(x); }),
                  function (x) { return x.sta; })
          : pick(c, folls(c.foeField), 1)[0];
        if (!t) return;
        c.say('敵方「' + t.name + '」攻 = 1 / 體 = 1');
        c.set(t, 'atk', 1); c.set(t, 'sta', 1);
      }
    },

    /* ═════════ 南十字 ═════════ */

    blue_cross_member: bloatDefender(),
    blue_cross_sherry: blueCross({ def: -2 }, '此卡防禦 −2', 'beforeAttack'),
    blue_cross_aurora: blueCross({ atk: -1, sta: -1 }, '此卡 攻/體 −1', 'beforeAttack'),
    blue_cross_federine: blueCross({ sta: -2 }, '此卡體力 −2', 'beforeDefend'),

    blue_cross_florence: blueCross(function (c) {
      [[c.me, c.myField], [c.foe, c.foeField]].forEach(function (pair) {
        cards(pair[1]).forEach(function (x) { if (x !== c.self) c.discard(x); });
      });
    }, '場上除此卡以外全部送入墓地', 'beforeDefend'),

    knight_frett_pintail: rallyCombo('crux', function (c) {
      var t = pick(c, folls(c.myField), 1)[0];
      if (!t) return;
      c.say('我方隨機 1 張隨從　SIZE −1 / 攻 +1 / 體 +2');
      c.mod(t, { size: -1, atk: 1, sta: 2 });
    }),

    seeker_sarah: {
      beforeAttack: function (c) {
        var n = c.myHand.filter(function (x) { return nameHas(x, '神聖研究會'); }).length;
        if (!n || !c.defender) return;
        c.say('攻擊前　防禦隨從防禦 −' + n + '（手牌「神聖研究會」數）');
        c.mod(c.defender, { def: -n });
      }
    },

    fast_forward: {
      spell: function (c) {
        var n = 0;
        for (var i = c.myHand.length - 1; i >= 0; i--) {
          if (c.myHand[i].type === 'follower' && isFac(c.myHand[i], 'crux')) { c.discardHand(i); n++; }
        }
        if (!n) return;
        var last = folls(c.myField);
        last = last[last.length - 1];
        if (!last) return;
        c.say('手牌「南十字」隨從 ' + n + ' 張送墓　→　場上最後一張隨從　攻/體 +' + (n * 2));
        c.mod(last, { atk: n * 2, sta: n * 2 });
      }
    },

    cross_cut: {
      spell: function (c) {
        var n = 0;
        for (var i = 0; i < c.myHand.length && n < 2; ) {
          if (isFac(c.myHand[i], 'crux')) { c.toDeckBottomHand(i); n++; }
          else i++;
        }
        if (!n) return;
        c.say('手牌前 ' + n + ' 張「南十字」放到牌組下方');
        var t = pick(c, folls(c.foeField), 2);
        t.forEach(function (x) { c.deactivate(x); });
        if (t.length) c.say('敵方隨機 ' + t.length + ' 張隨從進入行動終了');
        if (cards(c.myField).some(function (x) {
          return nameHas(x, '騎士團') || nameHas(x, '青十字會');
        })) {
          buff(c, t, { sta: -2 }, '場上有「騎士團」或「青十字會」　→　追加體力 −2');
        }
      }
    },

    planned_misfortune: {
      spell: function (c) {
        var mn = minBy(folls(c.foeField), function (x) { return x.size; });
        if (!mn) return;
        buff(c, folls(c.myField).filter(function (x) { return x.size > mn.size; }),
             { atk: 1, def: 1, sta: 1 },
             '我方 SIZE 大於敵方最小（' + mn.size + '）的隨從　攻/防/體 +1');
      }
    },

    azure_cross_meeting: {
      spell: function (c) {
        buff(c, pick(c, folls(c.foeField).filter(function (x) { return !isFac(x, 'crux'); }), 2),
             { atk: -2, sta: -2 }, '敵方隨機 2 張非「南十字」隨從　攻/體 −2');
        var got = c.drawUpTo(4);
        if (got) c.say('補到 4 張手牌（抽 ' + got + ' 張）');
      }
    },

    false_delivery: {
      spell: function (c) {
        var i, n = 0;
        for (i = c.myHand.length - 1; i >= 0; i--) {
          if (c.myChar && c.myHand[i].faction !== c.myChar.faction) { c.discardHand(i); n++; }
        }
        for (i = c.foeHand.length - 1; i >= 0; i--) {
          if (c.foeChar && c.foeHand[i].faction !== c.foeChar.faction) { c.discardFoeHand(i); n++; }
        }
        if (n) c.say('雙方手牌與角色不同陣營的卡共 ' + n + ' 張送入墓地');
      }
    },

    comeback: {
      spell: function (c) {
        if (!isFac(c.myChar, 'crux')) return;
        var put = 0;
        while (c.myHand.length) {
          var isSpell = c.myHand[0].type === 'spell';
          var got = c.handToField(0);
          if (!got) break;
          c.set(got, 'size', 2 + Math.floor(c.rnd() * 2));
          if (isSpell) c.deactivate(got);
          put++;
        }
        if (put) c.say('手牌 ' + put + ' 張依序放到場上　SIZE = 2～3');
      }
    },

    escape: {
      spell: function (c) {
        if (!folls(c.myField).length) return;
        var n = c.myHand.length;
        if (!n) return;
        c.say('手牌 ' + n + ' 張放回牌組上方　→　生命 +' + up(n * 1.5));
        while (c.myHand.length) c.handToDeckTop(0);
        c.life(c.me, up(n * 1.5));
      }
    },

    /* ═════════ 暗黑族 ═════════ */

    gs_recon: bloatDefender(),

    sion_flina: {
      turnStart: function (c) {
        var found = c.deckDiscardFirst(function (d) { return nameHas(d, '理音‧菲莉娜'); });
        if (!found) return;
        c.say('牌組第一張「理音‧菲莉娜」與此卡一起送入墓地');
        c.discard(c.self);
        summonDressUp('換裝˙詩音＆理音')(c);
      }
    },

    rion_flina: {
      turnStart: function (c) {
        var found = c.deckDiscardFirst(function (d) { return nameHas(d, '詩音‧菲莉娜'); });
        if (!found) return;
        c.say('牌組第一張「詩音‧菲莉娜」與此卡一起送入墓地');
        c.discard(c.self);
        summonDressUp('換裝˙詩音＆理音')(c);
      }
    },

    office_witch: {
      beforeAttack: function (c) {
        if (cards(c.foeField).length % 2 !== 0) return;
        if (!c.foeHand.length) return;
        c.say('敵方場上卡片數為偶數　→　對手隨機捨棄一張手牌（發動後失去這個能力）');
        c.discardFoeHand(Math.floor(c.rnd() * c.foeHand.length));
        c.loseSkills();
      }
    },

    crescent_kris_con: rallyCombo('darklore', function (c) {
      var t = pick(c, folls(c.foeField), 1)[0];
      if (!t) return;
      c.say('敵方隨機 1 張隨從　SIZE +1 / 攻・防 −1');
      c.mod(t, { size: 1, atk: -1, def: -1 });
    }),

    gs_alla_marcia: {
      beforeDefend: function (c) {
        var got = c.deckToField(function (d) { return nameHas(d, 'GS戦鬥員'); }, 1)[0];
        if (!got) return;
        c.say('牌組第一張「GS戦鬥員」攻擊力 +2 放到場上');
        c.mod(got, { atk: 2 });
        c.loseSkills();
        c.grantSkill(c.self, '__ep3_restore');
      }
    },

    dress_up_sionrion: {
      beforeAttack: function (c) {
        folls(c.myField).forEach(function (x) {
          if (x !== c.self && nameHas(x, '換裝˙詩音＆理音')) c.discard(x);
        });
        if (!c.myHand.length) return;
        c.toDeckBottomHand(0);
        c.say('手牌第一張放到牌組下方');
        var n = c.exileWhere(c.me, function (d) {
          return nameHas(d, '詩音') || nameHas(d, '理音');
        }, 1);
        if (!n) return;
        c.say('除外墓地一張「詩音／理音」　→　對手角色生命 −1');
        c.life(c.foe, -1);
      }
    },

    dress_up_ride: {
      spell: function (c) {
        if (!folls(c.myField).some(function (x) { return nameHas(x, '換裝'); })) return;
        summonDressUp('換裝')(c);
      }
    },

    agent_visit: {
      spell: function (c) {
        if (!folls(c.myField).length) return;
        if (!c.myHand.some(function (x) { return x.size === 3; })) return;
        var t = cards(c.foeField).filter(function (x) { return x.size === 3; })[0];
        if (!t) return;
        c.say('敵方第一張 SIZE 3 的卡「' + t.name + '」送入墓地');
        c.discard(t);
      }
    },

    dark_meeting: {
      spell: function (c) {
        var n = c.myHand.length;
        if (!n) return;
        c.say('手牌 ' + n + ' 張全部送入墓地');
        while (c.myHand.length) c.discardHand(0);
        var t = maxBy(folls(c.foeField), function (x) { return x.atk + x.sta; });
        if (!t) return;
        var d = up(n * 1.5);
        c.say('敵方 攻＋體 最高的「' + t.name + '」攻/體 −' + d);
        c.mod(t, { atk: -d, sta: -d });
      }
    },

    dark_convocation: {
      spell: function (c) {
        var t = pick(c, folls(c.myField).filter(function (x) { return isFac(x, 'darklore'); }), 1)[0];
        if (!t) return;
        c.say('我方隨機 1 張「暗黑」隨從進入行動終了　攻 +3 / 體 +1' +
              (nameHas(t, 'GS') ? '　（「GS」追加體力 +2）' : ''));
        c.deactivate(t);
        c.mod(t, nameHas(t, 'GS') ? { atk: 3, sta: 3 } : { atk: 3, sta: 1 });
      }
    },

    tranquility: {
      spell: function (c) {
        var theirs = cards(c.foeField).filter(function (x) { return x.type === 'spell'; });
        var mine = cards(c.myField).filter(function (x) { return x.type === 'spell' && x !== c.self; });
        var gone;
        if (theirs.length && folls(c.myField).length) {
          c.say('敵方場上 ' + theirs.length + ' 張咒語送入墓地');
          theirs.forEach(function (x) { c.discard(x); });
          gone = theirs.length;
        } else {
          c.say('敵方場上沒有咒語　→　我方場上 ' + mine.length + ' 張咒語送入墓地');
          mine.forEach(function (x) { c.discard(x); });
          gone = mine.length;
        }
        c.say('我方生命 −' + (gone + 1));
        c.life(c.me, -(gone + 1));
      }
    },

    pupil_becomes_master: {
      spell: function (c) {
        var n = cards(c.foeField).length;
        if (!n) return;
        var d = down(c.g.turn / n);
        if (!d) return;
        buff(c, folls(c.foeField), { sta: -d },
             '敵方全體隨從　體力 −' + d + '（回合數 ' + c.g.turn + ' ÷ 敵方卡片數 ' + n + '）');
      }
    },

    night_conqueror: {
      spell: function (c) {
        if (!isFac(c.myChar, 'darklore')) return;
        var n = 0;
        cards(c.foeField).forEach(function (x) {
          if (x.size >= 3 && x.size <= 5) { c.discard(x); n++; }
        });
        cards(c.myField).forEach(function (x) {
          if (x !== c.self && !isFac(x, 'darklore')) { c.discard(x); n++; }
        });
        if (n) c.say('敵方 SIZE 3～5 與我方非「暗黑」的卡共 ' + n + ' 張送入墓地');
      }
    },

    /* ═════════ 無所屬 ═════════ */

    '1st_witness_kana_dkd': {
      beforeAttack: function (c) {
        if (c.self.def < 1) return;
        c.say('攻擊前　此卡防禦 −1');
        c.mod(c.self, { def: -1 });
        if (!c.myChar) return;
        var fac = c.myChar.faction;
        var got = c.deckToField(function (d) { return d && d.faction === fac; }, 1)[0];
        if (!got) return;
        c.say('牌組第一張同陣營的卡放到場上　攻/體 +3');
        c.mod(got, { atk: 3, sta: 3 });
      }
    }
  };

  for (var k in E4) SG.Effects[k] = E4[k];
})();
