import { useEffect, useMemo, useRef, useState } from 'react';
import type { BuildSpeed, CursorMode, EditableSlide, OverlayMode, SwarmPhase } from '../types/deck';
import { blocksToSwarmRegions, SLIDE_HEIGHT, SLIDE_WIDTH } from '../utils/deckStorage';
import { drawEditableSlide, preloadSlideImages } from '../utils/slideRenderer';
import { computeSwarmFrame, type ComputedCursorState, type ComputedRegionFrame } from '../utils/swarmEngine';

interface SwarmStageProps {
  slide: EditableSlide;
  slideIndex: number;
  cursorMode: CursorMode;
  speed: BuildSpeed;
  overlayMode: OverlayMode;
  replayToken: number;
  isRecording?: boolean;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
  onPhaseChange?: (phase: SwarmPhase) => void;
}

function drawVectorCursor(ctx: CanvasRenderingContext2D, cursor: ComputedCursorState, alphaScale: number) {
  const alpha = cursor.opacity * alphaScale;
  if (alpha <= 0.02) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cursor.x, cursor.y);

  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 3;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 26);
  ctx.lineTo(7, 20);
  ctx.lineTo(13, 31);
  ctx.lineTo(17, 29);
  ctx.lineTo(11, 18);
  ctx.lineTo(20, 17);
  ctx.closePath();

  ctx.fillStyle = cursor.color;
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = '#FFFFFF';
  ctx.stroke();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  const tagX = 18;
  const tagY = 22;
  const text = cursor.name;
  ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
  const metrics = ctx.measureText(text);
  const padX = 10;
  const tagW = metrics.width + padX * 2;
  const tagH = 28;

  ctx.fillStyle = cursor.color;
  ctx.beginPath();
  ctx.roundRect(tagX, tagY, tagW, tagH, 6);
  ctx.fill();

  ctx.fillStyle = '#090B10';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(text, tagX + padX, tagY + tagH / 2 + 1);

  ctx.restore();
}

function drawRegionOverlay(
  ctx: CanvasRenderingContext2D,
  rf: ComputedRegionFrame,
  canvasWidth: number,
  canvasHeight: number,
  overlayAlpha: number
) {
  if (rf.progress <= 0.01 || overlayAlpha <= 0.01) return;

  const curW = Math.max(2, rf.pw * rf.progress);
  const curH = Math.max(2, rf.ph * rf.progress);

  ctx.save();
  ctx.globalAlpha = overlayAlpha;

  if (rf.isActive) {
    ctx.fillStyle = rf.accentColor;
    ctx.globalAlpha = overlayAlpha * 0.07;
    ctx.fillRect(rf.px, rf.py, curW, curH);
    ctx.globalAlpha = overlayAlpha;

    ctx.save();
    ctx.strokeStyle = rf.accentColor;
    ctx.globalAlpha = overlayAlpha * 0.32;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);

    ctx.beginPath();
    ctx.moveTo(0, rf.py);
    ctx.lineTo(canvasWidth, rf.py);
    ctx.moveTo(0, rf.py + curH);
    ctx.lineTo(canvasWidth, rf.py + curH);
    ctx.moveTo(rf.px, 0);
    ctx.lineTo(rf.px, canvasHeight);
    ctx.moveTo(rf.px + curW, 0);
    ctx.lineTo(rf.px + curW, canvasHeight);
    ctx.stroke();
    ctx.restore();
  }

  ctx.strokeStyle = rf.accentColor;
  ctx.lineWidth = rf.isActive ? 2.5 : 1.75;
  ctx.setLineDash(rf.progress < 0.99 ? [8, 5] : []);
  ctx.strokeRect(rf.px, rf.py, curW, curH);
  ctx.setLineDash([]);

  const handle = 8;
  const corners = [
    [rf.px, rf.py],
    [rf.px + curW, rf.py],
    [rf.px, rf.py + curH],
    [rf.px + curW, rf.py + curH],
  ];
  for (const [cx, cy] of corners) {
    ctx.fillStyle = '#090B10';
    ctx.fillRect(cx - handle / 2, cy - handle / 2, handle, handle);
    ctx.strokeStyle = rf.accentColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - handle / 2, cy - handle / 2, handle, handle);
  }

  if (rf.progress > 0.2) {
    const labelText = `${rf.region.label}  ·  ${Math.round(curW)} × ${Math.round(curH)}`;
    ctx.font = '500 17px "JetBrains Mono", monospace';
    const textW = ctx.measureText(labelText).width;
    const badgeW = textW + 18;
    const badgeH = 28;
    const badgeX = Math.max(8, Math.min(canvasWidth - badgeW - 8, rf.px));
    const badgeY = rf.py - badgeH - 8 >= 8 ? rf.py - badgeH - 8 : rf.py + 8;

    ctx.fillStyle = 'rgba(9, 11, 16, 0.88)';
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
    ctx.fill();

    ctx.strokeStyle = rf.accentColor;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#F8FAFC';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(labelText, badgeX + 9, badgeY + badgeH / 2 + 1);
  }

  ctx.restore();
}

