'use client';

import React, { useEffect, useRef, useState } from 'react';

type DotKind = 'grid' | 'motif';

type Dot = {
  id: string;
  x: number;
  y: number;
  radius: number;
  opacity: number;
  fill: string;
  kind: DotKind;
};

type DotGridBackgroundProps = {
  /**
   * Distance between normal grid dots.
   * Responsive spacing is used when this is not provided.
   */
  spacing?: number;

  /**
   * Number of dots that react around the cursor.
   */
  clusterSize?: number;

  /**
   * Maximum distance at which dots can react.
   */
  interactionRadius?: number;

  /**
   * Enables or disables mouse interaction.
   */
  interactive?: boolean;

  /**
   * Displays the larger decorative Roshi dot motif.
   */
  showMotif?: boolean;

  className?: string;
};

const GRID_DOT_COLOR = '#7dd3fc';
const MOTIF_SKY_COLOR = '#60a5fa';
const MOTIF_PURPLE_COLOR = '#a78bfa';

const NEAREST_DOT_COLOR = '#ffffff';
const SURROUNDING_DOT_COLOR = '#bae6fd';

export default function DotGridBackground({
  spacing,
  clusterSize = 5,
  interactionRadius = 145,
  interactive = true,
  showMotif = true,
  className = '',
}: DotGridBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const circleRefs = useRef<
    Record<string, SVGCircleElement | null>
  >({});

  const frameRef = useRef<number | null>(null);

  const pointerRef = useRef({
    x: 0,
    y: 0,
    active: false,
  });

  const reducedMotionRef = useRef(false);
  const touchDeviceRef = useRef(false);

  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
  });

  const [dots, setDots] = useState<Dot[]>([]);

  /**
   * Detect accessibility and device preferences.
   */
  useEffect(() => {
    const reducedMotionQuery = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    );

    const touchQuery = window.matchMedia('(pointer: coarse)');

    const updatePreferences = () => {
      reducedMotionRef.current = reducedMotionQuery.matches;

      touchDeviceRef.current =
        touchQuery.matches || 'ontouchstart' in window;
    };

    updatePreferences();

    reducedMotionQuery.addEventListener(
      'change',
      updatePreferences,
    );

    touchQuery.addEventListener('change', updatePreferences);

    return () => {
      reducedMotionQuery.removeEventListener(
        'change',
        updatePreferences,
      );

      touchQuery.removeEventListener(
        'change',
        updatePreferences,
      );
    };
  }, []);

  /**
   * Build the repeating grid and the larger decorative motif.
   */
  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const buildDots = () => {
      const rect = container.getBoundingClientRect();

      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));

      const isMobile = window.innerWidth < 640;

      const responsiveSpacing =
        spacing ?? (isMobile ? 52 : 76);

      const columns =
        Math.ceil(width / responsiveSpacing) + 2;

      const rows =
        Math.ceil(height / responsiveSpacing) + 2;

      const offsetX =
        (width - (columns - 1) * responsiveSpacing) / 2;

      const offsetY =
        (height - (rows - 1) * responsiveSpacing) / 2;

      const nextDots: Dot[] = [];

      /**
       * Build normal grid dots.
       */
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          nextDots.push({
            id: `grid-${row}-${column}`,
            x: offsetX + column * responsiveSpacing,
            y: offsetY + row * responsiveSpacing,
            radius: isMobile ? 1.25 : 1.6,
            opacity: isMobile ? 0.42 : 0.58,
            fill: GRID_DOT_COLOR,
            kind: 'grid',
          });
        }
      }

      
      if (showMotif) {
        const compact = width < 760;

        const centerX = compact
          ? width * 0.73
          : width * 0.68;

        const centerY = compact
          ? height * 0.22
          : height * 0.33;

        const gap = compact ? 42 : 72;
        const motifScale = compact ? 0.7 : 1;

        const motifPoints = [
          {
            x: centerX,
            y: centerY - gap,
            radius: 18,
          },
          {
            x: centerX - gap,
            y: centerY,
            radius: 18,
          },
          {
            x: centerX,
            y: centerY,
            radius: 18,
          },
          {
            x: centerX + gap,
            y: centerY,
            radius: 14,
          },
          {
            x: centerX - gap,
            y: centerY + gap,
            radius: 13,
          },
          {
            x: centerX,
            y: centerY + gap,
            radius: 13,
          },
        ];

        motifPoints.forEach((point, index) => {
          nextDots.push({
            id: `motif-${index}`,
            x: point.x,
            y: point.y,
            radius: point.radius * motifScale,
            opacity: compact ? 0.68 : 0.92,
            fill:
              index % 2 === 0
                ? MOTIF_SKY_COLOR
                : MOTIF_PURPLE_COLOR,
            kind: 'motif',
          });
        });
      }

      circleRefs.current = {};

      setDimensions({
        width,
        height,
      });

      setDots(nextDots);
    };

    buildDots();

    const resizeObserver = new ResizeObserver(buildDots);

    resizeObserver.observe(container);

    window.addEventListener('resize', buildDots);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', buildDots);
    };
  }, [showMotif, spacing]);

  /**
   * Cursor interaction.
   *
   * The five nearest dots react:
   * - Closest dot becomes white
   * - Four nearby dots become light blue
   * - Dots grow
   * - Dots move slightly away from the pointer
   * - A sky-blue glow appears
   */
  useEffect(() => {
    if (!interactive || dots.length === 0) {
      return;
    }

    const restoreDots = () => {
      dots.forEach((dot) => {
        const circle = circleRefs.current[dot.id];

        if (!circle) {
          return;
        }

        circle.style.transform =
          'translate3d(0, 0, 0) scale(1)';

        circle.style.filter = 'none';

        circle.setAttribute('fill', dot.fill);
        circle.setAttribute('opacity', String(dot.opacity));
      });
    };

    const scheduleUpdate = () => {
      if (frameRef.current !== null) {
        return;
      }

      frameRef.current =
        window.requestAnimationFrame(updateDots);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (
        event.pointerType === 'touch' ||
        touchDeviceRef.current
      ) {
        return;
      }

      pointerRef.current = {
        x: event.clientX,
        y: event.clientY,
        active: true,
      };

      scheduleUpdate();
    };

    const handlePointerLeave = () => {
      pointerRef.current.active = false;
      scheduleUpdate();
    };

    const handleWindowBlur = () => {
      pointerRef.current.active = false;
      scheduleUpdate();
    };

    function updateDots() {
      frameRef.current = null;

      const container = containerRef.current;

      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();

      const pointerX = pointerRef.current.x;
      const pointerY = pointerRef.current.y;

      const pointerIsInside =
        pointerRef.current.active &&
        pointerX >= rect.left &&
        pointerX <= rect.right &&
        pointerY >= rect.top &&
        pointerY <= rect.bottom;

      if (!pointerIsInside) {
        restoreDots();
        return;
      }

      const localX = pointerX - rect.left;
      const localY = pointerY - rect.top;

      /**
       * Find and rank the nearest dots.
       */
      const nearestDots = dots
        .map((dot) => {
          const deltaX = dot.x - localX;
          const deltaY = dot.y - localY;

          return {
            dot,
            deltaX,
            deltaY,
            distance: Math.hypot(deltaX, deltaY),
          };
        })
        .filter(
          ({ distance }) => distance <= interactionRadius,
        )
        .sort((a, b) => a.distance - b.distance)
        .slice(0, Math.max(1, clusterSize));

      const activeDotMap = new Map<
        string,
        {
          rank: number;
          distance: number;
          deltaX: number;
          deltaY: number;
        }
      >();

      nearestDots.forEach(
        ({ dot, distance, deltaX, deltaY }, rank) => {
          activeDotMap.set(dot.id, {
            rank,
            distance,
            deltaX,
            deltaY,
          });
        },
      );

      dots.forEach((dot) => {
        const circle = circleRefs.current[dot.id];

        if (!circle) {
          return;
        }

        const activeDot = activeDotMap.get(dot.id);

        /**
         * Restore dots outside the five-dot cluster.
         */
        if (!activeDot) {
          circle.style.transform =
            'translate3d(0, 0, 0) scale(1)';

          circle.style.filter = 'none';

          circle.setAttribute('fill', dot.fill);
          circle.setAttribute(
            'opacity',
            String(dot.opacity),
          );

          return;
        }

        const {
          rank,
          distance,
          deltaX,
          deltaY,
        } = activeDot;

        const isNearest = rank === 0;

        /**
         * The nearest dot is largest.
         * The surrounding dots become gradually smaller.
         */
        const gridScales = [4.4, 3.5, 3, 2.65, 2.35];
        const motifScales = [1.65, 1.48, 1.35, 1.25, 1.18];

        const scaleValues =
          dot.kind === 'motif'
            ? motifScales
            : gridScales;

        const scale =
          scaleValues[
            Math.min(rank, scaleValues.length - 1)
          ];

        /**
         * Reduced-motion users receive color changes without
         * movement or large scaling.
         */
        if (reducedMotionRef.current) {
          circle.style.transform =
            'translate3d(0, 0, 0) scale(1)';

          circle.style.filter = isNearest
            ? 'drop-shadow(0 0 8px rgba(255,255,255,0.75))'
            : 'drop-shadow(0 0 7px rgba(125,211,252,0.55))';

          circle.setAttribute(
            'fill',
            isNearest
              ? NEAREST_DOT_COLOR
              : SURROUNDING_DOT_COLOR,
          );

          circle.setAttribute('opacity', '1');

          return;
        }

        /**
         * Move each active dot slightly away from the pointer.
         */
        const safeDistance = Math.max(distance, 1);

        let directionX = deltaX / safeDistance;
        let directionY = deltaY / safeDistance;

        /**
         * Provide a direction when the cursor sits exactly
         * over the center of a dot.
         */
        if (distance < 1) {
          const fallbackAngle =
            (rank / Math.max(clusterSize, 1)) *
            Math.PI *
            2;

          directionX = Math.cos(fallbackAngle);
          directionY = Math.sin(fallbackAngle);
        }

        const pushDistance =
          isNearest
            ? dot.kind === 'motif'
              ? 7
              : 6
            : Math.max(2.5, 5 - rank * 0.55);

        const translateX = directionX * pushDistance;
        const translateY = directionY * pushDistance;

        circle.style.transform = [
          `translate3d(${translateX}px, ${translateY}px, 0)`,
          `scale(${scale})`,
        ].join(' ');

        circle.setAttribute(
          'fill',
          isNearest
            ? NEAREST_DOT_COLOR
            : SURROUNDING_DOT_COLOR,
        );

        circle.setAttribute('opacity', '1');

        /**
         * White glow for the nearest dot.
         * Light-blue and purple glow for surrounding dots.
         */
        circle.style.filter = isNearest
          ? [
              'drop-shadow(0 0 5px rgba(255,255,255,1))',
              'drop-shadow(0 0 13px rgba(186,230,253,0.95))',
              'drop-shadow(0 0 26px rgba(56,189,248,0.7))',
              'drop-shadow(0 0 42px rgba(139,92,246,0.36))',
            ].join(' ')
          : [
              'drop-shadow(0 0 7px rgba(186,230,253,0.9))',
              'drop-shadow(0 0 17px rgba(56,189,248,0.55))',
              'drop-shadow(0 0 30px rgba(139,92,246,0.24))',
            ].join(' ');
      });
    }

    window.addEventListener(
      'pointermove',
      handlePointerMove,
      {
        passive: true,
      },
    );

    document.addEventListener(
      'mouseleave',
      handlePointerLeave,
    );

    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener(
        'pointermove',
        handlePointerMove,
      );

      document.removeEventListener(
        'mouseleave',
        handlePointerLeave,
      );

      window.removeEventListener(
        'blur',
        handleWindowBlur,
      );

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      restoreDots();
    };
  }, [
    clusterSize,
    dots,
    interactionRadius,
    interactive,
  ]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={[
        'pointer-events-none absolute inset-0 overflow-hidden',
        className,
      ].join(' ')}
      style={{
        background: [
          /**
           * Sky-blue glow.
           */
          'radial-gradient(circle at 18% 17%, rgba(56, 189, 248, 0.34) 0%, rgba(56, 189, 248, 0.08) 28%, transparent 52%)',

          /**
           * Purple glow.
           */
          'radial-gradient(circle at 82% 28%, rgba(167, 139, 250, 0.32) 0%, rgba(139, 92, 246, 0.08) 30%, transparent 56%)',

          /**
           * Bottom sky-blue glow.
           */
          'radial-gradient(circle at 58% 95%, rgba(125, 211, 252, 0.2) 0%, transparent 50%)',

          /**
           * Main dark-blue to purple gradient.
           */
          'linear-gradient(135deg, #061a44 0%, #0a3671 38%, #25377f 65%, #4c1d78 100%)',
        ].join(', '),
      }}
    >
      {/* Soft central light */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 48% 42%, rgba(186,230,253,0.11) 0%, transparent 58%)',
        }}
      />

      {/* Purple atmospheric glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 78% 72%, rgba(168,85,247,0.14) 0%, transparent 46%)',
        }}
      />

      {/* Edge vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 48%, rgba(3,8,34,0.28) 100%)',
        }}
      />

      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        style={{
          display:
            dimensions.width > 0 &&
            dimensions.height > 0
              ? 'block'
              : 'none',
        }}
      >
        {dots.map((dot) => (
          <circle
            key={dot.id}
            ref={(element) => {
              circleRefs.current[dot.id] = element;
            }}
            cx={dot.x}
            cy={dot.y}
            r={dot.radius}
            fill={dot.fill}
            opacity={dot.opacity}
            style={{
              transformBox: 'fill-box',
              transformOrigin: 'center',
              willChange:
                'transform, opacity, filter, fill',
              transition: [
                'transform 155ms cubic-bezier(0.22, 1, 0.36, 1)',
                'opacity 155ms ease-out',
                'fill 155ms ease-out',
                'filter 155ms ease-out',
              ].join(', '),
            }}
          />
        ))}
      </svg>

      {/* Soft bottom transition */}
      <div
        className="absolute inset-x-0 bottom-0 h-40"
        style={{
          background:
            'linear-gradient(to bottom, transparent, rgba(49,46,129,0.2))',
        }}
      />
    </div>
  );
}