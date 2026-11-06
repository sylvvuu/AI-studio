import { ApplicationRecord, GoogleSheetsConfig } from '../types';

const SHEETS_CONFIG_KEY = 'event_google_sheets_config_v1';

export const DEFAULT_GAS_SCRIPT = `// ============================================================
// [Google 스프레드시트 실시간 자동 누적 Apps Script]
// ============================================================
// 💡 [가장 쉬운 연동 방법 - 추천]
// 1. 데이터를 모을 '구글 스프레드시트'를 새로 엽니다.
// 2. 스프레드시트 상단 메뉴 > [확장 프로그램] > [Apps Script] 클릭
// 3. 기존 코드를 모두 지우고 아래 코드를 그대로 붙여넣은 뒤 저장(Ctrl+S)
// 4. 우측 상단 파란색 [배포] 버튼 > [새 배포] 클릭
// 5. 유형: [웹 앱], 액세스 권한: 반드시 "모든 사용자(Anyone)" 선택 후 [배포]!
// 6. 발급된 '웹 앱 URL'을 복사하여 관리자 화면에 등록하면 완료!
//
// 💡 [현재처럼 드라이브에서 직접 만든 'Untitled project' 창에서 할 때]
// - 아래 SPREADSHEET_URL에 본인의 구글 스프레드시트 주소를 따옴표 안에 넣어주세요!
var SPREADSHEET_URL = ""; // 예: "https://docs.google.com/spreadsheets/d/1xxxx/edit"

function getTargetSheet() {
  if (SPREADSHEET_URL && SPREADSHEET_URL.trim() !== "") {
    var val = SPREADSHEET_URL.trim();
    if (val.indexOf("http") === 0) {
      return SpreadsheetApp.openByUrl(val).getActiveSheet();
    } else {
      return SpreadsheetApp.openById(val).getActiveSheet();
    }
  }
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    return active.getActiveSheet();
  }
  throw new Error("연결된 스프레드시트를 찾을 수 없습니다. SPREADSHEET_URL 변수에 스프레드시트 주소를 입력하시거나, 구글 스프레드시트 상단 메뉴 [확장 프로그램 > Apps Script]에서 실행해주세요.");
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var sheet = getTargetSheet();
    var data;
    
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter;
      }
    } else {
      data = e.parameter || {};
    }

    // 시트가 비어있으면 1행에 헤더 자동 생성
    if (sheet.getLastRow() === 0) {
      var headers = [
        "접수일시",
        "접수번호",
        "이름",
        "소속",
        "이메일",
        "휴대폰 번호",
        "진행상태",
        "질문 및 요청사항"
      ];
      sheet.appendRow(headers);

      // 헤더 스타일 서식 지정 (네이비 배경 + 흰색 볼드 텍스트)
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#1e293b");
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      headerRange.setHorizontalAlignment("center");
      headerRange.setVerticalAlignment("middle");
      sheet.setRowHeight(1, 36);
    }

    // 신규 신청자 데이터 1행 추가
    sheet.appendRow([
      data.submittedAt || new Date().toLocaleString("ko-KR"),
      data.id || "",
      data.name || "",
      data.org || "(미입력)",
      data.email || "",
      data.phone || "",
      data.status || "접수완료",
      data.message || ""
    ]);

    // 열 너비 자동 맞춤
    for (var col = 1; col <= 8; col++) {
      sheet.autoResizeColumn(col);
    }

    return ContentService.createTextOutput(JSON.stringify({ result: "success", id: data.id }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// 웹 브라우저에서 URL 접속 시 연결 확인용
function doGet(e) {
  return ContentService.createTextOutput("✅ Google Sheets 웹훅이 정상적으로 연결되어 배포되었습니다! 이제 신청서가 제출되면 이 시트로 실시간 자동 누적됩니다.")
    .setMimeType(ContentService.MimeType.TEXT);
}
`;

export function validateSheetsWebhookUrl(url: string): { valid: boolean; error?: string } {
  const trimmed = url.trim();
  if (!trimmed) {
    return { valid: false, error: '웹훅 URL을 입력해 주세요.' };
  }

  if (trimmed.includes('docs.google.com/spreadsheets')) {
    return {
      valid: false,
      error:
        '⚠️ 입력하신 주소는 스프레드시트 편집 주소(docs.google.com)입니다! 스프레드시트 상단 메뉴 [확장 프로그램 > Apps Script]에서 [배포 > 새 배포 > 웹 앱]으로 배포된 실행 URL(https://script.google.com/macros/s/.../exec)을 입력해야 자동으로 행이 추가됩니다.',
    };
  }

  if (!trimmed.startsWith('https://script.google.com/macros/s/')) {
    return {
      valid: false,
      error:
        '올바른 구글 웹 앱 URL 형태가 아닙니다. https://script.google.com/macros/s/.../exec 형태여야 합니다.',
    };
  }

  return { valid: true };
}

export function getGoogleSheetsConfig(): GoogleSheetsConfig {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(SHEETS_CONFIG_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load Google Sheets config', e);
  }
  return {
    webhookUrl: '',
    enabled: false,
    autoSync: true,
  };
}

export function saveGoogleSheetsConfig(config: GoogleSheetsConfig): void {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(SHEETS_CONFIG_KEY, JSON.stringify(config));
    }
  } catch (e) {
    console.error('Failed to save Google Sheets config', e);
  }
}

export async function sendToGoogleSheets(
  record: ApplicationRecord,
  customUrl?: string
): Promise<{ success: boolean; message: string }> {
  const config = getGoogleSheetsConfig();
  const targetUrl = customUrl || config.webhookUrl;

  if (!targetUrl || !targetUrl.trim()) {
    return { success: false, message: '구글 시트 웹훅 URL이 등록되지 않았습니다.' };
  }

  const urlCheck = validateSheetsWebhookUrl(targetUrl);
  if (!urlCheck.valid) {
    return { success: false, message: urlCheck.error || '잘못된 웹훅 URL입니다.' };
  }

  try {
    // Google Apps Script requires text/plain and no-cors mode for cross-origin browser post
    await fetch(targetUrl.trim(), {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(record),
    });

    const updatedConfig = { ...config, lastSyncedAt: new Date().toLocaleTimeString('ko-KR') };
    saveGoogleSheetsConfig(updatedConfig);

    return {
      success: true,
      message: '구글 스프레드시트에 행이 성공적으로 추가되었습니다!',
    };
  } catch (error) {
    console.warn('Google Sheets webhook dispatch error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '구글 시트 전송 중 오류가 발생했습니다.',
    };
  }
}
