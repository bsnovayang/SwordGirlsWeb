/* jsdom UI 煙霧測試：載入 index.html，模擬點擊打完一整場 */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');

const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), {
  runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://localhost/'
});
const w = dom.window, d = w.document;

// 手動注入 script（jsdom 不會自動載相對路徑的 script）
['js/data/cards.js', 'js/data/cards_ep1.js', 'js/data/cards_ep2.js', 'js/data/cards_npc.js', 'js/data/materials.js', 'js/data/decks.js',
 'js/data/dungeons.js', 'js/data/ladder.js', 'js/data/quests.js', 'js/core/save.js', 'js/core/score.js', 'js/core/pack.js', 'js/core/battle.js',
 'js/core/effects.js', 'js/core/effects_ep1.js', 'js/core/effects_ep2.js', 'js/core/ai.js', 'js/ui/card_ui.js', 'js/ui/battle_ui.js',
 'js/ui/screen_deck.js', 'js/ui/screen_gallery.js', 'js/ui/screen_dungeon.js',
 'js/ui/screen_craft.js', 'js/ui/screen_pack.js', 'js/ui/screen_ladder.js', 'js/ui/screen_quest.js', 'js/main.js'].forEach(function (p) {
  const s = d.createElement('script');
  s.textContent = fs.readFileSync(path.join(root, p), 'utf8');
  d.body.appendChild(s);
});

const errors = [];
w.addEventListener('error', e => errors.push('window.error: ' + e.message));
const origErr = console.error;
console.error = function () {
  const m = Array.from(arguments).join(' ');
  if (/scrollTo|Not implemented/.test(m)) return;
  errors.push('console.error: ' + m);
};

d.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));

function click(id) { const el = d.getElementById(id); if (!el) throw new Error('找不到 #' + id); el.click(); }
function active() { return Array.from(d.querySelectorAll('.screen.active')).map(e => e.id).join(','); }

d.querySelector('[data-go="menu"]').click();
d.querySelector('[data-go="battle-setup"]').click();
console.log('畫面 →', active());
console.log('我方牌組選項 =', d.getElementById('selMine').options.length,
            '｜敵方 =', d.getElementById('selFoe').options.length);

// 速度切到「瞬間」，讓每步不再等待
d.getElementById('btnSpeed').click();
d.getElementById('btnSpeed').click();
console.log('速度 =', d.getElementById('btnSpeed').textContent);

d.getElementById('inpSeed').value = 'uitest';
click('btnStart');
console.log('畫面 →', active());

const g = w.SG.game;
console.log('回合', g.turn, '｜階段', g.phase);
console.log('我方場地格數 =', d.querySelectorAll('#fieldMine .slot').length, '（應為 6：角色 + Ⅰ~Ⅴ）');
console.log('敵方場地格數 =', d.querySelectorAll('#fieldFoe .slot').length);
console.log('手牌 DOM 卡片數 =', d.querySelectorAll('#hand .card').length);

const tick = () => new Promise(r => w.setTimeout(r, 0));

