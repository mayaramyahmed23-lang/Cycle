import React, { useState, useEffect } from 'react';
import {
  AppEEARSTaskRecord,
  AppEEARSRasterFileSummary,
  StudyRegionDefinition,
} from '../../types';
import {
  Database,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Send,
  FileCode2,
  ShieldAlert,
} from 'lucide-react';

interface AppeearsPipelinePanelProps {
  selectedRegion: StudyRegionDefinition;
  language: 'en' | 'ar';
}

const PRODUCT_OPTIONS = [
  { product: 'MOD13Q1.061', layer: '_250m_16_days_NDVI', label: 'MOD13Q1.061 — 250m 16-Day NDVI' },
  { product: 'MOD13Q1.061', layer: '_250m_16_days_EVI', label: 'MOD13Q1.061 — 250m 16-Day EVI' },
  { product: 'MCD12Q1.061', layer: 'LC_Type1', label: 'MCD12Q1.061 — 500m Annual IGBP LC_Type1' },
  { product: 'MOD11A2.061', layer: 'LST_Day_1km', label: 'MOD11A2.061 — 1km 8-Day LST_Day_1km' },
  { product: 'MOD11A2.061', layer: 'LST_Night_1km', label: 'MOD11A2.061 — 1km 8-Day LST_Night_1km' },
];

