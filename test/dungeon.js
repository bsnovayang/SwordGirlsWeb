/* P4 測試：合成配方 / 副本進度 / BOSS 效果　　node test/dungeon.js */
const fs = require('fs'), path = require('path');
global.window = global;
function load(p) { eval(fs.readFileSync(path.join(__dirname, '..', p), 'utf8')); }
['js/data/cards.js', 'js/data/cards_ep1.js', 'js/data/cards_ep2.js', 'js/data/cards_ep3.js', 'js/data/cards_ep4.js', 'js/data/cards_ex1.js', 'js/data/cards_ep5.js', 'js/data/cards_ep6.js', 'js/data/cards_ex2.js', 'js/data/cards_npc.js', 'js/data/materials.js', 'js/data/decks.js',
 'js/data/dungeons.js', 'js/core/save.js', 'js/core/score.js', 'js/core/pack.js', 'js/core/battle.js', 'js/core/effects.js', 'js/core/effects_ep1.js', 'js/core/effects_ep2.js', 'js/core/effects_ep3.js', 'js/core/effects_ep4.js', 'js/core/effects_ex1.js', 'js/core/effects_ep5.js', 'js/core/effects_ep6.js', 'js/core/effects_ex2.js',
 'js/core/ai.js'].forEach(load);

/* localStorage 替身 */
const store = {};
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};

let pass = 0; const errors = [];
function ok(c, name, detail) { if (c) { pass++; return; } errors.push(name + (detail ? '　→ ' + detail : '')); }
function eq(a, b, name) { ok(a === b, name, '得到 ' + JSON.stringify(a) + '，預期 ' + JSON.stringify(b)); }

console.log('══════ 合成配方符合 wiki ══════');
{
  /* 英文 wiki 存檔實際抓到的 31 張配方，逐一驗證推導規則 */
  const WIKI = {
    accident:            { book: 3, ore_red: 2, ore_white: 2 },
    blood_target:        { book: 3, ore_black: 2, ore_white: 2 },
    cinia_pacifica:      { sword: 30, ore_red: 20, ore_white: 50 },
    close_encounter:     { book: 3, ore_blue: 2, ore_white: 2 },
    cook_club_katie:     { cat_doll: 3, ore_green: 2, ore_white: 2 },
    cook_club_student:   { cat_doll: 3, ore_green: 2, ore_white: 2 },
    crescent_conundrum:  { cat_doll: 3, ore_white: 2, ore_black: 2 },
    crux_knight_mitil:   { cat_doll: 3, ore_blue: 2, ore_white: 2 },
    crux_knight_pintail: { cat_doll: 3, ore_blue: 2, ore_white: 2 },
    crux_knight_terra:   { cat_doll: 3, ore_blue: 2, ore_white: 2 },
    entry_denied:        { book: 3, ore_blue: 2, ore_white: 2 },
    flinas_command:      { book: 3, ore_black: 2, ore_white: 2 },
    head_maid:           { cat_doll: 3, ore_red: 2, ore_white: 2 },
    heartless_blow:      { book: 3, ore_green: 2, ore_white: 2 },
    iri_flina:           { sword: 30, ore_white: 50, ore_black: 20 },
    knight_adjt_sarisen: { cat_doll: 3, ore_blue: 2, ore_white: 2 },
    knight_escort:       { cat_doll: 3, ore_blue: 2, ore_white: 2 },
    luthica_preventer:   { sword: 30, ore_white: 50, ore_blue: 20 },
    military_knight_sillit: { cat_doll: 3, ore_blue: 2, ore_white: 2 },
    mop_maid:            { cat_doll: 3, ore_red: 2, ore_white: 2 },
    new_cook_club_student: { cat_doll: 3, ore_green: 2, ore_white: 2 },
    new_maid:            { cat_doll: 3, ore_red: 2, ore_white: 2 },
    new_recipe:          { book: 3, ore_green: 2, ore_white: 2 },
    porter_maid:         { cat_doll: 3, ore_red: 2, ore_white: 2 },
    scardel_sion_flina:  { cat_doll: 3, ore_white: 2, ore_black: 2 },
    she_did_it:          { book: 3, ore_red: 2, ore_white: 2 },
    sita_vilosa:         { sword: 30, ore_green: 20, ore_white: 50 },
    student_orientation: { book: 3, ore_green: 2, ore_white: 2 },
    tailor_maid:         { cat_doll: 3, ore_red: 2, ore_white: 2 },
    tighten_security:    { book: 3, ore_red: 2, ore_white: 2 },
    vampiric_rites:      { book: 3, ore_black: 2, ore_white: 2 }
  };
  let bad = 0;
  Object.keys(WIKI).forEach(slug => {
    const got = {};
    (SG.recipeOf(slug) || []).forEach(m => { got[m.mat] = m.n; });
    const want = WIKI[slug];
    const same = Object.keys(want).length === Object.keys(got).length &&
                 Object.keys(want).every(k => got[k] === want[k]);
    if (!same) { bad++; errors.push('配方不符：' + slug + ' 得到 ' + JSON.stringify(got)); }
  });
  ok(bad === 0, '31 張 wiki 配方全部符合推導規則');
  console.log('  驗證 ' + Object.keys(WIKI).length + ' 張，全部一致：' + (bad === 0));

  eq(SG.recipeOf('boss_nold'), null, 'BOSS 卡不能合成');

  /* 通關 10 次的獎勵角色卡在原作沒有配方 —— 英文 wiki 上 Nold / Cannelle /
     Gart / Miracle Panda Panica / Ginger 這幾張都沒有 ingredient 欄位。
     以前只有「卡涅魯」不能合成，那其實是因為它無所屬、湊不出陣營礦石，
     不是刻意的設計；其餘四張都能繞過通關直接做出來。                  */
  SG.DUNGEONS.forEach(function (d) {
    eq(SG.recipeOf(d.reward), null,
       '獎勵角色卡只能靠通關取得，不能合成：' + SG.getCard(d.reward).name);
  });
}

