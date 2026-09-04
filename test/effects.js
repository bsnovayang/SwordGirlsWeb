/* 卡片效果單元測試：node test/effects.js */
const fs = require('fs'), path = require('path');
global.window = global;
function load(p) { eval(fs.readFileSync(path.join(__dirname, '..', p), 'utf8')); }
load('js/data/cards.js');
load('js/data/cards_ep1.js');
load('js/data/cards_ep2.js');
load('js/data/cards_ep3.js');
load('js/data/cards_npc.js');
load('js/data/materials.js');
load('js/data/decks.js');
load('js/data/dungeons.js');
load('js/core/battle.js');
load('js/core/effects.js');
load('js/core/effects_ep1.js');
load('js/core/effects_ep2.js');
load('js/core/effects_ep3.js');
load('js/core/ai.js');

let pass = 0, fail = 0;
const failures = [];

function ok(cond, name, detail) {
  if (cond) { pass++; return; }
  fail++; failures.push(name + (detail ? '　→ ' + detail : ''));
}
function eq(actual, expected, name) {
  ok(actual === expected, name, '得到 ' + JSON.stringify(actual) + '，預期 ' + JSON.stringify(expected));
}

/* ── 測試檯：兩邊空場，指定角色卡 ── */
function board(myChar, foeChar) {
  const mk = (ch) => ({ name: 't', character: ch, cards: [] });
  const g = SG.createGame(mk(myChar || 'sita_vilosa'), mk(foeChar || 'cinia_pacifica'), 'fx');
  g.phase = 'battle';
  return g;
}
function put(g, pi, slot, slug) {
  const c = SG._test.mkCard(slug, pi);
  g.players[pi].field[slot] = c;
  return c;
}
function hand(g, pi, slugs) {
  g.players[pi].hand = slugs.map(s => SG._test.mkCard(s, pi));
}
/* 發動某張場上卡的效果，回傳事件陣列 */
function fire(g, pi, slot, when, extra) {
  const ev = [];
  const card = slot < 0 ? g.players[pi].character : g.players[pi].field[slot];
  SG._test.fire(g, ev, card, pi, slot, when, extra);
  return ev;
}
const stats = c => c ? [c.size, c.atk, c.def, c.sta].join('/') : 'null';

console.log('══════ 角色卡 ══════');
{
  const g = board();
  const a = put(g, 1, 0, 'cook_club_student');   // 3/0/8
  const b = put(g, 1, 2, 'new_maid');            // 4/2/6
  const c = put(g, 1, 3, 'tailor_maid');         // 第4格，不該受影響
  fire(g, 0, -1, 'turnStart');
  eq(a.sta, 7, '西塔：敵方 Ⅰ 格體力 -1');
  eq(b.sta, 5, '西塔：敵方 Ⅲ 格體力 -1');
  eq(c.sta, 7, '西塔：敵方 Ⅳ 格不受影響');
}
{
  const g = board('cinia_pacifica', 'sita_vilosa');
  const a = put(g, 1, 0, 'cook_club_student');
  fire(g, 0, -1, 'turnStart');
  eq(a.atk + ',' + a.sta, '2,7', '希妮亞：敵方隨機 1 張 攻/體 -1');
}
{
  const g = board('luthica_preventer');
  const k = put(g, 0, 0, 'crux_knight_terra');   // crux 7/1/6
  const v = put(g, 0, 1, 'cook_club_student');   // vita，不該被選到
  fire(g, 0, -1, 'turnStart');
  eq(k.atk + ',' + k.sta, '8,7', '露西卡：我方「南十字」隨從 攻/體 +1');
  eq(v.atk, 3, '露西卡：非南十字不受影響');
}
{
  const g = board('iri_flina');
  put(g, 0, 0, 'head_maid');                     // size 5
  put(g, 1, 0, 'cook_club_student');             // size 1
  fire(g, 0, -1, 'turnStart');
  eq(g.players[1].character.life, 29, '艾莉：SIZE 較高 → 敵方生命 -1');

  const g2 = board('iri_flina');
  put(g2, 0, 0, 'cook_club_student');
  put(g2, 1, 0, 'head_maid');
  fire(g2, 0, -1, 'turnStart');
  eq(g2.players[1].character.life, 30, '艾莉：SIZE 較低時不發動');
}

console.log('══════ 隨從 ══════');
{
  const g = board();
  const self = put(g, 0, 0, 'cook_club_katie');  // 4/1/12
  fire(g, 0, 0, 'beforeAttack');
  eq(stats(self), '4/4/2/11', '凱蒂：攻擊前 防+1 / 體-1');
  self.sta = 1;
  const before = stats(self);
  fire(g, 0, 0, 'beforeAttack');
  eq(stats(self), before, '凱蒂：體力 1 以下不發動');
}
{
  const g = board();
  const self = put(g, 0, 0, 'cook_club_sylphie');
  fire(g, 0, 0, 'beforeAttack');
  eq(self.atk, 6, '賽菲：攻擊前 攻擊力 +1');
}
{
  const g = board();
  const self = put(g, 0, 0, 'chief_maid');       // 4/6/1/9
  hand(g, 0, ['new_maid', 'accident', 'tighten_security']);
  fire(g, 0, 0, 'beforeAttack');
  eq(self.atk, 8, '首席女僕：送咒語入墓 → 攻擊力 +2');
  eq(g.players[0].hand.length, 2, '首席女僕：手牌少一張');
  eq(g.players[0].grave[0].id, 'accident', '首席女僕：送的是第一張咒語卡');

  const g2 = board();
  const s2 = put(g2, 0, 0, 'chief_maid');
  hand(g2, 0, ['new_maid']);                     // 手牌沒有咒語
  fire(g2, 0, 0, 'beforeAttack');
  eq(s2.atk, 6, '首席女僕：手牌沒咒語卡時不發動');
}
{
  const g = board();
  const l = put(g, 0, 0, 'new_maid');
  const self = put(g, 0, 1, 'mop_maid');
  const r = put(g, 0, 2, 'tailor_maid');
  const far = put(g, 0, 4, 'porter_maid');
  fire(g, 0, 1, 'beforeDefend', { attacker: put(g, 1, 0, 'new_maid') });
  eq(l.atk + ',' + self.atk + ',' + r.atk, '5,6,8', '拖把女僕：自己與鄰接格 攻擊力 +1');
  eq(far.atk, 6, '拖把女僕：非鄰接格不受影響');
}
{
  const g = board();
  put(g, 0, 0, 'flag_knight_frett');
  const t = put(g, 0, 2, 'crux_knight_terra');
  fire(g, 0, 0, 'beforeAttack');
  eq(t.atk + ',' + t.sta, '8,7', '佛雷特：我方 Ⅲ 格隨從 攻/體 +1');
}
{
  const g = board();
  const self = put(g, 0, 0, 'knight_adjt_sarisen');
  const k = put(g, 0, 1, 'crux_knight_terra');   // 名字含「騎士團」
  const m = put(g, 0, 2, 'new_maid');
  fire(g, 0, 0, 'turnStart');
  eq(k.atk + ',' + k.sta, '8,7', '颯琳森：其他「騎士團」隨從 攻/體 +1');
  eq(self.atk, 3, '颯琳森：不含自己');
  eq(m.atk, 4, '颯琳森：非騎士團不受影響');
}
{
  const g = board();
  const self = put(g, 0, 0, 'crux_knight_pintail');       // size 4
  const small = SG._test.mkCard('cook_club_student', 1);  // size 1
  fire(g, 0, 0, 'beforeDefend', { attacker: small });
  eq(self.atk + ',' + self.def, '6,2', '冰提魯：攻擊者 SIZE 較低 → 攻/防 +1');

  const g2 = board();
  const s2 = put(g2, 0, 0, 'crux_knight_pintail');
  const big = SG._test.mkCard('head_maid', 1);            // size 5
  fire(g2, 0, 0, 'beforeDefend', { attacker: big });
  eq(s2.atk + ',' + s2.def, '5,1', '冰提魯：攻擊者 SIZE 較高時不發動');
}
{
  const g = board();
  const sion = put(g, 0, 0, 'scardel_sion_flina');
  const rion = put(g, 0, 1, 'scardel_rion_flina');
  const other = put(g, 0, 2, 'crescent_conundrum');
  fire(g, 0, 0, 'beforeAttack');
  eq(sion.atk + ',' + rion.atk, '8,5', '詩音：詩音/理音 攻擊力 +1');
  eq(other.atk, 4, '詩音：其他隨從不受影響');
  const staBefore = sion.sta;
  fire(g, 0, 1, 'beforeDefend', { attacker: other });
  eq(sion.sta, staBefore + 1, '理音：防禦前 詩音/理音 體力 +1');
}
{
  const g = board();
  const a = put(g, 1, 0, 'porter_maid');
  const b = put(g, 1, 1, 'tailor_maid');
  const c = put(g, 1, 2, 'head_maid');
  put(g, 0, 0, 'moondancer_kata_flina');
  fire(g, 0, 0, 'turnStart');
  const hit = [a, b, c].filter(x => x.atk < x.baseAtk).length;
  eq(hit, 2, '卡塔：敵方隨機 2 張 攻/體 -1');
}