export const AppeearsPipelinePanel: React.FC<AppeearsPipelinePanelProps> = ({
  selectedRegion,
  language,
}) => {
  const [statusLoading, setStatusLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [authMode, setAuthMode] = useState<string>('unconfigured');
  const [tasks, setTasks] = useState<AppEEARSTaskRecord[]>([]);

  // Form state
  const [taskName, setTaskName] = useState(`Cycle_${selectedRegion.id}_Extract`);
  const [taskType, setTaskType] = useState<'area' | 'point'>('area');
  const [selectedLayers, setSelectedLayers] = useState<string[]>([
    'MOD13Q1.061|_250m_16_days_NDVI',
    'MOD11A2.061|LST_Day_1km',
  ]);
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [outputFormat, setOutputFormat] = useState<'geotiff' | 'netcdf4'>('geotiff');
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [pollingId, setPollingId] = useState<string | null>(null);

  // Direct local GeoTIFF / NetCDF4 File Inspector state
  const [inspecting, setInspecting] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [inspectedSummary, setInspectedSummary] = useState<AppEEARSRasterFileSummary | null>(null);

  useEffect(() => {
    setTaskName(`Cycle_${selectedRegion.id}_Extract`);
  }, [selectedRegion.id]);

  const loadAppeearsStatus = async () => {
    setStatusLoading(true);
    try {
      const resp = await fetch('/api/earth-intelligence/appeears/status');
      const json = await resp.json();
      if (json.success && json.data) {
        setConfigured(Boolean(json.data.configured));
        setAuthMode(json.data.authMode || 'unconfigured');
        setTasks(Array.isArray(json.data.tasks) ? json.data.tasks : []);
      }
    } catch {
      // keep safe defaults
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    loadAppeearsStatus();
  }, []);

  const toggleLayer = (key: string) => {
    setSelectedLayers((prev) =>
      prev.includes(key) ? (prev.length > 1 ? prev.filter((x) => x !== key) : prev) : [...prev, key]
    );
  };

  const handleSubmitJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMessage(null);
    try {
      const products = selectedLayers.map((k) => {
        const [product, layer] = k.split('|');
        return { product, layer };
      });
      const [[south, west], [north, east]] = selectedRegion.bounds;

      const resp = await fetch('/api/earth-intelligence/appeears/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskName,
          taskType,
          products,
          startDate,
          endDate,
          outputFormat,
          bbox: taskType === 'area' ? [west, south, east, north] : undefined,
          point:
            taskType === 'point'
              ? { latitude: selectedRegion.center[0], longitude: selectedRegion.center[1] }
              : undefined,
        }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        throw new Error(json.error || `HTTP ${resp.status}`);
      }
      const record: AppEEARSTaskRecord = json.data;
      if (record.status === 'requires_configuration') {
        setSubmitMessage(
          record.errorMessage ||
            'Server-side NASA Earthdata credentials are required for live AppEEARS submission.'
        );
      } else {
        setTasks((prev) => [record, ...prev.filter((t) => t.taskId !== record.taskId)]);
        setSubmitMessage(`Submitted AppEEARS task ${record.taskId} (${record.status}).`);
      }
    } catch (err: any) {
      setSubmitMessage(err?.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePollTask = async (taskId: string) => {
    setPollingId(taskId);
    try {
      const resp = await fetch(`/api/earth-intelligence/appeears/poll/${encodeURIComponent(taskId)}`, {
        method: 'POST',
      });
      const json = await resp.json();
      if (resp.ok && json.data) {
        setTasks((prev) => prev.map((t) => (t.taskId === taskId ? json.data : t)));
      }
    } finally {
      setPollingId(null);
    }
  };

  const handleInspectRasterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setInspecting(true);
    setInspectError(null);
    setInspectedSummary(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed reading file bytes'));
        reader.readAsDataURL(file);
      });

      const resp = await fetch('/api/earth-intelligence/appeears/inspect-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: base64,
          fileName: file.name,
        }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        throw new Error(json.error || `HTTP ${resp.status}`);
      }
      setInspectedSummary(json.data);
    } catch (err: any) {
      setInspectError(err?.message || 'Unable to inspect raster file');
    } finally {
      setInspecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-700" />
              <h3 className="text-base font-semibold text-slate-900">
                {language === 'ar'
                  ? 'مسار استخلاص NASA AppEEARS ومعالج ملفات GeoTIFF / NetCDF4'
                  : 'NASA AppEEARS Extraction & GeoTIFF / NetCDF4 Raster Processor'}
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              {language === 'ar'
                ? 'إرسال مهام استخلاص مساحية ونقطية إلى واجهة AppEEARS مع فحص فعلي لأنظمة الإحداثيات وقيم NoData ومعاملات القياس.'
                : 'Submit Area/Point requests to appeears.earthdatacloud.nasa.gov/api and inspect returned GeoTIFF / NetCDF4 bundles.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {statusLoading ? (
              <span className="px-2.5 py-1 text-xs font-mono rounded border border-slate-200 bg-slate-50 text-slate-600">
                Checking server auth...
              </span>
            ) : configured ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded border border-emerald-200 bg-emerald-50 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                EARTHDATA CONFIGURED ({authMode})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded border border-amber-300 bg-amber-50 text-amber-900">
                <ShieldAlert className="w-3.5 h-3.5" />
                REQUIRES_CONFIGURATION
              </span>
            )}
          </div>
        </div>

        {!configured && !statusLoading && (
          <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-950 leading-relaxed">
            {language === 'ar'
              ? 'ملاحظة شفافة: إرسال مهام استخلاص AppEEARS الحية يتطلب تهيئة اعتماد NASA Earthdata Login على الخادم (EARTHDATA_TOKEN أو EARTHDATA_USERNAME و EARTHDATA_PASSWORD). ومع ذلك، فإن جميع تحليلات MODIS V061 (MOD13Q1, MCD12Q1, MOD11A2) وخرائط GIBS وفاحص ملفات GeoTIFF / NetCDF4 أدناه تعمل فعلياً بنسبة 100%.'
              : 'Honest Status: Submitting new live extraction jobs to NASA AppEEARS requires server-side NASA Earthdata Login environment variables (EARTHDATA_TOKEN or EARTHDATA_USERNAME + EARTHDATA_PASSWORD). Public NASA/ORNL MODIS V061 analytics, GIBS WMTS imagery, and the GeoTIFF/NetCDF4 Raster Inspector below are active and real.'}
          </div>
        )}

        {/* Job Builder Form */}
        <form onSubmit={handleSubmitJob} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6 space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              {language === 'ar' ? 'اسم المهمة ونوع الاستخلاص' : 'Task Name & Extraction Geometry'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                required
                className="sm:col-span-2 px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white text-slate-900"
              />
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as 'area' | 'point')}
                className="px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white text-slate-900"
              >
                <option value="area">Area (GeoJSON BBox)</option>
                <option value="point">Point (Lat/Lng)</option>
              </select>
            </div>

            <div className="p-2.5 rounded border border-slate-200 bg-slate-50 text-[11px] font-mono text-slate-700 tabular-nums">
              {taskType === 'area'
                ? `BBox [${selectedRegion.bounds[0][1].toFixed(3)}, ${selectedRegion.bounds[0][0].toFixed(3)}, ${selectedRegion.bounds[1][1].toFixed(3)}, ${selectedRegion.bounds[1][0].toFixed(3)}] (EPSG:4326)`
                : `Point (${selectedRegion.center[0].toFixed(4)}, ${selectedRegion.center[1].toFixed(4)})`}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Output Format</label>
                <select
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value as 'geotiff' | 'netcdf4')}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                >
                  <option value="geotiff">GeoTIFF (.tif)</option>
                  <option value="netcdf4">NetCDF-4 (.nc)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              {language === 'ar' ? 'منتجات وطبقات ناسا المطلوبة' : 'NASA Products & Layers'}
            </label>
            <div className="space-y-1.5 border border-slate-200 rounded-lg p-3 bg-slate-50">
              {PRODUCT_OPTIONS.map((opt) => {
                const key = `${opt.product}|${opt.layer}`;
                const checked = selectedLayers.includes(key);
                return (
                  <label
                    key={key}
                    className="flex items-center gap-2 text-xs font-mono text-slate-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleLayer(key)}
                      className="rounded border-slate-300 text-cyan-700"
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting
                  ? language === 'ar'
                    ? 'جارٍ الإرسال...'
                    : 'Submitting...'
                  : language === 'ar'
                    ? 'إرسال طلب AppEEARS'
                    : 'Submit AppEEARS Request'}
              </button>
              <button
                type="button"
                onClick={loadAppeearsStatus}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>
          </div>
        </form>

        {submitMessage && (
          <div className="p-3 rounded-lg border border-slate-300 bg-slate-50 text-xs font-mono text-slate-800">
            {submitMessage}
          </div>
        )}

        {/* Saved / Polled AppEEARS Task Queue */}
        {tasks.length > 0 && (
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              AppEEARS Task Registry
            </h4>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2 px-3">Task ID</th>
                    <th className="py-2 px-3">Name / Format</th>
                    <th className="py-2 px-3">Date Range</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {tasks.map((task) => (
                    <tr key={task.taskId}>
                      <td className="py-2 px-3 text-slate-700">{task.taskId.slice(0, 14)}...</td>
                      <td className="py-2 px-3 text-slate-900">
                        {task.taskName} ({task.outputFormat})
                      </td>
                      <td className="py-2 px-3 text-slate-600 tabular-nums">
                        {task.startDate} → {task.endDate}
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-[11px]">
                          {task.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handlePollTask(task.taskId)}
                          disabled={pollingId === task.taskId}
                          className="px-2.5 py-1 rounded border border-slate-300 hover:bg-slate-100 text-slate-800"
                        >
                          {pollingId === task.taskId ? 'Polling...' : 'Poll & Parse'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Direct GeoTIFF / NetCDF4 Raster Inspector */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-cyan-700" />
              <h4 className="text-sm font-semibold text-slate-900">
                {language === 'ar'
                  ? 'فاحص ملفات GeoTIFF و NetCDF4 الحقيقي (خط معالجة AppEEARS)'
                  : 'GeoTIFF & NetCDF4 Raster File Inspector (Live Backend Pipeline)'}
              </h4>
            </div>
            <p className="text-xs text-slate-600">
              {language === 'ar'
                ? 'ارفع أي ملف GeoTIFF (.tif) أو NetCDF-4 (.nc/.nc4) تم تنزيله من AppEEARS لاستخراج نظام الإحداثيات وقيم NoData والإحصاءات الدقيقة.'
                : 'Inspect any AppEEARS GeoTIFF (.tif/.tiff) or NetCDF4 (.nc/.nc4) file to verify CRS/GeoKeys, bounding box, NoData exclusion, scaling, and valid pixel stats.'}
            </p>
          </div>
          <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-cyan-600 bg-cyan-50 text-cyan-900 hover:bg-cyan-100 cursor-pointer shrink-0">
            <Upload className="w-3.5 h-3.5" />
            <span>{inspecting ? 'Parsing raster...' : 'Select .tif / .nc File'}</span>
            <input
              type="file"
              accept=".tif,.tiff,.nc,.nc4"
              onChange={handleInspectRasterUpload}
              className="hidden"
            />
          </label>
        </div>

        {inspectError && (
          <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{inspectError}</span>
          </div>
        )}

        {inspectedSummary && (
          <div className="space-y-3 p-4 rounded-lg border border-slate-200 bg-slate-50">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
              <div>
                <div className="text-slate-500">File / Format</div>
                <div className="font-semibold text-slate-900 truncate">
                  {inspectedSummary.fileName} ({inspectedSummary.format})
                </div>
              </div>
              <div>
                <div className="text-slate-500">CRS / Projection</div>
                <div className="font-semibold text-slate-900">{inspectedSummary.crs || 'Unknown'}</div>
              </div>
              <div>
                <div className="text-slate-500">Dimensions</div>
                <div className="font-semibold text-slate-900">
                  {inspectedSummary.dimensions
                    ? `${inspectedSummary.dimensions.width}×${inspectedSummary.dimensions.height} (${inspectedSummary.dimensions.bandsOrVariables} vars)`
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-slate-500">NoData / Scale</div>
                <div className="font-semibold text-slate-900">
                  fill={String(inspectedSummary.noDataValue ?? 'none')} · ×
                  {inspectedSummary.scaleFactorApplied ?? 1}
                </div>
              </div>
            </div>

            {inspectedSummary.variables.length > 0 && (
              <div className="border border-slate-200 rounded bg-white overflow-x-auto">
                <table className="w-full text-left text-xs font-mono tabular-nums border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-1.5 px-3">Band / Variable</th>
                      <th className="py-1.5 px-3">Valid / Excluded</th>
                      <th className="py-1.5 px-3">Min</th>
                      <th className="py-1.5 px-3">Max</th>
                      <th className="py-1.5 px-3">Mean</th>
                      <th className="py-1.5 px-3">StdDev</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inspectedSummary.variables.map((v, i) => (
                      <tr key={i}>
                        <td className="py-1.5 px-3 font-semibold text-slate-900">{v.name}</td>
                        <td className="py-1.5 px-3 text-slate-700">
                          {v.validCount} valid / {v.excludedFillCount} fill
                        </td>
                        <td className="py-1.5 px-3">{v.min?.toFixed(4) ?? '—'}</td>
                        <td className="py-1.5 px-3">{v.max?.toFixed(4) ?? '—'}</td>
                        <td className="py-1.5 px-3 font-semibold text-cyan-800">{v.mean?.toFixed(4) ?? '—'}</td>
                        <td className="py-1.5 px-3">{v.stdDev?.toFixed(4) ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {inspectedSummary.warnings.length > 0 && (
              <div className="text-[11px] font-mono text-amber-800 space-y-0.5">
                {inspectedSummary.warnings.map((w, idx) => (
                  <div key={idx}>Warning: {w}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
