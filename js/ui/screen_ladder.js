/* ═══════════════════════════════════════════════════════════
   S5 模擬天梯
   ═══════════════════════════════════════════════════════════ */
var SG = window.SG || (window.SG = {});

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  SG.renderLadder = function () {
    var L = SG.Save.data.ladder;
    var tier = SG.ladderTier(L.points);
    var next = null;
    SG.LADDER_TIERS.forEach(function (t) {
      if (t.min > L.points && (!next || t.min < next.min)) next = t;
    });

    $('ldHead').innerHTML =
      '<span class="ld-rank ld-' + tier.id + '">' + tier.name + '</span>' +
      '<span class="chip">積分 <b>' + L.points + '</b></span>' +
      '<span class="chip">最高 <b>' + L.best + '</b></span>' +
      '<span class="chip">戰績 <b>' + L.wins + ' 勝 ' + L.losses + ' 敗</b></span>' +
      (next ? '<span class="chip">距離 ' + next.name + ' 還差 <b>' +
              (next.min - L.points) + '</b></span>' : '');
    $('ldTierDesc').textContent = '目前階層的對手：' + tier.desc;

    renderDeckPicker();

    var host = $('ldList');
    host.innerHTML = '';
    SG.LADDER.forEach(function (foe) {
      var t = SG.tierById(foe.tier);
      var deck = SG.ladderDeck(foe);
      var ch = SG.getCard(foe.character);
      var locked = L.points < t.min;

      var el = document.createElement('div');
      el.className = 'ld-row ld-t-' + t.id + (locked ? ' locked' : '');
      el.innerHTML =
        '<div class="ld-main">' +
          '<div class="ld-name">' + foe.name +
            '<span class="ld-tier ld-' + t.id + '">' + t.name + '</span></div>' +
          '<div class="ld-blurb">' + foe.blurb + '</div>' +
        '</div>' +
        '<div class="ld-info">' +
          '<div><b class="f-' + ch.faction + '">' + SG.UI.facName(ch.faction) + '</b>　' +
            ch.name + '</div>' +
          '<div>' + SG.deckPoints(deck) + ' 點　AI ' +
            (t.ai === 'smart' ? '推演型' : '基礎') + '</div>' +
          '<div class="ld-pts">勝 +' + t.win + '　敗 −' + t.lose + '</div>' +
        '</div>' +
        '<div class="ld-act"><button class="ld-go"' + (locked ? ' disabled' : '') + '>' +
          (locked ? '積分 ' + t.min + ' 解鎖' : '挑　戰') + '</button></div>';

      if (!locked) {
        el.querySelector('.ld-go').addEventListener('click', function () { challenge(foe); });
      }
      host.appendChild(el);
    });
  };

  /* 出戰牌組（跟副本畫面同一套邏輯） */
  function renderDeckPicker() {
    var data = SG.Save.data, sel = $('ldDeck');
    sel.innerHTML = '';
    data.decks.forEach(function (dk, i) {
      var errs = SG.deckErrors(dk);
      var o = document.createElement('option');
      o.value = i;
      o.textContent = dk.name + '（' + dk.cards.length + '/30）' + (errs.length ? '　✗ 不可用' : '');
      o.disabled = errs.length > 0;
      sel.appendChild(o);
    });

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
    $('ldDeckInfo').innerHTML = !dk ? '' :
      (fac ? '<b class="f-' + fac + '">' + SG.UI.facName(fac) + '</b>　' : '') +
      SG.deckPoints(dk) + ' 點' +
      (errs.length ? '　<span class="bad">' + errs[0] + '</span>' : '');
  }

  function challenge(foe) {
    var dk = SG.Save.activeDeck();
    if (!dk || SG.deckErrors(dk).length) return;
    var t = SG.tierById(foe.tier);

    SG.go('battle');
    SG.startBattle(dk, SG.ladderDeck(foe), '', {
      ai: t.ai,
      aiOpts: t.opts,
      onEnd: function (g) { return settle(foe, g); }
    });
  }

  function settle(foe, g) {
    var r = SG.Save.ladderResult(foe, g.winner === 0);
    var sign = r.delta > 0 ? '+' : '';
    return '<div class="rs-dg">天梯積分 <b>' + sign + r.delta + '</b>　→　' + r.points +
      '　<span class="ld-rank ld-' + r.tier.id + '">' + r.tier.name + '</span></div>' +
      (r.points === r.best && r.delta > 0 ? '<div class="rs-reward">★ 新高積分！</div>' : '');
  }

  var bound = false;
  SG.bindLadder = function () {
    if (bound) return;
    bound = true;
    $('ldDeck').addEventListener('change', function () {
      var i = +this.value;
      if (SG.deckErrors(SG.Save.data.decks[i]).length) return;
      SG.Save.data.activeDeck = i;
      SG.Save.save();
      SG.renderLadder();
    });
  };
})();