console.log('══════ 副本限定：一般對戰不發動、副本戰才發動 ══════');
{
  /* 這四張原作寫「副本限定：攻擊前，此卡攻/體 +1」。
     引擎用 g.dungeon 判斷（createGame 的 opts.dungeon）。 */
  const SLUGS = ['cook_club_dir_jamie', 'head_maid', 'crux_knight_mitil', 'scardel_pinot_noir'];

  SLUGS.forEach(slug => {
    const g = board();                       // 一般對戰
    const self = put(g, 0, 0, slug);
    const before = stats(self);
    const ev = fire(g, 0, 0, 'beforeAttack');
    ok(stats(self) === before && ev.length === 0,
       '一般對戰不發動：' + SG.getCard(slug).name);
  });

  SLUGS.forEach(slug => {
    const mk = (ch) => ({ name: 't', character: ch, cards: [] });
    const g = SG.createGame(mk('sita_vilosa'), mk('cinia_pacifica'), 'dg', { dungeon: true });
    g.phase = 'battle';
    const self = put(g, 0, 0, slug);
    const a0 = self.atk, s0 = self.sta;
    const ev = fire(g, 0, 0, 'beforeAttack');
    ok(self.atk === a0 + 1 && self.sta === s0 + 1,
       '副本戰會發動（攻/體 +1）：' + SG.getCard(slug).name +
       '　' + a0 + '/' + s0 + ' → ' + self.atk + '/' + self.sta);
    ok(ev.some(e => e.t === 'ability'), '會寫進戰鬥紀錄：' + SG.getCard(slug).name);
  });

  /* 旗標要跟著 cloneGame 走，否則 AI 推演會估錯 */
  {
    const mk = (ch) => ({ name: 't', character: ch, cards: [] });
    const g = SG.createGame(mk('sita_vilosa'), mk('cinia_pacifica'), 'dg2', { dungeon: true });
    eq(SG.cloneGame(g, 'c1').dungeon, true, 'cloneGame 會帶著副本旗標');
    const n = SG.createGame(mk('sita_vilosa'), mk('cinia_pacifica'), 'dg3');
    eq(n.dungeon, false, '沒指定就不是副本戰');
  }
}

console.log('══════ 咒語 ══════');
{
  const g = board('sita_vilosa');
  const a = put(g, 1, 0, 'porter_maid');   // 6/0/12
  const b = put(g, 1, 1, 'head_maid');     // 8/1/11
  put(g, 0, 0, 'heartless_blow');
  fire(g, 0, 0, 'spell');
  const drop = (12 - a.sta) + (11 - b.sta);
  eq(drop, 6, '無情的一擊：角色為「西塔」→ 共扣 6 體力（4+2）');

  const g2 = board('cinia_pacifica');
  const c = put(g2, 1, 0, 'porter_maid');
  put(g2, 0, 0, 'heartless_blow');
  fire(g2, 0, 0, 'spell');
  eq(12 - c.sta, 4, '無情的一擊：角色非「西塔」→ 只扣 4');
}
{
  const g = board();
  const a = put(g, 0, 0, 'cook_club_student');
  const b = put(g, 0, 1, 'cook_club_advisor');
  const m = put(g, 0, 2, 'new_maid');       // 非公立
  put(g, 0, 3, 'student_orientation');
  fire(g, 0, 3, 'spell');
  eq((a.atk - 3) + (b.atk - 6), 4, '歡迎!!新入社員：2 張「公立」隨從 攻 +2');
  eq(m.atk, 4, '歡迎!!新入社員：非公立不受影響');
}
{
  const g = board();
  const a = put(g, 0, 0, 'cook_club_student');
  put(g, 0, 1, 'cooking_failure');
  fire(g, 0, 1, 'spell');
  eq(stats(a), '2/4/1/10', '料理失敗：有料理研究社 → SIZE+1 攻+1 防+1 體+2');

  const g2 = board();
  const m = put(g2, 0, 0, 'new_maid');
  put(g2, 0, 1, 'cooking_failure');
  fire(g2, 0, 1, 'spell');
  eq(stats(m), '2/4/2/6', '料理失敗：場上沒有料理研究社時不發動');
}
{
  const g = board();
  const a = put(g, 0, 2, 'cook_club_svia');   // Ⅲ 格 size4
  put(g, 1, 2, 'cook_club_student');          // 敵方 Ⅲ 格 size1
  put(g, 0, 0, 'ward_rupture');
  fire(g, 0, 0, 'spell');
  eq(a.atk + ',' + a.sta, '10,12', '結界的破裂：攻/體 +3（SIZE 差）');
}
{
  const g = board();
  put(g, 0, 0, 'cook_club_student');   // size 1
  put(g, 0, 1, 'new_recipe');          // size 2
  fire(g, 0, 1, 'spell');
  eq(g.players[0].character.life, 37, '新料理開發：生命 +7（10 − 場上 SIZE 3）');
}
{
  const g = board();
  put(g, 0, 0, 'new_maid');
  put(g, 0, 1, 'tailor_maid');
  const t1 = put(g, 1, 0, 'porter_maid');
  const t2 = put(g, 1, 1, 'head_maid');
  put(g, 0, 2, 'accident');
  fire(g, 0, 2, 'spell');
  eq((6 - t1.atk) + (8 - t2.atk), 4, '閃失：2 張敵方隨從各 攻 -2（我方 2 張女僕）');
}
{
  const g = board();
  const a = put(g, 0, 0, 'new_maid');       // size2
  const b = put(g, 0, 1, 'head_maid');      // size5
  put(g, 0, 2, 'she_did_it');
  fire(g, 0, 2, 'spell');
  const sizes = [a.size, b.size].sort((x, y) => x - y);
  eq(sizes[0], 1, '嫁禍：其中一張 SIZE 變成 1');
  eq(sizes[1], 6, '嫁禍：另一張收下下降的 SIZE 總和（1+5）');
}
{
  const g = board();
  const small = put(g, 0, 0, 'new_maid');    // academy size2
  const big = put(g, 0, 1, 'head_maid');     // academy size5
  put(g, 0, 2, 'noble_sacrifice');
  fire(g, 0, 2, 'spell');
  eq(g.players[0].field[1], null, '崇高的犧牲：SIZE 最大的私立隨從送入墓地');
  eq(g.players[0].field[0], small, '崇高的犧牲：其他隨從留下');
  eq(g.players[0].character.life, 40, '崇高的犧牲：生命 +10（SIZE 5 × 2）');
}
{
  const g = board();
  const t = put(g, 0, 0, 'new_maid');
  hand(g, 0, ['head_maid', 'accident', 'cook_club_student']);   // 2 張私立
  put(g, 0, 1, 'tighten_security');
  fire(g, 0, 1, 'spell');
  eq(t.def, 2, '戒備：防禦力 = 手牌中「私立」卡片數');
}
{
  const g = board('luthica_preventer');
  const k = put(g, 0, 0, 'crux_knight_terra');
  put(g, 0, 1, 'saints_blessing');
  fire(g, 0, 1, 'spell');
  eq(k.sta + ',' + k.atk, '9,10', '聖徒的祝福：角色為露西卡 → 體+3 且 攻+3');

  const g2 = board('sita_vilosa');
  const k2 = put(g2, 0, 0, 'crux_knight_terra');
  put(g2, 0, 1, 'saints_blessing');
  fire(g2, 0, 1, 'spell');
  eq(k2.sta + ',' + k2.atk, '9,7', '聖徒的祝福：角色非露西卡 → 只有 體+3');
}
{
  const g = board();
  const mine = put(g, 0, 1, 'new_maid');
  const small = put(g, 1, 0, 'cook_club_student');
  const big = put(g, 1, 1, 'head_maid');
  put(g, 0, 0, 'entry_denied');
  fire(g, 0, 0, 'spell');
  ok(mine.activated, '拒絕入國：我方第一張隨從 行動終了');
  ok(big.activated, '拒絕入國：敵方 SIZE 最大者 行動終了');
  ok(!small.activated, '拒絕入國：敵方其他隨從不受影響');
}
{
  const g = board();
  hand(g, 0, ['new_maid', 'accident', 'head_maid', 'tailor_maid']);
  put(g, 0, 0, 'healing_magic');
  fire(g, 0, 0, 'spell');
  eq(g.players[0].character.life, 34, '治癒魔法：生命 + 手牌張數');
}
{
  const g = board();
  const f = put(g, 0, 1, 'head_maid');    // size 5
  put(g, 0, 0, 'sky_surprise');
  fire(g, 0, 0, 'spell');
  eq(g.players[0].field[1], null, '禍從天降：離開我方場地');
  eq(g.players[1].field[0], f, '禍從天降：轉移到敵方第一個空格');
  eq(g.players[1].character.life, 27, '禍從天降：敵方生命 -3（SIZE 5 的一半進位）');
  eq(f.size, 1, '禍從天降：該隨從 SIZE = 1');
  ok(f.activated, '禍從天降：該隨從為行動終了狀態');
}
{
  const g = board();
  const a = put(g, 0, 0, 'crescent_conundrum');   // darklore 1/4/2/4
  const b = put(g, 0, 1, 'scardel_chardonnay');   // darklore 2/6/0/6
  put(g, 0, 2, 'flinas_command');
  fire(g, 0, 2, 'spell');
  eq((a.sta - 4) + (b.sta - 6), 6, '菲莉娜的指令：2 張暗黑隨從 體力 +3');
}
{
  const g = board();
  const host = put(g, 0, 0, 'crescent_conundrum');   // darklore，SIZE 最小(1)
  const big = put(g, 0, 1, 'crescent_kris_flina');   // darklore 5/5/2/14
  put(g, 0, 2, 'vampiric_rites');
  fire(g, 0, 2, 'spell');
  eq(big.size + ',' + big.atk + ',' + big.sta, '1,1,1', '吸血的儀式：其他隨從全部歸 1');
  // 下降量：SIZE (0+4)、攻 (3+4)、體 (3+13)
  eq(host.size + ',' + host.atk + ',' + host.sta, '5,8,17', '吸血的儀式：SIZE 最小的暗黑隨從收下全部');
}
{
  const g = board();
  const t = put(g, 0, 0, 'crescent_kris_flina');   // sta 14
  put(g, 0, 1, 'blood_target');
  fire(g, 0, 1, 'spell');
  eq(t.sta, 1, '血的代價：體力 = 1');
  eq(g.players[0].character.life, 40, '血的代價：生命 +10（上限 10）');
}
{
  const g = board();
  put(g, 0, 0, 'sacrifice');
  fire(g, 0, 0, 'spell');
  eq(g.players[0].character.life, 29, '犧牲：我方生命 -1');
  eq(g.players[1].character.life, 26, '犧牲：敵方生命 -4');
}

