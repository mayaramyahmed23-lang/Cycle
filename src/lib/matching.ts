import { PlasticReport, OrganizationNeedPost, MatchFactorBreakdown, PlasticType } from '../types';

/**
 * Weights configuration for calculating material match scores.
 * Easily modifiable for future business adjustments.
 */
export const MATCHING_WEIGHTS = {
  PLASTIC_TYPE_MAX: 40,
  QUANTITY_MAX: 30,
  LOCATION_MAX: 20,
  STATUS_MAX: 10,
};

/**
 * Normalizes any quantity into standard kilograms for realistic comparisons
 */
export function normalizeQuantityToKg(quantity: number, unit: string): number {
  const safeQty = Math.max(0, Number(quantity) || 0);
  const cleanUnit = (unit || 'kg').toLowerCase().trim();

  if (cleanUnit === 'tons' || cleanUnit === 'ton' || cleanUnit === 'طن') {
    return safeQty * 1000;
  }
  if (cleanUnit === 'pieces' || cleanUnit === 'piece' || cleanUnit === 'قطعة') {
    // Standard estimation: ~40 grams per rigid plastic container / bottle (0.04 kg)
    return safeQty * 0.04;
  }
  return safeQty; // default 'kg'
}

/**
 * Polymer compatibility matrix for partial matches
 */
function getPolymerCompatibility(typeA: PlasticType, typeB: PlasticType): 'exact' | 'related' | 'none' {
  if (typeA === typeB) return 'exact';

  // Compatible or blendable polymer groups in recycling facilities
  const relatedGroups = [
    new Set(['HDPE', 'LDPE']), // Polyethylenes
    new Set(['HDPE', 'PP']),   // Rigid polyolefins
    new Set(['LDPE', 'PP']),   // Polyolefins
  ];

  for (const group of relatedGroups) {
    if (group.has(typeA) && group.has(typeB)) {
      return 'related';
    }
  }

  return 'none';
}

/**
 * Geographic proximity detection for Egyptian governorates and major cities
 */
function getLocationCompatibility(locA: string, locB: string): { score: number; level: 'same' | 'nearby' | 'partial' | 'far' } {
  const a = (locA || '').toLowerCase().trim();
  const b = (locB || '').toLowerCase().trim();

  if (!a || !b) {
    return { score: 5, level: 'far' };
  }

  // Exact match
  if (a === b || a.includes(b) || b.includes(a)) {
    return { score: MATCHING_WEIGHTS.LOCATION_MAX, level: 'same' };
  }

  // Known adjacent metro clusters
  const greaterCairo = ['cairo', 'giza', 'new cairo', 'maadi', 'nasr city', 'helwan', 'october', '6th of october', 'zayed', 'shoubra', 'القاهرة', 'الجيزة', 'القاهرة الجديدة', 'المعادي', 'مدينة نصر', 'حلوان', 'أكتوبر', 'زايد', 'شبرا'];
  const alexMetro = ['alexandria', 'borg el arab', 'agami', 'smoha', 'الإسكندرية', 'برج العرب', 'العجمي', 'سموحة'];
  const deltaRegion = ['mansoura', 'tanta', 'zagazig', 'dakahlia', 'gharbia', 'المنصورة', 'طنطا', 'الزقازيق', 'الدقهلية', 'الغربية'];

  const inCluster = (list: string[]) =>
    list.some((item) => a.includes(item)) && list.some((item) => b.includes(item));

  if (inCluster(greaterCairo) || inCluster(alexMetro) || inCluster(deltaRegion)) {
    return { score: 14, level: 'nearby' };
  }

  // Partial word overlap
  const wordsA = a.split(/[\s,.-]+/);
  const wordsB = b.split(/[\s,.-]+/);
  const hasCommonWord = wordsA.some((w) => w.length > 3 && wordsB.includes(w));
  if (hasCommonWord) {
    return { score: 10, level: 'partial' };
  }

  return { score: 3, level: 'far' };
}

/**
 * Evaluates the realistic compatibility score and factor breakdown between a
 * user Plastic Report and an Organization Need Post.
 */
