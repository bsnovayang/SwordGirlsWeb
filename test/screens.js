/* P3 畫面測試：大廳 / 牌組編輯 / 卡片圖鑑 / 存檔　　node test/screens.js */
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');

const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), {
  runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://localhost/'
});
const w = dom.window, d = w.document;

['js/data/cards.js', 'js/data/cards_ep1.js', 'js/data/cards_npc.js', 'js/data/materials.js', 'js/data/decks.js',
 'js/data/dungeons.js', 'js/data/ladder.js', 'js/data/quests.js', 'js/core/save.js', 'js/core/score.js', 'js/core/pack.js', 'js/core/battle.js',
 'js/core/effects.js', 'js/core/effects_ep1.js', 'js/core/ai.js', 'js/ui/card_ui.js', 'js/ui/battle_ui.js',
 'js/ui/screen_deck.js', 'js/ui/screen_gallery.js', 'js/ui/screen_dungeon.js',
 'js/ui/screen_craft.js', 'js/ui/screen_pack.js', 'js/ui/screen_ladder.js', 'js/ui/screen_quest.js', 'js/main.js'].forEach(function (p) {
  const s = d.createElement('script');
  s.textContent = fs.readFileSync(path.join(root, p), 'utf8');
  d.body.appendChild(s);
});

const errors = [];
const origErr = console.error;
console.error = function () {
  const m = Array.from(arguments).join(' ');
  if (/scrollTo|Not implemented/.test(m)) return;
  errors.push('console.error: ' + m);
};
w.addEventListener('error', e => errors.push('window.error: ' + e.message));

let pass = 0;
function ok(cond, name, detail) {
  if (cond) { pass++; return; }
  errors.push(name + (detail ? '　→ ' + detail : ''));
}
function eq(a, b, name) { ok(a === b, name, '得到 ' + JSON.stringify(a) + '，預期 ' + JSON.stringify(b)); }
const $ = id => d.getElementById(id);
const active = () => Array.from(d.querySelectorAll('.screen.active')).map(e => e.id).join(',');

d.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));

console.log('══════ 頁面結構完整 ══════');
{
  // 每個畫面與關鍵元件都要在。之前改 index.html 時整段刪掉過畫面，加這層防呆。
  ['scr-title', 'scr-menu', 'scr-battle-setup', 'scr-battle', 'scr-rules',
   'scr-deck', 'scr-gallery', 'scr-dungeon', 'scr-floor', 'scr-craft', 'scr-pack',
   'scr-ladder', 'scr-quest', 'scr-settings'
  ].forEach(id => ok(!!$(id), '畫面存在：' + id));
  ['fieldMine', 'fieldFoe', 'hand', 'log', 'coinFx', 'btnReady', 'btnShuffle',
   'btnSpeed', 'btnQuit', 'resultOverlay', 'btnAgain', 'detail', 'rulesBody',
   'toast', 'saveStatus', 'btnReset', 'saveText', 'btnExport', 'btnImport',
   'pkTickets', 'btnPull1', 'btnPull10', 'pkResult', 'pkSpareList', 'btnDisAll'
  ].forEach(id => ok(!!$(id), '元件存在：' + id));

  // 從大廳點進去的畫面，返回鈕都要回大廳（不是回標題）
  ['scr-battle-setup', 'scr-dungeon', 'scr-deck', 'scr-gallery', 'scr-craft',
   'scr-pack', 'scr-ladder', 'scr-quest', 'scr-settings']
    .forEach(id => {
      const backs = Array.from($(id).querySelectorAll('[data-go]'))
        .filter(b => /返回|回大廳|回標題/.test(b.textContent));
      ok(backs.length > 0, id + ' 有返回鈕');
      ok(backs.some(b => b.dataset.go === 'menu'),
         id + ' 的返回鈕要回大廳',
         backs.map(b => b.textContent.trim() + '→' + b.dataset.go).join(', '));
    });
}

console.log('══════ 初始存檔 ══════');
{
  const s = w.SG.Save.data;
  eq(s.decks.length, 4, '預設有 4 副新手牌組');
  const kinds = Object.keys(s.owned).length;
  const collectible = w.SG.collectibleCards().length;
  eq(kinds, 56, '初始持有 Episode 0 的 56 種卡');
  eq(collectible, 122, '可收集卡片 122 種（EP0 的 56 + 5 張副本獎勵 + EP1 的 61）');
  ok(w.SG.allCards().length > collectible, 'NPC 卡不算在可收集之列');
  s.decks.forEach(dk => {
    ok(w.SG.deckErrors(dk).length === 0, '預設牌組可用：' + dk.name,
       w.SG.deckErrors(dk).join(' / '));
  });
}

