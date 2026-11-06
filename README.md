# 스마트 이벤트 신청서 (Event Application Form)

깃허브 및 Vercel 기반의 단일 HTML 신청서를 구글 AI 스튜디오로 불러와 고도화한 실시간 이벤트 신청 및 관리 시스템입니다.

## 🌟 주요 기능
1. **신청서 접수 (참가자용)**
   - 이름 실시간 검증 (한글/영문 2~20자)
   - 이메일 흔한 오타(`gmail.con`, `naver.con` 등) 자동 교정 제안
   - 휴대폰 번호 010 자동 하이픈 포맷팅
   - 500자 질문/요청 글자 수 카운터 및 경고
   - 개인정보 수집·이용 동의
   - 오류 요약 및 클릭 시 자동 포커스

2. **Firebase Firestore 실시간 연동**
   - 신청서 제출 시 Firestore 클라우드 데이터베이스에 실시간 영구 저장
   - 관리자 화면에서 `onSnapshot`을 통해 새로고침 없이 실시간으로 신청자 명단 누적

3. **Google 스프레드시트 자동 누적**
   - Google Apps Script Web App과 연동하여 신청 즉시 구글 시트에 1개 행으로 자동 누적 기록
   - 관리자 화면에서 웹훅 URL 등록 및 1클릭 테스트, 일괄 동기화 지원

4. **비밀번호 보호 관리자 대시보드**
   - 주최자 전용 비밀번호 인증 (초기 기본 비밀번호: `admin1234`)
   - 신청자 검색, 상태 변경 (접수완료 / 확인중 / 참석확정 / 취소됨)
   - 신청서 삭제 기능 (Firestore 실시간 동기화)
   - 엑셀/스프레드시트용 CSV 다운로드 (UTF-8 BOM 적용으로 한글 깨짐 없음)

---

## 🚀 설치 및 로컬 실행

```bash
# 패키지 설치
npm install

# 개발 서버 실행 (포트 3000)
npm run dev

# 프로덕션 빌드
npm run build
```

---

## ☁️ 배포 안내

### 1. 구글 AI 스튜디오 (Google Cloud Run) 배포
- 구글 AI 스튜디오 화면 우측 상단의 **[Publish]** 버튼을 클릭하여 Cloud Run으로 즉시 배포 가능합니다.
- (구글 클라우드 프로젝트 및 결제 계정 연결 필요)

### 2. Vercel 배포
- 깃허브 레포지토리(`sylvvuu/application-form`)를 Vercel과 연동하면 Vite 프로젝트로 자동 감지되어 배포됩니다.
  - Build Command: `npm run build`
  - Output Directory: `dist`