console.log('══════ 每張可收集的卡都真的拿得到 ══════');
{
  /* 配方寫得再漂亮，只要有一種素材沒有副本會掉，那張卡就是死路。
     這裡把「玩家實際拿得到的素材」算出來，再檢查每張卡的配方。 */
  const got = new Set();
  /* 每場副本勝利都會隨機給四種陣營礦石的其中一種（見 save.js dungeonWin） */
  ['ore_green', 'ore_red', 'ore_blue', 'ore_black'].forEach(m => got.add(m));
  SG.DUNGEONS.forEach(d => {
    if (d.ore) got.add(d.ore);
    [d.clearDrop, d.clearDropAfter, d.drops, d.floorDrops].forEach(a => {
      if (Array.isArray(a)) a.forEach(x => { if (x && x.mat) got.add(x.mat); });
    });
  });

  const coll = SG.collectibleCards();
  const rewards = new Set(SG.DUNGEONS.map(d => d.reward));
  const dead = [];
  coll.forEach(c => {
    const r = SG.recipeOf(c);
    if (!r) {
      /* 沒有配方的只能是通關獎勵卡，否則就是沒有任何取得途徑 */
      if (!rewards.has(c.slug)) dead.push(c.name + '（沒有配方，也不是通關獎勵）');
      return;
    }
    const miss = r.filter(x => !got.has(x.mat)).map(x => SG.matName(x.mat));
    if (miss.length) dead.push(c.name + '（缺 ' + miss.join('、') + '）');
  });
  console.log('  可收集 ' + coll.length + ' 種｜可合成 ' +
              coll.filter(c => SG.recipeOf(c)).length + ' 種｜通關獎勵 ' + rewards.size + ' 種');
  ok(dead.length === 0, '沒有拿不到的卡', dead.join(' / '));

  /* 反過來：配方裡用到的素材，副本都要掉得出來 */
  const need = new Set();
  coll.forEach(c => (SG.recipeOf(c) || []).forEach(x => need.add(x.mat)));
  const nodrop = [...need].filter(m => !got.has(m)).map(m => SG.matName(m));
  ok(nodrop.length === 0, '配方用到的素材副本都掉得出來', nodrop.join('、'));
}

