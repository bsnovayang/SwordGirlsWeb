/* AI 強度對照：node test/ai.js [場數] */
const fs = require('fs'), path = require('path');
global.window = global;
function load(p) { eval(fs.readFileSync(path.join(__dirname, '..', p), 'utf8')); }
['js/data/cards.js', 'js/data/cards_ep1.js', 'js/data/cards_ep2.js', 'js/data/cards_ep3.js', 'js/data/cards_npc.js', 'js/data/materials.js', 'js/data/decks.js',
 'js/data/dungeons.js', 'js/core/battle.js', 'js/core/effects.js', 'js/core/effects_ep1.js', 'js/core/effects_ep2.js', 'js/core/effects_ep3.js', 'js/core/ai.js'].forEach(load);

const N = parseInt(process.argv[2] || '120', 10);

/* 可重現的亂數，讓對照結果穩定 */
function rngFrom(seed) {
  let a = 0;
  for (const ch of String(seed)) { a = (Math.imul(a ^ ch.charCodeAt(0), 16777619)) >>> 0; }
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* 打一場：ai0 / ai1 各自是 'basic' 或 'smart' */
function play(deckA, deckB, seed, ai0, ai1) {
  const g = SG.createGame(deckA, deckB, seed);
  const rnd = rngFrom('ai' + seed);
  let guard = 0;
  while (!g.over && guard++ < 300) {
    SG.beginTurn(g);
    if (g.over) break;
    /* 玩家先下牌、AI 後下 —— 跟實際遊戲流程一致 */
    run(ai0, 0); run(ai1, 1);
    SG.resolveTurn(g);
  }
  return g;

  function run(level, pi) {
    if (level === 'smart') SG.aiPlaySmart(g, pi, { plans: 40, rollouts: 5, rnd: rnd });
    else SG.aiPlay(g, pi);
  }
}

function series(label, ai0, ai1, n) {
  const t0 = Date.now();
  let w0 = 0, w1 = 0, turns = 0, unfinished = 0;
  for (let i = 0; i < n; i++) {
    const a = SG.DECKS[i % SG.DECKS.length];
    const b = SG.DECKS[(i + 1 + (i % 3)) % SG.DECKS.length];
    const g = play(a, b, 'm' + i, ai0, ai1);
    if (!g.over) { unfinished++; continue; }
    turns += g.turn;
    if (g.winner === 0) w0++; else w1++;
  }
  const rate = (w1 * 100 / Math.max(1, w0 + w1)).toFixed(1);
  console.log(label.padEnd(26) +
    '座位A(' + ai0 + ') ' + String(w0).padStart(3) +
    '　座位B(' + ai1 + ') ' + String(w1).padStart(3) +
    '　B 勝率 ' + rate.padStart(5) + '%' +
    '　平均 ' + (turns / Math.max(1, w0 + w1)).toFixed(1) + ' 回合' +
    '　' + (Date.now() - t0) + 'ms');
  return { w0, w1, rate: +rate, unfinished };
}

console.log('══════ 公平性：AI 不偷看對手蓋的牌 ══════');
{
  /* 同一個局面，只有「對手這回合蓋了什麼」不同。
     smart 的決策必須完全一樣 —— 一樣代表它沒有用到那份資訊。 */
  function decide(foeCards) {
    const g = SG.createGame(SG.DECKS[2], SG.DECKS[1], 'fair');
    SG.beginTurn(g);
    /* 對手（座位 0）蓋牌：依參數決定蓋幾張、蓋什麼 */
    foeCards.forEach(() => { if (SG.canPlace(g, 0, 0)) SG.place(g, 0, 0); });
    SG.aiPlaySmart(g, 1, { plans: 24, rollouts: 4, rnd: rngFrom('fairseed') });
    return g.players[1].field.map(c => (c ? c.id : '-')).join(',');
  }
  const none = decide([]);
  const one = decide([1]);
  const three = decide([1, 1, 1]);
  console.log('  對手蓋 0 張 → AI 下：' + none);
  console.log('  對手蓋 1 張 → AI 下：' + one);
  console.log('  對手蓋 3 張 → AI 下：' + three);
  const same = none === one && one === three;
  console.log((same ? '✔ ' : '✗ ') + 'AI 的決策不受「對手蓋了什麼」影響');
  if (!same) process.exitCode = 1;
}

console.log('');
console.log('══════ 對照組：兩邊同強度（應接近 50%）══════');
const baseline = series('basic vs basic', 'basic', 'basic', N);
const mirror = series('smart vs smart', 'smart', 'smart', N);

console.log('');
console.log('══════ 強度對照：smart 坐 B 位 ══════');
const test = series('basic vs smart', 'basic', 'smart', N);

console.log('');
console.log('══════ 反過來坐，排除座位優勢 ══════');
const rev = series('smart vs basic', 'smart', 'basic', N);

console.log('');
let fail = 0;
function check(cond, msg) { console.log((cond ? '✔ ' : '✗ ') + msg); if (!cond) fail++; }

check(baseline.unfinished === 0 && test.unfinished === 0, '所有對局都正常結束');
check(Math.abs(baseline.rate - 50) < 15,
      '對照組接近五五波（basic vs basic B 勝率 ' + baseline.rate + '%）');
check(Math.abs(mirror.rate - 50) < 15,
      'smart 互打也接近五五波（' + mirror.rate + '%）');
check(test.rate > 60,
      'smart 坐 B 位時明顯較強（勝率 ' + test.rate + '% > 60%）');
check(rev.rate < 40,
      '換邊坐一樣強（smart 坐 A 位時 B 勝率 ' + rev.rate + '% < 40%）');

const smartWinRate = ((test.w1 + rev.w0) * 100 / Math.max(1, test.w0 + test.w1 + rev.w0 + rev.w1));
console.log('');
console.log('smart 對 basic 的整體勝率：' + smartWinRate.toFixed(1) + '%（' + (N * 2) + ' 場）');
check(smartWinRate > 60, 'smart 整體勝率超過 60%');

if (fail) process.exit(1);
console.log('');
console.log('✔ AI 強度測試通過');
