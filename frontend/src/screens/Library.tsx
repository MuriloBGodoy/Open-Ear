/**
 * Library — os áudios que o usuário deixa guardados, agora em pastas.
 *
 * Por que isso existe: transcrever um arquivo grande leva minutos e depende de
 * rede. Separar "trazer o arquivo pra cá" de "transcrever agora" deixa a pessoa
 * juntar material quando é conveniente e mandar transcrever quando dá — em vez de
 * ter que achar o arquivo no seletor do sistema outra vez, no pior momento.
 *
 * O Blob fica no IndexedDB, então continua ali depois de fechar o app, offline, e
 * sem nunca ter subido pra servidor nenhum.
 *
 * SOBRE AS PASTAS
 * Um nível só, sem aninhamento. Pasta dentro de pasta pede migalha de pão,
 * "mover para..." com árvore e um estado "onde eu estou" que o app teria que
 * explicar; para uma biblioteca pessoal de áudio, o ganho não paga o custo — e
 * cada camada dessas é mais um lugar onde alguém navegando por teclado se perde.
 *
 * Mover tem DOIS caminhos e isso é proposital: arrastar (rápido para quem usa
 * mouse) e um <select> em cada linha (o único que funciona com teclado, leitor
 * de tela e dedo em tela pequena). Drag-and-drop sozinho seria uma função que
 * exclui exatamente o público deste app.
 */