console.log('══════ 大廳 ══════');
{
  d.querySelector('[data-go="menu"]').click();
  eq(active(), 'scr-menu', '進入大廳');
  ok($('lbDeck').textContent.length > 0, '顯示使用中牌組');
  ok(/\d+（\d+ 種）/.test($('lbCards').textContent), '顯示持有卡片數：' + $('lbCards').textContent);
}

console.log('══════ 牌組編輯 ══════');
{
  d.querySelector('[data-go="deck"]').click();
  eq(active(), 'scr-deck', '進入牌組編輯');
  eq(d.querySelectorAll('#deckList li').length, 4, '左欄列出 4 副牌組');
  const poolBefore = d.querySelectorAll('#poolList .crow').length;
  ok(poolBefore > 0, '庫存有卡片：' + poolBefore + ' 種');

  // 篩選
  $('fFaction').value = 'crux';
  $('fFaction').dispatchEvent(new w.Event('change'));
  const cruxRows = Array.from(d.querySelectorAll('#poolList .crow'));
  ok(cruxRows.length > 0 && cruxRows.every(r => r.classList.contains('f-crux')),
     '陣營篩選只留下南十字：' + cruxRows.length + ' 種');
  $('fType').value = 'spell';
  $('fType').dispatchEvent(new w.Event('change'));
  const spellRows = Array.from(d.querySelectorAll('#poolList .crow'));
  eq(spellRows.length, 5, '再加類型篩選 → 南十字咒語 5 種');
  $('fText').value = '治癒';
  $('fText').dispatchEvent(new w.Event('input'));
  eq(d.querySelectorAll('#poolList .crow').length, 1, '關鍵字搜尋「治癒」→ 1 張');
  $('fFaction').value = ''; $('fType').value = ''; $('fText').value = '';
  $('fText').dispatchEvent(new w.Event('input'));

  // 新增牌組 → 應為不可用（空的）
  w.prompt = () => '測試牌組';
  $('btnDeckNew').click();
  eq(d.querySelectorAll('#deckList li').length, 5, '新增後有 5 副');
  const dk = w.SG.Save.data.decks[4];
  eq(dk.cards.length, 0, '新牌組是空的');
  ok(w.SG.deckErrors(dk).length > 0, '空牌組被判定為不可用');

  // 從庫存加牌：加同一張直到達上限
  const first = d.querySelector('#poolList .crow:not(.disabled)');
  const slug = first.dataset.slug;
  const card = w.SG.getCard(slug);
  const cap = Math.min(card.limit, w.SG.Save.data.owned[slug]);
  for (let i = 0; i < cap + 3; i++) {
    const row = d.querySelector('#poolList .crow[data-slug="' + slug + '"]');
    if (!row || row.classList.contains('disabled')) break;
    row.click();
  }
  const used = dk.cards.filter(s => s === slug).length + (dk.character === slug ? 1 : 0);
  eq(used, cap, '同名卡加到上限就停（' + card.name + ' 上限 ' + cap + '）');
  const rowNow = d.querySelector('#poolList .crow[data-slug="' + slug + '"]');
  ok(rowNow.classList.contains('disabled'), '達上限後該列變成不可點');

  // 移除
  if (card.type !== 'character') {
    const before = dk.cards.length;
    d.querySelector('#deckCards .crow[data-slug="' + slug + '"]').click();
    eq(dk.cards.length, before - 1, '點目前牌組的卡片可移除一張');
  }

  // 30 張上限
  const dk2 = w.SG.Save.data.decks[4];
  const pool = w.SG.allCards().filter(c => c.type !== 'character');
  for (const c of pool) {
    while (w.SG.Save.canAdd(dk2, c.slug) > 0 && dk2.cards.length < 40) {
      if (!w.SG.Save.addCard(dk2, c.slug)) break;
    }
    if (dk2.cards.length >= 30) break;
  }
  eq(dk2.cards.length, 30, '牌組張數不會超過 30');
  ok(!w.SG.Save.addCard(dk2, pool[0].slug), '滿 30 張後加不進去');

  // 缺角色卡 → 應該提示
  dk2.character = null;
  w.SG.Save.save();
  ok(w.SG.deckErrors(dk2).some(e => /角色卡/.test(e)), '缺角色卡時會提示');
  w.SG.Save.addCard(dk2, 'sita_vilosa');
  w.SG.renderDeckScreen();
  eq(w.SG.deckErrors(dk2).length, 0, '補上角色卡後牌組可用');

  // 設為使用中
  $('btnDeckUse').click();
  eq(w.SG.Save.data.activeDeck, 4, '可以把牌組設為使用中');

  // 刪除
  const n = w.SG.Save.data.decks.length;
  w.confirm = () => true;
  $('btnDeckDel').click();
  eq(w.SG.Save.data.decks.length, n - 1, '可以刪除牌組');
}

