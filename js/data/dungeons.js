/* ═══════════════════════════════════════════════════════════
   副本（Easy 三座）

   資料來源：
     · 樓層數與各樓敵人 → 英文 wiki 存檔的 Beginner / Intermediate / Advanced Dungeon
     · BOSS 的 LIFE / 能力 / 牌組組成 → 繁中 wiki 頁面 37
     · 每場掉落規則、通關 10 次給角色卡 → 英文 wiki 各副本頁 ＋ 繁中 wiki 頁面 66

   規則（原作）：
     · 每贏一場往上一層、輸了往下一層
     · 輸給 BOSS 直接退回第 1 層
     · 打贏 BOSS ＝ 通關一次，樓層回到第 1 層，通關次數 +1
     · 通關滿 10 次可獲得該 BOSS 的角色卡

   ※ 一般樓層 NPC 的牌組原作沒有公開，這裡用「該敵人所屬陣營的新手牌組」代替，
     只有角色卡（名稱／LIFE／能力）是原作資料。BOSS 牌組則盡量照 wiki 的組成，
     Episode 0 沒有的卡以同 SIZE 同陣營的卡替代（見各 deck 註解）。
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

  /* 一般樓層敵人用的牌組＝對應陣營的新手牌組 */
  function starterCards(faction) {
    for (var i = 0; i < SG.DECKS.length; i++) {
      if (SG.DECKS[i].faction === faction) return SG.DECKS[i].cards.slice();
    }
    return SG.DECKS[0].cards.slice();
  }

  /* 敵人：character ＝ NPC 角色卡，deck ＝ 牌組陣營 */
  function foe(character, faction) {
    return { character: character, faction: faction };
  }

  /* ── BOSS 牌組（照繁中 wiki 頁面 37 的組成，缺的卡以同 SIZE 同陣營替代） ── */

  // 諾爾德：隨從 19 ＋ 咒語 11（繁中 wiki 頁面 37）。
  // 咒語部分現在能完全照原作：戒備3 / 詛咒3 / 強制入侵2 / 新人女僕教育3。
  // 隨從的「貴族令嬢」是 EP1 卡，本作還沒收錄，以 新人女僕 補足。
  var NOLD_DECK = build(
    n('guard_maid', 3), n('tailor_maid', 3), n('porter_maid', 3), n('chief_maid', 3),
    n('mop_maid', 2), n('head_maid', 3), n('new_maid', 2),
    n('tighten_security', 3), n('curse', 3), n('forced_entry', 2), n('new_maid_training', 3)
  );

  // 卡涅魯：隨從 17 ＋ 咒語 13（繁中 wiki 頁面 37）。
  // 咒語現在幾乎完全照原作：魔眼1 / 雜食性2 / 草原上的休息日3 / 和平協定1 /
  // 盾牌破壞2 / 聖徒的祝福1 / 異種生物接觸3。
  // 隨從的「騎士団の伝令」是 EP1 卡，以 副官颯琳森 補足。
  var CANNELLE_DECK = build(
    n('new_knight', 3), n('military_knight_sillit', 3), n('crux_knight_terra', 3),
    n('flag_knight_frett', 3), n('crux_knight_pintail', 2), n('knight_adjt_sarisen', 3),
    n('evil_eye', 1), n('omnivore', 2), n('meadow_holiday', 3), n('peace_treaty', 1),
    n('shield_break', 2), n('saints_blessing', 1), n('close_encounter', 3)
  );

  // 蓋托：隨從 16 ＋ 咒語 14（繁中 wiki 頁面 37）。
  // 咒語現在完全照原作：交換魔術2 / 雜食性3 / 拒絕入國2 / 禍從天降2 /
  // 歡迎!!新入社員3 / 料理失敗2。原作牌組本來就混了南十字的咒語，這裡照樣保留。
  var GART_DECK = build(
    n('cook_club_advisor', 3), n('new_cook_club_student', 3), n('cook_club_linfield', 2),
    n('cook_club_katie', 2), n('cook_club_svia', 3), n('cook_club_dir_jamie', 2),
    n('cook_club_sylphie', 1),
    n('swap_magic', 2), n('omnivore', 3), n('entry_denied', 2), n('sky_surprise', 2),
    n('student_orientation', 3), n('cooking_failure', 2)
  );

  // 佩妮卡：隨從 15 ＋ 咒語 14（繁中 wiki 頁面 37）。原作牌組幾乎都是 EP2 以後的卡，
  // 本作還沒收錄，以同陣營同 SIZE 的私立卡與已有的咒語替代。只有 BOSS 的
  // 名稱／LIFE／能力是原作資料。
  var PANICA_DECK = build(
    n('gardening_maid', 3), n('new_maid', 3), n('guard_maid', 3), n('tailor_maid', 3),
    n('chief_maid', 3), n('porter_maid', 2),
    n('curse', 3), n('bind', 3), n('accident', 3), n('she_did_it', 2),
    n('new_maid_training', 2)
  );

  // 辛西亞：隨從 18 ＋ 咒語 12（繁中 wiki 頁面 37）。咒語部分能照原作：
  // 和平協定1 / 盾牌破壞2 / 雜食性3 / 草原上的休息日3 / 縮小2 / 犧牲1。
  // 隨從全是 EP2 以後的卡，以暗黑族現有隨從替代。
  var GINGER_DECK = build(
    n('crescent_kris_flina', 3), n('scardel_pinot_noir', 3), n('moondancer_kata_flina', 3),
    n('scardel_rion_flina', 3), n('crescent_nyetimber', 3), n('scardel_sion_flina', 3),
    n('peace_treaty', 1), n('shield_break', 2), n('omnivore', 3),
    n('meadow_holiday', 3), n('shrink', 2), n('sacrifice', 1)
  );

  SG.DUNGEONS = [
    {
      id: 'beginner',
      name: '初級迷宮',
      en: 'Beginner Dungeon',
      tier: 'Easy',
      desc: '所有副本的起點，樓層最少、BOSS 也最好打。',
      floors: [
        foe('npc_enchantress',  'academy'),
        foe('npc_myo_observer', 'darklore')
      ],
      boss: { character: 'boss_nold', deck: NOLD_DECK },
      reward: 'nold',
      ore: 'ore_white',
      /* 每場勝利掉落：1 白礦石 ＋ N 顆隨機陣營礦石 */
      dropOre: 1,
      /* 打贏 BOSS 的額外掉落（繁中 wiki 頁面 66：初級迷宮 1~9 次） */
      clearDrop: [
        { mat: 'ore_white', n: 7 }, { mat: 'shoes', n: 4 }, { mat: 'stockings', n: 4 },
        { mat: 'cat_doll', n: 4 }, { mat: 'book', n: 4 }
      ],
      /* 通關 10 次之後的掉落會變少 */
      clearDropAfter: [
        { mat: 'ore_white', n: 3 }, { mat: 'shoes', n: 1 }, { mat: 'stockings', n: 1 },
        { mat: 'cat_doll', n: 1 }, { mat: 'book', n: 1 }
      ]
    },
    {
      id: 'intermediate',
      name: '中級迷宮',
      en: 'Intermediate Dungeon',
      tier: 'Easy',
      desc: '15 層。敵人會隨樓層變強，後段開始出現 X 型強化敵人。',
      floors: [
        foe('npc_bunny_lady',     'vita'),      // 1
        foe('npc_wind_shear',     'academy'),   // 2
        foe('npc_wind_shear',     'academy'),   // 3
        foe('npc_wind_breaker',   'darklore'),  // 4
        foe('npc_wind_sneaker',   'academy'),   // 5
        foe('npc_wind_breaker',   'darklore'),  // 6
        foe('npc_wind_shear_x',   'academy'),   // 7
        foe('npc_bunny_lady_x',   'vita'),      // 8
        foe('npc_wind_breaker_x', 'darklore'),  // 9
        foe('npc_wind_sneaker_x', 'academy'),   // 10
        foe('npc_wind_breaker_x', 'darklore'),  // 11
        foe('npc_wind_sneaker_x', 'academy'),   // 12
        foe('npc_wind_forestier', 'vita'),      // 13
        foe('npc_wind_forest_x',  'vita')       // 14
      ],
      boss: { character: 'boss_cannelle', deck: CANNELLE_DECK },
      reward: 'cannelle',
      ore: 'ore_white',
      dropOre: 2,
      clearDrop: [
        { mat: 'ore_white', n: 10 }, { mat: 'cat_doll', n: 5 }, { mat: 'stockings', n: 5 },
        { mat: 'shoes', n: 5 }, { mat: 'book', n: 5 }
      ],
      clearDropAfter: [
        { mat: 'ore_white', n: 4 }, { mat: 'cat_doll', n: 1 }, { mat: 'stockings', n: 1 },
        { mat: 'shoes', n: 1 }, { mat: 'book', n: 1 }
      ]
    },
    {
      id: 'advanced',
      name: '高級迷宮',
      en: 'Advanced Dungeon',
      tier: 'Easy',
      desc: '20 層。前段是四位「鏡中的少女」，最後是星見鳥、蓋托。',
      floors: [
        foe('npc_mirror_sita',    'vita'),      // 1
        foe('npc_mirror_cinia',   'academy'),   // 2
        foe('npc_mirror_luthica', 'crux'),      // 3
        foe('npc_mirror_iri',     'darklore'),  // 4
        foe('npc_mirror_sita',    'vita'),      // 5
        foe('npc_mirror_cinia',   'academy'),   // 6
        foe('npc_mirror_luthica', 'crux'),      // 7
        foe('npc_mirror_iri',     'darklore'),  // 8
        foe('npc_mirror_sita',    'vita'),      // 9
        foe('npc_winged_seeker',  'academy'),   // 10
        foe('npc_trickster_x',    'darklore'),  // 11
        foe('npc_enchantress_x',  'academy'),   // 12
        foe('npc_myo_observer_x', 'darklore'),  // 13
        foe('npc_wind_forest_x',  'vita'),      // 14
        foe('npc_wind_shear_x',   'academy'),   // 15
        foe('npc_wind_breaker_x', 'darklore'),  // 16
        foe('npc_wind_sneaker_x', 'academy'),   // 17
        foe('npc_myo_observer_x', 'darklore'),  // 18
        foe('npc_wind_shear_x',   'academy')    // 19
      ],
      boss: { character: 'boss_gart', deck: GART_DECK },
      reward: 'gart',
      ore: 'ore_white',
      dropOre: 2,
      clearDrop: [
        { mat: 'ore_white', n: 13 }, { mat: 'sword', n: 6 }, { mat: 'stockings', n: 6 },
        { mat: 'cat_doll', n: 6 }, { mat: 'book', n: 6 }
      ],
      clearDropAfter: [
        { mat: 'ore_white', n: 5 }, { mat: 'sword', n: 2 }, { mat: 'stockings', n: 2 },
        { mat: 'cat_doll', n: 2 }, { mat: 'book', n: 2 }
      ]
    }
    ,
    {
      id: 'bamboo',
      name: '竹林鄉',
      en: 'Bamboo Garden',
      tier: 'Easy',
      desc: '20 層。竹林深處的守衛一層比一層強，盡頭是希妮亞的寵物。',
      /* 樓層敵人名單來自英文 wiki 的 Bamboo Garden，
         但該頁沒有記載這些敵人的 LIFE，數值是依樓層深度估算的。 */
      floors: [
        foe('npc_bg_knight', 'crux'),    foe('npc_bg_chief', 'academy'),
        foe('npc_bg_knight', 'crux'),    foe('npc_bg_chief', 'academy'),
        foe('npc_bg_frett', 'crux'),     foe('npc_bg_chief', 'academy'),
        foe('npc_bg_frett', 'crux'),     foe('npc_bg_chief', 'academy'),
        foe('npc_bg_frett', 'crux'),     foe('npc_bg_mop', 'academy'),
        foe('npc_bg_frett', 'crux'),     foe('npc_bg_mop', 'academy'),
        foe('npc_bg_frett', 'crux'),     foe('npc_bg_mop', 'academy'),
        foe('npc_bg_layna', 'vita'),     foe('npc_bg_mop', 'academy'),
        foe('npc_bg_layna', 'vita'),     foe('npc_bg_mop', 'academy'),
        foe('npc_bg_layna', 'vita')
      ],
      boss: { character: 'boss_panica', deck: PANICA_DECK },
      reward: 'panica',
      ore: 'bamboo',
      dropOre: 2,
      clearDrop: [
        { mat: 'bamboo', n: 10 }, { mat: 'book', n: 3 }, { mat: 'cat_doll', n: 3 },
        { mat: 'stockings', n: 3 }, { mat: 'ribbon', n: 3 }
      ],
      clearDropAfter: [
        { mat: 'bamboo', n: 15 }, { mat: 'book', n: 6 }, { mat: 'cat_doll', n: 6 },
        { mat: 'shoes', n: 6 }, { mat: 'ribbon', n: 2 }
      ]
    },
    {
      id: 'frontier',
      name: '邊境遺跡',
      en: 'Frontier Ruins',
      tier: 'Normal',
      desc: '30 層的長征。從雜兵一路打到黃昏之狼，是取得遺跡碎片的唯一去處。',
      /* 樓層敵人與掉落規則來自英文 wiki 的 Frontier Ruins，
         用到的 NPC 全部都是既有的角色卡。 */
      floors: (function () {
        var f = [];
        var early = ['npc_trickster_x', 'npc_enchantress', 'npc_wind_shear', 'npc_bunny_lady'];
        var mid   = ['npc_myo_observer', 'npc_wind_sneaker', 'npc_wind_breaker'];
        var late  = ['npc_enchantress_x', 'npc_trickster_x', 'npc_bunny_lady_x', 'npc_wind_shear_x'];
        var deep  = ['npc_wind_breaker_x', 'npc_wind_sneaker_x', 'npc_myo_observer_x'];
        var last  = ['npc_wind_forestier', 'npc_winged_seeker'];
        var fac = ['darklore', 'crux', 'academy', 'vita'];
        function push(list, from, to) {
          for (var i = from; i <= to; i++) {
            f[i - 1] = foe(list[(i - from) % list.length], fac[i % fac.length]);
          }
        }
        push(early, 1, 6); push(mid, 7, 12); push(late, 13, 18);
        push(deep, 19, 24); push(last, 25, 29);
        return f;
      })(),
      boss: { character: 'boss_ginger', deck: GINGER_DECK },
      reward: 'ginger',
      ore: 'ruins',
      dropOre: 2,
      clearDrop: [
        { mat: 'ruins', n: 10 }, { mat: 'sword', n: 4 }, { mat: 'shoes', n: 4 },
        { mat: 'cat_doll', n: 4 }, { mat: 'book', n: 4 }
      ],
      clearDropAfter: [
        { mat: 'ruins', n: 6 }, { mat: 'sword', n: 2 }, { mat: 'shoes', n: 2 },
        { mat: 'cat_doll', n: 2 }, { mat: 'book', n: 2 }
      ]
    }
  ];

  SG.getDungeon = function (id) {
    for (var i = 0; i < SG.DUNGEONS.length; i++) {
      if (SG.DUNGEONS[i].id === id) return SG.DUNGEONS[i];
    }
    return null;
  };

  SG.dungeonFloors = function (d) { return d.floors.length + 1; };   // ＋BOSS 那層

  /* 第 floor 層（1-based）的敵人牌組 */
  SG.dungeonFoe = function (d, floor) {
    var last = SG.dungeonFloors(d);
    if (floor >= last) {
      return {
        name: SG.getCard(d.boss.character).name,
        boss: true,
        deck: { name: SG.getCard(d.boss.character).name, npc: true,
                character: d.boss.character, cards: d.boss.deck.slice() }
      };
    }
    var f = d.floors[floor - 1];
    var ch = SG.getCard(f.character);
    return {
      name: ch.name,
      boss: false,
      deck: { name: ch.name, npc: true, character: f.character, cards: starterCards(f.faction) }
    };
  };
})();
