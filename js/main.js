/* ═══════════════════════════════════════════════════════════
   進入點：畫面路由 + 大廳 + 設定
   ═══════════════════════════════════════════════════════════ */
var SG = window.SG || (window.SG = {});

(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  /* ────────── 路由 ────────── */
  var ON_ENTER = {
    menu:           renderLobby,
    deck:           function () { SG.bindDeckScreen(); SG.renderDeckScreen(); },
    gallery:        function () { SG.bindGallery(); SG.renderGallery(); },
    dungeon:        function () { SG.bindDungeon(); SG.renderDungeonList(); },
    floor:          function () { SG.bindDungeon(); SG.renderFloor(); },
    craft:          function () { SG.bindCraft(); SG.renderCraft(); },
    ladder:         function () { SG.bindLadder(); SG.renderLadder(); },
    quest:          function () { SG.bindQuests(); SG.renderQuests(); },
    settings:       renderSettings,
    'battle-setup': renderSetup
  };

  var lastScreen = 'menu';
  function active() { return lastScreen; }

  function go(name) {
    if (name !== 'battle') lastScreen = name;
    var all = document.querySelectorAll('.screen');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
    var t = $('scr-' + name);
    if (t) t.classList.add('active');
    if (ON_ENTER[name]) ON_ENTER[name]();
    window.scrollTo(0, 0);
  }
  SG.go = go;

  /* ────────── S2 大廳 ────────── */
  var TIPS = [
    '下牌一律填入編號最小的空格 —— 想放到後面的格子，就要先把前面填滿。',
    '反擊是額外的一次攻擊，不會消耗自己這回合的主動攻擊。',
    '隨從被擊破時，扣的是「牠主人」的生命，數值等於牠的 SIZE。',
    '咒語永遠比隨從先行動，所以增益咒語一定趕得上同回合的攻擊。',
    '硬幣是按下「確定」之後才擲的，本回合剛下的牌也吃得到「回合開始」能力。',
    '場上 SIZE 總和被效果推過 10 也不會怎樣，只是在降回 10 以下前不能再下牌。'
  ];

  function renderLobby() {
    var d = SG.Save.data, dk = SG.Save.activeDeck();
    $('lbName').textContent = d.player.name;
    $('lbDeck').textContent = dk ? dk.name : '－';
    var kinds = 0, total = 0;
    Object.keys(d.owned).forEach(function (k) { kinds++; total += d.owned[k]; });
    $('lbCards').textContent = total + '（' + kinds + ' 種）';
    var st = d.stats;
    $('lbRecord').textContent = st.battles
      ? st.battles + ' 戰 ' + st.wins + ' 勝 ' + st.losses + ' 敗'
      : '尚無戰績';
    var L = d.ladder;
    if (SG.ladderTier) {
      $('lbLadder').textContent = SG.ladderTier(L.points).name + ' ' + L.points + ' 分';
    }
    if (SG.Save.refreshDaily) {
      SG.Save.refreshDaily();
      var pend = SG.Save.pendingRewards();
      var qb = $('btnQuestMenu');
      if (qb) {
        qb.textContent = '任務 / 成就' + (pend ? '　●' + pend : '');
        qb.classList.toggle('has-pending', pend > 0);
      }
    }
    $('lbTip').textContent = '※ ' + TIPS[Math.floor(Math.random() * TIPS.length)];
  }

  /* ────────── 對戰設定 ────────── */
  function renderSetup() {
    var d = SG.Save.data;
    var mine = $('selMine'), foe = $('selFoe');

    mine.innerHTML = '';
    d.decks.forEach(function (dk, i) {
      var errs = SG.deckErrors(dk);
      var o = document.createElement('option');
      o.value = i;
      o.textContent = dk.name + '（' + dk.cards.length + '/30）' + (errs.length ? '　✗ 不可用' : '');
      o.disabled = errs.length > 0;
      mine.appendChild(o);
    });
    var act = d.activeDeck;
    if (SG.deckErrors(d.decks[act]).length) {
      for (var i = 0; i < d.decks.length; i++) {
        if (!SG.deckErrors(d.decks[i]).length) { act = i; break; }
      }
    }
    mine.value = String(act);

    foe.innerHTML = '';
    SG.DECKS.forEach(function (dk, i) {
      var o = document.createElement('option');
      o.value = i;
      o.textContent = dk.name + '（' + SG.deckPoints(dk) + ' 點）';
      foe.appendChild(o);
    });
    foe.selectedIndex = Math.min(1, SG.DECKS.length - 1);

    var usable = d.decks.filter(function (dk) { return !SG.deckErrors(dk).length; }).length;
    $('setupWarn').textContent = usable
      ? ''
      : '※ 目前沒有可用的牌組，請先到「牌組編輯」把牌組湊滿 30 張並選好角色卡。';
    $('btnStart').disabled = !usable;
  }

  /* ────────── S14 設定 / 存檔 ────────── */
  var SPEED_NAMES = ['慢速', '普通', '快速', '瞬間'];

  function renderSettings() {
    var d = SG.Save.data;
    var st = d.stats;
    var kinds = Object.keys(d.owned).length;
    var mats = 0;
    Object.keys(d.materials).forEach(function (k) { mats += d.materials[k]; });
    var clears = 0;
    Object.keys(d.dungeons).forEach(function (k) { clears += d.dungeons[k].clears; });

    $('saveStatus').innerHTML = SG.Save.available()
      ? '✔ <b>進度會自動儲存</b>　打完一場、組完牌、合成卡片都會馬上寫進這台瀏覽器，' +
        '不用自己複製任何東西。關掉分頁再打開就會接續。'
      : '⚠ <b>這個瀏覽器不允許本機儲存</b>（可能是無痕模式），' +
        '這次的進度關掉分頁就會消失。請改用一般視窗，或用下面的「匯出」手動備份。';
    $('saveStatus').className = 'save-status' + (SG.Save.available() ? '' : ' bad');

    $('saveSum').innerHTML =
      '<span class="chip">對戰 <b>' + st.battles + '</b> 場（' + st.wins + ' 勝 ' + st.losses + ' 敗）</span>' +
      '<span class="chip">牌組 <b>' + d.decks.length + '</b> 副</span>' +
      '<span class="chip">持有卡片 <b>' + kinds + '</b> 種</span>' +
      '<span class="chip">素材 <b>' + mats + '</b> 個</span>' +
      '<span class="chip">副本通關 <b>' + clears + '</b> 次</span>';

    $('setName').value = d.player.name;
    var sp = $('setSpeed');
    if (!sp.options.length) {
      SPEED_NAMES.forEach(function (n, i) {
        var o = document.createElement('option');
        o.value = i; o.textContent = n;
        sp.appendChild(o);
      });
    }
    sp.value = String(d.settings.speed);
    $('saveText').value = '';
    msg('');
  }

  function msg(text, bad) {
    var el = $('saveMsg');
    el.textContent = text;
    el.className = 'save-msg' + (bad ? ' bad' : '');
  }

  /* ────────── 自動儲存提示 ────────── */
  var toastTimer = null, lastToast = 0;
  function toast(okWrite) {
    var el = $('toast');
    if (!el) return;
    var now = Date.now();
    if (okWrite && now - lastToast < 1500) return;    // 連續存檔不要一直跳
    lastToast = now;
    el.textContent = okWrite ? '已自動儲存' : '⚠ 無法儲存（瀏覽器封鎖了本機儲存）';
    el.className = 'toast show' + (okWrite ? '' : ' bad');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = 'toast'; }, okWrite ? 1400 : 4000);
  }

  /* ────────── 規則頁 ────────── */
  function rules() {
    $('rulesBody').innerHTML =
      '<h3>目標</h3><p>把對手角色卡的生命打到 0，或讓對手在抽牌時牌庫見底。</p>' +
      '<h3>場地</h3><pre>' +
      '        我  方                    敵  方\n' +
      '    ┌────┐┌────┐              ┌────┐┌────┐\n' +
      '    │ Ⅰ  ││ Ⅱ  │              │ Ⅱ  ││ Ⅰ  │\n' +
      '    └────┘└────┘              └────┘└────┘\n' +
      '┌────┐      ┌────┐        ┌────┐      ┌────┐\n' +
      '│角色│      │ Ⅲ  │        │ Ⅲ  │      │角色│\n' +
      '└────┘      └────┘        └────┘      └────┘\n' +
      '    ┌────┐┌────┐              ┌────┐┌────┐\n' +
      '    │ Ⅴ  ││ Ⅳ  │              │ Ⅳ  ││ Ⅴ  │\n' +
      '    └────┘└────┘              └────┘└────┘</pre>' +
      '<p>每方 5 格，下牌一律填入<b>編號最小的空格</b>；場上 SIZE 總和上限 <b>10</b>。' +
      '（被效果推過 10 也不會被移除，只是在降回 10 以下前不能再下牌。）</p>' +
      '<h3>牌組</h3><ul>' +
      '<li>角色卡 ×1 ＋ 隨從／咒語卡 <b>共 30 張</b></li>' +
      '<li>同名卡受該卡的「牌組上限」限制（多數 3 張）</li>' +
      '<li><b>陣營鎖定</b>：牌組陣營由角色卡決定，隨從與咒語只能放<b>同陣營</b>或「無所屬」的卡</li>' +
      '</ul>' +
      '<h3>回合流程</h3><ul>' +
      '<li><b>抽牌</b>　補滿手牌 5 張；此時牌庫為 0 者敗北</li>' +
      '<li><b>下牌</b>　雙方同時蓋牌下場（本版不限時）。每場可洗牌 2 次</li>' +
      '<li><b>按下確定後</b>　全場翻開 → <b>擲硬幣決定這回合的先後</b></li>' +
      '<li><b>回合開始能力</b>　先手方依「角色卡 → Ⅰ → Ⅱ → Ⅲ → Ⅳ → Ⅴ」發動，接著後手方</li>' +
      '<li><b>戰鬥</b>　雙方輪流啟動 1 張牌，直到場上全部行動過</li>' +
      '</ul>' +
      '<p>※ 因為硬幣是在確定之後才擲，<b>本回合剛下的牌也會吃到「回合開始」能力</b>。</p>' +
      '<h3>啟動與戰鬥</h3><ul>' +
      '<li>啟動順序隨機，但<b>咒語一定先於隨從</b></li>' +
      '<li>咒語：結算效果後進墓地</li>' +
      '<li>隨從：攻擊<b>隨機一名</b>敵方隨從（無法指定目標）</li>' +
      '<li>傷害 ＝ 攻擊方 攻 − 防禦方 防（最低 0），扣防禦方體力</li>' +
      '<li>體力 &gt; 0 → <b>反擊</b>；體力 ≤ 0 → 被擊破</li>' +
      '<li><b>反擊算額外的一次攻擊</b>：被打幾次就反擊幾次，而且<b>不消耗</b>自己這回合的主動攻擊</li>' +
      '<li>反擊走跟主動攻擊一樣的流程 —— 會觸發反擊者的「攻擊前」，也會觸發承受反擊者的「防禦前」</li>' +
      '<li>一次交戰：<code>A攻擊前 → B防禦前 → A打B</code>；B 沒死則 <code>B攻擊前 → A防禦前 → B反擊A</code></li>' +
      '<li>能力發動順序：時機相同時效果文較前者先處理，且「攻擊前」優先於「防禦前」</li>' +
      '<li><b>隨從被擊破時，該隨從「主人」的角色卡損失生命 ＝ 該隨從的 SIZE</b></li>' +
      '<li>敵方場上沒有隨從時 → 直接攻擊角色卡，傷害 ＝ 攻擊方自己的 SIZE</li>' +
      '</ul>';
  }

  /* ────────── 啟動 ────────── */
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-go]') : null;
    if (b) go(b.dataset.go);
  });

  var started = false;
  function boot() {
    if (started) return;              // DOMContentLoaded 可能被觸發兩次
    started = true;

    SG.Save.load();
    SG.Save.onSave = toast;          // 每次自動儲存都給一個小提示
    rules();
    SG.bindBattleUI();
    SG.setSpeed(SG.Save.data.settings.speed);

    $('btnStart').addEventListener('click', function () {
      var mine = SG.Save.data.decks[+$('selMine').value];
      var foe = SG.DECKS[+$('selFoe').value];
      if (!mine || SG.deckErrors(mine).length) return;
      go('battle');
      SG.startBattle(mine, foe, $('inpSeed').value.trim(), null);
    });

    $('btnAgain').addEventListener('click', function () {
      if (active() === 'ladder') { go('ladder'); return; }
      if (SG.currentDungeon && SG.currentDungeon()) { go('floor'); return; }
      var mine = SG.Save.data.decks[+$('selMine').value];
      var foe = SG.DECKS[+$('selFoe').value];
      SG.startBattle(mine, foe, '');
    });

    $('setName').addEventListener('change', function () {
      SG.Save.data.player.name = this.value.trim() || '玩家';
      SG.Save.save();
    });
    $('setSpeed').addEventListener('change', function () {
      SG.Save.data.settings.speed = +this.value;
      SG.Save.save();
      SG.setSpeed(+this.value);
    });
    $('btnExport').addEventListener('click', function () {
      $('saveText').value = SG.Save.exportText();
      msg('已產生存檔文字，複製起來就是備份。');
    });
    $('btnImport').addEventListener('click', function () {
      var err = SG.Save.importText($('saveText').value);
      if (err) { msg(err, true); return; }
      renderSettings();          // 先重繪，再顯示訊息（順序反了訊息會被清掉）
      msg('匯入成功！');
    });
    $('btnReset').addEventListener('click', function () {
      if (!confirm('確定清除記錄？\n\n牌組、持有卡片、素材、副本進度、戰績全部回到初始狀態，無法復原。')) return;
      SG.Save.reset();
      renderSettings();
      msg('已清除，回到初始狀態。');
    });
  }

  window.addEventListener('DOMContentLoaded', boot);
  if (document.readyState !== 'loading') boot();
})();
