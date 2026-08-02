# CLAUDE.md

このファイルは、このリポジトリで作業する Claude Code (claude.ai/code) への指針を提供します。

## プロジェクト概要

日本市場（日経平均）版の「恐怖と強欲指数 (Fear & Greed Index)」を算出し、単一ページのダッシュボードとして表示する Next.js アプリです。データ取得は Next.js アプリ本体とは独立した Node.js スクリプト（`scripts/fetchData.js`）が担当し、cron等で定期実行して `public/data.json` を更新する前提のバッチ/表示分離構成になっています。同ワークスペース内の `n225-fear-and-greed-graph`（履歴グラフ表示）が、このプロジェクトが出力するログファイルをフォールバックデータソースとして参照しています。

## コマンド

データ取得（`public/data.json` と `public/log/data_YYYYMMDD.json` を生成・更新）:
```bash
node scripts/fetchData.js
```
本番運用では cron で毎日実行する想定（`docs/fear_and_greed_project/manual.md` に `crontab -e` での設定例あり）。`npm run` 経由のスクリプトとしては登録されていない点に注意 — `package.json` の `scripts` には `dev`/`build`/`start`/`lint` しかない。

Webアプリ:
```bash
npm install
npm run dev     # http://localhost:3000
npm run lint
npm run build && npm run start
```
自動テストは設定されていません。

## アーキテクチャ

**`scripts/fetchData.js`** — Next.jsの外で単独実行されるNode.jsスクリプト。`yahoo-finance2` と、`nikkei225jp.com` の内部JSONエンドポイントへの直接HTTPアクセス（HTMLから埋め込みスクリプトタグのURLを正規表現で抜き出し、`vm.runInContext()` でその場でJSとして評価してグローバル変数 `DAILY` を取り出す、というスクレイピング手法）を組み合わせて7つの構成要素スコア（Market Momentum、Stock Price Strength、Stock Price Breadth、Margin Trading Sentiment、Junk Bond Demand、Market Volatility、Safe Haven Demand）を算出し、単純平均で総合スコア（0〜100）を出す。`getRating()` が閾値（75/55/45/25）でExtreme Greed〜Extreme Fearの5段階に分類する。
- `nikkei225jp.com` 由来のデータ（騰落レシオ・新高値安値・信用評価損益率）が取得できない場合、各指標には日経平均自体の価格データから計算するフォールバックロジックが個別に用意されている（例: 新高値比率が取れなければ52週レンジ内の位置で代替）。新しい指標を追加する際もこの「一次データソース＋フォールバック」の対を踏襲すること。
- 出力は3箇所に書かれる: `public/data.json`（アプリが読む最新値）、`public/log/data_YYYYMMDD.json`（日次履歴ログ、`n225-fear-and-greed-graph` 側からも参照される）、そして存在すれば `/mnt/chromeos/GoogleDrive/MyDrive/Linuxファイル/`（Chromebook上のGoogle Driveマウントへのバックアップ、ディレクトリが無ければ静かにスキップ）。
- タイムスタンプは明示的にJCT (+09:00) で記録している（`getJCTDate()` でシステムタイムゾーンに関わらずJSTにシフトした `Date` を作り、`toISOString()` の末尾 `Z` を `+09:00` に置換）。日時関連のロジックを変更する際は、この「シフトした値をUTC表記のまま文字列だけ置換する」という手法の意図（サーバーのタイムゾーン設定に依存させたくない）を壊さないこと。

**Webアプリ (`src/app/page.js` ほか)** — App Router、単一ページ:
- `page.js` はサーバーコンポーネントで、ビルド/リクエスト時に `public/data.json` をファイルシステムから直接 `fs.readFileSync` で読む（APIルートは無い）。`export const dynamic = 'force-dynamic'` によりキャッシュされず毎回最新の `data.json` を反映する。`data.json` が存在しない/壊れている場合は「データが見つかりません」というフォールバック画面を表示する。
- `src/components/GaugeChart.js` が総合スコアのゲージ表示、`src/components/IndicatorList.js` が7指標それぞれのスコア・レーティング・説明文一覧を表示する。

## ドキュメント

`docs/fear_and_greed_project/`（`implementation_plan.md`、`manual.md`、`task.md`、`walkthrough.md`）は初回実装時の計画・手順メモ。cronの設定例など運用手順の参考にはなるが、生きたドキュメントではないため実装の正は `scripts/fetchData.js` と `src/` を参照すること。
