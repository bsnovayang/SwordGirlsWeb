/* 卡片效果單元測試：node test/effects.js */
const fs = require('fs'), path = require('path');
global.window = global;
function load(p) { eval(fs.readFileSync(path.join(__dirname, '..', p), 'utf8')); }
load('js/data/cards.js');
load('js/data/cards_npc.js');
load('js/data/materials.js');
load('js/data/decks.js');
load('js/data/dungeons.js');
load('js/core/battle.js');
load('js/core/effects.js');

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

console.log('══════ 副本限定（一般對戰不得發動） ══════');
['cook_club_dir_jamie', 'head_maid', 'crux_knight_mitil', 'scardel_pinot_noir'].forEach(slug => {
  const g = board();
  const self = put(g, 0, 0, slug);
  const before = stats(self);
  const ev = fire(g, 0, 0, 'beforeAttack');
  ok(stats(self) === before && ev.length === 0, '副本限定不發動：' + SG.getCard(slug).name);
});

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

console.log('══════ 涵蓋率 ══════');
{
  const all = SG.allCards();
  const withEffect = all.filter(c => c.effect && c.effect.trim());
  const missing = withEffect.filter(c => !SG.Effects[c.slug]);
  console.log('有效果文字的卡：' + withEffect.length + ' 張，已實作 ' +
              (withEffect.length - missing.length) + ' 張');
  if (missing.length) console.log('未實作：' + missing.map(c => c.name).join('、'));
  ok(missing.length === 0, '所有有效果文字的卡都已實作');

  const extra = Object.keys(SG.Effects).filter(k => !SG.getCard(k));
  ok(extra.length === 0, '沒有掛在不存在卡片上的效果', extra.join(','));
}

console.log('');
console.log('通過 ' + pass + '　失敗 ' + fail);
if (fail) { failures.forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
console.log('✔ 效果測試全數通過');
