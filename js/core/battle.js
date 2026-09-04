/* ═══════════════════════════════════════════════════════════
   Sword Girls 復刻版 — 戰鬥引擎（純邏輯，不碰 DOM）
   輸出「事件序列」供 UI 逐步播放。
   ★ 場地永遠是固定長度 5 的稀疏陣列，禁止 push / splice 壓縮。
   ═══════════════════════════════════════════════════════════ */
var SG = window.SG || (window.SG = {});

(function () {
  'use strict';

  var HAND_MAX   = 5;   // 抽牌補滿至 5 張
  var FIELD_SLOTS= 5;   // 每方 5 格
  var SIZE_MAX   = 10;  // 場上 SIZE 總和上限
  var SHUFFLE_MAX= 2;   // 每場洗牌次數

  SG.CONST = { HAND_MAX: HAND_MAX, FIELD_SLOTS: FIELD_SLOTS, SIZE_MAX: SIZE_MAX, SHUFFLE_MAX: SHUFFLE_MAX };

  /* ── 亂數（可重現） ── */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hashSeed(str) {
    var h = 2166136261;
    str = String(str);
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /* ── 卡片實體 ── */
  var uidSeq = 1;
  function instance(cardId, owner) {
    var d = SG.getCard(cardId);
    if (!d) throw new Error('未知卡片: ' + cardId);
    return {
      uid: 'u' + (uidSeq++), id: cardId, owner: owner, def_: d,
      name: d.name, type: d.type, faction: d.faction,
      size: d.size,
      atk: d.atk | 0, def: d.def | 0, sta: d.sta | 0,
      baseAtk: d.atk | 0, baseDef: d.def | 0, baseSta: d.sta | 0,
      activated: false, faceDown: false,
      /* 這張卡目前帶的技能（SG.Effects 的鍵）。
         Episode 2 起有卡片會「發動後失去技能」「把技能給別人」「複製對手的技能」，
         所以能力不能只看卡片定義，要跟著場上的這一張實體走。      */
      skills: SG.Effects && SG.Effects[cardId] ? [cardId] : []
    };
  }

  /* ── 場面快照 ──────────────────────────────────────────────
     引擎會先把整個回合算完才回傳事件序列，所以 UI 播放到某一步時，
     「當下的引擎狀態」其實已經是回合結束的樣子了。
     因此每個事件都夾帶一份當時的場面快照，UI 照快照畫，
     才看得到被打死的卡還在場上、然後淡出。                        */
  function snapCard(c) {
    if (!c) return null;
    return {
      uid: c.uid, id: c.id, def_: c.def_, name: c.name,
      type: c.type, faction: c.faction, size: c.size,
      atk: c.atk, def: c.def, sta: c.sta,
      life: c.life, maxLife: c.maxLife,
      faceDown: c.faceDown, activated: c.activated
    };
  }

  function snapshot(g) {
    return {
      turn: g.turn, phase: g.phase,
      players: [snapPlayer(g.players[0]), snapPlayer(g.players[1])]
    };
    function snapPlayer(p) {
      return {
        character: snapCard(p.character),
        field: p.field.map(snapCard),
        hand: p.hand.map(snapCard),
        deck: p.deck.length, grave: p.grave.length, shuffles: p.shuffles
      };
    }
  }
  SG.snapshot = snapshot;

  /* 推事件時順手拍一張快照 */
  function E(ev, g, o) {
    if (!g.quiet) o.s = snapshot(g);      // quiet ＝ AI 推演用，不需要快照
    ev.push(o);
    return o;
  }

  /* ── 場地工具 ── */
  function emptySlot(field) {                       // 「第一個空格」＝編號最小的空格
    for (var i = 0; i < FIELD_SLOTS; i++) if (!field[i]) return i;
    return -1;
  }
  function fieldSize(field) {
    var s = 0;
    for (var i = 0; i < FIELD_SLOTS; i++) if (field[i]) s += field[i].size;
    return s;
  }
  function followers(field) {                       // 場上所有隨從的「格位索引」
    var r = [];
    for (var i = 0; i < FIELD_SLOTS; i++) if (field[i] && field[i].type === 'follower') r.push(i);
    return r;
  }
  SG.emptySlot = emptySlot;
  SG.fieldSize = fieldSize;

  /* ── 建立對局 ── */
  /* opts.dungeon ＝ true 表示這是副本戰。
     有些卡的效果原作寫「副本限定」，只有在副本裡才會發動。 */
  SG.createGame = function (deckA, deckB, seed, opts) {
    seed = (seed === undefined || seed === null || seed === '') ? (Date.now() ^ (Math.random() * 1e9 | 0)) : hashSeed(seed);
    var g = {
      seed: seed, rnd: mulberry32(hashSeed(seed)),
      turn: 0, phase: 'init', over: false, winner: -1, reason: '',
      dungeon: !!(opts && opts.dungeon),
      /* 戰鬥統計，給結算評價用（kills[i] ＝ 玩家 i 被擊破的隨從數） */
      stats: { kills: [0, 0] },
      firstPlayer: 0, players: [mkPlayer(deckA, 0), mkPlayer(deckB, 1)]
    };
    shuffleDeck(g, 0); shuffleDeck(g, 1);
    return g;

    function mkPlayer(deck, idx) {
      var ch = instance(deck.character, idx);
      var chDef = SG.getCard(deck.character);
      ch.life = chDef.life; ch.maxLife = chDef.life;
      var p = {
        idx: idx, name: deck.name, deckName: deck.name,
        character: ch,
        deck: deck.cards.slice(),
        hand: [], grave: [],
        field: new Array(FIELD_SLOTS).fill(null),
        shuffles: SHUFFLE_MAX, ready: false
      };
      return p;
    }
  };

  function shuffleDeck(g, pi) {
    var d = g.players[pi].deck;
    for (var i = d.length - 1; i > 0; i--) {
      var j = Math.floor(g.rnd() * (i + 1));
      var t = d[i]; d[i] = d[j]; d[j] = t;
    }
  }

  /* ═══════════ 階段 A：抽牌 → 下牌 ═══════════
     ★ 擲硬幣與「回合開始」能力都不在這裡：原版是按下「確定」之後才擲硬幣，
       接著才處理場上卡片，所以本回合剛下的牌也吃得到回合開始能力。 */
  SG.beginTurn = function (g) {
    var ev = [];
    if (g.over) return ev;
    g.turn++;
    E(ev, g, { t: 'turn', turn: g.turn });

    /* 抽牌：牌庫為 0 → 該玩家敗北 */
    g.phase = 'draw';
    E(ev, g, { t: 'phase', phase: 'draw', label: '抽　牌' });
    for (var oj = 0; oj < 2; oj++) {
      var qi = oj, q = g.players[qi];
      if (q.deck.length === 0) {
        E(ev, g, { t: 'deckout', player: qi });
        finish(g, ev, 1 - qi, '牌庫抽乾');
        return ev;
      }
      var drew = 0;
      while (q.hand.length < HAND_MAX && q.deck.length > 0) {
        q.hand.push(instance(q.deck.shift(), qi));
        drew++;
      }
      E(ev, g, { t: 'draw', player: qi, count: drew });
    }

    /* 進入下牌階段（本版無限時） */
    g.phase = 'place';
    g.players[0].ready = false; g.players[1].ready = false;
    E(ev, g, { t: 'phase', phase: 'place', label: '下　牌' });
    return ev;
  };

  /* ═══════════ 下牌階段操作 ═══════════ */
  SG.canPlace = function (g, pi, handIndex) {
    var p = g.players[pi], c = p.hand[handIndex];
    if (g.phase !== 'place' || !c) return false;
    if (emptySlot(p.field) < 0) return false;
    return fieldSize(p.field) + c.size <= SIZE_MAX;
  };

  SG.place = function (g, pi, handIndex) {
    if (!SG.canPlace(g, pi, handIndex)) return null;
    var p = g.players[pi];
    var c = p.hand.splice(handIndex, 1)[0];
    var slot = emptySlot(p.field);
    c.faceDown = true;          // 蓋著下牌，戰鬥階段才翻開
    c.activated = false;
    p.field[slot] = c;
    return { t: 'place', player: pi, slot: slot, card: c, s: snapshot(g) };
  };

  /* 收回（僅下牌階段、且是本回合剛蓋下的牌） */
  SG.unplace = function (g, pi, slot) {
    var p = g.players[pi], c = p.field[slot];
    if (g.phase !== 'place' || !c || !c.faceDown) return null;
    p.field[slot] = null;
    p.hand.push(c);
    c.faceDown = false;
    return { t: 'unplace', player: pi, slot: slot, card: c, s: snapshot(g) };
  };

  /* 洗牌：手牌全部放回牌庫底，再抽同樣張數 */
  SG.shuffleHand = function (g, pi) {
    var p = g.players[pi];
    if (g.phase !== 'place' || p.shuffles <= 0 || p.hand.length === 0) return null;
    p.shuffles--;
    var n = p.hand.length;
    for (var i = 0; i < n; i++) p.deck.push(p.hand[i].id);
    p.hand.length = 0;
    for (var j = 0; j < n && p.deck.length > 0; j++) p.hand.push(instance(p.deck.shift(), pi));
    return { t: 'shuffle', player: pi, count: n, left: p.shuffles, s: snapshot(g) };
  };

  /* ═══════════ 階段 B：按下「確定」之後 ═══════════
     全場翻開 → 擲硬幣決定先後 → 回合開始能力 → 依序啟動場上卡片 */
  SG.resolveTurn = function (g) {
    var ev = [];
    if (g.over) return ev;

    /* 1. 全場翻開 */
    g.phase = 'turnStart';
    E(ev, g, { t: 'phase', phase: 'turnStart', label: '回合開始' });
    var revealed = [];
    for (var pi = 0; pi < 2; pi++) {
      for (var s = 0; s < FIELD_SLOTS; s++) {
        var c = g.players[pi].field[s];
        if (c && c.faceDown) { c.faceDown = false; revealed.push({ player: pi, slot: s, card: c }); }
      }
    }
    E(ev, g, { t: 'reveal', cards: revealed });

    /* 2. 擲硬幣，決定這回合的先後（能力發動順序＝攻擊順序） */
    var cur = g.rnd() < 0.5 ? 0 : 1;
    g.firstPlayer = cur;
    E(ev, g, { t: 'coin', winner: cur, label: '先　後' });

    /* 3. 角色卡 → Slot Ⅰ..Ⅴ 依序發動「回合開始時」能力 */
    var order = [cur, 1 - cur];
    for (var oi = 0; oi < 2 && !g.over; oi++) {
      var qi = order[oi], q = g.players[qi];
      fireAbility(g, ev, q.character, qi, -1, 'turnStart');
      for (var k = 0; k < FIELD_SLOTS && !g.over; k++) {
        if (q.field[k]) fireAbility(g, ev, q.field[k], qi, k, 'turnStart');
      }
    }
    if (g.over) return ev;

    /* 4. 戰鬥：雙方輪流啟動一張牌 */
    g.phase = 'battle';
    E(ev, g, { t: 'phase', phase: 'battle', label: '戰　鬥' });

    var guard = 0;
    while (!g.over && guard++ < 60) {
      var a = pickNext(g, cur), b = pickNext(g, 1 - cur);
      if (a < 0 && b < 0) break;
      if (a >= 0) activate(g, ev, cur, a);
      if (g.over) break;
      cur = 1 - cur;               // 輪流；若某方無牌可動，另一方會連續行動
    }

    if (!g.over) {
      g.phase = 'endTurn';
      E(ev, g, { t: 'phase', phase: 'endTurn', label: '回合結束' });
      for (var q = 0; q < 2; q++) {
        var f = g.players[q].field;
        for (var k = 0; k < FIELD_SLOTS; k++) if (f[k]) f[k].activated = false;
      }
    }
    return ev;
  };

  /* 選出下一張要啟動的牌：法術一定優先，同類之中隨機 */
  function pickNext(g, pi) {
    var f = g.players[pi].field, spells = [], folls = [];
    for (var i = 0; i < FIELD_SLOTS; i++) {
      var c = f[i];
      if (!c || c.activated) continue;
      (c.type === 'spell' ? spells : folls).push(i);
    }
    var pool = spells.length ? spells : folls;
    if (!pool.length) return -1;
    return pool[Math.floor(g.rnd() * pool.length)];
  }

  function activate(g, ev, pi, slot) {
    var p = g.players[pi], c = p.field[slot];
    if (!c || c.activated) return;
    c.activated = true;
    E(ev, g, { t: 'activate', player: pi, slot: slot, card: c });

    if (c.type === 'spell') {
      var handled = fireAbility(g, ev, c, pi, slot, 'spell');
      if (!handled) E(ev, g, { t: 'note', player: pi, card: c, text: '（效果尚未實作）' });
      toGrave(g, ev, pi, slot, false);
      return;
    }
    doAttack(g, ev, pi, slot);
  }

  /* 隨機挑一個防禦目標，回傳格號；沒有隨從時回傳 -1 */
  function pickTarget(g, defP) {
    var t = followers(defP.field);
    return t.length ? t[Math.floor(g.rnd() * t.length)] : -1;
  }

  function doAttack(g, ev, pi, slot) {
    var atkP = g.players[pi], def_P = g.players[1 - pi];
    var a = atkP.field[slot];
    if (!a) return;

    /* 防禦目標要在「攻擊前」之前就決定 —— 有些卡的攻擊前效果直接寫
       「防禦隨從的體力 -1」之類，作用對象就是這次要打的那張。          */
    var ti = pickTarget(g, def_P), d = ti < 0 ? null : def_P.field[ti];

    fireAbility(g, ev, a, pi, slot, 'beforeAttack', { defender: d });
    if (atkP.field[slot] !== a) return;   // 可能被自身效果移除／移位

    /* 攻擊前效果可能讓原目標離場（或讓對方場上冒出隨從），重新確認 */
    if (ti < 0 || def_P.field[ti] !== d) {
      ti = pickTarget(g, def_P); d = ti < 0 ? null : def_P.field[ti];
    }

    /* 敵方無隨從 → 直接攻擊角色卡，傷害＝攻擊方自己的 SIZE */
    if (ti < 0) {
      E(ev, g, { t: 'direct', player: pi, card: a, damage: a.size });
      loseLife(g, ev, 1 - pi, a.size, 'direct');
      return;
    }

    /* 被攻擊方的「防禦前」能力 */
    fireAbility(g, ev, d, 1 - pi, ti, 'beforeDefend', { attacker: a });
    if (!atkP.field[slot] || !def_P.field[ti]) return;   // 防禦前效果可能讓某一方離場

    var dmg = Math.max(0, a.atk - d.def);
    d.sta -= dmg;
    E(ev, g, { t: 'attack', player: pi, slot: slot, card: a, tSlot: ti, target: d, damage: dmg, sta: d.sta });

    if (d.sta <= 0) { toGrave(g, ev, 1 - pi, ti, true); return; }

    /* ── 反擊 ──────────────────────────────────────────────
       反擊算「額外的一次攻擊」，所以走跟主動攻擊完全一樣的流程：
         · 觸發反擊者的「攻擊前」能力
         · 再觸發承受反擊那一方的「防禦前」能力
           （「防禦前」不分主動攻擊或反擊，被打就觸發）
         · 不消耗反擊者自己這回合的主動攻擊（activated 不變）
         · 被攻擊幾次就反擊幾次，只要沒死
       順序依繁中 wiki FAQ：「攻擊前」優先於「防禦前」。
       反擊不會再引發反擊，所以不會無限遞迴。                          */
    fireAbility(g, ev, d, 1 - pi, ti, 'beforeAttack', { defender: a });
    if (atkP.field[slot] !== a || def_P.field[ti] !== d) return;

    fireAbility(g, ev, a, pi, slot, 'beforeDefend', { attacker: d });
    if (atkP.field[slot] !== a || def_P.field[ti] !== d) return;

    var back = Math.max(0, d.atk - a.def);
    a.sta -= back;
    E(ev, g, { t: 'counter', player: 1 - pi, slot: ti, card: d, tSlot: slot, target: a, damage: back, sta: a.sta });
    if (a.sta <= 0) toGrave(g, ev, pi, slot, true);
  }

  /* 送入墓地。destroyed=true 時，其「主人」損失 Life ＝ 該卡 SIZE */
  function toGrave(g, ev, pi, slot, destroyed) {
    var p = g.players[pi], c = p.field[slot];
    if (!c) return;
    p.field[slot] = null;
    p.grave.push(c);
    E(ev, g, { t: 'destroy', player: pi, slot: slot, card: c, size: c.size, destroyed: !!destroyed });
    if (destroyed) {
      if (g.stats) g.stats.kills[pi]++;
      loseLife(g, ev, pi, c.size, 'death');
    }
  }

  function loseLife(g, ev, pi, amount, cause) {
    if (amount <= 0) return;
    var ch = g.players[pi].character;
    ch.life -= amount;
    E(ev, g, { t: 'life', player: pi, delta: -amount, life: ch.life, cause: cause });
    if (ch.life <= 0) { ch.life = 0; finish(g, ev, 1 - pi, '角色生命歸零'); }
  }
  SG.loseLife = loseLife;

  function finish(g, ev, winner, reason) {
    if (g.over) return;
    g.over = true; g.winner = winner; g.reason = reason;
    g.phase = 'over';
    E(ev, g, { t: 'gameover', winner: winner, reason: reason });
  }

  /* ═══════════ 卡片效果 API ═══════════ */
  SG.Effects = SG.Effects || {};

  /* 這張卡現在在誰的場上（禍從天降會把牌送到對面，不能只信 owner） */
  function sideOf(g, card) {
    for (var pi = 0; pi < 2; pi++) {
      for (var i = 0; i < FIELD_SLOTS; i++) if (g.players[pi].field[i] === card) return pi;
    }
    return card.owner;
  }
  function slotOfCard(g, pi, card) {
    var f = g.players[pi].field;
    for (var i = 0; i < FIELD_SLOTS; i++) if (f[i] === card) return i;
    return -1;
  }

  /* 被效果扣到體力歸零一樣算被擊破，主人一樣扣 Life ＝ 該卡 SIZE */
  function checkDeath(g, ev, card) {
    if (!card || card.type !== 'follower' || card.sta > 0) return;
    var pi = sideOf(g, card), s = slotOfCard(g, pi, card);
    if (s >= 0) toGrave(g, ev, pi, s, true);
  }

  function addLife(g, ev, pi, delta) {
    if (!delta) return;
    if (delta < 0) { loseLife(g, ev, pi, -delta, 'effect'); return; }
    var ch = g.players[pi].character;
    ch.life += delta;          // 原作沒有「回血不得超過上限」的記載，暫不設上限
    E(ev, g, { t: 'life', player: pi, delta: delta, life: ch.life, cause: 'effect' });
  }

  function moveCard(g, ev, fromPi, fromSlot, toPi) {
    var from = g.players[fromPi], to = g.players[toPi];
    var c = from.field[fromSlot];
    if (!c) return -1;
    var dest = emptySlot(to.field);
    if (dest < 0) return -1;                       // 對方沒有空格就轉移不過去
    from.field[fromSlot] = null;
    to.field[dest] = c;
    c.owner = toPi;
    E(ev, g, { t: 'move', from: fromPi, fromSlot: fromSlot, player: toPi, slot: dest, card: c });
    return dest;
  }

  function makeCtx(g, ev, card, pi, slot, extra) {
    var mine = g.players[pi], theirs = g.players[1 - pi];
    return {
      g: g, self: card, slot: slot, me: pi, foe: 1 - pi,
      myField: mine.field, foeField: theirs.field,
      myHand: mine.hand, myGrave: mine.grave,
      foeHand: theirs.hand, foeGrave: theirs.grave,
      myChar: mine.character, foeChar: theirs.character,
      attacker: (extra && extra.attacker) || null,   // 「防禦前」才有值
      defender: (extra && extra.defender) || null,   // 「攻擊前」才有值
      rnd: function () { return g.rnd(); },

      /* 寫一行戰鬥紀錄，代表這張卡的效果發動了 */
      say: function (text) {
        E(ev, g, { t: 'ability', player: pi, card: card, text: text });
      },

      /* 數值增減 */
      mod: function (target, d) {
        if (!target) return;
        var applied = {}, any = false;
        ['atk', 'def', 'sta', 'size'].forEach(function (k) {
          if (!d[k]) return;
          var before = target[k];
          target[k] = Math.max(0, target[k] + d[k]);
          if (target[k] !== before) { applied[k] = target[k] - before; any = true; }
        });
        if (!any) return;
        E(ev, g, { t: 'stat', player: sideOf(g, target), card: target, d: applied });
        checkDeath(g, ev, target);
      },

      /* 直接指定數值（例如「體力=1」「SIZE=1」） */
      set: function (target, k, val) {
        if (!target) return;
        var before = target[k];
        target[k] = Math.max(0, val);
        if (target[k] === before) return;
        var d = {}; d[k] = target[k] - before;
        E(ev, g, { t: 'stat', player: sideOf(g, target), card: target, d: d });
        checkDeath(g, ev, target);
      },

      /* 變成「行動終了」狀態：本回合不再行動 */
      deactivate: function (target) {
        if (!target || target.activated) return;
        target.activated = true;
        E(ev, g, { t: 'deactivate', player: sideOf(g, target), card: target });
      },

      /* 場上的牌送入墓地（非擊破，主人不扣 Life） */
      discard: function (target) {
        if (!target) return;
        var op = sideOf(g, target), s = slotOfCard(g, op, target);
        if (s >= 0) toGrave(g, ev, op, s, false);
      },

      /* 手牌送入墓地 */
      discardHand: function (idx) {
        if (idx < 0 || idx >= mine.hand.length) return null;
        var c = mine.hand.splice(idx, 1)[0];
        mine.grave.push(c);
        E(ev, g, { t: 'handGrave', player: pi, card: c });
        return c;
      },

      /* 對手手牌送入墓地 */
      discardFoeHand: function (idx) {
        if (idx < 0 || idx >= theirs.hand.length) return null;
        var c2 = theirs.hand.splice(idx, 1)[0];
        theirs.grave.push(c2);
        E(ev, g, { t: 'handGrave', player: 1 - pi, card: c2 });
        return c2;
      },

      life: function (playerPi, delta) { addLife(g, ev, playerPi, delta); },

      /* 直接把生命設成某個值（均衡的「生命平分」用） */
      setLife: function (playerPi, val) {
        var ch = g.players[playerPi].character;
        var d = Math.max(0, val) - ch.life;
        if (d) addLife(g, ev, playerPi, d);
      },

      /* 場上的牌送回牌組最下方 */
      toDeckBottom: function (target) {
        if (!target) return false;
        var op = sideOf(g, target), s2 = slotOfCard(g, op, target);
        if (s2 < 0) return false;
        g.players[op].field[s2] = null;
        g.players[op].deck.push(target.id);
        E(ev, g, { t: 'toDeck', player: op, card: target });
        return true;
      },

      /* 墓地全部除外（衛兵的證言） */
      exileGrave: function (playerPi) {
        var n = g.players[playerPi].grave.length;
        if (!n) return 0;
        g.players[playerPi].grave = [];
        E(ev, g, { t: 'exile', player: playerPi, count: n });
        return n;
      },

      /* 依條件把墓地的卡除外，最多 n 張，回傳實際除外的張數 */
      exileWhere: function (playerPi, fn, n) {
        var gr = g.players[playerPi].grave, took = 0;
        for (var i = gr.length - 1; i >= 0 && (!n || took < n); i--) {
          if (fn && !fn(gr[i])) continue;
          gr.splice(i, 1); took++;
        }
        if (took) E(ev, g, { t: 'exile', player: playerPi, count: took });
        return took;
      },

      /* 手牌的卡改數值（mod 是給場上的卡用的，會做死亡判定） */
      modHand: function (target, d) {
        if (!target) return;
        var any = false;
        ['atk', 'def', 'sta', 'size'].forEach(function (k) {
          if (!d[k]) return;
          var b = target[k];
          target[k] = Math.max(0, (target[k] || 0) + d[k]);
          if (target[k] !== b) any = true;
        });
        if (any) E(ev, g, { t: 'handStat', player: pi, card: target, d: d });
      },

      /* 手牌的卡放到牌組最上方 */
      handToDeckTop: function (idx) {
        if (idx < 0 || idx >= mine.hand.length) return null;
        var c = mine.hand.splice(idx, 1)[0];
        mine.deck.unshift(c.id);
        E(ev, g, { t: 'toDeck', player: pi, card: c, top: true });
        return c;
      },

      /* 手牌的卡直接放到場上。slot 省略＝編號最小的空格 */
      handToField: function (idx, slot) {
        if (idx < 0 || idx >= mine.hand.length) return null;
        var s = slot;
        if (!(s >= 0 && s < 5) || mine.field[s]) {
          s = -1;
          for (var i = 0; i < 5; i++) if (!mine.field[i]) { s = i; break; }
        }
        if (s < 0) return null;
        var c = mine.hand.splice(idx, 1)[0];
        c.owner = pi; c.faceDown = false; c.activated = true;
        mine.field[s] = c;
        E(ev, g, { t: 'summon', player: pi, slot: s, card: c });
        return c;
      },

      /* 雙方手牌各一張互換 */
      swapHand: function (myIdx, foeIdx) {
        if (myIdx < 0 || myIdx >= mine.hand.length) return false;
        if (foeIdx < 0 || foeIdx >= theirs.hand.length) return false;
        var a = mine.hand[myIdx], b = theirs.hand[foeIdx];
        mine.hand[myIdx] = b; theirs.hand[foeIdx] = a;
        a.owner = 1 - pi; b.owner = pi;
        E(ev, g, { t: 'swapHand', player: pi, a: a, b: b });
        return true;
      },

      /* 兩張卡的所有數值互換（交換魔術） */
      swapStats: function (a, b) {
        if (!a || !b) return false;
        ['size', 'atk', 'def', 'sta'].forEach(function (k) {
          var t = a[k]; a[k] = b[k]; b[k] = t;
        });
        E(ev, g, { t: 'swap', a: a, b: b, player: pi });
        checkDeath(g, ev, a); checkDeath(g, ev, b);
        return true;
      },

      /* 直接破壞（跟被打死一樣，主人要扣 Life ＝ SIZE） */
      destroy: function (target) {
        if (!target) return;
        var op = sideOf(g, target), s2 = slotOfCard(g, op, target);
        if (s2 >= 0) toGrave(g, ev, op, s2, true);
      },
      move: function (fromPi, fromSlot, toPi) { return moveCard(g, ev, fromPi, fromSlot, toPi); },
      slotOf: function (target) { var op = sideOf(g, target); return slotOfCard(g, op, target); },

      /* ── 牌庫檢索／招喚／複製（Episode 3 起的卡會用到）──────

         fn(def) 拿到的是卡片「定義」（SG.getCard 的結果），不是場上實體。 */

      /* 從牌庫找出符合條件的卡放到手牌，最多 n 張，回傳實際拿到的實體 */
      deckToHand: function (fn, n) {
        var out = [], want = n || 1;
        for (var i = 0; i < mine.deck.length && out.length < want; i++) {
          if (mine.hand.length >= HAND_MAX) break;      // 手牌滿了就停
          var def = SG.getCard(mine.deck[i]);
          if (fn && !fn(def)) continue;
          var c = instance(mine.deck.splice(i, 1)[0], pi);
          mine.hand.push(c);
          out.push(c);
          i--;
        }
        if (out.length) E(ev, g, { t: 'tutor', player: pi, cards: out, to: 'hand' });
        return out;
      },

      /* 從牌庫找出符合條件的卡直接放到場上（編號最小的空格），最多 n 張 */
      deckToField: function (fn, n) {
        var out = [], want = n || 1;
        for (var i = 0; i < mine.deck.length && out.length < want; i++) {
          var slot2 = emptySlot(mine.field);
          if (slot2 < 0) break;                          // 場上滿了就停
          var def = SG.getCard(mine.deck[i]);
          if (fn && !fn(def)) continue;
          var c = instance(mine.deck.splice(i, 1)[0], pi);
          c.faceDown = false; c.activated = true;        // 當回合不再行動
          mine.field[slot2] = c;
          out.push(c);
          E(ev, g, { t: 'summon', player: pi, slot: slot2, card: c });
          i--;
        }
        return out;
      },

      /* 把某張卡複製一份放到我方場上（萬聖節系列會複製對手手牌的咒語） */
      spawnCopy: function (card) {
        if (!card) return null;
        var slot2 = emptySlot(mine.field);
        if (slot2 < 0) return null;
        var c = instance(card.id, pi);
        c.faceDown = false; c.activated = true;
        mine.field[slot2] = c;
        E(ev, g, { t: 'summon', player: pi, slot: slot2, card: c, copy: true });
        return c;
      },

      /* 恢復卡片原本的技能（被 loseSkills 拿掉之後可以還原） */
      restoreSkills: function (target) {
        var t = target || card;
        if (!t) return false;
        t.skills = SG.Effects[t.id] ? [t.id] : [];
        E(ev, g, { t: 'skill', player: pi, card: t, mode: 'restore' });
        return true;
      },

      /* ── 技能的增刪（Episode 2 起才有的機制）──────────────
         技能用 SG.Effects 的鍵表示，跟著場上這張實體走。       */
      hasSkill: function (target) { return SG.hasSkill(target); },

      /* 拿掉技能。不帶參數＝拿掉自己的（「發動後失去此技能」） */
      loseSkills: function (target) {
        var t = target || card;
        if (!t || !t.skills || !t.skills.length) return false;
        t.skills = [];
        E(ev, g, { t: 'skill', player: pi, card: t, mode: 'lose' });
        return true;
      },

      /* 給予技能。key ＝ SG.Effects 的鍵（通常借用另一張卡的 id） */
      grantSkill: function (target, key) {
        if (!target || !SG.Effects[key]) return false;
        target.skills = (target.skills || []).slice();
        if (target.skills.indexOf(key) < 0) target.skills.push(key);
        E(ev, g, { t: 'skill', player: pi, card: target, mode: 'grant', key: key });
        return true;
      },

      /* 複製 from 身上的技能給 to（最多 n 個） */
      copySkills: function (from, to, n) {
        if (!from || !to || !from.skills || !from.skills.length) return false;
        var take = from.skills.slice(0, n || from.skills.length);
        to.skills = (to.skills || []).slice();
        take.forEach(function (k) { if (to.skills.indexOf(k) < 0) to.skills.push(k); });
        E(ev, g, { t: 'skill', player: pi, card: to, mode: 'copy', n: take.length });
        return take.length > 0;
      }
    };
  }

  function fireAbility(g, ev, card, pi, slot, when, extra) {
    var list = card.skills || (SG.Effects[card.id] ? [card.id] : []);
    var handled = false;
    for (var i = 0; i < list.length; i++) {
      var e = SG.Effects[list[i]];
      if (!e) continue;
      /* 副本限定的效果只在副本戰發動；一般對戰算「已處理」但不發動 */
      if (e.dungeonOnly && !g.dungeon) { handled = true; continue; }
      if (typeof e[when] !== 'function') continue;
      e[when](makeCtx(g, ev, card, pi, slot, extra));
      handled = true;
      /* 效果可能讓這張卡離場（自爆、被送墓），離場就別再跑後面的技能 */
      if (g.players[pi].field[slot] !== card) break;
    }
    return handled;
  }

  /* 這張卡身上還有沒有技能（Episode 2 有卡片專門針對「有技能的隨從」） */
  SG.hasSkill = function (card) {
    if (!card || !card.skills) return false;
    for (var i = 0; i < card.skills.length; i++) if (SG.Effects[card.skills[i]]) return true;
    return false;
  };

  /* ── 複製整個對局，給 AI 推演用 ──
     rnd 是 closure 沒辦法直接複製，所以用新的種子重建；
     卡片定義（def_）是共用的唯讀資料，指向同一份即可。 */
  function cloneCard(c) {
    if (!c) return null;
    var o = {};
    for (var k in c) o[k] = c[k];
    if (c.skills) o.skills = c.skills.slice();   // 陣列要另外複製，不然推演會改到本體
    return o;
  }

  SG.cloneGame = function (g, seed) {
    var ng = {
      seed: seed, rnd: mulberry32(hashSeed(String(seed))), quiet: true,
      dungeon: g.dungeon,
      turn: g.turn, phase: g.phase, over: g.over,
      winner: g.winner, reason: g.reason, firstPlayer: g.firstPlayer,
      players: []
    };
    ng.players = g.players.map(function (p) {
      return {
        idx: p.idx, name: p.name, deckName: p.deckName,
        character: cloneCard(p.character),
        deck: p.deck.slice(),
        hand: p.hand.map(cloneCard),
        grave: p.grave.map(cloneCard),
        field: p.field.map(cloneCard),
        shuffles: p.shuffles, ready: p.ready
      };
    });
    return ng;
  };

  /* ── 測試用鉤子（正式遊戲流程不會用到） ── */
  SG._test = {
    fire: fireAbility,
    mkCard: instance,
    snapshot: snapshot,
    attack: doAttack        // 讓測試可以直接跑一次完整交戰（含反擊）
  };

  /* ── 給 UI 用的小工具 ── */
  SG.romanOf = function (i) { return ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'][i]; };
})();
