/* 版面檢查：確認每個桌機的多欄版面都有手機版覆寫　　node test/responsive.js
   ※ jsdom 不做排版計算，所以這裡驗的是「規則有沒有寫」而不是「畫出來好不好看」。
     真機的觸控與可讀性還是要人眼確認。 */
const fs = require('fs'), path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

let pass = 0; const errors = [];
function ok(c, name, detail) { if (c) { pass++; return; } errors.push(name + (detail ? '　→ ' + detail : '')); }

/* 把 CSS 拆成「一般規則」與「各 media query 內的規則」 */
function splitMedia(text) {
  const blocks = [];      // {cond, body}
  let base = '';
  let i = 0;
  while (i < text.length) {
    const at = text.indexOf('@media', i);
    if (at < 0) { base += text.slice(i); break; }
    base += text.slice(i, at);
    const open = text.indexOf('{', at);
    const cond = text.slice(at + 6, open).trim();
    let depth = 1, j = open + 1;
    while (j < text.length && depth > 0) {
      if (text[j] === '{') depth++;
      else if (text[j] === '}') depth--;
      j++;
    }
    blocks.push({ cond: cond, body: text.slice(open + 1, j - 1) });
    i = j;
  }
  return { base: base, blocks: blocks };
}

const { base, blocks } = splitMedia(css);
const mobile = blocks.filter(b => /max-width\s*:\s*(\d+)px/.test(b.cond) &&
                                  +b.cond.match(/max-width\s*:\s*(\d+)px/)[1] <= 820);
const mobileCss = mobile.map(b => b.body).join('\n');

console.log('══════ media query ══════');
ok(blocks.length >= 5, '有多組 media query（' + blocks.length + ' 組）');
ok(mobile.length >= 1, '有 ≤820px 的手機版斷點：' +
   mobile.map(b => b.cond).join(' / '));
ok(/max-width\s*:\s*4\d\dpx/.test(css), '有更窄的小手機斷點');

console.log('══════ 每個多欄版面都要有手機版覆寫 ══════');
{
  /* 桌機用到的多欄容器 → 手機版必須另外處理 */
  const layouts = [
    ['.battle-wrap', '戰鬥畫面'],
    ['.fields',      '場地三欄'],
    ['.editor',      '牌組編輯'],
    ['.gallery',     '卡片圖鑑'],
    ['.craft',       '合成工房'],
    ['.lobby-menu',  '大廳選單'],
    ['.handbar',     '手牌列'],
    ['.dg-row',      '副本清單列'],
    ['.ld-row',      '天梯對手列'],
    ['.q-row',       '任務列']
  ];
  layouts.forEach(([sel, name]) => {
    const inBase = base.indexOf(sel + '{') >= 0 || base.indexOf(sel + ' {') >= 0 ||
                   new RegExp('\\' + sel + '\\s*[,{]').test(base);
    ok(inBase, name + ' 有桌機樣式：' + sel);
    const overridden = new RegExp('\\' + sel + '\\s*[,{ ]').test(mobileCss);
    ok(overridden, name + ' 有手機版覆寫：' + sel);
  });
}

console.log('══════ 不該有會撐破畫面的固定寬度 ══════');
{
  const risky = [...css.matchAll(/(?:^|[;{\s])(?:min-)?width\s*:\s*(\d{3,})px/g)]
    .map(m => +m[1]).filter(w => w > 360);
  ok(risky.length === 0, '沒有超過 360px 的固定寬度宣告',
     [...new Set(risky)].join(', '));

  /* 卡片清單的列不能設死寬度，否則窄螢幕會被擠出去 */
  ok(!/\.crow\s*\{[^}]*[^-]width\s*:\s*\d+px/.test(base), '卡片列沒有寫死寬度');
}

console.log('══════ 基本設定 ══════');
{
  ok(/name=["']viewport["'][^>]*width=device-width/.test(html), 'HTML 有 viewport 設定');
  ok(/initial-scale=1/.test(html), 'viewport 有 initial-scale=1');
  ok(!/user-scalable\s*=\s*no/.test(html), '沒有停用縮放（要讓玩家能放大看清楚）');
  ok(/box-sizing\s*:\s*border-box/.test(css), '有 border-box，padding 不會撐破寬度');
  ok(/overflow-x/.test(css) || !/white-space\s*:\s*nowrap/.test(base) ||
     /overflow-y\s*:\s*auto/.test(css), '長清單有捲動處理');
}

console.log('══════ 戰鬥畫面在手機是上下排列 ══════');
{
  ok(/\.field-foe\s*\{[^}]*order\s*:/.test(mobileCss) ||
     /order\s*:\s*1/.test(mobileCss), '手機版有用 order 調整場地順序（敵方在上）');
  ok(/flex-direction\s*:\s*column/.test(mobileCss), '手機版把場地改成直向排列');
  ok(/\.card-tip\s*\{[^}]*display\s*:\s*none/.test(mobileCss),
     '觸控裝置關掉跟隨游標的預覽');
}

console.log('');
console.log('通過 ' + pass + '　失敗 ' + errors.length);
if (errors.length) { errors.forEach(e => console.log('  ✗ ' + e)); process.exit(1); }
console.log('✔ 版面規則檢查通過（實際觸控體驗仍需真機確認）');
