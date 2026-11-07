import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { MediaUploaderOrUrl, MediaPayload } from './MediaUploaderOrUrl';
import { 
  Video as VideoIcon, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  AlertCircle, 
  Play, 
  Film, 
  Sparkles,
  ExternalLink,
  Layers
} from 'lucide-react';

export const VideoManager: React.FC = () => {
  const { t, language } = useLanguage();
  const { settings, updateSettings } = useTheme();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);

  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descAr, setDescAr] = useState('');
  const [category, setCategory] = useState<'education' | 'demo' | 'promo' | 'general'>('education');

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const videosList = settings.demoVideos || [];

  // Add or Replace Video
  const handleSaveVideo = async (payload: MediaPayload) => {
    try {
      const isYouTube = payload.url.includes('youtube.com') || payload.url.includes('youtu.be');
      const isVimeo = payload.url.includes('vimeo.com');
      const isDirect = payload.url.includes('.mp4') || payload.url.includes('.webm') || payload.source === 'upload';

      const inferredType = isYouTube ? 'youtube' : isVimeo ? 'vimeo' : isDirect ? 'mp4' : 'direct';

      if (editingVideoId) {
        // Update existing
        const updated = videosList.map((v) => {
          if (v.id === editingVideoId) {
            return {
              ...v,
              titleEn: titleEn.trim() || v.titleEn,
              titleAr: titleAr.trim() || v.titleAr || titleEn.trim(),
              descriptionEn: descEn.trim() || v.descriptionEn,
              descriptionAr: descAr.trim() || v.descriptionAr,
              url: payload.url,
              source: payload.source,
              type: inferredType as any,
              category,
              fileName: payload.fileName || v.fileName,
              fileSize: payload.fileSize || v.fileSize
            };
          }
          return v;
        });

        await updateSettings({ demoVideos: updated });
        setEditingVideoId(null);
      } else {
        // Add new
        const newVideo = {
          id: `v_${Date.now()}`,
          titleEn: titleEn.trim() || payload.fileName || 'Recycling Video',
          titleAr: titleAr.trim() || titleEn.trim() || 'فيديو التدوير',
          descriptionEn: descEn.trim(),
          descriptionAr: descAr.trim() || descEn.trim(),
          url: payload.url,
          source: payload.source,
          type: inferredType as any,
          category,
          visible: true,
          order: videosList.length + 1,
          fileName: payload.fileName,
          fileSize: payload.fileSize,
          createdAt: new Date().toISOString()
        };

        const updated = [...videosList, newVideo];
        await updateSettings({ demoVideos: updated });
      }

      setShowAddForm(false);
      setTitleEn('');
      setTitleAr('');
      setDescEn('');
      setDescAr('');
      setCategory('education');

      setStatusMsg({ type: 'success', text: t('adminMediaAdded') });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      console.error('Failed to save video:', err);
      setStatusMsg({ type: 'error', text: err?.message || t('errUploadFailed') });
    }
  };

  // Delete Video
  const handleDeleteVideo = async (videoId: string) => {
    if (!window.confirm(t('confirmDeleteMedia'))) return;
    try {
      const updated = videosList.filter((v) => v.id !== videoId);
      await updateSettings({ demoVideos: updated });
      setStatusMsg({ type: 'success', text: t('mediaDeletedSuccess') });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      console.error('Failed to delete video:', err);
    }
  };

  // Toggle Visibility
  const handleToggleVisibility = async (videoId: string) => {
    try {
      const updated = videosList.map((v) => {
        if (v.id === videoId) {
          return { ...v, visible: v.visible === false ? true : false };
        }
        return v;
      });
      await updateSettings({ demoVideos: updated });
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
    }
  };

  // Reorder Video
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === videosList.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newArr = [...videosList];
    const item = newArr.splice(index, 1)[0];
    newArr.splice(targetIndex, 0, item);

    try {
      await updateSettings({ demoVideos: newArr });
    } catch (err) {
      console.error('Failed to reorder videos:', err);
    }
  };

  return (
    <div id="section-video-manager" className="space-y-6 animate-in fade-in">
      
      {/* Header & Add Button */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center">
                <VideoIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-stone-900">{t('mediaVideosTab')}</h3>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              {language === 'ar' 
                ? 'إدارة الفيديوهات التوعوية والاستعراضية عبر الرفع المباشر من هاتفك أو روابط يوتيوب ومصادر الفيديو.' 
                : 'Upload instructional videos directly from your device or embed YouTube & video URLs.'}
            </p>
          </div>

          <button
            onClick={() => {
              setEditingVideoId(null);
              setTitleEn('');
              setTitleAr('');
              setDescEn('');
              setDescAr('');
              setShowAddForm(!showAddForm);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addVideoModal')}</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Add / Edit Video Panel */}
      {showAddForm && (
        <div className="bg-stone-50 rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
          <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <Film className="w-4 h-4 text-emerald-700" />
            <span>{editingVideoId ? t('replaceCurrentMedia') : t('addVideoModal')}</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">{t('adminMediaTitle')} (EN)</label>
              <input
                type="text"
                placeholder="e.g. How Recycling Flakes Are Formed"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">{t('adminMediaTitle')} (AR)</label>
              <input
                type="text"
                placeholder="مثال: كيف تتم معالجة رقائق البلاستيك"
                value={titleAr}
                onChange={(e) => setTitleAr(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">{t('videoCategory')}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs bg-white"
              >
                <option value="education">{t('videoCatEducation')}</option>
                <option value="demo">{t('videoCatDemo')}</option>
                <option value="promo">{t('videoCatPromo')}</option>
                <option value="general">{t('videoCatGeneral')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">{t('videoSectionPlacement')}</label>
              <div className="px-3 py-2 rounded-lg border border-stone-200 bg-white text-xs text-stone-600 font-medium">
                {t('sectionVideoShowcase')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">{t('adminMediaDesc')} (EN)</label>
              <textarea
                rows={2}
                placeholder="Brief summary for homepage showcase"
                value={descEn}
                onChange={(e) => setDescEn(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs bg-white resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">{t('adminMediaDesc')} (AR)</label>
              <textarea
                rows={2}
                placeholder="ملخص قصير للبطاقة في الصفحة الرئيسية"
                value={descAr}
                onChange={(e) => setDescAr(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs bg-white resize-none"
              />
            </div>
          </div>

          {/* Media Uploader or URL */}
          <MediaUploaderOrUrl
            mediaType="video"
            folder="videos"
            label={t('chooseSource')}
            showCancel={true}
            onCancel={() => setShowAddForm(false)}
            onSave={handleSaveVideo}
          />
        </div>
      )}

      {/* Videos List Grid */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-stone-900">
            {language === 'ar' ? 'الفيديوهات المضافة' : 'Active Video Collection'} ({videosList.length})
          </h3>
        </div>

        {videosList.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-400 border border-dashed border-stone-200 rounded-xl">
            {t('noMediaFound')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {videosList.map((video, idx) => (
              <div
                key={video.id}
                className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-3">
                  {/* Video Player */}
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
                    {video.url.includes('youtube.com') || video.url.includes('vimeo.com') ? (
                      <iframe
                        src={video.url}
                        title={video.titleEn}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        src={video.url}
                        controls
                        className="w-full h-full object-contain"
                      >
                        Your browser does not support HTML5 video.
                      </video>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                        {video.category || 'education'}
                      </span>
                      {video.source === 'upload' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800">
                          {t('videoSourceDevice')}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                          {t('videoSourceUrl')}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-stone-900">
                      {language === 'ar' ? video.titleAr || video.titleEn : video.titleEn}
                    </h4>

                    <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                      {language === 'ar' ? video.descriptionAr || video.descriptionEn : video.descriptionEn}
                    </p>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between pt-3 border-t border-stone-200/80 text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMove(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 text-stone-500 hover:text-stone-900 disabled:opacity-30 rounded"
                      title={t('moveUp')}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMove(idx, 'down')}
                      disabled={idx === videosList.length - 1}
                      className="p-1 text-stone-500 hover:text-stone-900 disabled:opacity-30 rounded"
                      title={t('moveDown')}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleVisibility(video.id)}
                      className={`inline-flex items-center gap-1 text-xs font-semibold ${
                        video.visible !== false ? 'text-emerald-700' : 'text-stone-400'
                      }`}
                    >
                      {video.visible !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span>{video.visible !== false ? t('visibilityShow') : t('visibilityHide')}</span>
                    </button>

                    <button
                      onClick={() => handleDeleteVideo(video.id)}
                      className="p-1 text-rose-600 hover:text-rose-700 rounded"
                      title={t('delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