(async function () {
  let guard = 0, idle = 0;
  while (!g.over && guard++ < 400) {
    if (g.phase !== 'place') { await tick(); if (++idle > 80) break; continue; }
    idle = 0;
    for (let i = 0; i < 8; i++) {
      const c = d.querySelector('#hand .card:not(.unaffordable)');
      if (!c) break;
      c.click();
    }
    click('btnReady');
    await tick();
  }

  console.log('');
  console.log('結束？', g.over, '｜勝方', g.winner === 0 ? '我方' : '敵方',
              '｜原因', g.reason, '｜回合', g.turn);
  console.log('結算視窗顯示 =', d.getElementById('resultOverlay').classList.contains('show'));
  console.log('戰鬥紀錄行數 =', d.getElementById('log').children.length);
  console.log('我方剩餘生命 =', g.players[0].character.life,
              '｜敵方 =', g.players[1].character.life);

  const anyCard = d.querySelector('#fieldMine .card, #fieldFoe .card');
  if (anyCard) anyCard.dispatchEvent(new w.MouseEvent('mouseenter'));
  console.log('詳情面板有內容 =', d.getElementById('detail').textContent.trim().length > 10);

  g.players.forEach(function (p, i) {
    if (p.field.length !== 5) errors.push('玩家 ' + i + ' 場地長度 = ' + p.field.length + '（應為 5）');
  });
  if (!g.over) errors.push('對局未結束，卡在階段：' + g.phase);

  // ── 第二輪：非「瞬間」速度，驗證特效元素真的有被產生 ──
  const seen = { slash: 0, pop: 0, dying: 0, coin: 0, coinFace: '', coinBad: 0, coinSamples: 0, casting: 0, statFx: 0, acting: 0 };
  // 追蹤每張卡「顯示出來的體力」變化。
  // 卡片一旦體力歸零就會馬上被擊破離場，所以「顯示 0 之後又變正數」必定是顯示錯誤。
  const staSeen = {};        // uid → 最後看到的顯示值
  const zeroThenAlive = [];  // 出現症狀的卡
  function sampleSta() {
    d.querySelectorAll('.field .card:not(.is-char)').forEach(el => {
      const n = el.querySelector('.st-sta');
      if (!n) return;
      const uid = el.dataset.uid, v = parseInt(n.textContent, 10);
      if (isNaN(v)) return;
      if (staSeen[uid] === 0 && v > 0) {
        zeroThenAlive.push(uid + ' 顯示 0 後又變成 ' + v);
      }
      staSeen[uid] = v;
    });
  }
  const obs = new w.MutationObserver(function (recs) {
    recs.forEach(function (r) {
      Array.prototype.forEach.call(r.addedNodes, function (n) {
        if (!n.classList) return;
        if (n.classList.contains('slash')) seen.slash++;
        if (n.classList.contains('pop-num')) seen.pop++;
      });
      if (r.type === 'attributes' && r.target.classList &&
          r.target.classList.contains('dying')) seen.dying++;
    });
  });
  obs.observe(d.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  const sp = d.getElementById('btnSpeed');
  for (let i = 0; i < 8 && !/快速/.test(sp.textContent); i++) sp.click();
  console.log('第二輪速度 =', sp.textContent);

  d.getElementById('inpSeed').value = 'fxtest';
  click('btnStart');
  const g2 = w.SG.game;
  const sleep = ms => new Promise(r => w.setTimeout(r, ms));
  for (let n = 0; n < 2500 && !g2.over; n++) {
    if (g2.phase === 'place') {
      for (let i = 0; i < 8; i++) {
        const c = d.querySelector('#hand .card:not(.unaffordable)');
        if (!c) break;
        c.click();
      }
      click('btnReady');
    }
    if (d.querySelector('.card.dying')) seen.dying++;
    if (d.querySelector('.card.casting')) seen.casting++;
    if (d.querySelector('.card.stat-up, .card.stat-down')) seen.statFx++;
    if (d.querySelector('.card.acting')) seen.acting++;
    sampleSta();
    const cf = d.getElementById('coinFx');
    if (cf.classList.contains('show')) {
      seen.coin++;
      const lab = d.getElementById('coinLabel').textContent;
      seen.coinFace = lab;
      const endDeg = parseInt(d.getElementById('coin').style.getPropertyValue('--coin-end'), 10);
      if (!isNaN(endDeg)) {
        seen.coinSamples++;
        // 我方＝停在正面(360 的倍數)；敵方＝多半圈
        const wantBack = /敵方/.test(lab);
        const isBack = (endDeg % 360) === 180;
        if (wantBack !== isBack) seen.coinBad++;
      }
    }
    await sleep(20);
  }
  obs.disconnect();
  const killLines = Array.from(d.getElementById('log').children).filter(function (x) { return /✕/.test(x.textContent); }).length;
  console.log('第二場 → 回合', g2.turn, '｜結束', g2.over, '｜擊破紀錄行數', killLines);
  console.log('特效計數 → 刀光', seen.slash, '｜跳字', seen.pop, '｜陣亡淡出', seen.dying,
              '｜擲硬幣', seen.coin, JSON.stringify(seen.coinFace));
  console.log('　　　　 → 效果亮光', seen.casting, '｜數值閃爍', seen.statFx, '｜行動高亮', seen.acting);
  if (!seen.slash) errors.push('攻擊時沒有產生刀光元素');
  if (!seen.pop) errors.push('受傷時沒有產生跳字元素');
  if (killLines > 0 && !seen.dying) errors.push('有卡片被擊破，但沒有觸發陣亡淡出');
  if (!seen.coin) errors.push('擲硬幣時沒有播放動畫');
  if (!seen.casting) errors.push('效果發動時卡片沒有亮起來');
  if (!seen.statFx) errors.push('數值增減時卡片沒有閃爍');
  if (!seen.acting) errors.push('行動中的卡片沒有高亮');
  console.log('體力顯示異常（0 之後又回升）=', zeroThenAlive.length);
  if (zeroThenAlive.length) {
    errors.push('體力顯示錯誤 ' + zeroThenAlive.length + ' 次：' + zeroThenAlive.slice(0, 3).join('；'));
  }
  if (!/先/.test(seen.coinFace)) errors.push('硬幣標籤內容不正確：' + seen.coinFace);
  if (d.getElementById('coinFx').classList.contains('show')) errors.push('硬幣動畫結束後沒有收起');
  if (seen.coinBad) errors.push('硬幣停下的那一面與結果不符 ' + seen.coinBad + '/' + seen.coinSamples + ' 次');
  console.log('硬幣落面正確 =', seen.coinSamples - seen.coinBad, '/', seen.coinSamples);

  // ── 懸停預覽 ──
  const hov = d.querySelector('#hand .card') || d.querySelector('.card');
  hov.dispatchEvent(new w.MouseEvent('mouseenter', { clientX: 200, clientY: 200 }));
  const tip = d.getElementById('cardTip');
  console.log('懸停預覽出現 =', !!tip && tip.classList.contains('show'));
  console.log('預覽內容含效果欄 =', !!tip && /t-eff/.test(tip.innerHTML));
  if (!tip || !tip.classList.contains('show')) errors.push('懸停時預覽沒有出現');
  hov.dispatchEvent(new w.MouseEvent('mouseleave'));
  console.log('移開後收起 =', !tip.classList.contains('show'));
  if (tip.classList.contains('show')) errors.push('滑鼠移開後預覽沒有收起');

  console.error = origErr;
  if (errors.length) {
    console.log('');
    console.log('!! 錯誤:');
    errors.forEach(e => console.log('  ' + e));
    process.exit(1);
  }
  console.log('');
  console.log('✔ UI 煙霧測試通過');
})();
