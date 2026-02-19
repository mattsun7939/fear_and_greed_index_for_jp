import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const IndicatorList = ({ indicators }) => {
    const getRatingColor = (rating) => {
        switch (rating) {
            case 'Extreme Greed':
            case 'Greed':
                return 'text-green-600';
            case 'Extreme Fear':
            case 'Fear':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    };

    const getIcon = (rating) => {
        switch (rating) {
            case 'Extreme Greed':
            case 'Greed':
                return <TrendingUp className="w-5 h-5 text-green-500" />;
            case 'Extreme Fear':
            case 'Fear':
                return <TrendingDown className="w-5 h-5 text-red-500" />;
            default:
                return <Minus className="w-5 h-5 text-gray-500" />;
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto mt-8 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {indicators.map((indicator, index) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">{indicator.name}</h3>
                        {getIcon(indicator.rating)}
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                        <span className={`text-2xl font-bold ${getRatingColor(indicator.rating)}`}>
                            {indicator.score}
                        </span>
                        <span className={`text-sm font-medium ${getRatingColor(indicator.rating)}`}>
                            ({indicator.rating})
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        {indicator.description}
                    </p>
                </div>
            ))}
        </div>
    );
};

export default IndicatorList;
