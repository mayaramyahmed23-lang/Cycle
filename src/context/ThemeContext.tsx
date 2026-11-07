import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppSettings } from '../types';

const defaultSettings: AppSettings = {
  appName: 'Cycle',
  logoUrl: '',
  primaryColor: '#16a34a',
  secondaryColor: '#0d9488',
  heroTitleEn: 'Transform Plastic Waste into Valuable Resources',
  heroTitleAr: 'تحويل النفايات البلاستيكية إلى موارد ذات قيمة',
  heroSubtitleEn: 'Cycle bridges the gap between individuals holding plastic waste and certified recycling organizations. Post your materials or discover recyclables in your area.',
  heroSubtitleAr: 'تربط منصة "سايكل" بين الأفراد الذين يمتلكون مخلفات بلاستيكية والمؤسسات المعتمدة لإعادة التدوير. انشر تقريرك أو اكتشف المواد المتاحة في منطقتك.',
  problemTextEn: 'Millions of tons of recyclable polymers end up in landfills or waterways because households and businesses lack a direct channel to certified recyclers.',
  problemTextAr: 'ينتهي المطاف بملايين الأطنان من البوليمرات القابلة لإعادة التدوير في المكبات أو المسطحات المائية لغياب حلقة وصل مباشرة مع شركات التدوير.',
  howItWorksEn: 'A transparent, direct 3-step loop from household to recycling plant: Report, Connect, and Recycle.',
  howItWorksAr: 'مسار شفاف ومباشر في ٣ خطوات من المنزل إلى مصنع إعادة التدوير: أبلغ، تواصل، وأعد التدوير.',
  sectionsVisibility: {
    hero: true,
    stats: true,
    problem: true,
    howItWorks: true,
    plasticGuide: true,
    mediaShowcase: true,
    cta: true
  },
  demoVideos: [
    {
      id: 'v1',
      titleEn: 'How Plastic Recycling Works: From Bottle to Flakes',
      titleAr: 'كيف تعمل إعادة تدوير البلاستيك: من الزجاجة إلى الرقائق',
      url: 'https://www.youtube.com/embed/I_fUpP-hq3A',
      type: 'youtube',
      category: 'education',
      descriptionEn: 'Step-by-step breakdown of how post-consumer PET and HDPE bottles are cleaned, sorted, shredded, and pelletized into new materials.',
      descriptionAr: 'شرح تفصيلي لكيفية غسل وفرز وتقطيع وتحويل زجاجات البولي إيثيلين تيريفثاليت إلى حبيبات تصنيع جديدة.'
    },
    {
      id: 'v2',
      titleEn: 'Sorting Polymers at Home & Work',
      titleAr: 'دليل فرز أنواع البلاستيك في المنزل وموقع العمل',
      url: 'https://www.youtube.com/embed/9BqS5bE2Y2g',
      type: 'youtube',
      category: 'demo',
      descriptionEn: 'Best practices for rinsing, identifying resin codes 1-7, and staging plastic batches for collection.',
      descriptionAr: 'أفضل الممارسات لشطف وتحديد رموز الراتنج من 1 إلى 7 وتجهيز شحنات البلاستيك للتسليم.'
    }
  ]
};

interface ThemeContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to live settings changes from Firestore
    const unsub = onSnapshot(
      doc(db, 'app_settings', 'general'),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<AppSettings>;
          setSettings((prev) => ({
            ...prev,
            ...data,
            sectionsVisibility: {
              ...prev.sectionsVisibility,
              ...(data.sectionsVisibility || {})
            },
            demoVideos: data.demoVideos && data.demoVideos.length > 0 ? data.demoVideos : prev.demoVideos
          }));
        }
        setLoading(false);
      },
      (error) => {
        console.warn('Could not load dynamic settings from Firestore, using defaults:', error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Update dynamic CSS variables when colors change
  useEffect(() => {
    const root = document.documentElement;
    if (settings.primaryColor) {
      root.style.setProperty('--color-primary', settings.primaryColor);
    }
    if (settings.secondaryColor) {
      root.style.setProperty('--color-secondary', settings.secondaryColor);
    }
  }, [settings.primaryColor, settings.secondaryColor]);

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = {
      ...settings,
      ...newSettings,
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'app_settings', 'general'), updated, { merge: true });
    setSettings(updated);
  };

  return (
    <ThemeContext.Provider value={{ settings, updateSettings, loading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
