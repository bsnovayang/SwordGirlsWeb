/* 無瀏覽器的引擎煙霧測試：node test/sim.js [場數] */
const fs = require('fs');
const path = require('path');
global.window = global;
function load(p) { eval(fs.readFileSync(path.join(__dirname, '..', p), 'utf8')); }
load('js/data/cards.js');
load('js/data/cards_ep1.js');
load('js/data/cards_ep2.js');
load('js/data/cards_npc.js');
load('js/data/materials.js');
load('js/data/decks.js');
load('js/data/dungeons.js');
load('js/core/battle.js');
load('js/core/effects.js');
load('js/core/effects_ep1.js');
load('js/core/effects_ep2.js');
load('js/core/ai.js');

const N = parseInt(process.argv[2] || '200', 10);
let stats = { turns: 0, wins: [0, 0], reasons: {}, maxTurn: 0, errors: 0 };
let counterThenAttack = 0;   // 反擊過、之後仍輪到自己主動攻擊的次數

for (const d of SG.DECKS) {
  const errs = SG.validateDeck(d);
  console.log((errs.length ? 'X ' : 'V ') + d.name + '  ' + d.cards.length + ' 張  ' +
    SG.deckPoints(d) + ' 點' + (errs.length ? '  → ' + errs.join(' / ') : ''));
}

for (let i = 0; i < N; i++) {
  const a = SG.DECKS[i % SG.DECKS.length];
  const b = SG.DECKS[(i + 1 + (i % 3)) % SG.DECKS.length];
  try {
    const g = SG.createGame(a, b, 'seed' + i);
    let guard = 0;
    while (!g.over && guard++ < 300) {
      SG.beginTurn(g);
      if (g.over) break;
      const before = [0, 1].map(pi => ({
        size: SG.fieldSize(g.players[pi].field),
        cards: g.players[pi].field.filter(Boolean).length
      }));
      SG.aiPlay(g, 0);
      SG.aiPlay(g, 1);
      assertPlacement(g, before);
      const turnEv = SG.resolveTurn(g);
      assertActions(turnEv);
      assertField(g);         // 結算後：效果可能把 SIZE 推過 10，這是規則允許的
    }
    if (!g.over) { console.log('!! 第 ' + i + ' 場未結束（回合上限）'); stats.errors++; continue; }
    stats.turns += g.turn;
    stats.maxTurn = Math.max(stats.maxTurn, g.turn);
    stats.wins[g.winner]++;
    stats.reasons[g.reason] = (stats.reasons[g.reason] || 0) + 1;
  } catch (e) {
    stats.errors++;
    console.log('!! 第 ' + i + ' 場例外: ' + e.message + '\n' + e.stack.split('\n')[1]);
  }
}

// 每回合的行動次數不變量：
//   · 每張卡「主動攻擊」最多一次
//   · 反擊是額外攻擊，不消耗自己的主動攻擊 —— 所以同一張卡
//     可以先反擊、之後仍輪到自己攻擊（統計 counterThenAttack 佐證）
function assertActions(ev) {
  const attacked = {}, countered = {};
  for (const e of ev) {
    if (e.t === 'attack' || e.t === 'direct') {
      const uid = e.card.uid;
      if (attacked[uid]) throw new Error('同一張卡一回合主動攻擊兩次：' + e.card.name);
      attacked[uid] = true;
      if (countered[uid]) counterThenAttack++;
    } else if (e.t === 'counter') {
      countered[e.card.uid] = true;
    }
  }
}

// 下牌階段的不變量。
// 場上 SIZE 可能「上一回合就被效果推過 10」並延續到這一回合，
// 所以不能直接斷言 ≤10；要斷言的是「下牌本身不得違規」：
//   · 開始下牌時已經 >10 → 這回合一張都不能放
//   · 開始下牌時 ≤10     → 放完之後也必須 ≤10
function assertPlacement(g, before) {
  for (let pi = 0; pi < 2; pi++) {
    const now = SG.fieldSize(g.players[pi].field);
    const cards = g.players[pi].field.filter(Boolean).length;
    if (before[pi].size > SG.CONST.SIZE_MAX) {
      if (cards !== before[pi].cards) {
        throw new Error('SIZE 已 ' + before[pi].size + '（>10）卻還放了牌');
      }
    } else if (now > SG.CONST.SIZE_MAX) {
      throw new Error('下牌讓 SIZE 從 ' + before[pi].size + ' 變成 ' + now + '（超過 10）');
    }
  }
}

