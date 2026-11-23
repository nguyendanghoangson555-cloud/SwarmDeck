import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Play, Square, Type } from 'lucide-react';
import type { BlockType, EditableSlide, SlideBlock } from '../types/deck';
import { clampBlockBounds, SLIDE_HEIGHT, SLIDE_WIDTH } from '../utils/deckStorage';

interface SlideEditorStageProps {
  slide: EditableSlide;
  slideIndex: number;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onUpdateBlock: (blockId: string, patch: Partial<SlideBlock>) => void;
  onAddBlock: (type: BlockType) => void;
  onPreviewSwarm: () => void;
}

type HandleDir = 'nw' | 'ne' | 'sw' | 'se';

export function SlideEditorStage({
  slide,
  slideIndex,
  selectedBlockId,
  onSelectBlock,
  onUpdateBlock,
  onAddBlock,
  onPreviewSwarm,
}: SlideEditorStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.5);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [snapGuides, setSnapGuides] = useState<{ x: boolean; y: boolean }>({ x: false, y: false });
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const dragStateRef = useRef<{
    kind: 'move' | 'resize';
    blockId: string;
    handle?: HandleDir;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  // Measure available workspace area and keep 1920x1080 scaled uniformly
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateScale = () => {
      const rect = el.getBoundingClientRect();
      const padW = 24;
      const padH = 24;
      const availW = Math.max(240, rect.width - padW);
      const availH = Math.max(160, rect.height - padH);
      const s = Math.min(availW / SLIDE_WIDTH, availH / SLIDE_HEIGHT);
      setScale(s);
    };

    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reset inline text edit if slide changes or selection clears
  useEffect(() => {
    setEditingBlockId(null);
  }, [slide.id]);

  useEffect(() => {
    if (editingBlockId && editingBlockId !== selectedBlockId) {
      setEditingBlockId(null);
    }
  }, [selectedBlockId, editingBlockId]);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const ds = dragStateRef.current;
      if (!ds || scale <= 0) return;

      const dxNorm = (e.clientX - ds.startClientX) / (SLIDE_WIDTH * scale);
      const dyNorm = (e.clientY - ds.startClientY) / (SLIDE_HEIGHT * scale);

      if (ds.kind === 'move') {
        let nextX = ds.origX + dxNorm;
        let nextY = ds.origY + dyNorm;

        // Subtle center snap
        const centerX = nextX + ds.origW / 2;
        const centerY = nextY + ds.origH / 2;
        const snapThreshold = 0.012;
        const snappedX = Math.abs(centerX - 0.5) < snapThreshold;
        const snappedY = Math.abs(centerY - 0.5) < snapThreshold;
        if (snappedX) nextX = 0.5 - ds.origW / 2;
        if (snappedY) nextY = 0.5 - ds.origH / 2;
        setSnapGuides({ x: snappedX, y: snappedY });

        const clamped = clampBlockBounds({
          x: nextX,
          y: nextY,
          width: ds.origW,
          height: ds.origH,
        });
        onUpdateBlock(ds.blockId, clamped);
      } else if (ds.kind === 'resize' && ds.handle) {
        let x = ds.origX;
        let y = ds.origY;
        let w = ds.origW;
        let h = ds.origH;
        const minW = 0.06;
        const minH = 0.05;

        if (ds.handle.includes('e')) {
          w = Math.max(minW, ds.origW + dxNorm);
        }
        if (ds.handle.includes('s')) {
          h = Math.max(minH, ds.origH + dyNorm);
        }
        if (ds.handle.includes('w')) {
          const maxShift = ds.origW - minW;
          const shift = Math.min(maxShift, dxNorm);
          x = ds.origX + shift;
          w = ds.origW - shift;
        }
        if (ds.handle.includes('n')) {
          const maxShift = ds.origH - minH;
          const shift = Math.min(maxShift, dyNorm);
          y = ds.origY + shift;
          h = ds.origH - shift;
        }

        const clamped = clampBlockBounds({ x, y, width: w, height: h }, minW, minH);
        onUpdateBlock(ds.blockId, clamped);
      }
    };

    const onPointerUp = () => {
      if (dragStateRef.current) {
        dragStateRef.current = null;
        setSnapGuides({ x: false, y: false });
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [scale, onUpdateBlock]);

  const startMove = (e: React.PointerEvent, block: SlideBlock) => {
    if (editingBlockId === block.id) return;
    e.stopPropagation();
    onSelectBlock(block.id);
    dragStateRef.current = {
      kind: 'move',
      blockId: block.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: block.x,
      origY: block.y,
      origW: block.width,
      origH: block.height,
    };
  };

  const startResize = (e: React.PointerEvent, block: SlideBlock, handle: HandleDir) => {
    e.stopPropagation();
    onSelectBlock(block.id);
    dragStateRef.current = {
      kind: 'resize',
      blockId: block.id,
      handle,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: block.x,
      origY: block.y,
      origW: block.width,
      origH: block.height,
    };
  };

  const bgStyle = slide.background.gradientTo
    ? { background: `linear-gradient(135deg, ${slide.background.color}, ${slide.background.gradientTo})` }
    : { backgroundColor: slide.background.color || '#0F172A' };

  return (
    <div className="flex flex-col flex-1 min-w-0 min-h-0">
      {/* Quick Creation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-[#0B0E14]">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Thêm khối:</span>
          <button
            type="button"
            onClick={() => onAddBlock('text')}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-white/[0.06] text-slate-100 hover:bg-white/[0.12] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <Type className="w-3.5 h-3.5 text-sky-400" />
            <span>Khung chữ</span>
          </button>
          <button
            type="button"
            onClick={() => onAddBlock('image')}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-white/[0.06] text-slate-100 hover:bg-white/[0.12] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>Hình ảnh</span>
          </button>
          <button
            type="button"
            onClick={() => onAddBlock('shape')}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-white/[0.06] text-slate-100 hover:bg-white/[0.12] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <Square className="w-3.5 h-3.5 text-orange-400" />
            <span>Hình khối</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onPreviewSwarm}
          title="Chạy thử hiệu ứng Swarm từ slide này (Phím R khi trình chiếu)"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-sky-200 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/25 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Dựng thử Swarm</span>
        </button>
      </div>

      {/* Centered 16:9 Artboard Viewport */}
      <div
        ref={containerRef}
        onClick={() => {
          onSelectBlock(null);
          setEditingBlockId(null);
        }}
        className="flex-1 flex items-center justify-center p-3 overflow-hidden min-w-0 min-h-0 bg-[#090B10]"
      >
        <div
          data-testid="editor-artboard"
          data-slide-index={slideIndex}
          className="relative shadow-[0_24px_80px_rgba(0,0,0,0.65)] ring-1 ring-white/10 rounded-md overflow-hidden shrink-0"
          style={{
            width: `${SLIDE_WIDTH * scale}px`,
            height: `${SLIDE_HEIGHT * scale}px`,
          }}
        >
          {/* Virtual 1920x1080 coordinate layer */}
          <div
            className="relative origin-top-left select-none"
            style={{
              width: `${SLIDE_WIDTH}px`,
              height: `${SLIDE_HEIGHT}px`,
              transform: `scale(${scale})`,
              ...bgStyle,
            }}
          >
            {slide.background.imageUrl && (
              <img
                src={slide.background.imageUrl}
                alt="Ảnh nền slide"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
            )}

            {/* Center snap guides during drag */}
            {snapGuides.x && (
              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-px w-[2px] bg-sky-400/70 pointer-events-none z-40" />
            )}
            {snapGuides.y && (
              <div className="absolute left-0 right-0 top-1/2 -translate-y-px h-[2px] bg-sky-400/70 pointer-events-none z-40" />
            )}

            {slide.blocks.map((block) => {
              const isSelected = block.id === selectedBlockId;
              const isEditing = block.id === editingBlockId;
              const bx = block.x * SLIDE_WIDTH;
              const by = block.y * SLIDE_HEIGHT;
              const bw = block.width * SLIDE_WIDTH;
              const bh = block.height * SLIDE_HEIGHT;
              const padX = block.type === 'shape' ? 28 : 12;
              const padY = block.type === 'shape' ? 24 : 8;

              return (
                <div
                  key={block.id}
                  data-testid={`editor-block-${block.id}`}
                  onPointerDown={(e) => startMove(e, block)}
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (block.type === 'text' || block.type === 'shape') {
                      onSelectBlock(block.id);
                      setEditingBlockId(block.id);
                    }
                  }}
                  style={{
                    left: `${bx}px`,
                    top: `${by}px`,
                    width: `${bw}px`,
                    height: `${bh}px`,
                    backgroundColor:
                      block.fillColor && block.fillColor !== 'transparent' ? block.fillColor : 'transparent',
                    border:
                      block.strokeColor && block.strokeColor !== 'transparent' && (block.strokeWidth ?? 0) > 0
                        ? `${block.strokeWidth ?? 2}px solid ${block.strokeColor}`
                        : undefined,
                    borderRadius: `${block.borderRadius ?? 0}px`,
                  }}
                  className={`absolute group cursor-move ${
                    isSelected
                      ? 'outline-2 outline-sky-400 outline-offset-0'
                      : 'hover:outline-1 hover:outline-sky-400/50'
                  }`}
                >
                  {/* Image block */}
                  {block.type === 'image' && (
                    <div
                      className="w-full h-full overflow-hidden flex items-center justify-center bg-slate-800/70"
                      style={{ borderRadius: `${Math.max(0, (block.borderRadius ?? 0) - 2)}px` }}
                    >
                      {block.imageUrl && !brokenImages[block.id] ? (
                        <img
                          src={block.imageUrl}
                          alt={block.label}
                          referrerPolicy="no-referrer"
                          onError={() => setBrokenImages((prev) => ({ ...prev, [block.id]: true }))}
                          onLoad={() =>
                            setBrokenImages((prev) => {
                              if (!prev[block.id]) return prev;
                              const next = { ...prev };
                              delete next[block.id];
                              return next;
                            })
                          }
                          className="w-full h-full object-cover pointer-events-none"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-3 text-slate-400 pointer-events-none">
                          <ImageIcon className="w-14 h-14 opacity-60" />
                          <span className="text-[24px] font-medium">
                            {brokenImages[block.id] ? 'Không tải được ảnh' : 'Chọn ảnh ở bảng bên phải'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Text or Shape text */}
                  {(block.type === 'text' || block.type === 'shape') &&
                    (isEditing ? (
                      <textarea
                        autoFocus
                        value={block.text ?? ''}
                        onChange={(e) => onUpdateBlock(block.id, { text: e.target.value })}
                        onBlur={() => setEditingBlockId(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setEditingBlockId(null);
                          }
                        }}
                        style={{
                          padding: `${padY}px ${padX}px`,
                          fontSize: `${block.fontSize ?? 32}px`,
                          fontWeight: block.fontWeight ?? '400',
                          textAlign: block.textAlign ?? 'left',
                          color: block.textColor ?? '#F8FAFC',
                          lineHeight: 1.28,
                        }}
                        className="w-full h-full bg-transparent resize-none outline-none cursor-text"
                      />
                    ) : (
                      <div
                        style={{
                          padding: `${padY}px ${padX}px`,
                          fontSize: `${block.fontSize ?? 32}px`,
                          fontWeight: block.fontWeight ?? '400',
                          textAlign: block.textAlign ?? 'left',
                          color: block.textColor ?? '#F8FAFC',
                          lineHeight: 1.28,
                        }}
                        className="w-full h-full overflow-hidden whitespace-pre-wrap break-words"
                      >
                        {block.text || (
                          <span className="opacity-40">
                            {block.type === 'text' ? 'Nhấn đúp để nhập chữ' : ''}
                          </span>
                        )}
                      </div>
                    ))}

                  {/* Selection tag + 4 corner resize handles */}
                  {isSelected && !isEditing && (
                    <>
                      <div
                        className="absolute -top-9 left-0 px-2.5 py-1 rounded bg-sky-500 text-slate-950 text-[20px] font-mono font-semibold whitespace-nowrap pointer-events-none"
                      >
                        {block.label} · {Math.round(bw)} × {Math.round(bh)}
                      </div>
                      {(['nw', 'ne', 'sw', 'se'] as const).map((dir) => {
                        const posClass =
                          dir === 'nw'
                            ? '-top-2.5 -left-2.5 cursor-nwse-resize'
                            : dir === 'ne'
                            ? '-top-2.5 -right-2.5 cursor-nesw-resize'
                            : dir === 'sw'
                            ? '-bottom-2.5 -left-2.5 cursor-nesw-resize'
                            : '-bottom-2.5 -right-2.5 cursor-nwse-resize';
                        return (
                          <button
                            key={dir}
                            type="button"
                            aria-label={`Đổi kích thước góc ${dir}`}
                            onPointerDown={(e) => startResize(e, block, dir)}
                            className={`absolute w-5 h-5 rounded-sm bg-[#090B10] border-2 border-sky-400 ${posClass}`}
                          />
                        );
                      })}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
