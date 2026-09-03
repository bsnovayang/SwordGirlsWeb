/* ═══════════════════════════════════════════════════════════
   模擬天梯（S5）

   原作的 FIGHT 是真人對戰，依牌組分數(DP)分成三階：
     下界 ~100 DP／中間界 101~300／天上界 301~
   本作沒有伺服器，改成「與 AI 牌組對戰的模擬天梯」，
   沿用同一組階層名稱與門檻數字，但門檻改看**天梯積分**
   （Episode 0 的牌組 DP 都在 40 上下，用 DP 分階會全擠在下界）。

   ★ 難度來自 AI 強度：下界用基礎 AI，中間界／天上界用會推演的強 AI。
     副本那邊維持基礎 AI 不變 —— 副本是拿來刷素材的。
   ═══════════════════════════════════════════════════════════ */
var SG = window.SG || (window.SG = {});

(function () {
  'use strict';

  function n(slug, count) {
    var r = [];
    for (var i = 0; i < count; i++) r.push(slug);
    return r;
  }
  function build() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) out = out.concat(arguments[i]);
    return out;
  }

  SG.LADDER_TIERS = [
    { id: 'low',  name: '下界',   min: 0,   win: 12, lose: 6,
      ai: 'basic', opts: null,
      desc: '基礎 AI —— 照卡片數值貪心下牌，不會考慮效果。' },
    { id: 'mid',  name: '中間界', min: 100, win: 15, lose: 8,
      ai: 'smart', opts: { plans: 20, rollouts: 3 },
      desc: '會推演的 AI（輕量）—— 開始懂得咒語與格位的價值。' },
    { id: 'high', name: '天上界', min: 300, win: 20, lose: 10,
      ai: 'smart', opts: { plans: 48, rollouts: 5 },
      desc: '會推演的 AI（全力）—— 每回合模擬 240 次找最佳下法。' }
  ];

  SG.ladderTier = function (points) {
    var t = SG.LADDER_TIERS[0];
    SG.LADDER_TIERS.forEach(function (x) { if (points >= x.min) t = x; });
    return t;
  };
  SG.tierById = function (id) {
    for (var i = 0; i < SG.LADDER_TIERS.length; i++) {
      if (SG.LADDER_TIERS[i].id === id) return SG.LADDER_TIERS[i];
    }
    return SG.LADDER_TIERS[0];
  };

  /* ── 對手牌組 ── */

  var VITA_RUSH = build(                       // 低 SIZE 鋪場 ＋ 增益
    n('cook_club_student', 3), n('cook_club_advisor', 3), n('new_cook_club_student', 3),
    n('cook_club_linfield', 3), n('cook_club_katie', 3), n('cook_club_svia', 3),
    n('student_orientation', 3), n('cooking_failure', 3), n('ward_rupture', 3), n('new_recipe', 3)
  );

  var MAID_PRESS = build(                      // 女僕數量 ＋ 弱化對手
    n('gardening_maid', 3), n('new_maid', 3), n('guard_maid', 3),
    n('tailor_maid', 3), n('chief_maid', 3), n('porter_maid', 3),
    n('accident', 3), n('she_did_it', 3), n('tighten_security', 3), n('new_maid_training', 3)
  );

  var KNIGHT_BOOK = build(                     // 騎士團全體增益
    n('new_knight', 3), n('military_knight_sillit', 3), n('crux_knight_terra', 3),
    n('flag_knight_frett', 3), n('knight_adjt_sarisen', 3), n('crux_knight_pintail', 3),
    n('saints_blessing', 1), n('close_encounter', 3), n('entry_denied', 3),
    n('healing_magic', 3), n('sky_surprise', 2)
  );

  var BLOOD_WHISPER = build(                   // 菲莉娜一族的中速牌
    n('crescent_conundrum', 3), n('scardel_chardonnay', 3), n('scardel_sion_flina', 3),
    n('scardel_rion_flina', 3), n('scardel_pinot_noir', 3), n('crescent_kris_flina', 3),
    n('flinas_command', 3), n('blood_reversal', 3), n('vampiric_rites', 3), n('blood_target', 3)
  );

  var SACRIFICE_FEAST = build(                 // 直傷 ＋ 換命
    n('crescent_conundrum', 3), n('scardel_chardonnay', 3), n('crescent_nyetimber', 3),
    n('scardel_sion_flina', 3), n('scardel_rion_flina', 3), n('moondancer_kata_flina', 3),
    n('sacrifice', 1), n('blood_target', 3), n('flinas_command', 3),
    n('blood_reversal', 3), n('vampiric_rites', 2)
  );

  function starter(faction) {
    for (var i = 0; i < SG.DECKS.length; i++) {
      if (SG.DECKS[i].faction === faction) return SG.DECKS[i].cards.slice();
    }
    return [];
  }

  SG.LADDER = [
    { id: 'l1', name: '料理社的新人',   tier: 'low',
      character: 'sita_vilosa',      cards: starter('vita'),
      blurb: '剛買了新手牌組就來了，出牌很老實。' },
    { id: 'l2', name: '見習女僕 蜜雅',  tier: 'low',
      character: 'cinia_pacifica',   cards: starter('academy'),
      blurb: '女僕隊的標準組合，靠數量壓人。' },
    { id: 'l3', name: '騎士候補 蘭恩',  tier: 'low',
      character: 'luthica_preventer', cards: starter('crux'),
      blurb: '照著教範打，穩但沒什麼變化。' },

    { id: 'l4', name: '血族的低語',     tier: 'mid',
      character: 'iri_flina',        cards: BLOOD_WHISPER,
      blurb: '菲莉娜一族的中速牌，體力增益疊得很兇。' },
    { id: 'l5', name: '廚房暴走',       tier: 'mid',
      character: 'sita_vilosa',      cards: VITA_RUSH,
      blurb: '低 SIZE 鋪滿再一口氣加成，前期壓迫力強。' },
    { id: 'l6', name: '女僕長 賽琳',    tier: 'mid',
      character: 'cinia_pacifica',   cards: MAID_PRESS,
      blurb: '一邊鋪女僕一邊削你的數值，很難打乾淨。' },

    { id: 'l7', name: '騎士團長 費歐',  tier: 'high',
      character: 'luthica_preventer', cards: KNIGHT_BOOK,
      blurb: '全隊增益＋治癒，拖得越久越難殺。' },
    { id: 'l8', name: '獻祭之宴',       tier: 'high',
      character: 'iri_flina',        cards: SACRIFICE_FEAST,
      blurb: '不跟你拚場面，直接扣你的生命。' }
  ];

  SG.ladderFoe = function (id) {
    for (var i = 0; i < SG.LADDER.length; i++) if (SG.LADDER[i].id === id) return SG.LADDER[i];
    return null;
  };

  /* 對手牌組轉成引擎吃的格式 */
  SG.ladderDeck = function (foe) {
    return { name: foe.name, npc: true, character: foe.character, cards: foe.cards.slice() };
  };
})();
