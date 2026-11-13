import { fromArrayBuffer } from 'geotiff';
import * as jsfive from 'jsfive';
import { NetCDFReader } from 'netcdfjs';
import { AppEEARSRasterFileSummary } from '../../src/types';

export interface ProductScalingHint {
  productId?: string;
  layerName?: string;
}

function getDefaultScalingForLayer(hint?: ProductScalingHint): {
  scaleFactor: number | null;
  addOffset: number | null;
  fillValue: number | null;
  units: string | null;
  kelvinToCelsius: boolean;
} {
  const layer = (hint?.layerName || '').toLowerCase();
  const prod = (hint?.productId || '').toUpperCase();

  if (prod.includes('MOD13Q1') || layer.includes('ndvi') || layer.includes('evi')) {
    return {
      scaleFactor: 0.0001,
      addOffset: 0,
      fillValue: -3000,
      units: 'dimensionless index',
      kelvinToCelsius: false,
    };
  }
  if (prod.includes('MOD11A2') || layer.includes('lst_day') || layer.includes('lst_night')) {
    return {
      scaleFactor: 0.02,
      addOffset: 0,
      fillValue: 0,
      units: '°C (converted from K)',
      kelvinToCelsius: true,
    };
  }
  if (prod.includes('MCD12Q1') || layer.includes('lc_type')) {
    return {
      scaleFactor: 1,
      addOffset: 0,
      fillValue: 255,
      units: 'IGBP class ID',
      kelvinToCelsius: false,
    };
  }
  return {
    scaleFactor: null,
    addOffset: null,
    fillValue: null,
    units: null,
    kelvinToCelsius: false,
  };
}

function summarizeNumericValues(
  rawValues: ArrayLike<number>,
  fillValue: number | null,
  scaleFactor: number | null,
  addOffset: number | null,
  kelvinToCelsius: boolean
) {
  let validCount = 0;
  let excludedFillCount = 0;
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  const validScaled: number[] = [];

  for (let i = 0; i < rawValues.length; i++) {
    const raw = Number(rawValues[i]);
    if (!Number.isFinite(raw)) {
      excludedFillCount++;
      continue;
    }
    if (fillValue !== null && raw === fillValue) {
      excludedFillCount++;
      continue;
    }
    let val = raw;
    if (scaleFactor !== null) val = val * scaleFactor;
    if (addOffset !== null) val = val + addOffset;
    if (kelvinToCelsius) val = val - 273.15;

    validCount++;
    sum += val;
    if (val < min) min = val;
    if (val > max) max = val;
    validScaled.push(val);
  }

  if (validCount === 0) {
    return {
      validCount: 0,
      excludedFillCount,
      min: null,
      max: null,
      mean: null,
      stdDev: null,
    };
  }

  const mean = sum / validCount;
  let sqDiffSum = 0;
  for (let i = 0; i < validScaled.length; i++) {
    const d = validScaled[i] - mean;
    sqDiffSum += d * d;
  }
  const stdDev = Math.sqrt(sqDiffSum / validCount);

  return {
    validCount,
    excludedFillCount,
    min: Number(min.toFixed(4)),
    max: Number(max.toFixed(4)),
    mean: Number(mean.toFixed(4)),
    stdDev: Number(stdDev.toFixed(4)),
  };
}

/**
 * Parses an authentic GeoTIFF raster buffer using geotiff.js:
 * extracts CRS/GeoKeys, bounding box, GDAL_NODATA, scale/offset, and computes QA-clean statistics.
 */
