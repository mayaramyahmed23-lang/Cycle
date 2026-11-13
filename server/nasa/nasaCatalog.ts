import {
  NASADatasetCatalogEntry,
  StudyRegionDefinition,
  GIBSLayerConfig,
} from '../../src/types';

/**
 * Official NASA LP DAAC / ESDIS Catalog & Metadata
 * Strictly aligned with official product specifications.
 */
export const NASA_DATASET_CATALOG: NASADatasetCatalogEntry[] = [
  {
    id: 'MOD13Q1.061',
    shortName: 'MODIS MOD13Q1 V061',
    titleEn: 'MODIS/Terra Vegetation Indices 16-Day L3 Global 250m SIN Grid V061',
    titleAr: 'مؤشرات الغطاء النباتي من ناسا موديس (MOD13Q1 V061) بدقة 250 متراً كل 16 يوماً',
    provider: 'NASA LP DAAC (USGS EROS / ORNL DAAC Subset API)',
    doi: '10.5067/MODIS/MOD13Q1.061',
    officialUrl: 'https://doi.org/10.5067/MODIS/MOD13Q1.061',
    spatialResolution: '250 meters (native SIN grid ~231.66 m)',
    temporalFrequency: '16-Day composite',
    temporalCoverage: '2000-02-18 to Present (Collection 6.1 Archive)',
    queriedTemporalCoverage: '2022-01-01 to Latest Available Composite (~4.8 yr)',
    bandsUsed: [
      '250m_16_days_NDVI',
      '250m_16_days_EVI',
      '250m_16_days_pixel_reliability',
      '250m_16_days_VI_Quality',
    ],
    scaleFactorNote: 'Raw stored integer × 0.0001 (Valid scaled range: -0.2000 to +1.0000)',
    fillValueNote: 'Fill value -3000 (NDVI/EVI) and missing/invalid pixel reliability (-1/null) excluded before aggregation.',
    qaMethod:
      'Pixel Reliability (0=Good, 1=Marginal, 2=Snow/Ice, 3=Cloudy) + VI_Quality bitmask (MODLAND, mixed/adjacent cloud, snow/ice, shadow, high aerosol). Strict mode isolates QA=0 pixels only.',
    limitationsEn:
      '250m pixels mix sub-pixel features in fragmented urban/peri-urban zones and cannot detect individual waste piles or small urban parks (<250m). Seasonal crop cycles strongly influence NDVI/EVI.',
    limitationsAr:
      'تدمج وحدات البكسل بدقة 250 متراً المعالم المتداخلة في المناطق الحضرية وشبه الحضرية ولا ترصد أكوام المخلفات الفردية. كما تؤثر دورات المحاصيل الموسمية بشدة على قيم NDVI و EVI.',
  },
  {
    id: 'MCD12Q1.061',
    shortName: 'MODIS MCD12Q1 V061',
    titleEn: 'MODIS/Terra+Aqua Land Cover Type Yearly L3 Global 500m SIN Grid V061',
    titleAr: 'تصنيف الغطاء الأرضي السنوي من ناسا موديس (MCD12Q1 V061) بدقة 500 متر',
    provider: 'NASA LP DAAC (ORNL DAAC Subset API / AppEEARS)',
    doi: '10.5067/MODIS/MCD12Q1.061',
    officialUrl: 'https://doi.org/10.5067/MODIS/MCD12Q1.061',
    spatialResolution: '500 meters (native SIN grid ~463.31 m)',
    temporalFrequency: 'Annual (Yearly L3)',
    temporalCoverage: '2001-01-01 to 2025-01-01 (Collection 6.1 Archive)',
    queriedTemporalCoverage: '2016-01-01 to 2025-01-01 (10 Annual Epochs)',
    bandsUsed: ['LC_Type1 (IGBP 17-class)', 'LC_Prop1_Assessment', 'QC'],
    scaleFactorNote: 'Categorical integer classes 1–17 (IGBP LC_Type1); Assessment 0–100%.',
    fillValueNote: 'Fill value 255 and QC fill pixels excluded from class distribution and transition matrices.',
    qaMethod: 'QC fill masking and LC_Prop1_Assessment classification confidence score (0–100%).',
    limitationsEn:
      '500m resolution may miss narrow corridors, new roads, or small construction blocks. Transition matrices reflect MODIS IGBP class changes, not all of which represent urban expansion (e.g., barren-to-cropland reclamation or grassland variation). Annual product lags real-time current-year construction.',
    limitationsAr:
      'دقة 500 متر قد لا ترصد الطرق الضيقة أو التجمعات الصغيرة. تعكس مصفوفة التحول تغيرات تصنيف IGBP ولا يمثل كل تغير توسعاً عمرانياً (مثل استصلاح الصحراء إلى أراضٍ زراعية).',
  },
  {
    id: 'MOD11A2.061',
    shortName: 'MODIS MOD11A2 V061',
    titleEn: 'MODIS/Terra Land Surface Temperature/Emissivity 8-Day L3 Global 1km V061',
    titleAr: 'درجة حرارة سطح الأرض الليلية والنهارية من ناسا موديس (MOD11A2 V061) بدقة 1 كم كل 8 أيام',
    provider: 'NASA LP DAAC (USGS / ORNL DAAC Subset API)',
    doi: '10.5067/MODIS/MOD11A2.061',
    officialUrl: 'https://lpdaac.usgs.gov/products/mod11a2v061/',
    spatialResolution: '1 kilometer (~926.63 m)',
    temporalFrequency: '8-Day composite (clear-sky average)',
    temporalCoverage: '2000-02-18 to Present (Collection 6.1 Archive)',
    queriedTemporalCoverage: '2023-01-01 to Latest Available Composite (~3.8 yr)',
    bandsUsed: ['LST_Day_1km', 'LST_Night_1km', 'QC_Day', 'QC_Night', 'Clear_sky_days', 'Clear_sky_nights'],
    scaleFactorNote: 'Temperature (K) = Raw DN × 0.02; Celsius (°C) = (Raw DN × 0.02) - 273.15.',
    fillValueNote: 'Fill value 0, DN < 7500, and missing/cloudy QC bits excluded prior to Kelvin/Celsius conversion.',
    qaMethod:
      'QC_Day/QC_Night mandatory bits (0–1: 0=Good, 1=OtherQuality, 2/3=Cloud), LST error bits (6–7: strict <=2K, standard <=3K), Clear_sky_days/nights bitmasks, and conservative modal scene QA.',
    limitationsEn:
      'IMPORTANT: Satellite Land Surface Temperature (LST) measures skin/radiometric surface temperature under clear-sky conditions (~10:30 AM / 10:30 PM local solar overpass), NOT ambient 2-meter air temperature measured by weather stations. 1km pixels represent broad thermal regimes.',
    limitationsAr:
      'تنبيه علمي: تقيس بيانات MOD11A2 درجة حرارة السطح الإشعاعية (Skin Surface Temperature) وقت مرور القمر تحت سماء صافية، وليست درجة حرارة الهواء المقاسة في محطات الأرصاد على ارتفاع مترين.',
  },
  {
    id: 'NASA_GIBS',
    shortName: 'NASA GIBS WMTS',
    titleEn: 'NASA Global Imagery Browse Services (GIBS / Worldview)',
    titleAr: 'خدمات تصفح الصور الفضائية العالمية من ناسا (GIBS WMTS)',
    provider: 'NASA EOSDIS (ESDIS Project)',
    officialUrl: 'https://www.earthdata.nasa.gov/data/tools/gibs',
    spatialResolution: 'Tiled Web Mercator (EPSG:3857) ~250m to ~1km visual pyramids',
    temporalFrequency: 'Daily / 8-Day / 16-Day / Annual depending on layer',
    temporalCoverage: '2000 to Near Real-Time',
    bandsUsed: [
      'MODIS_Terra_CorrectedReflectance_TrueColor',
      'MODIS_Terra_L3_NDVI_16Day',
      'MODIS_Terra_L3_EVI_16Day',
      'MODIS_Combined_L3_IGBP_Land_Cover_Type_Annual',
      'MODIS_Terra_L3_Land_Surface_Temp_8Day_Day',
      'MODIS_Terra_L3_Land_Surface_Temp_8Day_Night',
    ],
    scaleFactorNote: 'Pre-rendered RGB/indexed cartographic map tiles (PNG/JPEG).',
    fillValueNote: 'Transparent pixels indicate no-data, water masks (where applicable), or cloud/swath gaps.',
    qaMethod: 'Uses NASA best-available science product rendering.',
    limitationsEn:
      'VISUAL IMAGERY ONLY: GIBS WMTS tiles are pre-rendered visualizations for spatial context and comparison. Quantitative statistics, trends, and pixel counts in Cycle come exclusively from numeric MOD13Q1, MCD12Q1, MOD11A2, or AppEEARS rasters — never from map tile pixel colors.',
    limitationsAr:
      'طبقة عرض مرئي فقط: بلاطات GIBS مخصصة للاستكشاف البصري والمقارنة المكانية، ولا تُستخدم ألوان الصور لاستخلاص أرقام كمية؛ جميع الحسابات العلمية تأتي من البيانات الرقمية الأصلية.',
    isVisualOnly: true,
  },
  {
    id: 'APPEEARS',
    shortName: 'NASA AppEEARS API',
    titleEn: 'Application for Extracting and Exploring Analysis Ready Samples (AppEEARS)',
    titleAr: 'بوابة استخلاص العينات الجاهزة للتحليل من ناسا (AppEEARS)',
    provider: 'NASA LP DAAC / Earthdata Cloud',
    officialUrl: 'https://appeears.earthdatacloud.nasa.gov/',
    spatialResolution: 'Native product resolution (250m / 500m / 1km)',
    temporalFrequency: 'On-demand user-specified date ranges',
    temporalCoverage: 'Full LP DAAC archive',
    bandsUsed: ['Area & Point extraction requests for MOD13Q1.061, MCD12Q1.061, MOD11A2.061'],
    scaleFactorNote: 'Preserves native product scaling & QA layers in GeoTIFF or NetCDF4 bundles.',
    fillValueNote: 'Preserves native _FillValue and GDAL_NODATA metadata inspected during processing.',
    qaMethod: 'Includes product QA raster bands alongside science bands.',
    limitationsEn:
      'Asynchronous area/point extraction requires server-side NASA Earthdata authentication to submit live jobs and download bundles.',
    limitationsAr:
      'يتطلب إرسال طلبات الاستخلاص المساحي المباشرة عبر AppEEARS تهيئة اعتماد دخول NASA Earthdata على الخادم.',
  },
];

