# 🎾 テニス予約ボット（Tennis Reservation Bot）

Node.js + Puppeteer による **テニスコート自動予約ロボ**。  
ログイン → 日付ジャンプ → スロット選択 → サブプラン選択 → 予約確定 まで **フル自動**。  
さらに **Google Sheets ログ / Slack 通知 / スクリーンショット保存 / 並列実行 / 実行時JSTログ** に対応。

**毎月10日の20:00 予約合戦** を勝ち抜くために設計された、完全実戦仕様の予約ボット。

---

## 🚀 機能概要（最新）

### 1. フル自動ログイン
- `.env` のログイン情報を読み込み
- ログイン → ホーム → 「予約する」へ自動遷移

### 2. カレンダー操作（jumpToDate）
- 次月ボタン（`#next-month`）
- 日付セル（`YYYYMMDD`）
- カレンダーモーダル閉じ検知  
→ **高精度で目標日へジャンプ**

### 3. スロット検索 & クリック（clickSlot）
- `year, month, day, hour, minute, mpId` を厳密一致で検索  
- 属性セレクタで DOM の変化に強い  
- スロットが無い場合は **`slot_unavailable`（満枠/営業外）** として処理

### 4. サブプラン選択（selectSubplanAndNext）
- `<select id="sp_select">` に value 指定  
- 「次へ進む」で確認画面へ遷移

### 5. 予約確定処理
- 最終確認ボタン `#res_confrim_submit` をクリック  
- 成功 → `reserve_ok`  
- エラー → **スクショ / Slack通知 / Sheetsログ**

### 6. Google Sheets ログ記録（appendLogRow）
記録される情報：
- kind（reserve_ok / reserve_ng_full / reserve_ng）
- timestamp（ISO）
- **status：実行時の JST（例 2025/11/25 17:22:01 JST）**
- site（例：magome）
- message（詳細ログ）

### 7. Slack 通知（Webhook）
- 成功：🎾 *予約成功！*
- 満枠：⚠ *満枠で予約できず*
- 致命的：💥 *予約処理全体でエラー*
- **全通知に JST の実行時刻を追加**

### 8. エラー時スクリーンショット
自動で `/screenshots/` に保存  
保存名例：
- `fatal_error_*.png`
- `slot_unavailable_*.png`
- `confirm_error_*.png`

---

## 🆕 9. 複数候補予約（reserveManySequential）

### ▼ A. 複数候補予約（reserveManySequential）
順次モード（A→B→C…と試す）

```
const targets = [
  { year: 2025, month: 12, day: 14, hour: 17, minute: 0, mpId: 42 },
  { year: 2025, month: 12, day: 21, hour: 17, minute: 0, mpId: 42 },
];
reserveManySequential(targets);
```
挙動：  
満枠 → 次へ  
成功 → 即停止  
fatal → 中断


### ▼ B. 並列予約（reserveManyParallel）
**同時にブラウザ起動して予約合戦するモード**。
```
reserveManyParallel([
  { year: 2025, month: 12, day: 14, hour: 17, minute: 0, mpId: 42 },
  { year: 2025, month: 12, day: 20, hour: 17, minute: 0, mpId: 42 },
  { year: 2025, month: 12, day: 21, hour: 17, minute: 0, mpId: 42 },
  { year: 2025, month: 12, day: 27, hour: 17, minute: 0, mpId: 42 },
], { maxParallel: 5 });
```
特徴：  
複数ブラウザを同時に起動し、同時に予約へ突撃  
PCスペックが許す限り並列化（デフォルト maxParallel=5）  
各ウィンドウが完全独立でログイン〜確定まで進む  
結果は Promise.allSettled で待ち合わせ  
fatal が出たバッチは即中断（安全設計）  

用途：  
同じ曜日の 1週目〜4週目を 同時に取る など  
「最初に取れた1つだけで良い」ではなく  
全部成功してほしい時に最適

## 10. 🆕 JST 実行時刻の付与  
Sheets の「status」列に YYYY/MM/DD HH:mm:ss JST を記録  
Slack通知の本文にも @ JST を追記  
予約合戦の速度計測 & 動作確認に有効  


---
## 🛠 使用技術 
- **Node.js** 
- **Puppeteer Core** 
- **Google Sheets API (v4)** 
- **dotenv** 
- **Chrome Remote Debugging（将来的に）** 
- **Chrome Remote Debugging（予定）**

--- 

## 📁 ディレクトリ構成（簡易版）
```
/tennis-bot
├─ mtc.js                # 実行エントリ
├─ reserve-core.js       # 予約ロジック本体（Sequential/Parallel）
├─ mtc-date.js           # カレンダージャンプ
├─ mtc-slot.js           # スロット検索
├─ mtc-subplan.js        # サブプラン選択
│
├─ utils/
│   ├─ screenshot.js     # スクショ
│   └─ slack.js          # Slack通知
│
├─ sheets.js             # Google Sheets API
├─ screenshots/          # スクショ格納
├─ .env                  # ID/PW/Webhook など
└─ package.json
```

## ⚙️ セットアップ（簡易） 
1. インストール 
`npm install` 
2. `.env` の準備 
- `LOGIN_ID=xxxx` 
- `LOGIN_PASSWORD=xxxx`
- `SLACK_WEBHOOK_URL=xxxx` 
- `SPREADSHEET_ID=xxxxx` 
- `GOOGLE_APPLICATION_CREDENTIALS=./credentials.json` 

3. 動作確認（スプシ書き込み） 
`node sheets.js`

4. ▶️ 単発予約 `node mtc.js 

5. 複数候補予約：順次版（reserveManySequential）
`reserveManySequential(targets);`

6. 複数候補予約：並列版（reserveManyParallel）
`reserveManyParallel(targets, { maxParallel: 5 });`

7. 📌 今後の予定（WIP）  
予約ロジックの安定化  
予約失敗時のリトライ処理  
スプレッドシートのログ構造整理  
Puppeteer の headless モード最適化   

📄 ライセンス This project is for personal/educational use
