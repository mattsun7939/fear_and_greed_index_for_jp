# 実装計画: Fear and Greed Index for Japan

日本市場向けのFear and Greed Indexを表示するWebアプリケーションを構築します。

## 提案される変更

### プロジェクト構成
ルートディレクトリにNext.jsアプリケーションを展開し、以下のディレクトリを作成します。
- `scripts/`: データ取得スクリプト用
- `public/`: 静的ファイル (`data.json`) 用
- `components/`: UIコンポーネント用
- `lib/`: ユーティリティ関数用
- `docs/fear_and_greed_project/`: ドキュメント用

### 新規作成ファイル

#### [NEW] [fetchData.js](file:///scripts/fetchData.js)
- 1日1回実行されるデータ取得スクリプト。
- モックデータを使用して7つの指標を計算し、総合スコアを算出。
- 結果を `public/data.json` に保存。

#### [NEW] [page.js](file:///app/page.js)
- メインページ。
- `data.json` を読み込み、スピードメーターと指標リストを表示。

#### [NEW] [GaugeChart.js](file:///components/GaugeChart.js)
- スピードメーターを表示するコンポーネント。
- `recharts` の PieChart を使用して実装。

#### [NEW] [IndicatorList.js](file:///components/IndicatorList.js)
- 7つの指標をリスト表示するコンポーネント。

#### [NEW] [manual.md](file:///docs/fear_and_greed_project/manual.md)
- Linux環境でのセットアップ手順とCron設定。

## 検証計画

### 手動検証
1. `node scripts/fetchData.js` を実行し、`public/data.json` が生成されることを確認。
2. Next.js 開発サーバー (`npm run dev`) を起動し、ブラウザで `http://localhost:3000` にアクセス。
3. スピードメーターと指標リストが正しく表示されることを確認。
4. `public/data.json` の値を手動で変更し、画面に反映されることを確認。
