export interface ApplicationRecord {
  id: string;
  name: string;
  org: string;
  email: string;
  phone: string;
  message: string;
  agree: boolean;
  submittedAt: string;
  status: '접수완료' | '확인중' | '참석확정' | '취소됨';
  notes?: string;
  sheetsSynced?: boolean;
}

export interface GoogleSheetsConfig {
  webhookUrl: string;
  enabled: boolean;
  autoSync: boolean;
  lastSyncedAt?: string;
}