export async function processGeoTiffBuffer(
  buffer: Buffer | ArrayBuffer,
  fileName: string,
  hint?: ProductScalingHint
): Promise<AppEEARSRasterFileSummary> {
  const ab =
    buffer instanceof ArrayBuffer
      ? buffer
      : buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  const warnings: string[] = [];
  const tiff = await fromArrayBuffer(ab as ArrayBuffer);
  const image = await tiff.getImage();
  const width = image.getWidth();
  const height = image.getHeight();
  const samplesPerPixel = image.getSamplesPerPixel();
  const fileDir = image.fileDirectory as Record<string, any>;
  const geoKeys = (image.getGeoKeys ? image.getGeoKeys() : {}) || {};

  let crs: string | null = null;
  if (geoKeys.ProjectedCSTypeGeoKey) {
    crs = `EPSG:${geoKeys.ProjectedCSTypeGeoKey}`;
  } else if (geoKeys.GeographicTypeGeoKey) {
    crs = `EPSG:${geoKeys.GeographicTypeGeoKey}`;
  } else if (geoKeys.GTCitationGeoKey) {
    crs = String(geoKeys.GTCitationGeoKey);
  } else {
    crs = 'CRS metadata not embedded (check GeoKeys)';
    warnings.push('No explicit EPSG GeoKey embedded in GeoTIFF header.');
  }

  let bbox: [number, number, number, number] | null = null;
  try {
    const rawBox = image.getBoundingBox();
    if (Array.isArray(rawBox) && rawBox.length === 4 && rawBox.every(Number.isFinite)) {
      bbox = [rawBox[0], rawBox[1], rawBox[2], rawBox[3]];
    }
  } catch {
    warnings.push('Bounding box / ModelTiepoint tags absent in GeoTIFF.');
  }

  const gdalNoDataRaw = fileDir.GDAL_NODATA;
  const gdalNoData =
    gdalNoDataRaw !== undefined && gdalNoDataRaw !== null && String(gdalNoDataRaw).trim() !== ''
      ? Number(String(gdalNoDataRaw).replace(/\0/g, '').trim())
      : null;

  const hintSpec = getDefaultScalingForLayer({
    productId: hint?.productId,
    layerName: hint?.layerName || fileName,
  });

  const effectiveFill =
    gdalNoData !== null && Number.isFinite(gdalNoData) ? gdalNoData : hintSpec.fillValue;

  const rasters = await image.readRasters();
  const variables: AppEEARSRasterFileSummary['variables'] = [];

  for (let b = 0; b < samplesPerPixel; b++) {
    const bandArray = Array.isArray(rasters) ? (rasters[b] as ArrayLike<number>) : (rasters as unknown as ArrayLike<number>);
    const stats = summarizeNumericValues(
      bandArray,
      effectiveFill,
      hintSpec.scaleFactor,
      hintSpec.addOffset,
      hintSpec.kelvinToCelsius
    );

    variables.push({
      name: samplesPerPixel === 1 ? hint?.layerName || fileName : `Band_${b + 1}`,
      shape: [height, width],
      units: hintSpec.units,
      fillValue: effectiveFill,
      ...stats,
    });
  }

  return {
    fileName,
    format: 'geotiff',
    sizeBytes: ab.byteLength,
    crs,
    bbox,
    dimensions: { width, height, bandsOrVariables: samplesPerPixel },
    noDataValue: effectiveFill,
    scaleFactorApplied: hintSpec.scaleFactor,
    addOffsetApplied: hintSpec.kelvinToCelsius ? -273.15 : hintSpec.addOffset,
    units: hintSpec.units,
    variables,
    warnings,
  };
}

/**
 * Parses NetCDF4 (HDF5-backed via jsfive) or NetCDF3 (via netcdfjs).
 * Reads groups, attributes (_FillValue, scale_factor, add_offset, units, crs), and computes variable stats.
 */
