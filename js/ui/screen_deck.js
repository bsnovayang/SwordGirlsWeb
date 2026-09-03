/* ═══════════════════════════════════════════════════════════
   S6 牌組編輯
   左＝牌組清單　中＝卡片庫存（可篩選）　右＝目前牌組
   ═══════════════════════════════════════════════════════════ */
var SG = window.SG || (window.SG = {});

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var sel = 0;                       // 目前編輯中的牌組索引

  function deck() { return SG.Save.data.decks[sel]; }

  /* ────────── 左欄：牌組清單 ────────── */
  function renderDecks() {
    var d = SG.Save.data, host = $('deckList');
    host.innerHTML = '';
    d.decks.forEach(function (deck, i) {
      var li = document.createElement('li');
      li.className = (i === sel ? 'on ' : '') + (i === d.activeDeck ? 'active' : '');
      var errs = SG.Save.data.decks[i] ? deckErrors(deck) : [];
      li.innerHTML = '<span class="dk-name">' + deck.name + '</span>' +
        '<span class="dk-info">' + deck.cards.length + '/30　' + deckPoints(deck) + ' 點' +
        (i === d.activeDeck ? '　<b>使用中</b>' : '') + '</span>' +
        (errs.length ? '<span class="dk-bad">✗ ' + errs.length + ' 項問題</span>' : '<span class="dk-ok">✔ 可用</span>');
      li.addEventListener('click', function () { sel = i; renderAll(); });
      host.appendChild(li);
    });
    $('btnDeckDel').disabled = d.decks.length <= 1;
    $('btnDeckUse').disabled = sel === d.activeDeck;
  }

  function deckPoints(dk) {
    var p = 0, ch = SG.getCard(dk.character);
    if (ch) p += ch.points || 0;
    dk.cards.forEach(function (s) { var c = SG.getCard(s); if (c) p += c.points || 0; });
    return p;
  }

  function deckErrors(dk) {
    var errs = [], count = {};
    if (!dk.character) errs.push('沒有選角色卡');
    if (dk.cards.length !== 30) errs.push('張數 ' + dk.cards.length + '（需要 30）');
    dk.cards.forEach(function (s) { count[s] = (count[s] || 0) + 1; });
    Object.keys(count).forEach(function (s) {
      var c = SG.getCard(s), owned = SG.Save.data.owned[s] || 0;
      if (!c) { errs.push('未知卡片 ' + s); return; }
      if (count[s] > (c.limit || 3)) errs.push(c.name + ' 超過張數上限（' + count[s] + '/' + c.limit + '）');
      if (count[s] > owned) errs.push(c.name + ' 超過持有數（' + count[s] + '/' + owned + '）');
      if (dk.character && !SG.Save.factionOk(dk, c)) {
        errs.push(c.name + ' 陣營不符（' + SG.UI.facName(c.faction) + '）');
      }
    });
    return errs;
  }
  SG.deckErrors = deckErrors;

  /* ────────── 中欄：卡片庫存 ────────── */
  function renderPool() {
    var dk = deck(), owned = SG.Save.data.owned;
    var fac = SG.Save.deckFaction(dk);
    var picked = $('fFaction').value;

    /* 牌組陣營提示 */
    $('poolFaction').innerHTML = fac
      ? '牌組陣營：<b class="f-' + fac + '">' + SG.UI.facName(fac) + '</b>' +
        '　只能放同陣營與無所屬的隨從／咒語'
      : '<b>先挑一張角色卡</b>　角色卡決定這副牌組的陣營，選好之後才會出現該陣營的隨從與咒語';

    var list = SG.UI.filter(SG.collectibleCards(), {
      faction: picked,
      type: $('fType').value,
      sort: $('fSort').value,
      text: $('fText').value,
      ownedOnly: true,
      owned: owned
    });

    /* 沒特別指定陣營時，直接把不能放的隱藏起來；
       使用者主動選了別的陣營才顯示（標成不可用），免得覺得卡片憑空消失。 */
    if (!picked) {
      list = list.filter(function (c) { return SG.Save.factionOk(dk, c); });
    }

    var host = $('poolList');
    host.innerHTML = '';
    list.forEach(function (card) {
      var have = owned[card.slug] || 0;
      var okFac = SG.Save.factionOk(dk, card);
      var left = SG.Save.canAdd(dk, card.slug);
      var full = card.type !== 'character' && dk.cards.length >= 30;
      var row = SG.UI.row(card, {
        badge: '×' + have,
        dim: !okFac,
        disabled: left <= 0 || full,
        hint: !okFac ? '▸ 陣營不符　本牌組是' + SG.UI.facName(fac) + '，放不進去'
            : left > 0 && !full ? '▸ 點一下加入牌組（還可放 ' + left + ' 張）'
            : full ? '▸ 牌組已滿 30 張'
            : '▸ 已達張數上限或持有數不足'
      });
      row.addEventListener('click', function () {
        if (SG.Save.addCard(dk, card.slug)) renderAll();
      });
      host.appendChild(row);
    });
    if (!list.length) host.innerHTML = '<p class="empty">沒有符合條件的卡片</p>';
  }

  /* ────────── 右欄：目前牌組 ────────── */
  function renderCurrent() {
    var dk = deck();

    /* 角色卡 */
    var chHost = $('deckChar');
    chHost.innerHTML = '';
    var ch = SG.getCard(dk.character);
    if (ch) {
      var row = SG.UI.row(ch, { badge: '角色', hint: '▸ 點一下取消角色卡' });
      row.addEventListener('click', function () { dk.character = null; SG.Save.save(); renderAll(); });
      chHost.appendChild(row);
    } else {
      chHost.innerHTML = '<p class="empty">尚未選角色卡　←　從左邊庫存點一張</p>';
    }

    /* 統計 */
    var counts = {}, follower = 0, spell = 0, sizeDist = [0, 0, 0, 0, 0, 0];
    dk.cards.forEach(function (s) {
      counts[s] = (counts[s] || 0) + 1;
      var c = SG.getCard(s);
      if (!c) return;
      if (c.type === 'spell') spell++; else follower++;
      if (c.size >= 1 && c.size <= 5) sizeDist[c.size]++;
    });
    var bars = '';
    for (var sz = 1; sz <= 5; sz++) {
      var n = sizeDist[sz];
      bars += '<div class="sz"><span class="sz-l">SIZE ' + sz + '</span>' +
              '<span class="sz-bar"><i style="width:' + (n * 100 / 12) + '%"></i></span>' +
              '<span class="sz-n">' + n + '</span></div>';
    }
    $('deckStats').innerHTML =
      '<div class="ds-top"><b class="' + (dk.cards.length === 30 ? 'ok' : 'bad') + '">' +
      dk.cards.length + ' / 30</b>　張　·　牌組點數 <b>' + deckPoints(dk) + '</b></div>' +
      '<div class="ds-mix">隨從 ' + follower + '　咒語 ' + spell + '</div>' + bars;

    /* 卡片列表 */
    var host = $('deckCards');
    host.innerHTML = '';
    Object.keys(counts).map(function (s) { return SG.getCard(s); })
      .filter(Boolean)
      .sort(function (a, b) { return a.id.localeCompare(b.id); })
      .forEach(function (card) {
        var r = SG.UI.row(card, { badge: '×' + counts[card.slug], hint: '▸ 點一下移除一張' });
        r.addEventListener('click', function () {
          if (SG.Save.removeCard(dk, card.slug)) renderAll();
        });
        host.appendChild(r);
      });
    if (!dk.cards.length) host.innerHTML = '<p class="empty">牌組還是空的</p>';

    /* 合法性 */
    var errs = deckErrors(dk);
    var offFaction = !dk.character ? 0 : dk.cards.filter(function (slug) {
      return !SG.Save.factionOk(dk, SG.getCard(slug));
    }).length;
    $('deckErrors').innerHTML = errs.length
      ? '<b>還不能使用：</b><ul><li>' + errs.join('</li><li>') + '</li></ul>'
      : '<b class="ok">✔ 這副牌組可以上場</b>';
    $('deckErrors').className = 'deck-errors' + (errs.length ? ' bad' : '');
    if (offFaction) {
      var btn = document.createElement('button');
      btn.id = 'btnDropFaction';
      btn.className = 'ghost small';
      btn.textContent = '移除不符陣營的 ' + offFaction + ' 張';
      btn.addEventListener('click', function () {
        SG.Save.dropOffFaction(dk);
        renderAll();
      });
      $('deckErrors').appendChild(btn);
    }
  }

  function renderAll() {
    renderDecks(); renderPool(); renderCurrent();
    // 清單重繪後原本那一列可能已經不在，滑出容器時要收起預覽
    SG.UI.tipLeaveGuard(['poolList', 'deckCards', 'deckChar']);
  }
  SG.renderDeckScreen = function () {
    var d = SG.Save.data;
    if (sel >= d.decks.length) sel = d.activeDeck;
    renderAll();
  };

  /* ────────── 綁定 ────────── */
  var bound = false;
  SG.bindDeckScreen = function () {
    if (bound) return;
    bound = true;

    SG.UI.fillFilters($('fFaction'), $('fType'), $('fSort'));
    SG.UI.bindFilters(['fFaction', 'fType', 'fSort', 'fText'], renderPool);

    $('btnDeckUse').addEventListener('click', function () {
      SG.Save.data.activeDeck = sel; SG.Save.save(); renderAll();
    });
    $('btnDeckNew').addEventListener('click', function () {
      var name = prompt('新牌組名稱', '新牌組');
      if (name === null) return;
      SG.Save.newDeck(name.trim() || '新牌組');
      sel = SG.Save.data.decks.length - 1;
      renderAll();
    });
    $('btnDeckCopy').addEventListener('click', function () {
      if (!SG.Save.copyDeck(sel)) return;
      sel = SG.Save.data.decks.length - 1;
      renderAll();
    });
    $('btnDeckRename').addEventListener('click', function () {
      var dk = deck();
      var name = prompt('牌組名稱', dk.name);
      if (name === null) return;
      dk.name = name.trim() || dk.name;
      SG.Save.save(); renderAll();
    });
    $('btnDeckDel').addEventListener('click', function () {
      if (!confirm('確定刪除「' + deck().name + '」？')) return;
      if (SG.Save.deleteDeck(sel)) { sel = Math.max(0, sel - 1); renderAll(); }
    });
  };
})();