console.log('══════ 合成 ══════');
{
  const S = SG.Save;
  S.reset();
  eq(S.craft('cook_club_katie'), false, '沒素材不能合成');
  S.addMaterials([{ mat: 'cat_doll', n: 3 }, { mat: 'ore_green', n: 2 }, { mat: 'ore_white', n: 2 }]);
  const before = S.data.owned.cook_club_katie || 0;
  eq(S.craft('cook_club_katie'), true, '素材足夠就能合成');
  eq(S.data.owned.cook_club_katie, before + 1, '持有數 +1');
  eq(S.data.materials.cat_doll, 0, '素材被扣掉');
  eq(S.craft('cook_club_katie'), false, '素材用完就不能再合成');

  /* 新手牌組給的份數不一定滿上限 → 合成有實際用途 */
  const topUp = SG.allCards().filter(c => SG.recipeOf(c) && S.craftUseful(c.slug));
  ok(topUp.length > 0, '初始狀態就有 ' + topUp.length + ' 張卡沒到牌組上限，可以靠合成補滿');
}

console.log('══════ 無所屬（neutral）的處理 ══════');
{
  /* 規則：無所屬的卡任何陣營的牌組都放得進去；
     用無所屬「角色卡」組牌時也不鎖陣營。 */
  const S = SG.Save;
  const oph = SG.getCard('visitor_ophelia');
  ok(!!oph && oph.faction === 'neutral', '訪問者、奧菲莉亞是無所屬隨從');

  const dk = { name: 't', character: 'sita_vilosa', cards: [] };
  ok(S.factionOk(dk, oph), '無所屬隨從放得進公立牌組');

  const nd = { name: 't', character: 'cannelle', cards: [] };   // 卡涅魯是無所屬角色
  eq(S.deckFaction(nd), 'neutral', '無所屬角色的牌組陣營是 neutral');
  ['cook_club_student', 'guard_maid', 'crux_knight_mitil', 'scardel_merlot']
    .forEach(sl => ok(S.factionOk(nd, SG.getCard(sl)),
                      '無所屬角色的牌組放得進 ' + SG.getCard(sl).faction + ' 的卡'));

  /* 無所屬的卡沒有專屬礦石，配方要用白礦石代替，而且不能出現重複項目 */
  const r = SG.recipeOf(oph);
  ok(!!r, '無所屬的卡做得出來（不是 null）');
  const mats = r.map(x => x.mat);
  eq(mats.length, new Set(mats).size, '配方裡不會有重複的素材項目');
  ok(r.some(x => x.mat === 'ore_white'), '用白色礦石代替陣營礦石');

  /* 每個陣營的卡包都要有無所屬的卡 */
  ['vita', 'academy', 'crux', 'darklore'].forEach(f => {
    ok(SG.packPool({ faction: f }).some(c => c.slug === 'visitor_ophelia'),
       f + ' 卡包裡有無所屬的卡');
  });
}

