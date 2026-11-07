import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CollectionRoute, RouteStop, PlasticReport, OrganizationNeedPost } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { buildOptimizedCollectionRoute } from '../lib/routing';
import { PlasticTypeBadge } from '../components/PlasticTypeBadge';
import { 
  Navigation, 
  MapPin, 
  Clock, 
  Leaf, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  ExternalLink, 
  Truck, 
  Phone, 
  User, 
  Package, 
  Sparkles,
  ArrowRight,
  Loader2,
  Calendar,
  Layers,
  FileCheck
} from 'lucide-react';

interface CollectionRoutesPageProps {
  allReports: PlasticReport[];
  initialSelectedReports?: PlasticReport[];
  organizationPosts?: OrganizationNeedPost[];
  onClearInitialSelected?: () => void;
}

export const CollectionRoutesPage: React.FC<CollectionRoutesPageProps> = ({
  allReports,
  initialSelectedReports = [],
  organizationPosts = [],
  onClearInitialSelected,
}) => {
  const { t, language } = useLanguage();
  const { currentUser, userProfile, isOrganization, isAdmin } = useAuth();

  const [savedRoutes, setSavedRoutes] = useState<CollectionRoute[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);

  // Active planning state
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>(
    initialSelectedReports.map((r) => r.id)
  );
  const [routeName, setRouteName] = useState<string>('');
  const [assignedDriver, setAssignedDriver] = useState<string>('');
  const [depotLocation, setDepotLocation] = useState<string>(
    userProfile?.location || 'Cairo Logistics Depot'
  );
  const [isBuildingRoute, setIsBuildingRoute] = useState(false);
  const [activeRouteView, setActiveRouteView] = useState<CollectionRoute | null>(null);

  // Sync initialSelectedReports if changed
  useEffect(() => {
    if (initialSelectedReports && initialSelectedReports.length > 0) {
      setSelectedReportIds((prev) => {
        const combined = Array.from(new Set([...prev, ...initialSelectedReports.map((r) => r.id)]));
        return combined;
      });
    }
  }, [initialSelectedReports]);

  // Load saved routes for current organization
  useEffect(() => {
    if (!currentUser) return;
    setLoadingRoutes(true);

    const q = query(
      collection(db, 'collectionRoutes'),
      where('organizationId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const routes: CollectionRoute[] = [];
        snapshot.forEach((d) => {
          routes.push({ id: d.id, ...(d.data() as any) } as CollectionRoute);
        });
        setSavedRoutes(routes);
        setLoadingRoutes(false);
      },
      (err) => {
        console.error('Error loading routes:', err);
        setLoadingRoutes(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Selected reports full objects
  const selectedReports = useMemo(() => {
    return allReports.filter((r) => selectedReportIds.includes(r.id));
  }, [allReports, selectedReportIds]);

  // Dynamically compute preview route optimization
  const previewOptimization = useMemo(() => {
    if (selectedReports.length === 0) return null;
    return buildOptimizedCollectionRoute(
      selectedReports,
      depotLocation,
      language as 'ar' | 'en'
    );
  }, [selectedReports, depotLocation, language]);

  const toggleSelectReport = (reportId: string) => {
    setSelectedReportIds((prev) =>
      prev.includes(reportId) ? prev.filter((id) => id !== reportId) : [...prev, reportId]
    );
  };

  const handleSaveRoute = async () => {
    if (!previewOptimization || selectedReports.length === 0 || !currentUser) return;
    setIsBuildingRoute(true);

    try {
      const stops: RouteStop[] = previewOptimization.orderedReports.map((report, idx) => ({
        stopNumber: idx + 1,
        reportId: report.id,
        creatorName: report.creatorName,
        contactInfo: report.contactInfo,
        location: report.location,
        latitude: report.latitude,
        longitude: report.longitude,
        plasticType: report.plasticType,
        quantity: report.quantity,
        unit: report.unit,
        pickupStatus: 'Pending',
      }));

      const newRoute: Omit<CollectionRoute, 'id'> = {
        organizationId: currentUser.uid,
        organizationName: userProfile?.name || currentUser.displayName || 'Recycling Partner',
        title:
          routeName.trim() ||
          `${t('collectionRouteTitle')} - ${new Date().toLocaleDateString(
            language === 'ar' ? 'ar-EG' : 'en-US'
          )}`,
        assignedDriver: assignedDriver.trim() || undefined,
        totalStops: stops.length,
        totalDistanceKm: previewOptimization.totalDistanceKm,
        totalEstimatedDurationMin: previewOptimization.estimatedTimeMinutes,
        totalQuantityKg: previewOptimization.totalWeightKg,
        stops,
        status: 'Scheduled',
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'collectionRoutes'), newRoute);
      setSelectedReportIds([]);
      setRouteName('');
      if (onClearInitialSelected) onClearInitialSelected();
      setActiveRouteView({ id: docRef.id, ...newRoute });
    } catch (err) {
      console.error('Error creating route:', err);
    } finally {
      setIsBuildingRoute(false);
    }
  };

  const handleUpdateStopStatus = async (
    route: CollectionRoute,
    stopIdx: number,
    newStatus: 'Pending' | 'PickedUp' | 'Skipped'
  ) => {
    try {
      const updatedStops = [...route.stops];
      updatedStops[stopIdx] = {
        ...updatedStops[stopIdx],
        pickupStatus: newStatus,
      };

      const allCompleted = updatedStops.every((s) => s.pickupStatus === 'PickedUp');
      const routeStatus = allCompleted ? 'Completed' : 'In Progress';

      await updateDoc(doc(db, 'collectionRoutes', route.id), {
        stops: updatedStops,
        status: routeStatus,
        updatedAt: new Date().toISOString(),
      });

      if (activeRouteView?.id === route.id) {
        setActiveRouteView({
          ...activeRouteView,
          stops: updatedStops,
          status: routeStatus,
        });
      }
    } catch (err) {
      console.error('Failed to update stop status:', err);
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!window.confirm(language === 'ar' ? 'هل تريد حذف هذا المسار اللوجستي؟' : 'Delete this collection route?')) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'collectionRoutes', routeId));
      if (activeRouteView?.id === routeId) {
        setActiveRouteView(null);
      }
    } catch (err) {
      console.error('Failed to delete route:', err);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-teal-800 to-emerald-900 text-white shadow-lg">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-semibold text-emerald-200">
            <Navigation className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'المحسن اللوجستي الذكي' : 'Smart Logistics Planner'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t('smartRoutes')}
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/85 leading-relaxed">
            {t('smartRoutesSubtitle')}
          </p>
        </div>

        {savedRoutes.length > 0 && (
          <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl backdrop-blur-xs text-xs">
            <Truck className="w-6 h-6 text-emerald-300" />
            <div>
              <p className="font-bold text-white">
                {savedRoutes.length} {language === 'ar' ? 'مسار محفوظ' : 'Saved Routes'}
              </p>
              <p className="text-emerald-200 text-[11px]">
                {savedRoutes.filter((r) => r.status === 'Completed').length}{' '}
                {language === 'ar' ? 'مكتمل' : 'Completed'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Left = Stop Selection & Route Builder, Right = Active Plan / Saved Routes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Select Stops from Available Reports (Col 5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  {t('selectStopsForRoute')}
                </h3>
                <p className="text-xs text-stone-500">
                  {selectedReportIds.length}{' '}
                  {language === 'ar' ? 'بلاغات محددة للمسار' : 'reports chosen for pickup'}
                </p>
              </div>

              {selectedReportIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedReportIds([])}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                >
                  {language === 'ar' ? 'إلغاء التحديد' : 'Clear all'}
                </button>
              )}
            </div>

            {/* Depot Origin Config */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-stone-400" />
                <span>{language === 'ar' ? 'نقطة الانطلاق (مقر المصنع / المستودع)' : 'Starting Depot / Facility'}</span>
              </label>
              <input
                type="text"
                value={depotLocation}
                onChange={(e) => setDepotLocation(e.target.value)}
                placeholder="e.g. 10th of Ramadan City Depot"
                className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* List of Available Reports */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {allReports.length === 0 ? (
                <p className="text-xs text-stone-400 text-center py-6">
                  {t('noReportsFound')}
                </p>
              ) : (
                allReports.map((report) => {
                  const isSelected = selectedReportIds.includes(report.id);
                  return (
                    <div
                      key={report.id}
                      onClick={() => toggleSelectReport(report.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-2xs'
                          : 'border-stone-200 bg-white hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 rounded-sm border-stone-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-stone-900 truncate">
                              {report.creatorName}
                            </span>
                            <PlasticTypeBadge type={report.plasticType} size="sm" />
                          </div>
                          <p className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5 truncate">
                            <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                            <span>{report.location}</span>
                            <span>•</span>
                            <span className="font-semibold text-stone-700">
                              {report.quantity} {report.unit}
                            </span>
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          report.status === 'Available'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {report.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Route Optimization Preview or Saved Routes (Col 7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Active Generation Preview */}
          {previewOptimization ? (
            <div className="p-6 rounded-2xl bg-white border-2 border-emerald-500 shadow-md space-y-6 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-900">
                      {language === 'ar' ? 'معاينة المسار الأمثل المقترح' : 'Optimized Collection Sequence'}
                    </h3>
                    <p className="text-xs text-stone-500">
                      {previewOptimization.orderedReports.length} {t('stopsCount')}
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs">
                  {language === 'ar' ? 'جاهز للحفظ' : 'Ready to Dispatch'}
                </span>
              </div>

              {/* KPI Metrics Dashboard */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-[11px] text-stone-500 font-semibold block flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('estimatedDistance')}</span>
                  </span>
                  <span className="text-base font-extrabold text-stone-900">
                    {previewOptimization.totalDistanceKm} {t('distanceKm')}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-[11px] text-stone-500 font-semibold block flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>{t('estimatedDuration')}</span>
                  </span>
                  <span className="text-base font-extrabold text-stone-900">
                    {previewOptimization.estimatedTimeMinutes} {t('durationMin')}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                  <span className="text-[11px] text-stone-500 font-semibold block flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-amber-600" />
                    <span>{t('totalWeight')}</span>
                  </span>
                  <span className="text-base font-extrabold text-stone-900">
                    {previewOptimization.totalWeightKg} kg
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <span className="text-[11px] text-emerald-800 font-semibold block flex items-center gap-1">
                    <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('carbonSavedKg')}</span>
                  </span>
                  <span className="text-base font-extrabold text-emerald-950">
                    {previewOptimization.co2SavedKg} kg CO₂
                  </span>
                </div>
              </div>

              {/* Waypoints sequence */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                  {language === 'ar' ? 'تسلسل محطات الجمع (مرتبة بالأقرب)' : 'Pickup Waypoints (Nearest-First)'}
                </h4>
                
                <div className="space-y-2 border-l-2 rtl:border-l-0 rtl:border-r-2 border-emerald-300 ml-3 rtl:ml-0 rtl:mr-3 pl-4 rtl:pl-0 rtl:pr-4 py-1">
                  {/* Origin */}
                  <div className="text-xs text-stone-600 flex items-center gap-2 pb-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                      0
                    </span>
                    <span className="font-semibold text-stone-900">
                      {depotLocation} ({language === 'ar' ? 'مستودع البداية' : 'Start Depot'})
                    </span>
                  </div>

                  {previewOptimization.orderedReports.map((r, i) => (
                    <div
                      key={r.id}
                      className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between text-xs gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-900 flex items-center justify-center font-extrabold text-xs shrink-0">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-stone-900 truncate">
                            {r.creatorName} ({r.quantity} {r.unit} {r.plasticType})
                          </p>
                          <p className="text-[11px] text-stone-500 truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-stone-400" />
                            <span>{r.location}</span>
                          </p>
                        </div>
                      </div>

                      {r.contactInfo && (
                        <span className="text-[11px] text-stone-500 font-mono shrink-0 hidden sm:inline">
                          {r.contactInfo}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Form to Save/Dispatch Route */}
              <div className="pt-4 border-t border-stone-100 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      {language === 'ar' ? 'اسم المسار' : 'Route Title'}
                    </label>
                    <input
                      type="text"
                      placeholder={language === 'ar' ? 'مسار جمع المنطقة الشرقية' : 'East District Collection #1'}
                      value={routeName}
                      onChange={(e) => setRouteName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      {language === 'ar' ? 'السائق أو رقم الشاحنة' : 'Assigned Driver / Truck #'}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Captain Ahmed (Truck 42)"
                      value={assignedDriver}
                      onChange={(e) => setAssignedDriver(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedReportIds([])}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveRoute}
                    disabled={isBuildingRoute}
                    className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isBuildingRoute ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{t('saving')}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{language === 'ar' ? 'حفظ وتأكيد المسار' : 'Save & Dispatch Route'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Saved Routes List */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-stone-900 flex items-center justify-between">
              <span>{language === 'ar' ? 'المسارات اللوجستية النشطة والمحفوظة' : 'Dispatched & Saved Routes'}</span>
              <span className="text-xs font-normal text-stone-500">
                {savedRoutes.length} {language === 'ar' ? 'مسارات' : 'routes'}
              </span>
            </h3>

            {loadingRoutes ? (
              <div className="p-8 text-center text-stone-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                <p className="text-xs">{t('loading')}</p>
              </div>
            ) : savedRoutes.length === 0 && !previewOptimization ? (
              <div className="p-10 text-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 space-y-3">
                <Navigation className="w-8 h-8 mx-auto text-stone-400" />
                <p className="text-xs font-bold text-stone-800">
                  {language === 'ar' ? 'لا توجد مسارات مجهزة بعد' : 'No routes scheduled yet'}
                </p>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  {language === 'ar'
                    ? 'حدد بلاغات من القائمة المقابلة، وسيقوم النظام الذكي بفرز المحطات وحساب المسار الأقل استهلاكاً للوقود.'
                    : 'Select reports on the left to calculate an optimized, fuel-efficient collection path.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedRoutes.map((route) => {
                  const completedStops = route.stops.filter((s) => s.pickupStatus === 'PickedUp').length;
                  const isExpanded = activeRouteView?.id === route.id;

                  return (
                    <div
                      key={route.id}
                      className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-stone-900">
                              {route.title}
                            </h4>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                route.status === 'Completed'
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  : 'bg-blue-50 text-blue-800 border-blue-200'
                              }`}
                            >
                              {route.status}
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 flex items-center gap-2">
                            <span>
                              {completedStops} / {route.totalStops} {t('stopsCount')}
                            </span>
                            <span>•</span>
                            <span>{route.totalDistanceKm} km</span>
                            <span>•</span>
                            <span>{route.totalQuantityKg} kg</span>
                            {route.assignedDriver && (
                              <>
                                <span>•</span>
                                <span className="font-semibold text-stone-700">{route.assignedDriver}</span>
                              </>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setActiveRouteView(isExpanded ? null : route)}
                            className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-semibold text-stone-700 transition-colors"
                          >
                            {isExpanded
                              ? language === 'ar'
                                ? 'إخفاء'
                                : 'Collapse'
                              : language === 'ar'
                              ? 'عرض المحطات'
                              : 'View Stops'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRoute(route.id)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title={t('delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Stops Tracker */}
                      {isExpanded && (
                        <div className="pt-3 border-t border-stone-100 space-y-2.5 animate-in fade-in duration-150">
                          {route.stops.map((stop, sIdx) => {
                            const mapUrl =
                              stop.latitude && stop.longitude
                                ? `https://www.google.com/maps/search/?api=1&query=${stop.latitude},${stop.longitude}`
                                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                    stop.location
                                  )}`;

                            return (
                              <div
                                key={sIdx}
                                className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                                  stop.pickupStatus === 'PickedUp'
                                    ? 'bg-emerald-50/50 border-emerald-200'
                                    : 'bg-stone-50 border-stone-200'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span
                                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                      stop.pickupStatus === 'PickedUp'
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-stone-200 text-stone-700'
                                    }`}
                                  >
                                    {stop.stopNumber}
                                  </span>

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-stone-900 truncate">
                                        {stop.creatorName}
                                      </span>
                                      <PlasticTypeBadge type={stop.plasticType} size="sm" />
                                      <span className="font-semibold text-stone-700">
                                        {stop.quantity} {stop.unit}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-stone-500 truncate flex items-center gap-1 mt-0.5">
                                      <MapPin className="w-3 h-3 text-stone-400" />
                                      <span>{stop.location}</span>
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {stop.contactInfo && (
                                    <a
                                      href={`tel:${stop.contactInfo}`}
                                      className="p-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:text-emerald-700 transition-colors"
                                      title={language === 'ar' ? 'اتصال هاتفياً' : 'Call contact'}
                                    >
                                      <Phone className="w-3.5 h-3.5" />
                                    </a>
                                  )}

                                  <a
                                    href={mapUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:text-blue-700 transition-colors"
                                    title={language === 'ar' ? 'فتح في خرائط جوجل' : 'Open in Google Maps'}
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>

                                  {/* Status Toggle */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateStopStatus(
                                        route,
                                        sIdx,
                                        stop.pickupStatus === 'PickedUp' ? 'Pending' : 'PickedUp'
                                      )
                                    }
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                                      stop.pickupStatus === 'PickedUp'
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                        : 'bg-stone-200 text-stone-700 hover:bg-emerald-600 hover:text-white'
                                    }`}
                                  >
                                    {stop.pickupStatus === 'PickedUp'
                                      ? t('stopStatusPickedUp')
                                      : language === 'ar'
                                      ? 'تأكيد الاستلام'
                                      : 'Mark Picked Up'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
