/* 任務 / 成就測試：node test/quests.js */
const fs = require('fs'), path = require('path');
global.window = global;
function load(p) { eval(fs.readFileSync(path.join(__dirname, '..', p), 'utf8')); }
['js/data/cards.js', 'js/data/cards_ep1.js', 'js/data/cards_ep2.js', 'js/data/cards_npc.js', 'js/data/materials.js', 'js/data/decks.js',
 'js/data/dungeons.js', 'js/data/ladder.js', 'js/data/quests.js',
 'js/core/save.js', 'js/core/score.js', 'js/core/pack.js', 'js/core/battle.js', 'js/core/effects.js', 'js/core/effects_ep1.js', 'js/core/effects_ep2.js', 'js/core/ai.js'].forEach(load);

const store = {};
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};

let pass = 0; const errors = [];
function ok(c, name, detail) { if (c) { pass++; return; } errors.push(name + (detail ? '　→ ' + detail : '')); }
function eq(a, b, name) { ok(a === b, name, '得到 ' + JSON.stringify(a) + '，預期 ' + JSON.stringify(b)); }
const S = SG.Save;
const matTotal = () => Object.keys(S.data.materials).reduce((n, k) => n + S.data.materials[k], 0);

console.log('══════ 資料完整性 ══════');
{
  const ids = {};
  SG.QUEST_POOL.concat(SG.ACHIEVEMENTS).forEach(x => {
    ok(!ids[x.id], '編號不重複：' + x.id);
    ids[x.id] = 1;
    ok(!!x.text && x.need > 0, x.id + ' 有敘述與需求數');
    ok(x.reward.length > 0, x.id + ' 有獎勵');
    x.reward.forEach(r => ok(!!SG.MATERIALS[r.mat], x.id + ' 獎勵素材存在：' + r.mat));
    if (!x.custom) ok(!!SG.COUNTERS[x.counter], x.id + ' 使用已定義的計數：' + x.counter);
  });
  ok(SG.QUEST_POOL.length >= SG.DAILY_COUNT, '任務池夠抽每日 ' + SG.DAILY_COUNT + ' 個');
}

console.log('══════ 每日任務 ══════');
{
  S.reset();
  S.refreshDaily();
  eq(S.data.daily.quests.length, SG.DAILY_COUNT, '每天發 ' + SG.DAILY_COUNT + ' 個任務');
  eq(S.data.daily.date, S.today(), '記下今天的日期');

  const ids = S.data.daily.quests.map(q => q.id);
  ok(new Set(ids).size === ids.length, '同一天不會抽到重複任務');

  /* 同一天重複呼叫不會換題 */
  S.refreshDaily();
  eq(S.data.daily.quests.map(q => q.id).join(), ids.join(), '同一天重開，任務不變');

  /* 跨日會換新 */
  S.data.daily.date = '2000-01-01';
  S.save();
  S.refreshDaily();
  eq(S.data.daily.date, S.today(), '跨日自動更新日期');
  ok(S.data.daily.quests.every(q => !q.claimed), '新的一天任務重置為未領取');
}

console.log('══════ 進度以基準線計算 ══════');
{
  S.reset();
  /* 先累積一些計數，再發任務 —— 之前的進度不該算進今天的任務 */
  for (let i = 0; i < 5; i++) S.bump('dungeonWin');
  S.refreshDaily(true);
  /* 塞一個已知任務進去測 */
  S.data.daily.quests = [{ id: 'q_dg3', base: S.data.counters.dungeonWin || 0, claimed: false }];
  const entry = S.data.daily.quests[0];
  eq(S.questProgress(entry).now, 0, '發任務前的進度不計入');
  S.bump('dungeonWin'); S.bump('dungeonWin');
  eq(S.questProgress(entry).now, 2, '之後的進度才算');
  ok(!S.questProgress(entry).done, '還沒達標');
  S.bump('dungeonWin');
  ok(S.questProgress(entry).done, '達標');

  const before = matTotal();
  ok(S.claimQuest(entry), '可以領取');
  ok(matTotal() > before, '領取後素材增加');
  ok(!S.claimQuest(entry), '不能重複領取');
}

