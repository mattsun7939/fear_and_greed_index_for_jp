# ウォークスルー: Fear and Greed Index for Japan

実装された機能と動作確認の手順です。

## 実装内容
1. **データ取得スクリプト (`scripts/fetchData.js`)**
   - モックデータを使用して、市場の勢い、株価の強さなど7つの指標を計算。
   - `yahoo-finance2` を利用する基盤を作成 (現在はモック)。
   - `public/data.json` にJSON形式で保存。

2. **フロントエンド (`app/page.js`, generated components)**
   - **スピードメーター (GaugeChart)**: `recharts` を使用し、Fear/Greedスコアを視覚化。
   - **指標リスト (IndicatorList)**: 7つの指標の詳細ステータスを表示。
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
コンソールに `Data successfully saved...` と表示されればOKです。

### 3. アプリケーション起動 (フロントエンド)
```bash
npm run dev
```
ブラウザで `http://localhost:3000` にアクセスします。

### 4. 表示確認
- **スピードメーター**: 針がスコアの位置を指しているか確認。
- **リスト**: 7つの指標が表示され、適切なアイコンと色がついているか確認。

### 5. データ更新の検証
1. `scripts/fetchData.js` の `marketMomentum.score` などを書き換えて保存。
2. `node scripts/fetchData.js` を再実行。
3. ブラウザをリロードし、値が反映されるか確認。

## 次のステップ (本番化に向けて)
- `scripts/fetchData.js` 内の `yahooFinance` 呼び出しのコメントアウトを外し、実際のシンボル (`^N225` 等) でデータ取得ロジックを実装する。
- Error handlingの強化。
