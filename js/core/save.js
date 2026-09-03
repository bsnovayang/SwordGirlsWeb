/* ═══════════════════════════════════════════════════════════
   玩家資料 + 存檔（localStorage）

   ★ 用 file:// 直接開也要能運作，所以不碰 fetch，只用 localStorage，
     並提供純文字的匯出／匯入，方便換電腦或備份。
   ═══════════════════════════════════════════════════════════ */
var SG = window.SG || (window.SG = {});

(function () {
  'use strict';

  var KEY = 'swordgirls.save.v1';
  var VERSION = 1;

  /* 首次遊玩：等同買了「豪華組合包」—— 四副新手牌組全給。
     之後 P4 做副本／合成／商店時，卡片來源才會變成要自己蒐集。 */
  function starterOwned() {
    var owned = {};
    SG.DECKS.forEach(function (d) {
      owned[d.character] = Math.max(owned[d.character] || 0, 1);
      d.cards.forEach(function (slug) { owned[slug] = (owned[slug] || 0) + 1; });
    });
    return owned;
  }

  function starterDecks() {
    return SG.DECKS.map(function (d, i) {
      return { id: 'd' + (i + 1), name: d.name, character: d.character, cards: d.cards.slice() };
    });
  }

  function fresh() {
    return {
      version: VERSION,
      player: { name: '玩家', tk: 0 },
      owned: starterOwned(),
      stats: { battles: 0, wins: 0, losses: 0 },
      ladder: { points: 0, best: 0, wins: 0, losses: 0 },
      materials: {},
      dungeons: {},
      decks: starterDecks(),
      activeDeck: 0,
      settings: { speed: 1 }
    };
  }

  var data = null;

  function storage() {
    try { return window.localStorage; } catch (e) { return null; }   // 隱私模式等情況
  }

  SG.Save = {
    get data() { return data || (data = SG.Save.load()); },

    load: function () {
      var s = storage();
      if (s) {
        try {
          var raw = s.getItem(KEY);
          if (raw) {
            var d = JSON.parse(raw);
            if (d && d.version === VERSION) return SG.Save.repair(d);
          }
        } catch (e) { /* 壞掉就當作沒有存檔 */ }
      }
      return SG.Save.repair(fresh());     // 走同一條補完流程，形狀才會一致
    },

    /* 每次資料有變動都會呼叫這個 —— 進度是自動存的，玩家不用做任何事。
       寫入成功／失敗都會通知 onSave，UI 可以據此顯示「已自動儲存」或警告。 */
    save: function () {
      var s = storage();
      var okWrite = false;
      if (s) {
        try { s.setItem(KEY, JSON.stringify(SG.Save.data)); okWrite = true; }
        catch (e) { okWrite = false; }
      }
      SG.Save.writable = okWrite;
      if (typeof SG.Save.onSave === 'function') SG.Save.onSave(okWrite);
      return okWrite;
    },

    /* 瀏覽器是否允許本機儲存（無痕模式／被封鎖時為 false） */
    available: function () { return !!storage(); },

    /* 記一場戰績（副本與一般對戰都算） */
    recordBattle: function (win) {
      var st = SG.Save.data.stats;
      st.battles++;
      if (win) st.wins++; else st.losses++;
      SG.Save.save();
      return st;
    },

    reset: function () {
      data = SG.Save.repair(fresh());
      SG.Save.save();
      return data;
    },

    /* 舊存檔／手改壞掉時的補救：補上缺欄位、丟掉不存在的卡 */
    repair: function (d) {
      d.player = d.player || { name: '玩家', tk: 0 };
      d.settings = d.settings || { speed: 1 };
      d.owned = d.owned || {};
      d.stats = d.stats || { battles: 0, wins: 0, losses: 0 };
      d.ladder = d.ladder || { points: 0, best: 0, wins: 0, losses: 0 };
      if (!(d.ladder.points >= 0)) d.ladder.points = 0;
      if (!(d.ladder.best >= d.ladder.points)) d.ladder.best = d.ladder.points;
      d.materials = d.materials || {};
      d.dungeons = d.dungeons || {};
      Object.keys(d.materials).forEach(function (k) {
        if (!SG.MATERIALS[k] || !(d.materials[k] > 0)) delete d.materials[k];
      });
      (SG.DUNGEONS || []).forEach(function (dg) {
        var st = d.dungeons[dg.id];
        if (!st || typeof st !== 'object') st = d.dungeons[dg.id] = { floor: 1, clears: 0 };
        var max = SG.dungeonFloors(dg);
        if (!(st.floor >= 1 && st.floor <= max)) st.floor = 1;
        if (!(st.clears >= 0)) st.clears = 0;
      });
      Object.keys(d.owned).forEach(function (k) {
        if (!SG.getCard(k) || !(d.owned[k] > 0)) delete d.owned[k];
      });
      if (!Array.isArray(d.decks) || !d.decks.length) d.decks = starterDecks();
      d.decks.forEach(function (deck, i) {
        deck.id = deck.id || 'd' + (i + 1);
        deck.name = deck.name || ('牌組 ' + (i + 1));
        if (!SG.getCard(deck.character)) deck.character = null;
        deck.cards = (deck.cards || []).filter(function (s) { return !!SG.getCard(s); });
      });
      if (!(d.activeDeck >= 0 && d.activeDeck < d.decks.length)) d.activeDeck = 0;
      return d;
    },

    /* ── 牌組操作 ── */
    activeDeck: function () { return SG.Save.data.decks[SG.Save.data.activeDeck] || null; },

    newDeck: function (name) {
      var d = SG.Save.data;
      var deck = { id: 'd' + (Date.now() % 1e7), name: name || '新牌組', character: null, cards: [] };
      d.decks.push(deck);
      SG.Save.save();
      return deck;
    },

    copyDeck: function (idx) {
      var d = SG.Save.data, src = d.decks[idx];
      if (!src) return null;
      var deck = { id: 'd' + (Date.now() % 1e7), name: src.name + ' 複本',
                   character: src.character, cards: src.cards.slice() };
      d.decks.push(deck);
      SG.Save.save();
      return deck;
    },

    deleteDeck: function (idx) {
      var d = SG.Save.data;
      if (d.decks.length <= 1) return false;        // 至少留一副
      d.decks.splice(idx, 1);
      if (d.activeDeck >= d.decks.length) d.activeDeck = d.decks.length - 1;
      SG.Save.save();
      return true;
    },

    /* 牌組的陣營＝角色卡的陣營；沒選角色卡就還沒定下來 */
    deckFaction: function (deck) {
      var ch = SG.getCard(deck && deck.character);
      return ch ? ch.faction : null;
    },

    /* 隨從／咒語只能放「與角色卡同陣營」或「無所屬」的卡。
       還沒選角色卡時陣營還沒定下來，所以只能先挑角色卡。 */
    factionOk: function (deck, card) {
      if (!card || card.type === 'character') return true;
      if (card.faction === 'neutral') return true;          // 無所屬任何牌組都能放
      var f = SG.Save.deckFaction(deck);
      if (f === null) return false;
      return card.faction === f;
    },

    /* 這張卡「還能再放幾張」＝ min(牌組上限, 持有數) − 已放張數 */
    canAdd: function (deck, slug) {
      var card = SG.getCard(slug);
      if (!card) return 0;
      var owned = SG.Save.data.owned[slug] || 0;
      if (card.type === 'character') return deck.character === slug ? 0 : (owned > 0 ? 1 : 0);
      if (!SG.Save.factionOk(deck, card)) return 0;
      var used = deck.cards.filter(function (s) { return s === slug; }).length;
      return Math.max(0, Math.min(card.limit || 3, owned) - used);
    },

    /* 換了不同陣營的角色卡之後，把不符陣營的隨從／咒語清掉 */
    dropOffFaction: function (deck) {
      if (!deck.character) return 0;          // 沒角色卡就沒有「不符」可言
      var before = deck.cards.length;
      deck.cards = deck.cards.filter(function (slug) {
        return SG.Save.factionOk(deck, SG.getCard(slug));
      });
      SG.Save.save();
      return before - deck.cards.length;
    },

    addCard: function (deck, slug) {
      var card = SG.getCard(slug);
      if (!card || !SG.Save.canAdd(deck, slug)) return false;
      if (card.type === 'character') deck.character = slug;
      else {
        if (deck.cards.length >= 30) return false;
        deck.cards.push(slug);
      }
      SG.Save.save();
      return true;
    },

    removeCard: function (deck, slug) {
      var i = deck.cards.lastIndexOf(slug);
      if (i < 0) return false;
      deck.cards.splice(i, 1);
      SG.Save.save();
      return true;
    },

    /* ══════ 卡片 / 素材 ══════ */
    addOwned: function (slug, n) {
      if (!SG.getCard(slug)) return false;
      var o = SG.Save.data.owned;
      o[slug] = (o[slug] || 0) + (n || 1);
      SG.Save.save();
      return true;
    },

    addMaterials: function (list) {
      var bag = SG.Save.data.materials;
      list.forEach(function (m) {
        if (!SG.MATERIALS[m.mat]) return;
        bag[m.mat] = (bag[m.mat] || 0) + m.n;
      });
      SG.Save.save();
    },

    /* 合成一張卡：扣素材、加持有數 */
    craft: function (slug) {
      var card = SG.getCard(slug);
      var bag = SG.Save.data.materials;
      if (!card || !SG.canCraft(card, bag)) return false;
      SG.recipeOf(card).forEach(function (r) { bag[r.mat] -= r.n; });
      SG.Save.data.owned[slug] = (SG.Save.data.owned[slug] || 0) + 1;
      SG.Save.save();
      return true;
    },

    /* 這張卡還值不值得做（超過牌組上限就沒必要了） */
    craftUseful: function (slug) {
      var card = SG.getCard(slug);
      if (!card) return false;
      return (SG.Save.data.owned[slug] || 0) < (card.limit || 3);
    },

    /* ══════ 天梯 ══════ */
    ladderResult: function (foe, win) {
      var L = SG.Save.data.ladder;
      var tier = SG.tierById(foe.tier);
      var delta = win ? tier.win : -tier.lose;
      var before = L.points;
      L.points = Math.max(0, L.points + delta);
      if (L.points > L.best) L.best = L.points;
      if (win) L.wins++; else L.losses++;
      SG.Save.save();
      return { delta: L.points - before, points: L.points, best: L.best,
               tier: SG.ladderTier(L.points) };
    },

    /* ══════ 副本進度 ══════ */
    dungeon: function (id) {
      var d = SG.Save.data.dungeons;
      if (!d[id]) d[id] = { floor: 1, clears: 0 };
      return d[id];
    },

    /* 打贏一場：BOSS 層 → 通關（回第 1 層、次數 +1），否則往上一層 */
    dungeonWin: function (dg) {
      var st = SG.Save.dungeon(dg.id);
      var last = SG.dungeonFloors(dg);
      var res = { cleared: false, gotReward: false, drops: [] };

      var ore = [];
      ore.push({ mat: dg.ore, n: 1 });
      var ores = ['ore_green', 'ore_red', 'ore_blue', 'ore_black'];
      ore.push({ mat: ores[Math.floor(Math.random() * ores.length)], n: dg.dropOre });

      if (st.floor >= last) {
        res.cleared = true;
        var extra = st.clears >= 10 ? dg.clearDropAfter : dg.clearDrop;
        ore = ore.concat(extra.map(function (m) { return { mat: m.mat, n: m.n }; }));
        st.clears++;
        st.floor = 1;
        if (st.clears >= 10 && !(SG.Save.data.owned[dg.reward] > 0)) {
          SG.Save.addOwned(dg.reward, 1);
          res.gotReward = true;
        }
      } else {
        st.floor++;
      }
      res.drops = ore;
      SG.Save.addMaterials(ore);
      SG.Save.save();
      return res;
    },

    /* 輸了：往下一層；輸給 BOSS 直接退回第 1 層 */
    dungeonLose: function (dg) {
      var st = SG.Save.dungeon(dg.id);
      var last = SG.dungeonFloors(dg);
      var wasBoss = st.floor >= last;
      st.floor = wasBoss ? 1 : Math.max(1, st.floor - 1);
      SG.Save.save();
      return { wasBoss: wasBoss, floor: st.floor };
    },

    /* ── 匯出 / 匯入 ── */
    exportText: function () { return JSON.stringify(SG.Save.data); },

    importText: function (text) {
      var d;
      try { d = JSON.parse(text); } catch (e) { return '不是有效的存檔內容（JSON 解析失敗）'; }
      if (!d || typeof d !== 'object') return '不是有效的存檔內容';
      if (d.version !== VERSION) return '存檔版本不符（需要 v' + VERSION + '）';
      data = SG.Save.repair(d);
      SG.Save.save();
      return null;                                   // null ＝ 成功
    }
  };
})();