/**
 * Official IGBP Land Cover Type 1 Classes (MCD12Q1 LC_Type1)
 */
export const IGBP_LAND_COVER_CLASSES: Record<
  number,
  { nameEn: string; nameAr: string; color: string; group: 'natural' | 'cropland' | 'urban' | 'barren' | 'water' }
> = {
  1: { nameEn: 'Evergreen Needleleaf Forests', nameAr: 'غابات صنوبرية دائمة الخضرة', color: '#05450a', group: 'natural' },
  2: { nameEn: 'Evergreen Broadleaf Forests', nameAr: 'غابات عريضة الأوراق دائمة الخضرة', color: '#086a10', group: 'natural' },
  3: { nameEn: 'Deciduous Needleleaf Forests', nameAr: 'غابات صنوبرية نفضية', color: '#54a708', group: 'natural' },
  4: { nameEn: 'Deciduous Broadleaf Forests', nameAr: 'غابات عريضة الأوراق نفضية', color: '#78d203', group: 'natural' },
  5: { nameEn: 'Mixed Forests', nameAr: 'غابات مختلطة', color: '#009900', group: 'natural' },
  6: { nameEn: 'Closed Shrublands', nameAr: 'أراضٍ شجيرية كثيفة', color: '#c6b044', group: 'natural' },
  7: { nameEn: 'Open Shrublands', nameAr: 'أراضٍ شجيرية مفتوحة', color: '#dcd159', group: 'natural' },
  8: { nameEn: 'Woody Savannas', nameAr: 'سافانا مشجرة', color: '#dade48', group: 'natural' },
  9: { nameEn: 'Savannas', nameAr: 'سافانا', color: '#fbff13', group: 'natural' },
  10: { nameEn: 'Grasslands', nameAr: 'مراعٍ وأراضٍ عشبية', color: '#b6ff05', group: 'natural' },
  11: { nameEn: 'Permanent Wetlands', nameAr: 'أراضٍ رطبة دائمة', color: '#27ff87', group: 'natural' },
  12: { nameEn: 'Croplands', nameAr: 'أراضٍ زراعية', color: '#c24f44', group: 'cropland' },
  13: { nameEn: 'Urban and Built-up Lands', nameAr: 'مناطق حضرية ومبنية', color: '#a5a5a5', group: 'urban' },
  14: { nameEn: 'Cropland/Natural Vegetation Mosaics', nameAr: 'فسيفساء زراعية ونباتية', color: '#ff6d4c', group: 'cropland' },
  15: { nameEn: 'Permanent Snow and Ice', nameAr: 'ثلوج وجليد دائم', color: '#69fff8', group: 'water' },
  16: { nameEn: 'Barren (Desert / Sparse Vegetation)', nameAr: 'أراضٍ جرداء / صحراء', color: '#d4b483', group: 'barren' },
  17: { nameEn: 'Water Bodies', nameAr: 'مسطحات مائية', color: '#1c0dff', group: 'water' },
};

