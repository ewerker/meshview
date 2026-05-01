import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useI18n } from '@/lib/i18n/I18nContext.jsx';

const copy = {
  de: {
    title: 'Seite nicht gefunden',
    message: 'Die Seite „{{page}}“ konnte in dieser Anwendung nicht gefunden werden.',
    adminTitle: 'Admin-Hinweis',
    adminText: 'Das kann bedeuten, dass diese Seite noch nicht umgesetzt wurde.',
    home: 'Zur Startseite',
  },
  en: {
    title: 'Page not found',
    message: 'The page “{{page}}” could not be found in this application.',
    adminTitle: 'Admin note',
    adminText: 'This may mean that this page has not been implemented yet.',
    home: 'Go home',
  },
};

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1);
  const { language } = useI18n();
  const c = copy[language] || copy.de;

  const { data: authData, isFetched } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        return { user, isAuthenticated: true };
      } catch (error) {
        return { user: null, isAuthenticated: false };
      }
    }
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
      <div className="max-w-md w-full">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-7xl font-light text-slate-300 dark:text-slate-600">404</h1>
            <div className="h-0.5 w-16 bg-slate-200 dark:bg-slate-700 mx-auto"></div>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-medium text-slate-800 dark:text-slate-100">{c.title}</h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {c.message.replace('{{page}}', pageName)}
            </p>
          </div>

          {isFetched && authData.isAuthenticated && authData.user?.role === 'admin' && (
            <div className="mt-8 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                </div>
                <div className="text-left space-y-1">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{c.adminTitle}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{c.adminText}</p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-6">
            <button
              onClick={() => window.location.href = '/'}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {c.home}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}