import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  addLibraryFile,
  createFolder,
  deleteFolder,
  deleteLibraryFile,
  formatBytes,
  moveFileToFolder,
  renameFolder,
  type LibraryFile,
  type LibraryFolder,
} from '../lib/db';
import { useSettings } from '../context/SettingsContext';
import { ScreenHeader } from '../components/ScreenHeader';
import {
  IconArrowLeft,
  IconCheck,
  IconClock,
  IconFile,
  IconFolder,
  IconFolderOpen,
  IconFolderPlus,
  IconLibrary,
  IconPencil,
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

/** Tipo MIME próprio: distingue arrastar um item da lista de arrastar do desktop. */
const DRAG_TYPE = 'application/x-openear-file';

interface LibraryProps {
  files: LibraryFile[];
  folders: LibraryFolder[];
  onChanged: () => void;
  onTranscribe: (id: string) => void;
  onOpenTranscript: (sessionId: string) => void;
  /** Vem da rota: qual pasta está aberta. `null` é a raiz. */
  openFolderId: string | null;
  onOpenFolder: (id: string | null) => void;
}

export function Library({
  files,
  folders,
  onChanged,
  onTranscribe,
  onOpenTranscript,
  openFolderId,
  onOpenFolder,
}: LibraryProps) {
  const { t } = useTranslation();
  const { formatDate } = useSettings();
  const [dragOver, setDragOver] = useState(false);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderDraft, setFolderDraft] = useState('');
  const [renaming, setRenaming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Pasta que a rota pede, mas só se ela ainda existir. Apagar a pasta aberta
   * numa aba deixaria a outra aba presa numa tela vazia sem saída.
   */
  const openFolder = folders.find((folder) => folder.id === openFolderId) ?? null;
  const inFolder = openFolder !== null;

  /** Os arquivos do lugar onde estamos: dentro da pasta, ou os soltos da raiz. */
  const scoped = useMemo(
    () => files.filter((file) => (inFolder ? file.folderId === openFolder.id : !file.folderId)),
    [files, inFolder, openFolder]
  );

  const visible = useMemo(() => {
    if (filter === 'queued') return scoped.filter((f) => !f.sessionId);
    if (filter === 'done') return scoped.filter((f) => f.sessionId);
    return scoped;
  }, [scoped, filter]);

  const countIn = (folderId: string) => files.filter((f) => f.folderId === folderId).length;

  const add = async (list: FileList | null) => {
    if (!list?.length) return;
    // Sequencial: cada arquivo é lido inteiro na memória antes de virar Blob, e
    // ler cinco áudios longos em paralelo é jeito garantido de estourar a aba.
    // Cai na pasta aberta — é onde a pessoa está olhando quando solta o arquivo.
    for (const file of Array.from(list)) {
      await addLibraryFile(file, openFolder?.id);
    }
    onChanged();
  };

  const submitNewFolder = async () => {
    const name = folderDraft.trim();
    setCreatingFolder(false);
    setFolderDraft('');
    if (!name) return;
    await createFolder(name);
    onChanged();
  };

  const submitRename = async (name: string) => {
    setRenaming(false);
    if (!openFolder) return;
    await renameFolder(openFolder.id, name);
    onChanged();
  };

  const move = async (fileId: string, folderId: string | null) => {
    await moveFileToFolder(fileId, folderId);
    onChanged();
  };

  const total = files.reduce((sum, f) => sum + f.size, 0);
  /**
   * Com a biblioteca inteira vazia a própria zona de soltar é o estado vazio. Um
   * cartão "nenhum arquivo" embaixo de uma área que já convida a adicionar
   * arquivos são duas mensagens dizendo a mesma coisa, e nenhuma delas com força.
   */
  const empty = files.length === 0 && folders.length === 0;

  return (
    <>
      <ScreenHeader
        title={inFolder ? openFolder.name : t('library.title')}
        subtitle={inFolder ? t('library.folderSubtitle') : t('library.subtitle')}
      >
        {files.length > 0 && (
          <span className="meta">{t('library.storageUsed', { size: formatBytes(total) })}</span>
        )}
      </ScreenHeader>

      {/* ------------------------------------------------ barra da pasta aberta */}
      {inFolder && (
        <div className="folderbar">
          <button type="button" className="btn btn--ghost" onClick={() => onOpenFolder(null)}>
            <IconArrowLeft size={18} />
            {t('library.backToRoot')}
          </button>

          <span className="folderbar__spacer" />

          {renaming ? (
            <RenameField
              initial={openFolder.name}
              onCancel={() => setRenaming(false)}
              onSubmit={(name) => void submitRename(name)}
            />
          ) : (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setRenaming(true)}
            >
              <IconPencil size={18} />
              {t('library.rename')}
            </button>
          )}

          {/**
           * Apagar pasta não apaga áudio — os arquivos voltam para a raiz — então
           * não há confirmação aqui. Diálogo de confirmação para uma ação
           * reversível e não destrutiva só ensina a pessoa a clicar "sim" sem ler,
           * e aí o dia em que a confirmação importa ela já não lê mais.
           */}
          <button
            type="button"
            className="btn btn--ghost btn--danger"
            onClick={() => {
              void deleteFolder(openFolder.id).then(() => {
                onOpenFolder(null);
                onChanged();
              });
            }}
          >
            <IconTrash size={18} />
            {t('library.deleteFolder')}
          </button>
        </div>
      )}

      {/* --------------------------------------------------------- zona de drop */}
      <div
        className="drop"
        data-empty={empty}
        data-over={dragOver}
        onDragOver={(e) => {
          // Item interno sendo arrastado não deve acender a zona de upload.
          if (e.dataTransfer.types.includes(DRAG_TYPE)) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (e.dataTransfer.types.includes(DRAG_TYPE)) return;
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
          {inFolder ? t('library.addToFolder', { name: openFolder.name }) : t('library.add')}
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

      {/* ------------------------------------------------------ grade de pastas */}
      {!inFolder && (
        <section className="group" aria-labelledby="lib-folders">
          <h2 className="group__head" id="lib-folders">
            {t('library.folders')}
          </h2>

          <ul className="folders">
            {folders.map((folder) => {
              const count = countIn(folder.id);
              return (
                <li key={folder.id}>
                  <button
                    type="button"
                    className="foldercard"
                    data-drop={dropTargetId === folder.id}
                    onClick={() => onOpenFolder(folder.id)}
                    onDragOver={(e) => {
                      if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
                      e.preventDefault();
                      setDropTargetId(folder.id);
                    }}
                    onDragLeave={() => setDropTargetId(null)}
                    onDrop={(e) => {
                      const id = e.dataTransfer.getData(DRAG_TYPE);
                      setDropTargetId(null);
                      if (!id) return;
                      e.preventDefault();
                      void move(id, folder.id);
                    }}
                  >
                    <span className="foldercard__icon" aria-hidden="true">
                      {dropTargetId === folder.id ? (
                        <IconFolderOpen size={26} />
                      ) : (
                        <IconFolder size={26} />
                      )}
                    </span>
                    <span className="foldercard__name">{folder.name}</span>
                    <span className="foldercard__count">
                      {t('library.audioCount', { count })}
                    </span>
                  </button>
                </li>
              );
            })}

            <li>
              {creatingFolder ? (
                <div className="foldercard foldercard--form">
                  <IconFolderPlus size={26} className="foldercard__icon" />
                  <input
                    type="text"
                    className="input input--inline"
                    autoFocus
                    value={folderDraft}
                    placeholder={t('library.folderNamePlaceholder')}
                    aria-label={t('library.newFolder')}
                    onChange={(e) => setFolderDraft(e.target.value)}
                    onBlur={() => void submitNewFolder()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void submitNewFolder();
                      if (e.key === 'Escape') {
                        setCreatingFolder(false);
                        setFolderDraft('');
                      }
                    }}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className="foldercard foldercard--new"
                  onClick={() => setCreatingFolder(true)}
                >
                  <span className="foldercard__icon" aria-hidden="true">
                    <IconFolderPlus size={26} />
                  </span>
                  <span className="foldercard__name">{t('library.newFolder')}</span>
                  <span className="foldercard__count">{t('library.newFolderHint')}</span>
                </button>
              )}
            </li>
          </ul>
        </section>
      )}

      {/* -------------------------------------------------------- os arquivos */}
      {/**
       * Os filtros só aparecem quando há mais de um arquivo no lugar onde
       * estamos. Com um item na lista três botões de filtro são três jeitos de
       * olhar para a mesma linha.
       */}
      {scoped.length > 1 && (
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

      <section className="group" aria-labelledby="lib-files">
        <h2 className="group__head" id="lib-files">
          {inFolder ? t('library.inFolder') : t('library.loose')}
        </h2>

        {visible.length === 0 ? (
          <div className="card">
            <p className="empty">
              {scoped.length === 0
                ? t(inFolder ? 'library.folderEmpty' : 'library.noneLoose')
                : t(filter === 'queued' ? 'library.noneQueued' : 'library.noneDone')}
            </p>
          </div>
        ) : (
          <ul className="list">
            {visible.map((file) => (
              <li
                key={file.id}
                className="list__item"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(DRAG_TYPE, file.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
              >
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
                      {formatBytes(file.size)} ·{' '}
                      {t('library.addedAt', { date: formatDate(file.addedAt) })}
                    </span>
                  </div>

                  {/**
                   * As ações de texto vão juntas num grupo, e o apagar fica fora
                   * dele de propósito. Em tela estreita são vários botões que não
                   * cabem numa linha: soltos, o apagar sobrava sozinho numa
                   * terceira linha com um vão no meio do cartão — parecia erro de
                   * layout. Agrupados, o apagar sobe para o canto do título (onde
                   * apagar item costuma morar) e as ações de texto ficam numa
                   * linha só.
                   */}
                  <div className="list__actions">
                    {/**
                     * O caminho acessível de mover. Existe SEMPRE, não só quando
                     * há pastas: a opção "solto" é o que traz um arquivo de volta
                     * para a raiz sem precisar entrar na pasta de origem.
                     */}
                    <label className="movesel">
                      <span className="sr-only">
                        {t('library.moveLabel', { name: file.name })}
                      </span>
                      <select
                        className="select select--compact"
                        value={file.folderId ?? ''}
                        onChange={(e) => void move(file.id, e.target.value || null)}
                      >
                        <option value="">{t('library.loose')}</option>
                        {folders.map((folder) => (
                          <option key={folder.id} value={folder.id}>
                            {folder.name}
                          </option>
                        ))}
                      </select>
                    </label>

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
      </section>
    </>
  );
}

/**
 * Campo de renomear. Componente separado só para o valor inicial entrar via
 * `useState` no mount — com o input controlado lá de cima, cada tecla digitada
 * rerenderizaria a lista inteira de arquivos junto.
 */
function RenameField({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initial);

  return (
    <input
      type="text"
      className="input input--inline"
      autoFocus
      value={value}
      aria-label={t('library.rename')}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onSubmit(value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSubmit(value);
        if (e.key === 'Escape') onCancel();
      }}
    />
  );
}
