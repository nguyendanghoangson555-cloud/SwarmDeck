import { Copy, Plus, Trash2 } from 'lucide-react';
import type { EditableSlide } from '../types/deck';
import { deriveSlideTitle } from '../utils/deckStorage';

interface SlideRailProps {
  slides: EditableSlide[];
  currentIndex: number;
  editable: boolean;
  onSelectSlide: (index: number) => void;
  onAddSlide: () => void;
  onDuplicateSlide: (index: number) => void;
  onDeleteSlide: (index: number) => void;
}

export function SlideRail({
  slides,
  currentIndex,
  editable,
  onSelectSlide,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
}: SlideRailProps) {
  return (
    <aside
      aria-label="Danh sách slide"
      className="hidden md:flex flex-col w-56 shrink-0 h-full border-r border-white/[0.08] bg-[#0D1017]"
    >
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-300">Trang slide</span>
          <span className="text-xs font-mono tabular-nums text-slate-500">{slides.length}</span>
        </div>
        {editable && (
          <button
            type="button"
            onClick={onAddSlide}
            aria-label="Thêm slide mới"
            title="Thêm slide mới"
            className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium bg-sky-500/15 text-sky-300 hover:bg-sky-500/25 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2.5">
        {slides.map((slide, idx) => {
          const active = idx === currentIndex;
          const title = deriveSlideTitle(slide, idx);
          const bgStyle = slide.background.gradientTo
            ? { background: `linear-gradient(135deg, ${slide.background.color}, ${slide.background.gradientTo})` }
            : { backgroundColor: slide.background.color || '#0F172A' };

          return (
            <div
              key={slide.id}
              className={`group relative flex flex-col gap-1.5 p-1.5 rounded-lg transition-colors ${
                active ? 'bg-white/[0.08] ring-1 ring-sky-400/70' : 'hover:bg-white/[0.04]'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectSlide(idx)}
                aria-current={active ? 'page' : undefined}
                aria-label={`Chọn slide ${idx + 1}: ${title}`}
                className="flex flex-col gap-1.5 text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
              >
                {/* Live miniature slide preview */}
                <div
                  className="relative w-full aspect-video rounded overflow-hidden border border-white/10"
                  style={bgStyle}
                >
                  {slide.background.imageUrl && (
                    <img
                      src={slide.background.imageUrl}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  {slide.blocks.map((blk) => (
                    <div
                      key={blk.id}
                      className="absolute overflow-hidden"
                      style={{
                        left: `${blk.x * 100}%`,
                        top: `${blk.y * 100}%`,
                        width: `${blk.width * 100}%`,
                        height: `${blk.height * 100}%`,
                        backgroundColor:
                          blk.fillColor && blk.fillColor !== 'transparent'
                            ? blk.fillColor
                            : blk.type === 'image' && !blk.imageUrl
                            ? 'rgba(148,163,184,0.22)'
                            : 'transparent',
                        border:
                          blk.strokeColor && blk.strokeColor !== 'transparent' && (blk.strokeWidth ?? 0) > 0
                            ? `1px solid ${blk.strokeColor}`
                            : undefined,
                        borderRadius: `${Math.min(6, (blk.borderRadius ?? 0) * 0.15)}px`,
                      }}
                    >
                      {blk.type === 'image' && blk.imageUrl ? (
                        <img
                          src={blk.imageUrl}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : blk.text ? (
                        <div
                          className="w-full h-full px-1 py-0.5 leading-tight overflow-hidden whitespace-pre-wrap"
                          style={{
                            color: blk.textColor ?? '#F8FAFC',
                            fontSize: `${Math.max(4, (blk.fontSize ?? 28) * 0.1)}px`,
                            fontWeight: blk.fontWeight ?? '400',
                            textAlign: blk.textAlign ?? 'left',
                          }}
                        >
                          {blk.text}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="flex items-baseline gap-2 px-0.5 min-w-0">
                  <span
                    className={`text-[11px] font-mono tabular-nums shrink-0 ${
                      active ? 'text-sky-400 font-semibold' : 'text-slate-500'
                    }`}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={`text-xs truncate ${
                      active ? 'text-slate-100 font-medium' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    {title}
                  </span>
                </div>
              </button>

              {editable && (
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity pt-0.5">
                  <button
                    type="button"
                    onClick={() => onDuplicateSlide(idx)}
                    aria-label={`Nhân bản slide ${idx + 1}`}
                    title="Nhân bản slide"
                    className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-white/10"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteSlide(idx)}
                    disabled={slides.length <= 1}
                    aria-label={`Xóa slide ${idx + 1}`}
                    title="Xóa slide"
                    className="p-1 rounded text-slate-400 hover:text-rose-300 hover:bg-rose-500/15 disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
