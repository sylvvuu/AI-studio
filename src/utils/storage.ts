import { ApplicationRecord } from '../types';

const STORAGE_KEY = 'event_applications_data_v1';

export const INITIAL_RECORDS: ApplicationRecord[] = [];

export function getApplications(): ApplicationRecord[] {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load applications from localStorage', e);
  }
  return [];
}

export function saveApplication(record: Omit<ApplicationRecord, 'id' | 'submittedAt' | 'status'>): ApplicationRecord {
  const current = getApplications();
  const now = new Date();
  const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  
  const newRecord: ApplicationRecord = {
    ...record,
    id: 'app-' + Date.now(),
    submittedAt: formattedDate,
    status: '접수완료'
  };

  const updated = [newRecord, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return newRecord;
}

export function updateApplicationStatus(id: string, status: ApplicationRecord['status'], notes?: string): ApplicationRecord[] {
  const current = getApplications();
  const updated = current.map(item => {
    if (item.id === id) {
      return { ...item, status, ...(notes !== undefined ? { notes } : {}) };
    }
    return item;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteApplication(id: string): ApplicationRecord[] {
  const current = getApplications();
  const updated = current.filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function clearAllApplications(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
}

export function resetToSampleApplications(): ApplicationRecord[] {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_RECORDS));
  return INITIAL_RECORDS;
}
