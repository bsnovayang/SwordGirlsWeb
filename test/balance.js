/* 平衡檢查：node test/balance.js [每組合場數]

   繁中 wiki 的 FAQ「一開始要選擇什麼勢力？」直接寫過新手牌組的強弱：
     「初期牌組比較好上手的是南十字(強化為主)，其次是私立(弱化、搗亂)、
       公立(強化、弱化、搗亂皆有)，最後是暗黑族(初期牌效果微妙)。」

   所以這裡不是要把四副牌組調成五五波 —— 那反而不忠實。
   這支測試是拿來**鎖住排序**的：如果哪天有人把某張卡的效果寫錯，
   勝率排序就會偏離 wiki 的說法，測試會抓出來。
*/
const fs = require('fs'), path = require('path');
global.window = global;
function load(p) { eval(fs.readFileSync(path.join(__dirname, '..', p), 'utf8')); }
['js/data/cards.js', 'js/data/cards_ep1.js', 'js/data/cards_npc.js', 'js/data/materials.js',
 'js/data/decks.js', 'js/data/dungeons.js', 'js/data/ladder.js',
 'js/core/battle.js', 'js/core/effects.js', 'js/core/effects_ep1.js', 'js/core/ai.js'].forEach(load);

const N = parseInt(process.argv[2] || '120', 10);
let pass = 0; const errors = [];
function ok(c, name, detail) { if (c) { pass++; return; } errors.push(name + (detail ? '　→ ' + detail : '')); }

function play(a, b, seed) {
  const g = SG.createGame(a, b, seed);
  let guard = 0;
  while (!g.over && guard++ < 300) {
    SG.beginTurn(g);
    if (g.over) break;
    SG.aiPlay(g, 0); SG.aiPlay(g, 1);
    SG.resolveTurn(g);
  }
  return g;
}

console.log('══════ 四副新手牌組兩兩對戰 ══════');
const D = SG.DECKS;
const W = {}, G = {};
D.forEach(d => { W[d.faction] = 0; G[d.faction] = 0; });
let turns = 0, games = 0, unfinished = 0;

for (let i = 0; i < D.length; i++) {
  for (let j = 0; j < D.length; j++) {
    if (i === j) continue;
    for (let k = 0; k < N; k++) {
      const g = play(D[i], D[j], 'bal' + i + '_' + j + '_' + k);
      if (!g.over) { unfinished++; continue; }
      W[g.winner === 0 ? D[i].faction : D[j].faction]++;
      G[D[i].faction]++; G[D[j].faction]++;
      turns += g.turn; games++;
    }
  }
}

const rate = f => W[f] * 100 / Math.max(1, G[f]);
const order = Object.keys(W).sort((a, b) => rate(b) - rate(a));
order.forEach(f => {
  console.log('  ' + SG.FACTIONS[f].name.padEnd(6) +
              rate(f).toFixed(1).padStart(5) + '%　(' + W[f] + '/' + G[f] + ')');
});
console.log('  平均回合 ' + (turns / Math.max(1, games)).toFixed(1) + '　樣本 ' + games + ' 場');

console.log('');
console.log('══════ 排序要符合 wiki 的說法 ══════');
ok(unfinished === 0, '所有對局都正常結束', unfinished + ' 場未結束');
ok(order[order.length - 1] === 'darklore',
   '暗黑族墊底（wiki：初期牌效果微妙）', '實際墊底的是 ' + SG.FACTIONS[order[order.length - 1]].name);
ok(rate('darklore') < 35, '暗黑族勝率明顯偏低（< 35%）', rate('darklore').toFixed(1) + '%');
ok(order.indexOf('crux') <= 1 && order.indexOf('academy') <= 1,
   '南十字與私立是前兩名', '實際前兩名：' + order.slice(0, 2).map(f => SG.FACTIONS[f].name).join('、'));
ok(order[2] === 'vita', '公立排第三', '實際第三名是 ' + SG.FACTIONS[order[2]].name);
ok(rate('crux') > 50 && rate('academy') > 50, '前兩名勝率過半');

console.log('');
console.log('══════ 對局長度合理 ══════');
{
  const avg = turns / Math.max(1, games);
  ok(avg > 4 && avg < 12, '平均回合數落在 4~12 之間', avg.toFixed(1));
}

console.log('');
console.log('══════ 沒有卡片會讓對局卡死 ══════');
{
  /* 每副天梯牌組也跑一輪，確認新加的 EP1 咒語不會造成無限迴圈或例外 */
  let bad = 0;
  SG.LADDER.forEach(foe => {
    const deck = SG.ladderDeck(foe);
    for (let k = 0; k < 12; k++) {
      try {
        const g = play(SG.DECKS[k % 4], deck, 'ld' + foe.id + k);
        if (!g.over) { bad++; errors.push(foe.name + ' 對局未結束'); }
      } catch (e) {
        bad++; errors.push(foe.name + ' 例外：' + e.message);
      }
    }
  });
  ok(bad === 0, '天梯 8 副牌組各打 12 場都正常');
}

console.log('');
console.log('通過 ' + pass + '　失敗 ' + errors.length);
if (errors.length) { errors.forEach(e => console.log('  ✗ ' + e)); process.exit(1); }
console.log('✔ 平衡檢查通過（排序與 wiki 的說法一致）');
