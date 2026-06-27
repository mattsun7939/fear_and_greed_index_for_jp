const fs = require('fs');
const path = require('path');
const vm = require('vm');
const yahooFinanceModule = require('yahoo-finance2').default;
const yahooFinance = new yahooFinanceModule({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

async function fetchJPXMarketIndicators() {
  try {
    console.log('Fetching JPX market indicators (Toraku Ratio, New Highs/Lows) from nikkei225jp.com...');
    const htmlRes = await fetch('https://nikkei225jp.com/data/touraku.php', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!htmlRes.ok) throw new Error(`HTTP error! status: ${htmlRes.status}`);
    const html = await htmlRes.text();
    const scriptMatch = html.match(/src=\"(\/_data\/_nfsDATA\/DAY\/daily2year\.json\?\d+)\"/);
    if (!scriptMatch) throw new Error('daily2year.json script tag not found in HTML');

    const url = 'https://nikkei225jp.com' + scriptMatch[1];
    const dataRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!dataRes.ok) throw new Error(`HTTP error! status: ${dataRes.status}`);
    const js = await dataRes.text();

    const sandbox = {};
    vm.createContext(sandbox);
    vm.runInContext(js, sandbox);
    const arr = sandbox.DAILY;
    if (!arr || arr.length === 0) throw new Error('DAILY array not found in script context');

    const latest = arr[arr.length - 1];

    // Fetch margin trading data (dailyweek2.json)
    console.log('Fetching Margin Trading indicators (信用評価損益率) from nikkei225jp.com...');
    let marginTradingRatio = null;
    try {
      const sinyouHtmlRes = await fetch('https://nikkei225jp.com/data/sinyou.php', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (sinyouHtmlRes.ok) {
        const sinyouHtml = await sinyouHtmlRes.text();
        const sinyouScriptMatch = sinyouHtml.match(/src=\"(\/_data\/_nfsDATA\/DAY\/dailyweek2\.json\?\d+)\"/);
        if (sinyouScriptMatch) {
          const sinyouUrl = 'https://nikkei225jp.com' + sinyouScriptMatch[1];
          const sinyouDataRes = await fetch(sinyouUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
          if (sinyouDataRes.ok) {
            const sinyouJs = await sinyouDataRes.text();
            const sinyouSandbox = {};
            vm.createContext(sinyouSandbox);
            vm.runInContext(sinyouJs, sinyouSandbox);
            const sinyouArr = sinyouSandbox.DAILY;
            if (sinyouArr && sinyouArr.length > 0) {
              let idx = sinyouArr.length - 1;
              while (idx >= 0 && (sinyouArr[idx][7] === "" || sinyouArr[idx][7] === null || typeof sinyouArr[idx][7] !== 'number')) {
                idx--;
              }
              if (idx >= 0) {
                marginTradingRatio = sinyouArr[idx][7];
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to scrape margin trading data, will fallback:', e);
    }

    return {
      toraku25: latest[7],
      newHighs: latest[8],
      newLows: latest[9],
      marginTradingRatio: marginTradingRatio
    };
  } catch (err) {
    console.error('Failed to fetch JPX indicators, using fallbacks:', err);
    return null;
  }
}

const DATA_FILE_PATH = path.join(__dirname, '../public/data.json');
const LOG_DIR_PATH = path.join(__dirname, '../public/log');
const GOOGLE_DRIVE_DIR_PATH = '/mnt/chromeos/GoogleDrive/MyDrive/Linuxファイル/';

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

    const jpxData = await fetchJPXMarketIndicators();

    const n225 = await yahooFinance.quote('^N225');
    await sleep(1000);
    // Calculate date for 250 days ago (JCT based)
    const todayJCT = getJCTDate();
    const pastDate = new Date(todayJCT);
    pastDate.setDate(todayJCT.getDate() - 250);

    // Format dates as YYYY-MM-DD
    const period1 = pastDate.toISOString().split('T')[0];
    const period2 = todayJCT.toISOString().split('T')[0];

    const chartResult = await yahooFinance.chart('^N225', { period1, period2, interval: '1d' });
    const n225History = chartResult.quotes.filter(q => q.close !== null);
    await sleep(1000);

    // US Data for proxies
    const us10y = await yahooFinance.quote('^TNX');
    await sleep(1000);
    const hyg = await yahooFinance.quote('HYG');
    await sleep(1000);
    const nkvi = await yahooFinance.quote('^NKVI.OS', {}, { validateResult: false });
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
    // 東証プライムの新高値・新安値銘柄比率。
    // 取得できない場合は、日経平均の52週高値・安値に対する現在位置（フォールバック）を使用。
    let strengthScore = 50;
    let strengthDesc = '';
    if (jpxData && typeof jpxData.newHighs === 'number' && typeof jpxData.newLows === 'number') {
      const totalNew = jpxData.newHighs + jpxData.newLows;
      const ratio = totalNew > 0 ? jpxData.newHighs / totalNew : 0.5;
      strengthScore = Math.max(0, Math.min(100, Math.round(ratio * 100)));
      strengthDesc = `東証プライムの新高値銘柄数は${jpxData.newHighs}、新安値銘柄数は${jpxData.newLows}で、新高値比率(${strengthScore}%)は${getRating(strengthScore)}レベルです。`;
    } else {
      const yearHigh = n225.fiftyTwoWeekHigh;
      const yearLow = n225.fiftyTwoWeekLow;
      strengthScore = ((latestPrice - yearLow) / (yearHigh - yearLow)) * 100;
      strengthScore = Math.max(0, Math.min(100, Math.round(strengthScore)));
      strengthDesc = `日経平均は52週レンジ of ${strengthScore}% の位置にあり、${getRating(strengthScore)}を示しています。(フォールバック判定)`;
    }

    const strengthIndicator = {
      name: 'Stock Price Strength',
      score: strengthScore,
      rating: getRating(strengthScore),
      description: strengthDesc
    };

    // 3. 株価の幅 (Stock Price Breadth)
    // 東証プライムの25日騰落レシオ。
    // 取得できない場合は、日経平均の過去20日間の上昇日数割合（フォールバック）を使用。
    let breadthScore = 50;
    let breadthDesc = '';
    const days20 = n225History.slice(-20);
    if (jpxData && typeof jpxData.toraku25 === 'number') {
      // 70以下 -> 0 (Extreme Fear), 130以上 -> 100 (Extreme Greed)
      const toraku = jpxData.toraku25;
      let scoreRaw = ((toraku - 70) / (130 - 70)) * 100;
      breadthScore = Math.max(0, Math.min(100, Math.round(scoreRaw)));
      breadthDesc = `東証プライム市場の25日騰落レシオは${toraku.toFixed(1)}%で、市場の広がりは${getRating(breadthScore)}レベルです。`;
    } else {
      let upDays = 0;
      for (let i = 1; i < days20.length; i++) {
        if (days20[i].close > days20[i - 1].close) upDays++;
      }
      breadthScore = Math.max(0, Math.min(100, Math.round((upDays / 19) * 100)));
      breadthDesc = `過去20営業日のうち${upDays}日が上昇しており、市場の裾野の広さは${getRating(breadthScore)}です。(フォールバック判定)`;
    }

    const breadthIndicator = {
      name: 'Stock Price Breadth',
      score: breadthScore,
      rating: getRating(breadthScore),
      description: breadthDesc
    };

    // 4. 信用評価損益率 (Margin Trading Sentiment)
    // 東証プライム市場の個人投資家の信用評価損益率。
    // 基準: -3%以上 = 100 (Extreme Greed), -18%以下 = 0 (Extreme Fear)
    // 取得できない場合は、中立(50)固定。
    let marginScore = 50;
    let marginDesc = '';
    if (jpxData && typeof jpxData.marginTradingRatio === 'number') {
      const ratio = jpxData.marginTradingRatio; // e.g. -8.10
      let scoreRaw = ((ratio - (-18)) / ((-3) - (-18))) * 100;
      marginScore = Math.max(0, Math.min(100, Math.round(scoreRaw)));
      marginDesc = `個人投資家の信用評価損益率は${ratio.toFixed(2)}%で、信用口座の含み損益センチメントは${getRating(marginScore)}レベルです。`;
    } else {
      marginScore = 50;
      marginDesc = '信用評価損益率はデータソース制限のため、中立(50)としています。(フォールバック判定)';
    }

    const marginIndicator = {
      name: 'Margin Trading Sentiment',
      score: marginScore,
      rating: getRating(marginScore),
      description: marginDesc
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

    // 6. ボラティリティ (Volatility / Nikkei VI)
    // 日経平均VI (Volatility Index) の現在値を使用。
    // 基準: 15以下=Extreme Greed (100), 40以上=Extreme Fear (0)
    const viPrice = nkvi.regularMarketPrice;
    let volScore = 100 - ((viPrice - 15) / 25 * 100);
    volScore = Math.max(0, Math.min(100, Math.round(volScore)));

    const volatilityIndicator = {
      name: 'Market Volatility',
      score: volScore,
      rating: getRating(volScore),
      description: `日経平均VIは${viPrice.toFixed(2)}で、オプション市場から算出されたボラティリティセンチメントは${getRating(volScore)}レベルです。`
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
      marginIndicator,
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
      n225Price: Math.round(latestPrice),
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

    // 3. Save to Google Drive (if available)
    try {
      if (fs.existsSync(GOOGLE_DRIVE_DIR_PATH)) {
        const driveFilePath = path.join(GOOGLE_DRIVE_DIR_PATH, logFileName);
        fs.writeFileSync(driveFilePath, JSON.stringify(data, null, 2));
        console.log(`Log data successfully saved to Google Drive: ${driveFilePath}`);
      } else {
        console.log(`Google Drive directory not found: ${GOOGLE_DRIVE_DIR_PATH} (Skipping backup)`);
      }
    } catch (driveError) {
      console.error('Error saving to Google Drive:', driveError.message);
    }


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