console.log('══════ 陣營限制 ══════');
{
  d.querySelector('[data-go="deck"]').click();
  const S = w.SG.Save;

  // 全新牌組：沒角色卡時只能挑角色卡
  S.newDeck('陣營測試');
  const dk = S.data.decks[S.data.decks.length - 1];
  ok(!S.factionOk(dk, w.SG.getCard('cook_club_student')), '沒選角色卡時放不了隨從');
  ok(S.factionOk(dk, w.SG.getCard('sita_vilosa')), '沒選角色卡時可以挑角色卡');
  ok(!S.addCard(dk, 'cook_club_student'), 'addCard 會擋下來');

  // 選了公立角色 → 只能放公立
  S.addCard(dk, 'sita_vilosa');
  eq(S.deckFaction(dk), 'vita', '牌組陣營由角色卡決定');
  ok(S.addCard(dk, 'cook_club_student'), '同陣營的卡放得進去');
  ok(!S.addCard(dk, 'new_maid'), '別的陣營（私立）放不進去');
  eq(S.canAdd(dk, 'new_maid'), 0, '別的陣營 canAdd = 0');
  ok(!S.addCard(dk, 'crux_knight_terra'), '南十字也放不進去');

  // 畫面：庫存預設只列出可放的卡
  w.SG.renderDeckScreen();                       // 新牌組是用 API 建的，先讓清單重畫
  const sel = S.data.decks.indexOf(dk);
  Array.from(d.querySelectorAll('#deckList li'))[sel].click();
  $('fFaction').value = '';
  $('fFaction').dispatchEvent(new w.Event('change'));
  const rows = Array.from(d.querySelectorAll('#poolList .crow'));
  const bad = rows.filter(r => {
    const c = w.SG.getCard(r.dataset.slug);
    return c.type !== 'character' && c.faction !== 'vita' && c.faction !== 'neutral';
  });
  eq(bad.length, 0, '庫存不會列出別陣營的隨從／咒語');
  ok(/公立學校/.test($('poolFaction').textContent), '有顯示牌組陣營：' + $('poolFaction').textContent);

  // 主動篩別的陣營 → 顯示但標為不可用，並說明原因
  $('fFaction').value = 'crux';
  $('fFaction').dispatchEvent(new w.Event('change'));
  const cruxRow = d.querySelector('#poolList .crow[data-slug="crux_knight_terra"]');
  ok(!!cruxRow, '主動篩選南十字時仍看得到（不會憑空消失）');
  ok(cruxRow.classList.contains('disabled'), '但標成不可用');
  cruxRow.dispatchEvent(new w.MouseEvent('mouseenter', { clientX: 300, clientY: 300 }));
  ok(/陣營不符/.test($('cardTip').textContent), '預覽說明原因：' +
     ($('cardTip').querySelector('.t-hint') || {}).textContent);
  cruxRow.dispatchEvent(new w.MouseEvent('mouseleave'));
  $('fFaction').value = '';
  $('fFaction').dispatchEvent(new w.Event('change'));

  // 換成別陣營的角色卡 → 原本的卡變成不符，可一鍵清除
  dk.character = 'luthica_preventer';       // 直接改，模擬換角色卡
  S.save();
  w.SG.renderDeckScreen();
  ok(w.SG.deckErrors(dk).some(e => /陣營不符/.test(e)), '換角色卡後會回報陣營不符');
  const dropBtn = $('btnDropFaction');
  ok(!!dropBtn, '出現「移除不符陣營」的按鈕：' + (dropBtn ? dropBtn.textContent : ''));
  dropBtn.click();
  eq(dk.cards.length, 0, '一鍵移除掉不符陣營的卡');
  ok(!w.SG.deckErrors(dk).some(e => /陣營不符/.test(e)), '清完就不再回報陣營問題');

  // 預設四副新手牌組本來就是純陣營
  S.data.decks.slice(0, 4).forEach(deck => {
    const f = S.deckFaction(deck);
    const mixed = deck.cards.filter(sl => {
      const c = w.SG.getCard(sl);
      return c.faction !== f && c.faction !== 'neutral';
    });
    eq(mixed.length, 0, '新手牌組是純陣營：' + deck.name);
  });

  S.deleteDeck(S.data.decks.indexOf(dk));
  w.SG.renderDeckScreen();
}

