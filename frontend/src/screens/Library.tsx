/**
 * Library — os áudios que o usuário deixa guardados.
 *
 * Por que isso existe: transcrever um arquivo grande leva minutos e depende de
 * rede. Separar "trazer o arquivo pra cá" de "transcrever agora" deixa a pessoa
 * juntar material quando é conveniente e mandar transcrever quando dá — em vez de
 * ter que achar o arquivo no seletor do sistema outra vez, no pior momento.
 *
 * O Blob fica no IndexedDB, então continua ali depois de fechar o app, offline, e
 * sem nunca ter subido pra servidor nenhum.
 */

import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  addLibraryFile,
  deleteLibraryFile,
  formatBytes,
  type LibraryFile,
} from '../lib/db';
import { useSettings } from '../context/SettingsContext';
import { ScreenHeader } from '../components/ScreenHeader';
import {
  IconCheck,
  IconClock,
  IconFile,
  IconLibrary,
  IconPlus,
  IconTrash,
} from '../components/Icons';

/**
 * Dois estados, e só dois: o arquivo já rendeu uma transcrição ou está esperando.
 * Não existe "transcrevendo" aqui — a transcrição acontece na tela do transcritor,
 * e uma barra de progresso nesta lista seria enfeite mentindo sobre trabalho.
 */
type Filter = 'all' | 'queued' | 'done';

const FILTERS: { value: Filter; key: string }[] = [
  { value: 'all', key: 'library.filterAll' },
  { value: 'queued', key: 'library.filterQueued' },
  { value: 'done', key: 'library.filterDone' },
];

interface LibraryProps {
  files: LibraryFile[];
  onChanged: () => void;
  onTranscribe: (id: string) => void;
  onOpenTranscript: (sessionId: string) => void;
}

export function Library({ files, onChanged, onTranscribe, onOpenTranscript }: LibraryProps) {
  const { t } = useTranslation();
  const { formatDate } = useSettings();
  const [dragOver, setDragOver] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => {
    if (filter === 'queued') return files.filter((f) => !f.sessionId);
    if (filter === 'done') return files.filter((f) => f.sessionId);
    return files;
  }, [files, filter]);

  const add = async (list: FileList | null) => {
    if (!list?.length) return;
    // Sequencial: cada arquivo é lido inteiro na memória antes de virar Blob, e
    // ler cinco áudios longos em paralelo é jeito garantido de estourar a aba.
    for (const file of Array.from(list)) {
      await addLibraryFile(file);
    }
    onChanged();
  };

  const total = files.reduce((sum, f) => sum + f.size, 0);
  /**
   * Com a biblioteca vazia a própria zona de soltar é o estado vazio. Um cartão
   * "nenhum arquivo" embaixo de uma área que já convida a adicionar arquivos são
   * duas mensagens dizendo a mesma coisa, e nenhuma delas com força.
   */
  const empty = files.length === 0;

  return (
    <>
      <ScreenHeader title={t('library.title')} subtitle={t('library.subtitle')}>
        {files.length > 0 && <span className="meta">{t('library.storageUsed', { size: formatBytes(total) })}</span>}
      </ScreenHeader>

      <div
        className="drop"
        data-empty={empty}
        data-over={dragOver}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void add(e.dataTransfer.files);
        }}
      >
        {empty && (
          <>
            <IconLibrary size={34} className="drop__icon" />
            <p className="drop__title">{t('library.empty')}</p>
            <p className="hint hint--lead">{t('library.emptyHint')}</p>
          </>
        )}

        <button type="button" className="btn btn--primary" onClick={() => inputRef.current?.click()}>
          <IconPlus size={20} />
          {t('library.add')}
        </button>
        <p className="hint">{t('library.dropHint')}</p>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,video/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            void add(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/**
       * Os filtros só aparecem quando há mais de um arquivo. Com um item na lista
       * três botões de filtro são três jeitos de olhar para a mesma linha.
       */}
      {files.length > 1 && (
        <div className="chips" role="group" aria-label={t('library.filterLabel')}>
          {FILTERS.map((option) => (
            <label key={option.value} className="chip" data-selected={filter === option.value}>
              <input
                type="radio"
                name="library-filter"
                className="sr-only"
                value={option.value}
                checked={filter === option.value}
                onChange={() => setFilter(option.value)}
              />
              {t(option.key)}
            </label>
          ))}
        </div>
      )}

      {!empty && visible.length === 0 && (
        <div className="card">
          <p className="empty">
            {t(filter === 'queued' ? 'library.noneQueued' : 'library.noneDone')}
          </p>
        </div>
      )}

      {visible.length > 0 && (
        <ul className="list">
          {visible.map((file) => (
            <li key={file.id} className="list__item">
              <div className="list__row">
                <span className="list__icon" aria-hidden="true">
                  <IconFile size={20} />
                </span>

                <div className="list__body list__body--static">
                  <span className="list__title">{file.name}</span>
                  <span className="meta">
                    {/* Ícone + palavra, nunca ícone sozinho: o estado do arquivo é
                        a informação que decide o próximo toque da pessoa. */}
                    {file.sessionId ? (
                      <span className="tag tag--ok">
                        <IconCheck size={14} />
                        {t('library.alreadyTranscribed')}
                      </span>
                    ) : (
                      <span className="tag">
                        <IconClock size={14} />
                        {t('library.queued')}
                      </span>
                    )}
                    {formatBytes(file.size)} · {t('library.addedAt', { date: formatDate(file.addedAt) })}
                  </span>
                </div>

                {/**
                 * As duas ações de texto vão juntas num grupo, e o apagar fica
                 * fora dele de propósito. Em tela estreita são três botões que não
                 * cabem numa linha: soltos, o apagar sobrava sozinho numa terceira
                 * linha com um vão no meio do cartão — parecia erro de layout.
                 * Agrupados, o apagar sobe para o canto do título (onde apagar item
                 * costuma morar) e as ações de texto ficam numa linha só.
                 */}
                <div className="list__actions">
                  {file.sessionId && (
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => onOpenTranscript(file.sessionId!)}
                    >
                      {t('library.openTranscript')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => onTranscribe(file.id)}
                  >
                    {t('library.transcribe')}
                  </button>
                </div>
                <button
                  type="button"
                  className="btn btn--icon btn--danger"
                  onClick={() => {
                    void deleteLibraryFile(file.id).then(onChanged);
                  }}
                  aria-label={t('library.deleteLabel', { name: file.name })}
                >
                  <IconTrash size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
