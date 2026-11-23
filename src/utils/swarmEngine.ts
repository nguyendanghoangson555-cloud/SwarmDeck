import type { BuildSpeed, CursorMode, SlideRegion, SwarmPhase } from '../types/deck';

export interface SwarmCursorSpec {
  id: string;
  name: string;
  color: string;
}

export const SWARM_CURSORS: SwarmCursorSpec[] = [
  { id: 'cursor-1', name: 'Bố cục', color: '#38BDF8' },   // Sky
  { id: 'cursor-2', name: 'Khung', color: '#F97316' },    // Coral Orange
  { id: 'cursor-3', name: 'Nội dung', color: '#34D399' }, // Emerald Mint
  { id: 'cursor-4', name: 'Căn chỉnh', color: '#A78BFA' }, // Soft Violet
];

export const MINIMAL_CURSOR: SwarmCursorSpec = {
  id: 'cursor-minimal',
  name: 'Con trỏ',
  color: '#38BDF8',
};

export interface SpeedProfile {
  /** Duration per region in ms */
  perRegionMs: number;
  /** Stagger overlap between cursors in swarm mode (0..1 of perRegionMs) */
  staggerRatio: number;
  /** Settle/fade-out duration after last region finishes */
  settleMs: number;
}

export const SPEED_PROFILES: Record<BuildSpeed, SpeedProfile> = {
  fast: {
    perRegionMs: 360,
    staggerRatio: 0.45,
    settleMs: 550,
  },
  normal: {
    perRegionMs: 620,
    staggerRatio: 0.55,
    settleMs: 750,
  },
  slow: {
    perRegionMs: 980,
    staggerRatio: 0.65,
    settleMs: 950,
  },
};

export interface ComputedRegionFrame {
  region: SlideRegion;
  /** Progress of box construction [0..1] */
  progress: number;
  /** Whether this region is currently being drawn */
  isActive: boolean;
  /** Pixel coordinates in canvas space */
  px: number;
  py: number;
  pw: number;
  ph: number;
  /** Pixel label e.g. "640 × 180" */
  dimensionText: string;
  /** Assigned cursor color */
  accentColor: string;
}

export interface ComputedCursorState {
  id: string;
  name: string;
  color: string;
  /** Current position in canvas pixels */
  x: number;
  y: number;
  /** Cursor opacity [0..1] */
  opacity: number;
  /** Active region label if hovering/constructing */
  activeLabel: string | null;
}

export interface SwarmFrameState {
  phase: SwarmPhase;
  /** Overall normalized build progress [0..1] */
  buildProgress: number;
  /** Overall overlay alpha multiplier (1 during build, softens smoothly during settle) */
  overlayOpacity: number;
  /** Subtle ambient grid opacity */
  gridOpacity: number;
  regions: ComputedRegionFrame[];
  cursors: ComputedCursorState[];
  totalDurationMs: number;
}

export function easeOutCubic(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - c, 3);
}

