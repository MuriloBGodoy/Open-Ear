/**
 * Globe — o planeta interativo da tela inicial.
 *
 * É `cobe` (a mesma biblioteca por trás do componente do Magic UI): ~10 kB, um
 * canvas WebGL, sem árvore de cena.
 *
 * AS BOLINHAS SÃO <button>, NÃO PIXELS DO CANVAS.
 * O cobe desenha os marcadores dentro do WebGL, onde nada é clicável por
 * teclado nem existe para um leitor de tela. Então o canvas fica `aria-hidden`
 * e por cima dele vão botões HTML de verdade, reposicionados a cada quadro pela
 * MESMA projeção que o cobe usa para desenhar. O resultado é idêntico ao de
 * clicar na esfera — e continua funcionando com Tab, com Enter e com leitor de
 * tela, que num app para pessoas surdas não é detalhe opcional.
 *
 * Marcador na face de trás fica invisível ao mouse, mas segue na ordem de
 * tabulação: receber foco gira o planeta até ele. Assim o teclado alcança o
 * mundo inteiro sem precisar arrastar nada.
 */

import { useEffect, useRef } from 'react';
import createGlobe from 'cobe';

/** Latitude e longitude, em graus. */
export type LatLng = readonly [number, number];

export interface GlobeMarker {
  id: string;
  at: LatLng;
  /** Nome acessível do botão — é o que o leitor de tela anuncia. */
  label: string;
}

interface GlobeProps {
  markers: GlobeMarker[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** 'dark' | 'light' — vem do `data-theme` já resolvido no documento. */
  theme: string;
}

const TWO_PI = Math.PI * 2;
const RAD = Math.PI / 180;

/**
 * O par (phi, theta) que deixa um ponto de frente para a câmera. É a fórmula do
 * exemplo de foco do próprio cobe, e é também a base da projeção abaixo — as
 * duas precisam concordar, senão o botão não cai em cima da bolinha desenhada.
 */
function anglesFor([lat, long]: LatLng): [number, number] {
  return [Math.PI - (long * RAD - Math.PI / 2), lat * RAD];
}

/**
 * Raio da esfera como fração da metade do canvas.
 *
 * O cobe deixa uma folga entre a esfera e a borda do canvas — o glow ocupa esse
 * anel. O valor foi CALIBRADO: os botões foram desenhados por cima das bolinhas
 * renderizadas e o fator ajustado até coincidirem, conferindo pelos marcadores
 * do interior do disco (EUA, México, Brasil), onde a leitura é precisa. Perto da
 * borda a bolinha aparece achatada pela curvatura e engana o olho.
 *
 * O valor fica um pouco acima do raio real da esfera (0.82) porque o cobe
 * desenha o marcador ELEVADO sobre a superfície, e não colado nela: a bolinha
 * aparece uns 4% mais longe do centro do que o ponto geométrico do país.
 *
 * Mexer aqui desalinha o clique do que se vê.
 */
const SPHERE_FILL = 0.853;

/** Quanto do caminho até o alvo se percorre por quadro. */
const EASE = 0.08;
/** Rotação livre, em radianos por quadro. Lenta: é fundo, não animação. */
const DRIFT = 0.002;
/** Radianos de giro por pixel arrastado. */
const DRAG_SENSITIVITY = 0.005;
/** Limite de inclinação, para o planeta nunca capotar. */
const MAX_THETA = Math.PI / 2.4;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function Globe({ markers, selectedId, onSelect, theme }: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pinsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const phiRef = useRef(0);
  const thetaRef = useRef(0.2);
  /**
   * Alvo, arraste e foco vivem em refs e não em estado: o laço de animação roda
   * a 60 fps e não pode disparar render do React a cada quadro.
   */
  const targetRef = useRef<[number, number] | null>(null);
  const draggingRef = useRef(false);
  const focusedRef = useRef<number | null>(null);

  useEffect(() => {
    const marker = markers.find((m) => m.id === selectedId);
    targetRef.current = marker ? anglesFor(marker.at) : null;
  }, [markers, selectedId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dark = theme === 'dark';
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let size = canvas.offsetWidth;
    const observer = new ResizeObserver(() => {
      size = canvas.offsetWidth;
    });
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
        markers: markers.map((marker) => ({
          location: [marker.at[0], marker.at[1]] as [number, number],
          size: 0.06,
        })),
      });
    } catch {
      // Sem WebGL o canvas some, mas os botões continuam lá: a escolha de país
      // nunca dependeu do WebGL para funcionar.
      canvas.style.display = 'none';
    }

