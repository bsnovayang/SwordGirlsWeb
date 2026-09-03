/* ═══════════════════════════════════════════════════════════
   S10 合成工房
   左＝可合成的卡片清單　右＝配方 ＋ 素材庫存
   ═══════════════════════════════════════════════════════════ */
var SG = window.SG || (window.SG = {});

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var picked = null;

  function craftable() {
    return SG.collectibleCards().filter(function (c) { return !!SG.recipeOf(c); });
  }

  function render() {
    var bag = SG.Save.data.materials, owned = SG.Save.data.owned;
    var all = craftable();
    var list = SG.UI.filter(all, {
      faction: $('cFaction').value,
      type: $('cType').value,
      ep: $('cEp').value,
      sort: $('cSort').value,
      text: $('cText').value,
      ownedOnly: false,
      owned: owned
    });
    if ($('cReady').checked) {
      list = list.filter(function (c) { return SG.canCraft(c, bag); });
    }

    var ready = all.filter(function (c) { return SG.canCraft(c, bag); }).length;
    $('cfCount').innerHTML = '顯示 <b>' + list.length + '</b> 張　·　素材足夠 <b>' + ready + '</b> 張';

    var host = $('cfList');
    host.innerHTML = '';
    list.forEach(function (card) {
      var have = owned[card.slug] || 0;
      var can = SG.canCraft(card, bag);
      var useful = SG.Save.craftUseful(card.slug);
      var row = SG.UI.row(card, {
        badge: '持有 ' + have + '/' + card.limit,
        dim: !can,
        hint: !can ? '▸ 素材不足'
            : useful ? '▸ 點一下查看配方，右邊可以合成'
                     : '▸ 已達牌組上限，做了也放不進牌組'
      });
      if (picked === card.slug) row.classList.add('on');
      if (!useful) row.classList.add('maxed');
      row.addEventListener('click', function () { picked = card.slug; render(); });
      host.appendChild(row);
    });
    if (!list.length) host.innerHTML = '<p class="empty">沒有符合條件的卡片</p>';
    SG.UI.tipLeaveGuard(['cfList']);

    renderRecipe();
    renderBag();
  }

  function renderRecipe() {
    var bag = SG.Save.data.materials;
    var card = picked ? SG.getCard(picked) : null;
    if (!card) {
      $('cfRecipe').innerHTML = '<p class="empty">左邊選一張卡片</p>';
      $('btnCraft').disabled = true;
      return;
    }
    var r = SG.recipeOf(card);
    var rows = r.map(function (m) {
      var have = bag[m.mat] || 0;
      return '<div class="rc' + (have >= m.n ? '' : ' short') + '">' +
        '<span>' + SG.matName(m.mat) + '</span>' +
        '<b>' + have + ' / ' + m.n + '</b></div>';
    }).join('');
    var have = SG.Save.data.owned[card.slug] || 0;
    $('cfRecipe').innerHTML =
      '<div class="rc-name">' + card.name + '</div>' +
      '<div class="rc-meta">' + SG.UI.typeName(card.type) + '　' + SG.UI.facName(card.faction) +
      '　持有 ' + have + ' / 牌組上限 ' + card.limit + '</div>' + rows +
      (SG.Save.craftUseful(card.slug) ? ''
        : '<p class="rc-warn">已經有 ' + have + ' 張，達到牌組上限了。</p>');
    $('btnCraft').disabled = !SG.canCraft(card, bag);
  }

  function renderBag() {
    var bag = SG.Save.data.materials;
    var html = Object.keys(SG.MATERIALS).map(function (k) {
      var m = SG.MATERIALS[k], n = bag[k] || 0;
      return '<div class="bag-row' + (n ? '' : ' zero') + (m.unused ? ' unused' : '') + '">' +
        '<span>' + m.name + (m.unused ? '<i>（此章節用不到）</i>' : '') + '</span><b>' + n + '</b></div>';
    }).join('');
    $('cfBag').innerHTML = html;
  }

  function msg(text, bad) {
    var el = $('cfMsg');
    el.textContent = text;
    el.className = 'save-msg' + (bad ? ' bad' : '');
  }

  SG.renderCraft = function () { msg(''); render(); };

  var bound = false;
  SG.bindCraft = function () {
    if (bound) return;
    bound = true;
    SG.UI.fillFilters($('cFaction'), $('cType'), $('cSort'), $('cEp'));
    SG.UI.bindFilters(['cFaction', 'cType', 'cSort', 'cEp', 'cText', 'cReady'], render);
    $('btnCraft').addEventListener('click', function () {
      if (!picked) return;
      var card = SG.getCard(picked);
      if (!SG.Save.craft(picked)) { msg('素材不足', true); return; }
      msg('合成成功！取得「' + card.name + '」（持有 ' + SG.Save.data.owned[picked] + ' 張）');
      render();
    });
  };
})();
