/**
 * ScreenHeader — o `<h1>` de cada tela.
 *
 * Existe para garantir que toda tela tem exatamente um h1, com o mesmo lugar na
 * hierarquia. Navegação por cabeçalho é o atalho principal de quem usa leitor de
 * tela, e ela quebra se cada tela inventar sua própria estrutura.
 */

import type { ReactNode } from 'react';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function ScreenHeader({ title, subtitle, children }: ScreenHeaderProps) {
  return (
    <header className="screenhead">
      <div className="screenhead__text">
        <h1 className="screenhead__title">{title}</h1>
        {subtitle && <p className="screenhead__subtitle">{subtitle}</p>}
      </div>
      {children && <div className="row">{children}</div>}
    </header>
  );
}
