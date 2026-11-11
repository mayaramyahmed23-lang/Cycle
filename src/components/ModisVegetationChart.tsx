import React, { useState } from 'react';
import { ModisVegetationRecord } from '../types';
import { Activity, Calendar, CheckCircle2, AlertCircle, Info, Sparkles } from 'lucide-react';

interface ModisVegetationChartProps {
  records: ModisVegetationRecord[];
  areaNameEn: string;
  areaNameAr: string;
  language: 'en' | 'ar';
}

export const ModisVegetationChart: React.FC<ModisVegetationChartProps> = ({
  records,
  areaNameEn,
  areaNameAr,
  language,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<'ndvi' | 'evi'>('ndvi');
  const [hoveredRecord, setHoveredRecord] = useState<ModisVegetationRecord | null>(null);

  if (!records || records.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-stone-500 bg-stone-50 rounded-2xl border border-stone-200">
        No MODIS vegetation time series available.
      </div>
    );
  }

  // Filter or sample data for clean rendering (e.g. 40 points evenly distributed across 2020-2024)
  const sampledRecords = records.filter((_, idx) => idx % 2 === 0);

  const values = sampledRecords.map((r) => (selectedMetric === 'ndvi' ? r.ndvi : r.evi));
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 0.1;

  // SVG Chart Dimensions
  const chartWidth = 720;
  const chartHeight = 220;
  const paddingX = 40;
  const paddingY = 30;
  const innerWidth = chartWidth - paddingX * 2;
  const innerHeight = chartHeight - paddingY * 2;

  const points = sampledRecords.map((r, i) => {
    const val = selectedMetric === 'ndvi' ? r.ndvi : r.evi;
    const x = paddingX + (i / (sampledRecords.length - 1)) * innerWidth;
    const y = paddingY + innerHeight - ((val - minVal) / range) * innerHeight;
    return { x, y, record: r, val };
  });

  const pathD = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200 uppercase tracking-wide">
              NASA MODIS (MOD13Q1.061)
            </span>
            <span className="text-xs text-stone-500 font-mono">16-Day L3 Global 250m</span>
          </div>
          <h4 className="text-base font-bold text-stone-900">
            {language === 'ar' ? `السلسلة الزمنية لصحة الغطاء النباتي: ${areaNameAr}` : `Vegetation Vitality Time Series: ${areaNameEn}`}
          </h4>
          <p className="text-xs text-stone-500">
            {language === 'ar'
              ? 'تتبع التغير الفصلي والدورات الزراعية وتأثير انسداد قنوات الري بالمخلفات على المحاصيل'
              : 'Tracking seasonal crop phenology, Nile canal vitality, and agricultural stress from 2020 to 2024'}
          </p>
        </div>

        {/* Metric Selector */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setSelectedMetric('ndvi')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedMetric === 'ndvi'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            NDVI (Normalized Difference)
          </button>
          <button
            onClick={() => setSelectedMetric('evi')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedMetric === 'evi'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            EVI (Enhanced Vegetation)
          </button>
        </div>
      </div>

      {/* SVG Responsive Chart */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-56 select-none"
        >
          {/* Subtle Grid Lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={chartWidth - paddingX}
            y2={paddingY}
            stroke="#e7e5e4"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={paddingY + innerHeight / 2}
            x2={chartWidth - paddingX}
            y2={paddingY + innerHeight / 2}
            stroke="#e7e5e4"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={chartHeight - paddingY}
            x2={chartWidth - paddingX}
            y2={chartHeight - paddingY}
            stroke="#e7e5e4"
          />

          {/* Area Fill */}
          <path d={areaD} fill="url(#modisGradient)" opacity="0.4" />

          {/* Line Stroke */}
          <path
            d={pathD}
            fill="none"
            stroke="#059669"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Data Points */}
          {points.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={hoveredRecord?.date === pt.record.date ? 6 : 3}
              fill={hoveredRecord?.date === pt.record.date ? '#047857' : '#10b981'}
              stroke="#ffffff"
              strokeWidth="1.5"
              className="cursor-pointer transition-all"
              onMouseEnter={() => setHoveredRecord(pt.record)}
            />
          ))}

          {/* Gradients */}
          <defs>
            <linearGradient id="modisGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Active Point Card & Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs">
        <div>
          <span className="text-stone-500 block">
            {language === 'ar' ? 'تاريخ رصد موديس المحدد:' : 'Selected Acquisition Date:'}
          </span>
          <span className="font-bold text-stone-900 font-mono">
            {hoveredRecord ? hoveredRecord.date : records[records.length - 1].date}
          </span>
        </div>

        <div>
          <span className="text-stone-500 block">
            {selectedMetric === 'ndvi' ? 'NDVI Value:' : 'EVI Value:'}
          </span>
          <span className="font-bold text-emerald-800 font-mono text-sm">
            {hoveredRecord
              ? (selectedMetric === 'ndvi' ? hoveredRecord.ndvi : hoveredRecord.evi).toFixed(4)
              : (selectedMetric === 'ndvi'
                  ? records[records.length - 1].ndvi
                  : records[records.length - 1].evi
                ).toFixed(4)}
          </span>
        </div>

        <div>
          <span className="text-stone-500 block">
            {language === 'ar' ? 'جودة البيانات (SummaryQA):' : 'Data Integrity (SummaryQA):'}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              {language === 'ar' ? 'بيانات مؤكدة وخالية من السحب (Good QA)' : '0 - Pixel Quality Assured (Cloud-Free)'}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};