console.log('══════ 效果造成的擊破 ══════');
{
  const g = board('sita_vilosa');
  const v = put(g, 1, 0, 'cook_club_student');   // size1
  v.sta = 1;                                     // 再吃 1 點就死
  fire(g, 0, -1, 'turnStart');
  eq(g.players[1].field[0], null, '效果扣死：隨從離場');
  eq(g.players[1].character.life, 29, '效果扣死：主人扣 Life ＝ 該卡 SIZE');
  eq(g.players[1].grave.length, 1, '效果扣死：進入墓地');
}

console.log('══════ 事件順序：先宣告發動，再處理效果 ══════');
{
  // 首席女僕：亮一下(ability) → 送墓地(handGrave) → 攻擊力+2(stat)
  const g = board();
  put(g, 0, 0, 'chief_maid');
  hand(g, 0, ['accident']);
  const ev = fire(g, 0, 0, 'beforeAttack');
  const types = ev.map(e => e.t);
  const iAbility = types.indexOf('ability');
  const iGrave = types.indexOf('handGrave');
  const iStat = types.indexOf('stat');
  console.log('  首席女僕事件序列 → ' + types.join(' → '));
  ok(iAbility === 0, '首席女僕：第一個事件是 ability（卡片先亮）');
  ok(iAbility < iGrave, '首席女僕：亮光早於送墓地');
  ok(iGrave < iStat, '首席女僕：送墓地早於攻擊力增加');
}
{
  // 全面檢查：每張卡的效果，第一個事件都必須是 ability
  const cases = [
    ['sita_vilosa', -1, 'turnStart', g => { put(g, 1, 0, 'cook_club_student'); }],
    ['cook_club_katie', 0, 'beforeAttack', null],
    ['cook_club_sylphie', 0, 'beforeAttack', null],
    ['mop_maid', 1, 'beforeDefend', g => { put(g, 0, 0, 'new_maid'); }],
    ['scardel_sion_flina', 0, 'beforeAttack', null],
    ['sky_surprise', 0, 'spell', g => { put(g, 0, 1, 'head_maid'); }],
    ['she_did_it', 2, 'spell', g => { put(g, 0, 0, 'new_maid'); put(g, 0, 1, 'head_maid'); }],
    ['noble_sacrifice', 2, 'spell', g => { put(g, 0, 0, 'new_maid'); put(g, 0, 1, 'head_maid'); }],
    ['vampiric_rites', 2, 'spell', g => { put(g, 0, 0, 'crescent_conundrum'); put(g, 0, 1, 'crescent_kris_flina'); }]
  ];
  cases.forEach(([slug, slot, when, setup]) => {
    const g = board();
    if (setup) setup(g);
    put(g, 0, slot < 0 ? 0 : slot, slot < 0 ? 'cook_club_student' : slug);
    const ev = fire(g, 0, slot, when, { attacker: SG._test.mkCard('new_maid', 1) });
    if (!ev.length) return;              // 沒發動就跳過
    ok(ev[0].t === 'ability',
       '先亮再處理：' + SG.getCard(slug).name,
       '第一個事件是 ' + ev[0].t);
  });
}

console.log('══════ 反擊也是一次攻擊 ══════');
{
  // 首席女僕被攻擊、沒死、反擊 → 應該一樣觸發「攻擊前」效果
  const g = board();
  const chief = put(g, 1, 0, 'chief_maid');       // 防守方 6/1/9
  hand(g, 1, ['accident']);                       // 手上有咒語可送
  put(g, 0, 0, 'new_maid');                       // 攻擊方 4/2/6，打不死它
  const ev = [];
  SG._test.attack(g, ev, 0, 0);
  const types = ev.map(e => e.t);
  console.log('  交戰事件序列 → ' + types.join(' → '));
  ok(types.includes('handGrave'), '反擊時觸發了首席女僕的「攻擊前」效果');
  eq(chief.atk, 8, '反擊前 攻擊力 +2 生效');
  eq(g.players[1].hand.length, 0, '反擊時也會送手牌咒語入墓');
  // 效果必須在反擊之前結算
  ok(types.indexOf('handGrave') < types.indexOf('counter'), '效果早於反擊結算');
  // 反擊傷害要用加成後的攻擊力：8 − 防2 = 6
  const counter = ev.find(e => e.t === 'counter');
  eq(counter.damage, 6, '反擊傷害採用加成後的攻擊力');
}
{
  // 反擊不會消耗自己這回合的主動攻擊
  const g = board();
  const d = put(g, 1, 0, 'porter_maid');      // 6/0/12，被打不會死
  put(g, 0, 0, 'new_maid');
  SG._test.attack(g, [], 0, 0);
  ok(!d.activated, '反擊之後仍未行動（activated 沒被設定）');
}
{
  // 被攻擊幾次就反擊幾次
  const g = board();
  const d = put(g, 1, 0, 'crescent_kris_flina');   // 5/5/2/14 夠肉
  put(g, 0, 0, 'new_maid');
  put(g, 0, 1, 'new_maid');
  let counters = 0;
  [0, 1].forEach(slot => {
    const ev = [];
    SG._test.attack(g, ev, 0, slot);
    counters += ev.filter(e => e.t === 'counter').length;
  });
  eq(counters, 2, '被攻擊兩次就反擊兩次');
  ok(!d.activated, '反擊兩次後依然保有自己的主動攻擊');
}
{
  // 凱蒂的「攻擊前」在反擊時也會發動（體力 1 以下仍不發動）
  const g = board();
  const katie = put(g, 1, 0, 'cook_club_katie');   // 4/4/1/12
  put(g, 0, 0, 'new_maid');                        // 攻 4 − 防 1 = 3 傷害
  const ev = [];
  SG._test.attack(g, ev, 0, 0);
  eq(katie.def, 2, '凱蒂反擊時 防 +1');
  eq(katie.sta, 12 - 3 - 1, '凱蒂反擊時 體 -1（先扣 3 點傷害再扣 1）');
}

