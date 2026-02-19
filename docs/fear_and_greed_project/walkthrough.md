# ウォークスルー: Fear and Greed Index for Japan

実装された機能と動作確認の手順です。

## 実装内容
1. **データ取得スクリプト (`scripts/fetchData.js`)**
   - **使用ライブラリ**: `yahoo-finance2`
   - **データソース**: 日経平均 (`^N225`), 米国10年債 (`^TNX`), 米国ハイイールド債 (`HYG`)
   - **処理内容**:
     - 過去250日分のデータを取得し、移動平均やボラティリティを計算。
     - 6つの指標（勢い、強さ、幅、ジャンク債、ボラティリティ、セーフヘイブン）をスコアリング (Put/Callは除外)。
     - `public/data.json` にJSON形式で保存。

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
コンソールに `Fetching market data...` と表示され、最後に `Data successfully saved to ...` と表示されれば成功です。
`public/data.json` が更新されていることを確認してください。

### 3. アプリケーション起動 (フロントエンド)
```bash
npm run dev
```
ブラウザで `http://localhost:3000` にアクセスします。

### 4. 表示確認
- **スピードメーター**: 針がスコアの位置を指しているか確認。
- **リスト**: 6つの指標が全て表示され、`Data source: Yahoo Finance` となっているか確認。
- **日付**: `Updated: YYYY/MM/DD` がデータ生成日になっているか確認。

### 5. Git連携
- `public/data.json` やログファイルは `.gitignore` に追加されているため、コミット時に除外されていることを確認してください。

## 運用上の注意
- `fetchData.js` は `yahoo-finance2` を使用しているため、インターネット接続が必要です。
- 頻繁に実行しすぎるとアクセス制限を受ける可能性があります（1日1回推奨）。