// 結算後的檢查。
// ★ 注意：SIZE 總和「可以」超過 10 —— 原版規則就是這樣寫的：
//   效果可以把總和推過 10（例如 料理失敗 SIZE+1、嫁禍 重分配 SIZE），
//   只是在降回 10 以下之前不能再下牌。所以這裡不檢查 SIZE 上限，
//   改成檢查「超過 10 時確實下不了牌」。
function assertField(g) {
  for (const p of g.players) {
    if (p.field.length !== 5) throw new Error('場地長度變成 ' + p.field.length + '（禁止壓縮！）');
    if (p.character.life < 0) throw new Error('生命為負');
    for (let i = 0; i < 5; i++) {
      const c = p.field[i];
      if (c && c.type === 'follower' && c.sta <= 0) {
        throw new Error('體力 ' + c.sta + ' 的隨從還留在場上：' + c.name);
      }
    }
  }
  for (let pi = 0; pi < 2; pi++) {
    if (SG.fieldSize(g.players[pi].field) <= SG.CONST.SIZE_MAX) continue;
    const saved = g.phase;
    g.phase = 'place';
    for (let h = 0; h < g.players[pi].hand.length; h++) {
      if (SG.canPlace(g, pi, h)) { g.phase = saved; throw new Error('SIZE 已超過 10 卻還能下牌'); }
    }
    g.phase = saved;
  }
}

// 回合流程結構檢查：擲硬幣必須在「確定」之後，且在任何能力/攻擊之前
{
  const g = SG.createGame(SG.DECKS[0], SG.DECKS[1], 'ordercheck');
  const pre = SG.beginTurn(g);
  if (pre.some(e => e.t === 'coin')) console.log('X 抽牌/下牌階段不應該擲硬幣');
  if (pre[pre.length - 1].phase !== 'place') console.log('X beginTurn 應停在下牌階段');
  SG.aiPlay(g, 0); SG.aiPlay(g, 1);
  const post = SG.resolveTurn(g);
  const iCoin = post.findIndex(e => e.t === 'coin');
  const iReveal = post.findIndex(e => e.t === 'reveal');
  const iAct = post.findIndex(e => e.t === 'activate' || e.t === 'ability');
  console.log('確定後事件順序 → 翻開 #' + iReveal + '　擲硬幣 #' + iCoin + '　首次行動 #' + iAct);
  if (iCoin < 0) console.log('X 確定後沒有擲硬幣');
  if (!(iReveal < iCoin)) console.log('X 應該先翻開再擲硬幣');
  if (iAct >= 0 && !(iCoin < iAct)) console.log('X 擲硬幣必須早於任何能力/行動');
}

// 同牌組鏡像對戰：檢查引擎本身有無「座位偏差」
let mirror = [0, 0];
for (const d of SG.DECKS) {
  for (let i = 0; i < 60; i++) {
    const g = SG.createGame(d, d, 'mirror' + d.name + i);
    let guard = 0;
    while (!g.over && guard++ < 300) {
      SG.beginTurn(g); if (g.over) break;
      SG.aiPlay(g, 0); SG.aiPlay(g, 1); SG.resolveTurn(g);
    }
    if (g.over) mirror[g.winner]++;
  }
}

console.log('\n── ' + N + ' 場模擬 ──');
console.log('平均回合 ' + (stats.turns / Math.max(1, N)).toFixed(1) + '　最長 ' + stats.maxTurn);
console.log('座位 A 勝 ' + stats.wins[0] + '　座位 B 勝 ' + stats.wins[1] + '（雙方牌組不同，僅供參考）');
console.log('反擊後仍取得自己攻擊的次數 ' + counterThenAttack + '（應 > 0）');
if (!counterThenAttack) { console.log('X 反擊似乎消耗掉了主動攻擊'); stats.errors++; }
console.log('鏡像對戰 ' + (mirror[0] + mirror[1]) + ' 場 → A ' + mirror[0] + ' : B ' + mirror[1] + '（應接近 1:1）');
console.log('勝負原因 ' + JSON.stringify(stats.reasons, null, 0));
console.log('錯誤 ' + stats.errors);
process.exit(stats.errors ? 1 : 0);