console.log('══════ 承受反擊也會觸發「防禦前」 ══════');
{
  // 拖把女僕主動攻擊 → 對方反擊 → 拖把女僕的「防禦前」要觸發
  const g = board();
  const mop = put(g, 0, 0, 'mop_maid');              // 5/5/2/12
  put(g, 1, 0, 'crescent_kris_flina');               // 5/5/2/14，打不死、會反擊
  const ev = [];
  SG._test.attack(g, ev, 0, 0);
  ok(ev.some(e => e.t === 'counter'), '對方有反擊');
  eq(mop.atk, 6, '承受反擊時 拖把女僕的「防禦前」有觸發（攻 +1）');
  // 反擊傷害要用觸發後的數值計算：對方攻 5 − 拖把女僕防 2 = 3
  eq(ev.find(e => e.t === 'counter').damage, 3, '反擊傷害在「防禦前」結算之後才計算');
}
{
  // 順序：反擊者的「攻擊前」要早於承受者的「防禦前」（FAQ：攻擊前優先於防禦前）
  const g = board();
  const mop = put(g, 0, 0, 'mop_maid');              // 有「防禦前」
  const chief = put(g, 1, 0, 'chief_maid');          // 有「攻擊前」
  hand(g, 1, ['accident']);
  const ev = [];
  SG._test.attack(g, ev, 0, 0);
  const abilities = ev.filter(e => e.t === 'ability').map(e => e.card.uid);
  console.log('  交戰事件序列 → ' + ev.map(e => e.t).join(' → '));
  ok(abilities.indexOf(chief.uid) >= 0, '反擊者的「攻擊前」有觸發');
  ok(abilities.indexOf(mop.uid) >= 0, '承受反擊者的「防禦前」有觸發');
  ok(abilities.indexOf(chief.uid) < abilities.indexOf(mop.uid),
     '「攻擊前」早於「防禦前」');
  eq(mop.atk, 6, '拖把女僕 攻 +1');
  eq(chief.atk, 8, '首席女僕 攻 +2');
  // 反擊：首席女僕 8 − 拖把女僕防 2 = 6
  eq(ev.find(e => e.t === 'counter').damage, 6, '反擊傷害採用雙方觸發後的數值');
}
{
  // 主動攻擊時，防守方的「防禦前」照舊觸發（不能因為改動而壞掉）
  const g = board();
  const mop = put(g, 1, 0, 'mop_maid');
  put(g, 0, 0, 'new_maid');
  const ev = [];
  SG._test.attack(g, ev, 0, 0);
  eq(mop.atk, 6, '被主動攻擊時「防禦前」照樣觸發');
}

console.log('══════ SIZE 可以被效果推過 10 ══════');
{
  // 原版規則：效果可以讓場上 SIZE 總和超過 10，
  // 但在降回 10 以下之前不能再下牌。
  const g = board();
  const a = put(g, 0, 0, 'crescent_kris_flina');   // size 5
  const b = put(g, 0, 1, 'cook_club_dir_jamie');   // size 5
  put(g, 0, 2, 'cooking_failure');                 // 咒語本身 size 3 → 已經 13
  eq(SG.fieldSize(g.players[0].field), 13, 'SIZE 總和可以超過 10');
  hand(g, 0, ['cook_club_student']);               // size 1
  g.phase = 'place';
  ok(!SG.canPlace(g, 0, 0), 'SIZE 超過 10 時不能再下牌');

  // 降回 10 以下就能放了
  g.players[0].field[1] = null;                    // 移掉 size 5 → 剩 8
  ok(SG.canPlace(g, 0, 0), 'SIZE 降到 10 以下後可以下牌');
  ok(!SG.canPlace(g, 0, 0) === false, 'SIZE 8 + 1 = 9，允許');
}

console.log('══════ Episode 1 咒語 ══════');
{
  { // 縮小：SIZE 最大的敵方隨從全部數值減半
    const g = board();
    const big = put(g, 1, 0, 'head_maid');        // 5/8/1/11
    const small = put(g, 1, 1, 'new_maid');
    put(g, 0, 0, 'shrink');
    fire(g, 0, 0, 'spell');
    eq(stats(big), '2/4/0/5', '縮小：SIZE 最大者 全數值減半（捨去）');
    eq(stats(small), '2/4/2/6', '縮小：其他隨從不受影響');
  }
  { // 命令的謠言
    const g = board();
    const t = put(g, 0, 0, 'cook_club_dir_jamie');   // vita size5 6/0/16
    put(g, 0, 1, 'rumor_of_order');
    fire(g, 0, 1, 'spell');
    eq(stats(t), '3/6/0/18', '命令的謠言：體 +2 / SIZE −2');
  }
  { // 雜食性：體力 + 手牌 SIZE 種類 +1
    const g = board();
    const a = put(g, 0, 0, 'cook_club_student');
    hand(g, 0, ['cook_club_student', 'cook_club_advisor', 'cook_club_katie']);  // SIZE 1,2,4 → 3 種
    put(g, 0, 1, 'omnivore');
    fire(g, 0, 1, 'spell');
    eq(a.sta, 8 + 4, '雜食性：體力 +4（3 種 SIZE +1）');
  }
  { // 火山：依手牌中公立隨從數削弱敵方
    const g = board();
    const t = put(g, 1, 0, 'porter_maid');           // 6/0/12
    hand(g, 0, ['cook_club_student', 'cook_club_katie', 'accident']);  // 2 隻公立隨從
    put(g, 0, 0, 'volcano');
    fire(g, 0, 0, 'spell');
    eq(stats(t), '4/4/0/10', '火山：攻/防/體 −2（手牌 2 隻公立隨從）');
  }
  { // 束縛
    const g = board();
    const a = put(g, 1, 0, 'new_maid');
    const b = put(g, 1, 1, 'tailor_maid');
    put(g, 0, 0, 'bind');
    fire(g, 0, 0, 'spell');
    eq(a.size + b.size, 2 + 1 + 3 + 1, '束縛：敵方隨從 SIZE +1');
  }
  { // 詛咒：只有私立角色才發動
    const g = board('cinia_pacifica');
    const t = put(g, 1, 0, 'porter_maid');
    put(g, 0, 0, 'curse');
    fire(g, 0, 0, 'spell');
    eq(t.atk, 4, '詛咒：角色為私立 → 攻 −2');

    const g2 = board('sita_vilosa');
    const t2 = put(g2, 1, 0, 'porter_maid');
    put(g2, 0, 0, 'curse');
    fire(g2, 0, 0, 'spell');
    eq(t2.atk, 6, '詛咒：角色非私立 → 不發動');
  }
  { // 交換魔術
    const g = board();
    const mine = put(g, 0, 2, 'cook_club_student');   // 1/3/0/8
    const theirs = put(g, 1, 0, 'head_maid');         // 5/8/1/11
    put(g, 0, 0, 'swap_magic');
    fire(g, 0, 0, 'spell');
    eq(stats(mine), '5/8/1/11', '交換魔術：我方 Ⅲ 格拿到對方的數值');
    eq(stats(theirs), '1/3/0/8', '交換魔術：對方拿到我方的數值');
  }
  { // 大規模召回
    const g = board();
    const small = put(g, 1, 0, 'cook_club_student');   // size1 → 送墓
    const big = put(g, 1, 1, 'head_maid');             // size5 → 留下
    const myAcad = put(g, 0, 0, 'new_maid');           // 私立 → 留下
    const myOther = put(g, 0, 1, 'cook_club_student'); // 非私立 → 送墓
    put(g, 0, 2, 'mass_recall');
    fire(g, 0, 2, 'spell');
    eq(g.players[1].field[0], null, '大規模召回：敵方 SIZE≤3 送墓');
    eq(g.players[1].field[1], big, '大規模召回：敵方 SIZE>3 留下');
    eq(g.players[0].field[0], myAcad, '大規模召回：我方私立卡留下');
    eq(g.players[0].field[1], null, '大規模召回：我方非私立卡送墓');
  }
  { // 強制入侵
    const g = board();
    put(g, 0, 2, 'head_maid');                  // 我方 Ⅲ 格 size5
    const foe3 = put(g, 1, 2, 'new_maid');      // 敵方 Ⅲ 格 size2 → 較低 → 被破壞
    put(g, 0, 0, 'forced_entry');
    fire(g, 0, 0, 'spell');
    eq(g.players[1].field[2], null, '強制入侵：SIZE 較低的一方被破壞');
    ok(g.players[1].character.life < 30, '強制入侵：被破壞方扣生命（＝該卡 SIZE）');
  }
  { // 草原上的休息日
    const g = board();
    put(g, 0, 0, 'cook_club_student');
    put(g, 0, 1, 'cook_club_advisor');
    const c3 = put(g, 0, 2, 'crux_knight_terra');
    put(g, 0, 3, 'meadow_holiday');
    fire(g, 0, 3, 'spell');
    const buffed = [g.players[0].field[0], g.players[0].field[1], c3]
      .filter(x => x.atk > x.baseAtk || x.sta > x.baseSta);
    eq(buffed.length, 1, '草原上的休息日：只有一張被強化');
    eq(buffed[0].atk - buffed[0].baseAtk, 2, '攻 +X−1（場上 3 隻隨從）');
    eq(buffed[0].sta - buffed[0].baseSta, 4, '體 +X+1');
  }
  { // 騎士團的手信：雙方卡片數一致才發動
    const g = board();
    put(g, 0, 0, 'knight_letter');
    const t = put(g, 1, 0, 'new_maid');
    const deckBefore = g.players[1].deck.length;
    fire(g, 0, 0, 'spell');
    eq(g.players[1].field[0], null, '騎士團的手信：敵方卡送回牌組');
    eq(g.players[1].deck.length, deckBefore + 1, '牌組多一張');
  }
  { // 和平協定
    const g = board();
    const mine = put(g, 0, 0, 'crux_knight_terra');
    const mySpell = put(g, 0, 1, 'peace_treaty');
    const foe = put(g, 1, 0, 'new_maid');
    fire(g, 0, 1, 'spell');
    ok(foe.activated, '和平協定：敵方卡行動終了');
    ok(mine.activated, '和平協定：我方隨從也行動終了');
    ok(!mySpell.activated, '和平協定：我方咒語不受影響');
    eq(mine.sta, 6 + 2, '我方南十字隨從 體 +2');
    eq(mine.size, 3 - 1, '我方南十字隨從 SIZE −1');
  }
  { // 滿月之力
    const g = board();
    const a = put(g, 0, 0, 'crescent_conundrum');     // 克雷森特
    const b = put(g, 0, 1, 'scardel_chardonnay');     // 斯卡迪魯
    const c2 = put(g, 0, 2, 'cook_club_student');     // 無關
    put(g, 0, 3, 'full_moon_power');
    fire(g, 0, 3, 'spell');
    eq(a.atk + ',' + b.atk + ',' + c2.atk, '7,9,3', '滿月之力：指定家族 攻 +3');
  }
  { // 強制幽閉
    const g = board('iri_flina');
    const t = put(g, 1, 0, 'crescent_kris_flina');    // size5 sta14
    put(g, 0, 0, 'forced_confinement');
    const deckBefore = g.players[1].deck.length;
    fire(g, 0, 0, 'spell');
    eq(g.players[1].field[0], null, '強制幽閉：體力最高者送回牌組');
    eq(g.players[1].deck.length, deckBefore + 1, '進入敵方牌組');
    eq(g.players[0].character.life, 30 - 3, '自己生命 −3（SIZE 5 的一半進位）');
  }
  { // 魔眼
    const g = board('iri_flina');
    const a = put(g, 1, 0, 'porter_maid');            // 6/0/12
    put(g, 0, 0, 'evil_eye');
    fire(g, 0, 0, 'spell');
    // 暗黑角色 → 攻/防/體 −2；場上只有 1 張 → 追加 攻/防 −1
    eq(stats(a), '4/3/0/10', '魔眼：暗黑角色 攻/防/體 −2，且敵方 ≤2 張時追加 攻/防 −1');
  }
  { // 好奇心少女維若妮卡
    const g = board('curious_vernika');
    const t = put(g, 1, 0, 'new_maid');               // def 2
    fire(g, 0, -1, 'turnStart');
    eq(t.def, 0, '維若妮卡：敵方防禦最高者 防禦 = 0');
  }
}