console.log('══════ 懸停預覽 ══════');
{
  d.querySelector('[data-go="deck"]').click();
  const tipOf = () => $('cardTip');

  // 卡片庫存
  const poolRow = d.querySelector('#poolList .crow');
  const slug = poolRow.dataset.slug;
  const card = w.SG.getCard(slug);
  poolRow.dispatchEvent(new w.MouseEvent('mouseenter', { clientX: 300, clientY: 300 }));
  let tip = tipOf();
  ok(!!tip && tip.classList.contains('show'), '庫存卡片：滑鼠移上去會出現預覽');
  ok(tip.textContent.indexOf(card.name) >= 0, '預覽顯示的是正確的卡：' + card.name);
  ok(/t-eff/.test(tip.innerHTML), '預覽含效果欄');
  ok(/持有/.test(tip.textContent), '預覽顯示持有數');
  ok(/點一下加入牌組/.test(tip.textContent), '預覽含操作提示：' +
     (tip.querySelector('.t-hint') || {}).textContent);
  ok(!poolRow.getAttribute('title'), '沒有留下會跟預覽重疊的原生 title');
  poolRow.dispatchEvent(new w.MouseEvent('mouseleave'));
  ok(!tip.classList.contains('show'), '移開後收起');

  // 目前牌組
  const deckRow = d.querySelector('#deckCards .crow');
  ok(!!deckRow, '目前牌組有卡片可以測');
  if (deckRow) {
    deckRow.dispatchEvent(new w.MouseEvent('mouseenter', { clientX: 300, clientY: 300 }));
    tip = tipOf();
    ok(tip.classList.contains('show'), '目前牌組的卡片也會出現預覽');
    ok(tip.textContent.indexOf(w.SG.getCard(deckRow.dataset.slug).name) >= 0,
       '牌組側預覽顯示正確的卡');
    ok(/點一下移除一張/.test(tip.textContent), '牌組側預覽提示是「移除」');
    deckRow.dispatchEvent(new w.MouseEvent('mouseleave'));
  }

  // 角色卡格
  const charRow = d.querySelector('#deckChar .crow');
  if (charRow) {
    charRow.dispatchEvent(new w.MouseEvent('mouseenter', { clientX: 300, clientY: 300 }));
    ok(tipOf().classList.contains('show'), '角色卡格也有預覽');
    ok(/♥/.test(tipOf().textContent), '角色卡預覽顯示生命');
    charRow.dispatchEvent(new w.MouseEvent('mouseleave'));
  }

  // 列被重繪後，滑出整個清單一樣要收起來
  const again = d.querySelector('#poolList .crow');
  again.dispatchEvent(new w.MouseEvent('mouseenter', { clientX: 300, clientY: 300 }));
  ok(tipOf().classList.contains('show'), '重新懸停會再出現');
  $('poolList').dispatchEvent(new w.MouseEvent('mouseleave'));
  ok(!tipOf().classList.contains('show'), '滑出整個庫存清單就收起');
}

console.log('══════ 卡片圖鑑 ══════');
{
  d.querySelector('[data-go="gallery"]').click();
  eq(active(), 'scr-gallery', '進入圖鑑');
  const rows = d.querySelectorAll('#glList .crow');
  eq(rows.length, w.SG.collectibleCards().length,
     '列出全部可收集的 ' + w.SG.collectibleCards().length + ' 張卡（不含 NPC）');
  rows[0].dispatchEvent(new w.MouseEvent('mouseenter', { clientX: 300, clientY: 300 }));
  ok($('cardTip').classList.contains('show'), '圖鑑清單也有懸停預覽');
  rows[0].dispatchEvent(new w.MouseEvent('mouseleave'));
  rows[0].click();
  ok($('glDetail').textContent.length > 30, '點卡片會顯示詳情');
  ok(/持有/.test($('glDetail').textContent), '詳情顯示持有數');

  $('gType').value = 'character';
  $('gType').dispatchEvent(new w.Event('change'));
  eq(d.querySelectorAll('#glList .crow').length, 10, '只看角色卡 → 10 張（4 主角 + 5 副本獎勵 + EP1 維若妮卡）');
  $('gType').value = '';
  $('gType').dispatchEvent(new w.Event('change'));
}

