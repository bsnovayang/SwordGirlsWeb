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
      counters: {},
      daily: { date: '', quests: [] },
      achieved: {},
      materials: {},
      dungeons: {},
      packs: { tickets: 0, pulls: 0, sinceRare: 0 },
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
    recordBattle: function (win, ctx) {
      var st = SG.Save.data.stats;
      st.battles++;
      if (win) st.wins++; else st.losses++;
      SG.Save.bump('battle');
      if (win) {
        SG.Save.bump('battleWin');
        var f = ctx && ctx.faction;
        if (f) SG.Save.bump('win.' + f);
      }
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
      d.counters = d.counters || {};
      d.achieved = d.achieved || {};
      d.daily = d.daily || { date: '', quests: [] };
      if (!Array.isArray(d.daily.quests)) d.daily.quests = [];
      d.materials = d.materials || {};
      d.dungeons = d.dungeons || {};
      d.packs = d.packs || { tickets: 0, pulls: 0, sinceRare: 0 };
      if (!(d.packs.tickets >= 0)) d.packs.tickets = 0;
      if (!(d.packs.pulls >= 0)) d.packs.pulls = 0;
      if (!(d.packs.sinceRare >= 0)) d.packs.sinceRare = 0;
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
      SG.Save.bump('craft');
      SG.Save.save();
      return true;
    },

    /* ══════ 卡包 ══════ */

    addTickets: function (n) {
      var p = SG.Save.data.packs;
      p.tickets = Math.max(0, p.tickets + (n || 0));
      SG.Save.save();
      return p.tickets;
    },

    /* 抽 n 包。點數不足回傳 null。
       回傳 { cards:[卡], gained:{slug:張數}, fresh:[第一次拿到的卡] } */
    openPacks: function (n, rnd) {
      n = Math.max(1, n | 0);
      var p = SG.Save.data.packs;
      var cost = n >= 10 ? SG._pack.TEN_COST : n;
      if (p.tickets < cost) return null;

      var owned = SG.Save.data.owned;
      var before = {};
      Object.keys(owned).forEach(function (k) { before[k] = owned[k]; });

      var cards = SG.pullPacks(n, p, rnd);
      p.tickets -= cost;
      p.pulls += cards.length;

      var gained = {};
      cards.forEach(function (c) {
        owned[c.slug] = (owned[c.slug] || 0) + 1;
        gained[c.slug] = (gained[c.slug] || 0) + 1;
      });
      SG.Save.bump('pack', n);
      SG.Save.save();
      return {
        cards: cards, gained: gained,
        fresh: cards.filter(function (c) { return !before[c.slug]; })
      };
    },

    /* ══════ 分解 ══════
       只有超過牌組上限的多餘張數可以分解，不會讓玩家把還用得到的卡拆掉。 */
    disenchant: function (slug, count) {
      var spare = SG.spareCount(slug, SG.Save.data.owned);
      count = Math.min(spare, Math.max(1, count | 0));
      if (count <= 0) return null;
      var val = SG.disenchantValue(slug);
      if (!val) return null;
      var got = val.map(function (m) { return { mat: m.mat, n: m.n * count }; });
      SG.Save.data.owned[slug] -= count;
      SG.Save.addMaterials(got);        // 內含 save()
      SG.Save.bump('disenchant', count);
      SG.Save.save();
      return { count: count, got: got };
    },

    /* 全部多餘的卡一次分解 */
    disenchantAllSpare: function () {
      var owned = SG.Save.data.owned, total = 0, bag = {};
      Object.keys(owned).forEach(function (slug) {
        var r = SG.Save.disenchant(slug, SG.spareCount(slug, owned));
        if (!r) return;
        total += r.count;
        r.got.forEach(function (m) { bag[m.mat] = (bag[m.mat] || 0) + m.n; });
      });
      return { count: total,
               got: Object.keys(bag).map(function (k) { return { mat: k, n: bag[k] }; }) };
    },

    /* 這張卡還值不值得做（超過牌組上限就沒必要了） */
    craftUseful: function (slug) {
      var card = SG.getCard(slug);
      if (!card) return false;
      return (SG.Save.data.owned[slug] || 0) < (card.limit || 3);
    },

    /* ══════ 事件計數 ══════ */
    bump: function (key, n) {
      var c = SG.Save.data.counters;
      c[key] = (c[key] || 0) + (n === undefined ? 1 : n);
    },

    /* ══════ 每日任務 ══════ */
    today: function () {
      var d = new Date();
      return d.getFullYear() + '-' +
             ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
             ('0' + d.getDate()).slice(-2);
    },

    /* 跨日就重抽。基準線記在任務上，進度 ＝ 現在的計數 − 基準線 */
    refreshDaily: function (force) {
      var d = SG.Save.data, today = SG.Save.today();
      if (!force && d.daily.date === today && d.daily.quests.length) return false;

      var pool = SG.QUEST_POOL.slice();
      var picked = [];
      /* 用日期當種子，同一天重開也是同樣的三個任務 */
      var seed = 0;
      for (var i = 0; i < today.length; i++) seed = (seed * 31 + today.charCodeAt(i)) >>> 0;
      function rnd() {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      }
      while (pool.length && picked.length < SG.DAILY_COUNT) {
        picked.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
      }

      d.daily = {
        date: today,
        quests: picked.map(function (q) {
          return { id: q.id, base: d.counters[q.counter] || 0, claimed: false };
        })
      };
      SG.Save.save();
      return true;
    },

    questProgress: function (entry) {
      var q = SG.questById(entry.id);
      if (!q) return { now: 0, need: 1, done: false };
      var now = Math.max(0, (SG.Save.data.counters[q.counter] || 0) - entry.base);
      return { now: Math.min(now, q.need), need: q.need, done: now >= q.need };
    },

    claimQuest: function (entry) {
      var q = SG.questById(entry.id);
      if (!q || entry.claimed) return false;
      if (!SG.Save.questProgress(entry).done) return false;
      entry.claimed = true;
      SG.Save.addMaterials(q.reward);
      SG.Save.save();
      return true;
    },

    /* ══════ 成就 ══════ */
    achieveState: function (a) {
      var d = SG.Save.data;
      var now = SG.achieveProgress(a, d);
      return {
        now: Math.min(now, a.need), need: a.need,
        done: now >= a.need, claimed: !!d.achieved[a.id]
      };
    },

    claimAchieve: function (a) {
      var st = SG.Save.achieveState(a);
      if (!st.done || st.claimed) return false;
      SG.Save.data.achieved[a.id] = true;
      SG.Save.addMaterials(a.reward);
      SG.Save.save();
      return true;
    },

    /* 有沒有可領取的東西（大廳顯示紅點用） */
    pendingRewards: function () {
      var d = SG.Save.data, n = 0;
      d.daily.quests.forEach(function (e) {
        if (!e.claimed && SG.Save.questProgress(e).done) n++;
      });
      SG.ACHIEVEMENTS.forEach(function (a) {
        var st = SG.Save.achieveState(a);
        if (st.done && !st.claimed) n++;
      });
      return n;
    },

    /* ══════ 天梯 ══════ */
    ladderResult: function (foe, win) {
      var L = SG.Save.data.ladder;
      var tier = SG.tierById(foe.tier);
      var delta = win ? tier.win : -tier.lose;
      var before = L.points;
      L.points = Math.max(0, L.points + delta);
      if (L.points > L.best) L.best = L.points;
      if (win) { L.wins++; SG.Save.bump('ladderWin'); } else L.losses++;
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

    /* 打贏一場：BOSS 層 → 通關（回第 1 層、次數 +1），否則往上一層
       score ＝ SG.battleScore() 的結果，faction ＝ 玩家角色的陣營。
       掉落量由評價分數決定，見 js/core/score.js。                       */
    dungeonWin: function (dg, score, faction, floor) {
      var st = SG.Save.dungeon(dg.id);
      var last = SG.dungeonFloors(dg);
      /* floor ＝ 這一場實際打的樓層。沒傳就當作打的是目前進度層。
         打「已經過關的舊樓層」是純練功：照樣拿素材與點數，但不推進進度，
         也不算通關 —— 否則就能一直重打 BOSS 刷通關次數。            */
      if (!(floor >= 1)) floor = st.floor;
      var isProgress = floor >= st.floor;
      var res = { cleared: false, gotReward: false, drops: [], floor: floor,
                  progress: isProgress };

      var ore = SG.scoreDrops(score && score.total ? score.total : 0, dg, faction);

      SG.Save.bump('dungeonWin');
      /* 卡包點數：打贏一關 +1，打贏 BOSS +2 */
      res.tickets = (floor >= last) ? 2 : 1;
      SG.Save.data.packs.tickets += res.tickets;

      if (isProgress && st.floor >= last) {
        res.cleared = true;
        SG.Save.bump('dungeonClear');
        var extra = st.clears >= 10 ? dg.clearDropAfter : dg.clearDrop;
        ore = ore.concat(extra.map(function (m) { return { mat: m.mat, n: m.n }; }));
        st.clears++;
        st.floor = 1;
        if (st.clears >= 10 && !(SG.Save.data.owned[dg.reward] > 0)) {
          SG.Save.addOwned(dg.reward, 1);
          res.gotReward = true;
        }
      } else if (isProgress) {
        st.floor++;
      }
      res.drops = ore;
      SG.Save.addMaterials(ore);
      SG.Save.save();
      return res;
    },

    /* 輸了：往下一層；輸給 BOSS 直接退回第 1 層 */
    dungeonLose: function (dg, floor) {
      var st = SG.Save.dungeon(dg.id);
      var last = SG.dungeonFloors(dg);
      if (!(floor >= 1)) floor = st.floor;
      /* 重打舊樓層輸了不會倒退 —— 那不是進度挑戰 */
      if (floor < st.floor) return { wasBoss: false, floor: st.floor, progress: false };
      var wasBoss = st.floor >= last;
      st.floor = wasBoss ? 1 : Math.max(1, st.floor - 1);
      SG.Save.save();
      return { wasBoss: wasBoss, floor: st.floor, progress: true };
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