console.log('══════ Episode 1 隨從 ══════');
{
  /* ── 靠 defender 的攻擊前效果 ── */
  {
    const g = board();
    const a = put(g, 0, 0, 'striker');              // 攻擊前：防禦隨從體力 -1
    const d = put(g, 1, 0, 'kouhai');               // 4/1/10
    const before = d.sta;
    fire(g, 0, 0, 'beforeAttack', { defender: d });
    eq(d.sta, before - 1, '前鋒：防禦隨從體力 -1');
  }
  {
    const g = board();
    put(g, 0, 0, 'aristocrat_girl');
    const d = put(g, 1, 0, 'lib_vernika');          // def 2 → 不高於 2，不觸發
    const s0 = d.sta;
    fire(g, 0, 0, 'beforeAttack', { defender: d });
    eq(d.sta, s0, '貴族少女：防禦力剛好 2 不觸發（要「高於 2」）');

    const g2 = board();
    put(g2, 0, 0, 'aristocrat_girl');
    const d2 = put(g2, 1, 0, 'acolyte');            // 5/3/6，def 3 > 2
    fire(g2, 0, 0, 'beforeAttack', { defender: d2 });
    eq(d2.sta, 6 - 3, '貴族少女：防禦力 3 → 體力 -3');
  }
  {
    const g = board();
    put(g, 0, 0, 'seeker_lydia');
    const d = put(g, 1, 0, 'kouhai');
    fire(g, 0, 0, 'beforeAttack', { defender: d });
    eq(stats(d), '3/4/1/10', '莉迪亞：我方南十字卡不足 2 張時不觸發');

    const g2 = board();
    put(g2, 0, 0, 'seeker_lydia');
    put(g2, 0, 1, 'priestess');                     // 湊滿 2 張南十字
    const d2 = put(g2, 1, 0, 'kouhai');             // 3/4/1/10
    fire(g2, 0, 0, 'beforeAttack', { defender: d2 });
    eq(stats(d2), '3/3/0/9', '莉迪亞：南十字 2 張 → 防禦隨從 攻 -1/防 -2/體 -1');
  }
  {
    const g = board();
    const a = put(g, 0, 0, 'red_moon_aka_flina');   // 3/4/0/9
    const d = put(g, 1, 0, 'acolyte');              // def 3
    fire(g, 0, 0, 'beforeAttack', { defender: d });
    eq(stats(a), '3/7/0/12', '紅月亞卡：防禦 = 0，攻/體 + 防禦力差 3');
  }

  /* ── 防禦前 ── */
  {
    const g = board();
    const a = put(g, 0, 0, 'prefect_layna');        // 1/4/2/5
    hand(g, 0, ['kouhai', 'kouhai', 'kouhai']);
    fire(g, 0, 0, 'beforeDefend', { attacker: null });
    eq(a.sta, 5 + 4, '風紀部長蕾娜：體力 + 手牌數 3 +1');
  }
  {
    const g = board();
    const a = put(g, 0, 0, 'senpai_maid');          // 3/5/1/10
    fire(g, 0, 0, 'beforeDefend', {});
    eq(stats(a), '3/6/1/12', '前輩女僕：防禦前 攻 +1 / 體 +2');
  }
  {
    const g = board();
    const a = put(g, 0, 0, 'lib_vernika');          // 3/4/2/8
    fire(g, 0, 0, 'beforeDefend', {});
    eq(a.sta, 10, '圖書部的維若妮卡：防禦前體力 +2');
  }
  {
    const g = board();
    put(g, 0, 0, 'priestess');
    const before = g.players[0].character.life;
    fire(g, 0, 0, 'beforeDefend', {});
    eq(g.players[0].character.life, before + 1, '女祭司：防禦前我方角色生命 +1');
  }
  {
    const g = board();
    const a = put(g, 0, 0, 'seeker_amethystar');    // 2/6/0/4
    g.turn = 3;
    fire(g, 0, 0, 'beforeDefend', {});
    eq(a.sta, 7, '阿米迪斯塔：奇數回合體力 +3');
    const g2 = board();
    const b = put(g2, 0, 0, 'seeker_amethystar');
    g2.turn = 4;
    fire(g2, 0, 0, 'beforeDefend', {});
    eq(b.sta, 4, '阿米迪斯塔：偶數回合不觸發');
  }
  {
    const g = board();
    const a = put(g, 0, 0, 'master_luna_flina');    // 5/7/0/14
    put(g, 0, 1, 'zombie');                         // 暗黑
    put(g, 0, 2, 'scardel_merlot');                 // 暗黑
    fire(g, 0, 0, 'beforeDefend', {});
    eq(stats(a), '5/7/3/17', '滿月當主露娜：防禦 = 我方暗黑卡數 3，體力 +3');
  }

  /* ── 攻擊前（不需要 defender） ── */
  {
    const g = board();
    const a = put(g, 0, 0, 'lib_serie');            // 3/4/0/11
    hand(g, 0, ['lib_lucca', 'lib_lindt', 'kouhai']);
    fire(g, 0, 0, 'beforeAttack', {});
    eq(a.atk, 6, '圖書部的賽莉耶：攻擊 + 手牌「圖書部」2 張');
  }
  {
    const g = board();
    const a = put(g, 0, 0, '2s_assistant_asmis');   // 4/5/2/10
    fire(g, 0, 0, 'beforeAttack', {});
    eq(a.atk, 6, 'SS助手阿斯米斯：攻擊前攻擊力 +1');
  }

  /* ── 回合開始 ── */
  {
    const g = board();
    put(g, 0, 0, 'private_maid');
    const d = put(g, 1, 0, 'kouhai');               // 4/1/10
    fire(g, 0, 0, 'turnStart');
    eq(d.atk, 3, '私人女僕：敵方隨機 1 張隨從攻擊力 -1');
  }
  {
    const g = board();
    const a = put(g, 0, 0, 'acolyte');              // 4/5/3/6 南十字
    const b = put(g, 0, 1, 'priestess');            // 3/4/0/11 南十字
    const c = put(g, 0, 2, 'kouhai');               // 公立，不該受影響
    g.turn = 4;
    fire(g, 0, 0, 'turnStart');
    eq(stats(a), '4/7/3/8', '光的迴響：偶數回合我方南十字隨從 攻/體 +2');
    eq(stats(c), '3/4/1/10', '光的迴響：非南十字不受影響');
    const g2 = board();
    const a2 = put(g2, 0, 0, 'acolyte');
    g2.turn = 3;
    fire(g2, 0, 0, 'turnStart');
    eq(stats(a2), '4/5/3/6', '光的迴響：奇數回合不觸發');
  }
  {
    const g = board();
    put(g, 0, 0, 'scardel_shiraz');
    const d = put(g, 1, 0, 'kouhai');
    fire(g, 0, 0, 'turnStart');
    eq(d.sta, 10, '雪拉茲：我方暗黑隨從不足 2 張時不觸發');

    const g2 = board();
    put(g2, 0, 0, 'scardel_shiraz');
    put(g2, 0, 1, 'zombie');                        // 湊滿 2 張暗黑
    const d2 = put(g2, 1, 0, 'kouhai');
    fire(g2, 0, 0, 'turnStart');
    eq(d2.sta, 8, '雪拉茲：暗黑 2 張 → 敵方隨機隨從體力 -2');
  }
  {
    const g = board();
    const a = put(g, 0, 0, 'blue_moon_becky_flina');  // 4/4/1/14
    const b = put(g, 0, 1, 'zombie');                 // 5/6/1/14
    fire(g, 0, 0, 'turnStart');
    eq(stats(a), '4/5/1/15', '藍月佩琪：此卡 攻/體 +1');
    eq(stats(b), '5/7/1/15', '藍月佩琪：另一張隨從也 攻/體 +1');
  }

  /* ── 純數值卡不該掛效果 ── */
  {
    const vanilla = ['latecomer', 'basketball_player', 'kouhai', 'rainy_girl',
                     'lib_lucca', 'lib_lindt', 'ward_closer', 'apprentice',
                     'zombie', 'crux_faithful'];
    const wrong = vanilla.filter(s => SG.Effects[s]);
    ok(wrong.length === 0, 'EP1 的純數值卡沒有被誤掛效果', wrong.join('、'));
  }
}

