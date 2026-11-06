import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ApplicationRecord } from '../types';
import { submitApplicationToFirestore } from '../services/firebaseApplications';
import { CheckCircle2, ArrowRight, RotateCcw } from 'lucide-react';

interface Props {
  onSubmitted?: (record: ApplicationRecord) => void;
  onViewAdmin?: () => void;
}

const EMAIL_TYPOS: Record<string, string> = {
  'gmail.con': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'naver.con': 'naver.com',
  'naver.co': 'naver.com',
  'naber.com': 'naver.com',
  'nave.com': 'naver.com',
  'daum.nett': 'daum.net',
  'nate.con': 'nate.com',
  'outlook.con': 'outlook.com',
};

const ORDER = ['name', 'email', 'phone', 'agree'] as const;
type FieldKey = typeof ORDER[number];

const FIELD_LABELS: Record<FieldKey, string> = {
  name: '이름',
  email: '이메일',
  phone: '휴대폰',
  agree: '개인정보 동의',
};

export const ApplicationFormView: React.FC<Props> = ({ onSubmitted, onViewAdmin }) => {
  const [name, setName] = useState('');
  const [org, setOrg] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [agree, setAgree] = useState(false);

  // Validation States
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [notices, setNotices] = useState<Partial<Record<FieldKey, string>>>({});
  const [suggestedEmail, setSuggestedEmail] = useState<string | null>(null);
  const [validFields, setValidFields] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [dirty, setDirty] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [typoShownFor, setTypoShownFor] = useState('');

  // Result State
  const [submittedData, setSubmittedData] = useState<ApplicationRecord | null>(null);

  // Refs for focusing
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const agreeRef = useRef<HTMLInputElement>(null);

  const noticeTimers = useRef<Partial<Record<FieldKey, NodeJS.Timeout>>>({});

  const showNotice = (field: FieldKey, text: string, persist = false) => {
    if (noticeTimers.current[field]) clearTimeout(noticeTimers.current[field]);
    setNotices(prev => ({ ...prev, [field]: text }));
    if (!persist) {
      noticeTimers.current[field] = setTimeout(() => {
        setNotices(prev => ({ ...prev, [field]: undefined }));
      }, 3000);
    }
  };

  const hideNotice = (field: FieldKey) => {
    if (noticeTimers.current[field]) clearTimeout(noticeTimers.current[field]);
    setNotices(prev => ({ ...prev, [field]: undefined }));
  };

  // Validators
  const checkName = (v: string): string => {
    if (!v) return '이름을 입력해 주세요.';
    if (v.length < 2) return '이름은 2자 이상 입력해 주세요.';
    if (!/^[가-힣a-zA-Z]+( [가-힣a-zA-Z]+)*$/.test(v)) return '이름에는 한글과 영문만 입력할 수 있어요.';
    return '';
  };

  const checkEmail = (v: string): string => {
    if (!v) return '이메일을 입력해 주세요.';
    if (!v.includes('@')) return '이메일에 @가 빠져 있어요. 예: example@email.com';
    const domain = v.slice(v.indexOf('@') + 1);
    if (!domain || !domain.includes('.') || domain.endsWith('.')) {
      return '@ 뒤에 주소를 입력해 주세요. 예: naver.com';
    }
    if (!/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$/.test(v)) {
      return '올바른 이메일 주소를 입력해 주세요. 예: example@email.com';
    }
    return '';
  };

  const typoFix = (v: string): string => {
    const atIdx = v.indexOf('@');
    if (atIdx === -1) return '';
    const domain = v.slice(atIdx + 1).toLowerCase();
    const correctedDomain = EMAIL_TYPOS[domain];
    if (correctedDomain) {
      return v.slice(0, atIdx + 1) + correctedDomain;
    }
    return '';
  };

  const checkPhone = (v: string): string => {
    if (!v) return '휴대폰 번호를 입력해 주세요.';
    const digits = v.replace(/\D/g, '');
    if (digits.length >= 3 && !/^01[016789]/.test(digits)) return '휴대폰 번호는 010으로 시작해요.';
    if (digits.length < 11) return '번호가 아직 짧아요. 숫자 11자리를 입력해 주세요.';
    if (!/^01[016789]-\d{3,4}-\d{4}$/.test(v)) return '휴대폰 번호를 올바르게 입력해 주세요. 예: 010-1234-5678';
    return '';
  };

  const checkAgree = (checked: boolean): string => {
    return checked ? '' : '개인정보 수집·이용에 동의해 주셔야 신청할 수 있어요.';
  };

  // Handlers for inputs
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const v = raw
      .replace(/[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z ]/g, '')
      .replace(/^ +/, '')
      .replace(/ {2,}/g, ' ');

    if (/[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z ]/.test(raw)) {
      showNotice('name', '이름에는 한글과 영문만 입력할 수 있어요. (숫자·특수문자 불가)');
    }
    setName(v);
    setDirty(prev => ({ ...prev, name: true }));
    setErrors(prev => ({ ...prev, name: undefined }));
    setValidFields(prev => ({ ...prev, name: false }));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const v = raw.replace(/[^\x21-\x7E]/g, '');
    hideNotice('email');
    setSuggestedEmail(null);
    if (v !== raw) {
      showNotice('email', '이메일에는 한글과 공백을 쓸 수 없어요.');
    }
    setEmail(v);
    setDirty(prev => ({ ...prev, email: true }));
    setErrors(prev => ({ ...prev, email: undefined }));
    setValidFields(prev => ({ ...prev, email: false }));
  };

  const applySuggestedEmail = () => {
    if (suggestedEmail) {
      setEmail(suggestedEmail);
      setSuggestedEmail(null);
      hideNotice('email');
      setValidFields(prev => ({ ...prev, email: true }));
      setErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (/[^\d-]/.test(raw)) {
      showNotice('phone', '휴대폰 번호는 숫자만 입력할 수 있어요.');
    }
    const d = raw.replace(/\D/g, '').slice(0, 11);
    let formatted = d;
    if (d.length >= 8) {
      formatted = `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
    } else if (d.length >= 4) {
      formatted = `${d.slice(0, 3)}-${d.slice(3)}`;
    }
    setPhone(formatted);
    setDirty(prev => ({ ...prev, phone: true }));
    setErrors(prev => ({ ...prev, phone: undefined }));
    setValidFields(prev => ({ ...prev, phone: false }));
  };

  // Blur checks
  const handleBlur = (field: FieldKey) => {
    if (!dirty[field]) return;
    validateField(field, false);
  };

  const validateField = (field: FieldKey, fromSubmit: boolean): boolean => {
    let err = '';
    let showValid = true;

    if (field === 'name') {
      err = checkName(name.trim());
    } else if (field === 'email') {
      const v = email.trim();
      hideNotice('email');
      err = checkEmail(v);
      if (!err) {
        const fixedEmail = typoFix(v);
        if (fixedEmail) {
          setSuggestedEmail(fixedEmail);
          if (fromSubmit && typoShownFor !== v) {
            setTypoShownFor(v);
            err = `혹시 ${fixedEmail} 아닌가요? 맞는 주소라면 그대로 한 번 더 제출해 주세요.`;
          } else if (!fromSubmit) {
            setTypoShownFor(v);
            showNotice('email', `혹시 ${fixedEmail} 아닌가요? [자동수정]을 누르거나 그대로 두셔도 돼요.`, true);
            setValidFields(prev => ({ ...prev, email: true }));
            setErrors(prev => ({ ...prev, email: undefined }));
            return true;
          }
        }
      }
    } else if (field === 'phone') {
      err = checkPhone(phone.trim());
    } else if (field === 'agree') {
      err = checkAgree(agree);
      showValid = false;
    }

    setErrors(prev => ({ ...prev, [field]: err || undefined }));
    setValidFields(prev => ({ ...prev, [field]: !err && showValid }));
    return !err;
  };

  const handleAgreeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setAgree(checked);
    setDirty(prev => ({ ...prev, agree: true }));
    if (checked || submitAttempted) {
      const err = checkAgree(checked);
      setErrors(prev => ({ ...prev, agree: err || undefined }));
    }
  };

  const focusField = (field: FieldKey) => {
    if (field === 'name') nameRef.current?.focus();
    else if (field === 'email') emailRef.current?.focus();
    else if (field === 'phone') phoneRef.current?.focus();
    else if (field === 'agree') agreeRef.current?.focus();
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    const rName = validateField('name', true);
    const rEmail = validateField('email', true);
    const rPhone = validateField('phone', true);
    const rAgree = validateField('agree', true);

    const allValid = rName && rEmail && rPhone && rAgree;

    if (!allValid) {
      if (!rName) focusField('name');
      else if (!rEmail) focusField('email');
      else if (!rPhone) focusField('phone');
      else if (!rAgree) focusField('agree');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Submit to Firebase Firestore & Google Sheets
      const newRecord = await submitApplicationToFirestore({
        name: name.trim(),
        org: org.trim(),
        email: email.trim(),
        phone: phone.trim(),
        message: message.trim(),
        agree,
      });

      setSubmittedData(newRecord);
      if (onSubmitted) onSubmitted(newRecord);

      // Confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Submission failed', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setName('');
    setOrg('');
    setEmail('');
    setPhone('');
    setMessage('');
    setAgree(false);
    setErrors({});
    setNotices({});
    setSuggestedEmail(null);
    setValidFields({});
    setDirty({});
    setSubmitAttempted(false);
    setTypoShownFor('');
    setSubmittedData(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Count active errors for error summary
  const activeErrors = ORDER.filter(key => !!errors[key]);

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Submitter Success Screen */}
      {submittedData ? (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-7 sm:p-9 text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-4 shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-2">접수가 완료되었습니다 🎉</h2>
          <p className="text-slate-600 text-sm mb-6">
            신청서가 실시간 클라우드 DB에 안전하게 접수되었습니다.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-left text-sm text-slate-700 space-y-2 mb-6 font-mono leading-relaxed">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-sans">접수 번호</span>
              <span className="font-semibold text-blue-600">{submittedData.id}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-sans">이름</span>
              <span className="font-bold text-slate-900">{submittedData.name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-sans">소속</span>
              <span>{submittedData.org || '(미입력)'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-sans">이메일</span>
              <span>{submittedData.email}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-sans">휴대폰 번호</span>
              <span>{submittedData.phone}</span>
            </div>
            <div className="border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-sans block mb-1">질문이나 요청:</span>
              <p className="font-sans text-slate-800 bg-white p-2.5 rounded border border-slate-200 text-xs sm:text-sm whitespace-pre-wrap">
                {submittedData.message || '(없음)'}
              </p>
            </div>
            <div className="flex justify-between pt-1 text-xs text-slate-500 font-sans">
              <span>접수 일시:</span>
              <span>{submittedData.submittedAt}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-medium transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              새 신청서 작성
            </button>
            {onViewAdmin && (
              <button
                type="button"
                onClick={onViewAdmin}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition cursor-pointer shadow-md shadow-blue-500/20"
              >
                접수자 현황 목록 보기
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Form Card */
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-6 sm:p-9 relative">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">신청서 접수</h1>
          <p className="text-slate-600 text-sm mb-6">
            아래 내용을 작성해 주세요. <span className="text-rose-600 font-bold">*</span> 표시는 필수 항목입니다.
          </p>

          {/* Sticky Error Summary (Exact feature from original) */}
          {submitAttempted && activeErrors.length > 0 && (
            <div
              role="alert"
              className="sticky top-4 z-20 bg-rose-50 border border-rose-300 rounded-xl p-3.5 mb-6 text-sm text-rose-800 shadow-sm animate-shake"
            >
              <strong>확인이 필요한 항목이 {activeErrors.length}개 있어요: </strong>
              <span className="inline-flex flex-wrap gap-1 mt-1 sm:mt-0">
                {activeErrors.map((key, idx) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => focusField(key)}
                    className="underline text-rose-700 font-semibold hover:text-rose-900 cursor-pointer"
                  >
                    {FIELD_LABELS[key]}
                    {idx < activeErrors.length - 1 ? ',' : ''}
                  </button>
                ))}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* 1. Name */}
            <div className={`space-y-1.5 ${errors.name ? 'text-rose-600' : ''}`}>
              <div className="flex justify-between items-center">
                <label htmlFor="name" className="block text-sm font-bold text-slate-800">
                  이름 <span className="text-rose-600">*</span>
                </label>
                {validFields.name && (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    ✓ 확인됐어요
                  </span>
                )}
              </div>
              <input
                ref={nameRef}
                id="name"
                type="text"
                value={name}
                onChange={handleNameChange}
                onBlur={() => handleBlur('name')}
                placeholder="홍길동"
                maxLength={20}
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition outline-none ${
                  errors.name
                    ? 'border-rose-500 bg-rose-50/30 ring-2 ring-rose-200'
                    : validFields.name
                    ? 'border-emerald-500 bg-emerald-50/20'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                }`}
              />
              <p className="text-xs text-slate-500">
                한글, 영문만 입력할 수 있어요. (2~20자, 숫자·특수문자 불가)
              </p>
              {notices.name && (
                <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded font-medium animate-pulse">
                  {notices.name}
                </p>
              )}
              {errors.name && (
                <p className="text-xs text-rose-600 font-medium">{errors.name}</p>
              )}
            </div>

            {/* 2. Organization (Optional) */}
            <div className="space-y-1.5">
              <label htmlFor="org" className="block text-sm font-bold text-slate-800">
                소속 <span className="text-slate-400 font-normal text-xs">(선택)</span>
              </label>
              <input
                id="org"
                type="text"
                value={org}
                onChange={e => setOrg(e.target.value)}
                placeholder="학교, 회사, 단체 이름 (선택)"
                maxLength={50}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* 3. Email */}
            <div className={`space-y-1.5 ${errors.email ? 'text-rose-600' : ''}`}>
              <div className="flex justify-between items-center">
                <label htmlFor="email" className="block text-sm font-bold text-slate-800">
                  이메일 <span className="text-rose-600">*</span>
                </label>
                {validFields.email && (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    ✓ 확인됐어요
                  </span>
                )}
              </div>
              <input
                ref={emailRef}
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={() => handleBlur('email')}
                placeholder="example@email.com"
                maxLength={100}
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition outline-none ${
                  errors.email
                    ? 'border-rose-500 bg-rose-50/30 ring-2 ring-rose-200'
                    : validFields.email
                    ? 'border-emerald-500 bg-emerald-50/20'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                }`}
              />
              <p className="text-xs text-slate-500">
                영문, 숫자, 기호만 입력할 수 있어요. (공백·한글 불가)
              </p>

              {/* Typo suggestion banner */}
              {suggestedEmail && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-900">
                  <span>혹시 <strong>{suggestedEmail}</strong> 아닌가요?</span>
                  <button
                    type="button"
                    onClick={applySuggestedEmail}
                    className="ml-2 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold cursor-pointer shadow-sm transition"
                  >
                    이메일 자동수정
                  </button>
                </div>
              )}

              {notices.email && !suggestedEmail && (
                <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded font-medium animate-pulse">
                  {notices.email}
                </p>
              )}
              {errors.email && (
                <p className="text-xs text-rose-600 font-medium">{errors.email}</p>
              )}
            </div>

            {/* 4. Phone */}
            <div className={`space-y-1.5 ${errors.phone ? 'text-rose-600' : ''}`}>
              <div className="flex justify-between items-center">
                <label htmlFor="phone" className="block text-sm font-bold text-slate-800">
                  휴대폰 <span className="text-rose-600">*</span>
                </label>
                {validFields.phone && (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    ✓ 확인됐어요
                  </span>
                )}
              </div>
              <input
                ref={phoneRef}
                id="phone"
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                onBlur={() => handleBlur('phone')}
                placeholder="010-1234-5678"
                maxLength={13}
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition outline-none ${
                  errors.phone
                    ? 'border-rose-500 bg-rose-50/30 ring-2 ring-rose-200'
                    : validFields.phone
                    ? 'border-emerald-500 bg-emerald-50/20'
                    : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                }`}
              />
              <p className="text-xs text-slate-500">
                숫자만 입력하면 하이픈(-)이 자동으로 들어가요.
              </p>
              {notices.phone && (
                <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded font-medium animate-pulse">
                  {notices.phone}
                </p>
              )}
              {errors.phone && (
                <p className="text-xs text-rose-600 font-medium">{errors.phone}</p>
              )}
            </div>

            {/* 5. Message / Question (Optional with 500 Char Counter) */}
            <div className="space-y-1.5">
              <label htmlFor="message" className="block text-sm font-bold text-slate-800">
                하고 싶은 질문이나 요청 <span className="text-slate-400 font-normal text-xs">(선택)</span>
              </label>
              <textarea
                id="message"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="궁금한 점이나 요청 사항을 자유롭게 적어 주세요."
                maxLength={500}
                rows={4}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-y"
              />
              <div
                className={`text-right text-xs transition ${
                  message.length >= 450 ? 'text-amber-600 font-bold' : 'text-slate-500'
                }`}
              >
                {message.length >= 450
                  ? `500자까지 쓸 수 있어요. 지금 ${500 - message.length}자 남았어요.`
                  : `${message.length} / 500자`}
              </div>
            </div>

            {/* 6. Privacy Agreement */}
            <div className="space-y-2 pt-1">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-800 font-semibold block mb-1">
                  개인정보 수집·이용 안내
                </strong>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  <li>수집 항목: 이름, 소속(선택), 이메일, 휴대폰 번호</li>
                  <li>수집 목적: 신청 접수 확인 및 문의 답변</li>
                  <li>보유 기간: 목적 달성 후 지체 없이 파기</li>
                  <li>동의를 거부할 수 있으나, 거부 시 신청이 제한됩니다.</li>
                </ul>

                <label className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2 text-sm font-bold text-slate-800 cursor-pointer">
                  <input
                    ref={agreeRef}
                    type="checkbox"
                    checked={agree}
                    onChange={handleAgreeChange}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                  <span>개인정보 수집·이용에 동의합니다. <span className="text-rose-600">*</span></span>
                </label>
              </div>
              {errors.agree && (
                <p className="text-xs text-rose-600 font-medium pl-1">{errors.agree}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3.5 px-4 rounded-xl text-white font-bold text-base shadow-lg transition cursor-pointer flex items-center justify-center gap-2 ${
                isSubmitting
                  ? 'bg-blue-400 cursor-not-allowed shadow-none'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-blue-500/25'
              }`}
            >
              {isSubmitting ? (
                <span>접수 처리 중...</span>
              ) : (
                <span>신청서 제출</span>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
