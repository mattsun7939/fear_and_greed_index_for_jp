"use client";

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const GaugeChart = ({ score, rating, timestamp }) => {
    // ゲージのセグメント定義 (0-100)
    const data = [
        { name: 'Extreme Fear', value: 25, color: '#ef4444' }, // 0-25
        { name: 'Fear', value: 20, color: '#f97316' },        // 25-45
        { name: 'Neutral', value: 10, color: '#eab308' },     // 45-55
        { name: 'Greed', value: 20, color: '#84cc16' },       // 55-75
        { name: 'Extreme Greed', value: 25, color: '#22c55e' }, // 75-100
    ];

    // 針の角度計算 (0 -> 180度, 100 -> 0度)
    // RechartsのPieは 0度が3時方向。startAngle 180 (9時), endAngle 0 (3時)
    // 入力 score 0 -> 180度, score 100 -> 0度
    // 角度 = 180 - (score * 1.8)
    const RADIAN = Math.PI / 180;
    const needleAngle = 180 - (score * 1.8);

    // 針の長さ等の設定
    const cx = '50%';
    const cy = '70%'; // 半円なので中心を少し下に
    const iR = 60; // 内径
    const oR = 100; // 外径

    // 針を描画する関数
    const renderNeedle = (value, cx, cy, iR, oR, color) => {
        const angle = 180 - (value * 1.8);
        const length = (iR + 2 * oR) / 3;
        const sin = Math.sin(-RADIAN * angle);
        const cos = Math.cos(-RADIAN * angle);
        const r = 5;
        const x0 = cx + 5;
        const y0 = cy + 5;
        const xba = x0 + r * sin;
        const yba = y0 - r * cos;
        const xbb = x0 - r * sin;
        const ybb = y0 + r * cos;
        const xp = x0 + length * cos;
        const yp = y0 + length * sin;

        return [
            <circle cx={x0} cy={y0} r={r} fill={color} stroke="none" key="needle-circle" />,
            <path d={`M${xba} ${yba}L${xbb} ${ybb} L${xp} ${yp} L${xba} ${yba}`} fill={color} stroke="none" key="needle-path" />,
        ];
    };

    // 針の座標を計算 (SVG内での座標系)
    // ResponsiveContainerを使うため、座標計算が難しい場合がある。
    // カスタム針コンポーネントとして実装する方が確実だが、
    // ここでは簡易的にPieの上にSVGを重ねるか、Rechartsの機能を使う。
    // Rechartsで針を描くのは少しコツがいるため、
    // ここではGauge用のライブラリを使わず、Recharts + SVGで実装する。

    // 簡略化: 針はPieChartの外または上にSVGとして描画
    // ただしResponsiveだと座標がずれる。
    // ここではCSSと回転を使ったシンプルな針を実装する。

    return (
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-lg w-full max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-2 text-gray-800">Fear & Greed Index</h2>

            <div className="relative w-64 h-32 mb-8">
                {/* コンテナサイズ固定しないとneedleの配置が難しい */}
                <ResponsiveContainer width="100%" height="200%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%" // 100% height containerの50% = bottom of visible area
                            startAngle={180}
                            endAngle={0}
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>

                {/* 針 (CSS Rotation) */}
                <div
                    className="absolute bottom-0 left-1/2 w-1 h-28 origin-bottom bg-gray-800 rounded-full"
                    style={{
                        transform: `translateX(-50%) rotate(${score * 1.8 - 90}deg)`,
                        height: '100px', // 半径に合わせて調整
                        bottom: '0px'
                    }}
                >
                    <div className="absolute -bottom-2 -left-2 w-5 h-5 bg-gray-800 rounded-full border-2 border-white"></div>
                </div>
            </div>

            <div className="text-center mt-4">
                <div className="text-5xl font-bold text-gray-900">{score}</div>
                <div className="text-xl font-medium text-gray-600 mt-1">{rating}</div>
                <div className="text-sm text-gray-400 mt-2">
                    Updated: {new Date(timestamp).toLocaleDateString('ja-JP')}
                </div>
            </div>
        </div>
    );
};

export default GaugeChart;
