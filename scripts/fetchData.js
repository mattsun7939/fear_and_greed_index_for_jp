const fs = require('fs');
const path = require('path');
const yahooFinanceModule = require('yahoo-finance2').default;
const yahooFinance = new yahooFinanceModule();

const DATA_FILE_PATH = path.join(__dirname, '../public/data.json');
const LOG_DIR_PATH = path.join(__dirname, '../public/log');

// JCTで現在時刻を取得するヘルパー
function getJCTDate() {
  // サーバーのタイムゾーンに関わらずJCT (+9) を取得
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const jct = new Date(utc + (3600000 * 9));
  return jct;
}

// サーバー負荷軽減のための待機
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchMarketData() {
  console.log('Fetching market data...');

  try {
    // 1. 市場データ取得
    // ^N225: 日経平均
    // ^JNIV: 日経平均VI (取得できない可能性が高いが試行。なければ計算) -> JNIV.OS is often used but let's stick to N225 first.
    // ^TNX: 米国10年債 (グローバルリスクセンチメントのプロキシ)
    // HYG: 米国ハイイールド債ETF (ジャンク債需要のプロキシ)
    // JPY=X: ドル円

    // Yahoo Finance Japan symbols can be tricky via this lib. 
    // We will use standard Ticker symbols.

    const n225 = await yahooFinance.quote('^N225');
    await sleep(1000);
    // Calculate date for 250 days ago (JCT based)
    const todayJCT = getJCTDate();
    const pastDate = new Date(todayJCT);
    pastDate.setDate(todayJCT.getDate() - 250);

    // Format dates as YYYY-MM-DD
    const period1 = pastDate.toISOString().split('T')[0];
    const period2 = todayJCT.toISOString().split('T')[0];

    const n225History = await yahooFinance.historical('^N225', { period1, period2, interval: '1d' });
    await sleep(1000);

    // US Data for proxies
    const us10y = await yahooFinance.quote('^TNX');
    await sleep(1000);
    const hyg = await yahooFinance.quote('HYG');
    await sleep(1000);

    // --- 計算ロジック ---

    // 1. 市場の勢い (Market Momentum)
    // 日経平均株価と125日移動平均線の乖離
    const latestPrice = n225.regularMarketPrice;
    const days125 = n225History.slice(-125);
    const sum125 = days125.reduce((acc, cur) => acc + cur.close, 0);
    const ma125 = sum125 / days125.length;
    const momentumScoreRaw = ((latestPrice - ma125) / ma125) * 100;
    // Normalize: -10% to +10% -> 0 to 100. (Simplification)
    let momentumScore = 50 + (momentumScoreRaw * 5);
    momentumScore = Math.max(0, Math.min(100, Math.round(momentumScore)));

    const momentumRating = getRating(momentumScore);
    const momentumIndicator = {
      name: 'Market Momentum',
      score: momentumScore,
      rating: momentumRating,
      description: `日経平均株価(${latestPrice.toFixed(0)})は125日移動平均線(${ma125.toFixed(0)})と比較して${momentumScoreRaw > 0 ? '上回って' : '下回って'}おり、${momentumRating}を示しています。`
    };

    // 2. 株価の強さ (Stock Price Strength)
    // プロキシ: 52週高値・安値に対する現在位置
    // (Price - 52Low) / (52High - 52Low)
    const yearHigh = n225.fiftyTwoWeekHigh;
    const yearLow = n225.fiftyTwoWeekLow;
    let strengthScore = ((latestPrice - yearLow) / (yearHigh - yearLow)) * 100;
    strengthScore = Math.max(0, Math.min(100, Math.round(strengthScore)));

    const strengthIndicator = {
      name: 'Stock Price Strength',
      score: strengthScore,
      rating: getRating(strengthScore),
      description: `日経平均は52週レンジの${strengthScore}%の位置にあり、${getRating(strengthScore)}を示しています。`
    };

    // 3. 株価の幅 (Stock Price Breadth)
    // プロキシ: 短期(5日)RSIのようなオシレーターを使用 (市場全体の騰落レシオ取得困難なため)
    // または、直近のモメンタム加速を見る。
    // ここでは簡易的に「過去20日間の上昇日数割合」をプロキシとする。
    const days20 = n225History.slice(-20);
    let upDays = 0;
    for (let i = 1; i < days20.length; i++) {
      if (days20[i].close > days20[i - 1].close) upDays++;
    }
    let breadthScore = (upDays / 19) * 100;
    breadthScore = Math.max(0, Math.min(100, Math.round(breadthScore)));

    const breadthIndicator = {
      name: 'Stock Price Breadth (Proxy)',
      score: breadthScore,
      rating: getRating(breadthScore),
      description: `過去20営業日のうち${upDays}日が上昇しており、市場の裾野の広さは${getRating(breadthScore)}です。`
    };

    // 4. プット/コール・オプション (Put/Call Options)
    // データ取得困難。中立(50)固定またはVIXプロキシを使用。
    // 今回は「中立」固定とし、将来の実装のためにプレースホルダーとする。
    const putCallIndicator = {
      name: 'Put/Call Options',
      score: 50,
      rating: 'Neutral',
      description: 'オプション市場のデータが取得できないため、中立(50)としています。'
    };

    // 5. ジャンク債需要 (Junk Bond Demand)
    // プロキシ: 米国ハイイールド債(HYG)と米国国債(TNX)の利回り差は取得が難しい(HYGは価格)。
    // 代わりに HYG の価格トレンドを使用 (Risk On/Off)。
    // HYGが50日移動平均を超えていればGreed。
    const hygPrice = hyg.regularMarketPrice;
    const hygMA50 = hyg.fiftyDayAverage;
    const hygDiff = ((hygPrice - hygMA50) / hygMA50) * 100;
    // -5% to +5% -> 0 to 100
    let junkScore = 50 + (hygDiff * 10);
    junkScore = Math.max(0, Math.min(100, Math.round(junkScore)));

    const junkIndicator = {
      name: 'Junk Bond Demand (Global)',
      score: junkScore,
      rating: getRating(junkScore),
      description: `グローバルなリスク選好度(HYG)は移動平均と比較して${getRating(junkScore)}を示しています。`
    };

    // 6. ボラティリティ (Volatility)
    // 本来は日経VI(^JNIV)だが、取得できない場合は過去20日の標準偏差(Historical Volatility)で代用。
    // ここではHVを計算する。
    // HV = STDEV(ln(Price/PrevPrice)) * sqrt(250) * 100
    const returns = [];
    for (let i = 1; i < days20.length; i++) {
      returns.push(Math.log(days20[i].close / days20[i - 1].close));
    }
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length;
    const stdev = Math.sqrt(variance);
    const hv = stdev * Math.sqrt(250) * 100; // 年率変動率(%)

    // HVが低い(安定) -> Greed, 高い(不安定) -> Fear
    // 基準: 15%以下=Extreme Greed, 30%以上=Extreme Fear
    // score = 100 - ((hv - 15)/15 * 100) ?
    // Map 15 -> 100, 30 -> 0 (Reverse scale)
    let volScore = 100 - ((hv - 10) / 20 * 100);
    volScore = Math.max(0, Math.min(100, Math.round(volScore)));

    const volatilityIndicator = {
      name: 'Market Volatility',
      score: volScore,
      rating: getRating(volScore),
      description: `日経平均のボラティリティ(HV)は${hv.toFixed(1)}%で、市場の不安定さは${getRating(volScore)}レベルです。`
    };

    // 7. セーフヘイブン需要 (Safe Haven Demand)
    // 株式(N225)と国債(TNX利回り...ではなく価格が必要だが)のリターン差
    // 簡易的に: 株式の20日リターン vs 0 (安全資産リターンほぼ0と仮定)
    // N225 20日リターン
    const return20d = (n225.regularMarketPrice - days20[0].close) / days20[0].close * 100;
    // -10% to +10% -> 0 to 100
    let safeHavenScore = 50 + (return20d * 5);
    safeHavenScore = Math.max(0, Math.min(100, Math.round(safeHavenScore)));

    const safeHavenIndicator = {
      name: 'Safe Haven Demand',
      score: safeHavenScore,
      rating: getRating(safeHavenScore),
      description: `株式の直近リターン(${return20d.toFixed(1)}%)から、リスク資産への需要は${getRating(safeHavenScore)}です。`
    };

    // --- 総合スコア計算 ---
    const indicators = [
      momentumIndicator,
      strengthIndicator,
      breadthIndicator,
      // putCallIndicator, // Removed as per user request (hardcoded neutral)
      junkIndicator,
      volatilityIndicator,
      safeHavenIndicator
    ];

    const totalScore = Math.round(
      indicators.reduce((acc, curr) => acc + curr.score, 0) / indicators.length
    );

    const jctNow = getJCTDate();
    const data = {
      score: totalScore,
      rating: getRating(totalScore),
      timestamp: jctNow.toISOString(), // JCT ISO string (Note: built-in ISOstring is UTC, need to format manually or accept UTC-shifted time as "local")
      // Actually, user wants JCT processing. 
      // If I use jctNow.toISOString(), it puts the shifted time with 'Z', which implies UTC.
      // Better to format it like "YYYY-MM-DDTHH:mm:ss+09:00" OR just use the shifted time and know it's JCT.
      // Let's use a clear format if possible, or just the ISO string of the shifted date (which looks like UTC but is JCT value).
      // To be safe and explicit:
      // timestamp: jctNow.toISOString().replace('Z', '+09:00'), // Hacky but works for display if parsed correctly or treated as string.
      // Let's stick to standard ISO for machine readability, but the VALUE is JCT.
      // Wait, if I shift the time, `toISOString` gives `2026-02-20T02:00:00.000Z` when it is 2am in Japan.
      // This is technically "UTC 2am", which is "JCT 11am". This is wrong.
      // I should NOT shift the time object itself if I want to use .toISOString() correctly.
      // BUT `yahoo-finance` needs simple dates.
      // For the JSON output `timestamp`:
      // Use `jctNow.toISOString().replace('Z', '') + '+09:00'` ? 
      // Let's explicitly format it.
      timestamp: jctNow.toISOString().replace('Z', '+09:00'),
      indicators: indicators
    };

    // 1. Save main data.json
    const publicDir = path.dirname(DATA_FILE_PATH);
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2));
    console.log(`Data successfully saved to ${DATA_FILE_PATH}`);

    // 2. Save log file (data_yyyymmdd.json)
    if (!fs.existsSync(LOG_DIR_PATH)) {
      fs.mkdirSync(LOG_DIR_PATH, { recursive: true });
    }
    const yyyy = jctNow.getFullYear();
    const mm = String(jctNow.getMonth() + 1).padStart(2, '0');
    const dd = String(jctNow.getDate()).padStart(2, '0');
    const logFileName = `data_${yyyy}${mm}${dd}.json`;
    const logFilePath = path.join(LOG_DIR_PATH, logFileName);

    fs.writeFileSync(logFilePath, JSON.stringify(data, null, 2));
    console.log(`Log data successfully saved to ${logFilePath}`);

  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

function getRating(score) {
  if (score >= 75) return 'Extreme Greed';
  if (score >= 55) return 'Greed';
  if (score >= 45) return 'Neutral';
  if (score >= 25) return 'Fear';
  return 'Extreme Fear';
}

fetchMarketData();
