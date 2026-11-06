import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { ApplicationRecord, GoogleSheetsConfig } from '../types';
import { sendToGoogleSheets, getGoogleSheetsConfig, saveGoogleSheetsConfig } from '../utils/googleSheets';

const COLLECTION_NAME = 'applications';
const SETTINGS_COLLECTION = 'settings';
const SHEETS_DOC_ID = 'googleSheets';

/**
 * Submit application to Firestore and trigger Google Sheets webhook
 */
export async function submitApplicationToFirestore(
  record: Omit<ApplicationRecord, 'id' | 'submittedAt' | 'status'>
): Promise<ApplicationRecord> {
  const now = new Date();
  const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
    2,
    '0'
  )}:${String(now.getSeconds()).padStart(2, '0')}`;

  const docId = 'app-' + Date.now();
  const newRecord: ApplicationRecord = {
    ...record,
    id: docId,
    submittedAt: formattedDate,
    status: '접수완료',
    sheetsSynced: false,
  };

  // 1. Persist directly to Firebase Firestore
  try {
    const docRef = doc(db, COLLECTION_NAME, docId);
    await setDoc(docRef, {
      id: newRecord.id,
      name: newRecord.name,
      org: newRecord.org || '',
      email: newRecord.email,
      phone: newRecord.phone,
      message: newRecord.message || '',
      agree: newRecord.agree,
      status: newRecord.status,
      submittedAt: newRecord.submittedAt,
      createdAt: serverTimestamp(),
    });
    console.log('✅ Firebase Firestore에 신청서가 저장되었습니다:', docId);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `${COLLECTION_NAME}/${docId}`);
  }

  // 2. Automatically dispatch to Google Sheets webhook from Firestore settings
  try {
    const sheetsDoc = await getDoc(doc(db, SETTINGS_COLLECTION, SHEETS_DOC_ID));
    let webhookUrl = '';
    if (sheetsDoc.exists()) {
      const data = sheetsDoc.data() as GoogleSheetsConfig;
      if (data.enabled && data.webhookUrl) {
        webhookUrl = data.webhookUrl;
      }
    }

    // Fallback to local config if firestore settings doc not created yet
    if (!webhookUrl) {
      const localConfig = getGoogleSheetsConfig();
      if (localConfig.enabled && localConfig.webhookUrl) {
        webhookUrl = localConfig.webhookUrl;
      }
    }

    if (webhookUrl) {
      console.log('📊 Google Sheets 웹훅으로 실시간 전송 중...');
      const result = await sendToGoogleSheets(newRecord, webhookUrl);
      if (result.success) {
        newRecord.sheetsSynced = true;
        // Update sheetsSynced status in Firestore
        try {
          await updateDoc(doc(db, COLLECTION_NAME, docId), { sheetsSynced: true });
        } catch {}
      }
    }
  } catch (sheetsErr) {
    console.warn('Google Sheets sync skipped or error:', sheetsErr);
  }

  return newRecord;
}

/**
 * Real-time subscription to applications in Firestore
 */
export function subscribeToApplications(
  onUpdate: (records: ApplicationRecord[]) => void,
  onError?: (error: unknown) => void
): () => void {
  try {
    const q = query(collection(db, COLLECTION_NAME));
    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const firestoreList: ApplicationRecord[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          firestoreList.push({
            id: docSnap.id,
            name: data.name || '',
            org: data.org || '',
            email: data.email || '',
            phone: data.phone || '',
            message: data.message || '',
            agree: !!data.agree,
            submittedAt: data.submittedAt || '',
            status: data.status || '접수완료',
            notes: data.notes || '',
            sheetsSynced: !!data.sheetsSynced,
          });
        });

        // Sort latest first by submittedAt
        firestoreList.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

        // Authoritative Firestore data only (no mock injection)
        onUpdate(firestoreList);
      },
      error => {
        handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
        if (onError) onError(error);
        onUpdate([]);
      }
    );

    return unsubscribe;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, COLLECTION_NAME);
    onUpdate([]);
    return () => {};
  }
}

/**
 * Update an application status or notes in Firestore
 */
export async function updateApplicationInFirestore(
  id: string,
  status: ApplicationRecord['status'],
  notes?: string
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const payload: Record<string, any> = { status };
    if (notes !== undefined) payload.notes = notes;
    await updateDoc(docRef, payload);
    console.log('✅ Firebase 상태 업데이트 완료:', id, status);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
  }
}

/**
 * Delete an application from Firestore
 */
export async function deleteApplicationFromFirestore(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    console.log('✅ Firebase 신청서 삭제 완료:', id);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
}

/**
 * Shared Google Sheets configuration in Firestore
 */
export async function getSharedSheetsConfig(): Promise<GoogleSheetsConfig> {
  try {
    const docSnap = await getDoc(doc(db, SETTINGS_COLLECTION, SHEETS_DOC_ID));
    if (docSnap.exists()) {
      const data = docSnap.data() as GoogleSheetsConfig;
      saveGoogleSheetsConfig(data); // sync local cache
      return data;
    }
  } catch (e) {
    console.warn('Could not read shared sheets config from Firestore', e);
  }
  return getGoogleSheetsConfig();
}

export async function saveSharedSheetsConfig(config: GoogleSheetsConfig): Promise<void> {
  saveGoogleSheetsConfig(config); // save locally
  try {
    await setDoc(doc(db, SETTINGS_COLLECTION, SHEETS_DOC_ID), {
      webhookUrl: config.webhookUrl,
      enabled: config.enabled,
      autoSync: config.autoSync,
      lastSyncedAt: config.lastSyncedAt || new Date().toLocaleString('ko-KR'),
    });
    console.log('✅ Google Sheets 설정이 Firestore에 공유 저장되었습니다.');
  } catch (e) {
    console.warn('Could not save shared sheets config to Firestore', e);
  }
}
