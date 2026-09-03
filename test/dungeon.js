/* P4 測試：合成配方 / 副本進度 / BOSS 效果　　node test/dungeon.js */
const fs = require('fs'), path = require('path');
global.window = global;
function load(p) { eval(fs.readFileSync(path.join(__dirname, '..', p), 'utf8')); }
['js/data/cards.js', 'js/data/cards_ep1.js', 'js/data/cards_npc.js', 'js/data/materials.js', 'js/data/decks.js',
 'js/data/dungeons.js', 'js/core/save.js', 'js/core/battle.js', 'js/core/effects.js', 'js/core/effects_ep1.js',
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
  eq(SG.recipeOf('cannelle'), null, '無所屬的獎勵角色卡不能合成（只能通關取得）');
  ok(!!SG.recipeOf('nold'), '有陣營的獎勵角色卡可以合成');
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
