import test from 'node:test';
import assert from 'node:assert/strict';
import { computeSwarmFrame, getSwarmTotalDurationMs, SPEED_PROFILES } from './swarmEngine';
import type { SlideRegion } from '../types/deck';

const sampleRegions: SlideRegion[] = [
  { id: 'r1', label: 'Tiêu đề', x: 0.08, y: 0.1, width: 0.5, height: 0.15, kind: 'heading', order: 0 },
  { id: 'r2', label: 'Khối 1', x: 0.08, y: 0.35, width: 0.4, height: 0.45, kind: 'card', order: 1 },
  { id: 'r3', label: 'Khối 2', x: 0.52, y: 0.35, width: 0.4, height: 0.45, kind: 'media', order: 2 },
];

test('swarm mode spawns 4 cursors and minimal mode spawns 1 cursor', () => {
  const swarmFrame = computeSwarmFrame({
    regions: sampleRegions,
    canvasWidth: 1920,
    canvasHeight: 1080,
    cursorMode: 'swarm',
    speed: 'normal',
    elapsedMs: 120,
  });
  assert.equal(swarmFrame.cursors.length, 4);
  assert.equal(swarmFrame.phase, 'building');

  const minimalFrame = computeSwarmFrame({
    regions: sampleRegions,
    canvasWidth: 1920,
    canvasHeight: 1080,
    cursorMode: 'minimal',
    speed: 'normal',
    elapsedMs: 120,
  });
  assert.equal(minimalFrame.cursors.length, 1);
  assert.equal(minimalFrame.phase, 'building');
});

test('swarm transitions from building to settling to settled and softens overlay', () => {
  const { buildMs, totalMs } = getSwarmTotalDurationMs(sampleRegions.length, 'swarm', 'normal');

  const midBuild = computeSwarmFrame({
    regions: sampleRegions,
    canvasWidth: 1920,
    canvasHeight: 1080,
    cursorMode: 'swarm',
    speed: 'normal',
    elapsedMs: buildMs * 0.5,
  });
  assert.equal(midBuild.phase, 'building');
  assert.equal(midBuild.overlayOpacity, 1);

  const settling = computeSwarmFrame({
    regions: sampleRegions,
    canvasWidth: 1920,
    canvasHeight: 1080,
    cursorMode: 'swarm',
    speed: 'normal',
    elapsedMs: buildMs + 200,
  });
  assert.equal(settling.phase, 'settling');
  assert.ok(settling.overlayOpacity < 1 && settling.overlayOpacity > 0);

  const settled = computeSwarmFrame({
    regions: sampleRegions,
    canvasWidth: 1920,
    canvasHeight: 1080,
    cursorMode: 'swarm',
    speed: 'normal',
    elapsedMs: totalMs + 100,
  });
  assert.equal(settled.phase, 'settled');
  assert.equal(settled.overlayOpacity, 0);
  assert.ok(settled.regions.every((r) => r.progress === 1));
});

test('speed profiles strictly order duration: fast < normal < slow', () => {
  const fast = getSwarmTotalDurationMs(4, 'swarm', 'fast').totalMs;
  const normal = getSwarmTotalDurationMs(4, 'swarm', 'normal').totalMs;
  const slow = getSwarmTotalDurationMs(4, 'swarm', 'slow').totalMs;
  assert.ok(fast < normal);
  assert.ok(normal < slow);
  assert.ok(SPEED_PROFILES.fast.perRegionMs < SPEED_PROFILES.slow.perRegionMs);
});

test('region pixel dimensions match normalized coordinates', () => {
  const frame = computeSwarmFrame({
    regions: sampleRegions,
    canvasWidth: 1920,
    canvasHeight: 1080,
    cursorMode: 'minimal',
    speed: 'fast',
    elapsedMs: 100,
  });
  assert.equal(frame.regions[0].px, Math.round(0.08 * 1920));
  assert.equal(frame.regions[0].pw, Math.round(0.5 * 1920));
  assert.equal(frame.regions[0].dimensionText, `${Math.round(0.5 * 1920)} × ${Math.round(0.15 * 1080)}`);
});