console.log('══════ 副本畫面 ══════');
{
  d.querySelector('[data-go="dungeon"]').click();
  eq(active(), 'scr-dungeon', '進入副本選擇');
  const rows = d.querySelectorAll('#dgList .dg-row');
  eq(rows.length, w.SG.DUNGEONS.length, '列出全部 ' + w.SG.DUNGEONS.length + ' 座副本');
  ok(/Normal/.test($('dgList').textContent), '有 Normal 難度的副本');
  ok(/初級迷宮/.test(rows[0].textContent), '第一座是初級迷宮');
  ok(/諾爾德/.test(rows[0].textContent), '顯示獎勵角色卡');

  rows[0].click();
  eq(active(), 'scr-floor', '點副本進入樓層畫面');
  eq(d.querySelectorAll('#flFloors .fl-row').length, 3, '初級迷宮列出 3 層');
  ok(!!d.querySelector('.fl-row.boss'), '最後一層標為 BOSS');
  ok(!!d.querySelector('.fl-row.now'), '有標出目前所在層');
  ok(/挑戰/.test($('btnChallenge').textContent), '挑戰鈕：' + $('btnChallenge').textContent);
  ok(!$('btnChallenge').disabled, '牌組可用時挑戰鈕可按');

  /* 打過的樓層要能點選重打 */
  {
    const dg = w.SG.getDungeon('beginner');
    const st = w.SG.Save.dungeon(dg.id);
    eq(st.floor, 1, '一開始在第 1 層');
    ok(d.querySelectorAll('#flFloors .fl-row.locked').length === 2,
       '還沒到的樓層是鎖著的');

    /* 爬到第 3 層 */
    w.SG.Save.dungeonWin(dg, { total: 300 }, 'vita', 1);
    w.SG.Save.dungeonWin(dg, { total: 300 }, 'vita', 2);
    w.SG.renderFloor();
    eq(st.floor, 3, '爬到第 3 層');
    const open = d.querySelectorAll('#flFloors .fl-row.open');
    eq(open.length, 3, '三層都可以點選');
    ok(/挑戰 BOSS/.test($('btnChallenge').textContent),
       '預設挑戰目前這層：' + $('btnChallenge').textContent);

    /* 點第 1 層 → 挑戰目標要跟著改 */
    const f1 = d.querySelector('#flFloors .fl-row[data-floor="1"]');
    ok(!!f1, '第 1 層那列可以點');
    f1.click();
    ok(/1F/.test($('btnChallenge').textContent) && /重打/.test($('btnChallenge').textContent),
       '選了打過的樓層，挑戰鈕標示重打：' + $('btnChallenge').textContent);
    ok(f1.classList.contains('sel') ||
       !!d.querySelector('#flFloors .fl-row[data-floor="1"].sel'), '被選的那層有標示');
    eq(st.floor, 3, '只是選樓層，進度沒有被改動');

    /* 選回目前這層 */
    d.querySelector('#flFloors .fl-row[data-floor="3"]').click();
    ok(!/重打/.test($('btnChallenge').textContent),
       '選回目前這層就不是重打：' + $('btnChallenge').textContent);

    /* 還原進度，不要影響後面的測試 */
    st.floor = 1; st.clears = 0;
    w.SG.Save.save();
    w.SG.renderFloor();
  }

  // 出戰牌組可以直接在副本畫面挑
  const dsel = $('flDeck');
  ok(dsel.options.length >= 4, '副本畫面可以選出戰牌組：' + dsel.options.length + ' 副');
  ok(/點/.test($('flDeckInfo').textContent), '顯示牌組資訊：' + $('flDeckInfo').textContent);
  const other = Array.from(dsel.options).findIndex((o, i) => !o.disabled && i !== +dsel.value);
  ok(other >= 0, '有第二副可用的牌組可以切換');
  const wantName = w.SG.Save.data.decks[other].name;
  dsel.value = String(other);
  dsel.dispatchEvent(new w.Event('change'));
  eq(w.SG.Save.data.activeDeck, other, '切換牌組會更新使用中牌組');
  eq(w.SG.Save.activeDeck().name, wantName, '選到的是預期的那副：' + wantName);

  // 實際打一場（瞬間速度）
  const sp = $('btnSpeed');
  for (let i = 0; i < 8 && !/瞬間/.test(sp.textContent); i++) sp.click();
  const floorBefore = w.SG.Save.dungeon('beginner').floor;
  $('btnChallenge').click();
  eq(active(), 'scr-battle', '進入戰鬥');
  eq(w.SG.game.players[1].name, '魅惑魔女', '對手是 1F 的敵人');
  eq(w.SG.game.players[0].name, w.SG.Save.activeDeck().name, '出戰的是剛才選的牌組');
  eq(w.SG.game.players[1].character.maxLife, 15, '敵人 LIFE 依 NPC 卡設定');
}

