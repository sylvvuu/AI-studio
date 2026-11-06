import React, { useState, useEffect } from 'react';
import { ApplicationRecord, GoogleSheetsConfig } from '../types';
import {
  subscribeToApplications,
  updateApplicationInFirestore,
  deleteApplicationFromFirestore,
  getSharedSheetsConfig,
  saveSharedSheetsConfig,
} from '../services/firebaseApplications';
import {
  sendToGoogleSheets,
  validateSheetsWebhookUrl,
  DEFAULT_GAS_SCRIPT,
} from '../utils/googleSheets';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { logoutAdmin, setAdminPassword, getAdminPassword } from '../utils/adminAuth';
import {
  Download,
  Trash2,
  Search,
  Filter,
  CheckCircle,
  Clock,
  UserCheck,
  XCircle,
  Copy,
  PlusCircle,
  RefreshCw,
  Mail,
  Phone,
  Building,
  Calendar,
  MessageSquare,
  LogOut,
  Key,
  Database,
  Table,
  Check,
  ExternalLink,
  ChevronRight,
  Send,
  Radio,
} from 'lucide-react';

interface Props {
  onGoToForm: () => void;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<Props> = ({ onGoToForm, onLogout }) => {
  const [records, setRecords] = useState<ApplicationRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<ApplicationRecord | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);

  // Google Sheets settings modal
  const [showSheetsModal, setShowSheetsModal] = useState(false);
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>({
    webhookUrl: '',
    enabled: false,
    autoSync: true,
  });
  const [sheetsWebhookInput, setSheetsWebhookInput] = useState('');
  const [sheetsSyncing, setSheetsSyncing] = useState(false);
  const [sheetsStatusMsg, setSheetsStatusMsg] = useState('');
  const [copiedScript, setCopiedScript] = useState(false);
  const [diagMsg, setDiagMsg] = useState('');
  const [diagLoading, setDiagLoading] = useState(false);

  // Change Password modal
  const [showPwModal, setShowPwModal] = useState(false);
  const [newPwInput, setNewPwInput] = useState('');
  const [pwChangeMsg, setPwChangeMsg] = useState('');

