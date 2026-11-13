export type UserRole = 'individual' | 'organization' | 'admin';

export type PlasticType = 'PET' | 'HDPE' | 'PVC' | 'LDPE' | 'PP' | 'PS' | 'Other';

export type QuantityUnit = 'kg' | 'tons' | 'pieces';

export type ReportStatus = 'Available' | 'In discussion' | 'Reserved' | 'Collected' | 'Cancelled' | 'Closed';

export type OrgType = 'Recycler' | 'Manufacturer' | 'Collector' | 'NGO' | 'Government' | 'Other';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: 'individual' | 'admin';
  phone?: string;
  location?: string;
  photoURL?: string;
  status: 'active' | 'disabled';
  createdAt?: string | number;
  updatedAt?: string | number;
}

export interface OrganizationProfile {
  uid: string;
  email: string;
  name: string;
  role: 'organization';
  orgType: OrgType;
  phone: string;
  location: string;
  description: string;
  logoURL?: string;
  status: 'active' | 'disabled';
  createdAt?: string | number;
  updatedAt?: string | number;
}

export interface PlasticReport {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorRole: 'individual';
  creatorPhone?: string;
  creatorEmail?: string;
  plasticType: PlasticType;
  quantity: number;
  unit: QuantityUnit;
  location: string;
  description: string;
  contactInfo?: string;
  imageURL?: string;
  imageUrl?: string;
  imagePath?: string;
  status: ReportStatus;
  interestedOrgIds?: string[];
  aiScanResult?: AIScanResult;
  createdAt?: any;
  updatedAt?: any;
}

export type NeedPostStatus = 'Active' | 'Fulfilled' | 'Closed';

export interface OrganizationNeedPost {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationLocation?: string;
  organizationPhone?: string;
  organizationEmail?: string;
  organizationLogoURL?: string;
  plasticType: PlasticType;
  requiredQuantity: number;
  unit: QuantityUnit;
  location: string;
  description: string;
  imageURL?: string;
  imageUrl?: string;
  imagePath?: string;
  status: NeedPostStatus;
  createdAt?: any;
  updatedAt?: any;
}

export interface MatchFactorBreakdown {
  plasticTypeScore: number;
  plasticTypeMax: number;
  plasticTypeDetailEn: string;
  plasticTypeDetailAr: string;
  quantityScore: number;
  quantityMax: number;
  quantityDetailEn: string;
  quantityDetailAr: string;
  locationScore: number;
  locationMax: number;
  locationDetailEn: string;
  locationDetailAr: string;
  statusScore: number;
  statusMax: number;
  statusDetailEn: string;
  statusDetailAr: string;
}

export interface MaterialMatch {
  id: string;
  reportId: string;
  organizationPostId: string;
  organizationId: string;
  reportCreatorId: string;
  matchScore: number;
  breakdown: MatchFactorBreakdown;
  status: 'Suggested' | 'Contacted' | 'Accepted' | 'Declined';
  createdAt?: any;
}

export interface RouteStop {
  stopNumber: number;
  reportId: string;
  creatorName?: string;
  contactInfo?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  plasticType: string;
  quantity: number;
  unit: string;
  pickupStatus: 'Pending' | 'PickedUp' | 'Skipped';
  notes?: string;
}

export interface CollectionRouteItem {
  id: string;
  reportId: string;
  report?: PlasticReport;
  order: number;
  estimatedDistanceKm: number;
  estimatedTravelTimeMin: number;
  status: 'Pending' | 'Collected' | 'Skipped';
  notes?: string;
}

export interface CollectionRoute {
  id: string;
  organizationId: string;
  organizationName: string;
  title: string;
  assignedDriver?: string;
  startLocation?: string;
  destinationLocation?: string;
  totalStops?: number;
  totalDistanceKm?: number;
  totalEstimatedDurationMin?: number;
  totalQuantityKg: number;
  stops?: RouteStop[];
  items?: CollectionRouteItem[];
  totalEstimatedDistanceKm?: number;
  totalEstimatedTimeMin?: number;
  status: 'Scheduled' | 'Planned' | 'In Progress' | 'Completed';
  createdAt?: any;
  completedAt?: any;
  updatedAt?: any;
}

