/**
 * db.ts — armazenamento local em IndexedDB.
 *
 * Três coisas moram aqui:
 *   - `sessions` → transcrições salvas
 *   - `files`    → a biblioteca de áudios que o usuário deixa prontos
 *   - `folders`  → as pastas em que ele organiza esses áudios
 *
 * A pasta é um registro separado, e o arquivo só guarda o `folderId`. O inverso
 * — a pasta carregar a lista de ids — obrigaria a reescrever a pasta inteira a
 * cada arquivo movido, e deixaria dois lugares podendo discordar sobre onde um
 * áudio está.
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
  /**
   * Ausente = solto na raiz. É ausência e não uma pasta "root" fictícia porque
   * os arquivos que já existiam antes das pastas precisam continuar válidos sem
   * reescrever registro nenhum na migração.
   */
  folderId?: string;
}

export interface LibraryFolder {
  id: string;
  name: string;
  createdAt: number;
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
  folders: {
    key: string;
    value: LibraryFolder;
    indexes: { 'by-date': number };
  };
}

let dbPromise: Promise<IDBPDatabase<OpenEarDB>> | null = null;

/**
 * v1 → v2 acrescentou as pastas.
 *
 * `upgrade` roda em CADA salto de versão, e o navegador de quem já usava o app
 * chega aqui com `oldVersion === 1` — as stores de v1 já existem e recriá-las
 * lançaria ConstraintError, levando junto a biblioteca inteira da pessoa. Daí os
 * degraus: cada bloco cuida só do que a sua versão introduziu.
 *
 * Os arquivos de v1 ficam sem `folderId`, o que já significa "solto na raiz".
 * Nada a reescrever — a migração é só a store nova.
 */
function db() {
  dbPromise ??= openDB<OpenEarDB>('openear', 2, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        const sessions = database.createObjectStore('sessions', { keyPath: 'id' });
        sessions.createIndex('by-date', 'createdAt');

        const files = database.createObjectStore('files', { keyPath: 'id' });
        files.createIndex('by-date', 'addedAt');
      }

      if (oldVersion < 2) {
        const folders = database.createObjectStore('folders', { keyPath: 'id' });
        folders.createIndex('by-date', 'createdAt');
      }
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

export async function addLibraryFile(file: File, folderId?: string): Promise<LibraryFile> {
  // Cópia própria: o File original aponta para o disco e pode sumir depois.
  const blob = new Blob([await file.arrayBuffer()], { type: file.type });
  return addLibraryBlob(blob, file.name, folderId);
}

/**
 * Mesma coisa, mas para áudio que o app produziu em vez de o usuário ter
 * escolhido: o WAV montado a partir de uma sessão ao vivo, ou o arquivo que
 * chegou por drag-and-drop no transcritor e ainda não estava guardado.
 */
export async function addLibraryBlob(
  blob: Blob,
  name: string,
  folderId?: string
): Promise<LibraryFile> {
  const record: LibraryFile = {
    id: crypto.randomUUID(),
    name,
    addedAt: Date.now(),
    size: blob.size,
    type: blob.type,
    blob,
    // Só grava a chave quando há pasta: `folderId: undefined` viraria uma
    // propriedade presente e valendo undefined, e os filtros comparam ausência.
    ...(folderId ? { folderId } : {}),
  };
  await (await db()).put('files', record);
  return record;
}

/**
 * Move um arquivo entre pastas. `null` devolve para a raiz — e aí a chave é
 * REMOVIDA do registro, não zerada, para "solto" ter uma representação só.
 */
export async function moveFileToFolder(fileId: string, folderId: string | null): Promise<void> {
  const database = await db();
  const record = await database.get('files', fileId);
  if (!record) return;

  const { folderId: _current, ...rest } = record;
  await database.put('files', folderId ? { ...rest, folderId } : rest);
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

/* ------------------------------------------------------------- pastas ---- */

/** Mais antigas primeiro: a ordem da grade não deve dançar a cada pasta nova. */
export async function listFolders(): Promise<LibraryFolder[]> {
  return (await db()).getAllFromIndex('folders', 'by-date');
}

export async function createFolder(name: string): Promise<LibraryFolder> {
  const record: LibraryFolder = {
    id: crypto.randomUUID(),
    name: name.trim() || 'Sem nome',
    createdAt: Date.now(),
  };
  await (await db()).put('folders', record);
  return record;
}

export async function renameFolder(id: string, name: string): Promise<void> {
  const database = await db();
  const record = await database.get('folders', id);
  if (!record) return;
  const clean = name.trim();
  if (!clean) return; // renomear para vazio some com a pasta da vista; ignora.
  await database.put('folders', { ...record, name: clean });
}

/**
 * Apagar a pasta NUNCA apaga os áudios: eles voltam para a raiz.
 *
 * Uma pasta é organização, e áudio é o dado que a pessoa não consegue recuperar
 * — o arquivo original pode já ter sumido do disco dela, e a gravação ao vivo
 * nunca existiu em outro lugar. Quem quiser apagar os áudios apaga um a um, com
 * o botão que diz que apaga áudio.
 *
 * A varredura e a escrita vão numa transação só: se der ruim no meio, nenhum
 * arquivo fica órfão apontando para uma pasta que não existe mais.
 */
export async function deleteFolder(id: string): Promise<void> {
  const database = await db();
  const tx = database.transaction(['files', 'folders'], 'readwrite');
  const files = tx.objectStore('files');

  for (const record of await files.getAll()) {
    if (record.folderId !== id) continue;
    const { folderId: _dropped, ...rest } = record;
    await files.put(rest);
  }

  await tx.objectStore('folders').delete(id);
  await tx.done;
}

/* ------------------------------------------------------------- geral ---- */

export async function clearAll(): Promise<void> {
  const database = await db();
  await Promise.all([
    database.clear('sessions'),
    database.clear('files'),
    database.clear('folders'),
  ]);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