console.log('══════ 戰鬥評價與掉落 ══════');
{
  /* 假的對局狀態，只放評價會讀到的欄位 */
  function fake(life, max, turn, kills) {
    return { turn: turn, winner: 0, stats: { kills: [0, kills] },
             players: [{ character: { life: life, maxLife: max } }, {}] };
  }
  const dgE = SG.getDungeon('beginner');      // Easy
  const dgN = SG.getDungeon('frontier');      // Normal

  const perfect = SG.battleScore(fake(30, 30, 1, 3), { dungeon: dgE, floor: 1, floors: 3 });
  const rough   = SG.battleScore(fake(3, 30, 12, 0), { dungeon: dgE, floor: 1, floors: 3 });
  ok(perfect.total > rough.total, '打得漂亮分數比較高',
     perfect.total + ' vs ' + rough.total);

  /* 各項加分要真的有作用 */
  const base = SG.battleScore(fake(15, 30, 6, 0), { dungeon: dgE, floor: 1, floors: 3 });
  ok(SG.battleScore(fake(25, 30, 6, 0), { dungeon: dgE, floor: 1, floors: 3 }).total > base.total,
     '生命留得多，分數高');
  ok(SG.battleScore(fake(15, 30, 3, 0), { dungeon: dgE, floor: 1, floors: 3 }).total > base.total,
     '回合數少，分數高');
  ok(SG.battleScore(fake(15, 30, 6, 4), { dungeon: dgE, floor: 1, floors: 3 }).total > base.total,
     '擊破越多，分數高');

  /* 倍率 */
  const f1 = SG.battleScore(fake(15, 30, 6, 2), { dungeon: dgN, floor: 1, floors: 30 });
  const f30 = SG.battleScore(fake(15, 30, 6, 2), { dungeon: dgN, floor: 30, floors: 30, isBoss: true });
  ok(f30.total > f1.total * 1.5, '越深的樓層 + BOSS 倍率明顯更高',
     f1.total + ' → ' + f30.total);
  const easy = SG.battleScore(fake(15, 30, 6, 2), { dungeon: dgE, floor: 1, floors: 3 });
  ok(f1.total > easy.total, 'Normal 難度比 Easy 給得多', easy.total + ' vs ' + f1.total);

  /* 掉落：總量要等於分數換算的單位數，而且陣營礦石發的是自己的 */
  const drops = SG.scoreDrops(336, SG.getDungeon('bamboo'), 'darklore');
  const units = drops.reduce((s, d) => s + d.n, 0);
  eq(units, Math.round(336 / SG._score.PER_UNIT), '掉落總量＝分數 ÷ PER_UNIT');
  ok(drops.some(d => d.mat === 'ore_black'), '陣營礦石發的是自己陣營（暗黑→黑色礦石）');
  ok(!drops.some(d => d.mat === 'ore_green' || d.mat === 'ore_red' || d.mat === 'ore_blue'),
     '不會發到別的陣營礦石');
  ok(drops.some(d => d.mat === 'bamboo'), '竹林鄉會發專屬素材「竹」');

  /* 陣營要從角色卡推導 —— 存檔裡的牌組物件沒有 faction 欄位。
     以前這裡傳 dk.faction（undefined），結果 fallback 成白礦石，
     等於完全沒發陣營礦石，而且不會報錯。                        */
  {
    const dk = SG.Save.activeDeck();
    const fac = SG.Save.deckFaction(dk);
    ok(!!fac, '從牌組推導得出陣營', String(fac));
    ok(dk.faction === undefined,
       '存檔的牌組物件本身沒有 faction 欄位（所以一定要用 deckFaction）');
    const d = SG.scoreDrops(336, SG.getDungeon('bamboo'), fac);
    ok(d.some(x => x.mat === SG.factionOre(fac)),
       '照 deckFaction 發得到該陣營的礦石');
    ok(!SG.scoreDrops(336, SG.getDungeon('bamboo'), undefined)
          .some(x => SG.MATERIALS[x.mat] && SG.MATERIALS[x.mat].faction),
       '陣營給錯時不會硬塞別人的礦石（退回白礦石）');
  }

  /* 一場勝利大致做得出一張基本卡 */
  {
    const common = SG.collectibleCards()
      .filter(c => c.ep === 1 && c.faction === 'vita' && c.points <= 1);
    const cost = SG.recipeOf(common[0]).reduce((s, m) => s + m.n, 0);
    const avg = SG.scoreDrops(336, SG.getDungeon('bamboo'), 'vita')
                  .reduce((s, d) => s + d.n, 0);
    console.log('  一張 EP1 普通卡 ' + cost + ' 單位｜一場中等評價 ' + avg + ' 單位');
    ok(avg >= cost * 0.7 && avg <= cost * 1.6,
       '一場勝利的量大致等於一張基本卡', avg + ' vs ' + cost);
  }
}

console.log('══════ 副本進度 ══════');
{
  const S = SG.Save;
  S.reset();
  const dg = SG.getDungeon('beginner');
  eq(SG.dungeonFloors(dg), 3, '初級迷宮 3 層（2 層雜兵 + BOSS）');
  eq(S.dungeon('beginner').floor, 1, '從第 1 層開始');

  S.dungeonWin(dg);
  eq(S.dungeon('beginner').floor, 2, '贏了往上一層');
  S.dungeonLose(dg);
  eq(S.dungeon('beginner').floor, 1, '輸了往下一層');

  S.dungeonWin(dg); S.dungeonWin(dg);            // → 第 3 層（BOSS）
  eq(S.dungeon('beginner').floor, 3, '連贏兩場到 BOSS 層');
  const lose = S.dungeonLose(dg);
  ok(lose.wasBoss, '判定為敗給 BOSS');
  eq(S.dungeon('beginner').floor, 1, '敗給 BOSS 退回第 1 層');

  /* 通關 10 次拿角色卡 */
  S.reset();
  ok(!(S.data.owned.nold > 0), '一開始沒有諾爾德');
  let got = null;
  for (let i = 0; i < 10; i++) {
    S.dungeonWin(dg); S.dungeonWin(dg);           // 1F → 2F → 3F
    const r = S.dungeonWin(dg);                   // 打贏 BOSS
    ok(r.cleared || i < 0, '第 ' + (i + 1) + ' 次通關');
    if (r.gotReward) got = i + 1;
    eq(S.dungeon('beginner').floor, 1, '通關後回到第 1 層');
  }
  eq(S.dungeon('beginner').clears, 10, '通關次數累計到 10');
  eq(got, 10, '第 10 次通關拿到獎勵角色卡');
  eq(S.data.owned.nold, 1, '諾爾德進入持有清單');
  const again = S.dungeonWin(dg);                 // 第 11 次：不該重複給
  ok(!again.gotReward, '已取得後不會重複發放');

  /* 掉落 */
  ok(S.data.materials.ore_white > 0, '打贏會掉白色礦石');
  ok(Object.keys(S.data.materials).length >= 3, '掉落有多種素材');
}