console.log('══════ 任務 / 成就畫面 ══════');
{
  const S = w.SG.Save;
  S.reset();
  d.querySelector('[data-go="quest"]').click();
  eq(active(), 'scr-quest', '進入任務畫面');
  eq(d.querySelectorAll('#qDaily .q-row').length, 3, '每日任務列出 3 個');
  eq(d.querySelectorAll('#qAchieve .q-row').length, w.SG.ACHIEVEMENTS.length,
     '成就全部列出（' + w.SG.ACHIEVEMENTS.length + ' 項）');
  ok(/\d{4}-\d{2}-\d{2}/.test($('qDate').textContent), '顯示今天日期：' + $('qDate').textContent);
  ok(d.querySelectorAll('#qDaily .q-go[disabled]').length === 3, '未達成時領取鈕是關的');

  // 達成首勝 → 成就可領
  S.recordBattle(true, { faction: 'vita' });
  w.SG.renderQuests();
  const ready = d.querySelectorAll('#qAchieve .q-row.ready');
  ok(ready.length >= 1, '達成的成就會標示可領取');
  const before = Object.keys(S.data.materials).reduce((n, k) => n + S.data.materials[k], 0);
  ready[0].querySelector('.q-go').click();
  const after = Object.keys(S.data.materials).reduce((n, k) => n + S.data.materials[k], 0);
  ok(after > before, '點領取會拿到素材（' + before + ' → ' + after + '）');
  ok(/達成/.test($('qMsg').textContent), '顯示領取訊息：' + $('qMsg').textContent);
  ok(d.querySelector('#qAchieve .q-row.claimed'), '領取後標示已領取');
  ok(/已領取/.test($('qAchieveCount').textContent), '顯示成就進度：' + $('qAchieveCount').textContent);

  // 大廳紅點
  S.reset();
  S.recordBattle(true, { faction: 'vita' });
  d.querySelector('[data-go="menu"]').click();
  const qb = $('btnQuestMenu');
  ok(/●/.test(qb.textContent), '大廳按鈕出現可領取提示：' + qb.textContent);
  ok(qb.classList.contains('has-pending'), '按鈕有 has-pending 樣式');
  S.reset();
  d.querySelector('[data-go="menu"]').click();
  ok(!/●/.test($('btnQuestMenu').textContent), '沒有可領取時不顯示提示');
}

console.log('══════ 模擬天梯 ══════');
{
  const S = w.SG.Save;
  S.reset();
  d.querySelector('[data-go="ladder"]').click();
  eq(active(), 'scr-ladder', '進入天梯');
  eq(d.querySelectorAll('#ldList .ld-row').length, 8, '列出 8 位對手');
  ok(/下界/.test($('ldHead').textContent), '初始階層是下界：' + $('ldHead').textContent.slice(0, 20));

  // 高階對手要積分才解鎖
  const locked = d.querySelectorAll('#ldList .ld-row.locked');
  eq(locked.length, 5, '積分 0 時只有下界 3 位可挑戰，其餘 5 位鎖住');
  ok(locked[0].querySelector('.ld-go').disabled, '鎖住的對手不能按挑戰');

  // 出戰牌組可選
  ok($('ldDeck').options.length >= 4, '天梯也能選出戰牌組');

  // 積分變動
  const foe = w.SG.ladderFoe('l1');
  const win = S.ladderResult(foe, true);
  eq(win.delta, 12, '下界獲勝 +12 分');
  eq(S.data.ladder.points, 12, '積分累積');
  eq(S.data.ladder.wins, 1, '天梯勝場記錄');
  const lose = S.ladderResult(foe, false);
  eq(lose.delta, -6, '下界落敗 −6 分');
  eq(S.data.ladder.best, 12, '最高積分保留');

  // 積分不會變負數
  for (let i = 0; i < 10; i++) S.ladderResult(foe, false);
  eq(S.data.ladder.points, 0, '積分最低 0，不會變負');

  // 階層判定
  eq(w.SG.ladderTier(0).id, 'low', '0 分 → 下界');
  eq(w.SG.ladderTier(99).id, 'low', '99 分 → 下界');
  eq(w.SG.ladderTier(100).id, 'mid', '100 分 → 中間界');
  eq(w.SG.ladderTier(300).id, 'high', '300 分 → 天上界');

  // 積分夠了就解鎖
  S.data.ladder.points = 300;
  S.save();
  w.SG.renderLadder();
  eq(d.querySelectorAll('#ldList .ld-row.locked').length, 0, '天上界積分時全部解鎖');
  ok(/天上界/.test($('ldHead').textContent), '階層顯示天上界');

  // 實際打一場（用瞬間速度）
  const sp = $('btnSpeed');
  for (let i = 0; i < 8 && !/瞬間/.test(sp.textContent); i++) sp.click();
  const before = S.data.ladder.points;
  d.querySelectorAll('#ldList .ld-row')[0].querySelector('.ld-go').click();
  eq(active(), 'scr-battle', '天梯挑戰會進戰鬥畫面');
  eq(w.SG.game.players[1].name, w.SG.ladderFoe('l1').name, '對手是選的那位');
  ok(before !== undefined, '挑戰前有積分基準');
}

