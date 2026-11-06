import React, { useState, useEffect } from 'react';
import { ApplicationFormView } from './components/ApplicationFormView';
import { AdminPage } from './pages/AdminPage';
import { ApplicationRecord } from './types';
import { FileText, CheckCircle2, Lock } from 'lucide-react';

export default function App() {
  const getInitialPath = (): string => {
    if (typeof window === 'undefined') return '/';
    const path = window.location.pathname;
    const hash = window.location.hash;
    if (path.startsWith('/admin') || hash === '#admin') {
      return '/admin';
    }
    return '/';
  };

  const [currentPath, setCurrentPath] = useState<string>(getInitialPath);
  const [recentToast, setRecentToast] = useState<string | null>(null);

  // Sync with browser URL popstate and hashchange
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path.startsWith('/admin') || hash === '#admin') {
        setCurrentPath('/admin');
      } else {
        setCurrentPath('/');
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigateTo = (path: string) => {
    try {
      window.history.pushState({}, '', path);
    } catch {
      window.location.hash = path === '/admin' ? '#admin' : '';
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitted = (record: ApplicationRecord) => {
    setRecentToast(`🎉 '${record.name}' 님의 신청서가 정상 접수되었습니다!`);
    setTimeout(() => setRecentToast(null), 3500);
  };

  const isAdminRoute = currentPath === '/admin';

  return (
    <div className="min-h-screen bg-[#f3f6fb] text-slate-900 flex flex-col font-sans antialiased selection:bg-blue-200">
      {/* Toast Notification */}
      {recentToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-sm font-medium animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{recentToast}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-3.5">
            {/* Logo / Title */}
            <div
              onClick={() => navigateTo('/')}
              className="flex items-center gap-2.5 cursor-pointer select-none"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  이벤트 신청서
                </h1>
                <p className="text-[11px] text-slate-500">
                  {isAdminRoute ? '주최자 관리자 모드' : '신청 접수 시스템'}
                </p>
              </div>
            </div>

            {/* Right link: If on admin route, show link back to form */}
            {isAdminRoute && (
              <button
                type="button"
                onClick={() => navigateTo('/')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                신청서 화면으로 이동
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        {isAdminRoute ? (
          /* /admin URL: Dedicated Organizer Admin Page */
          <AdminPage onGoToHome={() => navigateTo('/')} />
        ) : (
          /* / URL: Pure Applicant Registration Form */
          <ApplicationFormView onSubmitted={handleSubmitted} />
        )}
      </main>

      {/* Clean Minimal Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 text-center text-xs text-slate-400">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <span>이벤트 신청서 접수 시스템</span>
          {!isAdminRoute ? (
            <button
              type="button"
              onClick={() => navigateTo('/admin')}
              className="hover:text-slate-600 hover:underline flex items-center gap-1 cursor-pointer text-[11px] text-slate-400"
            >
              <Lock className="w-3 h-3" />
              주최자 관리 (/admin)
            </button>
          ) : (
            <span className="text-[11px] text-slate-400 font-mono">관리자 모드 실행 중</span>
          )}
        </div>
      </footer>
    </div>
  );
}