console.log('══════ 打過的樓層可以重打 ══════');
{
  const S = SG.Save;
  S.reset();
  const dg = SG.getDungeon('bamboo'), max = SG.dungeonFloors(dg);
  const st = S.dungeon(dg.id);
  const SC = { total: 336 };

  /* 先爬三層 */
  S.dungeonWin(dg, SC, 'vita'); S.dungeonWin(dg, SC, 'vita'); S.dungeonWin(dg, SC, 'vita');
  eq(st.floor, 4, '連贏三場 → 進度到第 4 層');

  /* 重打舊樓層：拿得到素材與點數，但進度不動 */
  const mat0 = Object.keys(S.data.materials).reduce((n, k) => n + S.data.materials[k], 0);
  const tk0 = S.data.packs.tickets;
  const r = S.dungeonWin(dg, SC, 'vita', 2);
  eq(st.floor, 4, '重打第 2 層贏了，進度不變');
  eq(r.progress, false, '結果標記為「非進度挑戰」');
  ok(r.tickets === 1, '重打一樣拿得到卡包點數');
  const mat1 = Object.keys(S.data.materials).reduce((n, k) => n + S.data.materials[k], 0);
  ok(mat1 > mat0, '重打一樣拿得到素材');
  ok(S.data.packs.tickets > tk0, '點數有增加');

  /* 重打舊樓層輸了不會退層 */
  const lose = S.dungeonLose(dg, 2);
  eq(st.floor, 4, '重打舊樓層輸了不退層');
  eq(lose.progress, false, '輸的結果也標記為非進度挑戰');

  /* 打目前這層才會推進 */
  S.dungeonWin(dg, SC, 'vita', 4);
  eq(st.floor, 5, '打贏目前的樓層才會往上');

  /* 打目前這層輸了會退 */
  S.dungeonLose(dg, 5);
  eq(st.floor, 4, '打目前這層輸了退一層');

  /* 重打 BOSS 層不能刷通關次數 —— 進度沒到 BOSS 就不算通關 */
  st.floor = max; st.clears = 0;
  const c1 = S.dungeonWin(dg, SC, 'vita', max);
  eq(c1.cleared, true, '進度到 BOSS 層打贏＝通關');
  eq(st.clears, 1, '通關次數 +1');
  eq(st.floor, 1, '通關後回到第 1 層');

  const c2 = S.dungeonWin(dg, SC, 'vita', 1);
  eq(c2.cleared, false, '回到第 1 層後重打第 1 層不算通關');
  eq(st.clears, 1, '通關次數沒有被灌水');
}

