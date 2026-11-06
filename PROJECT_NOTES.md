# 이벤트 신청서 프로젝트 정리

같은 **이벤트 신청서**를 도구별로 만들어 비교한 프로젝트입니다. (AI 프로덕트 매니저 2주차 DAY 5, 2026-11-06)

## 버전과 주소

| 버전 | 도구 | 저장 위치 | 주소 | 코드 위치 |
|---|---|---|---|---|
| AI 스튜디오 신청서 | Google AI Studio (Publish) | Firestore | https://formai-automator.ai.studio/ | 이 저장소 루트 (`src/`) |
| 앱스스크립트 신청서 입력 | Google Apps Script | 구글 시트 (TEST) | https://script.google.com/macros/s/AKfycby5RvMl5sFLrRwj95uHMDf4Xw13fSfIBjQW5t7OO6EN3xUg4TuldoArBkIoY9Dgr8Qt/exec | `apps-script/form/` |
| 앱스스크립트 신청자 현황 | Google Apps Script | 구글 시트 (TEST) 읽기 | (관리 화면 배포 주소) | `apps-script/admin/` |
| 앱스스크립트 웹앱 (기타) | Google Apps Script | - | https://script.google.com/macros/s/AKfycbyBnzo3RMJoOD61sdIfvkGYw-D6VWZ0XkcIY1nnd2eOP_t6q_zGoJhZuFXZ8bYefyloTQ/exec | (코드 미포함) |
| Vercel 신청서 사이트 | Claude + Vercel | Vercel Blob | https://application-form-five-omega.vercel.app | 별도 저장소 `sylvvuu/application-form` |

## 기획 문서

- `docs/사용자입력_기획안.csv`: 입력 필드별 규칙, 예외 사항, 피드백 문구, 테스트 진행 현황
- 원본: [사용자입력_기획안 (구글 시트)](https://docs.google.com/spreadsheets/d/1XDapnSBWFQEHEo3dHSQuDWgl76j3nNqmJ8JVpagLODo/edit)

## 앱스스크립트 사용법

| 폴더 | 파일 | Apps Script에 넣는 법 |
|---|---|---|
| `apps-script/form/` | `Code.gs`, `form.html` | Code.gs 붙여넣기 + HTML 파일 `form` 추가 |
| `apps-script/admin/` | `Code.gs`, `index.html` | Code.gs 붙여넣기 + HTML 파일 `index` 추가 |

- HTML 파일 이름은 코드의 `'form'` / `'index'`와 **대소문자까지 같아야** 합니다.
- 코드를 바꾼 뒤에는 **배포 → 배포 관리 → ✏️ → 새 버전 → 배포**를 해야 주소에 반영됩니다.
- 신청자 현황 화면은 이름·휴대폰·이메일을 마스킹해서 보여 주고, 검색은 서버에서 원본으로 합니다 (2글자 이상).

## 비교 (도구별)

| 기준 | AI 스튜디오 | 앱스스크립트 | Vercel |
|---|---|---|---|
| 만드는 방법 | 말로 요청 | 코드 붙여넣기 | 코드 작성 후 배포 |
| 저장 위치 | Firestore | 구글 시트 | Vercel Blob |
| 데이터 확인 | Firebase 콘솔 | 시트에서 바로 | 관리자 페이지 |
| 배포 | Publish | 배포 → 웹 앱 | Vercel 배포 |
