/* ═══════════════════════════════════════════════════════════
   Episode 6 卡片

   資料來源：
     · 數值、卡號、稀有度、效果 → Sword Girls Wiki（英文）
       https://swordgirls.fandom.com/

   ★ 繁中 wiki 的卡片頁到 EX1 就結束了，所以這個章節的**卡名與效果文
     幾乎都是本專案自譯**（見 tools/ep6_names.json、ep6_effects.json），
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
      ep: 6, provRecipe: true, rarity: rarity(points),
      effect: effect || '', flavor: flavor || ''
    };
  }

  function spell(slug, id, name, jp, en, faction, size, limit, points, effect, flavor) {
    return {
      slug: slug, id: id, name: name, jp: jp, en: en, type: 'spell', faction: faction,
      size: size, limit: limit, points: points,
      ep: 6, provRecipe: true, rarity: rarity(points),
      effect: effect || '', flavor: flavor || ''
    };
  }

  function chara(slug, id, name, en, faction, life, limit, points, effect, flavor) {
    return {
      slug: slug, id: id, name: name, jp: '', en: en, type: 'character', faction: faction,
      life: life, limit: limit, points: points,
      ep: 6, provRecipe: true, rarity: rarity(points),
      effect: effect || '', flavor: flavor || ''
    };
  }

  var LIST = [

    /* ── 公立學校 · 隨從 ── */
    foll('council_roroa', '300244', '學生會的蘿蘿雅', '', 'Council Roroa', 'vita', 1, 3, 0, 7, 3, 1,
      '攻擊前，防禦隨從失去能力直到下一回合開始。',
      ''),
    foll('cook_club_elsfi', '300245', '料理研究部的艾兒絲菲', '', 'Cook Club Elsfi', 'vita', 3, 5, 2, 5, 3, 1,
      '防禦前，此卡尚未行動時，攻/體 +1。',
      ''),
    foll('council_coordinator', '300246', '學生會的協調人', '', 'Council Coordinator', 'vita', 2, 3, 2, 6, 3, 5,
      '防禦前，我方「公立」隨從全體 攻 +2。失去這個能力。',
      ''),
    foll('cook_club_marie', '300247', '料理研究部的瑪莉', '', 'Cook Club Marie', 'vita', 7, 5, 4, 17, 3, 5,
      '',
      ''),
    foll('tennis_lure', '300248', '網球部的露兒', '', 'Tennis Lure', 'vita', 4, 4, 4, 8, 3, 7,
      '回合開始時，我方隨機一張隨從與敵方隨機一張隨從互換能力。',
      ''),
    foll('campus_waitress', '300249', '校內的女服務生', '', 'Campus Waitress', 'vita', 3, 7, 1, 7, 3, 7,
      '防禦前，此卡攻擊力 1 以上時，攻 −1 / 防 +1 / 體 +1。',
      ''),
    foll('council_exec_maron', '300250', '學生會幹部的瑪隆', '', 'Council Exec. Maron', 'vita', 6, 8, 2, 15, 1, 33,
      '防禦前，此卡與攻擊隨從不同陣營時，攻擊隨從 攻/體 −1，此卡 攻/體 +1。',
      ''),

    /* ── 公立學校 · 咒語 ── */
    spell('event_preparation', '200172', '活動準備', '', 'Event Preparation', 'vita', 3, 3, 1,
      '我方同時有「與角色同陣營」與「與角色不同陣營」的隨從時，我方隨機兩張隨從 攻 +3 / 體 +3。',
      ''),
    spell('victory_proclamation', '200173', '勝利宣言', '', 'Victory Proclamation', 'vita', 1, 3, 1,
      '雙方手牌都至少有一張時，交換雙方手牌的第一張。',
      ''),
    spell('topsy_turvy', '200174', '天翻地覆', '', 'Topsy Turvy', 'vita', 2, 3, 1,
      '我方隨機一張隨從 攻/體 上升「1 ＋ 手牌的陣營種類數」。',
      ''),
    spell('inhuman_creature', '200175', '非人之物', '', 'Inhuman Creature', 'vita', 2, 3, 3,
      '雙方場上都有隨從時，我方隨機一張與敵方隨機一張隨從送入墓地。',
      ''),
    spell('preserver_of_rules', '200176', '校規的守護者', '', 'Preserver of Rules', 'vita', 2, 3, 3,
      '我方隨機一張「公立」隨從，攻擊力上升「1 ＋ 手牌數」，體力上升「手牌數 − 1」。',
      ''),
    spell('morals_crackdown', '200177', '風紀取締', '', 'Morals Crackdown', 'vita', 3, 2, 13,
      '我方有隨從時，雙方所有隨從防禦 = 0，並且體力減少「防禦力的下降量」。',
      ''),
    spell('encounter', '200178', '遭遇', '', 'Encounter', 'vita', 2, 1, 50,
      '雙方場上所有咒語送入墓地。我方隨機兩張隨從 攻/體 上升「1 ＋ 送墓的咒語數」。',
      ''),

    /* ── 公立學校 · 角色 ── */
    chara('vita_principal_treanna', '100095', '公立學校校長、崔安娜', 'Vita Principal Treanna', 'vita', 30, 1, 20,
      '回合開始時，我方隨機一張隨從 攻/體 +2 並失去能力。若真的失去了能力，該隨從 SIZE −1。',
      ''),

    /* ── 私立學校 · 咒語 ── */
    spell('pursuit_of_perfection', '200179', '追求完美', '', 'Pursuit of Perfection', 'academy', 2, 3, 1,
      '我方 SIZE 2 以下的「私立」隨從，攻 = 1 / 體 = 1。手牌第一張「私立」隨從，攻擊力上升「總下降攻擊力的一半」（進位），體力上升「總下降體力的一半」（進位）。',
      ''),
    spell('black_magic_preparation', '200180', '黑魔術的準備', '', 'Black Magic Preparation', 'academy', 1, 3, 1,
      '手牌所有咒語 SIZE −1。',
      ''),
    spell('ladys_wrath', '200181', '淑女的憤怒', '', "Lady's Wrath", 'academy', 1, 3, 1,
      '手牌最後一張「私立」卡送入墓地。有送的話，敵方隨機一張隨從 攻 −4 / 體 −4。',
      ''),
    spell('shoot', '200182', '射擊', '', 'Shoot', 'academy', 2, 3, 3,
      '手牌最後一張卡從遊戲中除外。有除外的話，把對手手牌第一張複製一份加入我方手牌。',
      ''),
    spell('servant_of_clarice', '200183', '克菈莉絲的僕從', '', 'Servant of Clarice', 'academy', 2, 3, 3,
      '牌組第一張送入墓地、第二張放到牌組下方。有生效的話，敵方隨機一張隨從放到對手牌組下方。',
      ''),
    spell('ladys_attendant', '200184', '淑女的隨侍', '', "Lady's Attendant", 'academy', 2, 2, 13,
      '我方隨機兩張「私立」隨從，攻擊力上升「我方手牌數」，體力上升「1 ＋ 對手手牌數」。',
      ''),
    spell('push_forward', '200185', '強行推進', '', 'Push Forward', 'academy', 3, 1, 50,
      '敵方隨機兩張隨從 攻 −4 / 體 −4。此卡 SIZE 為 1 時從遊戲中除外；否則 SIZE = 1 並進入行動終了。',
      ''),

    /* ── 南十字 · 咒語 ── */
    spell('supply_request', '200186', '補給申請', '', 'Supply Request', 'crux', 2, 3, 1,
      '我方 SIZE 最高的隨從，SIZE 減少「其 SIZE 與手牌第一張卡的 SIZE 差」。',
      ''),
    spell('miscalculation', '200187', '失算', '', 'Miscalculation', 'crux', 1, 3, 1,
      '手牌 3 張以下時，從牌組上方把隨從加入手牌，直到手牌有 4 張。',
      ''),
    spell('passcode', '200188', '通行密碼', '', 'Passcode', 'crux', 3, 3, 1,
      '我方場上有三張以上 SIZE 相同的卡時，該 SIZE 的隨從 攻 +3 / 體 +3。',
      ''),
    spell('vacation', '200189', '休假', '', 'Vacation', 'crux', 2, 3, 3,
      '我方體力最高的第一張「南十字」隨從，體力減半（進位），防禦力上升「體力減少量的一半」（進位）。',
      ''),
    spell('warriors_resolve', '200190', '戰士的覺悟', '', "Warrior's Resolve", 'crux', 2, 3, 3,
      '比較手牌張數與手牌空格數。我方隨機兩張「南十字」隨從，攻擊力上升較大者，體力上升「較小者 − 1」（最低 0）。',
      ''),
    spell('beach_research', '200191', '海灘研究', '', 'Beach Research', 'crux', 2, 2, 13,
      '我方隨機兩張隨從 SIZE −1 / 攻 +1 / 防 +1 / 體 +1。',
      ''),
    spell('shock', '200192', '衝擊', '', 'Shock', 'crux', 2, 1, 50,
      '我方所有隨從體力 +5，敵方所有隨從攻擊力 −2。自己角色是「南十字」所屬時，我方所有隨從再 攻 +1。',
      ''),

    /* ── 暗黑族 · 隨從 ── */
    foll('scardel_unit_felgus', '300267', '斯卡迪魯部隊、費爾格斯', '', 'Scardel Unit Felgus', 'darklore', 4, 5, 1, 9, 3, 1,
      '攻擊前，防禦隨從體力減少其防禦力。',
      ''),
    foll('crescent_unit_azoth', '300268', '克雷森特部隊、亞佐特', '', 'Crescent Unit Azoth', 'darklore', 2, 6, 1, 2, 3, 1,
      '防禦前，此卡體力上升「我方卡名含「斯卡迪魯」的卡片數」。',
      ''),
    foll('gs_spy', '300269', 'GS間諜', '', 'GS Spy', 'darklore', 3, 6, 3, 2, 3, 1,
      '防禦前，此卡尚未行動時，攻/體 +1。',
      ''),
    foll('gs_fighting_instructor', '300270', 'GS格鬥教官', '', 'GS Fighting Instructor', 'darklore', 4, 4, 3, 10, 3, 5,
      '回合開始時，我方卡名含「GS」的隨從 攻/體 +1，不含「GS」的隨從 攻/體 −1。',
      ''),
    foll('lightning_witch', '300271', '閃電的魔女', '', 'Lightning Witch', 'darklore', 5, 7, 2, 11, 3, 5,
      '回合開始時，此卡 SIZE −2 或 SIZE +1（各五成機率）。',
      ''),
    foll('creepy_witch', '300273', '毛骨悚然的魔女', '', 'Creepy Witch', 'darklore', 3, 3, 2, 7, 3, 7,
      '攻擊前，此卡防禦力 1 以上時，攻/體 上升其防禦力，然後失去這個能力直到下一回合開始。回合開始時，此卡防禦 −1（最低 0）。',
      ''),
    foll('gs_1st_star', '300274', 'GS首席之星', '', 'GS 1st Star', 'darklore', 6, 10, 3, 8, 1, 33,
      '防禦前，此卡與攻擊隨從不同陣營時，攻擊隨從 攻/體 −1，此卡 攻/體 +1。',
      ''),

    /* ── 暗黑族 · 咒語 ── */
    spell('crux_underground', '200193', '南十字的地下組織', '', 'Crux Underground', 'darklore', 3, 3, 1,
      '與敵方第一張卡同 SIZE 的敵方隨從，攻/體 減少「敵方同 SIZE 的卡片數」。',
      ''),
    spell('recruitment_act', '200194', '招募行動', '', 'Recruitment Act', 'darklore', 2, 3, 1,
      '我方隨機一張隨從送入墓地。有送的話，對手角色生命 −1，且對手可重洗次數 −1。',
      ''),
    spell('marionette', '200195', '提線人偶', '', 'Marionette', 'darklore', 3, 3, 1,
      '我方第一張隨從的 攻/體 變成「原本 攻＋體 的一半」（進位）。',
      ''),
    spell('mischief', '200196', '惡作劇', '', 'Mischief', 'darklore', 2, 3, 3,
      '敵方所有隨從，體力減少「我方墓地『惡作劇』張數的三倍」。',
      ''),
  ];

  /* 這些卡的名字是自譯（繁中 wiki 沒有收錄） */
  var TL = ["council_roroa", "cook_club_elsfi", "council_coordinator", "cook_club_marie", "tennis_lure", "campus_waitress", "council_exec_maron", "event_preparation", "victory_proclamation", "topsy_turvy", "inhuman_creature", "preserver_of_rules", "morals_crackdown", "encounter", "vita_principal_treanna", "pursuit_of_perfection", "black_magic_preparation", "ladys_wrath", "shoot", "servant_of_clarice", "ladys_attendant", "push_forward", "supply_request", "miscalculation", "passcode", "vacation", "warriors_resolve", "beach_research", "shock", "scardel_unit_felgus", "crescent_unit_azoth", "gs_spy", "gs_fighting_instructor", "lightning_witch", "creepy_witch", "gs_1st_star", "crux_underground", "recruitment_act", "marionette", "mischief"];
  LIST.forEach(function (c) { if (TL.indexOf(c.slug) >= 0) c.tl = true; });

  LIST.forEach(function (c) { SG.CARDS[c.slug] = c; });
})();
