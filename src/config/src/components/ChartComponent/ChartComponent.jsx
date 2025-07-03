import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const ChartComponent = ({ chartConfig, theme }) => {
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);

    useEffect(() => {
        if (chartRef.current && chartConfig) {
            const ctx = chartRef.current.getContext('2d');
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }

            const isDark = theme === 'dark';
            const gridColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';
            const textColor = isDark ? '#ffffff' : '#333333';

            const defaultOptions = { /* ... (Paste Theme Options from previous answer) ... */ };

            const finalConfig = {
                ...chartConfig,
                options: { ...defaultOptions, /* ... merge ... */ }
            };

            chartInstanceRef.current = new Chart(ctx, finalConfig);
        }
        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
                chartInstanceRef.current = null;
            }
        };
    }, [chartConfig, theme]);

    return (
        <div className="chart-render-area">
            <canvas ref={chartRef}></canvas>
        </div>
    );
};

export default ChartComponent;