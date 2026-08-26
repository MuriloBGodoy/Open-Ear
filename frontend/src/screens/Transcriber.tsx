/**
 * Transcriber — a tela principal.
 *
 * Dois modos, um propósito. "Ao vivo" é o default e não é escolha de layout: é o
 * caso de uso que justifica o app existir — conversa acontecendo agora, na frente
 * da pessoa. "Arquivo" é o secundário.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LiveMode } from '../components/LiveMode';
import { FileMode, type IncomingAudio } from '../components/FileMode';
import { getLibraryFile, type LibraryFolder } from '../lib/db';
import { ScreenHeader } from '../components/ScreenHeader';
import { IconGlobe } from '../components/Icons';
import { AUDIO_LANGUAGES, type AudioLanguage } from '../i18n';
import { useSettings } from '../context/SettingsContext';

interface TranscriberProps {
  onSaved: () => void;
  /** Id de um áudio da biblioteca, quando o usuário chegou pelo botão de lá. */
  fileId?: string | null;
  onFileConsumed: () => void;
  /** Destinos possíveis ao guardar o áudio que acabou de ser transcrito. */
  folders: LibraryFolder[];
  onFoldersChanged: () => void;
}

export function Transcriber({
  onSaved,
  fileId,
  onFileConsumed,
  folders,
  onFoldersChanged,
}: TranscriberProps) {
  const { t } = useTranslation();
  const { audioLanguage, setAudioLanguage } = useSettings();
  const [mode, setMode] = useState<'live' | 'file'>(fileId ? 'file' : 'live');
  const [incoming, setIncoming] = useState<IncomingAudio | null>(null);

  // Chegou com ?file=… : busca o blob e joga o modo arquivo pra frente.
  useEffect(() => {
    if (!fileId) return;
    let alive = true;
    void getLibraryFile(fileId).then((record) => {
      if (!alive || !record) return;
      setMode('file');
      setIncoming({ id: record.id, name: record.name, blob: record.blob });
    });
    return () => {
      alive = false;
    };
  }, [fileId]);

  return (
    <>
      <ScreenHeader title={t('transcriber.title')} subtitle={t('transcriber.subtitle')} />

      <div className="tabsrow">
        <div className="tabs" role="tablist" aria-label={t('transcriber.title')}>
          {(['live', 'file'] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              className="tabs__tab"
              aria-selected={mode === id}
              aria-controls={`panel-${id}`}
              id={`tab-${id}`}
              onClick={() => setMode(id)}
            >
              {t(id === 'live' ? 'transcriber.tabLive' : 'transcriber.tabFile')}
            </button>
          ))}
        </div>

        {/**
         * O idioma do áudio mora em Ajustes, mas errar esse campo é o que mais
         * estraga uma transcrição — e quem troca de idioma troca na hora de
         * gravar, não numa visita à tela de configuração. Fica aqui também, ao
         * lado das abas, porque vale para os dois modos.
         *
         * É um <select> nativo com aparência de chip: o seletor do sistema no
         * celular é melhor do que qualquer dropdown que a gente escrevesse, e
         * já vem com teclado e leitor de tela funcionando.
         */}
        <span className="chipselect">
          <IconGlobe size={18} />
          <select
            className="chipselect__input"
            aria-label={t('transcriber.audioLanguageChip')}
            value={audioLanguage}
            onChange={(e) => setAudioLanguage(e.target.value as AudioLanguage)}
          >
            {AUDIO_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {'label' in l ? l.label : t(l.labelKey)}
              </option>
            ))}
          </select>
        </span>
      </div>

      <div id={`panel-${mode}`} role="tabpanel" aria-labelledby={`tab-${mode}`} className="stack">
        {mode === 'live' ? (
          <LiveMode onSaved={onSaved} folders={folders} onFoldersChanged={onFoldersChanged} />
        ) : (
          <FileMode
            onSaved={onSaved}
            incoming={incoming}
            onConsumed={() => {
              setIncoming(null);
              onFileConsumed();
            }}
            folders={folders}
            onFoldersChanged={onFoldersChanged}
          />
        )}
      </div>
    </>
  );
}