export function easeInOutCubic(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Computes total animation timeline duration (build + settle) in ms.
 */
export function getSwarmTotalDurationMs(
  regionCount: number,
  cursorMode: CursorMode,
  speed: BuildSpeed
): { buildMs: number; settleMs: number; totalMs: number } {
  const count = Math.max(1, regionCount);
  const profile = SPEED_PROFILES[speed];
  const stepMs =
    cursorMode === 'swarm'
      ? profile.perRegionMs * profile.staggerRatio
      : profile.perRegionMs * 0.92;
  const buildMs = (count - 1) * stepMs + profile.perRegionMs;
  return {
    buildMs,
    settleMs: profile.settleMs,
    totalMs: buildMs + profile.settleMs,
  };
}

/**
 * Computes the complete deterministic Swarm overlay frame at `elapsedMs`.
 */
export function computeSwarmFrame(params: {
  regions: SlideRegion[];
  canvasWidth: number;
  canvasHeight: number;
  cursorMode: CursorMode;
  speed: BuildSpeed;
  elapsedMs: number;
}): SwarmFrameState {
  const { regions, canvasWidth, canvasHeight, cursorMode, speed, elapsedMs } = params;
  const profile = SPEED_PROFILES[speed];
  const ordered = [...regions].sort((a, b) => a.order - b.order);
  const { buildMs, settleMs, totalMs } = getSwarmTotalDurationMs(ordered.length, cursorMode, speed);

  const clampedElapsed = Math.max(0, elapsedMs);
  let phase: SwarmPhase = 'building';
  if (clampedElapsed >= totalMs) {
    phase = 'settled';
  } else if (clampedElapsed >= buildMs) {
    phase = 'settling';
  }

  // Smooth fade-out during settle so slide typography stays 100% unobstructed and razor-sharp
  let overlayOpacity = 1;
  if (phase === 'settling') {
    const settleProgress = (clampedElapsed - buildMs) / Math.max(1, settleMs);
    overlayOpacity = 1 - easeInOutCubic(settleProgress);
  } else if (phase === 'settled') {
    overlayOpacity = 0;
  }

  const gridOpacity = phase === 'building' ? 0.16 : overlayOpacity * 0.16;

  const stepMs =
    cursorMode === 'swarm'
      ? profile.perRegionMs * profile.staggerRatio
      : profile.perRegionMs * 0.92;

  const cursorPool = cursorMode === 'swarm' ? SWARM_CURSORS : [MINIMAL_CURSOR];

  // Track region windows
  const regionWindows = ordered.map((region, idx) => {
    const startMs = idx * stepMs;
    const endMs = startMs + profile.perRegionMs;
    const rawProgress = (clampedElapsed - startMs) / Math.max(1, profile.perRegionMs);
    const progress = Math.max(0, Math.min(1, rawProgress));
    const eased = easeOutCubic(progress);

    const px = Math.round(region.x * canvasWidth);
    const py = Math.round(region.y * canvasHeight);
    const pw = Math.round(region.width * canvasWidth);
    const ph = Math.round(region.height * canvasHeight);
    const assignedCursor = cursorPool[idx % cursorPool.length];

    return {
      region,
      startMs,
      endMs,
      progress: eased,
      isActive: progress > 0 && progress < 1,
      px,
      py,
      pw,
      ph,
      dimensionText: `${pw} × ${ph}`,
      accentColor: assignedCursor.color,
      cursorIndex: idx % cursorPool.length,
    };
  });

  // Compute each cursor's trajectory across its assigned regions
  const cursors: ComputedCursorState[] = cursorPool.map((spec, cIdx) => {
    const assigned = regionWindows.filter((rw) => rw.cursorIndex === cIdx);
    if (assigned.length === 0) {
      return {
        id: spec.id,
        name: spec.name,
        color: spec.color,
        x: canvasWidth * 0.5,
        y: canvasHeight * 0.5,
        opacity: 0,
        activeLabel: null,
      };
    }

    // Default starting anchor near top-left or off-center edge
    const startAnchorX = canvasWidth * (0.12 + cIdx * 0.22);
    const startAnchorY = canvasHeight * 0.08;

    // Find current or next segment for this cursor
    let targetX = startAnchorX;
    let targetY = startAnchorY;
    let activeLabel: string | null = null;
    let cursorOpacity = overlayOpacity;

    const first = assigned[0];
    const last = assigned[assigned.length - 1];

    if (clampedElapsed < first.startMs) {
      // Glide toward the first region's top-left corner before drawing starts
      const approachWindow = Math.min(260, first.startMs || 260);
      const t = approachWindow > 0 ? easeInOutCubic((clampedElapsed - (first.startMs - approachWindow)) / approachWindow) : 1;
      targetX = lerp(startAnchorX, first.px, Math.max(0, t));
      targetY = lerp(startAnchorY, first.py, Math.max(0, t));
      cursorOpacity = clampedElapsed < first.startMs - approachWindow ? 0.35 : overlayOpacity;
    } else if (clampedElapsed >= last.endMs) {
      // Finished all assigned regions: rest at bottom-right corner of last region and fade with overlay
      targetX = last.px + last.pw;
      targetY = last.py + last.ph;
      cursorOpacity = phase === 'settled' ? 0 : overlayOpacity;
    } else {
      // Find active or transitioning region
      for (let i = 0; i < assigned.length; i++) {
        const cur = assigned[i];
        if (clampedElapsed >= cur.startMs && clampedElapsed <= cur.endMs) {
          // Sweep diagonally from top-left to bottom-right corner as box constructs
          const t = cur.progress;
          targetX = lerp(cur.px, cur.px + cur.pw, t);
          targetY = lerp(cur.py, cur.py + cur.ph, t);
          activeLabel = cur.region.label;
          break;
        }
        const next = assigned[i + 1];
        if (next && clampedElapsed > cur.endMs && clampedElapsed < next.startMs) {
          // Smooth travel between completed region's bottom-right and next region's top-left
          const gap = Math.max(1, next.startMs - cur.endMs);
          const travelT = easeInOutCubic((clampedElapsed - cur.endMs) / gap);
          targetX = lerp(cur.px + cur.pw, next.px, travelT);
          targetY = lerp(cur.py + cur.ph, next.py, travelT);
          activeLabel = next.region.label;
          break;
        }
      }
    }

    return {
      id: spec.id,
      name: spec.name,
      color: spec.color,
      x: targetX,
      y: targetY,
      opacity: Math.max(0, Math.min(1, cursorOpacity)),
      activeLabel,
    };
  });

  return {
    phase,
    buildProgress: Math.min(1, clampedElapsed / Math.max(1, buildMs)),
    overlayOpacity,
    gridOpacity,
    regions: regionWindows.map((rw) => ({
      region: rw.region,
      progress: rw.progress,
      isActive: rw.isActive,
      px: rw.px,
      py: rw.py,
      pw: rw.pw,
      ph: rw.ph,
      dimensionText: rw.dimensionText,
      accentColor: rw.accentColor,
    })),
    cursors,
    totalDurationMs: totalMs,
  };
}