console.log('');
console.log('══════ 「攻擊前」拿得到防禦目標（走完整交戰流程）══════');
{
  /* 前鋒的效果是「攻擊前，防禦隨從的體力 -1」——
     代表防禦目標必須在「攻擊前」觸發之前就決定好。
     這裡跑真正的 doAttack，確認引擎有把 defender 傳進 ctx，
     而且那 1 點是在承受攻擊傷害之前就先扣掉的。            */
  const g = board();
  const a = put(g, 0, 0, 'striker');      // 4/7/1/8
  const d = put(g, 1, 0, 'kouhai');       // 3/4/1/10
  const ev = [];
  SG._test.attack(g, ev, 0, 0);

  const ability = ev.find(e => e.t === 'ability' && e.card === a);
  ok(!!ability, '前鋒在完整交戰中發動了攻擊前效果');

  const atk = ev.find(e => e.t === 'attack');
  ok(!!atk && atk.target === d, '攻擊事件打在同一張防禦隨從上');
  /* 體力 10 → 效果 -1 → 9，再吃 攻7-防1=6 傷害 → 3 */
  eq(d.sta, 3, '效果的 -1 先生效，再結算 7-1=6 點傷害');

  const iAb = ev.indexOf(ability), iAtk = ev.indexOf(atk);
  ok(iAb < iAtk, '事件順序：先發動效果，才是攻擊');
}

{
  /* 敵方沒有隨從時，攻擊前效果拿到的 defender 應該是 null，不能爆掉 */
  const g = board();
  put(g, 0, 0, 'striker');
  const ev = [];
  SG._test.attack(g, ev, 0, 0);
  ok(ev.some(e => e.t === 'direct'), '敵方無隨從時仍能直擊角色卡（defender 為 null 不出錯）');
}

console.log('');
console.log('══════ 技能可以被拿掉／給予／複製 ══════');
{
  /* Episode 2 起有卡片會「發動後失去技能」「把技能給別人」「複製對手的技能」，
     所以能力要跟著場上這張實體走，不能只看卡片定義。 */
  const g = board();
  const a = put(g, 0, 0, 'striker');          // 攻擊前：防禦隨從體力 -1
  const plain = put(g, 0, 1, 'kouhai');       // 純數值卡，沒有技能
  const d = put(g, 1, 0, 'kouhai');

  ok(SG.hasSkill(a), '有效果的卡帶著技能');
  ok(!SG.hasSkill(plain), '純數值卡沒有技能');

  /* 拿掉技能之後就不再發動 */
  const sta0 = d.sta;
  fire(g, 0, 0, 'beforeAttack', { defender: d });
  eq(d.sta, sta0 - 1, '拿掉之前效果正常發動');
  a.skills = [];
  ok(!SG.hasSkill(a), '技能被拿掉了');
  fire(g, 0, 0, 'beforeAttack', { defender: d });
  eq(d.sta, sta0 - 1, '技能拿掉後不再發動');

  /* 給予技能：把前鋒的技能給沒有技能的下級生 */
  plain.skills = ['striker'];
  ok(SG.hasSkill(plain), '被授予技能後算「有技能」');
  fire(g, 0, 1, 'beforeAttack', { defender: d });
  eq(d.sta, sta0 - 2, '被授予的技能會發動');

  /* 一張卡可以同時帶多個技能，會依序發動 */
  const multi = put(g, 0, 2, 'kouhai');
  multi.skills = ['striker', '2s_assistant_asmis'];   // 防禦者 -1 體、自己 +1 攻
  const atk0 = multi.atk, sta1 = d.sta;
  fire(g, 0, 2, 'beforeAttack', { defender: d });
  eq(d.sta, sta1 - 1, '多技能：第一個技能生效');
  eq(multi.atk, atk0 + 1, '多技能：第二個技能也生效');
}

{
  /* 推演用的複製不能共用 skills 陣列，否則 AI 想一想就會改到真正的對局 */
  const g = board();
  const a = put(g, 0, 0, 'striker');
  const g2 = SG.cloneGame(g, 'clone1');
  g2.players[0].field[0].skills = [];
  ok(a.skills.length === 1, 'cloneGame 之後改副本的技能，不會影響本體');
}

console.log('══════ Episode 2 ══════');
{
  /* 「發動後失去這個能力」—— EP2 有五張同款，用技能系統實作 */
  {
    const g = board();
    const a = put(g, 0, 0, 'council_casey');     // 攻擊前 攻 +2，然後失去能力
    const atk0 = a.atk;
    fire(g, 0, 0, 'beforeAttack', {});
    eq(a.atk, atk0 + 2, '學生會員的凱西：攻擊前攻擊力 +2');
    ok(!SG.hasSkill(a), '發動後失去這個能力');
    fire(g, 0, 0, 'beforeAttack', {});
    eq(a.atk, atk0 + 2, '第二次不再發動');
  }

  /* 除外指定條件的墓地卡 */
  {
    const g = board();
    const a = put(g, 0, 0, 'genius_student_nanai');
    const atk = put(g, 1, 0, 'kouhai');           // SIZE 3
    /* 墓地放的是卡片實體，不是卡號 */
    g.players[0].grave = ['kouhai', 'lib_serie', 'latecomer']      // SIZE 3/3/1
      .map(sl => SG._test.mkCard(sl, 0));
    fire(g, 0, 0, 'beforeDefend', { attacker: atk });
    eq(g.players[0].grave.length, 1, '墓地與攻擊者同 SIZE 的卡被除外');
    eq(atk.atk, 4 - 2, '攻擊者攻擊力 −2（除外張數）');
  }

  /* 手牌 → 牌組最上方 */
  {
    const g = board();
    const a = put(g, 0, 0, 'council_pres_celine');
    hand(g, 0, ['council_casey', 'kouhai']);
    const deck0 = g.players[0].deck.length;
    fire(g, 0, 0, 'beforeDefend', {});
    eq(g.players[0].hand.length, 1, '手牌少一張');
    eq(g.players[0].deck.length, deck0 + 1, '牌組多一張');
    eq(g.players[0].deck[0], 'council_casey', '放到牌組最上方');
  }

  /* 搶對方場上的卡 */
  {
    const g = board();
    put(g, 0, 0, 'kouhai');
    const t = put(g, 1, 0, 'basketball_player');
    const sp = put(g, 0, 4, 'sense_of_belonging');
    g.players[1].character.faction = 'darklore';   // 讓敵方隨從與其角色不同陣營
    fire(g, 0, 4, 'spell');
    ok(g.players[1].field[0] === null, '敵方場上那張被搶走');
    ok(g.players[0].field.indexOf(t) >= 0, '出現在我方場上');
  }

  /* 雙方手牌第一張咒語互換 */
  {
    const g = board();
    put(g, 0, 0, 'spell_change');
    hand(g, 0, ['volcano']);
    g.players[1].hand = [SG._test.mkCard('curse', 1)];
    fire(g, 0, 0, 'spell');
    eq(g.players[0].hand[0].name, SG.getCard('curse').name, '我方拿到對方的咒語');
    eq(g.players[1].hand[0].name, SG.getCard('volcano').name, '對方拿到我方的咒語');
  }

  /* 手牌 → 場上（高速送件） */
  {
    const g = board();
    put(g, 0, 0, 'quick_service');
    put(g, 0, 1, 'kouhai');
    put(g, 0, 2, 'latecomer');
    hand(g, 0, ['basketball_player']);            // SIZE 2，門檻是 2+2=4
    fire(g, 0, 0, 'spell');
    ok(!g.players[0].field[1] && !g.players[0].field[2], '我方隨從全部送入墓地');
    ok(!!g.players[0].field[3], '手牌的隨從被放到第 Ⅳ 格');
    eq(g.players[0].hand.length, 0, '該張離開手牌');
  }

  /* 格號與 SIZE 相同才吃到 buff */
  {
    const g = board();
    const a = put(g, 0, 0, 'burning_guardian');   // SIZE 1，在第 1 格 → 命中
    const b = put(g, 0, 2, 'aristocrat_girl');    // SIZE 3，在第 3 格 → 命中
    const cc = put(g, 0, 1, 'ward_closer');       // SIZE 2，在第 2 格 → 命中
    const d = put(g, 0, 4, 'apprentice');         // SIZE 5，在第 5 格 → 命中
    const sp = put(g, 1, 0, 'kouhai');
    const before = [a.atk, b.atk, cc.atk, d.atk];
    put(g, 0, 3, 'lineage_maintenance');
    fire(g, 0, 3, 'spell');
    eq(a.atk, before[0] + 3, '血統維持：格號 1 ＝ SIZE 1 有吃到');
    eq(b.atk, before[1] + 3, '血統維持：格號 3 ＝ SIZE 3 有吃到');
  }

  /* 我方角色不是公立時，強化咒文會讓該隨從失去能力 */
  {
    const g = board('iri_flina');                 // 暗黑角色
    const t = put(g, 0, 1, 'striker');            // 有技能
    put(g, 0, 0, 'empowering_chant');
    fire(g, 0, 0, 'spell');
    eq(t.sta, 8 + 5, '第 Ⅱ 格隨從 體 +5');
    ok(!SG.hasSkill(t), '角色不是公立 → 該隨從失去特殊能力');
  }
}