  // Load shared Google Sheets config from Firestore & subscribe to applications
  useEffect(() => {
    // 1. Fetch shared Google Sheets config
    getSharedSheetsConfig().then(cfg => {
      setSheetsConfig(cfg);
      setSheetsWebhookInput(cfg.webhookUrl);
    });

    // 2. Subscribe to applications
    setLiveConnected(true);
    const unsubscribe = subscribeToApplications(
      updatedRecords => {
        setRecords(updatedRecords);
        setLiveConnected(true);
      },
      err => {
        console.warn('Firestore subscription error', err);
        setLiveConnected(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (id: string, newStatus: ApplicationRecord['status']) => {
    await updateApplicationInFirestore(id, newStatus);
    if (selectedRecord && selectedRecord.id === id) {
      setSelectedRecord({ ...selectedRecord, status: newStatus });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`'${name}' 님의 신청서를 정말로 삭제하시겠습니까? (Firebase에서도 즉시 삭제됩니다)`)) {
      await deleteApplicationFromFirestore(id);
      if (selectedRecord?.id === id) {
        setSelectedRecord(null);
      }
    }
  };

  // Google Sheets Settings Handlers
  const handleSaveSheetsConfig = async () => {
    const trimmed = sheetsWebhookInput.trim();
    if (!trimmed) {
      setSheetsStatusMsg('⚠️ 웹훅 URL을 입력해 주세요.');
      return;
    }

    const validation = validateSheetsWebhookUrl(trimmed);
    if (!validation.valid) {
      setSheetsStatusMsg(validation.error || '잘못된 웹훅 URL 형식입니다.');
      return;
    }

    const updated: GoogleSheetsConfig = {
      ...sheetsConfig,
      webhookUrl: trimmed,
      enabled: true,
      autoSync: true,
    };
    await saveSharedSheetsConfig(updated);
    setSheetsConfig(updated);
    setSheetsStatusMsg('✅ 구글 시트 웹앱 주소가 모든 참가자 폼에 공유 저장되었습니다!');
    setTimeout(() => setSheetsStatusMsg(''), 4000);
  };

  const handleTestSheets = async () => {
    const trimmed = sheetsWebhookInput.trim();
    if (!trimmed) {
      setSheetsStatusMsg('⚠️ 웹훅 URL을 먼저 입력해 주세요.');
      return;
    }

    const validation = validateSheetsWebhookUrl(trimmed);
    if (!validation.valid) {
      setSheetsStatusMsg(validation.error || '잘못된 URL 형식입니다.');
      return;
    }

    setSheetsSyncing(true);
    setSheetsStatusMsg('구글 시트로 테스트 전송 중...');

    const testRecord: ApplicationRecord = {
      id: 'TEST-' + Math.floor(Math.random() * 1000),
      name: '테스트 신청자',
      org: '실시간 연동 확인',
      email: 'test@example.com',
      phone: '010-1234-5678',
      message: '구글 스프레드시트 실시간 누적 연동 테스트 성공!',
      agree: true,
      status: '접수완료',
      submittedAt: new Date().toLocaleString('ko-KR'),
    };

    const res = await sendToGoogleSheets(testRecord, trimmed);
    setSheetsSyncing(false);
    if (res.success) {
      setSheetsStatusMsg('🎉 구글 스프레드시트에 테스트 행이 성공적으로 추가되었습니다! 시트 화면을 확인해보세요.');
    } else {
      setSheetsStatusMsg(res.message);
    }
  };

  // Diagnostic Test for Firebase Firestore
  const handleTestFirebase = async () => {
    setDiagLoading(true);
    setDiagMsg('Firebase Firestore 실시간 데이터베이스 연결 테스트 중...');
    try {
      const pingId = 'ping-' + Date.now();
      await setDoc(doc(db, 'test', pingId), {
        ping: 'ok',
        timestamp: new Date().toISOString(),
      });
      const checkSnap = await getDoc(doc(db, 'test', pingId));
      if (checkSnap.exists()) {
        setDiagMsg('✅ Firebase Firestore 연결 정상! (데이터 읽기/쓰기 완벽 동작)');
      } else {
        setDiagMsg('⚠️ 쓰기 완료 확인 중');
      }
    } catch (e) {
      setDiagMsg('❌ Firestore 연결 오류: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setDiagLoading(false);
      setTimeout(() => setDiagMsg(''), 4000);
    }
  };

  const handleSyncAllToSheets = async () => {
    if (!sheetsConfig.webhookUrl) {
      setShowSheetsModal(true);
      return;
    }
    if (records.length === 0) {
      alert('동기화할 접수 내역이 없습니다.');
      return;
    }

    if (window.confirm(`총 ${records.length}건의 신청 데이터를 구글 시트에 일괄 전송하시겠습니까?`)) {
      setSheetsSyncing(true);
      let count = 0;
      for (const rec of records) {
        await sendToGoogleSheets(rec);
        count++;
      }
      setSheetsSyncing(false);
      alert(`총 ${count}건의 접수 데이터가 구글 스프레드시트에 전송되었습니다.`);
    }
  };

  const copyAppsScript = () => {
    navigator.clipboard.writeText(DEFAULT_GAS_SCRIPT);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  // Password change handler
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPwInput.trim() || newPwInput.trim().length < 4) {
      setPwChangeMsg('비밀번호는 최소 4자리 이상이어야 합니다.');
      return;
    }
    setAdminPassword(newPwInput.trim());
    setPwChangeMsg('✅ 관리자 비밀번호가 성공적으로 변경되었습니다.');
    setTimeout(() => {
      setPwChangeMsg('');
      setShowPwModal(false);
      setNewPwInput('');
    }, 1500);
  };

  // Export to CSV with BOM for Korean Excel compatibility
  const exportCSV = () => {
    if (records.length === 0) {
      alert('내보낼 접수 데이터가 없습니다.');
      return;
    }

    const headers = ['접수ID', '이름', '소속', '이메일', '연락처', '상태', '접수일시', '요청/질문', '관리자메모'];
    const rows = records.map(r => [
      `"${r.id}"`,
      `"${r.name.replace(/"/g, '""')}"`,
      `"${(r.org || '').replace(/"/g, '""')}"`,
      `"${r.email}"`,
      `"${r.phone}"`,
      `"${r.status}"`,
      `"${r.submittedAt}"`,
      `"${(r.message || '').replace(/"/g, '""')}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `이벤트_신청자명단_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(records, null, 2));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Filtering
  const filteredRecords = records.filter(item => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.phone.includes(searchTerm) ||
      (item.org && item.org.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.message && item.message.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: ApplicationRecord['status']) => {
    switch (status) {
      case '참석확정':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <UserCheck className="w-3 h-3" /> 참석확정
          </span>
        );
      case '확인중':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3" /> 확인중
          </span>
        );
      case '취소됨':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            <XCircle className="w-3 h-3" /> 취소됨
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <CheckCircle className="w-3 h-3" /> 접수완료
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Status & Admin Bar */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Firebase Firestore 실시간 연결됨</span>
          </div>

          {sheetsConfig.enabled && sheetsConfig.webhookUrl ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-1.5 rounded-xl">
              <Table className="w-3.5 h-3.5" />
              <span>Google Sheets 자동누적 활성</span>
            </div>
          ) : (
            <button
              onClick={() => setShowSheetsModal(true)}
              className="text-xs text-amber-300 hover:text-amber-200 bg-amber-950/60 border border-amber-800 px-2.5 py-1.5 rounded-xl inline-flex items-center gap-1 cursor-pointer font-bold animate-pulse"
            >
              <Table className="w-3.5 h-3.5" />
              <span>구글 시트 연동 URL 등록 필요</span>
            </button>
          )}

          <button
            onClick={handleTestFirebase}
            disabled={diagLoading}
            className="text-[11px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-700 transition cursor-pointer"
          >
            {diagLoading ? '진단 중...' : '⚡ DB 연결 진단'}
          </button>
        </div>

        {/* Admin Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSheetsModal(true)}
            className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-xs font-semibold text-white transition cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Table className="w-3.5 h-3.5 text-white" />
            구글 시트 설정
          </button>
          <button
            onClick={() => setShowPwModal(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition cursor-pointer flex items-center gap-1.5"
            title="관리자 비밀번호 변경"
          >
            <Key className="w-3.5 h-3.5 text-blue-400" />
            비번 변경
          </button>
          <button
            onClick={() => {
              logoutAdmin();
              onLogout();
            }}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            title="관리자 화면 로그아웃"
          >
            <LogOut className="w-3.5 h-3.5" />
            로그아웃
          </button>
        </div>
      </div>

      {/* Diagnostic message banner */}
      {diagMsg && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs font-medium flex items-center gap-2 animate-fade-in">
          <Database className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{diagMsg}</span>
        </div>
      )}

      {/* Google Sheets Alert banner when not configured */}
      {(!sheetsConfig.enabled || !sheetsConfig.webhookUrl) && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm">
            <Table className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <strong className="font-bold text-amber-900 block sm:inline">구글 스프레드시트 연동이 필요합니다: </strong>
              <span>참가자가 신청서를 작성할 때 구글 시트에 자동으로 행이 누적되려면 Apps Script 웹앱 URL을 1회 등록해 주셔야 합니다.</span>
            </div>
          </div>
          <button
            onClick={() => setShowSheetsModal(true)}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shrink-0 shadow-xs"
          >
            구글 시트 연동하기 (1분 소요)
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">실시간 총 신청자</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{records.length}명</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-emerald-600">참석 확정</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {records.filter(r => r.status === '참석확정').length}명
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-amber-600">접수 / 확인중</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">
            {records.filter(r => r.status === '확인중' || r.status === '접수완료').length}명
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-medium text-slate-500">취소 / 결원</div>
          <div className="text-2xl font-bold text-slate-700 mt-1">
            {records.filter(r => r.status === '취소됨').length}명
          </div>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search & Filter */}
        <div className="flex flex-1 w-full flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="이름, 이메일, 전화번호, 소속 검색..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 bg-white"
            >
              <option value="all">전체 상태 ({records.length})</option>
              <option value="접수완료">접수완료</option>
              <option value="확인중">확인중</option>
              <option value="참석확정">참석확정</option>
              <option value="취소됨">취소됨</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={handleSyncAllToSheets}
            disabled={sheetsSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer transition shadow-xs"
            title="구글 스프레드시트에 전체 누적 전송"
          >
            <Table className="w-3.5 h-3.5" />
            {sheetsSyncing ? '시트 전송 중...' : '구글 시트 일괄누적'}
          </button>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition shadow-xs"
            title="Excel 및 스프레드시트용 CSV 다운로드"
          >
            <Download className="w-3.5 h-3.5" />
            엑셀/CSV 다운로드
          </button>
          <button
            onClick={copyJSON}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition"
          >
            <Copy className="w-3.5 h-3.5" />
            {copySuccess ? '복사됨!' : 'JSON'}
          </button>
        </div>
      </div>

      {/* Main Grid: List + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table / List View */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800">
                실시간 접수 목록 ({filteredRecords.length}명)
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                실시간 연동
              </span>
            </div>
            <button
              onClick={onGoToForm}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              신청서 작성창 가기
            </button>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <p className="text-sm">현재 접수된 신청 내역이 없습니다.</p>
              <button
                onClick={onGoToForm}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                신청서 작성해보기
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">이름/소속</th>
                    <th className="px-4 py-3">연락처/이메일</th>
                    <th className="px-4 py-3">접수일시</th>
                    <th className="px-4 py-3">상태</th>
                    <th className="px-4 py-3 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map(item => {
                    const isSelected = selectedRecord?.id === item.id;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedRecord(item)}
                        className={`hover:bg-blue-50/50 cursor-pointer transition ${
                          isSelected ? 'bg-blue-50/80 font-medium' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-xs text-slate-500">{item.org || '(소속없음)'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-slate-800 font-mono">{item.phone}</div>
                          <div className="text-xs text-slate-500 font-mono truncate max-w-[160px]">
                            {item.email}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {item.submittedAt}
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleDelete(item.id, item.name);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition cursor-pointer"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 h-fit">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-3 mb-4">
            {selectedRecord ? '상세 신청 정보' : '신청서를 선택하세요'}
          </h3>

          {selectedRecord ? (
            <div className="space-y-4">
              <div>
                <span className="text-xs text-slate-500">신청자 이름</span>
                <div className="text-lg font-bold text-slate-900">{selectedRecord.name}</div>
              </div>

              <div className="space-y-2 text-sm text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-500 w-12">소속:</span>
                  <span className="font-medium">{selectedRecord.org || '(미입력)'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-500 w-12">이메일:</span>
                  <a
                    href={`mailto:${selectedRecord.email}`}
                    className="text-blue-600 hover:underline font-mono text-xs"
                  >
                    {selectedRecord.email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-500 w-12">연락처:</span>
                  <a
                    href={`tel:${selectedRecord.phone}`}
                    className="text-blue-600 hover:underline font-mono text-xs"
                  >
                    {selectedRecord.phone}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-500 w-12">접수일:</span>
                  <span className="text-xs font-mono">{selectedRecord.submittedAt}</span>
                </div>
              </div>

              {/* Inquiry / Message */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  질문이나 요청 사항
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs sm:text-sm text-slate-800 whitespace-pre-wrap min-h-[70px]">
                  {selectedRecord.message || '(작성된 질문 또는 요청 사항이 없습니다.)'}
                </div>
              </div>

              {/* Status Change Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  진행 상태 변경 (Firebase 실시간 저장)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['접수완료', '확인중', '참석확정', '취소됨'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleStatusChange(selectedRecord.id, st)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition cursor-pointer ${
                        selectedRecord.status === st
                          ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center text-xs text-slate-400 border-t border-slate-100">
                <span>Firestore 동기화됨</span>
                <button
                  onClick={() => handleDelete(selectedRecord.id, selectedRecord.name)}
                  className="text-rose-600 hover:underline cursor-pointer"
                >
                  신청서 완전 삭제
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              왼쪽 테이블에서 신청자를 클릭하면 상세 내용과 상태 변경 메뉴가 나타납니다.
            </div>
          )}
        </div>
      </div>

      {/* Google Sheets Modal */}
      {showSheetsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 bg-gradient-to-r from-emerald-700 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Table className="w-5 h-5 text-emerald-200" />
                <div>
                  <h3 className="font-bold text-base">Google 스프레드시트 자동 누적 설정</h3>
                  <p className="text-xs text-emerald-100">신청 즉시 구글 시트에 행으로 자동 추가</p>
                </div>
              </div>
              <button
                onClick={() => setShowSheetsModal(false)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              {/* Webhook Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Google Apps Script 웹 앱(Web App) URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={sheetsWebhookInput}
                    onChange={e => setSheetsWebhookInput(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500"
                  />
                  <button
                    onClick={handleSaveSheetsConfig}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                  >
                    저장
                  </button>
                </div>
                {sheetsStatusMsg && (
                  <p className="text-xs text-emerald-700 font-medium">{sheetsStatusMsg}</p>
                )}
              </div>

              {/* Test Button */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <span>설정한 구글 시트로 1개 행 전송 테스트:</span>
                <button
                  onClick={handleTestSheets}
                  disabled={sheetsSyncing}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg transition cursor-pointer"
                >
                  {sheetsSyncing ? '전송 중...' : '테스트 행 전송'}
                </button>
              </div>

              {/* 1-Minute Setup Guide */}
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-emerald-900">
                    💡 1분 만에 구글 시트 연동하는 방법
                  </span>
                  <button
                    onClick={copyAppsScript}
                    className="text-xs text-emerald-700 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedScript ? '코드 복사됨!' : 'Apps Script 코드 복사'}
                  </button>
                </div>
                <ol className="list-decimal pl-4 text-xs text-slate-700 space-y-1.5 leading-relaxed">
                  <li>새 <strong>구글 스프레드시트</strong>를 엽니다.</li>
                  <li>상단 메뉴에서 <strong>확장 프로그램 &gt; Apps Script</strong>를 클릭합니다.</li>
                  <li>기존 내용을 지우고, 위 [Apps Script 코드 복사] 버튼을 눌러 붙여넣고 저장(Ctrl+S)합니다.</li>
                  <li>우측 상단 <strong>[배포] &gt; [새 배포]</strong> 클릭 ➔ 톱니바퀴 아이콘에서 <strong>웹 앱</strong> 선택</li>
                  <li><strong>액세스 권한(Who has access)</strong>을 반드시 <strong>"모든 사용자(Anyone)"</strong>로 설정 후 [배포] 클릭</li>
                  <li>생성된 <strong>웹 앱 URL (https://script.google.com/macros/s/.../exec)</strong>을 위에 붙여넣고 [저장]!</li>
                  <li className="text-amber-800 font-semibold bg-amber-100/60 p-2 rounded">
                    📌 팁: `docs.google.com` 주소가 아닌 `script.google.com` 주소를 입력해야 자동으로 시트에 행이 추가됩니다.
                  </li>
                </ol>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowSheetsModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Key className="w-4 h-4 text-blue-400" /> 관리자 비밀번호 변경
              </h3>
              <button onClick={() => setShowPwModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleChangePassword} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">새 비밀번호</label>
                <input
                  type="password"
                  value={newPwInput}
                  onChange={e => setNewPwInput(e.target.value)}
                  placeholder="새 비밀번호 입력 (4자리 이상)"
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                  autoFocus
                />
                {pwChangeMsg && <p className="text-xs text-blue-600 mt-1 font-medium">{pwChangeMsg}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPwModal(false)}
                  className="flex-1 py-2 rounded-lg border text-xs"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs"
                >
                  변경 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
