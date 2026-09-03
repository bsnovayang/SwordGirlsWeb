/* ═══════════════════════════════════════════════════════════
   S7 卡片圖鑑
   左＝可篩選的全卡清單　右＝詳情
   ═══════════════════════════════════════════════════════════ */
var SG = window.SG || (window.SG = {});

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var picked = null;

  function render() {
    var owned = SG.Save.data.owned;
    var all = SG.collectibleCards();
    var list = SG.UI.filter(all, {
      faction: $('gFaction').value,
      type: $('gType').value,
      ep: $('gEp').value,
      sort: $('gSort').value,
      text: $('gText').value,
      ownedOnly: $('gOwned').checked,
      owned: owned
    });

    var ownedTotal = all.filter(function (c) { return owned[c.slug] > 0; }).length;
    $('glCount').innerHTML = '顯示 <b>' + list.length + '</b> / ' + all.length +
      ' 張　·　已持有 <b>' + ownedTotal + '</b> / ' + all.length + ' 種';

    var host = $('glList');
    host.innerHTML = '';
    list.forEach(function (card) {
      var have = owned[card.slug] || 0;
      var row = SG.UI.row(card, { badge: have ? '×' + have : '未持有', dim: !have,
                                  hint: '▸ 點一下釘在右側詳情' });
      if (picked === card.slug) row.classList.add('on');
      row.addEventListener('click', function () {
        picked = card.slug;
        render();
      });
      host.appendChild(row);
    });
    if (!list.length) host.innerHTML = '<p class="empty">沒有符合條件的卡片</p>';

    SG.UI.tipLeaveGuard(['glList']);

    var card = picked ? SG.getCard(picked) : null;
    $('glDetail').innerHTML = SG.UI.detailHtml(card, card ? (owned[card.slug] || 0) : null);
  }

  SG.renderGallery = render;

  var bound = false;
  SG.bindGallery = function () {
    if (bound) return;
    bound = true;
    SG.UI.fillFilters($('gFaction'), $('gType'), $('gSort'), $('gEp'));
    SG.UI.bindFilters(['gFaction', 'gType', 'gSort', 'gEp', 'gText', 'gOwned'], render);
  };
})();
