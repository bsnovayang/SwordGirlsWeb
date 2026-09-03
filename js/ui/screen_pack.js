/* ═══════════════════════════════════════════════════════════
   卡包畫面
   上＝點數與抽卡按鈕　中＝這次開出的結果　下＝多餘的卡分解
   ═══════════════════════════════════════════════════════════ */
var SG = window.SG || (window.SG = {});

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var last = null;              // 上一次開出的結果，重繪時保留

  var FAC_NAME = { '': '全部', vita: '公立學校', academy: '私立學校',
                   crux: '南十字', darklore: '暗黑族' };
  var EP_NAME = { '': '全部', 0: 'Episode 0', 1: 'Episode 1', 2: 'Episode 2' };

  /* 目前選的卡包 */
  function filter() {
    var f = $('pkFaction').value;
    var e = $('pkEp').value;
    return { faction: f, ep: e === '' ? '' : +e };
  }

  function fillPickers() {
    var fs = $('pkFaction'), es = $('pkEp');
    if (fs.options.length) return;
    SG.PACK_FACTIONS.forEach(function (v) {
      var o = document.createElement('option');
      o.value = v; o.textContent = FAC_NAME[v];
      fs.appendChild(o);
    });
    SG.PACK_EPISODES.forEach(function (v) {
      var o = document.createElement('option');
      o.value = v === '' ? '' : String(v);
      o.textContent = EP_NAME[v];
      es.appendChild(o);
    });
  }

  function rarityClass(r) {
    return 'rr-' + r.toLowerCase().replace(' ', '-');
  }

  /* 開包結果：新卡標「NEW」，重複的標張數 */
  function resultHtml(res) {
    if (!res) return '';
    var counted = {}, order = [];
    res.cards.forEach(function (c) {
      if (!counted[c.slug]) { counted[c.slug] = { card: c, n: 0 }; order.push(c.slug); }
      counted[c.slug].n++;
    });
    var freshSet = {};
    res.fresh.forEach(function (c) { freshSet[c.slug] = 1; });

    var items = order.map(function (slug) {
      var it = counted[slug], c = it.card, r = SG.rarityOf(c);
      return '<div class="pk-card ' + rarityClass(r) + ' f-' + c.faction + '">' +
             '<div class="pk-rr">' + r + '</div>' +
             '<div class="pk-name">' + c.name + '</div>' +
             '<div class="pk-sub">' + SG.UI.facName(c.faction) + '　' +
             SG.UI.typeName(c.type) + '</div>' +
             (freshSet[slug] ? '<div class="pk-new">NEW</div>' : '') +
             (it.n > 1 ? '<div class="pk-dup">×' + it.n + '</div>' : '') +
             '</div>';
    }).join('');

    var high = res.cards.filter(function (c) {
      return /Rare/.test(SG.rarityOf(c));
    }).length;

    var conv = '';
    if (res.converted && res.converted.length) {
      conv = '<div class="pk-conv">已滿的 <b>' + res.converted.length + '</b> 張自動折成素材：' +
             res.mats.map(function (m) {
               return '<span class="drop">' + SG.matName(m.mat) + ' ×' + m.n + '</span>';
             }).join('') + '</div>';
    }

    return '<div class="pk-summary">開出 <b>' + res.cards.length + '</b> 張　·　' +
           '稀有以上 <b>' + high + '</b> 張　·　新卡 <b>' + res.fresh.length + '</b> 張</div>' +
           '<div class="pk-cards">' + items + '</div>' + conv;
  }

  function render() {
    var p = SG.Save.data.packs, owned = SG.Save.data.owned;
    fillPickers();
    var f = filter();
    var locked = SG.packEpisodeLocked(f.ep);
    var pool = SG.packPool(f);

    $('pkTickets').textContent = p.tickets;
    var can = !locked && pool.length > 0;
    $('btnPull1').disabled = !can || p.tickets < 1;
    $('btnPull10').disabled = !can || p.tickets < SG._pack.TEN_COST;

    /* 這個卡包的內容與機率 */
    if (locked) {
      $('pkOdds').innerHTML = '<div class="pk-locked">🔒 ' + locked + '</div>';
    } else if (!pool.length) {
      $('pkOdds').innerHTML = '<div class="pk-locked">這個組合目前沒有卡片</div>';
    } else {
      $('pkOdds').innerHTML =
        '<div class="pk-pool">卡池 <b>' + pool.length + '</b> 張</div>' +
        SG.packOdds(f).filter(function (o) { return o.n; }).map(function (o) {
          return '<div class="pk-odd"><span>' + o.rarity + '</span>' +
                 '<b>' + o.weight + '%</b>' +
                 '<i>' + o.n + ' 張／指定 1 張約 ' + o.packs + ' 包</i></div>';
        }).join('');
    }

    var toPity = Math.max(0, SG._pack.PITY - p.sinceRare);
    $('pkHint').innerHTML =
      '一包 ' + SG._pack.CARDS_PER_PACK + ' 張。副本每贏一關 +1 點，打贏 BOSS +2 點。<br>' +
      '十連抽保證至少一張<b>稀有</b>以上；連續 ' + SG._pack.PITY +
      ' 張沒開到也會保底（還有 <b>' + toPity + '</b> 張）。<br>' +
      '抽到<b>已達牌組上限</b>的卡會直接折成素材，不會白抽。<br>' +
      '副本通關 10 次的獎勵角色卡<b>不在卡池裡</b>，只能靠通關拿。';

    $('pkResult').innerHTML = resultHtml(last);

    /* 多餘的卡 */
    var spares = Object.keys(owned)
      .map(function (slug) { return { slug: slug, n: SG.spareCount(slug, owned) }; })
      .filter(function (x) { return x.n > 0 && SG.getCard(x.slug); });
    var total = spares.reduce(function (s, x) { return s + x.n; }, 0);
    $('pkSpareCount').innerHTML = total
      ? '多餘 <b>' + total + '</b> 張（' + spares.length + ' 種）'
      : '目前沒有多餘的卡';
    $('btnDisAll').disabled = !total;

    var host = $('pkSpareList');
    host.innerHTML = '';
    spares.sort(function (a, b) { return b.n - a.n; }).forEach(function (x) {
      var card = SG.getCard(x.slug);
      var val = SG.disenchantValue(card) || [];
      var row = SG.UI.row(card, {
        badge: '多 ' + x.n + ' 張 → ' +
               val.map(function (m) { return SG.matName(m.mat) + '×' + m.n; }).join(' ')
      });
      var b = document.createElement('button');
      b.className = 'pk-dis';
      b.textContent = '分解';
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var r = SG.Save.disenchant(x.slug, x.n);
        if (r) {
          SG.toast('分解 ' + x.n + ' 張「' + card.name + '」→ ' +
                   r.got.map(function (m) { return SG.matName(m.mat) + '×' + m.n; }).join('、'));
        }
        render();
      });
      row.appendChild(b);
      host.appendChild(row);
    });
    SG.UI.tipLeaveGuard(['pkSpareList']);
  }

  function pull(n) {
    var f = filter();
    var locked = SG.packEpisodeLocked(f.ep);
    if (locked) { SG.toast(locked); return; }
    var res = SG.Save.openPacks(n, null, f);
    if (!res) { SG.toast('卡包點數不夠'); return; }
    last = res;
    render();
    var host = $('pkResult');
    /* 逐張翻開的節奏感 */
    var cards = host.querySelectorAll('.pk-card');
    for (var i = 0; i < cards.length; i++) {
      cards[i].style.animationDelay = (i * 60) + 'ms';
      cards[i].classList.add('pk-flip');
    }
    if (res.fresh.length) SG.toast('新卡 ' + res.fresh.length + ' 張！');
  }

  var bound = false;
  SG.bindPack = function () {
    if (bound) return;
    bound = true;
    $('btnPull1').addEventListener('click', function () { pull(1); });
    $('btnPull10').addEventListener('click', function () { pull(10); });
    ['pkFaction', 'pkEp'].forEach(function (id) {
      $(id).addEventListener('change', function () { last = null; render(); });
    });
    $('btnDisAll').addEventListener('click', function () {
      var r = SG.Save.disenchantAllSpare();
      if (r.count) {
        SG.toast('分解 ' + r.count + ' 張 → ' +
                 r.got.map(function (m) { return SG.matName(m.mat) + '×' + m.n; }).join('、'));
      }
      render();
    });
  };
  SG.renderPack = render;
})();