export function calculateMaterialMatch(
  report: PlasticReport,
  needPost: OrganizationNeedPost
): { score: number; breakdown: MatchFactorBreakdown } {
  // 1. Plastic Type Factor (max 40 pts)
  let plasticTypeScore = 0;
  let plasticTypeDetailEn = '';
  let plasticTypeDetailAr = '';

  const polymerCompat = getPolymerCompatibility(report.plasticType, needPost.plasticType);
  if (polymerCompat === 'exact') {
    plasticTypeScore = MATCHING_WEIGHTS.PLASTIC_TYPE_MAX;
    plasticTypeDetailEn = `Exact polymer match (${report.plasticType})`;
    plasticTypeDetailAr = `تطابق تام لنوع البلاستيك (${report.plasticType})`;
  } else if (polymerCompat === 'related') {
    plasticTypeScore = 18;
    plasticTypeDetailEn = `Compatible polymer category (${report.plasticType} ↔ ${needPost.plasticType})`;
    plasticTypeDetailAr = `فئة بوليمر متوافقة (${report.plasticType} ↔ ${needPost.plasticType})`;
  } else {
    plasticTypeScore = 0;
    plasticTypeDetailEn = `Different material (${report.plasticType} vs ${needPost.plasticType} required)`;
    plasticTypeDetailAr = `مادة مختلفة (${report.plasticType} مقابل المطلوب ${needPost.plasticType})`;
  }

  // 2. Quantity Compatibility (max 30 pts)
  const reportKg = normalizeQuantityToKg(report.quantity, report.unit);
  const neededKg = normalizeQuantityToKg(needPost.requiredQuantity, needPost.unit);
  let quantityScore = 0;
  let quantityDetailEn = '';
  let quantityDetailAr = '';

  if (neededKg <= 0) {
    quantityScore = 15;
    quantityDetailEn = 'Quantity unspecified';
    quantityDetailAr = 'الكمية غير محددة';
  } else {
    const ratio = reportKg / neededKg;
    if (ratio >= 1.0) {
      quantityScore = MATCHING_WEIGHTS.QUANTITY_MAX;
      quantityDetailEn = `Fully meets or exceeds requirement (${report.quantity} ${report.unit} available for ${needPost.requiredQuantity} ${needPost.unit} needed)`;
      quantityDetailAr = `يلبي أو يتجاوز الكمية المطلوبة بالكامل (${report.quantity} ${report.unit} متاح من أصل ${needPost.requiredQuantity} ${needPost.unit})`;
    } else if (ratio >= 0.6) {
      quantityScore = 22;
      quantityDetailEn = `Significantly satisfies requirement (${Math.round(ratio * 100)}% of needed material)`;
      quantityDetailAr = `يلبي نسبة كبيرة من الكمية المطلوبة (${Math.round(ratio * 100)}% من المطلوب)`;
    } else if (ratio >= 0.3) {
      quantityScore = 15;
      quantityDetailEn = `Partially satisfies requirement (${Math.round(ratio * 100)}% of needed material)`;
      quantityDetailAr = `يلبي جزءاً من الكمية المطلوبة (${Math.round(ratio * 100)}% من المطلوب)`;
    } else if (ratio >= 0.1) {
      quantityScore = 8;
      quantityDetailEn = `Small contribution towards target (${Math.round(ratio * 100)}% of needed material)`;
      quantityDetailAr = `مساهمة جزئية صغيرة (${Math.round(ratio * 100)}% من المطلوب)`;
    } else {
      quantityScore = 3;
      quantityDetailEn = `Very small volume (${Math.round(ratio * 100)}% of needed material)`;
      quantityDetailAr = `كمية محدودة مقارنة بالمطلوب (${Math.round(ratio * 100)}% من المطلوب)`;
    }
  }

  // 3. Location Proximity (max 20 pts)
  const locationCompat = getLocationCompatibility(report.location, needPost.location);
  const locationScore = locationCompat.score;
  let locationDetailEn = '';
  let locationDetailAr = '';

  if (locationCompat.level === 'same') {
    locationDetailEn = `Same city / direct pickup area (${report.location})`;
    locationDetailAr = `نفس المدينة / منطقة التجميع المباشرة (${report.location})`;
  } else if (locationCompat.level === 'nearby') {
    locationDetailEn = `Nearby metropolitan area (${report.location} ↔ ${needPost.location})`;
    locationDetailAr = `منطقة حضرية مجاورة (${report.location} ↔ ${needPost.location})`;
  } else if (locationCompat.level === 'partial') {
    locationDetailEn = `Regional proximity (${report.location} ↔ ${needPost.location})`;
    locationDetailAr = `قرب جغرافي إقليمي (${report.location} ↔ ${needPost.location})`;
  } else {
    locationDetailEn = `Longer distance transport required (${report.location} ↔ ${needPost.location})`;
    locationDetailAr = `مسافة نقل أطول (${report.location} ↔ ${needPost.location})`;
  }

  // 4. Report Availability & Status (max 10 pts)
  let statusScore = 0;
  let statusDetailEn = '';
  let statusDetailAr = '';

  if (report.status === 'Available') {
    statusScore = MATCHING_WEIGHTS.STATUS_MAX;
    statusDetailEn = 'Ready for immediate pickup and agreement';
    statusDetailAr = 'متاح وجاهز للتنسيق والاستلام الفوري';
  } else if (report.status === 'In discussion') {
    statusScore = 4;
    statusDetailEn = 'Currently in discussion with another party';
    statusDetailAr = 'قيد المناقشة حالياً مع طرف آخر';
  } else {
    statusScore = 0;
    statusDetailEn = `Report marked as ${report.status}`;
    statusDetailAr = `التقرير مصنف كـ ${report.status}`;
  }

  const rawTotal = plasticTypeScore + quantityScore + locationScore + statusScore;
  const score = Math.min(100, Math.max(0, Math.round(rawTotal)));

  const breakdown: MatchFactorBreakdown = {
    plasticTypeScore,
    plasticTypeMax: MATCHING_WEIGHTS.PLASTIC_TYPE_MAX,
    plasticTypeDetailEn,
    plasticTypeDetailAr,
    quantityScore,
    quantityMax: MATCHING_WEIGHTS.QUANTITY_MAX,
    quantityDetailEn,
    quantityDetailAr,
    locationScore,
    locationMax: MATCHING_WEIGHTS.LOCATION_MAX,
    locationDetailEn,
    locationDetailAr,
    statusScore,
    statusMax: MATCHING_WEIGHTS.STATUS_MAX,
    statusDetailEn,
    statusDetailAr,
  };

  return { score, breakdown };
}

