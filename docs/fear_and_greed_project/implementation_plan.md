# 実装計画: Fear and Greed Index for Japan

日本市場向けのFear and Greed Indexを表示するWebアプリケーションを構築します。

## 完了した変更

### プロジェクト構成
ルートディレクトリにNext.jsアプリケーションを展開。
- `scripts/`: データ取得スクリプト用
- `public/`: 静的ファイル (`data.json`) 用
- `src/components/`: UIコンポーネント用
- `src/lib/`: ユーティリティ関数用
- `docs/fear_and_greed_project/`: ドキュメント用

### 作成ファイル

#### [NEW] [fetchData.js](file:///scripts/fetchData.js)
- 1日1回実行されるデータ取得スクリプト。
- `yahoo-finance2` を使用して、日経平均 (`^N225`)、米国10年債 (`^TNX`)、米国ハイイールド債 (`HYG`) のデータを取得。
- **データ取得詳細**: `yahooFinance.historical` を使用し、過去250日分のデータを取得して移動平均等を計算。
- 以下の6つの指標を計算し、JSON出力 (**Put/Call Optionsは除外**):
    1. **Market Momentum**: N225 vs 125日移動平均
    2. **Stock Price Strength**: N225 52週レンジ位置 (プロキシ)
    3. **Stock Price Breadth**: 過去20日の上昇日数割合 (プロキシ)
    4. **Junk Bond Demand**: HYG トレンド (プロキシ)
    5. **Market Volatility**: N225 Historical Volatility
    6. **Safe Haven Demand**: N225 20日リターン (プロキシ)

#### [NEW] [page.js](file:///src/app/page.js)
- メインページ。
- `data.json` を読み込み、スピードメーターと指標リストを表示。

#### [NEW] [GaugeChart.js](file:///src/components/GaugeChart.js)
- スピードメーターを表示するコンポーネント。
- `recharts` の PieChart を使用して実装。

#### [NEW] [IndicatorList.js](file:///src/components/IndicatorList.js)
- 6つの指標をリスト表示するコンポーネント。

#### [NEW] [manual.md](file:///docs/fear_and_greed_project/manual.md)
- Linux環境でのセットアップ手順とCron設定。

### その他調整
- **Git管理除外**: `.gitignore` に `public/data.json` およびログファイルを追加し、自動生成ファイルがリポジトリに含まれないように設定。

## 検証結果

### 自動テスト
- `node scripts/fetchData.js` の実行により、正常にデータが取得され `public/data.json` が生成されることを確認しました。
- `yahoo-finance2` の `InvalidOptionsError` に対処するため、`historical` メソッドに `period2` を明示的に指定しました。

### 手動検証
- 生成された `data.json` に基づき、フロントエンドが正常に描画されることを確認済み。
