/**
 * App — a casca: sidebar fixa + tela ativa.
 *
 * A sidebar troca de tela sem recarregar nada, e a leitura de dados (sessões e
 * biblioteca) vive aqui em cima de propósito: o contador que aparece na navegação
 * e a lista que aparece na tela precisam ser o mesmo dado, senão o badge mente.
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './components/Sidebar';
import { Transcriber } from './screens/Transcriber';
import { Transcriptions } from './screens/Transcriptions';
import { Library } from './screens/Library';
import { Settings } from './screens/Settings';
import { IconMenu, LogoMark } from './components/Icons';
import { checkHealth, type HealthStatus } from './lib/api';
import {
  listSessions,
  listLibraryFiles,
  type LibraryFile,
  type TranscriptionSession,
} from './lib/db';
import { navigate, useRouter, type Route } from './lib/router';
import './styles/global.css';

export default function App() {
  const { t } = useTranslation();
  const { route, params } = useRouter();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sessions, setSessions] = useState<TranscriptionSession[]>([]);
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [health, setHealth] = useState<HealthStatus | 'no-api' | null | 'loading'>('loading');

  const refreshSessions = useCallback(() => {
    void listSessions().then(setSessions);
  }, []);
  const refreshFiles = useCallback(() => {
    void listLibraryFiles().then(setFiles);
  }, []);

  useEffect(refreshSessions, [refreshSessions]);
  useEffect(refreshFiles, [refreshFiles]);
  useEffect(() => {
    void checkHealth().then(setHealth);
  }, []);

  // Navegar fecha a gaveta: no mobile ela cobre a tela que a pessoa acabou de pedir.
  const go = useCallback((next: Route) => {
    navigate(next);
    setDrawerOpen(false);
  }, []);

  const handleSaved = useCallback(() => {
    refreshSessions();
    refreshFiles();
    navigate('transcriptions');
  }, [refreshSessions, refreshFiles]);

  const handleTranscribeFromLibrary = useCallback((id: string) => {
    navigate('transcriber', { file: id });
  }, []);

  /**
   * O caminho de volta: da biblioteca para a transcrição que aquele arquivo gerou.
   * Vai pelo parâmetro da rota, não por estado, para que o botão "voltar" do
   * navegador desfaça o salto — e para que o link possa ser guardado.
   */
  const handleOpenTranscript = useCallback((sessionId: string) => {
    navigate('transcriptions', { session: sessionId });
  }, []);

  // `no-api` não vira aviso: é o `npm run dev` servindo só o front, e dizer
  // "servidor fora do ar" ali seria mentir sobre um servidor que não existe.
  // Ver checkHealth() em lib/api.ts.
  const configured = typeof health === 'object' && health !== null;
  const offline = health === null;
  const noKey = configured && !health.groqConfigured;

  return (
    <div className="shell">
      <Sidebar
        current={route}
        counts={{ transcriptions: sessions.length, library: files.length }}
        drawerOpen={drawerOpen}
        onNavigate={go}
        onCloseDrawer={() => setDrawerOpen(false)}
      />

      {/* Barra de topo só existe no mobile, onde a sidebar virou gaveta. */}
      <header className="topbar">
        <button
          type="button"
          className="btn btn--icon"
          onClick={() => setDrawerOpen(true)}
          aria-label={t('nav.openMenu')}
          aria-expanded={drawerOpen}
        >
          <IconMenu />
        </button>
        <span className="brand brand--compact">
          <LogoMark size={24} className="brand__mark" />
          <span className="brand__name">Open Ear</span>
        </span>
      </header>

      <main className="shell__main">
        <div className="shell__content">
          {offline && (
            <div className="notice notice--error" role="alert">
              <div>
                <strong>{t('errors.backendDown')}</strong>
                <div>{t('errors.backendDownHint')}</div>
              </div>
            </div>
          )}

          {noKey && (
            <div className="notice notice--warn" role="alert">
              <div>
                <strong>{t('errors.noKey')}</strong>
                <div>{t('errors.noKeyHint')}</div>
              </div>
            </div>
          )}

          {route === 'transcriber' && (
            <Transcriber
              onSaved={handleSaved}
              fileId={params.get('file')}
              onFileConsumed={() => navigate('transcriber')}
            />
          )}

          {route === 'transcriptions' && (
            <Transcriptions
              sessions={sessions}
              onChanged={refreshSessions}
              openSessionId={params.get('session')}
            />
          )}

          {route === 'library' && (
            <Library
              files={files}
              onChanged={refreshFiles}
              onTranscribe={handleTranscribeFromLibrary}
              onOpenTranscript={handleOpenTranscript}
            />
          )}

          {route === 'settings' && (
            <Settings
              onCleared={() => {
                refreshSessions();
                refreshFiles();
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