/**
 * Finds and ranks matching reports for an organization need post.
 * Excludes closed or collected reports unless requested.
 */
export function findMatchingReportsForNeed(
  needPost: OrganizationNeedPost,
  allReports: PlasticReport[],
  minScoreThreshold = 25
): Array<{ report: PlasticReport; score: number; breakdown: MatchFactorBreakdown }> {
  return allReports
    .filter((r) => r.status !== 'Collected' && r.status !== 'Closed')
    .map((report) => {
      const { score, breakdown } = calculateMaterialMatch(report, needPost);
      return { report, score, breakdown };
    })
    .filter((item) => item.score >= minScoreThreshold)
    .sort((a, b) => b.score - a.score);
}

/**
 * Finds and ranks matching organization need posts for a user plastic report.
 */
export function findMatchingNeedsForReport(
  report: PlasticReport,
  allNeeds: OrganizationNeedPost[],
  minScoreThreshold = 25
): Array<{ needPost: OrganizationNeedPost; score: number; breakdown: MatchFactorBreakdown }> {
  return allNeeds
    .filter((n) => n.status === 'Active')
    .map((needPost) => {
      const { score, breakdown } = calculateMaterialMatch(report, needPost);
      return { needPost, score, breakdown };
    })
    .filter((item) => item.score >= minScoreThreshold)
    .sort((a, b) => b.score - a.score);
}