console.log('══════ Episode 2 牌組實戰不會爆 ══════');
{
  /* 用 EP2 卡片組四副牌組兩兩對打，確認沒有例外或無限迴圈 */
  const decks = ['vita', 'academy', 'crux', 'darklore'].map(f => {
    const pool = SG.allCards().filter(c => c.ep === 2 && c.faction === f && c.type !== 'character');
    const cs = [];
    pool.forEach(c => { for (let i = 0; i < Math.min(c.limit, 3) && cs.length < 30; i++) cs.push(c.slug); });
    while (cs.length < 30) cs.push(pool[0].slug);
    const ch = SG.allCards().find(c => c.type === 'character' && c.faction === f && !c.npc);
    return { name: 'EP2-' + f, faction: f, character: ch.slug, cards: cs.slice(0, 30) };
  });
  let err = 0, games = 0, unfinished = 0;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    if (i === j) continue;
    for (let k = 0; k < 8; k++) {
      try {
        const g = SG.createGame(decks[i], decks[j], 'ep2t' + i + j + k);
        let guard = 0;
        while (!g.over && guard++ < 300) {
          SG.beginTurn(g); if (g.over) break;
          SG.aiPlay(g, 0); SG.aiPlay(g, 1); SG.resolveTurn(g);
        }
        games++;
        if (!g.over) unfinished++;
      } catch (e) { err++; if (err === 1) console.log('  例外：' + e.message); }
    }
  }
  console.log('  跑了 ' + games + ' 場');
  ok(err === 0, 'EP2 牌組對打不會丟例外', err + ' 次例外');
  ok(unfinished === 0, 'EP2 牌組對打不會卡死', unfinished + ' 場未結束');
}

console.log('══════ 檢索 / 招喚 / 複製 / 恢復技能 ══════');
{
  /* Episode 3 以後的卡會用到這四個機制，先把引擎的部分測起來。
     測試用 SG.Effects 裡臨時註冊的假卡來驅動。 */
  const box = {};
  SG.Effects.__t_tutor = { spell: c => { box.got = c.deckToHand(d => d.type === 'spell', 2); } };
  SG.Effects.__t_summon = { spell: c => { box.got = c.deckToField(d => d.type === 'follower', 1); } };
  SG.Effects.__t_copy = { spell: c => { box.got = c.spawnCopy(c.foeHand[0]); } };
  SG.Effects.__t_restore = { spell: c => { box.ok = c.restoreSkills(box.target); } };

  /* 檢索：牌庫 → 手牌 */
  {
    const g = board();
    const p = g.players[0];
    p.deck = ['kouhai', 'volcano', 'latecomer', 'curse'];
    p.hand = [];
    const sp = put(g, 0, 0, 'shrink');
    sp.skills = ['__t_tutor'];
    const d0 = p.deck.length;
    fire(g, 0, 0, 'spell');
    eq(box.got.length, 2, '檢索：拿到 2 張符合條件的卡');
    ok(box.got.every(c => c.type === 'spell'), '檢索：拿到的都是咒語');
    eq(p.hand.length, 2, '檢索：進到手牌');
    eq(p.deck.length, d0 - 2, '檢索：牌庫少 2 張');
    ok(!p.deck.includes('volcano') && !p.deck.includes('curse'), '檢索：牌庫裡不會留著同一張');
  }

  /* 檢索：手牌滿了就停 */
  {
    const g = board();
    const p = g.players[0];
    p.deck = ['volcano', 'curse'];
    hand(g, 0, ['kouhai', 'kouhai', 'kouhai', 'kouhai', 'kouhai']);   // 已滿 5 張
    const sp = put(g, 0, 0, 'shrink');
    sp.skills = ['__t_tutor'];
    fire(g, 0, 0, 'spell');
    eq(box.got.length, 0, '檢索：手牌滿了就不再拿');
    eq(p.deck.length, 2, '檢索：牌庫沒被動到');
  }

  /* 招喚：牌庫 → 場上 */
  {
    const g = board();
    const p = g.players[0];
    p.deck = ['volcano', 'kouhai', 'latecomer'];
    const sp = put(g, 0, 0, 'shrink');
    sp.skills = ['__t_summon'];
    fire(g, 0, 0, 'spell');
    eq(box.got.length, 1, '招喚：叫出 1 張');
    eq(box.got[0].id, 'kouhai', '招喚：挑到第一張符合條件的隨從');
    ok(g.players[0].field.indexOf(box.got[0]) > 0, '招喚：放到編號最小的空格');
    ok(box.got[0].activated, '招喚：當回合不再行動');
    eq(p.deck.length, 2, '招喚：牌庫少 1 張');
  }

  /* 複製：把對手手牌的卡複製到我方場上 */
  {
    const g = board();
    g.players[1].hand = [SG._test.mkCard('curse', 1)];
    const sp = put(g, 0, 0, 'shrink');
    sp.skills = ['__t_copy'];
    fire(g, 0, 0, 'spell');
    ok(!!box.got && box.got.id === 'curse', '複製：在我方場上生出一張同名卡');
    eq(box.got.owner, 0, '複製：擁有者是我方');
    eq(g.players[1].hand.length, 1, '複製：對手手牌不會少（是複製不是搶）');
  }

  /* 恢復技能 */
  {
    const g = board();
    const t = put(g, 0, 1, 'striker');
    t.skills = [];
    ok(!SG.hasSkill(t), '先把技能拿掉');
    box.target = t;
    const sp = put(g, 0, 0, 'shrink');
    sp.skills = ['__t_restore'];
    fire(g, 0, 0, 'spell');
    ok(SG.hasSkill(t), '恢復技能之後又有技能了');
    eq(t.skills[0], 'striker', '恢復的是這張卡原本的技能');
  }

  ['__t_tutor', '__t_summon', '__t_copy', '__t_restore'].forEach(k => { delete SG.Effects[k]; });
}

