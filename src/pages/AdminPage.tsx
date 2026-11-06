import React, { useState } from 'react';
import { AdminDashboard } from '../components/AdminDashboard';
import { loginAdmin, isAdminAuthenticated, logoutAdmin, DEFAULT_ADMIN_PASSWORD } from '../utils/adminAuth';
import { Lock, Eye, EyeOff, ShieldCheck, ArrowLeft, Key, FileText } from 'lucide-react';

interface Props {
  onGoToHome: () => void;
}

export const AdminPage: React.FC<Props> = ({ onGoToHome }) => {
  const [isAuth, setIsAuth] = useState<boolean>(isAdminAuthenticated());
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMsg('비밀번호를 입력해 주세요.');
      return;
    }

    const success = loginAdmin(password.trim());
    if (success) {
      setIsAuth(true);
      setErrorMsg('');
      setPassword('');
    } else {
      setErrorMsg('비밀번호가 올바르지 않습니다. 다시 입력해 주세요.');
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    setIsAuth(false);
  };

  const handleUseDefault = () => {
    setPassword(DEFAULT_ADMIN_PASSWORD);
  };

  // If not authenticated, show password prompt page
  if (!isAuth) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-blue-500/30">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold">주최자 관리자 로그인</h2>
            <p className="text-xs text-slate-300 mt-1 font-mono">
              접수자 관리 및 구글 시트 연동 (/admin)
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="p-6 sm:p-8 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                관리자 비밀번호
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="비밀번호 입력"
                  autoFocus
                  className="w-full pl-3.5 pr-10 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errorMsg && (
                <p className="text-xs text-rose-600 mt-1.5 font-medium">{errorMsg}</p>
              )}
            </div>

            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-center justify-between">
              <span className="text-[11px]">
                초기 기본 비밀번호: <code className="font-bold text-blue-700">admin1234</code>
              </span>
              <button
                type="button"
                onClick={handleUseDefault}
                className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
              >
                자동입력
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition cursor-pointer"
            >
              관리자 대시보드 접속
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={onGoToHome}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                참가자용 신청서 접수 화면으로 돌아가기 (/)
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // If authenticated, show full Admin Dashboard
  return (
    <div className="space-y-4">
      {/* Admin Subheader navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono text-xs font-bold">
            /admin
          </span>
          <span className="text-xs font-semibold text-slate-700">
            주최자 전용 접수 현황 대시보드
          </span>
        </div>

        <button
          type="button"
          onClick={onGoToHome}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition cursor-pointer border border-blue-200"
        >
          <FileText className="w-3.5 h-3.5" />
          참가자 신청 페이지 보기 (/)
        </button>
      </div>

      <AdminDashboard
        onGoToForm={onGoToHome}
        onLogout={handleLogout}
      />
    </div>
  );
};
