import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '../context/LanguageContext';
import { X, Copy, Check, Download, Smartphone, Globe, ExternalLink } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose }) => {
  const { t, language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<SVGSVGElement | null>(null);

  if (!isOpen) return null;

  // Use current live app URL
  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    if (!qrRef.current) return;
    const svgData = new XMLSerializer().serializeToString(qrRef.current);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20, 360, 360);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `cycle-app-qrcode.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div 
      id="modal-qrcode-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        id="modal-qrcode-content"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 text-stone-800 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          id="btn-close-qr-modal"
          onClick={onClose}
          className="absolute top-4 right-4 rtl:right-auto rtl:left-4 p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors"
          aria-label={t('close')}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center pt-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mb-3">
            <Smartphone className="w-6 h-6" />
          </div>
          
          <h3 className="text-xl font-bold text-stone-900">
            {t('qrTitle')}
          </h3>
          <p className="text-sm text-stone-600 mt-1 max-w-xs mx-auto">
            {t('qrSubtitle')}
          </p>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center my-6 p-6 bg-stone-50 rounded-xl border border-stone-200">
          <div className="p-3 bg-white rounded-xl shadow-xs border border-stone-100">
            <QRCodeSVG
              ref={qrRef}
              value={currentUrl}
              size={200}
              level="H"
              includeMargin={false}
              fgColor="#15803d"
              bgColor="#ffffff"
            />
          </div>

          <div className="flex items-center gap-1.5 mt-3 text-xs text-stone-500 font-mono break-all text-center max-w-xs">
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{currentUrl}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            id="btn-copy-app-link"
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-stone-300 hover:border-stone-400 bg-white text-stone-700 font-medium text-sm transition-colors hover:bg-stone-50"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">{t('linkCopied')}</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>{t('copyLink')}</span>
              </>
            )}
          </button>

          <button
            id="btn-download-qr-image"
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm transition-colors shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>{language === 'ar' ? 'تحميل كصورة' : 'Save Image'}</span>
          </button>
        </div>

        {/* Mobile Cross-device hint */}
        <div className="mt-4 pt-3 border-t border-stone-100 text-center">
          <p className="text-xs text-stone-500">
            {language === 'ar' 
              ? '✨ يمكنك التسجيل كفرد من هاتفك ثم الدخول كمؤسسة من جهاز الكمبيوتر واختبار المحادثة الفورية وتحديث الحالات مباشرة.' 
              : '✨ Try reporting plastic on your phone and managing collections from another device in real-time!'}
          </p>
        </div>
      </div>
    </div>
  );
};
