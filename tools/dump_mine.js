const fs=require('fs'),path=require('path');global.window=global;
const R=path.join(__dirname,'..');
['js/data/cards.js','js/data/cards_ep1.js', 'js/data/cards_ep2.js', 'js/data/cards_ep3.js', 'js/data/cards_ep4.js', 'js/data/cards_ex1.js', 'js/data/cards_ep5.js','js/data/cards_npc.js'].forEach(p=>eval(fs.readFileSync(path.join(R,p),'utf8')));
const out=[];
Object.keys(SG.CARDS).forEach(k=>{const c=SG.CARDS[k];out.push({key:k,...c});});
fs.writeFileSync(path.join(__dirname,'mine.json'),JSON.stringify(out,null,1));
console.log('我方卡片',out.length,'張｜有 en 欄位',out.filter(c=>c.en).length);
