import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  GIBSLayerConfig,
  PlasticReport,
  StudyRegionDefinition,
} from '../types';
import {
  Layers,
  Crosshair,
  Eye,
  SplitSquareHorizontal,
  Info,
  MapPin,
} from 'lucide-react';

interface EarthIntelligenceMapProps {
  regions: StudyRegionDefinition[];
  activeRegion: StudyRegionDefinition;
  gibsLayers: GIBSLayerConfig[];
  reports: PlasticReport[];
  organizations: Array<{ id: string; name: string; orgType?: string; location?: string }>;
  onSelectRegion: (regionId: string) => void;
  onAnalyzeCustomPoint: (lat: number, lng: number) => void;
  analyzingGlobalPoint: boolean;
  latestObservationDate?: string | null;
  language: 'en' | 'ar';
}

const EGYPT_LOCATION_COORDS: Record<string, [number, number]> = {
  cairo: [30.0444, 31.2357],
  giza: [30.0131, 31.2089],
  maadi: [29.9598, 31.2586],
  'nasr city': [30.0511, 31.3656],
  'new cairo': [30.0074, 31.4913],
  'new capital': [30.0131, 31.7483],
  badr: [30.136, 31.715],
  '10th of ramadan': [30.306, 31.741],
  ramadan: [30.306, 31.741],
  zagazig: [30.5877, 31.502],
  sharqia: [30.5877, 31.502],
  mansoura: [31.0364, 31.3807],
  alexandria: [31.2001, 29.9187],
  monufia: [30.5972, 30.9876],
  tanta: [30.7865, 31.0004],
  ismailia: [30.6043, 32.2723],
  suez: [29.9668, 32.5498],
  aswan: [24.0889, 32.8998],
  luxor: [25.6872, 32.6396],
  القاهرة: [30.0444, 31.2357],
  الجيزة: [30.0131, 31.2089],
  الإسكندرية: [31.2001, 29.9187],
  الاسكندرية: [31.2001, 29.9187],
  الزقازيق: [30.5877, 31.502],
  الشرقية: [30.5877, 31.502],
  المنوفية: [30.5972, 30.9876],
  أسوان: [24.0889, 32.8998],
  العاصمة: [30.0131, 31.7483],
};

function resolveCityCoords(locStr: string, idx: number): [number, number] | null {
  const clean = (locStr || '').toLowerCase();
  for (const [k, coords] of Object.entries(EGYPT_LOCATION_COORDS)) {
    if (clean.includes(k)) {
      const jitterLat = ((idx % 5) - 2) * 0.008;
      const jitterLng = (((idx * 3) % 5) - 2) * 0.008;
      return [coords[0] + jitterLat, coords[1] + jitterLng];
    }
  }
  return null;
}