console.log('══════ 合成工房 ══════');
{
  d.querySelector('[data-go="craft"]').click();
  eq(active(), 'scr-craft', '進入合成工房');
  $('cReady').checked = false;
  $('cReady').dispatchEvent(new w.Event('change'));
  const all = d.querySelectorAll('#cfList .crow');
  ok(all.length > 50, '列出可合成的卡片：' + all.length + ' 張');

  all[0].click();
  ok(/持有/.test($('cfRecipe').textContent), '點卡片顯示配方：' + $('cfRecipe').textContent.slice(0, 40));
  ok($('btnCraft').disabled, '素材不夠時合成鈕是關的');

  // 給素材再試
  const slug = d.querySelector('#cfList .crow').dataset.slug;
  w.SG.Save.addMaterials(w.SG.recipeOf(slug));
  w.SG.renderCraft();
  d.querySelector('#cfList .crow[data-slug="' + slug + '"]').click();
  ok(!$('btnCraft').disabled, '素材足夠時可以按合成');
  const before = w.SG.Save.data.owned[slug] || 0;
  $('btnCraft').click();
  eq(w.SG.Save.data.owned[slug], before + 1, '合成後持有數 +1');
  ok(/合成成功/.test($('cfMsg').textContent), '顯示成功訊息');

  // 素材庫存有列出來
  ok(/白色礦石/.test($('cfBag').textContent), '素材庫存有列出白色礦石');
  ok($('cReady').checked === false, '「只看素材足夠」可切換');
}

console.log('══════ 卡包 ══════');
{
  const S = w.SG.Save;
  d.querySelector('[data-go="pack"]').click();
  eq(active(), 'scr-pack', '進入卡包畫面');

  S.data.packs.tickets = 0;
  w.SG.renderPack();
  ok($('btnPull1').disabled && $('btnPull10').disabled, '沒點數時兩個抽卡鈕都關著');

  S.addTickets(1);
  w.SG.renderPack();
  ok(!$('btnPull1').disabled, '有 1 點可以抽一包');
  ok($('btnPull10').disabled, '1 點還不能十連抽');

  $('btnPull1').click();
  const cards = d.querySelectorAll('#pkResult .pk-card');
  ok(cards.length > 0 && cards.length <= w.SG._pack.CARDS_PER_PACK,
     '開出 ' + cards.length + ' 種卡（一包 ' + w.SG._pack.CARDS_PER_PACK + ' 張）');
  eq(S.data.packs.tickets, 0, '抽完點數扣掉');

  /* 十連 */
  S.addTickets(10);
  w.SG.renderPack();
  ok(!$('btnPull10').disabled, '10 點可以十連抽');
  const own0 = Object.keys(S.data.owned).reduce((n, k) => n + S.data.owned[k], 0);
  $('btnPull10').click();
  eq(S.data.packs.tickets, 0, '十連扣 10 點');
  const own1 = Object.keys(S.data.owned).reduce((n, k) => n + S.data.owned[k], 0);
  eq(own1 - own0, 10 * w.SG._pack.CARDS_PER_PACK, '十連拿到 30 張卡');

  /* 分解 */
  const spares = Object.keys(S.data.owned)
    .filter(k => w.SG.spareCount(k, S.data.owned) > 0);
  ok(spares.length > 0, '抽完之後有多餘的卡可以分解：' + spares.length + ' 種');
  w.SG.renderPack();
  ok(!$('btnDisAll').disabled, '「全部分解」可以按');
  const matBefore = Object.keys(S.data.materials)
    .reduce((n, k) => n + S.data.materials[k], 0);
  $('btnDisAll').click();
  const matAfter = Object.keys(S.data.materials)
    .reduce((n, k) => n + S.data.materials[k], 0);
  ok(matAfter > matBefore, '分解會拿到素材（' + matBefore + ' → ' + matAfter + '）');
  ok(Object.keys(S.data.owned).every(k => w.SG.spareCount(k, S.data.owned) === 0),
     '全部分解之後沒有多餘的卡');
  ok(Object.keys(S.data.owned).every(k => {
       const c = w.SG.getCard(k);
       return !c || S.data.owned[k] <= (c.limit || 3);
     }), '分解不會拆掉還組得進牌組的張數');
}

