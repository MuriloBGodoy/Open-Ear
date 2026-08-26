/**
 * Icons — SVG inline, traço de 1.75px.
 *
 * Inline e não uma lib de ícones por dois motivos: são poucos ícones (um pacote
 * inteiro seria desperdício de bundle num PWA) e, mais importante, `currentColor`
 * garante que todo ícone herda a cor do texto — então o contraste que validamos
 * para o texto vale automaticamente para o ícone ao lado dele.
 *
 * Todos são `aria-hidden`: ícone aqui nunca carrega informação sozinho, sempre
 * acompanha rótulo ou `aria-label` no elemento pai.
 */

interface IconProps {
  size?: number;
  className?: string;
}

function Svg({ size = 22, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

export function IconMic(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </Svg>
  );
}

export function IconStop(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Duas barras cheias: em traço vazado, no tamanho real, elas somem. */
export function IconPause(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="7" y="5.5" width="3.6" height="13" rx="1.4" fill="currentColor" stroke="none" />
      <rect x="13.4" y="5.5" width="3.6" height="13" rx="1.4" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconGlobe(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.4 2.4 2.4 14.1 0 17-2.4-2.9-2.4-14.6 0-17Z" />
    </Svg>
  );
}

/** Relógio para "na fila" — estado de espera, não de erro. */
export function IconClock(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  );
}

export function IconTranscripts(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 4h11l3 3v13H5z" />
      <path d="M8.5 10h7M8.5 13.5h7M8.5 17h4" />
    </Svg>
  );
}

export function IconLibrary(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h4l1.5 2h7.5A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5z" />
      <path d="M14.5 11.5v3.2a1.6 1.6 0 1 1-1.2-1.55V11l2.7-.6" />
    </Svg>
  );
}

/**
 * Faders, não engrenagem. Uma engrenagem em traço fino de 22px vira um borrão
 * radial que lê como "brilho"; três faders com o punho em altura diferente
 * continuam legíveis no tamanho em que o ícone realmente aparece.
 */
export function IconSettings(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 5v5M5 14v5M12 5v3M12 12v7M19 5v9M19 18v1" />
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="10" r="2" />
      <circle cx="19" cy="16" r="2" />
    </Svg>
  );
}

export function IconFile(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z" />
      <path d="M13 3v6h6" />
    </Svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16M9.5 7V5h5v2M6.5 7l.8 12.1A1 1 0 0 0 8.3 20h7.4a1 1 0 0 0 1-.9L17.5 7" />
      <path d="M10.5 11v5M13.5 11v5" />
    </Svg>
  );
}

export function IconCopy(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 6.5A2.5 2.5 0 0 0 12.5 4H6.5A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15" />
    </Svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 12.5 9 17 19.5 6.5" />
    </Svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </Svg>
  );
}

export function IconSave(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 5h11l3 3v11H5z" />
      <path d="M8.5 5v5h7V5M8.5 19v-4h7v4" />
    </Svg>
  );
}

export function IconChevron(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

/**
 * Marca. A onda entra pela esquerda e sai como linhas de texto pela direita:
 * "turning sound into sight" desenhado, não escrito.
 */
export function LogoMark({ size = 32, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M3 16h2M7.5 11v10M12 7v18M16.5 11.5v9"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <path
        d="M21 11h8M21 16h8M21 21h5"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        opacity={0.55}
      />
    </svg>
  );
}

/* ------------------------------------------------------------- pastas ---- */

export function IconFolder(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4.2a1.5 1.5 0 0 1 1.2.6l1 1.4h7.6A1.5 1.5 0 0 1 20 9.5v8A1.5 1.5 0 0 1 18.5 19h-14A1.5 1.5 0 0 1 3 17.5Z" />
    </Svg>
  );
}

export function IconFolderOpen(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 17.5v-10A1.5 1.5 0 0 1 4.5 6h4.2a1.5 1.5 0 0 1 1.2.6l1 1.4h7.6A1.5 1.5 0 0 1 20 9.5v1.5" />
      <path d="M3.4 18.6 5.6 12.7a1.5 1.5 0 0 1 1.4-1h13.1a1 1 0 0 1 .94 1.35l-1.96 5.3a1.5 1.5 0 0 1-1.4.98H4.8a1.5 1.5 0 0 1-1.4-1.03Z" />
    </Svg>
  );
}

export function IconFolderPlus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4.2a1.5 1.5 0 0 1 1.2.6l1 1.4h7.6A1.5 1.5 0 0 1 20 9.5v8A1.5 1.5 0 0 1 18.5 19h-14A1.5 1.5 0 0 1 3 17.5Z" />
      <path d="M11.5 14h4M13.5 12v4" />
    </Svg>
  );
}

export function IconArrowLeft(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </Svg>
  );
}

export function IconPencil(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3Z" />
      <path d="M14.5 6.5l3 3" />
    </Svg>
  );
}