console.log('══════ BOSS 與獎勵卡的效果 ══════');
{
  ['boss_nold', 'boss_cannelle', 'boss_gart', 'nold', 'cannelle', 'gart'].forEach(slug => {
    ok(!!SG.Effects[slug], '效果已實作：' + SG.getCard(slug).name);
  });

  function board(myChar, foeChar) {
    const mk = ch => ({ name: 't', character: ch, cards: [] });
    const g = SG.createGame(mk(myChar), mk(foeChar || 'sita_vilosa'), 'p4');
    g.phase = 'battle';
    return g;
  }
  function put(g, pi, slot, slug) {
    const c = SG._test.mkCard(slug, pi);
    g.players[pi].field[slot] = c;
    return c;
  }
  function fire(g, pi) {
    const ev = [];
    SG._test.fire(g, ev, g.players[pi].character, pi, -1, 'turnStart');
    return ev;
  }

  { // 諾爾德（BOSS）：自己場上全部隨從 SIZE -1
    const g = board('boss_nold');
    const a = put(g, 0, 0, 'head_maid');       // size 5
    const b = put(g, 0, 1, 'new_maid');        // size 2
    fire(g, 0);
    eq(a.size + ',' + b.size, '4,1', 'BOSS 諾爾德：自己隨從 SIZE -1');
  }
  { // 卡涅魯（BOSS）：SIZE 3 以下的隨從 攻/體 +2
    const g = board('boss_cannelle');
    const small = put(g, 0, 0, 'crux_knight_terra');   // size 3
    const big = put(g, 0, 1, 'knight_escort');         // size 5
    fire(g, 0);
    eq(small.atk, 9, 'BOSS 卡涅魯：SIZE≤3 攻 +2');
    eq(big.atk, 7, 'BOSS 卡涅魯：SIZE>3 不受影響');
  }
  { // 蓋托（BOSS）：敵方隨機 1 張隨從行動終了
    const g = board('boss_gart');
    const t = put(g, 1, 0, 'new_maid');
    fire(g, 0);
    ok(t.activated, 'BOSS 蓋托：敵方隨從變成行動終了');
  }
  { // 諾爾德（獎勵卡）
    const g = board('nold');
    g.players[0].hand = [SG._test.mkCard('head_maid', 0)];
    const f = put(g, 0, 0, 'head_maid');      // size 5
    fire(g, 0);
    eq(g.players[0].hand[0].size, 6, '獎勵卡諾爾德：手牌 SIZE +1');
    eq(f.size, 4, '獎勵卡諾爾德：場上 SIZE≥2 的卡 SIZE -1');
  }
  { // 卡涅魯（獎勵卡）：攻/體 上升 SIZE 差
    const g = board('cannelle');
    const mine = put(g, 0, 0, 'cook_club_student');   // size 1, 3/0/8
    put(g, 1, 0, 'head_maid');                        // size 5
    fire(g, 0);
    eq(mine.atk + ',' + mine.sta, '7,12', '獎勵卡卡涅魯：攻/體 +4（5−1）');
  }
  { // 蓋托（獎勵卡）：優先打不同陣營
    const g = board('gart');                          // gart 是公立
    const other = put(g, 1, 0, 'new_maid');           // 私立
    const same = put(g, 1, 1, 'cook_club_student');   // 公立
    fire(g, 0);
    eq(other.atk, 2, '獎勵卡蓋托：不同陣營的隨從 攻 -2');
    eq(same.atk, 3, '獎勵卡蓋托：同陣營不受影響');
  }
}