console.log('══════ 存檔 ══════');
{
  d.querySelector('[data-go="settings"]').click();
  eq(active(), 'scr-settings', '進入設定');

  $('setName').value = '諾瓦';
  $('setName').dispatchEvent(new w.Event('change'));
  eq(w.SG.Save.data.player.name, '諾瓦', '可以改玩家名稱');

  $('btnExport').click();
  const text = $('saveText').value;
  ok(text.length > 50, '匯出產生存檔文字（' + text.length + ' 字元）');

  // 改動後再匯入，應該還原
  w.SG.Save.data.player.name = '被改壞了';
  w.SG.Save.save();
  $('saveText').value = text;
  $('btnImport').click();
  eq(w.SG.Save.data.player.name, '諾瓦', '匯入可還原資料');
  eq($('saveMsg').textContent, '匯入成功！', '匯入成功訊息');

  $('saveText').value = '{壞掉的內容';
  $('btnImport').click();
  ok(/JSON/.test($('saveMsg').textContent), '匯入壞資料會給錯誤訊息：' + $('saveMsg').textContent);
  ok($('saveMsg').classList.contains('bad'), '錯誤訊息標紅');

  // localStorage 真的有寫入
  ok(!!w.localStorage.getItem('swordgirls.save.v1'), '資料有寫進 localStorage');

  // 重新載入存檔應保留玩家名稱
  $('saveText').value = text;
  $('btnImport').click();
  eq(w.SG.Save.load().player.name, '諾瓦', '重新讀取存檔可保留資料');
}

console.log('══════ 自動儲存 ══════');
{
  const S = w.SG.Save;
  const KEY = 'swordgirls.save.v1';
  ok(S.available(), '瀏覽器允許本機儲存');

  // 組牌會自動寫進 localStorage
  w.localStorage.removeItem(KEY);
  const dk = S.data.decks[0];
  S.removeCard(dk, dk.cards[0]);
  ok(!!w.localStorage.getItem(KEY), '改牌組後自動寫入 localStorage');

  // 合成會自動寫入
  w.localStorage.removeItem(KEY);
  S.addMaterials([{ mat: 'ore_white', n: 1 }]);
  ok(!!w.localStorage.getItem(KEY), '取得素材後自動寫入');

  // 副本結算會自動寫入
  w.localStorage.removeItem(KEY);
  S.dungeonWin(w.SG.getDungeon('beginner'));
  ok(!!w.localStorage.getItem(KEY), '副本結算後自動寫入');

  // 打完一場會記戰績並自動寫入
  const before = S.data.stats.battles;
  w.localStorage.removeItem(KEY);
  S.recordBattle(true);
  eq(S.data.stats.battles, before + 1, '打完一場會累計戰績');
  eq(S.data.stats.wins, 1, '勝場有記錄');
  ok(!!w.localStorage.getItem(KEY), '戰績自動寫入');

  // 重新讀取（模擬關掉分頁再開）
  const reloaded = S.load();
  eq(reloaded.stats.battles, S.data.stats.battles, '重新載入後戰績還在');
  eq(reloaded.dungeons.beginner.floor, S.data.dungeons.beginner.floor, '副本樓層還在');

  // 設定頁的說明與摘要
  d.querySelector('[data-go="settings"]').click();
  ok(/自動儲存/.test($('saveStatus').textContent), '設定頁說明會自動儲存');
  ok(/對戰/.test($('saveSum').textContent), '設定頁顯示紀錄摘要：' +
     $('saveSum').textContent.replace(/\s+/g, ' ').trim().slice(0, 50));

  // 清除記錄 → 回到初始狀態
  w.confirm = () => true;
  $('btnReset').click();
  eq(S.data.stats.battles, 0, '清除記錄後戰績歸零');
  eq(S.data.decks.length, 4, '清除記錄後回到 4 副新手牌組');
  eq(Object.keys(S.data.materials).length, 0, '清除記錄後素材清空');
  eq(S.data.dungeons.beginner.floor, 1, '清除記錄後副本回到第 1 層');
  eq(S.data.decks[0].cards.length, 30, '牌組回到完整的 30 張');
  ok(!!w.localStorage.getItem(KEY), '清除後的初始狀態也有寫入');
}

console.log('══════ 用自建牌組開戰 ══════');
{
  d.querySelector('[data-go="battle-setup"]').click();
  eq(active(), 'scr-battle-setup', '進入對戰設定');
  const mine = $('selMine');
  ok(mine.options.length >= 4, '我方下拉列出自己的牌組：' + mine.options.length + ' 副');
  ok(!$('btnStart').disabled, '有可用牌組時「開始戰鬥」可按');
  $('inpSeed').value = 'p3';
  $('btnStart').click();
  eq(active(), 'scr-battle', '進入戰鬥畫面');
  const g = w.SG.game;
  eq(g.players[0].deck.length + g.players[0].hand.length +
     g.players[0].field.filter(Boolean).length, 30, '我方牌庫確實是自己的 30 張');
  eq(g.players[0].name, w.SG.Save.data.decks[+mine.value].name, '戰鬥中使用的是所選牌組');
}

console.error = origErr;
console.log('');
console.log('通過 ' + pass + '　失敗 ' + errors.length);
if (errors.length) { errors.forEach(e => console.log('  ✗ ' + e)); process.exit(1); }
console.log('✔ 畫面測試全數通過');
