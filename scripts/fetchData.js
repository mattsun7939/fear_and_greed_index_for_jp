const fs = require('fs');
const path = require('path');

// 擬似的なデータ取得・計算スクリプト
// 本番環境では yahoo-finance2 等を使用して実際のデータを取得します。

const DATA_FILE_PATH = path.join(__dirname, '../public/data.json');

// サーバー負荷を軽減するための待機関数
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchData() {
  console.log('Fetching data...');
  
  // 各指標のデータ取得をシミュレーション
  // 実際の実装ではここでAPIリクエストを行います
  // await yahooFinance.quote('^N225');
  await sleep(1000); // 擬似的な待機

  // 1. 市場の勢い: 日経平均株価と125日移動平均線の乖離
  const marketMomentum = {
    name: 'Market Momentum',
    score: 75, // Mock value
    rating: 'Greed',
    description: '日経平均は125日移動平均線を上回っており、強気相場を示唆しています。'
  };

  await sleep(1000);

  // 2. 株価の強さ: 新高値/新安値銘柄数の比率
  const stockPriceStrength = {
    name: 'Stock Price Strength',
    score: 60,
    rating: 'Greed',
    description: '新高値銘柄数が新安値銘柄数を上回っています。'
  };

  // 3. 株価の幅: 騰落レシオ
  const stockPriceBreadth = {
    name: 'Stock Price Breadth',
    score: 55,
    rating: 'Neutral',
    description: '騰落レシオは中立的な範囲にあります。'
  };

  // 4. プット/コール・オプション
  const putCallOptions = {
    name: 'Put/Call Options',
    score: 40,
    rating: 'Fear',
    description: 'プットオプションの取引が増加しており、警戒感が見られます。'
  };

  // 5. ジャンク債需要: 社債スプレッド
  const junkBondDemand = {
    name: 'Junk Bond Demand',
    score: 80,
    rating: 'Extreme Greed',
    description: '投資家はリスクを取って社債を購入しており、強いリスク選好を示しています。'
  };

  // 6. ボラティリティ: 日経VI
  const volatility = {
    name: 'Market Volatility',
    score: 50,
    rating: 'Neutral',
    description: 'ボラティリティは平均的な水準です。'
  };

  // 7. セーフヘイブン需要
  const safeHavenDemand = {
    name: 'Safe Haven Demand',
    score: 45,
    rating: 'Neutral',
    description: '国債と株式のリターン差は大きくありません。'
  };

  // 総合スコアの計算 (平均)
  const indicators = [
    marketMomentum,
    stockPriceStrength,
    stockPriceBreadth,
    putCallOptions,
    junkBondDemand,
    volatility,
    safeHavenDemand
  ];

  const totalScore = Math.round(
    indicators.reduce((acc, curr) => acc + curr.score, 0) / indicators.length
  );

  let totalRating = 'Neutral';
  if (totalScore >= 75) totalRating = 'Extreme Greed';
  else if (totalScore >= 55) totalRating = 'Greed';
  else if (totalScore >= 45) totalRating = 'Neutral';
  else if (totalScore >= 25) totalRating = 'Fear';
  else totalRating = 'Extreme Fear';

  const data = {
    score: totalScore,
    rating: totalRating,
    timestamp: new Date().toISOString(),
    indicators: indicators
  };

  // JSONファイルとして保存
  try {
    // publicディレクトリが存在しない場合は作成
    const publicDir = path.dirname(DATA_FILE_PATH);
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2));
    console.log(`Data successfully saved to ${DATA_FILE_PATH}`);
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

fetchData();
