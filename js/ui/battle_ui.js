/* ═══════════════════════════════════════════════════════════
   戰鬥畫面 UI — 渲染 + 事件序列播放
   ═══════════════════════════════════════════════════════════ */
var SG = window.SG || (window.SG = {});

(function () {
  'use strict';

  function facShort(f) { var x = SG.FACTIONS[f]; return x ? x.short : f; }
  function facName(f)  { var x = SG.FACTIONS[f]; return x ? x.name : f; }
  var STAT_ORDER = ['atk', 'def', 'sta', 'size'];
  var STAT_NAME  = { atk: '攻', def: '防', sta: '體', size: 'SIZE' };
  var SPEEDS = [{ n: '慢速', ms: 900 }, { n: '普通', ms: 480 }, { n: '快速', ms: 180 }, { n: '瞬間', ms: 0 }];

  var g = null;            // 目前對局
  var speedIdx = 1;
  var busy = false;        // 播放中禁止操作
  var actingUid = null;    // 目前正在行動的卡（重繪後要重新套高亮）
  var $ = function (id) { return document.getElementById(id); };

  /* ────────── 啟動 ────────── */
  var endHook = null;          // 副本／天梯用：結束後結算，回傳要附在結算視窗的 HTML
  var aiLevel = 'basic';       // 對手 AI 強度
  var aiOpts = null;

  SG.startBattle = function (deckA, deckB, seed, opts) {
    endHook = (opts && opts.onEnd) || null;
    aiLevel = (opts && opts.ai) || 'basic';
    aiOpts = (opts && opts.aiOpts) || null;
    g = SG.createGame(deckA, deckB, seed, { dungeon: !!(opts && opts.dungeon) });
    SG.game = g;
    busy = false;
    $('resultOverlay').classList.remove('show');
    hideCoin();
    $('log').innerHTML = '';
    $('mineName').textContent = g.players[0].name;
    $('foeName').textContent = g.players[1].name;
    buildFields();
    detail(null);
    log('對局開始（種子 ' + g.seed + '）', 'sys');
    nextTurn();
  };

  /* ────────── 建立場地 DOM ────────── */
  function buildFields() {
    ['Mine', 'Foe'].forEach(function (side) {
      var host = $('field' + side), pi = side === 'Mine' ? 0 : 1;
      host.innerHTML = '';
      host.appendChild(mkSlot('s-char', pi, -1));
      for (var i = 0; i < 5; i++) host.appendChild(mkSlot('s-' + (i + 1), pi, i));
    });
    var hand = $('hand'); hand.innerHTML = '';
    for (var h = 0; h < 5; h++) {
      var d = document.createElement('div');
      d.className = 'slot'; d.dataset.hand = h;
      hand.appendChild(d);
    }
  }

  function mkSlot(cls, pi, idx) {
    var d = document.createElement('div');
    d.className = 'slot ' + cls;
    d.dataset.p = pi; d.dataset.slot = idx;
    if (idx >= 0) d.innerHTML = '<span class="numeral">' + SG.romanOf(idx) + '</span>';
    return d;
  }

  /* ────────── 卡片 DOM ────────── */
  function cardEl(c, opts) {
    opts = opts || {};
    var e = document.createElement('div');
    e.className = 'card f-' + c.faction + ' type-' + c.type + (c.faceDown && opts.hide ? ' facedown' : '');
    e.dataset.uid = c.uid;
    var hidden = c.faceDown && opts.hide;
    var name = hidden ? '？ ？ ？' : c.name;

    if (opts.isChar) {
      e.className += ' is-char';
      e.innerHTML =
        '<div class="chead"><span class="fac">' + facShort(c.faction) + '</span></div>' +
        '<div class="cname">' + name + '</div>' +
        '<div class="life">♥ ' + c.life + ' <small>/ ' + c.maxLife + '</small></div>';
    } else if (c.type === 'spell') {
      e.innerHTML =
        '<div class="chead"><span class="fac">' + facShort(c.faction) + '</span>' +
        '<span class="size">' + c.size + '</span></div>' +
        '<div class="cname">' + name + '</div>' +
        '<div class="stats"><span>法 術</span></div>';
    } else {
      e.innerHTML =
        '<div class="chead"><span class="fac">' + facShort(c.faction) + '</span>' +
        '<span class="size">' + c.size + '</span></div>' +
        '<div class="cname">' + name + '</div>' +
        '<div class="stats">' +
        '<span class="st-atk">' + c.atk + '</span>' +
        '<span class="st-def">' + c.def + '</span>' +
        '<span class="st-sta">' + c.sta + '</span></div>';
    }
    var shown = hidden ? null : c;
    e.addEventListener('mouseenter', function (ev) { detail(shown); SG.UI.showTip(shown, c.uid); SG.UI.moveTip(ev); });
    e.addEventListener('mousemove', SG.UI.moveTip);
    e.addEventListener('mouseleave', SG.UI.hideTip);
    return e;
  }

  /* ────────── 全畫面重繪 ──────────
     s = 事件夾帶的場面快照；省略時畫「現在的引擎狀態」。
     播放中一定要傳快照，否則會畫成回合結束的樣子（死掉的卡直接消失）。 */
  function render(s) {
    var src = s ? s.players : g.players;
    for (var pi = 0; pi < 2; pi++) {
      var side = pi === 0 ? 'Mine' : 'Foe', p = src[pi], host = $('field' + side);

      var chSlot = host.querySelector('.s-char');
      chSlot.innerHTML = '';
      chSlot.appendChild(cardEl(p.character, { isChar: true }));

      for (var i = 0; i < 5; i++) {
        var slot = host.querySelector('.s-' + (i + 1));
        slot.innerHTML = '<span class="numeral">' + SG.romanOf(i) + '</span>';
        var c = p.field[i];
        if (c) {
          var el = cardEl(c, { hide: pi === 1 });     // 敵方蓋牌不顯示內容
          if (pi === 0 && c.faceDown && g.phase === 'place') {
            el.title = '點擊收回手牌';
            el.addEventListener('click', onUnplace.bind(null, i));
          }
          slot.appendChild(el);
        }
      }
      $((pi ? 'foe' : 'mine') + 'Deck').textContent = s ? p.deck : p.deck.length;
      $((pi ? 'foe' : 'mine') + 'Grave').textContent = s ? p.grave : p.grave.length;
      $((pi ? 'foe' : 'mine') + 'Shuf').textContent = p.shuffles;
    }
    renderHand(s);
    $('turnNo').textContent = '第 ' + (s ? s.turn : g.turn) + ' 回合';
    if (actingUid) {
      var actEl = findCardEl(actingUid);
      if (actEl) actEl.classList.add('acting');
    }
    // 懸停中的卡片若已被重繪掉，收起預覽
    var tk = SG.UI.tipKey();
    if (tk && !findCardEl(tk)) SG.UI.hideTip();
  }

  function renderHand(s) {
    var p = s ? s.players[0] : g.players[0], slots = $('hand').children;
    var used = 0;
    for (var k = 0; k < 5; k++) if (p.field[k]) used += p.field[k].size;
    for (var i = 0; i < 5; i++) {
      slots[i].innerHTML = '';
      var c = p.hand[i];
      if (!c) continue;
      var el = cardEl(c, {});
      var ok = !s && g.phase === 'place' && !busy && SG.canPlace(g, 0, i);
      if (!ok) el.classList.add('unaffordable');
      else el.addEventListener('click', onPlace.bind(null, c.uid));
      slots[i].appendChild(el);
    }
    var sb = $('sizeNow').parentNode;
    $('sizeNow').textContent = used;
    sb.classList.toggle('over', used > SG.CONST.SIZE_MAX);
    $('shufLeft').textContent = p.shuffles;
    var placing = g.phase === 'place' && !busy;
    $('btnReady').disabled = !placing;
    $('btnShuffle').disabled = !placing || p.shuffles <= 0 || p.hand.length === 0;
  }

  /* ────────── 右側詳情 ────────── */
  function detail(c) {
    var host = $('detail');
    if (!c) { host.innerHTML = '<div class="d-empty">將滑鼠移到卡片上<br>檢視詳細資料</div>'; return; }
    var d = c.def_ || c;
    var isChar = c.type === 'character';
    var stats = isChar
      ? '<span>♥ LIFE ' + c.life + ' / ' + c.maxLife + '</span>'
      : '<span>SIZE ' + c.size + '</span>' +
        (c.type === 'follower'
          ? '<span class="st-atk">ATK ' + c.atk + '</span><span class="st-def">DEF ' + c.def +
            '</span><span class="st-sta">STA ' + c.sta + '</span>'
          : '');
    host.innerHTML =
      '<div class="d-name">' + d.name + '</div>' +
      '<div class="d-meta">' + typeName(c.type) + '　·　' + facName(c.faction) +
      '<br>點數 ' + (d.points != null ? d.points : '-') +
      '　牌組上限 ' + (d.limit != null ? d.limit : '-') +
      (d.rarity ? '　' + d.rarity : '') + '</div>' +
      '<div class="d-stats">' + stats + '</div>' +
      '<div class="d-eff">' + (d.effect || '（無效果）') + '</div>' +
      (d.prov ? '<div class="d-prov">※ 數值為暫定值，尚待考據</div>' : '') +
      (d.flavor ? '<div class="d-flavor">' + d.flavor + '</div>' : '');
  }
  function typeName(t) { return t === 'character' ? '角色卡' : t === 'spell' ? '法術卡' : '隨從卡'; }

  /* ────────── 玩家操作 ────────── */
  function onPlace(uid) {
    if (busy || g.phase !== 'place') return;
    var p = g.players[0], idx = -1;
    for (var i = 0; i < p.hand.length; i++) if (p.hand[i].uid === uid) { idx = i; break; }
    if (idx < 0) return;
    var e = SG.place(g, 0, idx);
    if (!e) return;
    log('置入 ' + SG.romanOf(e.slot) + '　' + e.card.name, 'me');
    render();
  }

  function onUnplace(slot) {
    if (busy || g.phase !== 'place') return;
    var e = SG.unplace(g, 0, slot);
    if (e) { log('收回 ' + e.card.name, 'me'); render(); }
  }

  /* ────────── 回合推進 ────────── */
  function nextTurn() {
    var ev = SG.beginTurn(g);
    play(ev, function () {
      if (g.over) return;
      render();
      log('── 請下牌，完成後按「確定」──', 'sys');
    });
  }

  function onReady() {
    if (busy || g.phase !== 'place') return;
    busy = true; renderHand();
    if (aiLevel === 'smart') SG.aiPlaySmart(g, 1, aiOpts || {});
    else SG.aiPlay(g, 1);
    g.players[0].ready = true;
    var battleEv = SG.resolveTurn(g);
    play(battleEv, function () {
      busy = false;
      render();
      if (g.over) return showResult();
      setTimeout(nextTurn, wait());
    });
  }

  function onShuffle() {
    if (busy || g.phase !== 'place') return;
    var e = SG.shuffleHand(g, 0);
    if (e) { log('洗牌！重抽 ' + e.count + ' 張（剩餘 ' + e.left + ' 次）', 'me'); render(); }
  }

  /* ────────── 事件播放 ────────── */
  function wait() { return SPEEDS[speedIdx].ms; }

  function play(events, done) {
    busy = true; renderHand();
    var i = 0;
    (function step() {
      if (i >= events.length) { busy = false; renderHand(); if (done) done(); return; }
      var e = events[i++];
      applyEvent(e);
      var d = delayOf(e);
      if (d === 0) step(); else setTimeout(step, d);
    })();
  }

  /* 這一步播完要等多久（毫秒） */
  function delayOf(e) {
    var w = wait();
    if (!w) return 0;
    if (e.t === 'coin') return coinMs() + 200;          // 等硬幣落定再繼續
    if (e.t === 'stat') return Math.round(w * 0.35);
    if (e.t === 'ability') return w;          // 亮光要看得完
    if (e.t === 'deactivate' || e.t === 'handGrave' ||
        e.t === 'toDeck' || e.t === 'exile' || e.t === 'swap') return Math.round(w * 0.5);
    if (e.t === 'draw' || e.t === 'note') return Math.round(w * 0.4);
    return w;
  }

  function applyEvent(e) {
    var me = function (pi) { return pi === 0 ? 'me' : 'foe'; };
    var who = function (pi) { return pi === 0 ? '我方' : '敵方'; };

    switch (e.t) {
      case 'turn':
        $('turnNo').textContent = '第 ' + e.turn + ' 回合';
        log('◆ 第 ' + e.turn + ' 回合 ◆', 'turn');
        break;

      case 'phase':
        actingUid = null;
        banner(e.label);
        break;

      case 'coin':
        log('擲硬幣 → ' + who(e.winner) + ' ' + e.label, 'sys');
        coinFx(e.winner, e.label);
        break;

      case 'draw':
        log(who(e.player) + '抽了 ' + e.count + ' 張牌', me(e.player));
        render(e.s);
        break;

      case 'deckout':
        log(who(e.player) + '牌庫已空！', 'kill');
        break;

      case 'shuffle':
        log(who(e.player) + '使用洗牌（剩 ' + e.left + '）', me(e.player));
        render(e.s);
        break;

      case 'reveal':
        log('全場翻開', 'sys');
        render(e.s);
        break;

      case 'activate':
        actingUid = e.card.uid;
        render(e.s);
        break;

      case 'ability':
        log('【' + e.card.name + '】' + e.text, me(e.player));
        render(e.s);
        flashCast(e.card.uid);      // 這張卡的效果要發動了 → 亮一下
        break;

      case 'note':
        log('【' + e.card.name + '】' + e.text, 'sys');
        break;

      case 'stat': {
        var lbl = STAT_ORDER.filter(function (k) { return e.d[k]; })
          .map(function (k) { return STAT_NAME[k] + (e.d[k] > 0 ? '+' : '') + e.d[k]; })
          .join(' ');
        if (!lbl) break;
        var up = STAT_ORDER.some(function (k) { return e.d[k] > 0; });
        log('　' + e.card.name + '　' + lbl, me(e.player));
        render(e.s);
        popNum(e.card.uid, lbl, up ? 'buff stat' : 'nerf stat');
        flashStat(e.card.uid, up);
        break;
      }

      case 'deactivate':
        log('　' + e.card.name + ' 變成行動終了狀態', me(e.player));
        render(e.s);
        break;

      case 'move':
        log('⇢ ' + e.card.name + ' 從' + who(e.from) + '轉移到' + who(e.player) +
            ' ' + SG.romanOf(e.slot) + ' 格', 'kill');
        render(e.s);
        break;

      case 'toDeck':
        log('↩ ' + e.card.name + ' 被送回' + who(e.player) + '牌組最下方', me(e.player));
        render(e.s);
        break;

      case 'exile':
        log('　' + who(e.player) + '墓地的 ' + e.count + ' 張卡被除外', 'sys');
        render(e.s);
        break;

      case 'swap':
        log('⇄ ' + e.a.name + ' 與 ' + e.b.name + ' 數值交換', me(e.player));
        render(e.s);
        break;

      case 'handGrave':
        log('　' + who(e.player) + '手牌「' + e.card.name + '」送入墓地', me(e.player));
        render(e.s);
        break;

      case 'attack':
        log(e.card.name + ' → ' + e.target.name + '　造成 ' + e.damage +
            ' 傷害（STA ' + Math.max(0, e.sta) + '）', me(e.player));
        slashFx(e.target.uid);
        flashHit(e.target.uid);
        popNum(e.target.uid, e.damage > 0 ? '-' + e.damage : '0', e.damage > 0 ? 'dmg' : 'zero');
        updateSta(e.target.uid, e.sta);
        break;

      case 'counter':
        log('↩ ' + e.card.name + ' 反擊 ' + e.target.name + '　' + e.damage +
            ' 傷害（STA ' + Math.max(0, e.sta) + '）', me(e.player));
        slashFx(e.target.uid);
        flashHit(e.target.uid);
        popNum(e.target.uid, e.damage > 0 ? '-' + e.damage : '0', e.damage > 0 ? 'dmg' : 'zero');
        updateSta(e.target.uid, e.sta);
        break;

      case 'direct':
        log('⚔ ' + e.card.name + ' 直接攻擊！對' + who(1 - e.player) + '角色造成 ' +
            e.damage + ' 傷害', me(e.player));
        slashFx(g.players[1 - e.player].character.uid);
        flashHit(g.players[1 - e.player].character.uid);
        break;

      case 'destroy':
        if (e.destroyed) log('✕ ' + e.card.name + ' 被擊破（' + who(e.player) + ' −' + e.size + ' 生命）', 'kill');
        else log('· ' + e.card.name + ' 進入墓地', 'sys');
        fadeOut(e.card.uid, e.s);
        break;

      case 'life':
        log(who(e.player) + '角色生命 ' + e.delta + ' → ' + e.life, e.delta < 0 ? 'kill' : 'sys');
        popNum(g.players[e.player].character.uid,
               (e.delta > 0 ? '+' : '') + e.delta, e.delta < 0 ? 'dmg' : 'heal');
        updateChar(e.player, e.life);   // 不整頁重繪，免得打斷陣亡淡出
        break;

      case 'place':
        if (e.player === 1) log('敵方在 ' + SG.romanOf(e.slot) + ' 放置了一張牌', 'foe');
        render(e.s);
        break;

      case 'gameover':
        log('═ ' + (e.winner === 0 ? '我方勝利' : '我方敗北') + '（' + e.reason + '）═', 'kill');
        break;
    }
  }

  /* 設定播放速度（設定頁與戰鬥畫面共用） */
  SG.setSpeed = function (idx) {
    if (!(idx >= 0 && idx < SPEEDS.length)) idx = 1;
    speedIdx = idx;
    var b = $('btnSpeed');
    if (b) b.textContent = '速度 ' + SPEEDS[speedIdx].n;
  };

  /* ────────── 擲硬幣動畫 ──────────
     正面(我)＝偶數個半圈，反面(敵)＝奇數個半圈，才會停在正確那一面。 */
  var coinTimer = null;

  function coinMs() {
    var w = wait();
    return w ? Math.max(380, Math.min(1200, Math.round(w * 1.8))) : 0;
  }

  function coinFx(winner, label) {
    var box = $('coinFx');
    if (!box) return;
    if (!wait()) { box.classList.remove('show'); return; }   // 「瞬間」不播

    var ms = coinMs();
    var coin = $('coin');
    // 圈數隨時間縮放，太短又轉太多圈只會變成閃爍；落在「敵」時多轉半圈
    var turns = ms >= 800 ? 5 : (ms >= 550 ? 4 : 3);
    var end = turns * 360 + (winner === 1 ? 180 : 0);

    box.style.setProperty('--coin-ms', ms + 'ms');
    coin.style.setProperty('--coin-end', end + 'deg');
    $('coinLabel').textContent = (winner === 0 ? '我方' : '敵方') + '　' + label;

    box.classList.remove('show');
    void box.offsetWidth;               // 重播動畫
    box.classList.add('show');

    clearTimeout(coinTimer);
    coinTimer = setTimeout(function () { box.classList.remove('show'); }, ms + 260);
  }

  function hideCoin() {
    clearTimeout(coinTimer);
    var box = $('coinFx');
    if (box) box.classList.remove('show');
  }

  function banner(text) {
    var b = $('phaseBanner');
    b.textContent = text;
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  }

  /* 效果發動：卡片亮一下 */
  function flashCast(uid) {
    if (!wait()) return;
    var el = findCardEl(uid);
    if (!el) return;
    el.classList.remove('casting'); void el.offsetWidth; el.classList.add('casting');
  }

  /* 數值被增減：卡片閃一下（增益綠、減益紫） */
  function flashStat(uid, up) {
    if (!wait()) return;
    var el = findCardEl(uid);
    if (!el) return;
    var cls = up ? 'stat-up' : 'stat-down';
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  }

  function findCardEl(uid) { return document.querySelector('.card[data-uid="' + uid + '"]'); }

  function flashHit(uid) {
    var el = findCardEl(uid);
    if (!el) return;
    el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
  }

  /* 刀光：從卡片右上角起，往左下延伸成一道線 */
  function slashFx(uid) {
    if (!wait()) return;                       // 「瞬間」模式不播動畫
    var el = findCardEl(uid);
    if (!el || !el.parentNode) return;
    var r = el.getBoundingClientRect();
    var len = Math.round(Math.sqrt(r.width * r.width + r.height * r.height)) + 12;
    var fx = document.createElement('div');
    fx.className = 'slash';
    fx.style.setProperty('--slash-len', len + 'px');
    el.parentNode.appendChild(fx);
    setTimeout(function () { if (fx.parentNode) fx.parentNode.removeChild(fx); }, 480);
  }

  /* 跳字：-3 / +2 之類，往上飄然後淡出 */
  function popNum(uid, text, cls) {
    if (!wait()) return;
    var el = findCardEl(uid);
    if (!el || !el.parentNode) return;
    var n = document.createElement('div');
    n.className = 'pop-num ' + (cls || 'dmg');
    n.textContent = text;
    el.parentNode.appendChild(n);
    setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 950);
  }

  /* ★ 這兩個函式直接改 DOM、不走 render()，所以「一定要用事件裡記下的數值」。
     若讀 g.players[...] 這種活物件，拿到的會是回合結束後的最終值 ——
     引擎在播放開始前就把整回合算完了。 */
  function updateSta(uid, sta) {
    var el = findCardEl(uid);
    if (!el) return;
    var n = el.querySelector('.st-sta');
    if (n) n.textContent = Math.max(0, sta);
  }

  function updateChar(pi, life) {
    var el = findCardEl(g.players[pi].character.uid);
    if (!el) return;
    var box = el.querySelector('.life');
    if (box) box.innerHTML = '♥ ' + Math.max(0, life) +
      ' <small>/ ' + g.players[pi].character.maxLife + '</small>';
  }

  /* 陣亡：淡出後才把屍體從畫面移除 */
  function fadeOut(uid, snap) {
    var el = findCardEl(uid);
    if (!el || !wait()) { render(snap); return; }
    el.classList.add('dying');
    var ms = Math.max(260, Math.min(460, wait()));
    setTimeout(function () { render(snap); }, ms);
  }

  function log(text, cls) {
    var box = $('log'), d = document.createElement('div');
    d.className = 'l-' + (cls || 'sys');
    d.textContent = text;
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
  }

  /* ────────── 結算 ────────── */
  function showResult() {
    var win = g.winner === 0;
    if (!g.recorded) {                    // 一場只記一次（投降也算）
      g.recorded = true;
      if (SG.Save) {
        var myChar = g.players[0].character;
        SG.Save.recordBattle(win, { faction: myChar ? myChar.faction : null });
      }
    }
    var t = $('resultTitle');
    t.textContent = win ? '勝　利' : '敗　北';
    t.className = win ? 'win' : 'lose';
    $('resultBody').innerHTML =
      '回合數：' + g.turn + '<br>' +
      '原因：' + g.reason + '<br>' +
      '我方剩餘生命：' + g.players[0].character.life + '　/　敵方：' + g.players[1].character.life + '<br>' +
      '<small>種子 ' + g.seed + '</small>' +
      (endHook ? endHook(g) : '');
    $('btnAgain').textContent = endHook ? '回副本' : '再戰一場';
    $('resultOverlay').classList.add('show');
  }

  /* ────────── 綁定 ────────── */
  var bound = false;
  SG.bindBattleUI = function () {
    if (bound) return;          // 防重入：重複綁定會讓每次點擊觸發兩次
    bound = true;
    $('btnReady').addEventListener('click', onReady);
    $('btnShuffle').addEventListener('click', onShuffle);
    $('btnSpeed').addEventListener('click', function () {
      SG.setSpeed((speedIdx + 1) % SPEEDS.length);
      if (SG.Save) { SG.Save.data.settings.speed = speedIdx; SG.Save.save(); }
    });
    $('btnQuit').addEventListener('click', function () {
      if (!g || g.over) return;
      if (!confirm('確定投降？')) return;
      g.over = true; g.winner = 1; g.reason = '投降';
      showResult();
    });
  };
})();
