import type {
  BlockType,
  EditableDeck,
  EditableSlide,
  RegionKind,
  SlideBlock,
  SlideRegion,
} from '../types/deck';

export const SLIDE_WIDTH = 1920;
export const SLIDE_HEIGHT = 1080;
export const STORAGE_KEY = 'swarmdeck:deck:v1';

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  text: 'Khung chữ',
  image: 'Hình ảnh',
  shape: 'Hình khối',
};

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function clampBlockBounds(
  box: { x: number; y: number; width: number; height: number },
  minWidth = 0.05,
  minHeight = 0.04
): { x: number; y: number; width: number; height: number } {
  const width = clamp(box.width, minWidth, 1);
  const height = clamp(box.height, minHeight, 1);
  const x = clamp(box.x, 0, 1 - width);
  const y = clamp(box.y, 0, 1 - height);
  return { x, y, width, height };
}

/**
 * Converts a slide's ordered SlideBlock[] into SwarmRegion[]
 * so Swarm cursors construct each actual block in natural reading/layer order.
 */
export function blocksToSwarmRegions(blocks: SlideBlock[]): SlideRegion[] {
  return blocks.map((block, idx) => {
    let kind: RegionKind = 'card';
    if (block.type === 'image') {
      kind = 'media';
    } else if (block.type === 'text') {
      kind = (block.fontSize ?? 32) >= 48 ? 'heading' : 'text';
    } else if (block.type === 'shape') {
      kind = 'card';
    }

    const customLabel = block.label?.trim();
    const fallbackLabel = `${BLOCK_TYPE_LABELS[block.type]} ${String(idx + 1).padStart(2, '0')}`;

    return {
      id: block.id,
      label: customLabel || fallbackLabel,
      x: block.x,
      y: block.y,
      width: block.width,
      height: block.height,
      kind,
      order: idx,
    };
  });
}

export function deriveSlideTitle(slide: EditableSlide, index: number): string {
  const textBlock = slide.blocks.find(
    (b) => (b.type === 'text' || b.type === 'shape') && b.text && b.text.trim().length > 0
  );
  if (textBlock?.text) {
    const firstLine = textBlock.text.trim().split('\n')[0].trim();
    if (firstLine) return firstLine.slice(0, 48);
  }
  return slide.title?.trim() || `Slide ${index + 1}`;
}

export function createDefaultBlock(type: BlockType, existingCount: number, isDarkSlide: boolean): SlideBlock {
  const offset = (existingCount % 4) * 0.035;
  const uid = `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  if (type === 'text') {
    return {
      id: uid,
      type: 'text',
      label: `Khung chữ ${String(existingCount + 1).padStart(2, '0')}`,
      x: 0.12 + offset,
      y: 0.24 + offset,
      width: 0.48,
      height: 0.16,
      text: 'Nhấn đúp để nhập nội dung văn bản',
      fontSize: 40,
      fontWeight: '600',
      textAlign: 'left',
      textColor: isDarkSlide ? '#F8FAFC' : '#0F172A',
      fillColor: 'transparent',
      strokeColor: 'transparent',
      strokeWidth: 0,
      borderRadius: 12,
    };
  }

  if (type === 'image') {
    return {
      id: uid,
      type: 'image',
      label: `Hình ảnh ${String(existingCount + 1).padStart(2, '0')}`,
      x: 0.52 - offset * 0.5,
      y: 0.22 + offset,
      width: 0.36,
      height: 0.44,
      fillColor: isDarkSlide ? '#1E293B' : '#E2E8F0',
      strokeColor: isDarkSlide ? 'rgba(148,163,184,0.35)' : '#CBD5E1',
      strokeWidth: 2,
      borderRadius: 16,
      imageUrl: '',
    };
  }

  return {
    id: uid,
    type: 'shape',
    label: `Hình khối ${String(existingCount + 1).padStart(2, '0')}`,
    x: 0.14 + offset,
    y: 0.42 + offset,
    width: 0.34,
    height: 0.26,
    text: '',
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    textColor: isDarkSlide ? '#F8FAFC' : '#0F172A',
    fillColor: isDarkSlide ? '#1E293B' : '#F1F5F9',
    strokeColor: '#38BDF8',
    strokeWidth: 2,
    borderRadius: 16,
  };
}

export function createBlankSlide(slideNumber: number): EditableSlide {
  return {
    id: `slide-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: `Slide ${slideNumber}`,
    background: {
      color: '#0F172A',
      gradientTo: '#1E293B',
    },
    blocks: [
      {
        id: `blk-title-${Date.now()}`,
        type: 'text',
        label: 'Tiêu đề chính',
        x: 0.08,
        y: 0.12,
        width: 0.72,
        height: 0.14,
        text: `Tiêu đề Slide ${slideNumber}`,
        fontSize: 64,
        fontWeight: '700',
        textAlign: 'left',
        textColor: '#F8FAFC',
        fillColor: 'transparent',
        strokeColor: 'transparent',
        strokeWidth: 0,
        borderRadius: 8,
      },
      {
        id: `blk-card-${Date.now() + 1}`,
        type: 'shape',
        label: 'Khối nội dung',
        x: 0.08,
        y: 0.32,
        width: 0.84,
        height: 0.5,
        text: 'Thêm chữ, hình ảnh hoặc chỉnh kích thước khối này theo ý muốn.',
        fontSize: 32,
        fontWeight: '400',
        textAlign: 'left',
        textColor: '#CBD5E1',
        fillColor: '#1E293B',
        strokeColor: 'rgba(148,163,184,0.28)',
        strokeWidth: 2,
        borderRadius: 20,
      },
    ],
  };
}