console.log('══════ 事件會累積計數 ══════');
{
  S.reset();
  const c = S.data.counters;

  S.recordBattle(true, { faction: 'vita' });
  eq(c.battle, 1, '打完一場 → battle +1');
  eq(c.battleWin, 1, '獲勝 → battleWin +1');
  eq(c['win.vita'], 1, '記錄使用的陣營');
  S.recordBattle(false, { faction: 'vita' });
  eq(c.battleWin, 1, '落敗不加勝場');
  eq(c.battle, 2, '落敗仍算一場');

  const dg = SG.getDungeon('beginner');
  S.dungeonWin(dg);
  eq(c.dungeonWin, 1, '副本獲勝 → dungeonWin +1');
  ok(!c.dungeonClear, '還沒打到 BOSS 不算通關');
  S.dungeonWin(dg); S.dungeonWin(dg);            // 2F → BOSS → 通關
  eq(c.dungeonClear, 1, '打贏 BOSS → dungeonClear +1');

  S.ladderResult(SG.ladderFoe('l1'), true);
  eq(c.ladderWin, 1, '天梯獲勝 → ladderWin +1');

  S.addMaterials(SG.recipeOf('cook_club_katie'));
  S.craft('cook_club_katie');
  eq(c.craft, 1, '合成 → craft +1');
}

console.log('══════ 成就 ══════');
{
  S.reset();
  const a1 = SG.achieveById('a_win1');
  ok(!S.achieveState(a1).done, '一開始沒達成首勝');
  S.recordBattle(true, { faction: 'crux' });
  ok(S.achieveState(a1).done, '打贏一場就達成');
  const before = matTotal();
  ok(S.claimAchieve(a1), '可以領取');
  ok(matTotal() > before, '領取後素材增加');
  ok(!S.claimAchieve(a1), '成就只能領一次');
  ok(S.achieveState(a1).claimed, '狀態標記為已領取');

  /* 自訂進度 */
  const mid = SG.achieveById('a_mid');
  S.data.ladder.best = 100;
  ok(S.achieveState(mid).done, '天梯最高積分 100 → 晉升中間界達成');

  const boss = SG.achieveById('a_boss3');
  eq(S.achieveState(boss).now, 0, '還沒有 BOSS 角色卡');
  SG.DUNGEONS.forEach(d => S.addOwned(d.reward, 1));
  eq(S.achieveState(boss).now, 3, '三張 BOSS 卡到手');
  ok(S.achieveState(boss).done, '收集成就達成');

  const full = SG.achieveById('a_full');
  ok(!S.achieveState(full).done, '初始狀態還沒把每張卡收滿上限');
  SG.collectibleCards().filter(c => !c.reward).forEach(c => {
    const need = c.limit - (S.data.owned[c.slug] || 0);
    if (need > 0) S.addOwned(c.slug, need);
  });
  ok(S.achieveState(full).done, '全部補滿上限後達成');
}

console.log('══════ 可領取提示 ══════');
{
  S.reset();
  S.refreshDaily(true);
  eq(S.pendingRewards(), 0, '初始沒有可領取的');
  S.recordBattle(true, { faction: 'vita' });
  ok(S.pendingRewards() >= 1, '達成首勝後有可領取：' + S.pendingRewards() + ' 項');
  S.claimAchieve(SGachieve('a_win1'));
  function SGachieve(id) { return SG.achieveById(id); }
}

console.log('══════ 清除記錄 ══════');
{
  S.recordBattle(true, { faction: 'vita' });
  S.reset();
  eq(Object.keys(S.data.counters).length, 0, '清除後計數歸零');
  eq(Object.keys(S.data.achieved).length, 0, '清除後成就重置');
  eq(S.data.daily.quests.length, 0, '清除後每日任務清空（下次進入才重抽）');
}

console.log('');
console.log('通過 ' + pass + '　失敗 ' + errors.length);
if (errors.length) { errors.forEach(e => console.log('  ✗ ' + e)); process.exit(1); }
console.log('✔ 任務 / 成就測試全數通過');