export async function processNetCdfBuffer(
  buffer: Buffer | ArrayBuffer,
  fileName: string,
  hint?: ProductScalingHint
): Promise<AppEEARSRasterFileSummary> {
  const ab =
    buffer instanceof ArrayBuffer
      ? buffer
      : buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  const bytes = new Uint8Array(ab as ArrayBuffer);
  const isNetCdfClassic = bytes[0] === 0x43 && bytes[1] === 0x44 && bytes[2] === 0x46; // "CDF"
  const warnings: string[] = [];

  if (isNetCdfClassic) {
    const reader = new NetCDFReader(ab as ArrayBuffer);
    const variables: AppEEARSRasterFileSummary['variables'] = [];
    let crs: string | null = null;
    let firstShape: number[] = [];

    for (const v of reader.variables) {
      const rawAttrs = (v.attributes || []) as Array<{ name: string; value: any }>;
      if (v.name === 'crs' || v.name === 'spatial_ref') {
        const attrs = Object.fromEntries(rawAttrs.map((a) => [a.name, a.value]));
        crs = String(attrs.spatial_ref || attrs.crs_wkt || attrs.grid_mapping_name || 'CF-Grid');
        continue;
      }
      if (['lat', 'lon', 'latitude', 'longitude', 'time', 'x', 'y'].includes(v.name.toLowerCase())) {
        continue;
      }

      const attrs = Object.fromEntries(rawAttrs.map((a) => [a.name, a.value]));
      const fillVal = attrs._FillValue !== undefined ? Number(attrs._FillValue) : null;
      const scaleVal = attrs.scale_factor !== undefined ? Number(attrs.scale_factor) : null;
      const offsetVal = attrs.add_offset !== undefined ? Number(attrs.add_offset) : null;
      const units = attrs.units ? String(attrs.units) : null;
      const kelvinToCelsius =
        (units || '').toLowerCase() === 'k' || (units || '').toLowerCase() === 'kelvin';

      const dataArr = reader.getDataVariable(v.name) as ArrayLike<number>;
      const stats = summarizeNumericValues(
        dataArr,
        Number.isFinite(fillVal as number) ? fillVal : null,
        Number.isFinite(scaleVal as number) ? scaleVal : null,
        Number.isFinite(offsetVal as number) ? offsetVal : null,
        kelvinToCelsius
      );

      const dims = (v.dimensions || []).map((dIdx) => reader.dimensions[dIdx]?.size || 0);
      if (firstShape.length === 0 && dims.length >= 2) firstShape = dims;

      variables.push({
        name: v.name,
        shape: dims,
        units: kelvinToCelsius ? '°C (converted from K)' : units,
        fillValue: Number.isFinite(fillVal as number) ? fillVal : null,
        ...stats,
      });
    }

    return {
      fileName,
      format: 'netcdf3',
      sizeBytes: ab.byteLength,
      crs,
      bbox: null,
      dimensions:
        firstShape.length >= 2
          ? {
              height: firstShape[firstShape.length - 2],
              width: firstShape[firstShape.length - 1],
              bandsOrVariables: variables.length,
            }
          : null,
      noDataValue: variables[0]?.fillValue ?? null,
      scaleFactorApplied: null,
      addOffsetApplied: null,
      units: variables[0]?.units ?? null,
      variables,
      warnings,
    };
  }

  // NetCDF-4 / HDF5 path via jsfive
  const hdf = new (jsfive as any).File(ab);
  const variables: AppEEARSRasterFileSummary['variables'] = [];
  let crs: string | null = null;
  let firstDims: number[] = [];

  const keys: string[] = Array.isArray(hdf.keys) ? hdf.keys : Object.keys(hdf._links || {});

  for (const key of keys) {
    try {
      const ds = hdf.get(key);
      if (!ds) continue;
      const attrs: Record<string, any> = ds.attrs || {};

      if (key === 'crs' || key === 'spatial_ref') {
        crs = String(attrs.spatial_ref || attrs.crs_wkt || attrs.grid_mapping_name || 'CF-CRS');
        continue;
      }

      if (typeof ds.value === 'undefined' || !Array.isArray(ds.shape)) continue;
      if (['lat', 'lon', 'latitude', 'longitude', 'time', 'x', 'y'].includes(key.toLowerCase())) {
        continue;
      }

      const hintSpec = getDefaultScalingForLayer({
        productId: hint?.productId,
        layerName: key,
      });

      const rawFill = attrs._FillValue !== undefined ? Number(attrs._FillValue) : hintSpec.fillValue;
      const scaleAttr = attrs.scale_factor !== undefined ? Number(attrs.scale_factor) : hintSpec.scaleFactor;
      const offsetAttr = attrs.add_offset !== undefined ? Number(attrs.add_offset) : hintSpec.addOffset;
      const unitsAttr = attrs.units ? String(attrs.units) : hintSpec.units;
      const kelvinToCelsius =
        (unitsAttr || '').toLowerCase() === 'k' ||
        (unitsAttr || '').toLowerCase() === 'kelvin' ||
        hintSpec.kelvinToCelsius;

      const flatValues = ds.value as ArrayLike<number>;
      const stats = summarizeNumericValues(
        flatValues,
        rawFill !== null && Number.isFinite(rawFill) ? rawFill : null,
        scaleAttr !== null && Number.isFinite(scaleAttr) ? scaleAttr : null,
        offsetAttr !== null && Number.isFinite(offsetAttr) ? offsetAttr : null,
        kelvinToCelsius
      );

      if (firstDims.length === 0 && ds.shape.length >= 2) {
        firstDims = ds.shape;
      }

      variables.push({
        name: key,
        shape: ds.shape,
        units: kelvinToCelsius ? '°C (converted from K)' : unitsAttr,
        fillValue: rawFill !== null && Number.isFinite(rawFill) ? rawFill : null,
        ...stats,
      });
    } catch (dsErr: any) {
      warnings.push(`Skipped variable '${key}': ${dsErr?.message || 'unsupported HDF5 datatype'}`);
    }
  }

  return {
    fileName,
    format: 'netcdf4',
    sizeBytes: ab.byteLength,
    crs: crs || 'NetCDF-4 CF Metadata',
    bbox: null,
    dimensions:
      firstDims.length >= 2
        ? {
            height: firstDims[firstDims.length - 2],
            width: firstDims[firstDims.length - 1],
            bandsOrVariables: variables.length,
          }
        : null,
    noDataValue: variables[0]?.fillValue ?? null,
    scaleFactorApplied: null,
    addOffsetApplied: null,
    units: variables[0]?.units ?? null,
    variables,
    warnings,
  };
}

export async function processRasterBuffer(
  buffer: Buffer | ArrayBuffer,
  fileName: string,
  hint?: ProductScalingHint
): Promise<AppEEARSRasterFileSummary> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.tif') || lower.endsWith('.tiff')) {
    return processGeoTiffBuffer(buffer, fileName, hint);
  }
  if (lower.endsWith('.nc') || lower.endsWith('.nc4') || lower.endsWith('.hdf') || lower.endsWith('.h5')) {
    return processNetCdfBuffer(buffer, fileName, hint);
  }
  const ab =
    buffer instanceof ArrayBuffer
      ? buffer
      : buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  return {
    fileName,
    format: 'other',
    sizeBytes: ab.byteLength,
    crs: null,
    bbox: null,
    dimensions: null,
    noDataValue: null,
    scaleFactorApplied: null,
    addOffsetApplied: null,
    units: null,
    variables: [],
    warnings: ['Unsupported non-raster bundle file (e.g., QA lookup table or JSON metadata).'],
  };
}
