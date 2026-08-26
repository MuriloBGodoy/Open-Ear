/**
 * SaveToLibrary — "e o áudio, guarda onde?", ao lado do botão de salvar.
 *
 * Aparece nos dois modos de transcrição, e nos dois pelo mesmo motivo: quando o
 * texto fica pronto, o áudio que o gerou está prestes a sumir. No modo arquivo
 * ele veio de um arrastar-e-soltar e o app nunca ficou com uma cópia; no modo ao
 * vivo ele nunca existiu como arquivo em lugar nenhum. Salvar a transcrição sem
 * perguntar isso é deixar a pessoa descobrir a perda depois.
 *
 * É OPT-IN, e desmarcado por padrão. Guardar sempre pareceria mais gentil, mas
 * uma conversa longa passa fácil de 50 MB e o app inteiro vive no dispositivo:
 * encher a cota do navegador de alguém em silêncio derruba a biblioteca toda,
 * inclusive os áudios que a pessoa escolheu guardar. Por isso o tamanho aparece
 * no rótulo — a decisão é dela, mas informada.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatBytes, type LibraryFolder } from '../lib/db';
import { IconCheck, IconLibrary } from './Icons';

/** `null` = solto na raiz. Só existe destino quando `enabled` é true. */
export interface SaveTarget {
  enabled: boolean;
  folderId: string | null;
}

interface SaveToLibraryProps {
  /** Tamanho do áudio que seria guardado, para o rótulo não pedir um cheque em branco. */
  sizeBytes: number;
  folders: LibraryFolder[];
  value: SaveTarget;
  onChange: (next: SaveTarget) => void;
  onCreateFolder: (name: string) => Promise<string>;
  disabled?: boolean;
}

/** Valor sentinela do <select>: abre o campo de nome em vez de escolher pasta. */
const NEW_FOLDER = '__new__';

export function SaveToLibrary({
  sizeBytes,
  folders,
  value,
  onChange,
  onCreateFolder,
  disabled = false,
}: SaveToLibraryProps) {
  const { t } = useTranslation();
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState('');

  const confirmCreate = async () => {
    const name = draftName.trim();
    if (!name) {
      setCreating(false);
      setDraftName('');
      return;
    }
    const id = await onCreateFolder(name);
    onChange({ enabled: true, folderId: id });
    setCreating(false);
    setDraftName('');
  };

  return (
    <div className="saveto" data-enabled={value.enabled}>
      <label className="saveto__toggle">
        <input
          type="checkbox"
          className="sr-only saveto__check"
          checked={value.enabled}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
        />
        <span className="saveto__box" aria-hidden="true">
          <IconCheck size={14} />
        </span>
        <span className="saveto__label">
          <IconLibrary size={18} className="saveto__icon" />
          {t('save.keepAudio')}
          <span className="meta">{formatBytes(sizeBytes)}</span>
        </span>
      </label>

      {/**
       * O destino só aparece depois de a pessoa decidir guardar. Mostrar um
       * seletor de pasta desabilitado ao lado de uma caixa desmarcada é oferecer
       * uma escolha que ainda não é escolha — e rouba uma parada da tabulação.
       */}
      {value.enabled && (
        <div className="saveto__where">
          {creating ? (
            <span className="saveto__newfolder">
              <input
                type="text"
                className="input input--inline"
                autoFocus
                value={draftName}
                placeholder={t('library.folderNamePlaceholder')}
                aria-label={t('library.newFolder')}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void confirmCreate();
                  if (e.key === 'Escape') {
                    setCreating(false);
                    setDraftName('');
                  }
                }}
              />
              <button type="button" className="btn btn--ghost" onClick={() => void confirmCreate()}>
                {t('library.createFolder')}
              </button>
            </span>
          ) : (
            <label className="saveto__select">
              <span className="saveto__selectlabel">{t('save.destination')}</span>
              <select
                className="select"
                value={value.folderId ?? ''}
                disabled={disabled}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next === NEW_FOLDER) {
                    setCreating(true);
                    return;
                  }
                  onChange({ enabled: true, folderId: next || null });
                }}
              >
                <option value="">{t('save.loose')}</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
                <option value={NEW_FOLDER}>{t('library.newFolder')}…</option>
              </select>
            </label>
          )}
        </div>
      )}
    </div>
  );
}
