/**
 * Transcriptions — o arquivo de tudo que foi salvo.
 *
 * A busca varre o texto inteiro, não só o título. É a diferença entre um
 * histórico e um arquivo utilizável: quem transcreveu vinte conversas lembra de
 * uma frase que foi dita, nunca do rótulo que o app gerou.
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { deleteSession, type TranscriptionSession } from '../lib/db';
import { formatDuration } from '../lib/audio';
import { useSettings } from '../context/SettingsContext';
import { ScreenHeader } from '../components/ScreenHeader';
import { IconCheck, IconChevron, IconCopy, IconSearch, IconTrash } from '../components/Icons';

/**
 * Uma prévia da fala em vez de só o rótulo. Quem tem vinte transcrições salvas
 * reconhece a conversa pelo que foi dito, não pelo título que o app gerou — e
 * abrir uma por uma para descobrir qual é qual anula a razão de existir a tela.
 */
function preview(text: string) {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > 150 ? `${flat.slice(0, 150).trimEnd()}…` : flat;
}

/** Meia-noite local do dia do timestamp — a conta tem que ser em dia de calendário. */
function startOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Agrupa por recência, não por data exata. "Hoje" e "Ontem" são como a pessoa
 * pensa na conversa que quer achar; "12/08/2026" exige que ela lembre a data —
 * e ninguém lembra a data, lembra que foi na semana passada.
 */
function recencyKey(createdAt: number, today: number): string {
  const days = Math.round((today - startOfDay(createdAt)) / 86_400_000);
  if (days <= 0) return 'transcriptions.groupToday';
  if (days === 1) return 'transcriptions.groupYesterday';
  if (days < 7) return 'transcriptions.group7';
  if (days < 30) return 'transcriptions.group30';
  return 'transcriptions.groupOlder';
}

function groupByRecency(sessions: TranscriptionSession[]) {
  const today = startOfDay(Date.now());
  const groups: { key: string; items: TranscriptionSession[] }[] = [];

  for (const session of [...sessions].sort((a, b) => b.createdAt - a.createdAt)) {
    const key = recencyKey(session.createdAt, today);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(session);
    else groups.push({ key, items: [session] });
  }

  return groups;
}

interface TranscriptionsProps {
  sessions: TranscriptionSession[];
  onChanged: () => void;
  /** Vem da rota, quando a pessoa chegou pelo "abrir transcrição" da biblioteca. */
  openSessionId?: string | null;
}

export function Transcriptions({ sessions, onChanged, openSessionId }: TranscriptionsProps) {
  const { t } = useTranslation();
  const { formatDateTime } = useSettings();
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(openSessionId ?? null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Chegar por link tem que abrir o item, não só levar até a tela e deixar a
  // pessoa procurar qual dos vinte cartões era.
  useEffect(() => {
    if (openSessionId) setOpenId(openSessionId);
  }, [openSessionId]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return sessions;
    return sessions.filter(
      (s) => s.title.toLowerCase().includes(needle) || s.text.toLowerCase().includes(needle)
    );
  }, [sessions, query]);

  const groups = useMemo(() => groupByRecency(filtered), [filtered]);

  const handleDelete = async (session: TranscriptionSession) => {
    await deleteSession(session.id);
    if (openId === session.id) setOpenId(null);
    onChanged();
  };

  const handleCopy = async (session: TranscriptionSession) => {
    await navigator.clipboard.writeText(session.text);
    setCopiedId(session.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      <ScreenHeader title={t('transcriptions.title')} subtitle={t('transcriptions.subtitle')} />

      {sessions.length > 0 && (
        <div className="search">
          <IconSearch size={20} className="search__icon" />
          <input
            type="search"
            className="search__input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('transcriptions.searchPlaceholder')}
            aria-label={t('transcriptions.searchPlaceholder')}
          />
        </div>
      )}

      {/**
       * O resultado da busca precisa ser ANUNCIADO, não só mostrado. Quem não
       * ouve não tem o retorno sonoro de "achou" nem o de "não achou"; sem este
       * contador em aria-live, digitar no campo e a lista encurtar em silêncio é
       * indistinguível de a busca ter travado.
       */}
      {query.trim() !== '' && sessions.length > 0 && (
        <p className="resultcount" role="status" aria-live="polite">
          {t('transcriptions.found', { count: filtered.length })}
        </p>
      )}

      {sessions.length === 0 ? (
        <div className="card">
          <p className="empty">
            <strong>{t('transcriptions.empty')}</strong>
            <br />
            {t('transcriptions.emptyHint')}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <p className="empty">{t('transcriptions.noResults', { query: query.trim() })}</p>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.key} className="group" aria-labelledby={`g-${group.key}`}>
            <h2 className="group__head" id={`g-${group.key}`}>
              {t(group.key)}
            </h2>
            <ul className="list">
              {group.items.map((session) => {
                const isOpen = openId === session.id;
                return (
                  <li key={session.id} className="list__item" data-open={isOpen}>
                    <div className="list__row">
                      <button
                        type="button"
                        className="list__body list__body--expandable"
                        onClick={() => setOpenId(isOpen ? null : session.id)}
                        aria-expanded={isOpen}
                      >
                        <span className="list__text">
                          <span className="list__title">{session.title}</span>
                          <span className="meta">
                            <span className="tag">
                              {t(
                                session.mode === 'live'
                                  ? 'transcriptions.modeLive'
                                  : 'transcriptions.modeFile'
                              )}
                            </span>
                            {formatDateTime(session.createdAt)} ·{' '}
                            {formatDuration(session.durationSeconds)}
                          </span>
                          {!isOpen && (
                            <span className="list__preview">{preview(session.text)}</span>
                          )}
                        </span>
                        <IconChevron size={20} className="list__chevron" />
                      </button>

                      <button
                        type="button"
                        className="btn btn--icon"
                        onClick={() => void handleCopy(session)}
                        aria-label={t('common.copy')}
                      >
                        {copiedId === session.id ? <IconCheck size={18} /> : <IconCopy size={18} />}
                      </button>
                      <button
                        type="button"
                        className="btn btn--icon btn--danger"
                        onClick={() => void handleDelete(session)}
                        aria-label={t('transcriptions.deleteLabel', { title: session.title })}
                      >
                        <IconTrash size={18} />
                      </button>
                    </div>

                    {isOpen && (
                      <div className="transcript transcript--inline">
                        {session.text.split('\n\n').map((paragraph, i) => (
                          <p key={i} className="transcript__line">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
