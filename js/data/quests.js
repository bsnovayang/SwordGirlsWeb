/* ═══════════════════════════════════════════════════════════
   任務 / 成就（S12）

   原作 QUEST 每天（台灣時間 23:00）刷新，任務類型大致是
   「副本探索、調和卡片、與玩家對戰、掛網」。
   本作沒有伺服器，改成：
     · 每日任務 —— 每天抽 3 個，跨日自動換新（以本機日期為準）
     · 成就     —— 一次性、永久保留

   進度怎麼算：所有事件都累積在 save 的 counters 裡，
   每日任務在發放時記下當時的計數當基準線，進度 ＝ 現在 − 基準線。
   這樣不用另外維護一份狀態，也不會因為漏掉某個事件而算錯。
   ═══════════════════════════════════════════════════════════ */
var SG = window.SG || (window.SG = {});

(function () {
  'use strict';

  /* 事件計數的鍵值（save.counters） */
  SG.COUNTERS = {
    battle: '總對戰場數',
    battleWin: '總勝場',
    dungeonWin: '副本勝場',
    dungeonClear: '副本通關次數',
    ladderWin: '天梯勝場',
    craft: '合成張數',
    'win.vita': '用公立學校獲勝',
    'win.academy': '用私立學校獲勝',
    'win.crux': '用南十字獲勝',
    'win.darklore': '用暗黑族獲勝'
  };

  var ORE = ['ore_green', 'ore_red', 'ore_blue', 'ore_black'];

  /* ── 每日任務池 ── */
  SG.QUEST_POOL = [
    { id: 'q_dg3',   text: '在副本中獲勝 3 場',   counter: 'dungeonWin',   need: 3,
      reward: [{ mat: 'ore_white', n: 5 }, { mat: 'cat_doll', n: 2 }] },
    { id: 'q_dg6',   text: '在副本中獲勝 6 場',   counter: 'dungeonWin',   need: 6,
      reward: [{ mat: 'ore_white', n: 8 }, { mat: 'book', n: 3 }] },
    { id: 'q_clear', text: '通關任一副本 1 次',   counter: 'dungeonClear', need: 1,
      reward: [{ mat: 'sword', n: 3 }, { mat: 'ore_white', n: 6 }] },
    { id: 'q_craft2', text: '合成 2 張卡片',      counter: 'craft',        need: 2,
      reward: [{ mat: 'cat_doll', n: 3 }, { mat: 'book', n: 3 }] },
    { id: 'q_craft5', text: '合成 5 張卡片',      counter: 'craft',        need: 5,
      reward: [{ mat: 'ore_white', n: 10 }, { mat: 'sword', n: 2 }] },
    { id: 'q_ladder2', text: '在天梯獲勝 2 場',   counter: 'ladderWin',    need: 2,
      reward: [{ mat: 'ore_white', n: 6 }, { mat: 'cat_doll', n: 2 }, { mat: 'book', n: 2 }] },
    { id: 'q_win5',  text: '任意對戰獲勝 5 場',   counter: 'battleWin',    need: 5,
      reward: [{ mat: 'ore_white', n: 7 }, { mat: 'cat_doll', n: 2 }] },
    { id: 'q_vita',  text: '用公立學校的牌組獲勝 2 場', counter: 'win.vita', need: 2,
      reward: [{ mat: 'ore_green', n: 5 }, { mat: 'cat_doll', n: 2 }] },
    { id: 'q_acad',  text: '用私立學校的牌組獲勝 2 場', counter: 'win.academy', need: 2,
      reward: [{ mat: 'ore_red', n: 5 }, { mat: 'cat_doll', n: 2 }] },
    { id: 'q_crux',  text: '用南十字的牌組獲勝 2 場',   counter: 'win.crux', need: 2,
      reward: [{ mat: 'ore_blue', n: 5 }, { mat: 'cat_doll', n: 2 }] },
    { id: 'q_dark',  text: '用暗黑族的牌組獲勝 2 場',   counter: 'win.darklore', need: 2,
      reward: [{ mat: 'ore_black', n: 5 }, { mat: 'cat_doll', n: 2 }] }
  ];

  SG.DAILY_COUNT = 3;

  /* ── 成就（一次性） ── */
  SG.ACHIEVEMENTS = [
    { id: 'a_win1',   group: '對戰', text: '打贏第一場',        counter: 'battleWin', need: 1,
      reward: [{ mat: 'ore_white', n: 5 }] },
    { id: 'a_win25',  group: '對戰', text: '累計獲勝 25 場',    counter: 'battleWin', need: 25,
      reward: [{ mat: 'ore_white', n: 15 }, { mat: 'cat_doll', n: 5 }] },
    { id: 'a_win100', group: '對戰', text: '累計獲勝 100 場',   counter: 'battleWin', need: 100,
      reward: [{ mat: 'sword', n: 10 }, { mat: 'ore_white', n: 30 }] },

    { id: 'a_dg1',    group: '副本', text: '第一次通關副本',    counter: 'dungeonClear', need: 1,
      reward: [{ mat: 'ore_white', n: 8 }, { mat: 'book', n: 3 }] },
    { id: 'a_dg10',   group: '副本', text: '累計通關 10 次',    counter: 'dungeonClear', need: 10,
      reward: [{ mat: 'sword', n: 6 }, { mat: 'ore_white', n: 20 }] },
    { id: 'a_dg30',   group: '副本', text: '累計通關 30 次',    counter: 'dungeonClear', need: 30,
      reward: [{ mat: 'sword', n: 15 }, { mat: 'ore_white', n: 40 }] },

    { id: 'a_craft10', group: '合成', text: '合成 10 張卡片',   counter: 'craft', need: 10,
      reward: [{ mat: 'cat_doll', n: 6 }, { mat: 'book', n: 6 }] },
    { id: 'a_craft50', group: '合成', text: '合成 50 張卡片',   counter: 'craft', need: 50,
      reward: [{ mat: 'ore_white', n: 30 }, { mat: 'sword', n: 8 }] },

    { id: 'a_ld1',    group: '天梯', text: '天梯首勝',          counter: 'ladderWin', need: 1,
      reward: [{ mat: 'ore_white', n: 6 }] },
    { id: 'a_ld20',   group: '天梯', text: '天梯累計 20 勝',    counter: 'ladderWin', need: 20,
      reward: [{ mat: 'sword', n: 8 }, { mat: 'ore_white', n: 25 }] },
    { id: 'a_mid',    group: '天梯', text: '晉升中間界',        custom: 'ladderPoints', need: 100,
      reward: [{ mat: 'ore_white', n: 12 }, { mat: 'cat_doll', n: 4 }] },
    { id: 'a_high',   group: '天梯', text: '晉升天上界',        custom: 'ladderPoints', need: 300,
      reward: [{ mat: 'sword', n: 12 }, { mat: 'ore_white', n: 35 }] },

    { id: 'a_boss3',  group: '收集', text: '取得三位 BOSS 的角色卡', custom: 'bossCards', need: 3,
      reward: [{ mat: 'sword', n: 20 }, { mat: 'ore_white', n: 50 }] },
    { id: 'a_full',   group: '收集', text: '每張卡都收滿牌組上限',   custom: 'fullSet',   need: 1,
      reward: [{ mat: 'sword', n: 30 }, { mat: 'ore_white', n: 80 }] }
  ];

  /* 成就的自訂進度算法 */
  SG.achieveProgress = function (a, data) {
    if (!a.custom) return data.counters[a.counter] || 0;
    if (a.custom === 'ladderPoints') return data.ladder.best;
    if (a.custom === 'bossCards') {
      return SG.DUNGEONS.filter(function (d) { return data.owned[d.reward] > 0; }).length;
    }
    if (a.custom === 'fullSet') {
      var pool = SG.collectibleCards().filter(function (c) { return !c.reward; });
      var full = pool.every(function (c) { return (data.owned[c.slug] || 0) >= c.limit; });
      return full ? 1 : 0;
    }
    return 0;
  };

  SG.questById = function (id) {
    for (var i = 0; i < SG.QUEST_POOL.length; i++) {
      if (SG.QUEST_POOL[i].id === id) return SG.QUEST_POOL[i];
    }
    return null;
  };
  SG.achieveById = function (id) {
    for (var i = 0; i < SG.ACHIEVEMENTS.length; i++) {
      if (SG.ACHIEVEMENTS[i].id === id) return SG.ACHIEVEMENTS[i];
    }
    return null;
  };

  /* 獎勵文字 */
  SG.rewardText = function (list) {
    return list.map(function (m) { return SG.matName(m.mat) + ' ×' + m.n; }).join('　');
  };
})();
