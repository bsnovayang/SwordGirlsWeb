/* ═══════════════════════════════════════════════════════════
   Episode EX2 卡片

   資料來源：
     · 數值、卡號、稀有度、效果 → Sword Girls Wiki（英文）
       https://swordgirls.fandom.com/

   ★ 繁中 wiki 的卡片頁到 EX1 就結束了，所以這個章節的**卡名與效果文
     幾乎都是本專案自譯**（見 tools/epex2_names.json、epex2_effects.json），
     標了 tl，UI 會顯示「暫譯」。

   ★ 合成配方仍是推導值（provRecipe）。
   ═══════════════════════════════════════════════════════════ */
var SG = window.SG || (window.SG = {});

(function () {
  'use strict';

  function rarity(points) {
    return points >= 50 ? 'Double Rare' : points >= 13 ? 'Rare'
         : points >= 3 ? 'Uncommon' : 'Common';
  }

  function foll(slug, id, name, jp, en, faction, size, atk, def, sta, limit, points, effect, flavor) {
    return {
      slug: slug, id: id, name: name, jp: jp, en: en, type: 'follower', faction: faction,
      size: size, atk: atk, def: def, sta: sta, limit: limit, points: points,
      ep: 'EX2', provRecipe: true, rarity: rarity(points),
      effect: effect || '', flavor: flavor || ''
    };
  }

  function spell(slug, id, name, jp, en, faction, size, limit, points, effect, flavor) {
    return {
      slug: slug, id: id, name: name, jp: jp, en: en, type: 'spell', faction: faction,
      size: size, limit: limit, points: points,
      ep: 'EX2', provRecipe: true, rarity: rarity(points),
      effect: effect || '', flavor: flavor || ''
    };
  }

  function chara(slug, id, name, en, faction, life, limit, points, effect, flavor) {
    return {
      slug: slug, id: id, name: name, jp: '', en: en, type: 'character', faction: faction,
      life: life, limit: limit, points: points,
      ep: 'EX2', provRecipe: true, rarity: rarity(points),
      effect: effect || '', flavor: flavor || ''
    };
  }

  var LIST = [

    /* ── 公立學校 · 隨從 ── */
    foll('lib_lucca_epex2', '300205', '圖書部的魯卡', '', 'Lib. Lucca', 'vita', 4, 5, 3, 9, 3, 5,
      '',
      ''),
    foll('council_event_inspector', '300277', '學生會的活動督察', '', 'Council Event Inspector', 'vita', 5, 7, 2, 10, 3, 1,
      '防禦前，此卡體力 +1。',
      ''),
    foll('tennis_guide', '300278', '網球部的教練', '', 'Tennis Guide', 'vita', 3, 3, 3, 8, 3, 1,
      '攻擊前，此卡攻擊力 +1。',
      ''),
    foll('lib_advisor', '300279', '圖書部的顧問', '', 'Lib. Advisor', 'vita', 4, 6, 2, 7, 3, 1,
      '攻擊前，牌組中所有與此卡同名的卡從遊戲中除外。每除外一張，此卡 攻 +1 / 防 +1 / 體 +2。',
      ''),
    foll('cook_club_critic', '300280', '料理研究部的評審', '', 'Cook Club Critic', 'vita', 4, 5, 3, 8, 3, 3,
      '防禦前，此卡體力上升「相鄰的同陣營隨從數」，攻擊力上升「該數的一半」（進位）。',
      ''),
    foll('council_press_winfield', '300281', '學生會宣傳部的溫菲爾德', '', 'Council Press Winfield', 'vita', 5, 5, 3, 10, 3, 7,
      '攻擊前，手牌第一張卡名含「學生會」的卡放到牌組下方，此卡 攻 +1 / 體 +2。',
      ''),
    foll('lunia_scentriver', '300282', '露妮亞・賽特莉芭', '', 'Lunia Scentriver', 'vita', 5, 8, 2, 10, 1, 33,
      '攻擊前，此卡複製防禦隨從的前兩個能力。有複製的話，此卡 攻/體 上升「取得的能力數」。',
      ''),
    foll('sword_girls_sita', '300320', '劍之少女、西塔', '', 'Sword Girls Sita', 'vita', 4, 5, 1, 11, 3, 7,
      '回合開始時，牌組第一張卡名含「劍之少女」的隨從恢復原本的能力並放到我方第一個空格。有生效的話，該卡體力 +3，此卡放到牌組下方。\n攻擊前，我方所有隨從 攻 +2 / 體 +1，然後失去這個能力。',
      ''),
    foll('animal_suit_sita', '300321', '獸裝的西塔', '', 'Animal Suit Sita', 'vita', 3, 6, 0, 7, 3, 7,
      '防禦前，依我方卡名含「西塔」的卡片數套用效果。●1：防 = 1 / 體 +1　●2：防 = 2 / 體 +2　●3 以上：防 = 2 / 體 +3。',
      ''),
    foll('council_press_student', 'EX2-028', '學生會宣傳部員', '', 'Council Press Student', 'vita', 4, 3, 3, 8, 3, 3,
      '攻擊前，我方卡名含「學生會」的隨從 攻 +1。\n防禦前，我方卡名含「學生會」的隨從 體 +1。',
      ''),

    /* ── 公立學校 · 咒語 ── */
    spell('hot_item', '200201', '熱門商品', '', 'Hot Item', 'vita', 4, 3, 1,
      '我方所有隨從 攻 +2 / 體 +3。',
      ''),
    spell('principals_story', '200202', '校長的故事', '', "Principal's Story", 'vita', 2, 3, 1,
      '對手手牌第一張與其角色不同陣營的卡，加入我方手牌。',
      ''),
    spell('low_turnout', '200203', '出席率低落', '', 'Low Turnout', 'vita', 3, 3, 7,
      '我方防禦力最高的「公立」隨從，體力上升「其防禦力的兩倍」。手牌第一張「公立」卡放到牌組下方。',
      ''),
    spell('shattered_land', '200204', '碎裂的大地', '', 'Shattered Land', 'vita', 2, 2, 13,
      '我方隨機兩張「公立」隨從獲得能力：「防禦前，此卡體力上升攻擊隨從的攻擊力，然後失去這個能力」。',
      ''),
    spell('keepsake', '200205', '遺物', '', 'Keepsake', 'vita', 2, 1, 50,
      '我方第二張隨從 攻/防/體 上升「第一張隨從的 SIZE」。有生效的話，自己角色是「公立」所屬時第一張隨從放到牌組下方；不是時送入墓地。',
      ''),
    spell('sitas_suit', '200239', '西塔的裝束', '', "Sita's Suit", 'vita', 2, 3, 3,
      '我方隨機兩張「公立」隨從 攻 +2 / 體 +2。我方隨機兩張卡名含「西塔」的隨從 攻 +1 / 體 +1。',
      ''),
    spell('perky_girl', '200240', '元氣少女', '', 'Perky Girl', 'vita', 2, 3, 7,
      '牌組前兩張卡名含「西塔」的卡加入手牌。有加入的話，那些卡 SIZE −2。',
      ''),
    spell('halloween_minidevil', '200241', '萬聖節小惡魔', '', 'Halloween Minidevil', 'vita', 2, 2, 13,
      '敵方隨機一張隨從，體力減少「手牌第一張隨從的攻擊力」。有生效的話，把對手手牌第一張不含「萬聖節」的咒語複製一份放到我方第一個空格。',
      ''),

    /* ── 公立學校 · 角色 ── */
    chara('vernika_answer', '100112', '維若妮卡的解答', 'Vernika Answer', 'vita', 30, 1, 20,
      '回合開始時，對手手牌所有咒語放到對手牌組下方。',
      ''),

    /* ── 私立學校 · 咒語 ── */
    spell('inevitable_choice', '200208', '無可避免的抉擇', '', 'Inevitable Choice', 'academy', 3, 3, 7,
      '自己角色是「私立」所屬時，我方第一張「私立」隨從 攻/體 上升「我方『私立』卡片數」，SIZE 減少「我方卡名含『淑女』的卡片數」。',
      ''),
    spell('table_manners', '200209', '餐桌禮儀', '', 'Table Manners', 'academy', 2, 2, 13,
      '敵方第一張 SIZE 等於「此卡格號 ＋ 此卡 SIZE」的卡送入墓地。有生效的話，此卡進入行動終了。',
      ''),
    spell('royle_academy', '200210', '皇家學園', '', 'Royle Academy', 'academy', 3, 1, 50,
      '我方第一張與角色同陣營的隨從，攻/防/體 加倍。該卡獲得能力：「回合開始時，此卡 攻/防/體 變回原本的數值，然後失去這個能力」。',
      ''),
    spell('cinias_suit', '200242', '希妮亞的裝束', '', "Cinia's Suit", 'academy', 2, 3, 3,
      '我方隨機兩張「私立」隨從 攻 +2 / 體 +2。我方隨機兩張卡名含「希妮亞」的隨從 攻 +1 / 體 +1。',
      ''),
    spell('diligent_girl', '200243', '勤奮少女', '', 'Diligent GIrl', 'academy', 2, 3, 7,
      '牌組前兩張卡名含「希妮亞」的卡加入手牌。有加入的話，敵方第一張體力不超過「加入卡片 SIZE 總和」的隨從送入墓地。',
      ''),
    spell('halloween_countess', '200244', '萬聖節伯爵夫人', '', 'Halloween Countess', 'academy', 2, 2, 13,
      '我方有隨從且敵方有帶能力的隨從時，把對手手牌第一張不含「萬聖節」的咒語複製一份放到我方第一個空格，接著敵方隨機一張有能力的隨從失去第一個能力，並隨機獲得下列其一：●攻擊前，此卡攻擊力 −1。●防禦前，此卡體力 −3。',
      ''),

    /* ── 南十字 · 咒語 ── */
    spell('crux_conference', '200211', '南十字會議', '', 'Crux Conference', 'crux', 3, 3, 1,
      '敵方隨機兩張隨從 攻 −1 / 體 −3。',
      ''),
    spell('enemy_within', '200212', '內部的敵人', '', 'Enemy Within', 'crux', 2, 3, 1,
      '我方帶能力的「南十字」隨從全部失去能力。那些隨從 攻/體 上升「失去的能力數」。',
      ''),
    spell('commissioned_research', '200213', '委託研究', '', 'Commissioned Research', 'crux', 2, 3, 7,
      '敵方 SIZE 不超過「我方第一張『南十字』隨從 SIZE」的咒語，放到對手牌組下方。',
      ''),
    spell('supply_transfer', '200214', '補給轉送', '', 'Supply Transfer', 'crux', 2, 2, 13,
      '我方第一張與角色同陣營的隨從，攻/體 上升「2 ＋ 其他我方隨從的 SIZE 總和」。',
      ''),
    spell('luthicas_suit', '200245', '露西卡的裝束', '', "Luthica's Suit", 'crux', 2, 3, 3,
      '我方隨機兩張「南十字」隨從 攻 +2 / 體 +2。我方隨機兩張卡名含「露西卡」的隨從 攻 +1 / 體 +1。',
      ''),
    spell('the_hazing', '200246', '新人洗禮', '', 'The Hazing', 'crux', 2, 3, 7,
      '我方隨機兩張隨從，防禦力上升「手牌空格數的一半」（進位）。牌組前兩張卡名含「露西卡」的卡加入手牌。',
      ''),
    spell('halloween_witch', '200247', '萬聖節魔女', '', 'Halloween Witch', 'crux', 2, 2, 13,
      '我方隨機一張隨從隨機獲得下列其一（有生效的話，把對手手牌第一張不含「萬聖節」的咒語複製一份放到我方第一個空格）：●攻擊前，此卡 攻/體 +1。●防禦前，此卡體力 +3。●回合開始時，此卡防禦 +2。',
      ''),

    /* ── 無所屬 · 角色 ── */
    chara('office_chief_esprit', '100112', '事務長、艾斯普利', 'Office Chief Esprit', 'neutral', 30, 1, 25,
      '回合開始時，依我方場上的能力數套用效果。●2 個以下：敵方隨機一張隨從失去能力。●超過 2 個：我方隨機一張隨從 攻/體 上升「我方場上能力數的一半」（進位）。',
      ''),
  ];

  /* 這些卡的名字是自譯（繁中 wiki 沒有收錄） */
  var TL = ["lib_lucca_epex2", "council_event_inspector", "tennis_guide", "lib_advisor", "cook_club_critic", "council_press_winfield", "lunia_scentriver", "sword_girls_sita", "animal_suit_sita", "council_press_student", "hot_item", "principals_story", "low_turnout", "shattered_land", "keepsake", "sitas_suit", "perky_girl", "halloween_minidevil", "vernika_answer", "inevitable_choice", "table_manners", "royle_academy", "cinias_suit", "diligent_girl", "halloween_countess", "crux_conference", "enemy_within", "commissioned_research", "supply_transfer", "luthicas_suit", "the_hazing", "halloween_witch", "office_chief_esprit"];
  LIST.forEach(function (c) { if (TL.indexOf(c.slug) >= 0) c.tl = true; });

  LIST.forEach(function (c) { SG.CARDS[c.slug] = c; });
})();
