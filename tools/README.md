# 資料工具（不屬於遊戲本體）

`tools/` 底下都是**離線**的資料蒐集與驗證腳本，遊戲執行時完全不會用到它們。
`index.html` 直接開仍然只依賴 `js/`、`css/`。

## 為什麼需要第二個資料來源

繁中 SwordGirls@wiki（`w.atwiki.jp/swordgirls`）有官方台版譯名、繁中效果文與風味文，
是卡名的權威來源。但它從 Episode 1 起，**隨從與角色卡的「攻/防/體」「LIFE」欄位是空模板**
（頁面上寫成 `攻/防/體://`），所以那些卡一直補不進來。

英文 Sword Girls Wiki（`swordgirls.fandom.com`）補的正是這一塊。它的卡片頁是
結構化的 `{{CardTable}}` 模板，含真實卡號、完整數值與真實合成配方：

```
{{CardTable
|ID=300012 |type=Follower |size=4 |points=3 |limit=3
|faction=Vita |episode=1 |rarity=Uncommon
|attack=5 |defense=2 |stamina=10
|effect=Before this card attacks, it gets ATK +1.
|ingredient1=Shoes |amount1=3  ...
}}
```

兩邊互補：**atwiki 出繁中卡名與效果文，Fandom 出數值、卡號與配方。**

## 抓取方式（刻意放輕）

`fd_fetch.py` 走 MediaWiki API，不爬 HTML：

* 一次請求帶 50 個標題 —— 548 張卡只要 **11 次請求**
* `User-Agent` 標明用途與聯絡信箱（MediaWiki 的禮儀要求）
* 帶 `maxlag=5`，伺服器忙碌時主動退讓重試
* 請求間隔 1.5 秒；429 / 503 指數退避
* 全部落地快取到 `tools/fandom/`，重跑不會再打伺服器

```
python tools/fd_fetch.py     # 抓取（已快取則不重抓）
python tools/fd_parse.py     # 解析成 tools/fandom_cards.json
```

`fandom_cards.json` 目前收錄 **526 張**（隨從 244 / 咒語 236 / 角色 46），
其中 523 張數值完整、524 張有卡號、457 張有合成配方，橫跨 Episode 0～6。

## 交叉驗證

```
node tools/dump_mine.js      # 匯出現有卡片 → tools/mine.json
python tools/verify.py       # 以英文卡名配對，逐欄比對
```

最近一次結果：

```
配對 65 張（未命中 27 張＝自製 NPC 卡）
數值衝突 7 筆（其中 4 筆是標記 prov 的暫定值，屬預期）
  ✗ Saint's Blessing   size   我方 2 → Fandom 3
  ✗ Curious Vernika    life   我方 30 → Fandom 36
  ✗ Layna Scentriver   life   我方 35 → Fandom 30
```

65 張兩邊都有的卡當中只有 3 筆不一致，其餘欄位（含 57 張卡號）完全吻合 ——
足以說明兩個來源指的是同一份 2011 年原作資料。

### 三筆衝突的處理

| 卡 | 情況 |
|---|---|
| Curious Vernika | 我方 LIFE 30 是佔位值（卡號也是假的 `EP1-001`），**Fandom 正確** |
| Layna Scentriver | 竹林鄉 BOSS，我方 LIFE 35 是估算值，**Fandom 正確** |
| Saint's Blessing | atwiki 說 SIZE 2、Fandom 說 3，其餘欄位（分數 1、上限 1）一致。**尚未裁決**，暫留原值 |

## 注意

* Fandom 是**英文**，要的官方台版譯名仍以 atwiki 為準；合併時用
  `(episode, faction, type, size, points, limit, rarity)` 或英文卡名配對。
* KanaTales（MoeFul SOFT，2022）是官方手機重製版，**不可**當資料來源 ——
  重製會重新平衡數值，且卡表不公開。
