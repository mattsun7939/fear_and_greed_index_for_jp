# 運用マニュアル: Fear and Greed Index for Japan

このプロジェクトをChromebookのLinuxコンテナ(Crostini)等のDebian系Linux環境で運用するための手順です。

## 1. 環境構築 (Node.jsのインストール)

Dockerを使用せず、直接Node.jsをインストールします。

```bash
# パッケージリストの更新
sudo apt update
sudo apt upgrade -y

# curlのインストール (未インストールの場合)
sudo apt install -y curl

# Node.js 20.x (LTS) のセットアップ
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Node.jsとnpmのインストール
sudo apt install -y nodejs

# バージョン確認
node -v
npm -v
```

## 2. プロジェクトのセットアップ

プロジェクトディレクトリに移動し、依存ライブラリをインストールします。

```bash
# プロジェクトディレクトリへ移動 (パスは適宜変更してください)
cd /path/to/fear_and_greed_index_for_jp

# 安依存関係のインストール
npm install
```

## 3. データ取得スクリプトの動作確認

以下のコマンドを実行し、エラーが出ずに完了することを確認します。

```bash
node scripts/fetchData.js
```

成功すると `public/data.json` が更新されます。

## 4. Cronの設定 (自動実行)

1日1回、特定の時間にスクリプトを実行するようにCronを設定します。

```bash
# crontabの編集
crontab -e
```

エディタが開いたら、以下の行を追記します。
(例: 毎日 18:00 に実行する場合)

```cron
0 18 * * * /usr/bin/node /path/to/fear_and_greed_index_for_jp/scripts/fetchData.js >> /path/to/fear_and_greed_index_for_jp/cron.log 2>&1
```

**注意点:**
- `node` コマンドのフルパスは `which node` で確認してください (通常 `/usr/bin/node` または `/usr/local/bin/node`)。
- `/path/to/...` は実際のプロジェクトの絶対パスに置き換えてください。
- ログ出力 (`>> ...`) はデバッグ用に推奨されます。

## 5. Webサーバーの起動 (開発用/簡易運用)

```bash
# ビルド
npm run build

# サーバー起動 (ポート3000)
npm start
```

バックグラウンドで常駐させる場合は `pm2` 等の使用を推奨しますが、簡易的には `nohup` も使えます。

```bash
nohup npm start > server.log 2>&1 &
```
