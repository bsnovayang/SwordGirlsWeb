/* ═══════════════════════════════════════════════════════════
   Episode 5 卡片

   資料來源：
     · 數值、卡號、稀有度、效果 → Sword Girls Wiki（英文）
       https://swordgirls.fandom.com/

   ★ 繁中 wiki 的卡片頁到 EX1 就結束了，所以這個章節的**卡名與效果文
     幾乎都是本專案自譯**（見 tools/ep5_names.json、ep5_effects.json），
     標了 tl，UI 會顯示「暫譯」。

  ★ 只有公立咒語 7 張有官方繁中譯名（繁中 wiki 頁面 109）。
     「圖書部的米路卡」與 Episode 2 的同名卡是不同卡（原作就同名），slug 加 _ep5 區別。

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
      ep: 5, provRecipe: true, rarity: rarity(points),
      effect: effect || '', flavor: flavor || ''
    };
  }

  function spell(slug, id, name, jp, en, faction, size, limit, points, effect, flavor) {
    return {
      slug: slug, id: id, name: name, jp: jp, en: en, type: 'spell', faction: faction,
      size: size, limit: limit, points: points,
      ep: 5, provRecipe: true, rarity: rarity(points),
      effect: effect || '', flavor: flavor || ''
    };
  }

  function chara(slug, id, name, en, faction, life, limit, points, effect, flavor) {
    return {
      slug: slug, id: id, name: name, jp: '', en: en, type: 'character', faction: faction,
      life: life, limit: limit, points: points,
      ep: 5, provRecipe: true, rarity: rarity(points),
      effect: effect || '', flavor: flavor || ''
    };
  }

  var LIST = [

    /* ── 公立學校 · 隨從 ── */
    foll('tennis_nessa', '300203', '網球部的妮莎', '', 'Tennis Nessa', 'vita', 2, 8, 0, 3, 3, 1,
      '',
      ''),
    foll('lib_evenne', '300204', '圖書部的艾雯', '', 'Lib. Evenne', 'vita', 1, 5, 1, 2, 3, 1,
      '防禦前，此卡與自己角色同陣營時，對手角色生命 −1。失去這個能力。',
      ''),
    foll('lib_milka_ep5', '300207', '圖書部的米路卡', '', 'Lib. Milka', 'vita', 5, 5, 3, 13, 3, 7,
      '防禦前，我方第一張「圖書部」隨從體力 +2。此卡失去這個能力直到下一回合開始。',
      ''),
    foll('lib_hl_tezina', '300208', '圖書部總管的泰姬娜', '', 'Lib. H.L. Tezina', 'vita', 4, 4, 3, 9, 3, 7,
      '回合開始時，自己角色是「公立」所屬時，把手牌中一張「圖書部」的公立卡與一張非「圖書部」的公立卡放到牌組下方。有放的話，敵方隨機一張卡放到對手牌組下方，然後失去這個能力。',
      ''),
    foll('waitress_gart', '300209', '女服務生、蓋托', '', 'Waitress Gart', 'vita', 4, 6, 2, 10, 1, 13,
      '防禦前，攻擊隨從屬於「私立」或「暗黑」時，該隨從 攻/體 −2；否則此卡 攻/體 +2。此卡失去這個能力直到下一回合開始。',
      ''),
    foll('battlefield_sita', '300210', '戰場的西塔', '', 'Battlefield Sita', 'vita', 3, 7, 1, 8, 1, 33,
      '攻擊前，防禦隨從體力減少「此卡攻擊力的一半」（進位）。此卡體力上升「該減少量的一半」（進位）。',
      ''),
    foll('council_dispatch_layna', '300238', '學生會派遣的蕾娜', '', 'Council Dispatch Layna', 'vita', 8, 8, 1, 12, 1, 33,
      '防禦前，此卡 攻 +1 / 體 +2。',
      ''),

    /* ── 公立學校 · 咒語 ── */
    spell('summer_machine_gun', '200140', 'SummerMachineGun', '', 'Summer Machine Gun', 'vita', 2, 3, 1,
      '手牌與場上同時有卡名含「魯卡」「米路卡」「賽莉耶」的卡時，我方第一張隨從 攻 +4 / 體 +4。',
      ''),
    spell('detection', '200141', '看破', '', 'Detection', 'vita', 3, 3, 1,
      '敵方隨機一張隨從，體力減少該隨從的 SIZE，防禦 −1。',
      ''),
    spell('golden_pair', '200142', '黄金組合', '', 'Golden Pair', 'vita', 2, 3, 1,
      '我方有兩張以上同名的隨從時，第一組同名的隨從 攻 +3 / 體 +3。',
      ''),
    spell('fault', '200143', '失誤', '', 'Fault', 'vita', 2, 3, 3,
      '我方有兩張以上卡名含「網球部」的隨從時，對手角色生命 −3。',
      ''),
    spell('infighting', '200144', '內部分裂', '', 'Infighting', 'vita', 4, 3, 3,
      '我方有隨從時，與第一張隨從同陣營的我方隨從全部送入墓地。有送的話，與敵方第一張隨從同陣營的敵方隨從（第一張除外）也全部送入墓地。此卡從遊戲中除外。',
      ''),
    spell('minds_in_conflict', '200145', '不贊成', '', 'Minds in Conflict', 'vita', 3, 2, 13,
      '我方第一張有能力的隨從與敵方第一張有能力的隨從，交換 SIZE、攻、防、體與能力。',
      ''),
    spell('secret_art_wind_slash', '200146', '秘奧義疾風一閃', '', 'Secret Art: Wind Slash', 'vita', 3, 1, 50,
      '敵方所有卡進入行動終了，並且體力減少「進入行動終了的卡片數的一半」（捨去）。自己角色卡名含「西塔」時，敵方所有隨從防禦力再減少「進入行動終了的卡片數」。',
      ''),

    /* ── 私立學校 · 隨從 ── */
    foll('crimson_witch_cinia', '300218', '緋紅魔女、希妮亞', '', 'Crimson Witch Cinia', 'academy', 3, 6, 1, 9, 1, 33,
      '攻擊前，防禦隨從體力減少「1 ＋ 手牌中「私立」卡片數」，此卡體力上升同樣的數值。',
      ''),

    /* ── 私立學校 · 咒語 ── */
    spell('home_study', '200147', '家庭學習', '', 'Home Study', 'academy', 1, 3, 1,
      '手牌所有隨從 攻/體 上升「1 ＋ 手牌與墓地中同名卡片數」。',
      ''),
    spell('maid_experience', '200148', '女僕體驗', '', 'Maid Experience', 'academy', 3, 3, 1,
      '手牌與墓地中所有「家庭學習」從遊戲中除外。敵方隨機兩張隨從，體力減少「除外張數的兩倍」。',
      ''),
    spell('defeat', '200149', '挫敗', '', 'Defeat', 'academy', 2, 3, 1,
      '我方隨機一張「私立」隨從，防禦力上升「敵方有能力的隨從數」（最多 3）。',
      ''),
    spell('meeting_master', '200150', '集會主持', '', 'Meeting Master', 'academy', 2, 3, 3,
      '我方第一張卡名含「女僕」的隨從進入行動終了。我方第一張卡名含「淑女」的隨從 攻/體 上升該隨從的 SIZE。',
      ''),
    spell('comfort', '200151', '慰藉', '', 'Comfort', 'academy', 2, 3, 3,
      '我方第一張隨從進入行動終了。有生效的話，自己角色生命 +3。',
      ''),
    spell('curse_of_mistrust', '200152', '猜疑的詛咒', '', 'Curse of Mistrust', 'academy', 2, 2, 13,
      '我方第一張隨從放到對手牌組下方。有放的話，敵方 SIZE 最高且與該隨從不同陣營的第一張隨從，放到我方牌組下方。',
      ''),
    spell('el_mundo', '200153', '艾爾・蒙多', '', 'El Mundo', 'academy', 1, 1, 50,
      '自己角色是「私立」所屬時，敵方隨機一張隨從體力減少「8 − 此卡 SIZE」。此卡 SIZE 小於 3 時，SIZE +1 並回到手牌；SIZE 3 以上時從遊戲中除外。',
      ''),

    /* ── 南十字 · 隨從 ── */
    foll('crux_nemesis_luthica', '300226', '南十字宿敵、露西卡', '', 'Crux Nemesis Luthica', 'crux', 3, 4, 2, 9, 1, 33,
      '攻擊前，此卡 攻/體 上升手牌的隨從數。手牌第一張隨從放到牌組最上方。',
      ''),

    /* ── 南十字 · 咒語 ── */
    spell('unity_march', '200154', '團結行進', '', 'Unity March', 'crux', 2, 3, 1,
      '我方有三張「南十字」隨從時，我方第一張兩側都有隨從的隨從，體力 +6。',
      ''),
    spell('a_single_flower', '200155', '一朵花', '', 'A Single Flower', 'crux', 1, 3, 1,
      '雙方手牌全部放回各自牌組下方。自己角色生命上升「我方放回張數 − 對手放回張數」。',
      ''),
    spell('protective_chant', '200156', '守護詠唱', '', 'Protective Chant', 'crux', 2, 3, 1,
      '我方 SIZE 等於「我方隨從數」的隨從，攻 +3 / 體 +3。',
      ''),
    spell('blossoming_skill', '200157', '綻放的才能', '', 'Blossoming Skill', 'crux', 2, 3, 3,
      '我方隨機一張隨從，攻擊力上升「對手生命高出我方生命的差」（最多 9）。',
      ''),
    spell('degradation', '200158', '退化', '', 'Degradation', 'crux', 3, 3, 3,
      '我方前兩張沒有能力的隨從，攻 +3 / 體 +3。',
      ''),
    spell('pilgrimage_of_proof', '200159', '證明的巡禮', '', 'Pilgrimage Of Proof', 'crux', 2, 2, 13,
      '我方有隨從時，敵方隨機兩張隨從防禦力減少「4 − 此卡 SIZE」。接著此卡 SIZE 為 1 時從遊戲中除外；SIZE 2 以上時 SIZE −1 並進入行動終了。',
      ''),

    /* ── 暗黑族 · 隨從 ── */
    foll('crescrent_aligote', '300228', '克雷森特的阿里哥蝶', '', 'Crescrent Aligote', 'darklore', 2, 4, 2, 5, 3, 1,
      '防禦前，此卡與自己角色同陣營時，對手角色生命 −1。失去這個能力。',
      ''),
    foll('gs_agent', '300230', 'GS特務', '', 'GS Agent', 'darklore', 3, 5, 2, 7, 3, 5,
      '防禦前，牌組第一張卡名含「GS」的卡放到我方第一個空格。失去這個能力。',
      ''),
    foll('crescent_elder_chenin', '300232', '克雷森特長老、白詩南', '', 'Crescent Elder Chenin', 'darklore', 3, 3, 1, 11, 3, 7,
      '回合開始時，自己角色是「暗黑」所屬時，把手牌第一張卡名含「克雷森特」的卡與第一張不含「克雷森特」的暗黑卡放到牌組下方。有放的話，敵方隨機一張隨從放到對手牌組下方，然後失去這個能力。',
      ''),
    foll('vampire_hunter_iri', '300234', '吸血鬼獵人、艾莉', '', 'Vampire Hunter Iri', 'darklore', 3, 6, 2, 7, 1, 33,
      '攻擊前，此卡 攻/體 上升「2 ＋ 此卡與防禦隨從的 SIZE 差」。此卡失去這個能力直到下一回合開始。',
      ''),
    foll('luna_flina', '300241', '露娜‧菲莉娜', '', 'Luna Flina', 'darklore', 2, 4, 2, 6, 1, 33,
      '攻擊前，我方有兩張以上「暗黑」卡時，防禦隨從 攻 −1 / 防 −2 / 體 −1。',
      ''),

    /* ── 暗黑族 · 咒語 ── */
    spell('doctor_play', '200161', '醫生扮演', '', 'Doctor Play', 'darklore', 2, 3, 1,
      '我方有隨從時，敵方第一張隨從體力減少「雙方牌組張數差的個位數」。',
      ''),
    spell('tick_time', '200162', '滴答時刻', '', 'Tick Time', 'darklore', 2, 3, 1,
      '我方隨機兩張隨從 攻/體 上升「回合數個位數的一半」（捨去）。',
      ''),
    spell('maximum_drive', '200163', '極限驅動', '', 'Maximum Drive', 'darklore', 3, 3, 1,
      '我方第一張隨從送入墓地。敵方格號等於該隨從 SIZE 的卡送入墓地。',
      ''),
    spell('intrusion', '200164', '侵入', '', 'Intrusion', 'darklore', 2, 3, 3,
      '我方隨機兩張隨從體力 +3。有生效的話，從對手牌組補牌到對手手牌滿為止。',
      ''),
    spell('absolute_power', '200165', '絕對力量', '', 'Absolute Power', 'darklore', 2, 1, 3,
      '依對手手牌第一張卡的類型，我方所有隨從套用效果。●咒語：防 −1 / 體 +5　●隨從：攻 +3 / 防 −1。',
      ''),
    spell('misfit', '200166', '格格不入', '', 'Misfit', 'darklore', 2, 2, 13,
      '敵方 攻＋體 合計 22 以上的隨從，攻/體 變成「我方場上 SIZE 總和」。自己角色是「暗黑」所屬時，改為變成「我方場上 SIZE 總和的一半」（捨去）。',
      ''),
    spell('lago_de_cisnes', '200167', '天鵝湖', '', 'Lago de Cisnes', 'darklore', 2, 1, 50,
      '敵方 攻＋體 合計最高的隨從，攻/體 減半（進位）。自己角色卡名含「艾莉」時，那些隨從再 攻 −2 / 防 −2 / 體 −2。',
      ''),

    /* ── 無所屬 · 隨從 ── */
    foll('game_starter', '300236', '遊戲起始者', '', 'Game Starter', 'neutral', 1, 5, 1, 5, 1, 1,
      '',
      ''),
    foll('coin_girl', '300242', '硬幣少女', '', 'Coin Girl', 'neutral', 2, 10, 3, 2, 1, 1,
      '',
      ''),
    foll('coin_lady', '300276', '硬幣淑女', '', 'Coin Lady', 'neutral', 3, 5, 0, 7, 1, 1,
      '攻擊前，此卡防禦 = 0，攻/體 上升「與防禦隨從的防禦力差」（最多 9）。\n防禦前，攻擊隨從失去技能。有生效時此卡 攻/防/體 +1。',
      ''),

    /* ── 無所屬 · 角色 ── */
    chara('newbie_guide_rico', '100089', '新手嚮導、莉可', 'Newbie Guide Rico', 'neutral', 33, 1, 10,
      '',
      ''),
  ];

  /* 這些卡的名字是自譯（繁中 wiki 沒有收錄） */
  var TL = ["tennis_nessa", "lib_evenne", "lib_milka_ep5", "lib_hl_tezina", "waitress_gart", "battlefield_sita", "council_dispatch_layna", "crimson_witch_cinia", "home_study", "maid_experience", "defeat", "meeting_master", "comfort", "curse_of_mistrust", "el_mundo", "crux_nemesis_luthica", "unity_march", "a_single_flower", "protective_chant", "blossoming_skill", "degradation", "pilgrimage_of_proof", "crescrent_aligote", "gs_agent", "crescent_elder_chenin", "vampire_hunter_iri", "luna_flina", "doctor_play", "tick_time", "maximum_drive", "intrusion", "absolute_power", "misfit", "lago_de_cisnes", "game_starter", "coin_girl", "coin_lady", "newbie_guide_rico"];
  LIST.forEach(function (c) { if (TL.indexOf(c.slug) >= 0) c.tl = true; });

  LIST.forEach(function (c) { SG.CARDS[c.slug] = c; });
})();