export interface AIScanResult {
  plasticType: PlasticType | 'Other';
  confidence: number;
  recyclability: 'High' | 'Medium' | 'Low' | 'Specialty';
  suggestedCategoryEn: string;
  suggestedCategoryAr: string;
  tipsEn?: string;
  tipsAr?: string;
  condition?: string;
  analyzedAt: string;
}

export interface Conversation {
  id: string;
  reportId?: string;
  needPostId?: string;
  reportTitle?: string;
  reportSummary?: string;
  individualId: string;
  individualName: string;
  orgId: string;
  orgName: string;
  participantIds: string[];
  participants?: string[];
  participantDetails?: any;
  lastMessage?: string;
  lastMessageAt?: any;
  lastMessageTimestamp?: any;
  lastMessageSenderId?: string;
  lastSenderId?: string;
  unreadCount?: Record<string, number>;
  createdAt?: any;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  createdAt?: any;
}

export interface MediaItem {
  id: string;
  titleEn: string;
  titleAr: string;
  title?: string;
  type: 'image' | 'video';
  source?: 'upload' | 'url';
  category: 'demonstration' | 'educational' | 'promotional' | 'logo' | 'hero' | 'about' | 'howItWorks' | 'general';
  section?: 'hero' | 'logo' | 'about' | 'howItWorks' | 'videoShowcase' | 'general';
  url: string;
  storagePath?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  descriptionEn?: string;
  descriptionAr?: string;
  description?: string;
  featured?: boolean;
  visible?: boolean;
  order?: number;
  uploadedBy?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface AppSettings {
  appName: string;
  logoUrl?: string;
  logoType?: 'upload' | 'url' | 'default';
  logoFileName?: string;
  logoFileSize?: number;
  heroImageUrl?: string;
  heroImageType?: 'upload' | 'url';
  aboutImageUrl?: string;
  aboutImageType?: 'upload' | 'url';
  howItWorksImageUrl?: string;
  howItWorksImageType?: 'upload' | 'url';
  primaryColor: string;
  secondaryColor: string;
  heroTitleEn: string;
  heroTitleAr: string;
  heroSubtitleEn: string;
  heroSubtitleAr: string;
  problemTextEn: string;
  problemTextAr: string;
  howItWorksEn: string;
  howItWorksAr: string;
  sectionsVisibility: {
    hero: boolean;
    stats: boolean;
    problem: boolean;
    howItWorks: boolean;
    plasticGuide: boolean;
    mediaShowcase: boolean;
    cta: boolean;
  };
  demoVideos: {
    id: string;
    titleEn: string;
    titleAr: string;
    url: string;
    type: 'youtube' | 'mp4' | 'vimeo' | 'webm' | 'direct' | 'video';
    source?: 'upload' | 'url';
    category: 'demo' | 'education' | 'promo' | 'general';
    descriptionEn?: string;
    descriptionAr?: string;
    visible?: boolean;
    order?: number;
    fileName?: string;
    fileSize?: number;
    createdAt?: any;
  }[];
}

// -------------------------------------------------------------
// NASA EARTH INTELLIGENCE ENGINE TYPES (REAL NASA V061 + GIBS + APPEEARS)
// -------------------------------------------------------------

export type EpistemicTier =
  | 'raw_satellite'
  | 'processed_measurement'
  | 'calculated_indicator'
  | 'analytical_interpretation'
  | 'suggested_action';

export type DataRetrievalStatus =
  | 'verified'
  | 'pending'
  | 'insufficient_data'
  | 'requires_configuration'
  | 'error';

export interface NASADatasetCatalogEntry {
  id: 'MOD13Q1.061' | 'MCD12Q1.061' | 'MOD11A2.061' | 'NASA_GIBS' | 'APPEEARS';
  shortName: string;
  titleEn: string;
  titleAr: string;
  provider: string;
  doi?: string;
  officialUrl: string;
  spatialResolution: string;
  temporalFrequency: string;
  temporalCoverage: string;
  queriedTemporalCoverage?: string;
  bandsUsed: string[];
  scaleFactorNote: string;
  fillValueNote: string;
  qaMethod: string;
  limitationsEn: string;
  limitationsAr: string;
  isVisualOnly?: boolean;
}

export interface StudyRegionDefinition {
  id: string;
  nameEn: string;
  nameAr: string;
  governorateEn: string;
  governorateAr: string;
  countryCode: string;
  isEgyptCaseStudy: boolean;
  isCustom?: boolean;
  center: [number, number]; // [lat, lng]
  bounds: [[number, number], [number, number]];
  descriptionEn: string;
  descriptionAr: string;
  resolutionCaveatEn: string;
  resolutionCaveatAr: string;
  keywords: string[]; // For spatial matching to Cycle reports/organizations
}

export interface GIBSLayerConfig {
  id: string;
  layerIdentifier: string;
  titleEn: string;
  titleAr: string;
  category: 'true_color' | 'vegetation' | 'temperature' | 'land_cover';
  linkedProductId: string;
  tileMatrixSet: string;
  format: 'jpg' | 'png';
  maxZoom: number;
  defaultDate: string;
  cadence: 'daily' | '8day' | '16day' | 'annual';
  legendStops?: Array<{ color: string; labelEn: string; labelAr: string }>;
  visualOnlyNoticeEn: string;
  visualOnlyNoticeAr: string;
}

export interface ModisVegetationObservation {
  modisDate: string;
  date: string; // YYYY-MM-DD
  dayOfYear: number;
  ndvi: number | null; // Scaled by 0.0001
  evi: number | null; // Scaled by 0.0001
  ndviStdDev: number | null;
  eviStdDev: number | null;
  validPixels: number;
  totalPixels: number;
  pixelReliabilityMode: number | null; // 0=Good, 1=Marginal, 2=Snow/Ice, 3=Cloudy
  qualityLabel: 'Good' | 'Marginal' | 'Snow/Ice' | 'Cloudy' | 'NoData';
  strictNdvi?: number | null;
  strictEvi?: number | null;
  strictNdviStdDev?: number | null;
  strictEviStdDev?: number | null;
  strictValidPixels?: number;
  goodPixels?: number;
  marginalPixels?: number;
  cloudyPixels?: number;
  viQualityDecoded?: boolean;
  qaPassed?: boolean;
  tile: string;
}

export interface ModisLandCoverClassShare {
  classId: number;
  nameEn: string;
  nameAr: string;
  color: string;
  pixelCount: number;
  percent: number;
}

export interface ModisLandCoverYearRecord {
  modisDate: string;
  year: number;
  date: string;
  totalPixels: number;
  validPixels: number;
  qcValidPixels?: number;
  qcProcessed?: boolean;
  meanAssessmentPercent: number | null;
  dominantClassId: number | null;
  dominantClassNameEn: string;
  dominantClassNameAr: string;
  classes: ModisLandCoverClassShare[];
  tile: string;
}

export interface LandCoverTransitionEntry {
  fromClassId: number;
  fromNameEn: string;
  fromNameAr: string;
  toClassId: number;
  toNameEn: string;
  toNameAr: string;
  pixelCount: number;
  percentOfAnalyzedGrid: number;
  isChanged: boolean;
}

export interface ModisLstObservation {
  modisDate: string;
  date: string; // YYYY-MM-DD
  dayOfYear: number;
  lstDayCelsius: number | null;
  lstNightCelsius: number | null;
  diurnalRangeCelsius: number | null;
  lstDayKelvin: number | null;
  lstNightKelvin: number | null;
  dayValidPixels: number;
  nightValidPixels: number;
  totalPixels: number;
  qcDayFlag: number | null; // 0=Good, 1=Other, 2/3=Cloud/NotProduced
  qcNightFlag: number | null;
  dayQualityLabel: 'Good' | 'OtherQuality' | 'Cloud/Invalid' | 'NoData';
  nightQualityLabel: 'Good' | 'OtherQuality' | 'Cloud/Invalid' | 'NoData';
  strictLstDayCelsius?: number | null;
  strictLstNightCelsius?: number | null;
  strictDayValidPixels?: number;
  strictNightValidPixels?: number;
  dayGoodPixels?: number;
  dayOtherQualityPixels?: number;
  nightGoodPixels?: number;
  nightOtherQualityPixels?: number;
  dayLstErrorMaxK?: number | null;
  nightLstErrorMaxK?: number | null;
  clearSkyDayCountMean?: number | null;
  clearSkyNightCountMean?: number | null;
  qaPassedDay?: boolean;
  qaPassedNight?: boolean;
  tile: string;
}

export interface MannKendallTrendResult {
  status: 'computed' | 'insufficient_data';
  metricName: string;
  unit: string;
  sampleCount: number;
  rawSampleCount?: number;
  seasonalCellCount?: number;
  distinctYears?: number;
  spanYears?: number;
  dateSpanStart?: string;
  dateSpanEnd?: string;
  sStatistic: number | null;
  zScore: number | null;
  pValue: number | null;
  significanceSupported: boolean;
  sensSlopePerYear: number | null;
  sensSlopeCiLow?: number | null;
  sensSlopeCiHigh?: number | null;
  ciLevel?: number;
  sensSlopePerDecade: number | null;
  shortRecordLimitationEn?: string | null;
  shortRecordLimitationAr?: string | null;
  direction:
    | 'increasing'
    | 'decreasing'
    | 'no_significant_trend'
    | 'inconclusive_short_record'
    | 'insufficient_data';
  alpha: number;
  methodUsed:
    | 'Monthly-Aggregated Seasonal Mann-Kendall (Hirsch-Slack 1984) + Sen Slope'
    | 'Seasonal Mann-Kendall + Sen Slope'
    | 'Mann-Kendall + Sen Slope';
  interpretationEn: string;
  interpretationAr: string;
}

export interface BaselineAnomalyResult {
  status: 'computed' | 'insufficient_data';
  metricName: string;
  unit: string;
  baselinePeriodLabel: string;
  comparisonPeriodLabel: string;
  baselineMean: number | null;
  baselineStdDev: number | null;
  comparisonMean: number | null;
  absoluteDelta: number | null;
  percentChange: number | null;
  zScore: number | null;
  baselineSampleCount: number;
  comparisonSampleCount: number;
}

export interface EarthChangeStory {
  id: string;
  regionId: string;
  regionNameEn: string;
  regionNameAr: string;
  status: 'verified' | 'insufficient_data';
  titleEn: string;
  titleAr: string;
  summaryEn: string;
  summaryAr: string;
  evidenceItems: Array<{
    tier: EpistemicTier;
    datasetId: string;
    metricLabelEn: string;
    metricLabelAr: string;
    valueFormatted: string;
    dateRange: string;
  }>;
  uncertaintyNoteEn: string;
  uncertaintyNoteAr: string;
}

export interface ActionInsightMatch {
  regionId: string;
  regionNameEn: string;
  regionNameAr: string;
  center: [number, number];
  environmentalContextStatus: DataRetrievalStatus;
  environmentalIndicators: {
    latestNdvi: number | null;
    ndviTrendDirection: MannKendallTrendResult['direction'];
    latestDayLstCelsius: number | null;
    lstAnomalyCelsius: number | null;
    dominantLandCoverEn: string | null;
    dominantLandCoverAr: string | null;
    builtUpPercent: number | null;
  };
  cycleGroundData: {
    matchedReportsCount: number;
    availableReportsCount: number;
    totalReportedWeightKg: number;
    dominantPolymers: PlasticType[];
    matchedReportIds: string[];
    nearbyOrganizationsCount: number;
    nearbyOrganizations: Array<{ id: string; name: string; orgType: string; location: string }>;
  };
  compositePriorityScore: number | null; // Explicit experimental heuristic (clearly labeled)
  priorityLevel: 'High' | 'Medium' | 'Low' | 'Unranked';
  formulaDisclosureEn: string;
  formulaDisclosureAr: string;
  recommendedActionsEn: string[];
  recommendedActionsAr: string[];
}

export interface RegionAnalysisPayload {
  region: StudyRegionDefinition;
  retrievalStatus: DataRetrievalStatus;
  retrievedAt: string;
  fromCache: boolean;
  errors: Array<{ product: string; message: string }>;
  qaFilterMode: 'strict_good' | 'good_and_marginal';
  vegetation: {
    status: DataRetrievalStatus;
    productId: 'MOD13Q1.061';
    tile: string | null;
    gridRows: number;
    gridCols: number;
    cellSizeMeters: number;
    totalObservations: number;
    validObservations: number;
    excludedObservations: number;
    qaCoveragePercent: number;
    observations: ModisVegetationObservation[];
    ndviTrend: MannKendallTrendResult;
    eviTrend: MannKendallTrendResult;
    ndviAnomaly: BaselineAnomalyResult;
  };
  landCover: {
    status: DataRetrievalStatus;
    productId: 'MCD12Q1.061';
    tile: string | null;
    gridRows: number;
    gridCols: number;
    cellSizeMeters: number;
    classificationScheme: string;
    years: ModisLandCoverYearRecord[];
    baselineYear: number | null;
    latestYear: number | null;
    transitions: LandCoverTransitionEntry[];
    unchangedPercent: number | null;
    changedPercent: number | null;
    caveatEn: string;
    caveatAr: string;
  };
  temperature: {
    status: DataRetrievalStatus;
    productId: 'MOD11A2.061';
    tile: string | null;
    gridRows: number;
    gridCols: number;
    cellSizeMeters: number;
    totalObservations: number;
    validDayObservations: number;
    validNightObservations: number;
    excludedDayObservations: number;
    observations: ModisLstObservation[];
    dayLstTrend: MannKendallTrendResult;
    nightLstTrend: MannKendallTrendResult;
    dayLstAnomaly: BaselineAnomalyResult;
    surfaceVsAirNoteEn: string;
    surfaceVsAirNoteAr: string;
  };
  story: EarthChangeStory;
  provenance: {
    apiProvider: string;
    modisGridSampleCount: string;
    transformationsApplied: string[];
    epistemicBoundaries: Array<{
      tier: EpistemicTier;
      labelEn: string;
      labelAr: string;
      descriptionEn: string;
      descriptionAr: string;
    }>;
  };
}

export interface EarthIntelligenceOverviewResponse {
  regions: StudyRegionDefinition[];
  datasetCatalog: NASADatasetCatalogEntry[];
  gibsLayers: GIBSLayerConfig[];
  appeearsStatus: {
    configured: boolean;
    authMode: 'bearer_token' | 'username_password' | 'unconfigured';
    endpoint: string;
    supportedProducts: string[];
    supportedFormats: Array<'geotiff' | 'netcdf4'>;
  };
  initialRegionAnalysis: RegionAnalysisPayload;
}

export interface AppEEARSRasterFileSummary {
  fileName: string;
  format: 'geotiff' | 'netcdf4' | 'netcdf3' | 'other';
  sizeBytes: number;
  crs: string | null;
  bbox: [number, number, number, number] | null;
  dimensions: { width: number; height: number; bandsOrVariables: number } | null;
  noDataValue: number | string | null;
  scaleFactorApplied: number | null;
  addOffsetApplied: number | null;
  units: string | null;
  variables: Array<{
    name: string;
    shape: number[];
    units: string | null;
    fillValue: number | null;
    validCount: number;
    excludedFillCount: number;
    min: number | null;
    max: number | null;
    mean: number | null;
    stdDev: number | null;
  }>;
  warnings: string[];
}

export interface AppEEARSTaskRecord {
  taskId: string;
  taskName: string;
  status: 'pending' | 'queued' | 'processing' | 'done' | 'error' | 'requires_configuration';
  taskType: 'area' | 'point';
  products: Array<{ product: string; layer: string }>;
  startDate: string;
  endDate: string;
  outputFormat: 'geotiff' | 'netcdf4';
  bbox?: [number, number, number, number];
  point?: { latitude: number; longitude: number };
  createdAt: string;
  updatedAt: string;
  progressPercent?: number;
  errorMessage?: string;
  bundleFiles?: Array<{ file_id: string; file_name: string; file_size: number; file_type: string }>;
  processedSummaries?: AppEEARSRasterFileSummary[];
}