/**
 * Curated Egypt Case Study Regions (Governorates & Key Ecological/Logistics Zones)
 * Global custom coordinates are also supported dynamically via /api/earth-intelligence/analyze.
 */
export const EGYPT_STUDY_REGIONS: StudyRegionDefinition[] = [
  {
    id: 'cairo-urban-core',
    nameEn: 'Greater Cairo & Giza Urban Core',
    nameAr: 'نطاق القاهرة الكبرى والجيزة الحضري',
    governorateEn: 'Cairo / Giza',
    governorateAr: 'القاهرة / الجيزة',
    countryCode: 'EG',
    isEgyptCaseStudy: true,
    center: [30.0444, 31.2357],
    bounds: [
      [29.95, 31.14],
      [30.14, 31.34],
    ],
    descriptionEn:
      'High-density metropolitan core along the Nile corridor with intense consumer packaging flow and persistent surface urban heat island dynamics.',
    descriptionAr:
      'قلب العاصمة الحضري الكثيف على محور النيل، مع تدفقات مرتفعة للعبوات الاستهلاكية وظاهرة الجزيرة الحرارية الحضرية.',
    resolutionCaveatEn:
      '250m–1km MODIS grids aggregate dense street canyons, Nile water edges, and green islands into mixed pixels.',
    resolutionCaveatAr:
      'تدمج خلايا موديس (250م–1كم) الشوارع الضيقة وحواف النيل والحدائق داخل خلية واحدة مختلطة.',
    keywords: ['cairo', 'giza', 'maadi', 'nasr city', 'shoubra', 'helwan', 'القاهرة', 'الجيزة', 'المعادي', 'مدينة نصر', 'شبرا', 'حلوان'],
  },
  {
    id: 'new-capital-east',
    nameEn: 'New Capital & East Cairo Corridor',
    nameAr: 'العاصمة الإدارية الجديدة وشرق القاهرة',
    governorateEn: 'Cairo (East)',
    governorateAr: 'شرق القاهرة',
    countryCode: 'EG',
    isEgyptCaseStudy: true,
    center: [30.0131, 31.7483],
    bounds: [
      [29.92, 31.64],
      [30.11, 31.86],
    ],
    descriptionEn:
      'Arid plateau undergoing rapid infrastructure, paved transport, and urban development adjacent to major Cycle bulk plastic supply clusters.',
    descriptionAr:
      'نطاق صحراوي يشهد تطوراً سريعاً في البنية التحتية والطرق والعمران مع تمركز بلاغات كميات بلاستيكية كبيرة في سايكل.',
    resolutionCaveatEn:
      'MCD12Q1 (500m annual) captures large-scale desert-to-urban transitions with a 1-year release lag; narrow road strips may classify as Barren.',
    resolutionCaveatAr:
      'يرصد منتج MCD12Q1 (500م سنوياً) التحولات الكبرى بتأخر زمني عاماً واحداً، وقد تصنف الشرائط الإنشائية الضيقة كأرض جرداء.',
    keywords: ['new capital', 'new cairo', 'badr', 'obour', 'shorouk', 'العاصمة', 'القاهرة الجديدة', 'بدر', 'العبور', 'الشروق'],
  },
  {
    id: 'ramadan-10-industrial',
    nameEn: '10th of Ramadan Industrial Zone',
    nameAr: 'المنطقة الصناعية بالعاشر من رمضان',
    governorateEn: 'Sharqia',
    governorateAr: 'الشرقية',
    countryCode: 'EG',
    isEgyptCaseStudy: true,
    center: [30.306, 31.741],
    bounds: [
      [30.21, 31.64],
      [30.40, 31.84],
    ],
    descriptionEn:
      'Major manufacturing and polymer processing node on the Cairo-Ismailia desert fringe, hosting multiple Cycle recycling partners.',
    descriptionAr:
      'أكبر منطقة صناعية لتصنيع وتدوير البوليمرات على محور القاهرة–الإسماعيلية، وتضم عدة جمعيات ومصانع شريكة في سايكل.',
    resolutionCaveatEn:
      '1km LST reflects combined industrial rooftops, asphalt yards, and surrounding desert sand.',
    resolutionCaveatAr:
      'تعكس حرارة السطح (1كم) مزيج أسطح المصانع وساحات الأسفلت والظهير الصحراوي المحيط.',
    keywords: ['10th of ramadan', 'ramadan', 'عاشر من رمضان', 'العاشر'],
  },
  {
    id: 'nile-delta-zagazig',
    nameEn: 'Sharqia & Nile Delta Agricultural Basin (Zagazig)',
    nameAr: 'حوض الدلتا الزراعي بالشرقية (الزقازيق)',
    governorateEn: 'Sharqia',
    governorateAr: 'الشرقية',
    countryCode: 'EG',
    isEgyptCaseStudy: true,
    center: [30.5877, 31.502],
    bounds: [
      [30.49, 31.40],
      [30.69, 31.60],
    ],
    descriptionEn:
      'Double-cropped Nile Delta agricultural basin intersected by rural towns and irrigation canals requiring waste interception to protect waterways.',
    descriptionAr:
      'رقعة زراعية عالية الكثافة بدلتا النيل تتخللها مجاري وقنوات ري تحتاج لرفع كفاءة جمع البلاستيك لحماية المياه والتربة.',
    resolutionCaveatEn:
      'Double-season crops (winter wheat/clover, summer rice/maize) create strong biannual NDVI oscillations that require seasonal trend testing.',
    resolutionCaveatAr:
      'يسبب تتابع العروتين الشتوية والصيفية تذبذباً موسمياً قوياً في NDVI يتطلب اختبارات اتجاه موسمية.',
    keywords: ['zagazig', 'sharqia', 'mansoura', 'dakahlia', 'الزقازيق', 'الشرقية', 'المنصورة', 'الدقهلية'],
  },
  {
    id: 'alexandria-coastal',
    nameEn: 'Alexandria Coastal Corridor & Lake Mariout',
    nameAr: 'الشريط الساحلي بالإسكندرية وبحيرة مريوط',
    governorateEn: 'Alexandria',
    governorateAr: 'الإسكندرية',
    countryCode: 'EG',
    isEgyptCaseStudy: true,
    center: [31.2001, 29.9187],
    bounds: [
      [31.11, 29.82],
      [31.28, 30.04],
    ],
    descriptionEn:
      'Mediterranean port metropolis adjacent to coastal wetlands (Lake Mariout), where higher winter cloud cover makes MODIS QA filtering essential.',
    descriptionAr:
      'مدينة ساحلية وميناء رئيسي على المتوسط بمحاذاة بحيرة مريوط، حيث يرتفع الغطاء السحابي شتاءً مما يجعل تصفية جودة البيانات ضرورة علمية.',
    resolutionCaveatEn:
      'Coastal 250m–1km pixels near sea/lake margins can mix water and built-up surfaces, affecting NDVI and LST averages.',
    resolutionCaveatAr:
      'قد تخلط وحدات البكسل الساحلية بين المسطحات المائية واليابس الحضري مما يؤثر على المتوسطات.',
    keywords: ['alexandria', 'borg el arab', 'abu qir', 'الإسكندرية', 'الاسكندرية', 'برج العرب', 'أبو قير'],
  },
  {
    id: 'monufia-delta',
    nameEn: 'Monufia Central Delta Corridor',
    nameAr: 'محور وسط الدلتا (المنوفية)',
    governorateEn: 'Monufia',
    governorateAr: 'المنوفية',
    countryCode: 'EG',
    isEgyptCaseStudy: true,
    center: [30.5972, 30.9876],
    bounds: [
      [30.50, 30.89],
      [30.69, 31.09],
    ],
    descriptionEn:
      'Intensive delta agricultural landscape between Nile branches, with active community recycling partners operating collection loops.',
    descriptionAr:
      'حوض دلتا زراعي مكثف بين فرعي النيل مع نشاط متنامٍ لجهات إعادة التدوير في سايكل.',
    resolutionCaveatEn:
      'Rural settlements appear as sub-pixel pockets inside Croplands in 500m MCD12Q1 imagery.',
    resolutionCaveatAr:
      'تظهر التجمعات الريفية كنطاقات فرعية داخل فئة الأراضي الزراعية في دقة 500 متر.',
    keywords: ['monufia', 'menoufia', 'shibin', 'tanta', 'gharbia', 'المنوفية', 'شبين', 'طنطا', 'الغربية'],
  },
  {
    id: 'aswan-upper-egypt',
    nameEn: 'Aswan Upper Egypt Nile Corridor',
    nameAr: 'محور النيل بأسوان (صعيد مصر)',
    governorateEn: 'Aswan',
    governorateAr: 'أسوان',
    countryCode: 'EG',
    isEgyptCaseStudy: true,
    center: [24.0889, 32.8998],
    bounds: [
      [23.99, 32.80],
      [24.18, 33.00],
    ],
    descriptionEn:
      'Hyper-arid Upper Egypt thermal corridor along the Nile river valley, contrasting narrow green riverbanks with high-insolation desert plateaus.',
    descriptionAr:
      'نطاق صعيد مصر شديد الحرارة والجفاف على مجرى النيل، حيث يتجاور الشريط الأخضر الضيق مع الهضاب الصحراوية المرتفعة الحرارة.',
    resolutionCaveatEn:
      'The fertile Nile strip is narrow (~1–3 km wide); 1km thermal pixels quickly transition from irrigated bank to hot granite desert.',
    resolutionCaveatAr:
      'الشريط الزراعي ضيق جداً في أسوان، لذلك تتجاور خلايا النيل مع الصحراء الصخرية شديدة الحرارة ضمن مسافة قصيرة.',
    keywords: ['aswan', 'luxor', 'qena', 'sohag', 'asyut', 'minya', 'أسوان', 'الأقصر', 'قنا', 'سوهاج', 'أسيوط', 'المنيا'],
  },
];

