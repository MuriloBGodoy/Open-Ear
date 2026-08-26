/**
 * Globe — o globo da tela inicial.
 *
 * É `cobe` (a mesma biblioteca por trás do componente do Magic UI): ~10 kB, um
 * canvas WebGL, sem árvore de cena e sem dependência de animação.
 *
 * ELE NÃO É UM CONTROLE, E ISSO É DELIBERADO.
 * O canvas leva `aria-hidden` e não recebe foco. Quem escolhe a região são os
 * botões ao lado — que funcionam com teclado, com leitor de tela e com o dedo em
 * tela pequena. Num app feito para pessoas surdas, pôr a única porta de entrada
 * dentro de uma esfera WebGL que gira seria trocar a função pelo enfeite: quem
 * navega por teclado simplesmente não conseguiria começar a usar o app.
 *
 * O globo REAGE à escolha (gira até o país) em vez de recebê-la. Assim ele
 * confirma visualmente o que o botão disse, e some sem prejuízo se o WebGL
 * falhar ou se a pessoa pedir menos movimento.
 */

import { useEffect, useRef } from 'react';
import createGlobe from 'cobe';

/** Latitude e longitude, em graus. */
export type LatLng = readonly [number, number];

interface GlobeProps {
  markers: LatLng[];
  /** Para onde girar. `null` = rotação livre. */
  focus: LatLng | null;
  /** 'dark' | 'light' — vem do `data-theme` já resolvido no documento. */
  theme: string;
}

const TWO_PI = Math.PI * 2;

/**
 * Converte lat/long no par (phi, theta) que deixa aquele ponto de frente para a
 * câmera. É a fórmula do exemplo de foco do próprio cobe: phi é a rotação em
 * torno do eixo polar e theta a inclinação.
 */
function locationToAngles([lat, long]: LatLng): [number, number] {
  return [Math.PI - ((long * Math.PI) / 180 - Math.PI / 2), (lat * Math.PI) / 180];
}

/** Quanto do caminho até o alvo se percorre por quadro. */
const EASE = 0.06;
/** Rotação livre, em radianos por quadro. Lenta: é fundo, não animação. */
const DRIFT = 0.0025;

export function Globe({ markers, focus, theme }: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phiRef = useRef(0);
  const thetaRef = useRef(0.2);
  /**
   * O alvo vive num ref, não numa dependência do efeito: trocar de país não pode
   * destruir e recriar o globo — o canvas piscaria a cada clique.
   */
  const focusRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    focusRef.current = focus ? locationToAngles(focus) : null;
  }, [focus]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dark = theme === 'dark';
    // Quem pediu menos movimento não recebe um planeta girando sozinho.
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let size = canvas.offsetWidth;
    const measure = () => {
      size = canvas.offsetWidth;
    };
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);

    let globe: ReturnType<typeof createGlobe> | null = null;
    try {
      globe = createGlobe(canvas, {
        devicePixelRatio: 2,
        width: size * 2,
        height: size * 2,
        phi: phiRef.current,
        theta: thetaRef.current,
        dark: dark ? 1 : 0,
        diffuse: dark ? 1.2 : 1.1,
        mapSamples: 16_000,
        mapBrightness: dark ? 6 : 3,
        // Miami blue nos marcadores nos dois temas: aqui ele é objeto gráfico
        // sobre a esfera, nunca texto, então o passo puro pode aparecer.
        baseColor: dark ? [0.16, 0.2, 0.27] : [0.82, 0.86, 0.91],
        markerColor: [0, 0.69, 0.86],
        glowColor: dark ? [0.05, 0.12, 0.18] : [0.88, 0.92, 0.96],
        markers: markers.map((location) => ({
          location: [location[0], location[1]] as [number, number],
          size: 0.05,
        })),
      });
    } catch {
      // Sem WebGL o globo simplesmente não existe. É ornamento: a tela continua
      // inteira e a escolha de região continua nos botões.
      canvas.style.display = 'none';
    }

    /**
     * O cobe 2 não tem mais `onRender`: quem roda o relógio é quem chama, via
     * `update`. Melhor assim — o laço fica aqui, visível, e para junto com o
     * componente em vez de viver escondido dentro da biblioteca.
     */
    let frame = 0;
    const tick = () => {
      const target = focusRef.current;

      if (target) {
        // Caminho mais curto em torno do círculo: sem isto, girar de Tóquio para
        // São Paulo daria a volta pelo lado errado do planeta.
        const [targetPhi, targetTheta] = target;
        const ahead = (targetPhi - phiRef.current + TWO_PI) % TWO_PI;
        phiRef.current += ahead < Math.PI ? ahead * EASE : -(TWO_PI - ahead) * EASE;
        thetaRef.current = thetaRef.current * (1 - EASE) + targetTheta * EASE;
      } else if (!still) {
        phiRef.current += DRIFT;
      }

      globe?.update({
        phi: phiRef.current,
        theta: thetaRef.current,
        width: size * 2,
        height: size * 2,
      });
      frame = requestAnimationFrame(tick);
    };

    if (globe) frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      globe?.destroy();
    };
    // `markers` é uma constante do módulo pai; o que recria o globo é o tema.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  return <canvas ref={canvasRef} className="globe" aria-hidden="true" />;
}