export function SwarmStage({
  slide,
  slideIndex,
  cursorMode,
  speed,
  overlayMode,
  replayToken,
  isRecording = false,
  onCanvasReady,
  onPhaseChange,
}: SwarmStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement | 'error'>>(new Map());
  const [phase, setPhase] = useState<SwarmPhase>('building');
  const [loadedSlideId, setLoadedSlideId] = useState<string>('');
  const lastPhaseRef = useRef<SwarmPhase>('building');
  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;

  const regions = useMemo(() => blocksToSwarmRegions(slide.blocks), [slide.blocks]);

  useEffect(() => {
    onCanvasReady?.(canvasRef.current);
    return () => onCanvasReady?.(null);
  }, [onCanvasReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let cancelled = false;
    let startTime = 0;

    const drawFrame = (now: number) => {
      if (cancelled) return;

      const elapsedMs = now - startTime;
      const frame = computeSwarmFrame({
        regions,
        canvasWidth: SLIDE_WIDTH,
        canvasHeight: SLIDE_HEIGHT,
        cursorMode,
        speed,
        elapsedMs,
      });

      if (frame.phase !== lastPhaseRef.current) {
        lastPhaseRef.current = frame.phase;
        setPhase(frame.phase);
        onPhaseChange?.(frame.phase);
      }

      // 1. Render base slide directly onto 1920x1080 canvas
      ctx.clearRect(0, 0, SLIDE_WIDTH, SLIDE_HEIGHT);
      drawEditableSlide(ctx, slide, SLIDE_WIDTH, SLIDE_HEIGHT, imageCacheRef.current);

      // 2. Render Swarm overlay if active
      if (overlayMode !== 'hidden' && regions.length > 0) {
        const alphaScale = overlayMode === 'dimmed' ? 0.25 : 1;

        const gridAlpha = frame.gridOpacity * alphaScale;
        if (gridAlpha > 0.01) {
          ctx.save();
          ctx.strokeStyle = `rgba(148, 163, 184, ${gridAlpha})`;
          ctx.lineWidth = 1;
          const cols = 12;
          const marginX = SLIDE_WIDTH * 0.05;
          const colW = (SLIDE_WIDTH - marginX * 2) / cols;
          for (let c = 0; c <= cols; c++) {
            const gx = Math.round(marginX + c * colW);
            ctx.beginPath();
            ctx.moveTo(gx, 0);
            ctx.lineTo(gx, SLIDE_HEIGHT);
            ctx.stroke();
          }
          ctx.restore();
        }

        const effectiveOverlayAlpha = frame.overlayOpacity * alphaScale;
        for (const rf of frame.regions) {
          drawRegionOverlay(ctx, rf, SLIDE_WIDTH, SLIDE_HEIGHT, effectiveOverlayAlpha);
        }

        for (const cursor of frame.cursors) {
          drawVectorCursor(ctx, cursor, alphaScale);
        }
      }

      if (frame.phase !== 'settled' || isRecordingRef.current) {
        rafId = requestAnimationFrame(drawFrame);
      }
    };

    preloadSlideImages(slide, imageCacheRef.current).then(() => {
      if (cancelled) return;
      setLoadedSlideId(slide.id);
      startTime = performance.now();
      drawFrame(startTime);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [slide, regions, cursorMode, speed, overlayMode, replayToken, onPhaseChange]);

  return (
    <div
      className="relative flex items-center justify-center w-full h-full select-none"
      data-swarm-phase={phase}
      data-slide-index={slideIndex}
      data-loaded-slide={loadedSlideId}
    >
      <div
        className="relative flex items-center justify-center max-w-full max-h-full shadow-[0_24px_80px_rgba(0,0,0,0.65)] ring-1 ring-white/10 rounded-lg overflow-hidden bg-slate-950"
        style={{ aspectRatio: '16 / 9' }}
      >
        <canvas
          ref={canvasRef}
          width={SLIDE_WIDTH}
          height={SLIDE_HEIGHT}
          data-testid="swarm-canvas"
          aria-label={`Slide ${slideIndex + 1}: ${slide.title}`}
          className="w-full h-full object-contain block"
        />
      </div>
    </div>
  );
}
