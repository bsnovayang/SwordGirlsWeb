/* ═══════════════════════════════════════════════════════════
   S3 副本選擇 / S4 副本樓層
   ═══════════════════════════════════════════════════════════ */
var SG = window.SG || (window.SG = {});

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var current = null;                 // 目前進入的副本

  /* ────────── S3 副本清單 ────────── */
  SG.renderDungeonList = function () {
    var host = $('dgList');
    host.innerHTML = '';
    SG.DUNGEONS.forEach(function (dg) {
      var st = SG.Save.dungeon(dg.id);
      var max = SG.dungeonFloors(dg);
      var reward = SG.getCard(dg.reward);
      var got = SG.Save.data.owned[dg.reward] > 0;

      var el = document.createElement('div');
      el.className = 'dg-row';
      el.innerHTML =
        '<div class="dg-main">' +
          '<div class="dg-name">' + dg.name + '<span class="dg-tier">' + dg.tier + '</span></div>' +
          '<div class="dg-desc">' + dg.desc + '</div>' +
        '</div>' +
        '<div class="dg-stat">' +
          '<div>目前樓層　<b>' + st.floor + '</b> / ' + max + '</div>' +
          '<div>通關次數　<b>' + st.clears + '</b> / 10</div>' +
          '<div class="dg-reward' + (got ? ' got' : '') + '">' +
            (got ? '✔ 已取得　' : '獎勵　') + reward.name + '</div>' +
        '</div>';
      el.addEventListener('click', function () { enter(dg.id); });
      host.appendChild(el);
    });
  };

  function enter(id) {
    current = SG.getDungeon(id);
    SG.go('floor');
  }

  /* ────────── S4 樓層 ────────── */
  SG.renderFloor = function () {
    if (!current) { SG.go('dungeon'); return; }
    var dg = current, st = SG.Save.dungeon(dg.id), max = SG.dungeonFloors(dg);
    var reward = SG.getCard(dg.reward);
    var got = SG.Save.data.owned[dg.reward] > 0;

    $('flTitle').textContent = dg.name;
    $('flHead').innerHTML =
      '<span class="chip">目前樓層 <b>' + st.floor + ' / ' + max + '</b></span>' +
      '<span class="chip">通關次數 <b>' + st.clears + ' / 10</b></span>' +
      '<span class="chip">獎勵 <b>' + reward.name + '</b>' + (got ? '（已取得）' : '') + '</span>';

    var host = $('flFloors');
    host.innerHTML = '';
    for (var f = max; f >= 1; f--) {
      var foe = SG.dungeonFoe(dg, f);
      var ch = SG.getCard(foe.deck.character);
      var row = document.createElement('div');
      row.className = 'fl-row' + (f === st.floor ? ' now' : '') +
                      (f < st.floor ? ' done' : '') + (foe.boss ? ' boss' : '');
      row.innerHTML =
        '<span class="fl-no">' + (f === max ? 'BOSS' : f + 'F') + '</span>' +
        '<span class="fl-foe">' + foe.name +
          (ch.tl ? '<i class="fl-tl" title="名稱為暫譯">暫譯</i>' : '') + '</span>' +
        '<span class="fl-life">♥ ' + ch.life + '</span>' +
        (ch.effect ? '<span class="fl-eff">' + ch.effect + '</span>' : '<span class="fl-eff"></span>');
      SG.UI.attachTip(row, ch, 'floor' + f);
      host.appendChild(row);
    }

    renderDeckPicker(st, max);
  };

  /* 出戰牌組：直接在這裡挑，不用跑去牌組編輯按「設為使用中」 */
  function renderDeckPicker(st, max) {
    var data = SG.Save.data, sel = $('flDeck');
    sel.innerHTML = '';
    data.decks.forEach(function (dk, i) {
      var errs = SG.deckErrors(dk);
      var o = document.createElement('option');
      o.value = i;
      o.textContent = dk.name + '（' + dk.cards.length + '/30）' + (errs.length ? '　✗ 不可用' : '');
      o.disabled = errs.length > 0;
      sel.appendChild(o);
    });

    /* 使用中的牌組不能用時，自動改挑第一副能用的 */
    var pick = data.activeDeck;
    if (SG.deckErrors(data.decks[pick]).length) {
      for (var i = 0; i < data.decks.length; i++) {
        if (!SG.deckErrors(data.decks[i]).length) { pick = i; break; }
      }
    }
    sel.value = String(pick);
    if (data.activeDeck !== pick && !SG.deckErrors(data.decks[pick]).length) {
      data.activeDeck = pick;
      SG.Save.save();
    }

    var dk = data.decks[pick];
    var errs = dk ? SG.deckErrors(dk) : ['沒有牌組'];
    var fac = dk ? SG.Save.deckFaction(dk) : null;
    $('flDeckInfo').innerHTML = !dk ? '' :
      (fac ? '<b class="f-' + fac + '">' + SG.UI.facName(fac) + '</b>　' : '') +
      SG.deckPoints(dk) + ' 點' +
      (errs.length ? '　<span class="bad">' + errs[0] + '</span>' : '');

    var usable = data.decks.filter(function (x) { return !SG.deckErrors(x).length; }).length;
    $('btnChallenge').disabled = errs.length > 0;
    $('btnChallenge').textContent = !usable
      ? '沒有可用的牌組'
      : errs.length ? '這副牌組不可用'
      : '挑戰 ' + (st.floor >= max ? 'BOSS' : st.floor + 'F');
  }

  /* ────────── 挑戰 ────────── */
  function challenge() {
    var dg = current;
    if (!dg) return;
    var st = SG.Save.dungeon(dg.id);
    var dk = SG.Save.activeDeck();
    if (!dk || SG.deckErrors(dk).length) return;
    var foe = SG.dungeonFoe(dg, st.floor);

    SG.go('battle');
    SG.startBattle(dk, foe.deck, '', { onEnd: function (g) { return settle(dg, g, dk); } });
  }

  /* 評價明細（參考遊戲王 Duel Links 的結算加分） */
  function scoreHtml(sc) {
    var rows = sc.lines.map(function (l) {
      return '<div class="sc-row"><span>' + l.label + '</span><b>+' + l.n + '</b></div>';
    }).join('');
    var mul = sc.mulLines.map(function (l) {
      return '<div class="sc-row sc-mul"><span>' + l.label + '</span><b>×' + l.n + '</b></div>';
    }).join('');
    return '<div class="rs-score"><div class="sc-head">戰鬥評價</div>' +
           rows + mul +
           '<div class="sc-row sc-total"><span>合計</span><b>' + sc.total + '</b></div></div>';
  }

  /* 戰鬥結束 → 結算副本進度，回傳要顯示在結算視窗的 HTML
     ※ 樓層要在 dungeonWin() 推進之前先讀，評價的樓層倍率算的是「這場打的那層」 */
  function settle(dg, g, dk) {
    var st = SG.Save.dungeon(dg.id);
    if (g.winner !== 0) {
      var lose = SG.Save.dungeonLose(dg);
      return '<div class="rs-dg">' +
        (lose.wasBoss ? '敗給 BOSS —— 退回第 1 層' : '往下一層 → 第 ' + lose.floor + ' 層') +
        '</div>';
    }
    var floors = SG.dungeonFloors(dg), floor = st.floor;
    var sc = SG.battleScore(g, {
      dungeon: dg, floor: floor, floors: floors, isBoss: floor >= floors
    });
    var win = SG.Save.dungeonWin(dg, sc, SG.Save.deckFaction(dk));
    var drops = win.drops.map(function (m) {
      return '<span class="drop">' + SG.matName(m.mat) + ' ×' + m.n + '</span>';
    }).join('');
    st = SG.Save.dungeon(dg.id);
    var html = scoreHtml(sc) +
      '<div class="rs-dg">' +
      (win.cleared ? '★ 通關！累計 ' + st.clears + ' 次（樓層回到第 1 層）'
                   : '往上一層 → 第 ' + st.floor + ' 層') + '</div>' +
      '<div class="rs-drops">' + drops +
      '<span class="drop drop-tk">卡包點數 ×' + win.tickets + '</span></div>';
    if (win.gotReward) {
      html += '<div class="rs-reward">🎉 通關 10 次！獲得角色卡「' +
              SG.getCard(dg.reward).name + '」</div>';
    }
    return html;
  }

  var bound = false;
  SG.bindDungeon = function () {
    if (bound) return;
    bound = true;
    $('btnChallenge').addEventListener('click', challenge);
    $('flDeck').addEventListener('change', function () {
      var i = +this.value;
      if (SG.deckErrors(SG.Save.data.decks[i]).length) return;
      SG.Save.data.activeDeck = i;
      SG.Save.save();
      SG.renderFloor();
    });
  };

  /* 給結算視窗的「再戰一場」用 */
  SG.currentDungeon = function () { return current; };
})();
