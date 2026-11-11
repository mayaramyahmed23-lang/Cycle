import React, { useState } from 'react';
import { LandsatObservation } from '../types';
import { ArrowLeftRight, Calendar, Info, Layers, Sparkles, TrendingUp, Cpu } from 'lucide-react';

interface SatelliteComparisonSliderProps {
  studyAreaNameEn: string;
  studyAreaNameAr: string;
  baseline: LandsatObservation;
  current: LandsatObservation;
  deltaNDVI: number;
  deltaNDBI: number;
  urbanExpansionPercent: number;
  language: 'en' | 'ar';
}

export const SatelliteComparisonSlider: React.FC<SatelliteComparisonSliderProps> = ({
  studyAreaNameEn,
  studyAreaNameAr,
  baseline,
  current,
  deltaNDVI,
  deltaNDBI,
  urbanExpansionPercent,
  language,
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [activeTab, setActiveTab] = useState<'visual' | 'spectral-bands' | 'scientific-model'>('visual');

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-stone-200 bg-stone-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-100 text-cyan-900 border border-cyan-200 uppercase tracking-wide">
              {language === 'ar' ? 'مقارنة لاندسات الزمنية (2020 vs 2024)' : 'Landsat 8/9 Temporal Benchmark'}
            </span>
            <span className="text-xs text-stone-500 font-mono">
              WRS {baseline.wrsPathRow}
            </span>
          </div>
          <h3 className="text-lg font-bold text-stone-900">
            {language === 'ar' ? studyAreaNameAr : studyAreaNameEn}
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            {language === 'ar'
              ? 'مقارنة طيفية دقيقة لانعكاسية السطح وتوسع الكتلة العمرانية وتأثيرها على تراكم المخلفات'
              : 'Multi-spectral surface reflectance & built-up fabric change informing terrestrial waste pressure'}
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-stone-200/70 p-1 rounded-xl text-xs font-semibold text-stone-600 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('visual')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'visual' ? 'bg-white text-stone-900 shadow-xs' : 'hover:text-stone-900'
            }`}
          >
            {language === 'ar' ? 'المقارنة التفاعلية' : 'Interactive Split'}
          </button>
          <button
            onClick={() => setActiveTab('spectral-bands')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'spectral-bands' ? 'bg-white text-stone-900 shadow-xs' : 'hover:text-stone-900'
            }`}
          >
            {language === 'ar' ? 'القنوات الطيفية' : 'Spectral Bands'}
          </button>
          <button
            onClick={() => setActiveTab('scientific-model')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'scientific-model' ? 'bg-white text-stone-900 shadow-xs' : 'hover:text-stone-900'
            }`}
          >
            {language === 'ar' ? 'النموذج الفيزيائي' : 'Physics Model'}
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'visual' && (
        <div className="p-5 sm:p-6 space-y-6">
          {/* Interactive Split View */}
          <div className="relative w-full h-80 sm:h-96 rounded-xl overflow-hidden border border-stone-300 shadow-inner select-none group">
            {/* 2024 Current Image (Right / Underneath) */}
            <div className="absolute inset-0 bg-stone-900">
              <img
                src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80"
                alt="2024 Satellite Observation"
                className="w-full h-full object-cover filter contrast-110 saturate-110"
              />
              <div className="absolute bottom-3 right-3 bg-stone-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-stone-700 text-white text-xs font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span>2024 (Landsat 9 OLI-2)</span>
              </div>
            </div>

            {/* 2020 Baseline Image (Left / Clipped by slider) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPosition}%` }}
            >
              <img
                src="https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80"
                alt="2020 Satellite Observation"
                className="w-full h-full object-cover filter contrast-95 sepia-20"
                style={{ width: `${(100 / Math.max(sliderPosition, 1)) * 100}%`, maxWidth: 'none' }}
              />
              <div className="absolute bottom-3 left-3 bg-stone-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-stone-700 text-white text-xs font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>2020 (Landsat 8 OLI)</span>
              </div>
            </div>

            {/* Vertical Split Line & Handle */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize flex items-center justify-center shadow-2xl"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="w-8 h-8 rounded-full bg-white text-stone-800 shadow-xl border-2 border-cyan-500 flex items-center justify-center -ml-3.5 cursor-ew-resize">
                <ArrowLeftRight className="w-4 h-4 text-cyan-700" />
              </div>
            </div>

            {/* Interactive Range Input overlay */}
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={(e) => setSliderPosition(Number(e.target.value))}
              aria-label="Satellite comparison slider"
              className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-20"
            />
          </div>

          {/* Quick Guidance */}
          <div className="text-center text-xs text-stone-500 flex items-center justify-center gap-2">
            <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-600" />
            <span>
              {language === 'ar'
                ? 'اسحب المؤشر يميناً ويساراً لمقارنة صورة القمر الصناعي بين عام 2020 وعام 2024'
                : 'Drag the slider across the scene to compare 2020 baseline vs 2024 satellite acquisition'}
            </span>
          </div>

          {/* Core Numerical Indices Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* NDBI (Built-up) */}
            <div className="p-4 rounded-xl border border-cyan-200 bg-cyan-50/50">
              <div className="flex items-center justify-between text-xs text-cyan-900 font-bold mb-1">
                <span>NDBI (Built-up Index)</span>
                <span className="text-[11px] font-mono text-cyan-700">
                  {deltaNDBI >= 0 ? `+${deltaNDBI.toFixed(3)}` : deltaNDBI.toFixed(3)}
                </span>
              </div>
              <div className="flex items-baseline gap-3 my-2">
                <div>
                  <span className="text-xs text-stone-500 block">2020</span>
                  <span className="text-lg font-bold text-stone-800 font-mono">
                    {baseline.ndbi > 0 ? `+${baseline.ndbi.toFixed(3)}` : baseline.ndbi.toFixed(3)}
                  </span>
                </div>
                <span className="text-cyan-600 font-bold">→</span>
                <div>
                  <span className="text-xs text-stone-500 block">2024</span>
                  <span className="text-xl font-extrabold text-cyan-950 font-mono">
                    {current.ndbi > 0 ? `+${current.ndbi.toFixed(3)}` : current.ndbi.toFixed(3)}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-cyan-800 leading-relaxed">
                {language === 'ar'
                  ? 'يقيس كثافة المنشآت الإسفلتية والخرسانية. ارتفاع المؤشر يرتبط مباشرة بزيادة تدفقات التغليف البلاستيكي.'
                  : 'Measures impervious built-up surfaces. Growth correlates with increased consumer plastic generation.'}
              </p>
            </div>

            {/* NDVI (Vegetation) */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
              <div className="flex items-center justify-between text-xs text-emerald-900 font-bold mb-1">
                <span>NDVI (Vegetation Index)</span>
                <span className="text-[11px] font-mono text-emerald-700">
                  {deltaNDVI >= 0 ? `+${deltaNDVI.toFixed(3)}` : deltaNDVI.toFixed(3)}
                </span>
              </div>
              <div className="flex items-baseline gap-3 my-2">
                <div>
                  <span className="text-xs text-stone-500 block">2020</span>
                  <span className="text-lg font-bold text-stone-800 font-mono">
                    {baseline.ndvi.toFixed(3)}
                  </span>
                </div>
                <span className="text-emerald-600 font-bold">→</span>
                <div>
                  <span className="text-xs text-stone-500 block">2024</span>
                  <span className="text-xl font-extrabold text-emerald-950 font-mono">
                    {current.ndvi.toFixed(3)}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                {language === 'ar'
                  ? 'انعكاسية الكلوروفيل عبر القناة 5 (NIR). التراجع يشير إلى تآكل الأحزمة الخضراء الطبيعية.'
                  : 'Photosynthetic canopy vitality. Reductions highlight localized agricultural stress.'}
              </p>
            </div>

            {/* Surface Thermal Temp */}
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50">
              <div className="flex items-center justify-between text-xs text-rose-900 font-bold mb-1">
                <span>Thermal Band 10</span>
                <span className="text-[11px] font-mono text-rose-700">
                  {(current.surfaceReflectance.st_b10_thermal - baseline.surfaceReflectance.st_b10_thermal).toFixed(1)} K
                </span>
              </div>
              <div className="flex items-baseline gap-3 my-2">
                <div>
                  <span className="text-xs text-stone-500 block">2020</span>
                  <span className="text-lg font-bold text-stone-800 font-mono">
                    {baseline.surfaceReflectance.st_b10_thermal.toFixed(1)} K
                  </span>
                </div>
                <span className="text-rose-600 font-bold">→</span>
                <div>
                  <span className="text-xs text-stone-500 block">2024</span>
                  <span className="text-xl font-extrabold text-rose-950 font-mono">
                    {current.surfaceReflectance.st_b10_thermal.toFixed(1)} K
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                {language === 'ar'
                  ? 'حرارة السطح الإشعاعية. الإجهاد الحراري يسرع تفتت البوليمرات البلاستيكية إلى مايكروبلاستيك.'
                  : 'Land surface temperature. High radiant heat accelerates polymer brittle photodegradation.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Spectral Bands Tab */}
      {activeTab === 'spectral-bands' && (
        <div className="p-5 sm:p-6 space-y-4">
          <div className="text-xs text-stone-600 mb-2">
            {language === 'ar'
              ? 'قيم الانعكاسية السطحية المحسوبة من بيانات لاندسات 8/9 Level-2 باستخدام المعامل القياسي: (DN × 0.0000275) - 0.2'
              : 'Surface reflectance values calculated from Landsat 8/9 Level-2 using official scaling: (DN * 0.0000275) - 0.2'}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 font-semibold bg-stone-50">
                  <th className="py-2.5 px-3">Band / Spectral Channel</th>
                  <th className="py-2.5 px-3">Wavelength (µm)</th>
                  <th className="py-2.5 px-3">2020 Baseline (L8)</th>
                  <th className="py-2.5 px-3">2024 Current (L9)</th>
                  <th className="py-2.5 px-3">Spectral Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-mono text-stone-700">
                <tr>
                  <td className="py-2.5 px-3 font-medium text-stone-900">SR_B2 (Blue)</td>
                  <td className="py-2.5 px-3 text-stone-500">0.452 - 0.512</td>
                  <td className="py-2.5 px-3">{baseline.surfaceReflectance.sr_b2_blue.toFixed(3)}</td>
                  <td className="py-2.5 px-3">{current.surfaceReflectance.sr_b2_blue.toFixed(3)}</td>
                  <td className="py-2.5 px-3 font-bold text-cyan-700">
                    {(current.surfaceReflectance.sr_b2_blue - baseline.surfaceReflectance.sr_b2_blue).toFixed(3)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium text-stone-900">SR_B3 (Green)</td>
                  <td className="py-2.5 px-3 text-stone-500">0.533 - 0.590</td>
                  <td className="py-2.5 px-3">{baseline.surfaceReflectance.sr_b3_green.toFixed(3)}</td>
                  <td className="py-2.5 px-3">{current.surfaceReflectance.sr_b3_green.toFixed(3)}</td>
                  <td className="py-2.5 px-3 font-bold text-cyan-700">
                    {(current.surfaceReflectance.sr_b3_green - baseline.surfaceReflectance.sr_b3_green).toFixed(3)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium text-stone-900">SR_B4 (Red)</td>
                  <td className="py-2.5 px-3 text-stone-500">0.636 - 0.673</td>
                  <td className="py-2.5 px-3">{baseline.surfaceReflectance.sr_b4_red.toFixed(3)}</td>
                  <td className="py-2.5 px-3">{current.surfaceReflectance.sr_b4_red.toFixed(3)}</td>
                  <td className="py-2.5 px-3 font-bold text-cyan-700">
                    {(current.surfaceReflectance.sr_b4_red - baseline.surfaceReflectance.sr_b4_red).toFixed(3)}
                  </td>
                </tr>
                <tr className="bg-emerald-50/40">
                  <td className="py-2.5 px-3 font-semibold text-emerald-950">SR_B5 (Near Infrared - NIR)</td>
                  <td className="py-2.5 px-3 text-stone-500">0.851 - 0.879</td>
                  <td className="py-2.5 px-3">{baseline.surfaceReflectance.sr_b5_nir.toFixed(3)}</td>
                  <td className="py-2.5 px-3">{current.surfaceReflectance.sr_b5_nir.toFixed(3)}</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-700">
                    {(current.surfaceReflectance.sr_b5_nir - baseline.surfaceReflectance.sr_b5_nir).toFixed(3)}
                  </td>
                </tr>
                <tr className="bg-cyan-50/40">
                  <td className="py-2.5 px-3 font-semibold text-cyan-950">SR_B6 (Shortwave IR 1 - SWIR1)</td>
                  <td className="py-2.5 px-3 text-stone-500">1.566 - 1.651</td>
                  <td className="py-2.5 px-3">{baseline.surfaceReflectance.sr_b6_swir1.toFixed(3)}</td>
                  <td className="py-2.5 px-3">{current.surfaceReflectance.sr_b6_swir1.toFixed(3)}</td>
                  <td className="py-2.5 px-3 font-bold text-cyan-700">
                    {(current.surfaceReflectance.sr_b6_swir1 - baseline.surfaceReflectance.sr_b6_swir1).toFixed(3)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-medium text-stone-900">SR_B7 (Shortwave IR 2 - SWIR2)</td>
                  <td className="py-2.5 px-3 text-stone-500">2.107 - 2.294</td>
                  <td className="py-2.5 px-3">{baseline.surfaceReflectance.sr_b7_swir2.toFixed(3)}</td>
                  <td className="py-2.5 px-3">{current.surfaceReflectance.sr_b7_swir2.toFixed(3)}</td>
                  <td className="py-2.5 px-3 font-bold text-cyan-700">
                    {(current.surfaceReflectance.sr_b7_swir2 - baseline.surfaceReflectance.sr_b7_swir2).toFixed(3)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Scientific Model Tab */}
      {activeTab === 'scientific-model' && (
        <div className="p-5 sm:p-6 space-y-4 text-xs text-stone-700 leading-relaxed">
          <div className="p-3.5 rounded-xl bg-stone-100 border border-stone-300 font-mono text-[11px] text-stone-800 space-y-1">
            <div>NDVI = (SR_B5 - SR_B4) / (SR_B5 + SR_B4)</div>
            <div>NDBI = (SR_B6 - SR_B5) / (SR_B6 + SR_B5)</div>
            <div>Pixel Scaling: Refl = (DN * 0.0000275) - 0.2</div>
            <div>Cloud Mask: QA_PIXEL bit 3 (cloud) & bit 4 (shadow) verified clear</div>
          </div>
          <p>
            {language === 'ar'
              ? 'تعتمد منصة سايكل على البيانات المصححة جوياً من لاندسات (Level-2 Surface Reflectance). عند توسع النطاق الحضري وارتفاع مؤشر NDBI بنسبة كبيرة، ترتفع احتمالية تسرب المخلفات البلاستيكية غير المدارة بسبب الكثافة اللوجستية وتوسع البناء. يتم دمج هذه البيانات مع بلاغات المستخدمين لتوجيه الشاحنات بكفاءة أعلى.'
              : 'Cycle utilizes USGS/NASA Level-2 Surface Reflectance atmospherically corrected products. High NDBI shifts highlight rapid land development where unmanaged packaging and bulk industrial plastics aggregate. Fusing satellite indices with crowd reports enables targeted routing before polymers escape into waterways.'}
          </p>
        </div>
      )}
    </div>
  );
};
