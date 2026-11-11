import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  NASAStudyArea,
  EnvironmentalHotspot,
  PlasticReport,
} from '../types';
import { Layers, Eye, ShieldAlert, Sparkles, MapPin, Building2, Flame } from 'lucide-react';

interface EarthIntelligenceMapProps {
  studyAreas: NASAStudyArea[];
  hotspots: EnvironmentalHotspot[];
  reports: PlasticReport[];
  selectedStudyAreaId: string;
  selectedHotspotId: string | null;
  onSelectStudyArea: (id: string) => void;
  onSelectHotspot: (id: string) => void;
  language: 'en' | 'ar';
}

export const EarthIntelligenceMap: React.FC<EarthIntelligenceMapProps> = ({
  studyAreas,
  hotspots,
  reports,
  selectedStudyAreaId,
  selectedHotspotId,
  onSelectStudyArea,
  onSelectHotspot,
  language,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer Visibility State
  const [activeBaseLayer, setActiveBaseLayer] = useState<'satellite' | 'street' | 'nasa-gibs'>('satellite');
  const [showHotspots, setShowHotspots] = useState(true);
  const [showReports, setShowReports] = useState(true);
  const [showStudyAreas, setShowStudyAreas] = useState(true);
  const [showHeatZones, setShowHeatZones] = useState(true);

  // Tile layers refs
  const baseLayersRef = useRef<{ [key: string]: L.TileLayer }>({});
  const overlayLayersRef = useRef<{
    studyAreas: L.LayerGroup;
    hotspots: L.LayerGroup;
    reports: L.LayerGroup;
    heatZones: L.LayerGroup;
  }>({
    studyAreas: L.layerGroup(),
    hotspots: L.layerGroup(),
    reports: L.layerGroup(),
    heatZones: L.layerGroup(),
  });

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center on Egypt: Cairo / Nile Delta corridor
    const map = L.map(mapContainerRef.current, {
      center: [30.15, 31.4],
      zoom: 8,
      minZoom: 6,
      maxZoom: 17,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // 1. High-Resolution Satellite Basemap (Esri World Imagery)
    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics, USDA, USGS',
        maxZoom: 18,
      }
    );

    // 2. OpenStreetMap Standard
    const streetLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }
    );

    // 3. NASA GIBS MODIS Terra TrueColor
    // Uses standardized date fallback for clean satellite pass
    const nasaGibsLayer = L.tileLayer(
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2024-08-01/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
      {
        attribution: 'Imagery &copy; NASA EOSDIS GIBS / Worldview',
        maxZoom: 9,
      }
    );

    baseLayersRef.current = {
      satellite: satelliteLayer,
      street: streetLayer,
      'nasa-gibs': nasaGibsLayer,
    };

    // Attach default base
    satelliteLayer.addTo(map);

    // Attach overlay layer groups
    overlayLayersRef.current.studyAreas.addTo(map);
    overlayLayersRef.current.hotspots.addTo(map);
    overlayLayersRef.current.reports.addTo(map);
    overlayLayersRef.current.heatZones.addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Base Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    Object.values(baseLayersRef.current).forEach((layer) => {
      if (map.hasLayer(layer)) map.removeLayer(layer);
    });

    const targetLayer = baseLayersRef.current[activeBaseLayer];
    if (targetLayer) {
      targetLayer.addTo(map);
    }
  }, [activeBaseLayer]);

  // Render Overlays: Study Areas, Hotspots, Reports, Heat Zones
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 1. Clear previous overlays
    overlayLayersRef.current.studyAreas.clearLayers();
    overlayLayersRef.current.hotspots.clearLayers();
    overlayLayersRef.current.reports.clearLayers();
    overlayLayersRef.current.heatZones.clearLayers();

    // 2. Draw Study Areas
    if (showStudyAreas) {
      studyAreas.forEach((area) => {
        const isSelected = area.id === selectedStudyAreaId;
        const rect = L.rectangle(area.bounds, {
          color: isSelected ? '#06b6d4' : '#38bdf8',
          weight: isSelected ? 3 : 1.5,
          dashArray: isSelected ? undefined : '4, 4',
          fillColor: isSelected ? '#06b6d4' : '#0284c7',
          fillOpacity: isSelected ? 0.22 : 0.08,
        });

        rect.on('click', () => {
          onSelectStudyArea(area.id);
        });

        rect.bindTooltip(
          `<strong>${language === 'ar' ? area.nameAr : area.nameEn}</strong><br/><span style="font-size:11px;color:#0e7490">WRS: ${area.wrsPathRow} | MODIS: ${area.modisTile}</span>`,
          { sticky: true }
        );

        rect.addTo(overlayLayersRef.current.studyAreas);
      });
    }

    // 3. Draw Heat Zones / Urban Pressure Buffers
    if (showHeatZones) {
      hotspots.forEach((h) => {
        const radius = Math.max(1200, Math.min(4500, h.wasteVolumeKg * 0.4));
        const color = h.priorityLevel === 'Critical' ? '#ef4444' : h.priorityLevel === 'High' ? '#f97316' : '#eab308';
        const circle = L.circle(h.coordinates, {
          radius: radius,
          color: color,
          weight: 1,
          opacity: 0.6,
          fillColor: color,
          fillOpacity: 0.18,
        });
        circle.addTo(overlayLayersRef.current.heatZones);
      });
    }

    // 4. Draw Hotspots with Pulsing Badges
    if (showHotspots) {
      hotspots.forEach((h) => {
        const isSelected = h.id === selectedHotspotId;
        const colorClass =
          h.priorityLevel === 'Critical'
            ? 'bg-rose-600 text-white border-rose-300'
            : h.priorityLevel === 'High'
            ? 'bg-amber-600 text-white border-amber-300'
            : 'bg-yellow-500 text-stone-900 border-yellow-200';

        const customIcon = L.divIcon({
          className: 'custom-hotspot-pin',
          html: `
            <div class="relative flex items-center justify-center cursor-pointer ${isSelected ? 'scale-125 z-50' : 'hover:scale-110'} transition-transform">
              <span class="absolute -inset-1 rounded-full ${h.priorityLevel === 'Critical' ? 'bg-rose-500/40 animate-ping' : ''}"></span>
              <div class="relative flex items-center gap-1 px-2 py-1 rounded-full border-2 ${colorClass} shadow-lg text-[11px] font-bold">
                <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <span>${h.collectionPriorityScore.toFixed(0)}</span>
              </div>
            </div>
          `,
          iconSize: [40, 24],
          iconAnchor: [20, 12],
        });

        const marker = L.marker(h.coordinates, { icon: customIcon });

        marker.on('click', () => {
          onSelectHotspot(h.id);
          onSelectStudyArea(h.studyAreaId);
        });

        const popupContent = `
          <div style="font-family: inherit; font-size: 13px; min-width: 200px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
              <strong style="color:#0f172a; font-size: 14px;">${language === 'ar' ? h.nameAr : h.nameEn}</strong>
              <span style="font-weight:700; font-size: 11px; padding: 2px 6px; border-radius: 9999px; background:${h.priorityLevel === 'Critical' ? '#fee2e2; color:#b91c1c' : '#fef3c7; color:#b45309'}">
                ${h.priorityLevel}
              </span>
            </div>
            <div style="color:#475569; margin-bottom: 4px;">
              <strong>${language === 'ar' ? 'الكمية المقدرة:' : 'Waste Volume:'}</strong> ${(h.wasteVolumeKg).toLocaleString()} kg
            </div>
            <div style="color:#475569; margin-bottom: 4px;">
              <strong>${language === 'ar' ? 'مؤشر أولوية الجمع:' : 'Priority Score:'}</strong> ${h.collectionPriorityScore.toFixed(1)} / 100
            </div>
            <div style="color:#475569; margin-bottom: 6px;">
              <strong>${language === 'ar' ? 'مؤشر الكتلة NDBI:' : 'Landsat NDBI:'}</strong> ${h.landsatNDBI > 0 ? '+' : ''}${h.landsatNDBI}
            </div>
            <div style="font-size: 11px; color:#0284c7; font-weight:600; cursor:pointer;">
              ${language === 'ar' ? 'انقر لعرض التحليل العلمي الكامل ←' : 'Click to view full scientific analysis →'}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.addTo(overlayLayersRef.current.hotspots);
      });
    }

    // 5. Draw Real Cycle Community Reports
    if (showReports) {
      reports.forEach((r) => {
        // Fallback coordinates based on known Cycle report locations
        let lat = 30.0444;
        let lng = 31.2357;
        const locLower = (r.location || '').toLowerCase();
        if (locLower.includes('new capital') || locLower.includes('العاصمة')) {
          lat = 30.0131;
          lng = 31.7483;
        } else if (locLower.includes('الزقازيق') || locLower.includes('zagazig')) {
          lat = 30.5877;
          lng = 31.502;
        } else if (locLower.includes('ramadan') || locLower.includes('العاشر')) {
          lat = 30.306;
          lng = 31.741;
        } else if (locLower.includes('alexandria') || locLower.includes('إسكندرية')) {
          lat = 31.2001;
          lng = 29.9187;
        } else if (locLower.includes('monofia') || locLower.includes('منوفية')) {
          lat = 30.5972;
          lng = 30.9876;
        } else {
          // Slight jitter around central Cairo
          lat = 30.0444 + ((r.id.charCodeAt(0) % 10) - 5) * 0.015;
          lng = 31.2357 + ((r.id.charCodeAt(1) % 10) - 5) * 0.015;
        }

        const reportIcon = L.divIcon({
          className: 'cycle-report-marker',
          html: `
            <div class="w-6 h-6 rounded-full bg-emerald-600 border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-extrabold hover:scale-125 transition-transform">
              ${r.plasticType.substring(0, 2)}
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const reportMarker = L.marker([lat, lng], { icon: reportIcon });
        reportMarker.bindPopup(`
          <div style="font-size:12px;">
            <strong style="color:#065f46;">Cycle Report: ${r.plasticType}</strong><br/>
            <span>${r.quantity} ${r.unit}</span> &bull; <em>${r.status}</em><br/>
            <span style="color:#64748b;">${r.location}</span>
          </div>
        `);
        reportMarker.addTo(overlayLayersRef.current.reports);
      });
    }
  }, [
    studyAreas,
    hotspots,
    reports,
    selectedStudyAreaId,
    selectedHotspotId,
    showStudyAreas,
    showHotspots,
    showReports,
    showHeatZones,
    language,
    onSelectStudyArea,
    onSelectHotspot,
  ]);

  // Center on Selected Study Area
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedStudyAreaId) return;

    const area = studyAreas.find((a) => a.id === selectedStudyAreaId);
    if (area) {
      map.flyTo(area.center, 10, { duration: 1.2 });
    }
  }, [selectedStudyAreaId, studyAreas]);

  // Center on Selected Hotspot
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedHotspotId) return;

    const hotspot = hotspots.find((h) => h.id === selectedHotspotId);
    if (hotspot) {
      map.flyTo(hotspot.coordinates, 12, { duration: 1.2 });
    }
  }, [selectedHotspotId, hotspots]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-stone-300 shadow-md bg-stone-900">
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-[540px] sm:h-[600px] z-0" />

      {/* Top Floating Controls Bar */}
      <div className="absolute top-3 left-3 right-3 sm:right-auto z-10 flex flex-wrap gap-2">
        {/* Base Layer Switcher */}
        <div className="bg-stone-900/90 backdrop-blur-md rounded-xl p-1.5 border border-stone-700/80 shadow-lg flex items-center gap-1 text-xs text-white">
          <Layers className="w-4 h-4 text-cyan-400 ml-1 mr-1" />
          <button
            onClick={() => setActiveBaseLayer('satellite')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              activeBaseLayer === 'satellite'
                ? 'bg-cyan-600 text-white shadow-xs font-semibold'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            {language === 'ar' ? 'قمر صناعي (Esri)' : 'Satellite (Esri)'}
          </button>
          <button
            onClick={() => setActiveBaseLayer('nasa-gibs')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              activeBaseLayer === 'nasa-gibs'
                ? 'bg-cyan-600 text-white shadow-xs font-semibold'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            {language === 'ar' ? 'ناسا موديس (GIBS)' : 'NASA MODIS (GIBS)'}
          </button>
          <button
            onClick={() => setActiveBaseLayer('street')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
              activeBaseLayer === 'street'
                ? 'bg-cyan-600 text-white shadow-xs font-semibold'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            {language === 'ar' ? 'خريطة شوارع' : 'Street Map'}
          </button>
        </div>

        {/* Overlays Toggles */}
        <div className="bg-stone-900/90 backdrop-blur-md rounded-xl p-1.5 border border-stone-700/80 shadow-lg flex items-center gap-2 text-xs text-stone-300">
          <label className="flex items-center gap-1.5 cursor-pointer px-1.5 hover:text-white">
            <input
              type="checkbox"
              checked={showHotspots}
              onChange={(e) => setShowHotspots(e.target.checked)}
              className="rounded-sm text-cyan-500 focus:ring-0"
            />
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              {language === 'ar' ? 'بؤر الخطر' : 'Hotspots'}
            </span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer px-1.5 hover:text-white">
            <input
              type="checkbox"
              checked={showReports}
              onChange={(e) => setShowReports(e.target.checked)}
              className="rounded-sm text-emerald-500 focus:ring-0"
            />
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              {language === 'ar' ? 'بلاغات سايكل' : 'Cycle Reports'}
            </span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer px-1.5 hover:text-white">
            <input
              type="checkbox"
              checked={showStudyAreas}
              onChange={(e) => setShowStudyAreas(e.target.checked)}
              className="rounded-sm text-cyan-500 focus:ring-0"
            />
            <span>{language === 'ar' ? 'نطاقات لاندسات' : 'Landsat Footprints'}</span>
          </label>
        </div>
      </div>

      {/* Legend Badge at Bottom Left */}
      <div className="absolute bottom-3 left-3 z-10 bg-stone-950/90 backdrop-blur-md border border-stone-800 rounded-xl p-3 text-white text-xs shadow-xl hidden sm:block max-w-xs">
        <div className="font-semibold text-cyan-400 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'دليل طبقات الرصد الفضائي' : 'Satellite Observation Legend'}</span>
        </div>
        <div className="space-y-1.5 text-[11px] text-stone-300">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-600 border border-rose-300"></span>
            <span>{language === 'ar' ? 'أولوية حرجة (Score > 85)' : 'Critical Priority (Score > 85)'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-600 border border-amber-300"></span>
            <span>{language === 'ar' ? 'أولوية عالية (Score 75 - 85)' : 'High Priority (Score 75 - 85)'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-600 border border-white"></span>
            <span>{language === 'ar' ? 'بلاغات مخلفات بلاستيكية مجتمعية' : 'Cycle Community Waste Report'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-xs border-2 border-dashed border-cyan-400 bg-cyan-500/20"></span>
            <span>{language === 'ar' ? 'بصمة قمر لاندسات 8/9 (30 متراً)' : 'Landsat 8/9 Scene Footprint (30m)'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
