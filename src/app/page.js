import fs from 'fs';
import path from 'path';
import GaugeChart from '@/components/GaugeChart';
import IndicatorList from '@/components/IndicatorList';

async function getData() {
  const filePath = path.join(process.cwd(), 'public/data.json');
  try {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContents);
  } catch (error) {
    console.error('Error reading data.json:', error);
    // Fallback data or null
    return null;
  }
}

export const dynamic = 'force-dynamic'; // 常に最新のデータを表示

export default async function Home() {
  const data = await getData();

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-xl text-gray-500">データが見つかりません。スクリプトを実行してください。</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Japanese Market Sentiment
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
            日本の株式市場における「恐怖」と「強欲」の指数
          </p>
        </div>

        <div className="flex justify-center">
          <GaugeChart
            score={data.score}
            rating={data.rating}
            timestamp={data.timestamp}
          />
        </div>

        <div className="border-t border-gray-200 pt-10">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
            Market Indicators
          </h2>
          <IndicatorList indicators={data.indicators} />
        </div>

        <footer className="text-center text-gray-400 text-sm mt-12">
          <p>
            Data source: Yahoo Finance, Updated daily.
          </p>
        </footer>
      </div>
    </main>
  );
}
