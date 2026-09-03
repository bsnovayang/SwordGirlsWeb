/* ═══════════════════════════════════════════════════════════
   牌組資料 — 四陣營新手牌組（1 張角色卡 + 30 張）
   資料依原作 Deck Shop 的新手牌組內容
   ═══════════════════════════════════════════════════════════ */
var SG = window.SG || (window.SG = {});

(function () {
  'use strict';

  /* n(slug, 張數) 展開成陣列 */
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

  SG.DECKS = [
    {
      name: '公立學校 · 料理研究社',
      faction: 'vita',
      character: 'sita_vilosa',
      cards: build(
        n('heartless_blow', 1), n('student_orientation', 2), n('cooking_failure', 2),
        n('ward_rupture', 2), n('new_recipe', 2),
        n('cook_club_student', 3), n('cook_club_advisor', 3), n('new_cook_club_student', 3),
        n('cook_club_svia', 3), n('cook_club_dir_jamie', 3),
        n('cook_club_katie', 2), n('cook_club_sylphie', 2), n('cook_club_linfield', 2)
      )
    },
    {
      name: '私立學校 · 女僕隊',
      faction: 'academy',
      character: 'cinia_pacifica',
      cards: build(
        n('accident', 2), n('new_maid_training', 2), n('she_did_it', 2),
        n('noble_sacrifice', 1), n('tighten_security', 2),
        n('gardening_maid', 3), n('new_maid', 3), n('guard_maid', 3),
        n('porter_maid', 3), n('head_maid', 3),
        n('chief_maid', 2), n('mop_maid', 2), n('tailor_maid', 2)
      )
    },
    {
      name: '南十字 · 騎士團',
      faction: 'crux',
      character: 'luthica_preventer',
      cards: build(
        n('saints_blessing', 1), n('close_encounter', 2), n('entry_denied', 2),
        n('healing_magic', 2), n('sky_surprise', 2),
        n('new_knight', 3), n('military_knight_sillit', 3), n('flag_knight_frett', 3),
        n('knight_adjt_sarisen', 3), n('crux_knight_mitil', 3),
        n('crux_knight_pintail', 2), n('knight_escort', 2), n('crux_knight_terra', 2)
      )
    },
    {
      name: '暗黑族 · 菲莉娜一族',
      faction: 'darklore',
      character: 'iri_flina',
      cards: build(
        n('flinas_command', 2), n('blood_reversal', 2), n('vampiric_rites', 2),
        n('blood_target', 2), n('sacrifice', 1),
        n('crescent_conundrum', 3), n('scardel_chardonnay', 3), n('scardel_sion_flina', 2),
        n('scardel_rion_flina', 2), n('scardel_pinot_noir', 3),
        n('moondancer_kata_flina', 2), n('crescent_kris_flina', 3), n('crescent_nyetimber', 3)
      )
    }
  ];

  /* 牌組總點數 */
  SG.deckPoints = function (d) {
    var p = 0, ch = SG.getCard(d.character);
    if (ch) p += ch.points || 0;
    for (var i = 0; i < d.cards.length; i++) {
      var c = SG.getCard(d.cards[i]);
      if (c) p += c.points || 0;
    }
    return p;
  };

  /* 牌組合法性檢查 */
  SG.validateDeck = function (d) {
    var errs = [], count = {};
    if (!SG.getCard(d.character)) errs.push('缺少角色卡');
    if (d.cards.length !== 30) errs.push('張數 ' + d.cards.length + '（應為 30）');
    for (var i = 0; i < d.cards.length; i++) {
      var s = d.cards[i];
      count[s] = (count[s] || 0) + 1;
      if (!SG.getCard(s)) errs.push('未知卡片：' + s);
    }
    var ch = SG.getCard(d.character);
    for (var k in count) {
      var c = SG.getCard(k);
      if (!c) continue;
      if (count[k] > (c.limit || 3)) errs.push(c.name + ' 超過上限（' + count[k] + '/' + c.limit + '）');
      if (ch && c.faction !== 'neutral' && c.faction !== ch.faction) {
        errs.push(c.name + ' 陣營不符（' + SG.FACTIONS[c.faction].name + '）');
      }
    }
    return errs;
  };
})();
