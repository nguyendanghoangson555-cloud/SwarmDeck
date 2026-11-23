import type { EditableSlide, SlideBlock } from '../types/deck';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from './deckStorage';

function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!url.startsWith('data:') && !url.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

export async function preloadSlideImages(
  slide: EditableSlide,
  cache: Map<string, HTMLImageElement | 'error'>
): Promise<void> {
  const urls: string[] = [];
  if (slide.background.imageUrl) urls.push(slide.background.imageUrl);
  for (const block of slide.blocks) {
    if (block.type === 'image' && block.imageUrl) {
      urls.push(block.imageUrl);
    }
  }

  await Promise.all(
    urls.map(async (url) => {
      if (cache.has(url)) return;
      try {
        const img = await loadImg(url);
        cache.set(url, img);
      } catch {
        cache.set(url, 'error');
      }
    })
  );
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  const iw = img.naturalWidth || img.width || 1;
  const ih = img.naturalHeight || img.height || 1;
  const scale = Math.max(dw / iw, dh / ih);
  const sw = dw / scale;
  const sh = dh / scale;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function wrapParagraphWords(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const rawLines = text.split('\n');
  const out: string[] = [];

  for (const rawLine of rawLines) {
    if (rawLine.trim() === '') {
      out.push('');
      continue;
    }
    const words = rawLine.split(/\s+/);
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        out.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) out.push(current);
  }
  return out;
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  block: SlideBlock,
  width: number,
  height: number,
  imageCache: Map<string, HTMLImageElement | 'error'>
) {
  const scaleX = width / SLIDE_WIDTH;
  const bx = block.x * width;
  const by = block.y * height;
  const bw = block.width * width;
  const bh = block.height * height;
  const radius = Math.min((block.borderRadius ?? 0) * scaleX, Math.min(bw, bh) / 2);

  // 1. Background fill
  if (block.fillColor && block.fillColor !== 'transparent') {
    ctx.save();
    ctx.fillStyle = block.fillColor;
    ctx.beginPath();
    if (radius > 0.5) {
      ctx.roundRect(bx, by, bw, bh, radius);
    } else {
      ctx.rect(bx, by, bw, bh);
    }
    ctx.fill();
    ctx.restore();
  }

  // 2. Image content
  if (block.type === 'image') {
    const cached = block.imageUrl ? imageCache.get(block.imageUrl) : undefined;
    ctx.save();
    ctx.beginPath();
    if (radius > 0.5) {
      ctx.roundRect(bx, by, bw, bh, radius);
    } else {
      ctx.rect(bx, by, bw, bh);
    }
    ctx.clip();

    if (cached && cached !== 'error') {
      drawImageCover(ctx, cached, bx, by, bw, bh);
    } else {
      ctx.fillStyle = block.fillColor && block.fillColor !== 'transparent' ? block.fillColor : '#1E293B';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#94A3B8';
      ctx.font = `500 ${Math.round(24 * scaleX)}px "Plus Jakarta Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        cached === 'error' ? 'Không tải được ảnh' : 'Chưa có ảnh',
        bx + bw / 2,
        by + bh / 2
      );
    }
    ctx.restore();
  }

  // 3. Border stroke
  if (block.strokeColor && block.strokeColor !== 'transparent' && (block.strokeWidth ?? 0) > 0) {
    ctx.save();
    ctx.strokeStyle = block.strokeColor;
    ctx.lineWidth = (block.strokeWidth ?? 2) * scaleX;
    ctx.beginPath();
    if (radius > 0.5) {
      ctx.roundRect(bx, by, bw, bh, radius);
    } else {
      ctx.rect(bx, by, bw, bh);
    }
    ctx.stroke();
    ctx.restore();
  }

  // 4. Text content
  if ((block.type === 'text' || block.type === 'shape') && block.text) {
    const padX = (block.type === 'shape' ? 28 : 12) * scaleX;
    const padY = (block.type === 'shape' ? 24 : 8) * scaleX;
    const fontSize = (block.fontSize ?? 32) * scaleX;
    const lineHeight = fontSize * 1.28;
    const maxW = Math.max(20, bw - padX * 2);
    const align = block.textAlign ?? 'left';
    const weight = block.fontWeight ?? '400';

    ctx.save();
    ctx.font = `${weight} ${fontSize}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = block.textColor ?? '#F8FAFC';
    ctx.textBaseline = 'top';
    ctx.textAlign = align;

    const lines = wrapParagraphWords(ctx, block.text, maxW);
    let cy = by + padY;
    const drawX =
      align === 'center' ? bx + bw / 2 : align === 'right' ? bx + bw - padX : bx + padX;

    for (const line of lines) {
      if (cy + lineHeight * 0.7 > by + bh) break;
      if (line) {
        ctx.fillText(line, drawX, cy);
      }
      cy += lineHeight;
    }
    ctx.restore();
  }
}

export function drawEditableSlide(
  ctx: CanvasRenderingContext2D,
  slide: EditableSlide,
  width: number,
  height: number,
  imageCache: Map<string, HTMLImageElement | 'error'>
): void {
  // Background base
  if (slide.background.gradientTo) {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, slide.background.color || '#0F172A');
    grad.addColorStop(1, slide.background.gradientTo);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = slide.background.color || '#0F172A';
  }
  ctx.fillRect(0, 0, width, height);

  // Background image if present
  if (slide.background.imageUrl) {
    const bgImg = imageCache.get(slide.background.imageUrl);
    if (bgImg && bgImg !== 'error') {
      drawImageCover(ctx, bgImg, 0, 0, width, height);
    }
  }

  // Blocks in z-order
  for (const block of slide.blocks) {
    drawBlock(ctx, block, width, height, imageCache);
  }
}
