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
// NASA EARTH INTELLIGENCE & SATELLITE OBSERVATION TYPES
// -------------------------------------------------------------

export interface NASAStudyArea {
  id: string;
  nameEn: string;
  nameAr: string;
  governorateEn: string;
  governorateAr: string;
  center: [number, number]; // [lat, lng]
  bounds: [[number, number], [number, number]];
  wrsPathRow: string; // e.g. 176/039
  modisTile: string; // e.g. h20v05
  descriptionEn: string;
  descriptionAr: string;
  environmentalProfileEn: string;
  environmentalProfileAr: string;
  cycleReportIds: string[];
  associatedOrgIds: string[];
}

export interface LandsatSurfaceBands {
  sr_b2_blue: number; // Band 2 (0.452 - 0.512 µm)
  sr_b3_green: number; // Band 3 (0.533 - 0.590 µm)
  sr_b4_red: number; // Band 4 (0.636 - 0.673 µm)
  sr_b5_nir: number; // Band 5 (0.851 - 0.879 µm)
  sr_b6_swir1: number; // Band 6 (1.566 - 1.651 µm)
  sr_b7_swir2: number; // Band 7 (2.107 - 2.294 µm)
  st_b10_thermal: number; // Band 10 Surface Temperature (Kelvin)
}

export interface LandsatObservation {
  id: string;
  studyAreaId: string;
  sensor: 'Landsat 8 OLI/TIRS' | 'Landsat 9 OLI-2/TIRS-2';
  product: 'LANDSAT/LC08/C02/T1_L2' | 'LANDSAT/LC09/C02/T1_L2';
  acquisitionDate: string;
  wrsPathRow: string;
  cloudCoverPercent: number;
  sunElevation: number;
  surfaceReflectance: LandsatSurfaceBands;
  ndvi: number; // (NIR - Red) / (NIR + Red)
  ndbi: number; // (SWIR1 - NIR) / (SWIR1 + NIR)
  ndwi: number; // (Green - NIR) / (Green + NIR)
  qaPixelValid: boolean;
  qualitySummaryEn: string;
  qualitySummaryAr: string;
}

export interface ModisVegetationRecord {
  date: string;
  dayOfYear: number;
  ndvi: number; // Normalized Difference Vegetation Index (scale 0.0001)
  evi: number; // Enhanced Vegetation Index (scale 0.0001)
  summaryQA: number; // 0 = Good, 1 = Marginal, 2 = Snow/Ice, 3 = Cloudy
  qualityLabel: 'Good' | 'Marginal' | 'Cloudy';
}

export interface EnvironmentalHotspot {
  id: string;
  nameEn: string;
  nameAr: string;
  studyAreaId: string;
  coordinates: [number, number]; // [lat, lng]
  wasteVolumeKg: number;
  reportsCount: number;
  dominantPlastics: PlasticType[];
  landsatNDBI: number; // Built-up surface index
  landsatNDVI: number; // Current vegetation index
  vegetationChange5Yr: number; // % change 2020-2024
  nearestOrgDistanceKm: number;
  nearestOrgName: string;
  collectionPriorityScore: number; // 0 to 100
  priorityLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  scoreBreakdown: {
    wasteVolumeComponent: number; // 35% weight
    urbanPressureComponent: number; // 25% weight
    logisticalGapComponent: number; // 25% weight
    ecologicalVulnerabilityComponent: number; // 15% weight
  };
  scientificRationaleEn: string;
  scientificRationaleAr: string;
}

export interface EarthIntelligencePayload {
  studyAreas: NASAStudyArea[];
  hotspots: EnvironmentalHotspot[];
  historicalBenchmarks: Record<
    string,
    {
      baseline2020: LandsatObservation;
      current2024: LandsatObservation;
      deltaNDVI: number;
      deltaNDBI: number;
      urbanExpansionPercent: number;
    }
  >;
  modisTimeSeries: Record<string, ModisVegetationRecord[]>;
  summary: {
    totalWasteMonitoredKg: number;
    activeHotspotsCount: number;
    highPriorityHotspotsCount: number;
    totalSatelliteAreaSqKm: number;
    lastSatellitePass: string;
  };
  attribution: {
    landsatSource: string;
    modisSource: string;
    gibsTileUrl: string;
    disclaimerEn: string;
    disclaimerAr: string;
  };
}
