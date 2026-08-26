/**
 * db.ts — armazenamento local em IndexedDB.
 *
 * Duas coisas moram aqui:
 *   - `sessions` → transcrições salvas
 *   - `files`    → a biblioteca de áudios que o usuário deixa prontos
 *
 * Tudo fica no dispositivo: sem conta, sem servidor, sem sincronização. Áudio de
 * conversa é dado sensível — o backend recebe o som, transcreve e esquece.
 *
 * IndexedDB guarda Blob nativamente, então o áudio da biblioteca não precisa de
 * base64 (que inflaria 33% e travaria a thread na conversão).
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface TranscriptionSession {
  id: string;
  title: string;
  createdAt: number;
  mode: 'live' | 'file';
  durationSeconds: number;
  text: string;
}

export interface LibraryFile {
  id: string;
  name: string;
  addedAt: number;
  size: number;
  type: string;
  blob: Blob;
  /** Preenchido depois de transcrever — aponta para a sessão gerada. */
  sessionId?: string;
}

interface OpenEarDB extends DBSchema {
  sessions: {
    key: string;
    value: TranscriptionSession;
    indexes: { 'by-date': number };
  };
  files: {
    key: string;
    value: LibraryFile;
    indexes: { 'by-date': number };
  };
}

let dbPromise: Promise<IDBPDatabase<OpenEarDB>> | null = null;

function db() {
  dbPromise ??= openDB<OpenEarDB>('openear', 1, {
    upgrade(database) {
      const sessions = database.createObjectStore('sessions', { keyPath: 'id' });
      sessions.createIndex('by-date', 'createdAt');

      const files = database.createObjectStore('files', { keyPath: 'id' });
      files.createIndex('by-date', 'addedAt');
    },
  });
  return dbPromise;
}

/* ------------------------------------------------------------- sessões ---- */

/** Primeira linha significativa do texto — vira o rótulo na lista. */
export function deriveTitle(text: string, fallback: string): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (!clean) return fallback;
  return clean.length > 64 ? `${clean.slice(0, 64)}…` : clean;
}

export async function saveSession(
  session: Omit<TranscriptionSession, 'id' | 'createdAt'>
): Promise<TranscriptionSession> {
  const record: TranscriptionSession = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    ...session,
  };
  await (await db()).put('sessions', record);
  return record;
}

/** Mais recentes primeiro. */
export async function listSessions(): Promise<TranscriptionSession[]> {
  const all = await (await db()).getAllFromIndex('sessions', 'by-date');
  return all.reverse();
}

export async function deleteSession(id: string): Promise<void> {
  await (await db()).delete('sessions', id);
}

/* --------------------------------------------------------- biblioteca ---- */

export async function addLibraryFile(file: File): Promise<LibraryFile> {
  const record: LibraryFile = {
    id: crypto.randomUUID(),
    name: file.name,
    addedAt: Date.now(),
    size: file.size,
    type: file.type,
    // Cópia própria: o File original aponta para o disco e pode sumir depois.
    blob: new Blob([await file.arrayBuffer()], { type: file.type }),
  };
  await (await db()).put('files', record);
  return record;
}

/** Mais recentes primeiro. */
export async function listLibraryFiles(): Promise<LibraryFile[]> {
  const all = await (await db()).getAllFromIndex('files', 'by-date');
  return all.reverse();
}

export async function getLibraryFile(id: string): Promise<LibraryFile | undefined> {
  return (await db()).get('files', id);
}

export async function markFileTranscribed(id: string, sessionId: string): Promise<void> {
  const database = await db();
  const record = await database.get('files', id);
  if (!record) return;
  await database.put('files', { ...record, sessionId });
}

export async function deleteLibraryFile(id: string): Promise<void> {
  await (await db()).delete('files', id);
}

/* ------------------------------------------------------------- geral ---- */

export async function clearAll(): Promise<void> {
  const database = await db();
  await Promise.all([database.clear('sessions'), database.clear('files')]);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
