/* ═══════════════════════════════════════════════════════════
   Episode 2 卡片效果（60 張裡有效果的 48 張）

   撰寫原則跟 effects.js 一樣：先 say() 宣告效果發動，再做事。

   ★ Episode 2 起大量出現「發動後失去這個能力」的卡，
     用 ctx.loseSkills() 處理 —— 技能是跟著場上這張實體走的。
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

  /* 「攻擊前，此卡攻擊力 +2，然後失去這個能力」—— EP2 有五張同款 */
  function onceAtkUp2() {
    return {
      beforeAttack: function (c) {
        c.say('攻擊前　攻擊力 +2（發動後失去這個能力）');
        c.mod(c.self, { atk: 2 });
        c.loseSkills();
      }
    };
  }

  var E2 = {

    /* ═════════ 公立學校 ═════════ */

    council_casey: onceAtkUp2(),

    council_treas_amy: {
      beforeDefend: function (c) {
        var t = folls(c.myField).filter(function (x) { return nameHas(x, '學生會'); });
        if (!buff(c, t, { sta: 2 }, '防禦前　我方「學生會」隨從　體力 +2（發動後失去這個能力）')) return;
        c.loseSkills();
      }
    },

    council_pres_celine: {
      beforeDefend: function (c) {
        var idx = -1;
        for (var i = 0; i < c.myHand.length; i++) {
          if (c.myHand[i].type === 'follower' && nameHas(c.myHand[i], '學生會')) { idx = i; break; }
        }
        if (idx < 0) return;
        c.say('防禦前　手牌「' + c.myHand[idx].name + '」放到牌組最上方　此卡 攻 +1 / 體 +2');
        c.handToDeckTop(idx);
        c.mod(c.self, { atk: 1, sta: 2 });
      }
    },

    genius_student_nanai: {
      beforeDefend: function (c) {
        var a = c.attacker;
        if (!a) return;
        var n = c.exileWhere(c.me, function (id) {
          var d = SG.getCard(id); return d && d.size === a.size;
        });
        if (!n) return;
        c.say('防禦前　墓地與攻擊者同 SIZE 的卡除外 ' + n + ' 張　→　攻擊者 攻/體 −' + n);
        c.mod(a, { atk: -n, sta: -n });
      }
    },

    lib_milka: {
      turnStart: function (c) {
        var t = folls(c.myField).filter(function (x) { return nameHas(x, '圖書部'); });
        buff(c, pick(c, t, 1), { sta: 2 }, '我方隨機 1 張「圖書部」隨從　體力 +2');
      }
    },

    empowering_chant: {
      spell: function (c) {
        var t = c.myField[1];
        if (!t || t.type !== 'follower') return;
        c.say('第 Ⅱ 格隨從　攻 +2 / 體 +5');
        c.mod(t, { atk: 2, sta: 5 });
        if (!isFac(c.myChar, 'vita') && c.hasSkill(t)) {
          c.say('我方角色不是「公立」　→　該隨從失去特殊能力');
          c.loseSkills(t);
        }
      }
    },

    council_justice: {
      spell: function (c) {
        var n = cards(c.myField).filter(function (x) { return nameHas(x, '學生會'); }).length;
        if (!n) return;
        var t = pick(c, folls(c.foeField).filter(function (x) { return !isFac(x, 'vita'); }), 2);
        if (!t.length) return;
        var d = n >= 3 ? { atk: -2, def: -1, sta: -2 } : n === 2 ? { sta: -3 } : { atk: -2 };
        buff(c, t, d, '我方「學生會」' + n + ' 張　→　敵方隨機 2 張非公立隨從　' +
             (n >= 3 ? '攻 −2 / 防 −1 / 體 −2' : n === 2 ? '體力 −3' : '攻擊力 −2'));
      }
    },

    student_council_kick: {
      spell: function (c) {
        var me = null;
        for (var i = 0; i < 5; i++) {
          var x = c.myField[i];
          if (x && x.type === 'follower' && nameHas(x, '學生會') && !x.activated) { me = x; break; }
        }
        if (!me) return;
        c.say('我方第一張未行動的「學生會」隨從　進入行動終了');
        c.deactivate(me);
        var t = maxBy(folls(c.foeField), function (x) { return x.size; });
        if (!t) return;
        c.say('敵方 SIZE 最高的隨從　體力 −' + (me.atk + 1));
        c.mod(t, { sta: -(me.atk + 1) });
      }
    },

    book_thief: {
      spell: function (c) {
        var mine = cards(c.myField).filter(function (x) { return nameHas(x, '圖書部'); }).length;
        var theirs = cards(c.foeField).filter(function (x) { return x.type === 'spell'; });
        if (mine <= theirs.length || !theirs.length) return;
        var t = pick(c, theirs, 1)[0];
        c.say('我方「圖書部」' + mine + ' 張多於敵方咒語　→　把「' + t.name + '」搶過來');
        c.move(c.foe, c.slotOf(t), c.me);
      }
    },

    tower_of_books: {
      spell: function (c) {
        var n = folls(c.myField).filter(function (x) { return isFac(x, 'vita'); }).length;
        if (!n) return;
        for (var i = 0; i < c.foeHand.length; i++) {
          if (c.foeHand[i].type === 'spell') {
            c.say('敵方手牌一張咒語　SIZE +' + n);
            c.modHand(c.foeHand[i], { size: n });
            return;
          }
        }
      }
    },

    feast: {
      spell: function (c) {
        if (!nameHas(c.myChar, '西塔')) return;
        c.say('角色卡名含「西塔」　→　生命 +4');
        c.life(c.me, 4);
      }
    },

    reunion: {
      spell: function (c) {
        if (!isFac(c.myChar, 'vita')) return;
        var lim = c.myHand.length + 1;
        var t = folls(c.foeField).filter(function (x) { return x.size <= lim; });
        if (!t.length) return;
        var got = pick(c, t, 1)[0];
        c.say('搶過敵方 SIZE ' + got.size + ' 的「' + got.name + '」　並使其 SIZE −1');
        if (c.move(c.foe, c.slotOf(got), c.me)) c.mod(got, { size: -1 });
      }
    },

    /* ═════════ 私立學校 ═════════ */

    fanatic_sarah: onceAtkUp2(),

    insomniac_nanasid: {
      beforeDefend: function (c) {
        c.say('防禦前　此卡 防 −1 / 攻 +2　攻擊者 攻 −2（發動後失去這個能力）');
        c.mod(c.self, { def: -1, atk: 2 });
        if (c.attacker) c.mod(c.attacker, { atk: -2 });
        c.loseSkills();
      }
    },

    stigma_flint: {
      beforeAttack: function (c) {
        var n = c.exileWhere(c.me, function (id) {
          var d = SG.getCard(id); return d && d.name === '聖痕的證人、布莉西亞';
        }, 1);
        if (!n) return;
        var t = pick(c, folls(c.foeField), 1)[0];
        if (!t) return;
        c.say('除外「聖痕的證人、布莉西亞」　→　破壞敵方隨機 1 張隨從');
        c.destroy(t);
      }
    },

    fated_rival_seven: {
      beforeAttack: function (c) {
        var n = c.exileWhere(c.me, function (id) {
          var d = SG.getCard(id); return d && d.faction === 'academy';
        }, 2);
        if (n < 2) return;
        var t = [];
        if (c.defender) t.push(c.defender);
        t = t.concat(pick(c, folls(c.foeField).filter(function (x) { return x !== c.defender; }), 1));
        buff(c, t, { atk: -1, def: -1, sta: -2 },
             '除外墓地 2 張「私立」　→　防禦隨從與另一張　攻 −1 / 防 −1 / 體 −2');
      }
    },

    traumatized_hilde: {
      turnStart: function (c) {
        if (c.self.atk <= 0) return;
        c.say('回合開始　此卡攻擊力 −1');
        c.mod(c.self, { atk: -1 });
        buff(c, pick(c, folls(c.myField), 2), { sta: 2 }, '我方隨機 2 張隨從　體力 +2');
      }
    },

    magic_stone_found: {
      spell: function (c) {
        var idx = -1;
        for (var i = 0; i < c.myHand.length; i++) {
          if (isFac(c.myHand[i], 'academy')) { idx = i; break; }
        }
        if (idx < 0) return;
        c.say('手牌第一張「私立」卡「' + c.myHand[idx].name + '」送入墓地');
        c.discardHand(idx);
        buff(c, pick(c, folls(c.foeField), 2), { atk: -1, def: -2 },
             '敵方隨機 2 張隨從　攻 −1 / 防 −2');
      }
    },

    unwilling_sacrifice: {
      spell: function (c) {
        var t = minBy(folls(c.myField).filter(function (x) { return isFac(x, 'academy'); }),
                      function (x) { return x.sta; });
        if (!t) return;
        var sta = t.sta;
        c.say('我方體力最低的「私立」隨從「' + t.name + '」送入墓地');
        c.discard(t);
        var e = pick(c, folls(c.foeField).filter(function (x) { return x.atk > sta; }), 1)[0];
        if (!e) return;
        c.say('敵方攻擊力高於 ' + sta + ' 的隨從　攻擊力 −' + sta);
        c.mod(e, { atk: -sta });
      }
    },

    shoddy_magic: {
      spell: function (c) {
        var t = pick(c, folls(c.foeField), 2);
        if (!t.length) return;
        var n = c.rnd() < 0.5 ? 4 : 2;
        buff(c, t, { sta: -n }, '敵方 2 張隨從　體力 −' + n + '（五成機率 −4 / −2）');
      }
    },

    magic_society_invite: {
      spell: function (c) {
        var a = null, b = null;
        for (var i = 0; i < 5; i++) {
          var x = c.myField[i];
          if (!x || x.type !== 'follower') continue;
          if (!a) a = x; else { b = x; break; }
        }
        if (!a || !b) return;
        c.say('第 2 張隨從的 防/體　變成第 1 張的 防/體');
        c.set(b, 'def', a.def);
        c.set(b, 'sta', a.sta);
      }
    },

    sisters_letter: {
      spell: function (c) {
        var t = maxBy(folls(c.foeField), function (x) { return x.size; });
        if (!t) return;
        var n = c.slotOf(t) + 1;
        c.say('敵方 SIZE 最高的隨從　攻/防/體 −' + n + '（所在格號）');
        c.mod(t, { atk: -n, def: -n, sta: -n });
      }
    },

    dark_secret: {
      spell: function (c) {
        var a = c.foeField[1], b = c.foeField[3];
        if (!a && !b) return;
        var sa = a ? a.size : 0, sb = b ? b.size : 0;
        var hi = sa >= sb ? a : b, lo = sa >= sb ? b : a;
        if (hi) {
          if (isFac(c.myChar, 'academy')) {
            c.say('角色是「私立」　→　破壞 SIZE 較高的「' + hi.name + '」');
            c.destroy(hi);
          } else {
            c.say('SIZE 較高的「' + hi.name + '」送入墓地');
            c.discard(hi);
          }
        }
        if (lo) {
          c.say('SIZE 較低的「' + lo.name + '」放到牌組下方');
          c.toDeckBottom(lo);
        }
      }
    },

    lineage_maintenance: {
      spell: function (c) {
        var t = [];
        for (var i = 0; i < 5; i++) {
          var x = c.myField[i];
          if (x && x.type === 'follower' && isFac(x, 'academy') && x.size === i + 1) t.push(x);
        }
        buff(c, t, { atk: 3, sta: 3 }, '格號與 SIZE 相同的「私立」隨從　攻 +3 / 體 +3');
      }
    },

    /* ═════════ 南十字 ═════════ */

    seeker_irene: onceAtkUp2(),

    seeker_lucia: {
      beforeAttack: function (c) {
        var n = c.myHand.filter(function (x) { return nameHas(x, '神聖研究會'); }).length +
                cards(c.myField).filter(function (x) { return nameHas(x, '神聖研究會'); }).length;
        if (!n) return;
        var real = Math.min(n, Math.max(0, c.self.sta - 1));
        if (!real) return;
        c.say('手牌＋場上「神聖研究會」' + n + ' 張　→　此卡 體 −' + real + ' / 攻 +' + real);
        c.mod(c.self, { sta: -real, atk: real });
      }
    },

    seeker_melisaa: {
      turnStart: function (c) {
        var t = folls(c.myField).filter(function (x) { return nameHas(x, '神聖研究會'); });
        if (!buff(c, pick(c, t, 2), { atk: 2, sta: 2 },
                  '我方隨機 2 張「神聖研究會」隨從　攻/體 +2（發動後失去這個能力）')) return;
        c.loseSkills();
      }
    },

    stigma_witness_felicia: {
      beforeDefend: function (c) {
        if (!cards(c.myField).some(function (x) { return nameHas(x, '聖痕的布琳蒂'); })) return;
        var n = cards(c.myField).filter(function (x) { return isFac(x, 'academy'); }).length;
        if (!n) return;
        buff(c, folls(c.myField), { atk: n, sta: n },
             '場上有「聖痕的布琳蒂」　→　我方全體隨從　攻/體 +' + n + '（我方「私立」卡數）');
      }
    },

    crux_knight_sinclair: {
      beforeDefend: function (c) {
        var n = c.exileWhere(c.me, function (id) {
          var d = SG.getCard(id); return d && d.faction === 'crux';
        }, 2);
        if (n < 2) return;
        c.say('除外墓地 2 張「南十字」　→　此卡 攻/體 +2');
        c.mod(c.self, { atk: 2, sta: 2 });
        var other = folls(c.myField).filter(function (x) { return x !== c.self; })[0];
        if (other) {
          c.say('我方第一張其他隨從　攻/體 +1');
          c.mod(other, { atk: 1, sta: 1 });
        }
      }
    },

    proof_of_miracles: {
      spell: function (c) {
        var n = c.myHand.length;
        var loss = down(n / 2);
        if (loss) {
          c.say('我方生命 −' + loss + '（手牌數的一半）');
          c.life(c.me, -loss);
        }
        buff(c, pick(c, folls(c.myField).filter(function (x) { return isFac(x, 'crux'); }), 1),
             { atk: n, sta: n }, '我方隨機 1 張「南十字」隨從　攻/體 +' + n + '（手牌數）');
      }
    },

    no_turning_back: {
      spell: function (c) {
        if (!folls(c.myField).length) return;
        var sum = cards(c.foeField).reduce(function (s, x) { return s + (x.size || 0); }, 0);
        if (sum % 2 === 1) {
          var t = pick(c, folls(c.foeField), 1)[0];
          if (t) {
            c.say('敵方 SIZE 總和 ' + sum + '（奇數）　→　破壞敵方隨機 1 張');
            c.destroy(t);
          }
        } else {
          var m = pick(c, folls(c.myField), 1)[0];
          if (m) {
            c.say('敵方 SIZE 總和 ' + sum + '（偶數）　→　我方隨機 1 張送墓');
            c.discard(m);
          }
        }
      }
    },

    study_of_miracles: {
      spell: function (c) {
        buff(c, folls(c.myField).filter(function (x) { return nameHas(x, '神聖研究會'); }),
             { atk: 2, sta: 1 }, '我方「神聖研究會」隨從　攻 +2 / 體 +1');
      }
    },

    quick_service: {
      spell: function (c) {
        var n = folls(c.myField).length;
        if (!n) return;
        c.say('我方全部隨從（' + n + ' 張）送入墓地');
        folls(c.myField).forEach(function (x) { c.discard(x); });
        var lim = n + 2, idx = -1;
        for (var i = 0; i < c.myHand.length; i++) {
          if (c.myHand[i].type === 'follower' && c.myHand[i].size <= lim) { idx = i; break; }
        }
        if (idx < 0) return;
        var name = c.myHand[idx].name;
        var put = c.handToField(idx, 3);
        if (!put) return;
        c.say('手牌 SIZE ' + lim + ' 以下的「' + name + '」放到第 Ⅳ 格');
        var half = up(c.myGrave.filter(function (id) {
          var d = SG.getCard(id); return d && d.faction === 'crux';
        }).length / 2);
        if (half) {
          c.say('墓地「南十字」的一半　→　攻/體 +' + half);
          c.mod(put, { atk: half, sta: half });
        }
      }
    },

    mother_demon_rumor: {
      spell: function (c) {
        var a = c.foeField[0], b = c.foeField[1];
        var sum = (a ? a.size : 0) + (b ? b.size : 0);
        if (sum < 6 || !b) return;
        c.say('敵方 Ⅰ・Ⅱ 格 SIZE 合計 ' + sum + '（≥6）　→　破壞第 Ⅱ 格');
        c.destroy(b);
      }
    },

    luthicas_ward: {
      spell: function (c) {
        var n = c.exileWhere(c.me, function (id) {
          var d = SG.getCard(id); return d && d.faction === 'crux';
        }, 4);
        if (!n) return;
        c.say('除外墓地 ' + n + ' 張「南十字」');
        pick(c, folls(c.myField), 2).forEach(function (x) {
          var gain = isFac(x, 'crux') ? n * 2 : n + 2;
          c.say('「' + x.name + '」體力 +' + gain + (isFac(x, 'crux') ? '（南十字：除外數 ×2）' : ''));
          c.mod(x, { sta: gain });
        });
      }
    },

    sense_of_belonging: {
      spell: function (c) {
        var t = pick(c, folls(c.foeField).filter(function (x) {
          return c.foeChar && x.faction !== c.foeChar.faction;
        }), 1)[0];
        if (!t) return;
        c.say('敵方與其角色不同陣營的「' + t.name + '」　→　搶過來');
        c.move(c.foe, c.slotOf(t), c.me);
      }
    },

    /* ═════════ 暗黑族 ═════════ */

    reading_witch: onceAtkUp2(),

    tea_party_witch: {
      beforeAttack: function (c) {
        buff(c, cards(c.myField).filter(function (x) { return nameHas(x, '魔女'); }),
             { sta: 1 }, '攻擊前　我方「魔女」　體力 +1');
      }
    },

    heart_stone_witch: {
      beforeDefend: function (c) {
        var t = cards(c.myField).filter(function (x) { return nameHas(x, '魔女'); });
        if (!buff(c, t, { atk: 2, sta: 2 },
                  '防禦前　我方「魔女」　攻/體 +2（發動後失去這個能力）')) return;
        c.loseSkills();
      }
    },

    cauldron_witch: {
      beforeDefend: function (c) {
        var other = folls(c.myField).filter(function (x) {
          return x !== c.self && isFac(x, 'darklore');
        });
        if (!other.length || !c.attacker) return;
        var n = up(c.attacker.atk / 2);
        c.say('場上有其他「暗黑」隨從　→　此卡體力 +' + n +
              '（攻擊者攻擊力的一半，發動後失去這個能力）');
        c.mod(c.self, { sta: n });
        c.loseSkills();
      }
    },

    undertaker: {
      beforeAttack: function (c) {
        var n = 0;
        [c.me, c.foe].forEach(function (p) {
          n += c.exileWhere(p, function (id) {
            var d = SG.getCard(id); return d && d.type === 'follower';
          }, 1);
        });
        if (!n) return;
        c.say('雙方墓地第一張隨從除外 ' + n + ' 張　→　此卡 攻/體 +' + n);
        c.mod(c.self, { atk: n, sta: n });
      }
    },

    spell_change: {
      spell: function (c) {
        var a = -1, b = -1, i;
        for (i = 0; i < c.myHand.length; i++) if (c.myHand[i].type === 'spell') { a = i; break; }
        for (i = 0; i < c.foeHand.length; i++) if (c.foeHand[i].type === 'spell') { b = i; break; }
        if (a < 0 || b < 0) return;
        c.say('雙方手牌第一張咒語互換');
        c.swapHand(a, b);
      }
    },

    strega_blade: {
      spell: function (c) {
        var t = minBy(folls(c.myField).filter(function (x) { return nameHas(x, '魔女'); }),
                      function (x) { return x.size; });
        if (!t) return;
        var drop = Math.max(0, t.atk - 1) + Math.max(0, t.sta - 1);
        c.say('我方 SIZE 最小的「魔女」　攻/體 = 1');
        c.set(t, 'atk', 1);
        c.set(t, 'sta', 1);
        var e = folls(c.foeField)[0];
        if (!e || drop <= 0) return;
        c.say('敵方第一張隨從　體力 −' + down(drop / 2) + '（下降量的一半）');
        c.mod(e, { sta: -down(drop / 2) });
      }
    },

    pranks_price: {
      spell: function (c) {
        if (c.myHand.length < 2 || c.foeHand.length < 2) return;
        c.say('雙方手牌第 1、2 張送入墓地');
        c.discardHand(1);
        c.discardHand(0);
        c.discardFoeHand(1);
        c.discardFoeHand(0);
      }
    },

    strega_blood: {
      spell: function (c) {
        var t = folls(c.myField).filter(function (x) { return nameHas(x, '魔女'); });
        if (!buff(c, t, { atk: 1, sta: 3 }, '我方「魔女」隨從　攻 +1 / 體 +3')) return;
        c.say('代價：我方生命 −1');
        c.life(c.me, -1);
      }
    },

    tower_visitor: {
      spell: function (c) {
        var mx = 0;
        cards(c.myField).forEach(function (x) { if (x.size > mx) mx = x.size; });
        buff(c, folls(c.foeField).filter(function (x) { return x.size < mx; }),
             { def: -2, sta: -2 }, '敵方 SIZE 低於我方最大 SIZE（' + mx + '）的隨從　防/體 −2');
      }
    },

    vampiric_education: {
      spell: function (c) {
        var sum = c.myHand.reduce(function (s, x) { return s + (x.size || 0); }, 0);
        var n = up(sum / 2);
        if (!n) return;
        buff(c, pick(c, folls(c.myField).filter(function (x) { return isFac(x, 'darklore'); }), 2),
             { sta: n }, '我方隨機 2 張「暗黑」隨從　體力 +' + n + '（手牌 SIZE 總和的一半）');
      }
    },

    /* ═════════ 沒有官方譯名的三張 ═════════ */

    // 薔薇魔女、蘿莎（角色卡）
    rose_witch_rosa: {
      turnStart: function (c) {
        var t = pick(c, folls(c.foeField), 1)[0];
        if (!t) return;
        var n = up(Math.abs(t.def - t.size) / 2);
        if (!n) return;
        c.say('敵方隨機 1 張隨從　攻/體 −' + n + '（防禦力與 SIZE 差的一半）');
        c.mod(t, { atk: -n, sta: -n });
      }
    },

    // 雷瓦汀（角色卡）
    laevateinn: {
      turnStart: function (c) {
        var seen = {}, dup = 0;
        c.myHand.forEach(function (x) {
          var s2 = x.size || 0;
          seen[s2] = (seen[s2] || 0) + 1;
          if (seen[s2] === 2 && s2 > dup) dup = s2;
        });
        if (!dup) return;
        var n = up(dup / 2);
        c.say('手牌有兩張以上 SIZE ' + dup + ' 的卡　→　我方生命 +' + n);
        c.life(c.me, n);
      }
    },

    // 訪問者、奧菲莉亞（無所屬隨從）
    visitor_ophelia: {
      beforeAttack: function (c) {
        if (c.self.size <= 1) return;
        c.say('攻擊前　此卡 SIZE −1');
        c.mod(c.self, { size: -1 });
      },
      beforeDefend: function (c) {
        c.say('防禦前　此卡防禦力 −1');
        c.mod(c.self, { def: -1 });
        if (!c.attacker) return;
        var n = Math.min(5, Math.abs(c.self.def - c.self.size));
        if (!n) return;
        c.say('攻擊隨從 攻/防/體 −' + n + '（此卡防禦力與 SIZE 的差，最多 5）');
        c.mod(c.attacker, { atk: -n, def: -n, sta: -n });
      }
    },

    fatal_blow: {
      spell: function (c) {
        var lim = cards(c.myField).length + c.myHand.length;
        var gone = 0, i;
        for (i = 0; i < 5; i++) {
          var m = c.myField[i];
          if (m && m !== c.self && m.size <= lim) c.discard(m);
        }
        for (i = 0; i < 5; i++) {
          var e = c.foeField[i];
          if (e && e.size <= lim) { c.discard(e); gone++; }
        }
        c.say('場上 SIZE ' + lim + ' 以下的卡全部送墓　→　我方生命 −' + gone + '（敵方送墓數）');
        if (gone) c.life(c.me, -gone);
      }
    }
  };

  for (var k in E2) SG.Effects[k] = E2[k];
})();
