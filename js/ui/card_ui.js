/* ═══════════════════════════════════════════════════════════
   卡片清單／篩選／詳情 —— 牌組編輯與卡片圖鑑共用
   ═══════════════════════════════════════════════════════════ */
var SG = window.SG || (window.SG = {});

(function () {
  'use strict';

  var FACTIONS = ['vita', 'academy', 'crux', 'darklore'];
  var TYPES = [['character', '角色卡'], ['follower', '隨從卡'], ['spell', '咒語卡']];
  var SORTS = [
    ['id',    '卡號'],
    ['size',  'SIZE'],
    ['atk',   '攻擊力'],
    ['sta',   '體力'],
    ['name',  '名稱']
  ];

  /* 浮動預覽小卡（整站共用一個） */
  var tipEl = null, tipKey = null;
  function tipBox() {
    if (!tipEl) {
      tipEl = document.createElement('div');
      tipEl.id = 'cardTip';
      tipEl.className = 'card-tip';
      document.body.appendChild(tipEl);
    }
    return tipEl;
  }

  function opt(value, label) {
    var o = document.createElement('option');
    o.value = value; o.textContent = label;
    return o;
  }

  SG.UI = {
    typeName: function (t) {
      return t === 'character' ? '角色卡' : t === 'spell' ? '咒語卡' : '隨從卡';
    },
    facShort: function (f) { var x = SG.FACTIONS[f]; return x ? x.short : f; },
    facName:  function (f) { var x = SG.FACTIONS[f]; return x ? x.name : f; },

    /* 建立篩選下拉的選項 */
    fillFilters: function (selFaction, selType, selSort) {
      selFaction.innerHTML = ''; selType.innerHTML = ''; selSort.innerHTML = '';
      selFaction.appendChild(opt('', '全部陣營'));
      FACTIONS.forEach(function (f) { selFaction.appendChild(opt(f, SG.UI.facName(f))); });
      selType.appendChild(opt('', '全部類型'));
      TYPES.forEach(function (t) { selType.appendChild(opt(t[0], t[1])); });
      SORTS.forEach(function (s) { selSort.appendChild(opt(s[0], '依 ' + s[1])); });
    },

    /* 篩選 + 排序 */
    filter: function (cards, f) {
      var kw = (f.text || '').trim().toLowerCase();
      var out = cards.filter(function (c) {
        if (f.faction && c.faction !== f.faction) return false;
        if (f.type && c.type !== f.type) return false;
        if (f.ownedOnly && !(f.owned[c.slug] > 0)) return false;
        if (!kw) return true;
        return (c.name + ' ' + (c.en || '') + ' ' + (c.effect || '')).toLowerCase().indexOf(kw) >= 0;
      });
      var key = f.sort || 'id';
      out.sort(function (a, b) {
        if (key === 'name') return a.name.localeCompare(b.name, 'zh-Hant');
        if (key === 'id')   return a.id.localeCompare(b.id);
        var av = a[key] == null ? -1 : a[key], bv = b[key] == null ? -1 : b[key];
        if (av !== bv) return bv - av;                 // 數值型由大到小
        return a.id.localeCompare(b.id);
      });
      return out;
    },

    /* 清單中的一列 */
    row: function (card, opts) {
      opts = opts || {};
      var e = document.createElement('div');
      e.className = 'crow f-' + card.faction + ' type-' + card.type +
                    (opts.dim ? ' dim' : '') + (opts.disabled ? ' disabled' : '');
      e.dataset.slug = card.slug;

      var stat = card.type === 'character'
        ? '<span class="c-life">♥' + card.life + '</span>'
        : '<span class="c-size">' + card.size + '</span>' +
          (card.type === 'follower'
            ? '<span class="c-num st-atk">' + card.atk + '</span>' +
              '<span class="c-num st-def">' + card.def + '</span>' +
              '<span class="c-num st-sta">' + card.sta + '</span>'
            : '<span class="c-spell">咒語</span>');

      e.innerHTML =
        '<span class="c-fac">' + SG.UI.facShort(card.faction) + '</span>' +
        '<span class="c-name">' + card.name + (card.prov ? ' <i class="c-prov">※</i>' : '') + '</span>' +
        '<span class="c-stats">' + stat + '</span>' +
        (opts.badge ? '<span class="c-badge">' + opts.badge + '</span>' : '');
      if (!opts.noTip) SG.UI.attachTip(e, card, card.slug, opts.hint);
      return e;
    },

    /* 右側詳情面板的內容 */
    detailHtml: function (card, ownedCount) {
      if (!card) return '<div class="d-empty">選一張卡片<br>看詳細資料</div>';
      var stats = card.type === 'character'
        ? '<span class="t-life">♥ LIFE ' + card.life + '</span>'
        : '<span>SIZE ' + card.size + '</span>' +
          (card.type === 'follower'
            ? '<span class="st-atk">攻 ' + card.atk + '</span>' +
              '<span class="st-def">防 ' + card.def + '</span>' +
              '<span class="st-sta">體 ' + card.sta + '</span>'
            : '');
      return '<div class="d-name">' + card.name + '</div>' +
        '<div class="d-meta">' + SG.UI.typeName(card.type) + '　' + SG.UI.facName(card.faction) +
        '<br>卡號 ' + card.id + '　' + (card.rarity || '') +
        '<br>分數 ' + card.points + '　牌組上限 ' + card.limit +
        (ownedCount != null ? '　<b>持有 ' + ownedCount + '</b>' : '') + '</div>' +
        '<div class="d-stats">' + stats + '</div>' +
        '<div class="d-eff">' + (card.effect || '（此卡無效果）') + '</div>' +
        (card.prov ? '<div class="d-prov">※ 攻/防/體為暫定值，尚待考據</div>' : '') +
        (card.flavor ? '<div class="d-flavor">' + card.flavor + '</div>' : '') +
        (card.jp ? '<div class="d-jp">日文卡名：' + card.jp + '　／　' + (card.en || '') + '</div>' : '');
    },

    /* ══════ 跟隨游標的懸停預覽 ══════
       戰鬥畫面、牌組編輯、卡片圖鑑共用同一個浮動小卡。
       傳進來的可以是「卡片定義」，也可以是戰鬥中的卡片實體
       （實體身上有 def_，數值則用實體當下的值）。 */
    tipHtml: function (c, hint) {
      if (!c) {
        return '<div class="t-name">？ ？ ？</div>' +
               '<div class="t-eff">對手蓋著的牌，翻開前看不到內容。</div>';
      }
      var d = c.def_ || c;
      var line;
      if (c.type === 'character') {
        line = '<span class="t-life">♥ ' + c.life +
               (c.maxLife ? ' / ' + c.maxLife : '') + '</span>';
      } else if (c.type === 'spell') {
        line = '<span>SIZE ' + c.size + '</span>';
      } else {
        line = '<span>SIZE ' + c.size + '</span>' +
               '<span class="st-atk">攻 ' + c.atk + '</span>' +
               '<span class="st-def">防 ' + c.def + '</span>' +
               '<span class="st-sta">體 ' + c.sta + '</span>';
      }
      var owned = SG.Save && SG.Save.data ? SG.Save.data.owned[d.slug] : null;
      return '<div class="t-name">' + d.name + '</div>' +
        '<div class="t-meta">' + SG.UI.typeName(c.type) + '　' + SG.UI.facName(c.faction) +
        '　分數 ' + (d.points != null ? d.points : '-') +
        '　上限 ' + (d.limit != null ? d.limit : '-') +
        (owned != null ? '　持有 ' + owned : '') + '</div>' +
        '<div class="t-stats">' + line + '</div>' +
        '<div class="t-eff">' + (d.effect || '（此卡無效果）') + '</div>' +
        (d.prov ? '<div class="t-prov">※ 攻/防/體為暫定值，尚待考據</div>' : '') +
        (d.flavor ? '<div class="t-flavor">' + d.flavor + '</div>' : '') +
        (hint ? '<div class="t-hint">' + hint + '</div>' : '');
    },

    showTip: function (card, key, hint) {
      var t = tipBox();
      t.innerHTML = SG.UI.tipHtml(card, hint);
      t.classList.add('show');
      tipKey = key || null;
    },

    moveTip: function (ev) {
      if (!tipEl || !tipEl.classList.contains('show')) return;
      var pad = 16;
      var w = tipEl.offsetWidth || 260, h = tipEl.offsetHeight || 170;
      var vw = window.innerWidth, vh = window.innerHeight;
      var x = ev.clientX + pad, y = ev.clientY + pad;
      if (x + w > vw - 8) x = Math.max(8, ev.clientX - w - pad);
      if (y + h > vh - 8) y = Math.max(8, vh - h - 8);
      tipEl.style.left = x + 'px';
      tipEl.style.top = y + 'px';
    },

    hideTip: function () {
      if (tipEl) tipEl.classList.remove('show');
      tipKey = null;
    },

    tipKey: function () { return tipKey; },

    /* 把懸停預覽掛到一個元素上 */
    attachTip: function (el, card, key, hint) {
      el.addEventListener('mouseenter', function (ev) { SG.UI.showTip(card, key, hint); SG.UI.moveTip(ev); });
      el.addEventListener('mousemove', SG.UI.moveTip);
      el.addEventListener('mouseleave', SG.UI.hideTip);
    },

    /* 清單容器整個被滑出時收起預覽（列會被重繪，mouseleave 有時不會觸發） */
    tipLeaveGuard: function (ids) {
      ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (el && !el.dataset.tipGuard) {
          el.dataset.tipGuard = '1';
          el.addEventListener('mouseleave', SG.UI.hideTip);
        }
      });
    },

    /* 把幾個篩選控制項綁在一起，任何變動就重畫 */
    bindFilters: function (ids, onChange) {
      ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', onChange);
        el.addEventListener('input', onChange);
      });
    }
  };
})();
