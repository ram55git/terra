import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export default function InfoDialog({ open, onClose }) {
  const closeBtnRef = useRef(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKey);

    // Focus close button when opened
    setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 0);

    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    // Use a very high z-index inline style to ensure the modal sits above Leaflet/map panes
    <div className="fixed inset-0 flex items-center justify-center overflow-auto py-6" style={{ zIndex: 999999 }}>
      <div className="absolute inset-0 bg-black opacity-40" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-title"
        className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6 z-20 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between">
          <h3 id="info-title" className="text-xl font-semibold text-gray-800">
            {t('info.title')}
          </h3>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close information dialog"
            className="ml-4 rounded-md p-1 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-700 space-y-3">
          <p>
            {t('info.description1')}
          </p>

          <p>
            {t('info.description2')}
          </p>
                  
          <p>
            {t('info.description3')}
          </p>
        </div>

        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {t('info.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
