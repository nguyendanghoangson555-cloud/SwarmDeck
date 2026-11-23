import test from 'node:test';
import assert from 'node:assert/strict';
import {
  blocksToSwarmRegions,
  clampBlockBounds,
  createBlankSlide,
  createDefaultBlock,
  deriveSlideTitle,
  validateDeckJson,
} from './deckStorage';

test('clampBlockBounds constrains block within [0..1] slide frame', () => {
  const clamped = clampBlockBounds({ x: 0.9, y: -0.2, width: 0.5, height: 0.01 });
  assert.equal(clamped.width, 0.5);
  assert.equal(clamped.x, 0.5);
  assert.equal(clamped.y, 0);
  assert.equal(clamped.height, 0.04);
});

test('blocksToSwarmRegions maps text headings, media, and shapes in order', () => {
  const regions = blocksToSwarmRegions([
    {
      id: 'b1',
      type: 'text',
      label: 'Tiêu đề',
      x: 0.1,
      y: 0.1,
      width: 0.6,
      height: 0.15,
      fontSize: 64,
    },
    {
      id: 'b2',
      type: 'image',
      label: 'Ảnh minh họa',
      x: 0.1,
      y: 0.3,
      width: 0.4,
      height: 0.4,
    },
    {
      id: 'b3',
      type: 'shape',
      label: '',
      x: 0.55,
      y: 0.3,
      width: 0.35,
      height: 0.4,
    },
  ]);

  assert.equal(regions.length, 3);
  assert.equal(regions[0].kind, 'heading');
  assert.equal(regions[1].kind, 'media');
  assert.equal(regions[2].kind, 'card');
  assert.equal(regions[2].label, 'Hình khối 03');
  assert.equal(regions[2].order, 2);
});

test('validateDeckJson accepts valid decks and rejects malformed payloads', () => {
  const slide = createBlankSlide(1);
  const valid = validateDeckJson({
    id: 'd1',
    title: 'Kế hoạch Q4',
    slides: [slide],
  });
  assert.equal(valid.title, 'Kế hoạch Q4');
  assert.equal(valid.slides.length, 1);

  assert.throws(() => validateDeckJson({ title: 'Empty', slides: [] }));
  assert.throws(() => validateDeckJson('invalid'));
});

test('createDefaultBlock and deriveSlideTitle produce sensible defaults', () => {
  const blk = createDefaultBlock('text', 2, true);
  assert.equal(blk.textColor, '#F8FAFC');
  const slide = createBlankSlide(3);
  assert.equal(deriveSlideTitle(slide, 2), 'Tiêu đề Slide 3');
});
