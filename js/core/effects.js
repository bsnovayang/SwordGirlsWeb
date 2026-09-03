/* ═══════════════════════════════════════════════════════════
   卡片效果 — Episode 0（全 56 張）

   觸發時機：
     turnStart    回合開始時（按下「確定」→ 翻開 → 擲硬幣 之後）
     beforeAttack 攻擊前（此卡每次攻擊都會觸發，ctx.defender ＝ 這次要打的隨從，
                  敵方場上沒隨從時為 null）
     beforeDefend 防禦前（此卡每次被攻擊都會觸發，ctx.attacker ＝ 攻擊者）
     spell        咒語結算

   ctx 可用：self / slot / me / foe / myField / foeField / myHand / myGrave
             myChar / foeChar / attacker / defender / rnd()
             say(文字) mod(卡,{atk,def,sta,size}) set(卡,欄位,值)
             deactivate(卡) discard(卡) discardHand(手牌索引)
             life(玩家,增減) move(從,格,到) slotOf(卡)

   ★ 撰寫原則：一律「先 say() 宣告效果發動，再做事」。
     UI 會在 ability 事件時讓該卡亮一下，代表「這張卡的效果要發動了」，
     之後才播放送墓地／數值增減等後續事件。順序寫反的話會先看到結果才看到亮光。

   ※ 標記 dungeonOnly 的卡：原作寫「副本限定」，只有在副本戰才會發動。
     引擎用 g.dungeon 判斷（createGame 的 opts.dungeon）。
   ═══════════════════════════════════════════════════════════ */
var SG = window.SG || (window.SG = {});