export function isColorDarkHex(hex: string): boolean {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return true;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return true;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

export function validateDeckJson(raw: unknown): EditableDeck {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Dữ liệu JSON không đúng định dạng bộ slide.');
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.title !== 'string' || !Array.isArray(obj.slides) || obj.slides.length === 0) {
    throw new Error('File JSON thiếu tiêu đề hoặc không có slide nào.');
  }

  const slides: EditableSlide[] = obj.slides.map((s, sIdx) => {
    if (!s || typeof s !== 'object') {
      throw new Error(`Slide thứ ${sIdx + 1} không hợp lệ.`);
    }
    const sr = s as Record<string, unknown>;
    const bgObj = (sr.background && typeof sr.background === 'object'
      ? sr.background
      : {}) as Record<string, unknown>;
    const blocksArr = Array.isArray(sr.blocks) ? sr.blocks : [];

    const blocks: SlideBlock[] = blocksArr.map((b, bIdx) => {
      if (!b || typeof b !== 'object') {
        throw new Error(`Khối thứ ${bIdx + 1} ở slide ${sIdx + 1} không hợp lệ.`);
      }
      const br = b as Record<string, unknown>;
      const type: BlockType =
        br.type === 'image' || br.type === 'shape' || br.type === 'text' ? br.type : 'text';
      const bounds = clampBlockBounds({
        x: typeof br.x === 'number' ? br.x : 0.1,
        y: typeof br.y === 'number' ? br.y : 0.1,
        width: typeof br.width === 'number' ? br.width : 0.3,
        height: typeof br.height === 'number' ? br.height : 0.2,
      });

      return {
        id: typeof br.id === 'string' && br.id ? br.id : `blk-${sIdx}-${bIdx}`,
        type,
        label: typeof br.label === 'string' ? br.label : BLOCK_TYPE_LABELS[type],
        ...bounds,
        text: typeof br.text === 'string' ? br.text : undefined,
        fontSize: typeof br.fontSize === 'number' ? clamp(br.fontSize, 12, 160) : undefined,
        fontWeight:
          br.fontWeight === '400' || br.fontWeight === '600' || br.fontWeight === '700'
            ? br.fontWeight
            : undefined,
        textAlign:
          br.textAlign === 'left' || br.textAlign === 'center' || br.textAlign === 'right'
            ? br.textAlign
            : undefined,
        textColor: typeof br.textColor === 'string' ? br.textColor : undefined,
        fillColor: typeof br.fillColor === 'string' ? br.fillColor : undefined,
        strokeColor: typeof br.strokeColor === 'string' ? br.strokeColor : undefined,
        strokeWidth: typeof br.strokeWidth === 'number' ? clamp(br.strokeWidth, 0, 16) : undefined,
        borderRadius: typeof br.borderRadius === 'number' ? clamp(br.borderRadius, 0, 120) : undefined,
        imageUrl: typeof br.imageUrl === 'string' ? br.imageUrl : undefined,
      };
    });

    return {
      id: typeof sr.id === 'string' && sr.id ? sr.id : `slide-${sIdx + 1}`,
      title: typeof sr.title === 'string' && sr.title ? sr.title : `Slide ${sIdx + 1}`,
      background: {
        color: typeof bgObj.color === 'string' && bgObj.color ? bgObj.color : '#0F172A',
        gradientTo: typeof bgObj.gradientTo === 'string' ? bgObj.gradientTo : undefined,
        imageUrl: typeof bgObj.imageUrl === 'string' ? bgObj.imageUrl : undefined,
      },
      blocks,
    };
  });

  return {
    id: typeof obj.id === 'string' && obj.id ? obj.id : `deck-${Date.now()}`,
    title: obj.title.trim() || 'Bộ trình chiếu SwarmDeck',
    slides,
    updatedAt: Date.now(),
  };
}

export function loadDeckFromStorage(): EditableDeck | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return validateDeckJson(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveDeckToStorage(deck: EditableDeck): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
  } catch {
    // Ignore storage quota overflow gracefully
  }
}
