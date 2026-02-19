# ウォークスルー: Fear and Greed Index for Japan

実装された機能と動作確認の手順です。

## 実装内容
1. **データ取得スクリプト (`scripts/fetchData.js`)**
   - **使用ライブラリ**: `yahoo-finance2`
   - **データソース**: 日経平均 (`^N225`), 米国10年債 (`^TNX`), 米国ハイイールド債 (`HYG`)
   - **処理内容**:
     - 過去250日分のデータを取得し、移動平均やボラティリティを計算。
     - 6つの指標（勢い、強さ、幅、ジャンク債、ボラティリティ、セーフヘイブン）をスコアリング (Put/Callは除外)。
     - JCT (日本時間) を基準にデータ処理を行い、`timestamp` を記録。
     - `public/data.json` に最新データを保存。
     - `public/log/data_yyyymmdd.json` に日次履歴データを保存（同名ファイルは上書き）。

2. **フロントエンド (`app/page.js`, generated components)**
   - **スピードメーター (GaugeChart)**: `recharts` を使用し、Fear/Greedスコアを視覚化。
   - **指標リスト (IndicatorList)**: 6つの指標の詳細ステータスを表示。
   - **自動更新**: ページアクセス時に最新の `data.json` を読み込み。

## 動作確認手順

### 1. 依存関係の準備
```bash
npm install
```

### 2. データ生成 (バックエンド)
```bash
node scripts/fetchData.js
```
コンソールに以下のメッセージが表示されれば成功です。
- `Data successfully saved to .../public/data.json`
- `Log data successfully saved to .../public/log/data_yyyymmdd.json`

### 3. アプリケーション起動 (フロントエンド)
```bash
npm run dev
```
または、本番用ビルドを実行する場合：
```bash
npm run build
npm start
```
ブラウザで `http://localhost:3000` にアクセスします。

### 4. 表示確認
- **タイトル**: タブ名が `Japanese Market Fear & Greed Index` になっているか確認。
- **データ日付**: JCT基準の日付で表示されているか確認。

### 5. Git連携
- `public/data.json` は `.gitignore` に含まれていますが、`public/log/` 配下のファイルは履歴として残すため除外していません（必要に応じて変更してください）。

## 運用上の注意
- `fetchData.js` は `yahoo-finance2` を使用しているため、インターネット接続が必要です。
- 頻繁に実行しすぎるとアクセス制限を受ける可能性があります（1日1回推奨）。
