import { useRef } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  Copy,
  ImagePlus,
  Trash2,
} from 'lucide-react';
import type { EditableSlide, SlideBackground, SlideBlock } from '../types/deck';

interface SlideInspectorProps {
  slide: EditableSlide;
  selectedBlock: SlideBlock | null;
  onUpdateSlideBg: (bg: Partial<SlideBackground>) => void;
  onUpdateBlock: (blockId: string, patch: Partial<SlideBlock>) => void;
  onMoveBlockLayer: (blockId: string, direction: 'up' | 'down') => void;
  onDuplicateBlock: (blockId: string) => void;
  onDeleteBlock: (blockId: string) => void;
}

const BG_PRESETS: { name: string; color: string; gradientTo?: string }[] = [
  { name: 'Tối Slate', color: '#0F172A' },
  { name: 'Xanh Đêm', color: '#0F172A', gradientTo: '#172554' },
  { name: 'Đen Sâu', color: '#090B10' },
  { name: 'Trắng Sáng', color: '#FFFFFF' },
  { name: 'Giấy Xám', color: '#F8FAFC' },
  { name: 'Xanh Than', color: '#1E293B', gradientTo: '#0F172A' },
];

const COLOR_SWATCHES = [
  '#F8FAFC',
  '#CBD5E1',
  '#0F172A',
  '#38BDF8',
  '#34D399',
  '#F97316',
  '#FBBF24',
  '#A78BFA',
];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function SlideInspector({
  slide,
  selectedBlock,
  onUpdateSlideBg,
  onUpdateBlock,
  onMoveBlockLayer,
  onDuplicateBlock,
  onDeleteBlock,
}: SlideInspectorProps) {
  const blockImgInputRef = useRef<HTMLInputElement | null>(null);
  const bgImgInputRef = useRef<HTMLInputElement | null>(null);

  const handleUploadBlockImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedBlock) {
      const dataUrl = await readFileAsDataUrl(file);
      onUpdateBlock(selectedBlock.id, { imageUrl: dataUrl });
    }
    e.target.value = '';
  };

  const handleUploadBgImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const dataUrl = await readFileAsDataUrl(file);
      onUpdateSlideBg({ imageUrl: dataUrl });
    }
    e.target.value = '';
  };

  return (
    <aside
      aria-label="Thuộc tính slide và khối"
      className="hidden lg:flex flex-col w-72 shrink-0 h-full border-l border-white/[0.08] bg-[#0D1017] overflow-y-auto p-4 gap-5"
    >
      <input
        ref={blockImgInputRef}
        type="file"
        accept="image/*"
        onChange={handleUploadBlockImage}
        aria-label="Tải ảnh cho khối"
        className="sr-only"
      />
      <input
        ref={bgImgInputRef}
        type="file"
        accept="image/*"
        onChange={handleUploadBgImage}
        aria-label="Tải ảnh nền slide"
        className="sr-only"
      />

      {selectedBlock ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div>
              <h2 className="text-xs font-semibold text-slate-100">
                {selectedBlock.type === 'text'
                  ? 'Thuộc tính Khung chữ'
                  : selectedBlock.type === 'image'
                  ? 'Thuộc tính Hình ảnh'
                  : 'Thuộc tính Hình khối'}
              </h2>
              <p className="text-[11px] font-mono tabular-nums text-slate-400 mt-0.5">
                {Math.round(selectedBlock.width * 1920)} × {Math.round(selectedBlock.height * 1080)} px
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onMoveBlockLayer(selectedBlock.id, 'up')}
                title="Đưa lên lớp trên"
                aria-label="Đưa khối lên trên"
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-white/10"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onMoveBlockLayer(selectedBlock.id, 'down')}
                title="Đưa xuống lớp dưới"
                aria-label="Đưa khối xuống dưới"
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-white/10"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDuplicateBlock(selectedBlock.id)}
                title="Nhân bản khối"
                aria-label="Nhân bản khối"
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-white/10"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteBlock(selectedBlock.id)}
                title="Xóa khối (Delete)"
                aria-label="Xóa khối"
                className="p-1.5 rounded-md text-slate-400 hover:text-rose-300 hover:bg-rose-500/15"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Label for Swarm badge */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-slate-400">Tên khối (hiển thị khi Swarm dựng)</span>
            <input
              type="text"
              value={selectedBlock.label}
              onChange={(e) => onUpdateBlock(selectedBlock.id, { label: e.target.value })}
              className="h-8 px-2.5 rounded-lg bg-[#090B10] border border-white/10 text-xs text-slate-100 focus:outline-none focus:border-sky-400"
            />
          </label>

          {/* Image source controls */}
          {selectedBlock.type === 'image' && (
            <div className="flex flex-col gap-2.5 pt-1 border-t border-white/[0.06]">
              <span className="text-xs font-medium text-slate-300">Nguồn hình ảnh</span>
              <button
                type="button"
                onClick={() => blockImgInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 h-9 px-3 rounded-lg text-xs font-medium bg-sky-500/15 text-sky-200 hover:bg-sky-500/25 border border-sky-400/25 transition-colors"
              >
                <ImagePlus className="w-4 h-4" />
                <span>Tải ảnh từ máy</span>
              </button>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-slate-400">Hoặc dán đường dẫn ảnh (URL)</span>
                <input
                  type="url"
                  placeholder="https://..."
                  value={selectedBlock.imageUrl?.startsWith('data:') ? '' : selectedBlock.imageUrl ?? ''}
                  onChange={(e) => onUpdateBlock(selectedBlock.id, { imageUrl: e.target.value })}
                  className="h-8 px-2.5 rounded-lg bg-[#090B10] border border-white/10 text-xs text-slate-100 focus:outline-none focus:border-sky-400"
                />
              </label>
            </div>
          )}

          {/* Text controls */}
          {(selectedBlock.type === 'text' || selectedBlock.type === 'shape') && (
            <div className="flex flex-col gap-3 pt-1 border-t border-white/[0.06]">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-slate-400">Nội dung chữ</span>
                <textarea
                  rows={3}
                  value={selectedBlock.text ?? ''}
                  onChange={(e) => onUpdateBlock(selectedBlock.id, { text: e.target.value })}
                  placeholder="Nhập nội dung..."
                  className="p-2.5 rounded-lg bg-[#090B10] border border-white/10 text-xs text-slate-100 resize-y focus:outline-none focus:border-sky-400"
                />
              </label>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Cỡ chữ</span>
                  <span className="font-mono tabular-nums text-slate-200">
                    {selectedBlock.fontSize ?? 32} px
                  </span>
                </div>
                <input
                  type="range"
                  min={16}
                  max={110}
                  step={2}
                  aria-label="Cỡ chữ"
                  value={selectedBlock.fontSize ?? 32}
                  onChange={(e) => onUpdateBlock(selectedBlock.id, { fontSize: Number(e.target.value) })}
                  className="accent-sky-400 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateBlock(selectedBlock.id, {
                      fontWeight: selectedBlock.fontWeight === '700' ? '400' : '700',
                    })
                  }
                  aria-pressed={selectedBlock.fontWeight === '700'}
                  aria-label="In đậm"
                  className={`inline-flex items-center justify-center gap-1 h-8 px-2.5 rounded-lg text-xs font-medium border transition-colors ${
                    selectedBlock.fontWeight === '700'
                      ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
                      : 'bg-[#090B10] border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  <Bold className="w-3.5 h-3.5" />
                  <span>Đậm</span>
                </button>

                <div role="group" aria-label="Căn lề chữ" className="flex items-center p-0.5 rounded-lg bg-[#090B10] border border-white/10">
                  {(
                    [
                      { id: 'left', Icon: AlignLeft, label: 'Căn trái' },
                      { id: 'center', Icon: AlignCenter, label: 'Căn giữa' },
                      { id: 'right', Icon: AlignRight, label: 'Căn phải' },
                    ] as const
                  ).map(({ id, Icon, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onUpdateBlock(selectedBlock.id, { textAlign: id })}
                      aria-label={label}
                      aria-pressed={(selectedBlock.textAlign ?? 'left') === id}
                      className={`p-1.5 rounded-md transition-colors ${
                        (selectedBlock.textAlign ?? 'left') === id
                          ? 'bg-white/15 text-slate-100'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-slate-400">Màu chữ</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {COLOR_SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => onUpdateBlock(selectedBlock.id, { textColor: c })}
                      aria-label={`Chọn màu chữ ${c}`}
                      className={`w-6 h-6 rounded-md border ${
                        selectedBlock.textColor === c ? 'ring-2 ring-sky-400 border-white' : 'border-white/20'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    aria-label="Màu chữ tùy chọn"
                    value={selectedBlock.textColor?.startsWith('#') ? selectedBlock.textColor : '#F8FAFC'}
                    onChange={(e) => onUpdateBlock(selectedBlock.id, { textColor: e.target.value })}
                    className="w-6 h-6 rounded bg-transparent border border-white/20 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Box Fill, Border & Radius */}
          <div className="flex flex-col gap-3 pt-2 border-t border-white/[0.06]">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Màu nền khối</span>
                <button
                  type="button"
                  onClick={() => onUpdateBlock(selectedBlock.id, { fillColor: 'transparent' })}
                  className="text-[11px] text-sky-400 hover:underline"
                >
                  Trong suốt
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {['#0F172A', '#1E293B', '#FFFFFF', '#F1F5F9', '#0284C7', '#059669'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onUpdateBlock(selectedBlock.id, { fillColor: c })}
                    aria-label={`Màu nền khối ${c}`}
                    className={`w-6 h-6 rounded-md border ${
                      selectedBlock.fillColor === c ? 'ring-2 ring-sky-400 border-white' : 'border-white/20'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  aria-label="Màu nền khối tùy chọn"
                  value={selectedBlock.fillColor?.startsWith('#') ? selectedBlock.fillColor : '#1E293B'}
                  onChange={(e) => onUpdateBlock(selectedBlock.id, { fillColor: e.target.value })}
                  className="w-6 h-6 rounded bg-transparent border border-white/20 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Viền khung</span>
                <button
                  type="button"
                  onClick={() => onUpdateBlock(selectedBlock.id, { strokeWidth: 0, strokeColor: 'transparent' })}
                  className="text-[11px] text-sky-400 hover:underline"
                >
                  Bỏ viền
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Màu viền"
                  value={selectedBlock.strokeColor?.startsWith('#') ? selectedBlock.strokeColor : '#38BDF8'}
                  onChange={(e) =>
                    onUpdateBlock(selectedBlock.id, {
                      strokeColor: e.target.value,
                      strokeWidth: Math.max(2, selectedBlock.strokeWidth ?? 2),
                    })
                  }
                  className="w-7 h-7 rounded bg-transparent border border-white/20 cursor-pointer shrink-0"
                />
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  aria-label="Độ dày viền"
                  value={selectedBlock.strokeWidth ?? 0}
                  onChange={(e) => {
                    const w = Number(e.target.value);
                    onUpdateBlock(selectedBlock.id, {
                      strokeWidth: w,
                      strokeColor:
                        w > 0 && (!selectedBlock.strokeColor || selectedBlock.strokeColor === 'transparent')
                          ? '#38BDF8'
                          : selectedBlock.strokeColor,
                    });
                  }}
                  className="flex-1 accent-sky-400 cursor-pointer"
                />
                <span className="text-[11px] font-mono tabular-nums text-slate-300 w-7 text-right">
                  {selectedBlock.strokeWidth ?? 0}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Bo góc</span>
                <span className="font-mono tabular-nums text-slate-200">{selectedBlock.borderRadius ?? 0} px</span>
              </div>
              <input
                type="range"
                min={0}
                max={48}
                step={2}
                aria-label="Bo góc"
                value={selectedBlock.borderRadius ?? 0}
                onChange={(e) => onUpdateBlock(selectedBlock.id, { borderRadius: Number(e.target.value) })}
                className="accent-sky-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="pb-3 border-b border-white/[0.06]">
            <h2 className="text-xs font-semibold text-slate-100">Nền Slide</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Chọn màu nền hoặc tải ảnh nền cho trang hiện tại. Nhấn vào từng khối trên slide để chỉnh sửa.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs text-slate-400">Mẫu nền nhanh</span>
            <div className="grid grid-cols-3 gap-2">
              {BG_PRESETS.map((preset) => {
                const active =
                  slide.background.color.toLowerCase() === preset.color.toLowerCase() &&
                  (slide.background.gradientTo ?? '') === (preset.gradientTo ?? '') &&
                  !slide.background.imageUrl;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() =>
                      onUpdateSlideBg({
                        color: preset.color,
                        gradientTo: preset.gradientTo,
                        imageUrl: undefined,
                      })
                    }
                    className={`flex flex-col items-start gap-1 p-1.5 rounded-lg border text-left transition-colors ${
                      active
                        ? 'border-sky-400 bg-sky-500/10'
                        : 'border-white/10 hover:border-white/25 bg-[#090B10]'
                    }`}
                  >
                    <div
                      className="w-full h-7 rounded border border-white/10"
                      style={
                        preset.gradientTo
                          ? { background: `linear-gradient(135deg, ${preset.color}, ${preset.gradientTo})` }
                          : { backgroundColor: preset.color }
                      }
                    />
                    <span className="text-[11px] text-slate-300 truncate w-full">{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.06]">
            <span className="text-xs text-slate-400">Màu tùy chỉnh</span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="color"
                  aria-label="Màu nền chính"
                  value={slide.background.color.startsWith('#') ? slide.background.color : '#0F172A'}
                  onChange={(e) => onUpdateSlideBg({ color: e.target.value })}
                  className="w-7 h-7 rounded bg-transparent border border-white/20 cursor-pointer"
                />
                <span>Màu chính</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="color"
                  aria-label="Màu chuyển sắc"
                  value={
                    slide.background.gradientTo?.startsWith('#')
                      ? slide.background.gradientTo
                      : slide.background.color
                  }
                  onChange={(e) => onUpdateSlideBg({ gradientTo: e.target.value })}
                  className="w-7 h-7 rounded bg-transparent border border-white/20 cursor-pointer"
                />
                <span>Chuyển sắc</span>
              </label>
            </div>
            {slide.background.gradientTo && (
              <button
                type="button"
                onClick={() => onUpdateSlideBg({ gradientTo: undefined })}
                className="text-left text-[11px] text-sky-400 hover:underline"
              >
                Chuyển về màu đơn sắc
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2.5 pt-2 border-t border-white/[0.06]">
            <span className="text-xs text-slate-400">Ảnh nền slide</span>
            <button
              type="button"
              onClick={() => bgImgInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 h-9 px-3 rounded-lg text-xs font-medium bg-white/[0.06] text-slate-100 hover:bg-white/[0.12] border border-white/10 transition-colors"
            >
              <ImagePlus className="w-4 h-4 text-sky-400" />
              <span>Tải ảnh nền từ máy</span>
            </button>
            <input
              type="url"
              placeholder="Hoặc dán URL ảnh nền..."
              value={slide.background.imageUrl?.startsWith('data:') ? '' : slide.background.imageUrl ?? ''}
              onChange={(e) => onUpdateSlideBg({ imageUrl: e.target.value || undefined })}
              className="h-8 px-2.5 rounded-lg bg-[#090B10] border border-white/10 text-xs text-slate-100 focus:outline-none focus:border-sky-400"
            />
            {slide.background.imageUrl && (
              <button
                type="button"
                onClick={() => onUpdateSlideBg({ imageUrl: undefined })}
                className="text-left text-[11px] text-rose-300 hover:underline"
              >
                Xóa ảnh nền
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