/**
 * Verified NASA GIBS WMTS EPSG:3857 Layers (Verified against live GetCapabilities)
 */
export const NASA_GIBS_LAYERS: GIBSLayerConfig[] = [
  {
    id: 'gibs-truecolor-terra',
    layerIdentifier: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    titleEn: 'MODIS Terra Corrected Reflectance (True Color)',
    titleAr: 'الانعكاس المصحح للألوان الحقيقية (MODIS Terra)',
    category: 'true_color',
    linkedProductId: 'NASA_GIBS',
    tileMatrixSet: 'GoogleMapsCompatible_Level9',
    format: 'jpg',
    maxZoom: 9,
    defaultDate: '2026-10-16',
    cadence: 'daily',
    visualOnlyNoticeEn: 'Visual true-color browse imagery (250m max zoom level 9). Not a quantitative measurement.',
    visualOnlyNoticeAr: 'صور مرئية بالألوان الحقيقية للاستكشاف الجغرافي فقط وليست قياساً رقمياً.',
  },
  {
    id: 'gibs-ndvi-16day',
    layerIdentifier: 'MODIS_Terra_L3_NDVI_16Day',
    titleEn: 'MODIS Terra 16-Day NDVI (Vegetation Visual)',
    titleAr: 'خريطة الغطاء النباتي 16 يوماً (MODIS NDVI)',
    category: 'vegetation',
    linkedProductId: 'MOD13Q1.061',
    tileMatrixSet: 'GoogleMapsCompatible_Level9',
    format: 'png',
    maxZoom: 9,
    defaultDate: '2026-10-16',
    cadence: '16day',
    legendStops: [
      { color: '#8c510a', labelEn: '< 0.1 Bare / Arid', labelAr: '< 0.1 صحراء / جرداء' },
      { color: '#d8b365', labelEn: '0.1 – 0.25 Sparse', labelAr: '0.1 – 0.25 نباتات خفيفة' },
      { color: '#a6d96a', labelEn: '0.25 – 0.50 Moderate', labelAr: '0.25 – 0.50 متوسط' },
      { color: '#1a9850', labelEn: '0.50 – 0.75 Dense', labelAr: '0.50 – 0.75 كثيف' },
      { color: '#00441b', labelEn: '> 0.75 Peak Canopy', labelAr: '> 0.75 ذروة الغطاء' },
    ],
    visualOnlyNoticeEn: 'Visual GIBS rendering of 16-day MODIS NDVI. Quantitative charts use raw MOD13Q1 data.',
    visualOnlyNoticeAr: 'عرض بصري من GIBS لمؤشر NDVI. الأرقام الدقيقة في الرسوم مأخوذة من بيانات MOD13Q1 الرقمية.',
  },
  {
    id: 'gibs-evi-16day',
    layerIdentifier: 'MODIS_Terra_L3_EVI_16Day',
    titleEn: 'MODIS Terra 16-Day EVI (Enhanced Vegetation)',
    titleAr: 'مؤشر الغطاء النباتي المحسن 16 يوماً (MODIS EVI)',
    category: 'vegetation',
    linkedProductId: 'MOD13Q1.061',
    tileMatrixSet: 'GoogleMapsCompatible_Level9',
    format: 'png',
    maxZoom: 9,
    defaultDate: '2026-10-16',
    cadence: '16day',
    legendStops: [
      { color: '#c59b6d', labelEn: 'Low / Sparse Canopy', labelAr: 'غطاء منخفض' },
      { color: '#78c679', labelEn: 'Moderate Canopy', labelAr: 'غطاء متوسط' },
      { color: '#006837', labelEn: 'High Biomass Canopy', labelAr: 'كتلة حيوية عالية' },
    ],
    visualOnlyNoticeEn: 'Visual GIBS rendering of MODIS EVI (reduces soil background & aerosol noise).',
    visualOnlyNoticeAr: 'عرض بصري من GIBS لمؤشر EVI المحسن لتقليل تأثير التربة والغبار.',
  },
  {
    id: 'gibs-lst-day-8day',
    layerIdentifier: 'MODIS_Terra_L3_Land_Surface_Temp_8Day_Day',
    titleEn: 'MODIS Terra 8-Day Daytime Land Surface Temp',
    titleAr: 'درجة حرارة سطح الأرض النهارية 8 أيام (LST Day)',
    category: 'temperature',
    linkedProductId: 'MOD11A2.061',
    tileMatrixSet: 'GoogleMapsCompatible_Level7',
    format: 'png',
    maxZoom: 7,
    defaultDate: '2026-10-16',
    cadence: '8day',
    legendStops: [
      { color: '#2c7bb6', labelEn: '< 10°C Cool Surface', labelAr: '< 10°م بارد' },
      { color: '#abd9e9', labelEn: '10 – 25°C Mild', labelAr: '10 – 25°م معتدل' },
      { color: '#fdae61', labelEn: '25 – 40°C Warm', labelAr: '25 – 40°م دافئ' },
      { color: '#d7191c', labelEn: '40 – 55°C+ Hot Surface', labelAr: '40 – 55°م+ ساخن جداً' },
    ],
    visualOnlyNoticeEn: 'Visual daytime skin surface temperature (not air temp). Quantitative °C comes from MOD11A2 numeric rasters.',
    visualOnlyNoticeAr: 'عرض بصري لحرارة السطح النهارية (وليست حرارة الهواء). القيم الرقمية مأخوذة من MOD11A2.',
  },
  {
    id: 'gibs-lst-night-8day',
    layerIdentifier: 'MODIS_Terra_L3_Land_Surface_Temp_8Day_Night',
    titleEn: 'MODIS Terra 8-Day Nighttime Land Surface Temp',
    titleAr: 'درجة حرارة سطح الأرض الليلية 8 أيام (LST Night)',
    category: 'temperature',
    linkedProductId: 'MOD11A2.061',
    tileMatrixSet: 'GoogleMapsCompatible_Level7',
    format: 'png',
    maxZoom: 7,
    defaultDate: '2026-10-16',
    cadence: '8day',
    legendStops: [
      { color: '#313695', labelEn: '< 5°C Cold Night Surface', labelAr: '< 5°م بارد ليلاً' },
      { color: '#74add1', labelEn: '5 – 18°C Cool', labelAr: '5 – 18°م لطيف' },
      { color: '#f46d43', labelEn: '18 – 30°C Retained Heat', labelAr: '18 – 30°م احتباس حراري' },
      { color: '#a50026', labelEn: '> 30°C Intense Night Heat', labelAr: '> 30°م حرارة ليلية مرتفعة' },
    ],
    visualOnlyNoticeEn: 'Nighttime radiometric surface temperature highlights urban heat retention vs surrounding desert cooling.',
    visualOnlyNoticeAr: 'حرارة السطح الليلية توضح احتباس الحرارة في المدن مقارنة بالصحراء المحيطة.',
  },
  {
    id: 'gibs-igbp-landcover',
    layerIdentifier: 'MODIS_Combined_L3_IGBP_Land_Cover_Type_Annual',
    titleEn: 'MODIS Combined IGBP Land Cover Type (Annual)',
    titleAr: 'خريطة الغطاء الأرضي السنوية (IGBP Land Cover)',
    category: 'land_cover',
    linkedProductId: 'MCD12Q1.061',
    tileMatrixSet: 'GoogleMapsCompatible_Level8',
    format: 'png',
    maxZoom: 8,
    defaultDate: '2024-01-01',
    cadence: 'annual',
    legendStops: [
      { color: '#a5a5a5', labelEn: 'Urban & Built-up (13)', labelAr: 'حضرية ومبنية (13)' },
      { color: '#c24f44', labelEn: 'Croplands (12)', labelAr: 'أراضٍ زراعية (12)' },
      { color: '#d4b483', labelEn: 'Barren / Desert (16)', labelAr: 'صحراء / جرداء (16)' },
      { color: '#1c0dff', labelEn: 'Water Bodies (17)', labelAr: 'مسطحات مائية (17)' },
      { color: '#dcd159', labelEn: 'Shrublands / Savanna (6–10)', labelAr: 'شجيرات / عشبية' },
    ],
    visualOnlyNoticeEn: 'Annual IGBP classification visual tiles (requires YYYY-01-01 date; quantitative matrices use MCD12Q1 data).',
    visualOnlyNoticeAr: 'عرض بصري لتصنيف الغطاء الأرضي السنوي (تستخدم التواريخ السنوية YYYY-01-01).',
  },
];

export function buildGibsTileUrl(layer: GIBSLayerConfig, requestedDate: string): string {
  const cleanDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
    ? requestedDate
    : layer.defaultDate;

  // Annual IGBP layer strictly serves YYYY-01-01
  const effectiveDate =
    layer.cadence === 'annual'
      ? `${Math.min(2024, Math.max(2001, parseInt(cleanDate.slice(0, 4), 10) || 2024))}-01-01`
      : cleanDate;

  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer.layerIdentifier}/default/${effectiveDate}/${layer.tileMatrixSet}/{z}/{y}/{x}.${layer.format}`;
}
