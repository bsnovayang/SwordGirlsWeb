/* ═══════════════════════════════════════════════════════════
   Episode 1 卡片

   ★ 只收錄「繁中 wiki 資料完整」的部分：
       咒語 20 張（四陣營各 5）＋ 角色卡 1 張
     EP1 的**隨從**沒有收錄 —— 繁中 wiki 那幾頁的攻/防/體是空模板
     （`攻/防/體://` 沒填數字），46 張裡有 36 張缺數值，
     硬加等於自己編數據，所以留到有可靠來源再補。

   ★ 兩處標記：
     · id 已換成原作真實卡號（來自英文 Sword Girls Wiki，見 tools/README.md）
     · provRecipe ＝ 合成配方是依「分數階層」推導的。原作 EP1 以後的配方
       會用到眼鏡／絲襪／聖獸之淚等素材，那些來自本作還沒做的副本，
       所以改用現有素材依稀有度換算。詳見 materials.js
   ═══════════════════════════════════════════════════════════ */
var SG = window.SG || (window.SG = {});

(function () {
  'use strict';

  function spell(slug, id, name, jp, en, faction, size, limit, points, effect, flavor) {
    return {
      slug: slug, id: id, name: name, jp: jp, en: en, type: 'spell', faction: faction,
      size: size, limit: limit, points: points, ep: 1, provRecipe: true,
      rarity: points >= 50 ? 'Double Rare' : points >= 13 ? 'Rare'
            : points >= 3 ? 'Uncommon' : 'Common',
      effect: effect, flavor: flavor || ''
    };
  }

  function foll(slug, id, name, jp, en, faction, size, atk, def, sta, limit, points, effect) {
    return {
      slug: slug, id: id, name: name, jp: jp, en: en, type: 'follower', faction: faction,
      size: size, atk: atk, def: def, sta: sta, limit: limit, points: points,
      ep: 1, provRecipe: true,
      rarity: points >= 50 ? 'Double Rare' : points >= 13 ? 'Rare'
            : points >= 3 ? 'Uncommon' : 'Common',
      effect: effect || '', flavor: ''
    };
  }

  var LIST = [
    /* ── 公立學校 ── */
    spell('shrink', '200006', '縮小', 'シュリンク', 'Shrink', 'vita', 2, 2, 13,
      '對手場上 SIZE 最大的隨從，SIZE 與 攻/防/體 變成一半（無條件捨去）。'),
    spell('equilibrium', '200007', '均衡', '均衡', 'Balance', 'vita', 2, 1, 50,
      '自己與對手的生命差在 25 以下時，雙方生命平分，並把場上的卡片數量變成一致。\n' +
      '自己角色是「公立」所屬時，把手牌所有隨從送墓；不是時，手牌全部送墓。'),
    spell('rumor_of_order', '200008', '命令的謠言', '命令の噂', 'Rumored Order', 'vita', 2, 3, 1,
      '自己場上「公立」所屬、SIZE 最大的隨從，體力 +2、SIZE −2（不會變成 0 以下）。'),
    spell('omnivore', '200009', '雜食性', '雑食性', 'Omnivore', 'vita', 2, 3, 1,
      '自己場上隨機兩張隨從，體力上升「手牌的 SIZE 種類 +1」。'),
    spell('volcano', '200010', '火山', 'ボルカーノ', 'Volcano', 'vita', 2, 3, 3,
      '對手場上隨機一張隨從的 攻/防/體，下降「自己手牌中『公立』所屬的隨從數」。'),

    /* ── 私立學校 ── */
    spell('bind', '200016', '束縛', '束縛', 'Bondage', 'academy', 2, 3, 1,
      '對手場上隨機三名隨從 SIZE +1。'),
    spell('curse', '200017', '詛咒', '呪い', 'Curse', 'academy', 2, 3, 3,
      '當自己角色所屬「私立」時，對手場上隨機兩名隨從 攻 −2 / 體 −2。'),
    spell('swap_magic', '200018', '交換魔術', '交代魔術', 'Swap Spell', 'academy', 3, 3, 1,
      '對手場上第一位隨從與自己場上第 Ⅲ 格的隨從，所有數值交換。'),
    spell('mass_recall', '200019', '大規模召回', 'マス・リコール', 'Mass Recall', 'academy', 3, 1, 50,
      '對手場上 SIZE 3 以下的隨從，與自己場上不屬於「私立」的卡片，全部送進墓地。'),
    spell('forced_entry', '200020', '強制入侵', '強制侵入', 'Forced Entry', 'academy', 2, 2, 13,
      '自己場上第 Ⅲ 格與對手第 Ⅲ 格的卡片比較 SIZE，較低的那方直接破壞。\n' +
      'SIZE 相同時，破壞對手第 Ⅲ 格的卡片。'),

    /* ── 南十字 ── */
    spell('meadow_holiday', '200026', '草原上的休息日', '草原の休日', 'Meadow Leisure', 'crux', 2, 3, 3,
      '自己場上隨機 1 張隨從 攻 +X−1 / 體 +X+1（X ＝ 自己場上的隨從數）。'),
    spell('knight_letter', '200027', '騎士團的手信', '騎士団の手紙', "Knight's Letter", 'crux', 2, 2, 13,
      '自己場上與對手場上的卡片數一致時，對手場上隨機 2 張卡放到牌組下方。'),
    spell('shield_break', '200028', '盾牌破壞', 'シールド破壊', 'Shield Break', 'crux', 2, 3, 1,
      '對方場上防禦最高的卡，防禦力減少「自己場上最高防禦力的兩倍」。'),
    spell('guard_testimony', '200029', '衛兵的證言', '衛兵の証言', "Sentry's Testimony", 'crux', 3, 3, 1,
      '自己場上隨機一張「南十字」隨從，攻/體 上升「自己墓地中冠有『騎士團』之名的卡片數」，\n' +
      '之後自己墓地所有卡片除外。'),
    spell('peace_treaty', '200030', '和平協定', '平和協定', 'Pacifism', 'crux', 2, 1, 50,
      '場上所有卡片變成行動終了狀態（自己的咒語卡除外），\n' +
      '自己場上所有「南十字」隨從 體 +2 / SIZE −1。'),

    /* ── 暗黑族 ── */
    spell('full_moon_power', '200036', '滿月之力', '満月の力', 'Full Moon Power', 'darklore', 2, 3, 1,
      '自己場上所有冠有「克雷森特」「斯卡迪魯」「菲莉娜」之名的隨從，攻擊力 +3。'),
    spell('blood_relay', '200037', '血的傳達', '血の伝達', 'Pass the Blood', 'darklore', 2, 3, 1,
      '自己場上第 Ⅲ 格「暗黑」隨從 攻/體 +X（X ＝ 場上所有隨從防禦力的總和，最大 5）。'),
    spell('overwhelm', '200038', '壓倒', '圧倒', 'Overwhelm', 'darklore', 2, 3, 3,
      '對方場上「防+體 合計」比對方角色生命還高的隨從，防禦力 −「對方生命的一半」（捨去）。'),
    spell('forced_confinement', '200039', '強制幽閉', '強制幽閉', 'Forced Confinement', 'darklore', 3, 2, 13,
      '若自己的角色為「暗黑」所屬，將對方場上體力最高的隨從送到對方牌組最下方。\n' +
      '自己角色的生命減少該隨從 SIZE 的一半（進位）。'),
    spell('evil_eye', '200040', '魔眼', '魔眼', 'Evil Eye', 'darklore', 2, 1, 50,
      '若自己的角色為「暗黑」所屬，對方場上所有隨從 攻/防/體 −2；不是時只有 攻/防 −2。\n' +
      '若對方場上隨從數量在 2 張以下，追加 攻/防 −1。'),


    /* ═══ 隨從 40 張 ═══ */
/* ── 公立學校 ── */
    foll('latecomer', '300009', '遲到學生', '遅刻生', 'Latecomer', 'vita', 1, 3, 2, 5, 3, 1,
      ''),
    foll('prefect_layna', '300014', '風紀部長的蕾娜．賽特莉芭', '風紀部長のレイナ・セントリバー', 'Prefect Layna', 'vita', 1, 4, 2, 5, 1, 33,
      '防禦前，此卡體力 +X（X ＝ 手牌數量 +1）。'),
    foll('basketball_player', '300010', '籃球部員', 'バスケ部員', 'Basketball Player', 'vita', 2, 4, 0, 9, 3, 1,
      ''),
    foll('lib_lucca', '300015', '圖書部的魯卡', '図書部のルカ', 'Lib. Lucca', 'vita', 2, 5, 2, 6, 3, 5,
      ''),
    foll('kouhai', '300011', '下級生', '下級生', 'Kouhai', 'vita', 3, 4, 1, 10, 3, 1,
      ''),
    foll('lib_serie', '300016', '圖書部的賽莉耶', '図書部のセリエ', 'Lib. Serie', 'vita', 3, 4, 0, 11, 3, 7,
      '攻擊前，此卡攻擊 +X（X ＝ 手牌「圖書部」名的卡片數量）。'),
    foll('lib_vernika', '300018', '圖書部的維若妮卡', '図書部のヴェルニカ', 'Lib. Vernika', 'vita', 3, 4, 2, 8, 3, 7,
      '防禦前，此卡體力 +2。'),
    foll('2s_assistant_asmis', '300012', 'SS助手、阿斯米斯', 'SSの助手、アスミス', '2S Assistant Asmis', 'vita', 4, 5, 2, 10, 3, 3,
      '攻擊前，此卡攻擊 +1。'),
    foll('lib_lindt', '300017', '圖書部的凜特', '図書部のリント', 'Lib. Lindt', 'vita', 4, 6, 0, 13, 3, 5,
      ''),
    foll('rainy_girl', '300013', '雨天女孩', 'レイニーガール', 'Rainy Girl', 'vita', 5, 4, 2, 15, 3, 1,
      ''),

    /* ── 私立學校 ── */
    foll('burning_guardian', '300027', '燃燒守護者', 'バーニングガーディアン', 'Burning Guardian', 'academy', 1, 5, 0, 5, 3, 1,
      ''),
    foll('relena', '300032', '莉莉娜', 'リリナ', 'Relena', 'academy', 1, 3, 0, 9, 3, 5,
      ''),
    foll('ward_closer', '300028', '結界師', '結界師', 'Ward Closer', 'academy', 2, 4, 0, 9, 3, 1,
      ''),
    foll('private_maid', '300033', '私人女僕', 'プライベートメイド', 'Private Maid', 'academy', 2, 3, 2, 7, 3, 7,
      '回合開始時，對手場上隨機一個隨從攻擊力 −1。'),
    foll('aristocrat_girl', '300029', '貴族少女', '貴族令嬢', 'Aristocrat Girl', 'academy', 3, 4, 2, 8, 3, 3,
      '攻擊前，防禦隨從的防禦力在2以上時，防禦隨從的體力 −3。'),
    foll('senpai_maid', '300034', '前輩女僕', '先輩メイド', 'Senpai Maid', 'academy', 3, 5, 1, 10, 1, 33,
      '防禦前，此隨從的攻擊 +1、體力 +2。'),
    foll('inscribing_magician', '300030', '刻印的魔術師', '刻印の魔術師', 'Inscribing Magician', 'academy', 4, 5, 2, 11, 3, 1,
      ''),
    foll('striker', '300035', '前鋒', 'ストライカー', 'Striker', 'academy', 4, 7, 1, 8, 3, 7,
      '攻擊前，防禦隨從的體力 −1。'),
    foll('apprentice', '300031', '魔術學徒', 'アプレンティス', 'Apprentice', 'academy', 5, 5, 0, 17, 3, 1,
      ''),
    foll('inspiration_lady', '300036', '啟示淑女', 'インスプレーションレティー', 'Inspiration Lady', 'academy', 5, 7, 0, 15, 3, 5,
      ''),

    /* ── 南十字 ── */
    foll('saint_sword_girl', '300045', '聖徒劍士', '聖徒剣士', 'Saint Sword Girl', 'crux', 1, 4, 1, 5, 3, 1,
      ''),
    foll('seeker_sienfield', '300050', '神聖研究會的辛菲爾德', '神聖研究会のシエンフィールド', 'Seeker Sienfield', 'crux', 1, 4, 1, 6, 3, 5,
      ''),
    foll('messenger_knight', '300046', '騎士團的傳令', '騎士团の伝令', 'Messenger Knight', 'crux', 2, 6, 0, 6, 3, 1,
      ''),
    foll('seeker_amethystar', '300051', '神聖研究會的阿米迪斯塔', '神聖研究会のアメティスタ', 'Seeker Amethystar', 'crux', 2, 6, 0, 4, 3, 7,
      '防禦前，回合數是奇數時此卡體力 +3。'),
    foll('priestess', '300047', '女祭司', 'プリスティス', 'Priestess', 'crux', 3, 4, 0, 11, 3, 3,
      '防禦前，自己角色生命 +1。'),
    foll('seeker_lydia', '300052', '神聖研究會的莉迪亞', '神聖研究会のリディア', 'Seeker Lydia', 'crux', 3, 4, 1, 11, 1, 33,
      '攻擊前，自己場上存在「南十字」所屬的卡片2張以上時，防禦隨從的攻 −1/防 −2/體 −1。'),
    foll('seminarian', '300048', '神學生徒', '神学生徒', 'Seminarian', 'crux', 4, 6, 0, 12, 3, 1,
      ''),
    foll('acolyte', '300053', '光的迴響', 'アコライト', 'Acolyte', 'crux', 4, 5, 3, 6, 3, 7,
      '回合開始時，回合數是偶數時全部的南十字所屬的隨從攻/體 +2。'),
    foll('apprentice_nun', '300049', '見習修女', '見習いシスター', 'Apprentice Nun', 'crux', 5, 6, 1, 14, 3, 1,
      ''),
    foll('crux_faithful', '300054', '南十字的信徒', 'クルックスの信徒', 'Crux Faithful', 'crux', 5, 6, 1, 15, 3, 5,
      ''),

    /* ── 暗黑族 ── */
    foll('scardel_merlot', '300063', '斯卡迪魯的梅洛', 'スカデルのメルロ', 'Scardel Merlot', 'darklore', 1, 2, 1, 8, 3, 1,
      ''),
    foll('crescent_deviation', '300068', '克雷森特的蒂米薰', 'クレセントのデビエーション', 'Crescent Deviation', 'darklore', 1, 3, 0, 9, 3, 5,
      ''),
    foll('scardel_carmenere', '300064', '斯卡迪魯的珈美娜', 'スカデルのカルメネル', 'Scardel Carmenere', 'darklore', 2, 4, 0, 9, 3, 1,
      ''),
    foll('vampire_cultist', '300069', '吸血鬼的崇拜者', 'バンパイアの崇拝者', 'Vampire Cultist', 'darklore', 2, 4, 0, 9, 3, 1,
      ''),
    foll('scardel_shiraz', '300065', '斯卡迪魯的雪拉茲', 'スカデルのシラズ', 'Scardel Shiraz', 'darklore', 3, 3, 1, 10, 3, 3,
      '回合開始時，若自己場上存在2張以上的「暗黑」所屬隨從，對方場上隨機1張隨從體力 −2。'),
    foll('red_moon_aka_flina', '300070', '紅月、亞卡‧菲莉娜', 'レッドムーン、アカ・フリナ', 'Red Moon Aka Flina', 'darklore', 3, 4, 0, 9, 3, 7,
      '攻擊前，此卡的防禦力=0。攻/體+此卡與防禦隨從的防禦力差距（最大9）。'),
    foll('crescent_woodbridge', '300066', '克雷森特的伍德布里奇', 'クレセントのウッドブリッジ', 'Crescent Woodbridge', 'darklore', 4, 5, 1, 13, 3, 5,
      ''),
    foll('blue_moon_becky_flina', '300071', '藍月、佩琪‧菲莉娜', 'ブルームーン、ベッキー・フリナ', 'Blue Moon Becky Flina', 'darklore', 4, 4, 1, 14, 3, 7,
      '回合開始時，此卡攻/體 +1。除此卡外，自己場上隨機1張隨從攻/體 +1。'),
    foll('master_luna_flina', '300067', '滿月的當主、露娜‧菲莉娜', '満月の当主、ルナ・フリナ', 'Master Luna Flina', 'darklore', 5, 7, 0, 14, 1, 33,
      '防禦前，防禦力=自己場上「暗黑」所屬隨從的數量，體力+此隨從變化後的防禦力。'),
    foll('zombie', '300072', '殭屍', 'ゾンビ', 'Zombie', 'darklore', 5, 6, 1, 14, 3, 1,
      ''),
    /* ── 角色卡 ──
       ※ 繁中 wiki 的角色卡頁沒有標 LIFE，Episode 0 的四位都是 30，這裡沿用。 */
    {
      slug: 'curious_vernika', id: '100007',
      name: '好奇心少女維若妮卡', jp: '好奇心少女ヴェルニカ', en: 'Curious Vernika',
      type: 'character', faction: 'vita', life: 30, points: 20, limit: 1,
      ep: 1, provRecipe: true, rarity: 'Rare',
      effect: '回合開始時，對方場上防禦最高的隨從，防禦力 = 0。',
      flavor: '［黃昏之狼？西塔要去狩獵嗎？也帶我去吧！］'
    }
  ];

  LIST.forEach(function (c) { SG.CARDS[c.slug] = c; });
})();