function buildClientGibsUrl(layer: GIBSLayerConfig, dateStr: string): string {
  const cleanDate = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : layer.defaultDate;
  const effectiveDate =
    layer.cadence === 'annual'
      ? `${Math.min(2024, Math.max(2001, parseInt(cleanDate.slice(0, 4), 10) || 2024))}-01-01`
      : cleanDate;
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer.layerIdentifier}/default/${effectiveDate}/${layer.tileMatrixSet}/{z}/{y}/{x}.${layer.format}`;
}

export const EarthIntelligenceMap: React.FC<EarthIntelligenceMapProps> = ({
  regions,
  activeRegion,
  gibsLayers,
  reports,
  organizations,
  onSelectRegion,
  onAnalyzeCustomPoint,
  analyzingGlobalPoint,
  latestObservationDate,
  language,
}) => {
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseStreetLayerRef = useRef<L.TileLayer | null>(null);
  const primaryGibsRef = useRef<L.TileLayer | null>(null);
  const compareGibsRef = useRef<L.TileLayer | null>(null);
  const regionsOverlayRef = useRef<L.LayerGroup>(L.layerGroup());
  const cycleOverlayRef = useRef<L.LayerGroup>(L.layerGroup());

  const todayIso = new Date().toISOString().slice(0, 10);

  // NASA GIBS controls
  const [selectedLayerId, setSelectedLayerId] = useState<string>(
    gibsLayers[0]?.id || 'gibs-truecolor-terra'
  );
  const [primaryDate, setPrimaryDate] = useState<string>(
    latestObservationDate || gibsLayers[0]?.defaultDate || '2026-10-16'
  );
  const [userPinnedDate, setUserPinnedDate] = useState<boolean>(false);
  const [gibsOpacity, setGibsOpacity] = useState<number>(0.88);
  const [showGibsLayer, setShowGibsLayer] = useState<boolean>(true);

  // Split Comparison controls
  const [splitCompareEnabled, setSplitCompareEnabled] = useState<boolean>(false);
  const [compareLayerId, setCompareLayerId] = useState<string>(
    gibsLayers[0]?.id || 'gibs-truecolor-terra'
  );
  const [compareDate, setCompareDate] = useState<string>('2022-10-16');
  const [splitPercent, setSplitPercent] = useState<number>(50);

  // Cycle Overlays + Global Click-to-Analyze mode
  const [showStudyRegions, setShowStudyRegions] = useState<boolean>(true);
  const [showCycleGroundPins, setShowCycleGroundPins] = useState<boolean>(true);
  const [clickAnalyzeMode, setClickAnalyzeMode] = useState<boolean>(false);

  const activeLayer =
    gibsLayers.find((l) => l.id === selectedLayerId) || gibsLayers[0];
  const compareLayer =
    gibsLayers.find((l) => l.id === compareLayerId) || gibsLayers[0];

  const effectivePrimaryDate =
    activeLayer?.cadence === 'annual'
      ? `${Math.min(2024, Math.max(2001, parseInt(primaryDate.slice(0, 4), 10) || 2024))}-01-01`
      : primaryDate;

  // Keep primary GIBS imagery date synced with latest retrieved MODIS observation unless user pinned a custom date
  useEffect(() => {
    if (!userPinnedDate && latestObservationDate && /^\d{4}-\d{2}-\d{2}$/.test(latestObservationDate)) {
      setPrimaryDate(latestObservationDate);
    }
  }, [latestObservationDate, userPinnedDate]);

  // Update compare clip geometry inside Leaflet container without recreating tiles
  const applySplitClip = () => {
    const map = mapRef.current;
    const compTile = compareGibsRef.current;
    if (!map || !compTile) return;
    const container = compTile.getContainer();
    if (!container) return;
    if (!splitCompareEnabled || !showGibsLayer) {
      container.style.clip = '';
      return;
    }
    const size = map.getSize();
    const nw = map.containerPointToLayerPoint([0, 0]);
    const se = map.containerPointToLayerPoint([size.x, size.y]);
    const clipX = Math.round(nw.x + (size.x * splitPercent) / 100);
    container.style.clip = `rect(${nw.y}px, ${se.x}px, ${se.y}px, ${clipX}px)`;
  };

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;
    const map = L.map(mapElRef.current, {
      center: activeRegion.center,
      zoom: 8,
      minZoom: 2,
      maxZoom: 16,
      zoomControl: true,
    });

    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    });
    osm.addTo(map);
    baseStreetLayerRef.current = osm;

    regionsOverlayRef.current.addTo(map);
    cycleOverlayRef.current.addTo(map);
    mapRef.current = map;

    map.on('move zoom moveend zoomend', () => {
      applySplitClip();
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Fly to active region when selection changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const targetZoom = activeRegion.isCustom ? 9 : 8;
    map.setView(activeRegion.center, Math.min(targetZoom, activeLayer?.maxZoom || 9));
  }, [activeRegion.id, activeRegion.center[0], activeRegion.center[1]]);

  // Click-to-analyze anywhere on Earth handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = (e: L.LeafletMouseEvent) => {
      if (!clickAnalyzeMode) return;
      onAnalyzeCustomPoint(
        Number(e.latlng.lat.toFixed(4)),
        Number(e.latlng.lng.toFixed(4))
      );
      setClickAnalyzeMode(false);
    };
    map.on('click', handler);
    return () => {
      map.off('click', handler);
    };
  }, [clickAnalyzeMode, onAnalyzeCustomPoint]);

  // Synchronize NASA GIBS Primary & Split Comparison Tile Layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activeLayer) return;

    if (primaryGibsRef.current) {
      map.removeLayer(primaryGibsRef.current);
      primaryGibsRef.current = null;
    }
    if (compareGibsRef.current) {
      map.removeLayer(compareGibsRef.current);
      compareGibsRef.current = null;
    }

    if (!showGibsLayer) return;

    const primaryUrl = buildClientGibsUrl(activeLayer, primaryDate);
    const primaryTile = L.tileLayer(primaryUrl, {
      attribution: 'NASA EOSDIS GIBS',
      maxNativeZoom: activeLayer.maxZoom,
      maxZoom: 14,
      opacity: gibsOpacity,
    });
    primaryTile.addTo(map);
    primaryGibsRef.current = primaryTile;

    if (splitCompareEnabled && compareLayer) {
      const compUrl = buildClientGibsUrl(compareLayer, compareDate);
      const compTile = L.tileLayer(compUrl, {
        attribution: 'NASA EOSDIS GIBS (Comparison)',
        maxNativeZoom: compareLayer.maxZoom,
        maxZoom: 14,
        opacity: gibsOpacity,
        zIndex: 350,
      });
      compTile.addTo(map);
      compareGibsRef.current = compTile;
      setTimeout(applySplitClip, 0);
    }
  }, [
    selectedLayerId,
    primaryDate,
    gibsOpacity,
    showGibsLayer,
    splitCompareEnabled,
    compareLayerId,
    compareDate,
  ]);

  useEffect(() => {
    applySplitClip();
  }, [splitPercent, splitCompareEnabled, showGibsLayer]);

  // Render Study Regions & Active Point Rectangles
  useEffect(() => {
    const group = regionsOverlayRef.current;
    group.clearLayers();
    if (!showStudyRegions) return;

    regions.forEach((r) => {
      const isSelected = r.id === activeRegion.id;
      const rect = L.rectangle(r.bounds, {
        color: isSelected ? '#0891B2' : '#475569',
        weight: isSelected ? 2.5 : 1.2,
        fillOpacity: isSelected ? 0.14 : 0.04,
      });
      rect.bindTooltip(
        `${language === 'ar' ? r.nameAr : r.nameEn} (${r.center[0].toFixed(2)}, ${r.center[1].toFixed(2)})`
      );
      rect.on('click', () => onSelectRegion(r.id));
      rect.addTo(group);
    });

    if (activeRegion.isCustom) {
      L.circleMarker(activeRegion.center, {
        radius: 8,
        color: '#0891B2',
        weight: 2.5,
        fillColor: '#06B6D4',
        fillOpacity: 0.7,
      })
        .bindPopup(
          `<div class="text-xs font-mono"><strong>${activeRegion.nameEn}</strong><br/>${activeRegion.center[0].toFixed(4)}, ${activeRegion.center[1].toFixed(4)}</div>`
        )
        .addTo(group);
    }
  }, [regions, activeRegion, showStudyRegions, language]);

  // Render Live Cycle Ground Plastic Reports & Organizations Overlay (Visually Distinct from NASA layers)
  useEffect(() => {
    const group = cycleOverlayRef.current;
    group.clearLayers();
    if (!showCycleGroundPins) return;

    reports.forEach((rep, idx) => {
      const coords = resolveCityCoords(rep.location, idx);
      if (!coords) return;
      const isOpen = rep.status === 'Available' || rep.status === 'In discussion';
      const marker = L.circleMarker(coords, {
        radius: 5.5,
        color: '#065F46',
        weight: 1.5,
        fillColor: isOpen ? '#10B981' : '#6B7280',
        fillOpacity: 0.85,
      });
      marker.bindPopup(
        `<div class="text-xs"><strong>Cycle Report (${rep.plasticType})</strong><br/>${rep.quantity} ${rep.unit} · ${rep.location}<br/>Status: ${rep.status}</div>`
      );
      marker.addTo(group);
    });

    organizations.forEach((org, idx) => {
      const coords = resolveCityCoords(org.location || '', idx + 3);
      if (!coords) return;
      const marker = L.circleMarker(coords, {
        radius: 6,
        color: '#1E3A8A',
        weight: 2,
        fillColor: '#3B82F6',
        fillOpacity: 0.85,
      });
      marker.bindPopup(
        `<div class="text-xs"><strong>${org.name}</strong><br/>${org.orgType || 'Recycler'} · ${org.location || ''}</div>`
      );
      marker.addTo(group);
    });
  }, [reports, organizations, showCycleGroundPins]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      {/* Control Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-700" />
            <h3 className="text-base font-semibold text-slate-900">
              {language === 'ar'
                ? 'مستكشف الصور الفضائية التفاعلي (NASA GIBS WMTS) وبيانات سايكل'
                : 'Interactive NASA GIBS WMTS Explorer & Cycle Ground Network'}
            </h3>
            <span className="px-2 py-0.5 text-[11px] font-mono rounded border border-amber-200 bg-amber-50 text-amber-900">
              VISUAL GIBS IMAGERY ONLY
            </span>
          </div>
          <p className="text-xs text-slate-600">
            {language === 'ar' ? activeLayer?.visualOnlyNoticeAr : activeLayer?.visualOnlyNoticeEn}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setClickAnalyzeMode((v) => !v)}
            disabled={analyzingGlobalPoint}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              clickAnalyzeMode
                ? 'border-cyan-600 bg-cyan-600 text-white'
                : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            {clickAnalyzeMode
              ? language === 'ar'
                ? 'انقر أي نقطة على الخريطة...'
                : 'Click Any Coordinate on Map...'
              : language === 'ar'
                ? 'تحليل أي نقطة عالمية بالنقر'
                : 'Click Map to Analyze Globally'}
          </button>

          <button
            type="button"
            onClick={() => setSplitCompareEnabled((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              splitCompareEnabled
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800'
            }`}
          >
            <SplitSquareHorizontal className="w-3.5 h-3.5" />
            {language === 'ar' ? 'مقارنة فترتين / طبقتين' : 'Split Compare GIBS'}
          </button>
        </div>
      </div>

      {/* GIBS Layer, Date, Opacity & Overlay Controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
        <div className="md:col-span-4 space-y-1">
          <label className="block font-semibold text-slate-700">
            {splitCompareEnabled ? 'Left / Primary NASA GIBS Layer' : 'NASA GIBS WMTS Layer'}
          </label>
          <select
            value={selectedLayerId}
            onChange={(e) => setSelectedLayerId(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-900 font-mono text-xs"
          >
            {gibsLayers.map((l) => (
              <option key={l.id} value={l.id}>
                {language === 'ar' ? l.titleAr : l.titleEn}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 space-y-1">
          <div className="flex items-center justify-between gap-1">
            <label className="block font-semibold text-slate-700">
              {splitCompareEnabled ? 'Left Date' : 'GIBS Imagery Date'}
            </label>
            {latestObservationDate && (
              <button
                type="button"
                onClick={() => {
                  setUserPinnedDate(false);
                  setPrimaryDate(latestObservationDate);
                }}
                title={`Snap to latest valid MODIS obs (${latestObservationDate})`}
                className="text-[10px] font-mono text-cyan-700 hover:underline"
              >
                {primaryDate === latestObservationDate ? 'Obs Synced' : 'Sync Obs'}
              </button>
            )}
          </div>
          <input
            type="date"
            value={primaryDate}
            min="2001-01-01"
            max={todayIso}
            onChange={(e) => {
              setUserPinnedDate(true);
              setPrimaryDate(e.target.value);
            }}
            className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white font-mono text-xs"
          />
          {activeLayer?.cadence === 'annual' && (
            <p className="text-[10px] font-mono text-amber-800 leading-tight">
              {language === 'ar'
                ? `GIBS السنوية متاحة حتى 2024-01-01 (الطبقة المعروضة: ${effectivePrimaryDate}) بينما MCD12Q1 الرقمية حتى 2025.`
                : `Annual GIBS WMTS tiles are capped at 2024-01-01 (serving ${effectivePrimaryDate}); numeric MCD12Q1 runs through 2025.`}
            </p>
          )}
        </div>

        <div className="md:col-span-2 space-y-1">
          <label className="block font-semibold text-slate-700 font-mono">
            Opacity ({Math.round(gibsOpacity * 100)}%)
          </label>
          <input
            type="range"
            min="0.15"
            max="1"
            step="0.05"
            value={gibsOpacity}
            onChange={(e) => setGibsOpacity(Number(e.target.value))}
            className="w-full accent-cyan-700 mt-1"
          />
        </div>

        <div className="md:col-span-4 flex flex-wrap items-end gap-2">
          <button
            type="button"
            onClick={() => setShowGibsLayer((v) => !v)}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded border font-mono ${
              showGibsLayer
                ? 'border-cyan-300 bg-cyan-50 text-cyan-900'
                : 'border-slate-300 bg-white text-slate-600'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            GIBS {showGibsLayer ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={() => setShowStudyRegions((v) => !v)}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded border font-mono ${
              showStudyRegions
                ? 'border-slate-800 bg-slate-800 text-white'
                : 'border-slate-300 bg-white text-slate-600'
            }`}
          >
            AOIs {showStudyRegions ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={() => setShowCycleGroundPins((v) => !v)}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded border font-mono ${
              showCycleGroundPins
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                : 'border-slate-300 bg-white text-slate-600'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Cycle Pins ({reports.length})
          </button>
        </div>

        {/* Comparison Right Pane Controls */}
        {splitCompareEnabled && (
          <div className="md:col-span-12 pt-3 border-t border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-5 space-y-1">
              <label className="block font-semibold text-slate-700">
                Right Comparison NASA GIBS Layer
              </label>
              <select
                value={compareLayerId}
                onChange={(e) => setCompareLayerId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white font-mono text-xs"
              >
                {gibsLayers.map((l) => (
                  <option key={l.id} value={l.id}>
                    {language === 'ar' ? l.titleAr : l.titleEn}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3 space-y-1">
              <label className="block font-semibold text-slate-700">Right Comparison Date</label>
              <input
                type="date"
                value={compareDate}
                min="2001-01-01"
                max={todayIso}
                onChange={(e) => setCompareDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white font-mono text-xs"
              />
            </div>
            <div className="md:col-span-4 space-y-1">
              <label className="block font-semibold text-slate-700 font-mono">
                Split Divider Position ({splitPercent}%)
              </label>
              <input
                type="range"
                min="10"
                max="90"
                step="1"
                value={splitPercent}
                onChange={(e) => setSplitPercent(Number(e.target.value))}
                className="w-full accent-slate-900"
              />
            </div>
          </div>
        )}
      </div>

      {/* Leaflet Canvas */}
      <div className="relative rounded-xl overflow-hidden border border-slate-200">
        <div
          ref={mapElRef}
          className={`w-full h-[460px] z-0 ${clickAnalyzeMode ? 'cursor-crosshair' : ''}`}
        />

        {splitCompareEnabled && showGibsLayer && (
          <div className="pointer-events-none absolute top-3 left-3 right-3 flex justify-between z-[400] text-[11px] font-mono">
            <span className="px-2.5 py-1 rounded border border-slate-300 bg-white/95 text-slate-900">
              LEFT: {activeLayer?.layerIdentifier} · {primaryDate}
            </span>
            <span className="px-2.5 py-1 rounded border border-slate-300 bg-white/95 text-slate-900">
              RIGHT: {compareLayer?.layerIdentifier} · {compareDate}
            </span>
          </div>
        )}
      </div>

      {/* Dynamic Legend & Ground Separation Legend */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {activeLayer?.legendStops?.map((stop, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-[11px] font-mono text-slate-700"
            >
              <svg width="10" height="10" viewBox="0 0 10 10">
                <rect width="10" height="10" rx="2" fill={stop.color} />
              </svg>
              {language === 'ar' ? stop.labelAr : stop.labelEn}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-600">
          <span className="inline-flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <circle cx="5" cy="5" r="4" fill="#10B981" stroke="#065F46" strokeWidth="1" />
            </svg>
            Cycle Open Reports
          </span>
          <span className="inline-flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <circle cx="5" cy="5" r="4" fill="#3B82F6" stroke="#1E3A8A" strokeWidth="1" />
            </svg>
            Registered Recyclers
          </span>
          <span className="inline-flex items-center gap-1 text-slate-500">
            <Info className="w-3.5 h-3.5" />
            Max native zoom: L{activeLayer?.maxZoom ?? 9}
          </span>
        </div>
      </div>
    </div>
  );
};
