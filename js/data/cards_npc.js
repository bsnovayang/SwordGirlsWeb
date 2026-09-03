/* ═══════════════════════════════════════════════════════════
   副本用的 NPC 角色卡 ＋ 通關 10 次可獲得的獎勵角色卡

   資料來源：
     · BOSS 的繁中名稱／LIFE／能力／牌組組成 → SwordGirls@wiki 頁面 37
     · 獎勵角色卡的繁中名稱與效果            → 同 wiki 頁面 172
     · 一般樓層 NPC 的 LIFE                  → 英文 wiki Episode 0 全卡表
   ※ 一般樓層 NPC 的中文名在繁中 wiki 沒有收錄，是我依英文名暫譯（tl: true）。
   ═══════════════════════════════════════════════════════════ */
var SG = window.SG || (window.SG = {});

(function () {
  'use strict';

  function npc(slug, id, name, en, faction, life, opts) {
    var c = {
      slug: slug, id: id, name: name, en: en, type: 'character',
      faction: faction, life: life, points: 0, limit: 1,
      npc: true, effect: (opts && opts.effect) || ''
    };
    if (opts && opts.tl) c.tl = true;            // 名稱為暫譯
    return c;
  }

  var LIST = [
    /* ── 一般樓層的 NPC（名稱暫譯） ── */
    npc('npc_enchantress',    '110004', '魅惑魔女',     'Enchantress',     'neutral', 15, { tl: true }),
    npc('npc_myo_observer',   '110006', '妙族觀測者',   'Myo Observer',    'neutral', 15, { tl: true }),
    npc('npc_bunny_lady',     '110001', '兔女郎',       'Bunny Lady',      'neutral', 20, { tl: true }),
    npc('npc_wind_shear',     '110002', '裂風者',       'Wind Shear',      'neutral', 20, { tl: true }),
    npc('npc_wind_breaker',   '110009', '破風者',       'Wind Breaker',    'neutral', 20, { tl: true }),
    npc('npc_wind_sneaker',   '110010', '潛風者',       'Wind Sneaker',    'neutral', 20, { tl: true }),
    npc('npc_wind_forestier', '110011', '森風者',       'Wind Forestier',  'neutral', 30, { tl: true }),
    npc('npc_winged_seeker',  '110003', '有翼探求者',   'Winged Seeker',   'neutral', 20, { tl: true }),
    npc('npc_bunny_lady_x',   '110007', '兔女郎 X',     'Bunny Lady X',    'neutral', 30, { tl: true }),
    npc('npc_wind_shear_x',   '110008', '裂風者 X',     'Wind Shear X',    'neutral', 30, { tl: true }),
    npc('npc_wind_breaker_x', '110015', '破風者 X',     'Wind Breaker X',  'neutral', 30, { tl: true }),
    npc('npc_wind_sneaker_x', '110016', '潛風者 X',     'Wind Sneaker X',  'neutral', 30, { tl: true }),
    npc('npc_wind_forest_x',  '110017', '森風者 X',     'Wind Forestier X','neutral', 30, { tl: true }),
    npc('npc_enchantress_x',  '110012', '魅惑魔女 X',   'Enchantress X',   'neutral', 30, { tl: true }),
    npc('npc_myo_observer_x', '110014', '妙族觀測者 X', 'Myo Observer X',  'neutral', 30, { tl: true }),
    npc('npc_trickster_x',    '110013', '詐術師 X',     'Trickster X',     'neutral', 30, { tl: true }),
    npc('npc_mirror_sita',    '110018', '鏡中的西塔',   'Mirror Sita',     'vita',     25, { tl: true }),
    npc('npc_mirror_cinia',   '110019', '鏡中的希妮亞', 'Mirror Cinia',    'academy',  25, { tl: true }),
    npc('npc_mirror_luthica', '110020', '鏡中的露西卡', 'Mirror Luthica',  'crux',     25, { tl: true }),
    npc('npc_mirror_iri',     '110021', '鏡中的艾莉',   'Mirror Iri',      'darklore', 25, { tl: true }),

    /* ── 三座 Easy 副本的 BOSS（繁中 wiki 原文） ── */
    npc('boss_nold', '120001', '金色的獅子、諾爾德', 'Nold, The Gold Lion', 'academy', 40, {
      effect: '回合開始時，自己場上全部隨從 SIZE -1。'
    }),
    npc('boss_cannelle', '120002', '美旋風的妖精、卡涅魯', 'Queen Cannelle', 'crux', 50, {
      effect: '回合開始時，自己場上 SIZE 3 以下的隨從 攻/體 +2。'
    }),
    npc('boss_gart', '120003', '星見鳥、蓋托', 'Star Bird Gart', 'vita', 50, {
      effect: '回合開始時，對手場上隨機選一張隨從變成行動終了狀態。'
    })
  ];

  /* ── 通關 10 次可獲得的獎勵角色卡（可自己拿來組牌） ── */
  var REWARDS = [
    { slug: 'nold', id: '100005', name: '諾爾德', en: 'Nold',
      type: 'character', faction: 'academy', life: 30, points: 25, limit: 1,
      rarity: 'Uncommon', reward: true,
      effect: '回合開始時，自己手牌隨機一張卡 SIZE +1；自己場上隨機一張 SIZE 2 以上的卡 SIZE -1。' },
    { slug: 'cannelle', id: '100006', name: '卡涅魯', en: 'Cannelle',
      type: 'character', faction: 'neutral', life: 30, points: 25, limit: 1,
      rarity: 'Uncommon', reward: true,
      effect: '回合開始時，自己 SIZE 最小的卡，攻/體上升「與對方 SIZE 最大的卡的 SIZE 差」。' },
    { slug: 'gart', id: '100007', name: '蓋托', en: 'Gart',
      type: 'character', faction: 'vita', life: 30, points: 25, limit: 1,
      rarity: 'Uncommon', reward: true,
      effect: '回合開始時，對手場上一張與此卡所屬不同的隨從 攻/體 -2；沒有的話，對手場上隨機兩張隨從 攻/體 -1。' }
  ];

  LIST.concat(REWARDS).forEach(function (c) { SG.CARDS[c.slug] = c; });
})();
