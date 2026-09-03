/* 量測資源發放：node tools/measure_grind.js [每副本場數]
   跑真實對局（玩家用新手牌組、AI 用副本敵人），統計評價分數與掉落。 */
const fs = require('fs'), path = require('path');
global.window = global;
const R = path.join(__dirname, '..');
['js/data/cards.js', 'js/data/cards_ep1.js', 'js/data/cards_npc.js', 'js/data/materials.js',
 'js/data/decks.js', 'js/data/dungeons.js', 'js/data/ladder.js', 'js/core/battle.js',
 'js/core/effects.js', 'js/core/effects_ep1.js', 'js/core/ai.js', 'js/core/score.js']
  .forEach(p => eval(fs.readFileSync(path.join(R, p), 'utf8')));

const N = parseInt(process.argv[2] || '40', 10);

function play(deck, foe, seed) {
  const g = SG.createGame(deck, foe, seed);
  let guard = 0;
  while (!g.over && guard++ < 300) {
    SG.beginTurn(g); if (g.over) break;
    SG.aiPlay(g, 0); SG.aiPlay(g, 1); SG.resolveTurn(g);
  }
  return g;
}

console.log('副本          層  勝率   平均分  平均單位  平均掉落');
const perDungeon = [];
SG.DUNGEONS.forEach(dg => {
  const floors = SG.dungeonFloors(dg);
  let wins = 0, games = 0, score = 0, units = 0;
  const bag = {};
  SG.DECKS.forEach((deck, di) => {
    for (let k = 0; k < N; k++) {
      const floor = 1 + (k % floors);
      const foe = SG.dungeonFoe(dg, floor);
      const g = play(deck, foe.deck, 'm' + dg.id + di + k);
      games++;
      if (!g.over || g.winner !== 0) continue;
      wins++;
      const sc = SG.battleScore(g, { dungeon: dg, floor: floor, floors: floors, isBoss: floor >= floors });
      score += sc.total;
      const dr = SG.scoreDrops(sc.total, dg, deck.faction);
      dr.forEach(m => { bag[m.mat] = (bag[m.mat] || 0) + m.n; units += m.n; });
    }
  });
  const avgU = units / Math.max(1, wins);
  perDungeon.push({ dg, floors, wins, avgU, bag });
  console.log(dg.name.padEnd(9), String(floors).padStart(3),
    (wins * 100 / games).toFixed(0).padStart(4) + '%',
    (score / Math.max(1, wins)).toFixed(0).padStart(7),
    avgU.toFixed(1).padStart(8), '  ',
    Object.keys(bag).map(m => SG.matName(m) + ' ' + (bag[m] / Math.max(1, wins)).toFixed(1)).join('、'));
});

console.log('');
console.log('基準：Episode 0 普通卡 7 單位／Episode 1 普通卡 12 單位');
const all = perDungeon.reduce((s, p) => s + p.avgU * p.wins, 0) /
            Math.max(1, perDungeon.reduce((s, p) => s + p.wins, 0));
console.log('全副本平均一場 ' + all.toFixed(1) + ' 單位');

/* 組一副 EP1 牌組要幾場？
   注意：上表把四副牌組加總，所以每種陣營礦石看起來只有 ~0.8。
   實際玩家只玩一個陣營，會固定拿到自己那一種 —— 這裡改用單一陣營的視角重算。 */
const FAC = 'vita', ORE = SG.factionOre(FAC);
const best = {};
perDungeon.forEach(p => {
  let oreSum = 0;
  Object.keys(p.bag).forEach(m => {
    if (SG.MATERIALS[m] && SG.MATERIALS[m].faction) { oreSum += p.bag[m]; return; }
    const per = p.bag[m] / Math.max(1, p.wins);
    if (per > (best[m] || 0)) best[m] = per;
  });
  /* 四種陣營礦石的總量，對單一陣營玩家來說全部會變成他自己那一種 */
  const per = oreSum / Math.max(1, p.wins);
  if (per > (best[ORE] || 0)) best[ORE] = per;
});
const pool = SG.collectibleCards().filter(c => c.ep === 1 && c.faction === 'vita' && c.type !== 'character');
const deck = []; pool.forEach(c => { for (let i = 0; i < Math.min(c.limit, 3) && deck.length < 30; i++) deck.push(c); });
const need = {}; deck.forEach(c => (SG.recipeOf(c) || []).forEach(x => need[x.mat] = (need[x.mat] || 0) + x.n));
const per = Object.keys(need).map(m => ({ m, b: need[m] / (best[m] || 1e-9) })).sort((a, b) => b.b - a.b);
console.log('');
console.log('一副 EP1 公立牌組（30 張）：');
per.forEach(x => console.log('   ' + SG.matName(x.m).padEnd(6) + ' x' + String(need[x.m]).padStart(4) +
                             '  需 ' + Math.ceil(x.b) + ' 場'));
console.log('→ 跨副本挑最好的來源：最少 ' + Math.ceil(per[0].b) + ' 場');

/* 更貼近實際：只刷同一座副本要幾場（缺的素材就補不到） */
console.log('');
console.log('只刷單一副本的話：');
perDungeon.forEach(p => {
  const rate = {};
  let oreSum = 0;
  Object.keys(p.bag).forEach(m => {
    if (SG.MATERIALS[m] && SG.MATERIALS[m].faction) { oreSum += p.bag[m]; return; }
    rate[m] = p.bag[m] / Math.max(1, p.wins);
  });
  rate[ORE] = oreSum / Math.max(1, p.wins);
  const miss = Object.keys(need).filter(m => !rate[m]);
  if (miss.length) {
    console.log('   ' + p.dg.name.padEnd(8) + ' 做不完 —— 缺 ' +
                miss.map(m => SG.matName(m)).join('、'));
    return;
  }
  const n = Math.max.apply(null, Object.keys(need).map(m => need[m] / rate[m]));
  console.log('   ' + p.dg.name.padEnd(8) + ' ' + Math.ceil(n) + ' 場');
});
