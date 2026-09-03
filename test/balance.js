/* 平衡檢查：node test/balance.js [每組合場數]

   繁中 wiki 的 FAQ「一開始要選擇什麼勢力？」直接寫過新手牌組的強弱：
     「初期牌組比較好上手的是南十字(強化為主)，其次是私立(弱化、搗亂)、
       公立(強化、弱化、搗亂皆有)，最後是暗黑族(初期牌效果微妙)。」

   所以這裡不是要把四副牌組調成五五波 —— 那反而不忠實。

   ── 2026-09 修正 ──
   原本這支測試直接斷言「勝率排序＝上面那句話的排序」，而且它通過了。
   後來把 `新入騎士團員` 與 `騎士團的旗手佛雷特` 從估算值換成英文 wiki 的
   真實數值（STA 6→3、ATK 5→3），南十字就從第二名掉到第三名：

       修正前  私立 63% / 南十字 61% / 公立 52% / 暗黑 24%
       修正後  私立 66% / 公立 56% / 南十字 50% / 暗黑 28%

   也就是說，先前的「吻合」是靠我估高的那兩張卡撐出來的，不是真的吻合。
   查證過牌組組成沒錯、71 張有效果的卡也全部實作，所以不是實作出包。

   合理的解釋是：wiki 那句話講的是**上手難易度**（南十字「強化為主」單純好操作），
   不等於對上 AI 的原始勝率；而且這裡的 AI 不會像人一樣安排強化順序。

   因此改成兩件事：
     1. 只斷言 wiki 明確講死的部分 —— 暗黑族墊底。
     2. 把實測勝率記成基準線，容許 ±7 個百分點。
        這樣「有人把某張卡的效果寫壞」一樣抓得到，
        但不會再假裝那個排序是資料推出來的。
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
console.log('══════ wiki 明確講死的部分 ══════');
ok(unfinished === 0, '所有對局都正常結束', unfinished + ' 場未結束');
ok(order[order.length - 1] === 'darklore',
   '暗黑族墊底（wiki：初期牌效果微妙）', '實際墊底的是 ' + SG.FACTIONS[order[order.length - 1]].name);
ok(rate('darklore') < 35, '暗黑族勝率明顯偏低（< 35%）', rate('darklore').toFixed(1) + '%');

console.log('');
console.log('══════ 勝率基準線（抓效果被改壞）══════');
{
  /* 實測值，資料來源已與英文 wiki 對齊後量測。容許 ±7 個百分點。 */
  const BASE = { academy: 66.0, vita: 56.5, crux: 49.9, darklore: 27.6 };
  const TOL = 7;
  Object.keys(BASE).forEach(f => {
    const d = rate(f) - BASE[f];
    ok(Math.abs(d) <= TOL,
       SG.FACTIONS[f].name + ' 勝率仍在基準線附近（' + BASE[f] + '% ±' + TOL + '）',
       '實測 ' + rate(f).toFixed(1) + '%，偏離 ' + d.toFixed(1) + ' 個百分點');
  });
}

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
console.log('✔ 平衡檢查通過（暗黑族墊底，且四陣營勝率都在基準線內）');