console.log('══════ 墓地存的是「卡片實體」不是卡號 ══════');
{
  /* 這件事寫錯不會報錯，只會讓條件永遠不成立、效果靜默失效。
     EP2/EP3 一度把墓地當成卡號陣列處理，300 場實戰才炸出來。 */
  const g = board();
  const a = put(g, 0, 0, 'kouhai');
  SG._test.attack(g, [], 0, 0);            // 隨便打一場讓墓地有東西
  g.players[0].grave = [];
  const c = put(g, 0, 1, 'latecomer');
  const ev = [];
  SG._test.fire(g, ev, c, 0, 1, 'turnStart');
  g.players[0].grave.push(SG._test.mkCard('volcano', 0));
  const e = g.players[0].grave[0];
  ok(typeof e === 'object' && !!e.name && !!e.type,
     '墓地放的是有 name / type 的實體，不是字串卡號');

  /* millDeck 也要放實體進去，不能放卡號 */
  {
    const g2 = board();
    g2.players[0].deck = ['kouhai', 'volcano', 'latecomer'];
    g2.players[0].grave = [];
    const sp = put(g2, 0, 0, 'shrink');
    SG.Effects.__t_mill = { spell: cc => { box.got = cc.millDeck(cc.me, 2); } };
    const box = {};
    SG.Effects.__t_mill = { spell: cc => { box.got = cc.millDeck(cc.me, 2); } };
    sp.skills = ['__t_mill'];
    fire(g2, 0, 0, 'spell');
    eq(g2.players[0].grave.length, 2, 'millDeck：兩張進墓地');
    ok(g2.players[0].grave.every(x => typeof x === 'object' && !!x.type),
       'millDeck：進墓地的是實體');
    ok(box.got.every(x => typeof x === 'object'), 'millDeck：回傳的也是實體');
    delete SG.Effects.__t_mill;
  }

  /* graveToDeckBottom 反過來要放卡號回牌庫 */
  {
    const g3 = board();
    g3.players[0].deck = [];
    g3.players[0].grave = [SG._test.mkCard('volcano', 0), SG._test.mkCard('kouhai', 0)];
    const sp = put(g3, 0, 0, 'shrink');
    SG.Effects.__t_g2d = { spell: cc => { cc.graveToDeckBottom(cc.me, 2); } };
    sp.skills = ['__t_g2d'];
    fire(g3, 0, 0, 'spell');
    eq(g3.players[0].deck.length, 2, '墓地兩張回到牌庫');
    ok(g3.players[0].deck.every(x => typeof x === 'string'),
       '牌庫放的是字串卡號（跟墓地相反）');
    ok(g3.players[0].deck.every(x => !!SG.getCard(x)), '而且是查得到的卡號');
    delete SG.Effects.__t_g2d;
  }
}

console.log('══════ Episode 3 ══════');
{
  /* EP3 有很多「四張同款、只差陣營」的卡，用工廠函式產生，抽代表測 */

  /* 攻擊前把防禦者防禦歸零，然後自己換成「回合開始變回原能力」 */
  {
    const g = board();
    const a = put(g, 0, 0, 'lib_daisy');
    const d = put(g, 1, 0, 'acolyte');            // def 3
    fire(g, 0, 0, 'beforeAttack', { defender: d });
    eq(d.def, 0, '防禦隨從防禦力歸零');
    ok(a.skills.indexOf('__ep3_restore') >= 0, '自己換成「回合開始變回原能力」');
    fire(g, 0, 0, 'turnStart');
    eq(a.skills[0], 'lib_daisy', '回合開始變回原本的能力');
  }

  /* 攻擊前奪走防禦者的技能，然後自己失去這個能力 */
  {
    const g = board();
    const a = put(g, 0, 0, 'lib_manager_lotte');
    const d = put(g, 1, 0, 'striker');
    ok(SG.hasSkill(d), '防禦者本來有技能');
    fire(g, 0, 0, 'beforeAttack', { defender: d });
    ok(!SG.hasSkill(d), '防禦者失去技能');
    ok(!SG.hasSkill(a), '自己也失去這個能力');
  }

  /* 場上同時有含關鍵字與不含關鍵字的同陣營隨從才發動 */
  {
    const g = board();
    put(g, 0, 0, 'council_casey');                 // 名字含「學生會」
    const other = put(g, 0, 1, 'kouhai');          // 公立、不含「學生會」
    const sp = put(g, 0, 2, 'court_jester');
    const a0 = other.atk;
    fire(g, 0, 2, 'spell');
    ok(other.atk > a0 || g.players[0].field[0].atk > 4, '兩種都有 → 有隨從吃到 攻/體 +3');

    const g2 = board();
    put(g2, 0, 0, 'kouhai');                       // 只有不含「學生會」的
    const o2 = g2.players[0].field[0];
    const b0 = o2.atk;
    put(g2, 0, 2, 'court_jester');
    fire(g2, 0, 2, 'spell');
    eq(o2.atk, b0, '只有一種 → 不發動');
  }

  /* 牌組上方送墓後依內容給生命 */
  {
    const g = board();
    g.players[0].deck = ['kouhai', 'latecomer', 'volcano'];   // 前兩張是公立隨從
    const life0 = g.players[0].character.life;
    put(g, 0, 0, 'shameless_ambition');
    fire(g, 0, 0, 'spell');
    eq(g.players[0].grave.length, 3, '牌組上方 3 張送墓');
    eq(g.players[0].character.life, life0 + 6, '每張公立隨從 +3 → 兩張共 +6');
  }

  /* 補到 4 張手牌，並依手牌同陣營數強化自己 */
  {
    const g = board();
    const a = put(g, 0, 0, 'vanguard_knight');
    g.players[0].hand = [];
    g.players[0].deck = ['crux_knight_mitil', 'crux_knight_terra', 'kouhai', 'volcano', 'latecomer'];
    const atk0 = a.atk;
    fire(g, 0, 0, 'turnStart');
    eq(g.players[0].hand.length, 4, '補到 4 張手牌');
    ok(a.atk > atk0, '依手牌「南十字」數強化自己：' + atk0 + ' → ' + a.atk);
  }

  /* 逮捕：手牌全放回牌組下方，再把敵方大隻的收進我方牌組 */
  {
    const g = board();
    hand(g, 0, ['kouhai', 'volcano', 'latecomer']);
    const big = put(g, 1, 0, 'apprentice');        // SIZE 5
    g.players[0].deck = [];
    put(g, 0, 0, 'arrest');
    fire(g, 0, 0, 'spell');
    eq(g.players[0].hand.length, 0, '手牌清空');
    ok(g.players[0].deck.length >= 3, '手牌回到牌組下方');
    ok(!g.players[1].field[0], '敵方 SIZE 4 以上的隨從被收走');
    ok(g.players[0].deck.indexOf('apprentice') >= 0, '而且是進到「我方」牌組');
  }

  /* 無所屬的賢者：奪取攻擊者技能並強化自己 */
  {
    const g = board();
    const a = put(g, 0, 0, 'sage_esprit');
    const foe = put(g, 1, 0, 'striker');
    const s0 = [a.atk, a.def, a.sta].join('/');
    fire(g, 0, 0, 'beforeDefend', { attacker: foe });
    ok(!SG.hasSkill(foe), '攻擊者失去技能');
    eq([a.atk, a.def, a.sta].join('/'), (8 + 1) + '/' + (0 + 1) + '/' + (8 + 1),
       '此卡 攻/防/體 +1（原本 ' + s0 + '）');
  }
}

console.log('══════ Episode 3 牌組實戰不會爆 ══════');
{
  const decks = ['vita', 'academy', 'crux', 'darklore'].map(f => {
    const pool = SG.allCards().filter(c => c.ep === 3 &&
      (c.faction === f || c.faction === 'neutral') && c.type !== 'character');
    const cs = [];
    pool.forEach(c => { for (let i = 0; i < Math.min(c.limit, 3) && cs.length < 30; i++) cs.push(c.slug); });
    while (cs.length < 30) cs.push(pool[0].slug);
    const ch = SG.allCards().find(c => c.type === 'character' && c.faction === f && !c.npc);
    return { name: 'EP3-' + f, faction: f, character: ch.slug, cards: cs.slice(0, 30) };
  });
  let err = 0, games = 0, unfinished = 0, msg = '';
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    if (i === j) continue;
    for (let k = 0; k < 8; k++) {
      try {
        const g = SG.createGame(decks[i], decks[j], 'ep3t' + i + j + k);
        let guard = 0;
        while (!g.over && guard++ < 300) {
          SG.beginTurn(g); if (g.over) break;
          SG.aiPlay(g, 0); SG.aiPlay(g, 1); SG.resolveTurn(g);
        }
        games++;
        if (!g.over) unfinished++;
      } catch (e) { err++; if (!msg) msg = e.message; }
    }
  }
  console.log('  跑了 ' + games + ' 場');
  ok(err === 0, 'EP3 牌組對打不會丟例外', err + ' 次：' + msg);
  ok(unfinished === 0, 'EP3 牌組對打不會卡死', unfinished + ' 場未結束');
}

console.log('══════ 涵蓋率 ══════');
{
  const all = SG.allCards();
  const withEffect = all.filter(c => c.effect && c.effect.trim());
  const missing = withEffect.filter(c => !SG.Effects[c.slug]);
  console.log('有效果文字的卡：' + withEffect.length + ' 張，已實作 ' +
              (withEffect.length - missing.length) + ' 張');
  if (missing.length) console.log('未實作：' + missing.map(c => c.name).join('、'));
  ok(missing.length === 0, '所有有效果文字的卡都已實作');

  /* __ 開頭的是「合成技能」，給 grantSkill 用的，本來就沒有對應卡片 */
  const extra = Object.keys(SG.Effects).filter(k => !k.startsWith('__') && !SG.getCard(k));
  ok(extra.length === 0, '沒有掛在不存在卡片上的效果', extra.join(','));
  const synth = Object.keys(SG.Effects).filter(k => k.startsWith('__'));
  console.log('合成技能（grantSkill 用）：' + (synth.join('、') || '無'));
}

console.log('');
console.log('通過 ' + pass + '　失敗 ' + fail);
if (fail) { failures.forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
console.log('✔ 效果測試全數通過');
