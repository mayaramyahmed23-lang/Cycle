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