console.log('══════ 新副本（竹林鄉 / 邊境遺跡） ══════');
{
  const S = SG.Save;
  S.reset();
  eq(SG.DUNGEONS.length, 5, '共 5 座副本');
  eq(SG.dungeonFloors(SG.getDungeon('bamboo')), 20, '竹林鄉 20 層');
  eq(SG.dungeonFloors(SG.getDungeon('frontier')), 30, '邊境遺跡 30 層');
  eq(SG.getDungeon('frontier').tier, 'Normal', '邊境遺跡屬於 Normal');

  /* 特產素材 */
  eq(SG.getDungeon('bamboo').ore, 'bamboo', '竹林鄉掉竹');
  eq(SG.getDungeon('frontier').ore, 'ruins', '邊境遺跡掉遺跡碎片');
  const before = S.data.materials.bamboo || 0;
  S.dungeonWin(SG.getDungeon('bamboo'), { total: 336 }, 'vita');
  ok((S.data.materials.bamboo || 0) > before, '打贏竹林鄉會拿到竹');

  /* EP1 卡片需要新副本的特產 */
  const r = SG.recipeOf('shrink').map(m => m.mat);
  ok(r.indexOf('ruins') >= 0, 'EP1 稀有咒語需要遺跡碎片：' + r.join(','));
  const r2 = SG.recipeOf('omnivore').map(m => m.mat);
  ok(r2.indexOf('bamboo') >= 0, 'EP1 普通咒語需要竹：' + r2.join(','));
  ok(SG.recipeOf('cook_club_katie').every(m => m.mat !== 'bamboo' && m.mat !== 'ruins'),
     'EP0 卡片的配方沒有被改動');

  /* 新 BOSS 與獎勵卡的效果 */
  ['boss_panica', 'boss_ginger', 'panica', 'ginger'].forEach(slug => {
    ok(!!SG.Effects[slug], '效果已實作：' + SG.getCard(slug).name);
  });

  function board(myChar) {
    const mk = ch => ({ name: 't', character: ch, cards: [] });
    const g = SG.createGame(mk(myChar), mk('sita_vilosa'), 'p5');
    g.phase = 'battle';
    return g;
  }
  function put(g, pi, slot, slug) {
    const c = SG._test.mkCard(slug, pi);
    g.players[pi].field[slot] = c;
    return c;
  }
  function fire(g, pi) {
    const ev = [];
    SG._test.fire(g, ev, g.players[pi].character, pi, -1, 'turnStart');
    return ev;
  }

  { // 辛西亞（BOSS）：全體攻 +3
    const g = board('boss_ginger');
    const a = put(g, 0, 0, 'crescent_kris_flina');
    fire(g, 0);
    eq(a.atk, 5 + 3, 'BOSS 辛西亞：我方全部隨從 攻 +3');
  }
  { // 佩妮卡（BOSS）：奇偶回合不同效果
    const g = board('boss_panica');
    g.turn = 1;
    const t = put(g, 1, 0, 'porter_maid');    // 6/0/12
    fire(g, 0);
    eq(t.atk, 3, 'BOSS 佩妮卡：奇數回合 攻擊力減半（進位）');
    g.turn = 2;
    fire(g, 0);
    eq(t.sta, 6, 'BOSS 佩妮卡：偶數回合 體力減半（進位）');
  }
  { // 辛西亞（獎勵卡）：SIZE ≥ 場上卡片數的隨從攻+1/體+2
    const g = board('ginger');
    const big = put(g, 0, 0, 'crescent_kris_flina');   // size 5
    const small = put(g, 0, 1, 'crescent_conundrum');  // size 1
    fire(g, 0);                                        // 場上 2 張 → SIZE≥2 受益
    eq(big.atk + ',' + big.sta, '6,16', '獎勵卡辛西亞：SIZE≥X 的隨從 攻+1/體+2');
    eq(small.atk + ',' + small.sta, '4,4', '獎勵卡辛西亞：SIZE<X 不受影響');
  }
}

console.log('══════ 副本敵人牌組打得起來 ══════');
{
  let bad = 0;
  SG.DUNGEONS.forEach(dg => {
    for (let f = 1; f <= SG.dungeonFloors(dg); f++) {
      const foe = SG.dungeonFoe(dg, f);
      if (foe.deck.cards.length !== 30) {
        bad++; errors.push(dg.name + ' ' + f + 'F 敵人牌組 ' + foe.deck.cards.length + ' 張');
      }
      if (!SG.getCard(foe.deck.character)) { bad++; errors.push(dg.name + ' ' + f + 'F 角色卡不存在'); }
    }
  });
  ok(bad === 0, '所有樓層的敵人牌組都是 30 張且角色卡存在');

  /* 實際打幾場，確認不會爆 */
  let done = 0;
  SG.DUNGEONS.forEach(dg => {
    [1, SG.dungeonFloors(dg)].forEach(f => {
      const foe = SG.dungeonFoe(dg, f);
      const mine = SG.DECKS[0];
      for (let i = 0; i < 6; i++) {
        const g = SG.createGame(mine, foe.deck, dg.id + f + i);
        let guard = 0;
        while (!g.over && guard++ < 300) {
          SG.beginTurn(g); if (g.over) break;
          SG.aiPlay(g, 0); SG.aiPlay(g, 1); SG.resolveTurn(g);
        }
        if (!g.over) { errors.push(dg.name + ' ' + f + 'F 對戰未結束'); return; }
        done++;
      }
    });
  });
  ok(done === SG.DUNGEONS.length * 2 * 6, '副本對戰模擬 ' + done + ' 場全部正常結束');
}

console.log('');
console.log('通過 ' + pass + '　失敗 ' + errors.length);
if (errors.length) { errors.forEach(e => console.log('  ✗ ' + e)); process.exit(1); }
console.log('✔ 副本 / 合成測試全數通過');