(function () {
  'use strict';

  /* ────────── 小工具 ────────── */

  /* 場上的隨從（法術不算） */
  function folls(field) {
    var r = [];
    for (var i = 0; i < 5; i++) if (field[i] && field[i].type === 'follower') r.push(field[i]);
    return r;
  }
  /* 第 n 格（1-based）的隨從 */
  function slotFoll(field, n) {
    var c = field[n - 1];
    return (c && c.type === 'follower') ? c : null;
  }
  /* 「自己場上第一張隨從」＝格號最小、且是隨從的那張 */
  function firstFoll(field, filter) {
    for (var i = 0; i < 5; i++) {
      var c = field[i];
      if (c && c.type === 'follower' && (!filter || filter(c))) return c;
    }
    return null;
  }
  function nameHas(c, s) { return !!c && c.name.indexOf(s) >= 0; }
  function isFac(c, f) { return !!c && c.faction === f; }

  /* 隨機取 n 張（不重複）；不足時就取現有的全部 */
  function pick(ctx, list, n) {
    var pool = list.slice(), out = [];
    while (pool.length && out.length < n) {
      out.push(pool.splice(Math.floor(ctx.rnd() * pool.length), 1)[0]);
    }
    return out;
  }
  /* SIZE 最大／最小 */
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
  function sumSize(field) {
    var s = 0;
    for (var i = 0; i < 5; i++) if (field[i]) s += field[i].size;
    return s;
  }
  /* 常見寫法：對一群隨從套同一組增減 */
  function buff(ctx, list, d, text) {
    if (!list.length) return false;
    ctx.say(text);
    list.forEach(function (c) { ctx.mod(c, d); });
    return true;
  }

  /* 「副本限定：攻擊前，此卡攻/體 +1」—— Episode 0 有四張同款。
     dungeonOnly 讓它只在副本戰發動（見 battle.js 的 fireAbility）。 */
  var DUNGEON = {
    dungeonOnly: true,
    beforeAttack: function (c) {
      c.say('副本限定　攻擊前　攻/體 +1');
      c.mod(c.self, { atk: 1, sta: 1 });
    }
  };

  SG.Effects = {

    /* ═════════ 角色卡 ═════════
       四張角色卡都還有一句「副本限定：回合開始時，對方人物卡生命-1」，
       一般對戰不發動，所以下面只實作前半段。 */

    // 未知的少女、西塔・麥蘿莎
    sita_vilosa: {
      turnStart: function (c) {
        var t = [1, 2, 3].map(function (n) { return slotFoll(c.foeField, n); })
                         .filter(Boolean);
        buff(c, t, { sta: -1 }, '敵方 Ⅰ・Ⅱ・Ⅲ 格隨從　體力 -1');
      }
    },

    // 才色兼備、希妮亞・帕西菲卡
    cinia_pacifica: {
      turnStart: function (c) {
        buff(c, pick(c, folls(c.foeField), 1), { atk: -1, sta: -1 }, '敵方隨機 1 張隨從　攻/體 -1');
      }
    },

    // 南十字騎士團的露西卡
    luthica_preventer: {
      turnStart: function (c) {
        var t = folls(c.myField).filter(function (x) { return isFac(x, 'crux'); });
        buff(c, pick(c, t, 1), { atk: 1, sta: 1 }, '我方隨機 1 張「南十字」隨從　攻/體 +1');
      }
    },

    // 逃亡者、艾莉‧菲莉娜
    iri_flina: {
      turnStart: function (c) {
        if (sumSize(c.myField) <= sumSize(c.foeField)) return;
        c.say('我方場上 SIZE 較高　→　敵方角色生命 -1');
        c.life(c.foe, -1);
      }
    },

    /* ═════════ 公立學校 · 隨從 ═════════ */

    // 料理研究社的見習生
    new_cook_club_student: {
      turnStart: function (c) {
        var t = folls(c.myField).filter(function (x) { return nameHas(x, '料理研究社'); });
        buff(c, pick(c, t, 1), { atk: 1, sta: 1 }, '我方隨機 1 張「料理研究社」隨從　攻/體 +1');
      }
    },

    cook_club_dir_jamie: DUNGEON,          // 副本限定：攻擊前，此卡攻/體+1

    // 料理研究社的凱蒂
    cook_club_katie: {
      beforeAttack: function (c) {
        if (c.self.sta <= 1) return;       // 體力 1 以下不發動
        c.say('攻擊前　防 +1 / 體 -1');
        c.mod(c.self, { def: 1, sta: -1 });
      }
    },

    // 料理研究社的賽菲
    cook_club_sylphie: {
      beforeAttack: function (c) {
        c.say('攻擊前　攻擊力 +1');
        c.mod(c.self, { atk: 1 });
      }
    },

    /* ═════════ 私立學校 · 隨從 ═════════ */

    // 警衛女僕
    guard_maid: {
      turnStart: function (c) {
        var t = folls(c.myField).filter(function (x) { return nameHas(x, '女僕'); });
        buff(c, pick(c, t, 1), { atk: 1, sta: 1 }, '我方隨機 1 張「女僕」隨從　攻/體 +1');
      }
    },

    head_maid: DUNGEON,                    // 副本限定：攻擊前，此卡攻/體+1

    // 首席女僕
    chief_maid: {
      beforeAttack: function (c) {
        var idx = -1;
        for (var i = 0; i < c.myHand.length; i++) {
          if (c.myHand[i].type === 'spell') { idx = i; break; }
        }
        if (idx < 0) return;               // 手牌沒有咒語卡就不發動
        c.say('攻擊前　將手牌「' + c.myHand[idx].name + '」送入墓地');
        c.discardHand(idx);
        c.say('送墓成功　→　攻擊力 +2');
        c.mod(c.self, { atk: 2 });
      }
    },

    // 拖把女僕
    mop_maid: {
      beforeDefend: function (c) {
        var s = c.slotOf(c.self), t = [];
        [s - 1, s, s + 1].forEach(function (i) {
          var x = (i >= 0 && i < 5) ? c.myField[i] : null;
          if (x && x.type === 'follower') t.push(x);
        });
        buff(c, t, { atk: 1 }, '防禦前　此卡與鄰接隨從　攻擊力 +1');
      }
    },

    /* ═════════ 南十字 · 隨從 ═════════ */

    // 騎士團的旗手、佛雷特
    flag_knight_frett: {
      beforeAttack: function (c) {
        var t = slotFoll(c.myField, 3);
        if (t) buff(c, [t], { atk: 1, sta: 1 }, '攻擊前　我方 Ⅲ 格隨從　攻/體 +1');
      }
    },

    // 騎士團的副官、颯琳森
    knight_adjt_sarisen: {
      turnStart: function (c) {
        var t = folls(c.myField).filter(function (x) {
          return x !== c.self && nameHas(x, '騎士團');
        });
        buff(c, t, { atk: 1, sta: 1 }, '我方其他「騎士團」隨從　全部攻/體 +1');
      }
    },

    crux_knight_mitil: DUNGEON,            // 副本限定：攻擊前，此卡攻/體+1

    // 南十字騎士團的冰提魯
    crux_knight_pintail: {
      beforeDefend: function (c) {
        if (!c.attacker || c.attacker.size >= c.self.size) return;
        c.say('攻擊者 SIZE 較低　→　此卡 攻/防 +1');
        c.mod(c.self, { atk: 1, def: 1 });
      }
    },

    /* ═════════ 暗黑族 · 隨從 ═════════ */

    // 斯卡迪魯的詩音‧菲莉娜
    scardel_sion_flina: {
      beforeAttack: function (c) {
        var t = folls(c.myField).filter(function (x) {
          return nameHas(x, '詩音') || nameHas(x, '理音');
        });
        buff(c, t, { atk: 1 }, '攻擊前　我方「詩音／理音‧菲莉娜」　全部攻擊力 +1');
      }
    },

    // 斯卡迪魯的理音‧菲莉娜
    scardel_rion_flina: {
      beforeDefend: function (c) {
        var t = folls(c.myField).filter(function (x) {
          return nameHas(x, '詩音') || nameHas(x, '理音');
        });
        buff(c, t, { sta: 1 }, '防禦前　我方「詩音／理音‧菲莉娜」　全部體力 +1');
      }
    },

    scardel_pinot_noir: DUNGEON,           // 副本限定：攻擊前，此卡攻/體+1

    // 曉月的舞姬、卡塔‧菲莉娜
    moondancer_kata_flina: {
      turnStart: function (c) {
        buff(c, pick(c, folls(c.foeField), 2), { atk: -1, sta: -1 }, '敵方隨機 2 張隨從　攻/體 -1');
      }
    },

    /* ═════════ 公立學校 · 咒語 ═════════ */

    // 無情的一擊
    heartless_blow: {
      spell: function (c) {
        var t = pick(c, folls(c.foeField), 1);
        if (t.length) { c.say('敵方隨機 1 張隨從　體力 -4'); c.mod(t[0], { sta: -4 }); }
        if (nameHas(c.myChar, '西塔')) {
          var t2 = pick(c, folls(c.foeField), 1);
          if (t2.length) { c.say('角色為「西塔」　→　追加隨機 1 張隨從 體力 -2'); c.mod(t2[0], { sta: -2 }); }
        }
      }
    },

    // 歡迎!!新入社員
    student_orientation: {
      spell: function (c) {
        var t = folls(c.myField).filter(function (x) { return isFac(x, 'vita'); });
        buff(c, pick(c, t, 2), { atk: 2, sta: 2 }, '我方隨機 2 張「公立」隨從　攻/體 +2');
      }
    },

    // 料理失敗
    cooking_failure: {
      spell: function (c) {
        var has = folls(c.myField).some(function (x) { return nameHas(x, '料理研究社'); });
        if (!has) return;
        var t = folls(c.myField).filter(function (x) { return isFac(x, 'vita'); });
        buff(c, pick(c, t, 2), { size: 1, atk: 1, def: 1, sta: 2 },
             '我方隨機 2 張「公立」隨從　SIZE+1 / 攻+1 / 防+1 / 體+2');
      }
    },

    // 結界的破裂
    ward_rupture: {
      spell: function (c) {
        var mine = slotFoll(c.myField, 3);
        if (!mine || !isFac(mine, 'vita')) return;
        var a = c.myField[2] ? c.myField[2].size : 0;
        var b = c.foeField[2] ? c.foeField[2].size : 0;
        var x = Math.abs(a - b);
        if (!x) return;
        c.say('我方 Ⅲ 格「公立」隨從　攻/體 +' + x + '（雙方 Ⅲ 格 SIZE 差）');
        c.mod(mine, { atk: x, sta: x });
      }
    },

    // 新料理開發
    new_recipe: {
      spell: function (c) {
        var x = 10 - sumSize(c.myField);
        if (x <= 0) return;
        c.say('我方角色生命 +' + x + '（10 − 場上 SIZE 總和）');
        c.life(c.me, x);
      }
    },

    /* ═════════ 私立學校 · 咒語 ═════════ */

    // 閃失
    accident: {
      spell: function (c) {
        var x = folls(c.myField).filter(function (f) { return nameHas(f, '女僕'); }).length;
        if (!x) return;
        buff(c, pick(c, folls(c.foeField), 2), { atk: -x, sta: -x },
             '敵方隨機 2 張隨從　攻/體 -' + x + '（我方「女僕」隨從數）');
      }
    },

    // 新人女僕教育
    new_maid_training: {
      spell: function (c) {
        var t = folls(c.myField).filter(function (x) { return isFac(x, 'academy'); });
        buff(c, pick(c, t, 2), { atk: 2, sta: 2 }, '我方隨機 2 張「私立」隨從　攻/體 +2');
      }
    },

    // 嫁禍
    she_did_it: {
      spell: function (c) {
        var all = folls(c.myField);
        if (!all.some(function (x) { return nameHas(x, '女僕'); })) return;
        var drop = 0;
        all.forEach(function (x) { if (x.size > 1) drop += x.size - 1; });
        c.say('我方所有隨從 SIZE = 1');
        all.forEach(function (x) { c.set(x, 'size', 1); });
        var alive = folls(c.myField);
        var lucky = pick(c, alive, 1)[0];
        if (!lucky || !drop) return;
        c.say('「' + lucky.name + '」收下下降的 SIZE：+' + drop);
        c.mod(lucky, { size: drop });
        var gain = Math.floor(lucky.size / 2);
        c.say('體力 +' + gain + '（新 SIZE 的一半）');
        c.mod(lucky, { sta: gain });
      }
    },

    // 崇高的犧牲
    noble_sacrifice: {
      spell: function (c) {
        var t = folls(c.myField).filter(function (x) { return isFac(x, 'academy'); });
        var victim = maxBy(t, function (x) { return x.size; });
        if (!victim) return;
        var gain = victim.size * 2;
        c.say('「' + victim.name + '」送入墓地　→　我方角色生命 +' + gain);
        c.discard(victim);
        c.life(c.me, gain);
      }
    },

    // 戒備
    tighten_security: {
      spell: function (c) {
        var t = firstFoll(c.myField, function (x) { return isFac(x, 'academy'); });
        if (!t) return;
        var x = c.myHand.filter(function (h) { return isFac(h, 'academy'); }).length;
        c.say('我方第一張「私立」隨從　防禦力 = ' + x + '（手牌中「私立」卡片數）');
        c.set(t, 'def', x);
      }
    },

    /* ═════════ 南十字 · 咒語 ═════════ */

    // 聖徒的祝福
    saints_blessing: {
      spell: function (c) {
        var t = folls(c.myField).filter(function (x) { return nameHas(x, '騎士團'); });
        if (!t.length) return;
        buff(c, t, { sta: 3 }, '我方「騎士團」隨從　全部體力 +3');
        if (nameHas(c.myChar, '露西卡')) {
          buff(c, t, { atk: 3 }, '角色為「露西卡」　→　追加攻擊力 +3');
        }
      }
    },

    // 異種生物接觸
    close_encounter: {
      spell: function (c) {
        var t = folls(c.myField).filter(function (x) { return isFac(x, 'crux'); });
        buff(c, pick(c, t, 2), { atk: 2, sta: 2 }, '我方隨機 2 張「南十字」隨從　攻/體 +2');
      }
    },

    // 拒絕入國
    entry_denied: {
      spell: function (c) {
        var mine = firstFoll(c.myField);
        if (!mine) return;
        c.say('我方第一張隨從　行動終了');
        c.deactivate(mine);
        var foe = maxBy(folls(c.foeField), function (x) { return x.size; });
        if (!foe) return;
        c.say('敵方 SIZE 最大的隨從　行動終了');
        c.deactivate(foe);
      }
    },

    // 治癒魔法
    healing_magic: {
      spell: function (c) {
        var x = c.myHand.length;
        if (!x) return;
        c.say('我方角色生命 +' + x + '（手牌張數）');
        c.life(c.me, x);
      }
    },

    // 禍從天降
    sky_surprise: {
      spell: function (c) {
        var mine = firstFoll(c.myField);
        if (!mine) return;
        var from = c.slotOf(mine);
        var dmg = Math.ceil(mine.size / 2);
        c.say('「' + mine.name + '」行動終了　→　轉移到敵方場上');
        c.deactivate(mine);
        var dest = c.move(c.me, from, c.foe);
        if (dest < 0) { c.say('敵方場上沒有空格，轉移失敗'); return; }
        c.say('敵方角色生命 -' + dmg + '（該卡 SIZE 的一半進位）');
        c.life(c.foe, -dmg);
        c.set(mine, 'size', 1);
      }
    },

    /* ═════════ 暗黑族 · 咒語 ═════════ */

    // 菲莉娜的指令
    flinas_command: {
      spell: function (c) {
        var t = folls(c.myField).filter(function (x) { return isFac(x, 'darklore'); });
        buff(c, pick(c, t, 2), { sta: 3 }, '我方隨機 2 張「暗黑」隨從　體力 +3');
      }
    },

    // 血的逆流
    blood_reversal: {
      spell: function (c) {
        var t = folls(c.myField).filter(function (x) { return isFac(x, 'darklore'); });
        buff(c, pick(c, t, 2), { atk: 2, sta: 2 }, '我方隨機 2 張「暗黑」隨從　攻/體 +2');
      }
    },

    // 吸血的儀式
    vampiric_rites: {
      spell: function (c) {
        var all = folls(c.myField);
        if (!all.length) return;
        // 先決定收下的那張：原本 SIZE 最小的「暗黑」隨從
        var host = minBy(all.filter(function (x) { return isFac(x, 'darklore'); }),
                         function (x) { return x.size; });
        var d = { size: 0, atk: 0, sta: 0 };
        all.forEach(function (x) {
          if (x.size > 1) d.size += x.size - 1;
          if (x.atk > 1) d.atk += x.atk - 1;
          if (x.sta > 1) d.sta += x.sta - 1;
        });
        c.say('我方所有隨從　SIZE / 攻 / 體 = 1');
        all.forEach(function (x) {
          c.set(x, 'size', 1); c.set(x, 'atk', 1); c.set(x, 'sta', 1);
        });
        if (!host || c.slotOf(host) < 0) return;
        c.say('「' + host.name + '」收下全部：SIZE +' + d.size + ' / 攻 +' + d.atk + ' / 體 +' + d.sta);
        c.mod(host, d);
      }
    },

    // 血的代價
    blood_target: {
      spell: function (c) {
        var t = firstFoll(c.myField, function (x) { return isFac(x, 'darklore'); });
        if (!t || t.sta <= 1) return;
        var gain = Math.min(10, t.sta - 1);
        c.say('「' + t.name + '」體力 = 1　→　我方角色生命 +' + gain + '（上限 10）');
        c.set(t, 'sta', 1);
        c.life(c.me, gain);
      }
    },

    // 犧牲
    sacrifice: {
      spell: function (c) {
        c.say('我方角色生命 -1　／　敵方角色生命 -4');
        c.life(c.me, -1);
        c.life(c.foe, -4);
      }
    },

    /* ═════════ 副本 BOSS（繁中 wiki 頁面 37） ═════════ */

    // 金色的獅子、諾爾德
    boss_nold: {
      turnStart: function (c) {
        var t = folls(c.myField).filter(function (x) { return x.size > 0; });
        buff(c, t, { size: -1 }, '我方全部隨從　SIZE -1');
      }
    },

    // 美旋風的妖精、卡涅魯
    boss_cannelle: {
      turnStart: function (c) {
        var t = folls(c.myField).filter(function (x) { return x.size <= 3; });
        buff(c, t, { atk: 2, sta: 2 }, '我方 SIZE 3 以下的隨從　攻/體 +2');
      }
    },

    // 星見鳥、蓋托
    boss_gart: {
      turnStart: function (c) {
        var t = pick(c, folls(c.foeField).filter(function (x) { return !x.activated; }), 1);
        if (!t.length) return;
        c.say('敵方隨機 1 張隨從　行動終了');
        c.deactivate(t[0]);
      }
    },

    /* ═════════ 通關 10 次的獎勵角色卡（wiki 頁面 172） ═════════ */

    // 諾爾德
    // ※ wiki 原文第二句只寫「場上隨機一張SIZE2以上的卡SIZE-1」沒指明是誰的場，
    //   依前半句是「自己手牌」推斷同為自己場上（降低自己 SIZE ＝ 陣亡時少扣生命）。
    nold: {
      turnStart: function (c) {
        var h = pick(c, c.myHand, 1);
        if (h.length) { c.say('自己手牌隨機 1 張　SIZE +1'); c.mod(h[0], { size: 1 }); }
        var big = folls(c.myField).filter(function (x) { return x.size >= 2; });
        buff(c, pick(c, big, 1), { size: -1 }, '自己場上隨機 1 張 SIZE 2 以上的卡　SIZE -1');
      }
    },

    // 卡涅魯
    cannelle: {
      turnStart: function (c) {
        var mine = minBy(folls(c.myField), function (x) { return x.size; });
        var theirs = maxBy(folls(c.foeField), function (x) { return x.size; });
        if (!mine || !theirs) return;
        var d = theirs.size - mine.size;
        if (d <= 0) return;
        c.say('我方 SIZE 最小的隨從　攻/體 +' + d + '（與敵方最大 SIZE 的差）');
        c.mod(mine, { atk: d, sta: d });
      }
    },

    // 蓋托
    gart: {
      turnStart: function (c) {
        var diff = folls(c.foeField).filter(function (x) { return x.faction !== c.self.faction; });
        if (diff.length) {
          buff(c, pick(c, diff, 1), { atk: -2, sta: -2 }, '敵方 1 張不同所屬的隨從　攻/體 -2');
          return;
        }
        buff(c, pick(c, folls(c.foeField), 2), { atk: -1, sta: -1 }, '敵方隨機 2 張隨從　攻/體 -1');
      }
    }
  };
})();