    /**
     * Projeta cada marcador na tela e escreve a posição direto no style do
     * botão. Fora do React de propósito — sessenta re-renders por segundo para
     * mover onze elementos seria desperdício puro.
     */
    const placePins = () => {
      const radius = (size / 2) * SPHERE_FILL;
      const center = size / 2;
      const cosTheta = Math.cos(thetaRef.current);
      const sinTheta = Math.sin(thetaRef.current);

      markers.forEach((marker, index) => {
        const pin = pinsRef.current[index];
        if (!pin) return;

        const [markerPhi, lat] = anglesFor(marker.at);
        /**
         * Distância angular horizontal entre a frente da esfera e o marcador.
         *
         * A ordem é `phi - markerPhi` e não o contrário: invertida, o mundo sai
         * espelhado no eixo X — a Europa aparece à esquerda quando o cobe a
         * desenhou à direita. O cosseno não se importa (é par), então só o X
         * muda de lado; foi exatamente esse o sintoma.
         */
        const around = phiRef.current - markerPhi;
        const cosLat = Math.cos(lat);

        // Coordenadas na esfera, depois inclinadas pelo theta da câmera.
        const x = cosLat * Math.sin(around);
        const y = Math.sin(lat);
        const z = cosLat * Math.cos(around);

        const screenY = y * cosTheta - z * sinTheta;
        const depth = y * sinTheta + z * cosTheta;

        pin.style.left = `${center + x * radius}px`;
        pin.style.top = `${center - screenY * radius}px`;

        // Face de trás: invisível e fora do alcance do mouse — mas ainda
        // tabulável, e o foco traz o planeta até ele.
        const front = depth > 0 || focusedRef.current === index;
        pin.style.opacity = front ? '1' : '0';
        pin.style.pointerEvents = depth > 0 ? 'auto' : 'none';
      });
    };

    let frame = 0;
    const tick = () => {
      const target = targetRef.current;

      if (!draggingRef.current) {
        if (target) {
          // Caminho mais curto em torno do círculo: sem isto, girar de Tóquio
          // para São Paulo daria a volta pelo lado errado do planeta.
          const [targetPhi, targetTheta] = target;
          const ahead = (targetPhi - phiRef.current + TWO_PI) % TWO_PI;
          phiRef.current += ahead < Math.PI ? ahead * EASE : -(TWO_PI - ahead) * EASE;
          thetaRef.current = thetaRef.current * (1 - EASE) + targetTheta * EASE;
        } else if (!still) {
          phiRef.current += DRIFT;
        }
      }

      globe?.update({
        phi: phiRef.current,
        theta: thetaRef.current,
        width: size * 2,
        height: size * 2,
      });
      placePins();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      globe?.destroy();
    };
    // `markers` é constante do módulo pai; o que recria o globo é o tema.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  /* ------------------------------------------------------------- arrastar --- */
  /**
   * Arrastar cancela o alvo: se a pessoa girou o planeta com a mão, o app não
   * deve puxá-lo de volta para o último país escolhido no quadro seguinte.
   */
  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    // Só o arrasto do fundo. Num botão, o pointerdown é o começo de um clique.
    if ((event.target as HTMLElement).closest('.globe__pin')) return;

    draggingRef.current = true;
    targetRef.current = null;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const drag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    phiRef.current -= event.movementX * DRAG_SENSITIVITY;
    thetaRef.current = clamp(
      thetaRef.current + event.movementY * DRAG_SENSITIVITY,
      -MAX_THETA,
      MAX_THETA
    );
  };

  const endDrag = () => {
    draggingRef.current = false;
  };

  return (
    <div
      className="globe"
      onPointerDown={startDrag}
      onPointerMove={drag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <canvas ref={canvasRef} className="globe__canvas" aria-hidden="true" />

      {markers.map((marker, index) => (
        <button
          key={marker.id}
          type="button"
          ref={(node) => {
            pinsRef.current[index] = node;
          }}
          className="globe__pin"
          data-selected={marker.id === selectedId}
          aria-label={marker.label}
          aria-pressed={marker.id === selectedId}
          onClick={() => onSelect(marker.id)}
          onFocus={() => {
            focusedRef.current = index;
            // Tab traz o país para a frente sem precisar de mouse nenhum.
            targetRef.current = anglesFor(marker.at);
          }}
          onBlur={() => {
            focusedRef.current = null;
          }}
        />
      ))}
    </div>
  );
}
