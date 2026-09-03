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
配對 86 張（未命中 26 張＝自製 NPC 卡）
數值衝突 1 筆（prov 暫定值 0、已知未裁決 1、未處理 0）
  ~ Saint's Blessing   size   我方 2 / Fandom 3
```

### 已經補回去的部分

| 卡 | 補了什麼 |
|---|---|
| `新入騎士團員` New Knight | 攻/體 由估算 4/6 換成真實 5/3，拿掉 `prov` |
| `騎士團的旗手、佛雷特` Flag Knight Frett | 攻/體 由估算 5/8 換成真實 3/9，拿掉 `prov` |
| Episode 1 咒語 20 張 | 內部編號 `EP1-1xx` 換成真實卡號 `200006`～`200040`，補上英文卡名 |
| `壓倒` Overwhelm | 分數 1 → 3 |
| `強制幽閉` Forced Confinement | 分數 1 → 13 |
| `好奇心少女維若妮卡` Curious Vernika | 卡號 `EP1-001` → `100040`，LIFE 30 → 36 |
| 副本 NPC ×2 | `en` 標錯：`風紀部長蕾娜` 其實對應 Prefect Layna（不是 Layna Scentriver）、`旗手佛雷特（哨戒）` 對應 Flag Knight Frett |

EP1 咒語的卡號連號得很整齊 —— 公立 200006-200010、私立 200016-200020、
南十字 200026-200030、暗黑 200036-200040，每陣營正好 5 張、順序與繁中 wiki
頁面一致。這是「配對正確」的獨立佐證（配對本身是靠效果文逐張核對的）。

### 還補不了的部分

* `風紀部長蕾娜` 等 5 個竹林鄉樓層敵人的 LIFE —— 它們取材自**隨從卡**，
  隨從卡本身沒有 LIFE，原作副本敵人的 LIFE 也查不到，只能維持依樓層深度估算。
* Episode 1 以後的**真實合成配方** —— Fandom 有（457 張），但那些配方要用
  眼鏡／絲襪／聖獸之淚等素材，來自本作還沒做的副本。等副本做出來才能換上，
  所以 `provRecipe` 標記保留。

### 一個副作用：平衡基準線變了

把上面兩張南十字卡換成真實數值後（STA 6→3、ATK 5→3），
南十字的勝率從 61% 掉到 50%，排名從第二變第三。
`test/balance.js` 原本斷言「排序符合 wiki 的說法」，那個通過是估算值撐出來的。
詳情見該檔案開頭的註解與 README 的「平衡」段落。

## 注意

* Fandom 是**英文**，要的官方台版譯名仍以 atwiki 為準；合併時用
  `(episode, faction, type, size, points, limit, rarity)` 或英文卡名配對。
* KanaTales（MoeFul SOFT，2022）是官方手機重製版，**不可**當資料來源 ——
  重製會重新平衡數值，且卡表不公開。
