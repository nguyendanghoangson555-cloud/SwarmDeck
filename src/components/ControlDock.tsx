import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Pencil,
  RotateCcw,
  Square,
  Video,
} from 'lucide-react';
import type { BuildSpeed, CursorMode, OverlayMode } from '../types/deck';

interface ControlDockProps {
  currentIndex: number;
  totalSlides: number;
  cursorMode: CursorMode;
  speed: BuildSpeed;
  overlayMode: OverlayMode;
  isFullscreen: boolean;
  isRecording: boolean;
  recordingSeconds: number;
  visible: boolean;
  onPrev: () => void;
  onNext: () => void;
  onReplay: () => void;
  onChangeCursorMode: (mode: CursorMode) => void;
  onChangeSpeed: (speed: BuildSpeed) => void;
  onToggleOverlay: () => void;
  onToggleRecord: () => void;
  onToggleFullscreen: () => void;
  onExitPresent: () => void;
}

function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function ControlDock({
  currentIndex,
  totalSlides,
  cursorMode,
  speed,
  overlayMode,
  isFullscreen,
  isRecording,
  recordingSeconds,
  visible,
  onPrev,
  onNext,
  onReplay,
  onChangeCursorMode,
  onChangeSpeed,
  onToggleOverlay,
  onToggleRecord,
  onToggleFullscreen,
  onExitPresent,
}: ControlDockProps) {
  const overlayLabel =
    overlayMode === 'active' ? 'Lớp phủ' : overlayMode === 'dimmed' ? 'Làm mờ' : 'Đã ẩn';

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-[96vw] transition-all duration-200 ease-out ${
        visible || isRecording
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div
        role="toolbar"
        aria-label="Thanh điều khiển trình chiếu"
        className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#11141C]/95 border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.65)]"
      >
        {/* Back to Editor */}
        <button
          type="button"
          onClick={onExitPresent}
          title="Quay lại soạn thảo"
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <Pencil className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Soạn thảo</span>
        </button>

        {/* Slide Navigation */}
        <div className="flex items-center gap-0.5 sm:px-1.5 sm:border-x sm:border-white/10 shrink-0">
          <button
            type="button"
            onClick={onPrev}
            disabled={currentIndex === 0}
            aria-label="Slide trước"
            title="Slide trước (Mũi tên trái)"
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-200 hover:bg-white/10 disabled:opacity-35 disabled:pointer-events-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span
            className="px-1.5 text-xs font-mono tabular-nums text-slate-300 whitespace-nowrap select-none"
            aria-label={`Slide ${currentIndex + 1} trên ${totalSlides}`}
          >
            {currentIndex + 1} / {totalSlides}
          </span>
          <button
            type="button"
            onClick={onNext}
            disabled={currentIndex >= totalSlides - 1}
            aria-label="Slide tiếp theo"
            title="Slide tiếp theo (Mũi tên phải)"
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-200 hover:bg-white/10 disabled:opacity-35 disabled:pointer-events-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Replay Swarm */}
        <button
          type="button"
          onClick={onReplay}
          title="Dựng lại hiệu ứng (Phím R)"
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium text-slate-100 bg-white/[0.06] hover:bg-white/[0.12] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
          <span>Dựng lại</span>
          <kbd className="hidden lg:inline text-[10px] font-mono text-slate-400">R</kbd>
        </button>

        {/* Cursor Mode Segmented Control */}
        <div
          role="group"
          aria-label="Kiểu con trỏ"
          className="flex items-center p-0.5 rounded-lg bg-[#090B10] border border-white/10 shrink-0"
        >
          <button
            type="button"
            onClick={() => onChangeCursorMode('swarm')}
            aria-pressed={cursorMode === 'swarm'}
            className={`h-7 px-2.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              cursorMode === 'swarm'
                ? 'bg-sky-500/20 text-sky-200'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Đàn con trỏ
          </button>
          <button
            type="button"
            onClick={() => onChangeCursorMode('minimal')}
            aria-pressed={cursorMode === 'minimal'}
            className={`h-7 px-2.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              cursorMode === 'minimal'
                ? 'bg-sky-500/20 text-sky-200'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tối giản
          </button>
        </div>

        {/* Speed Segmented Control */}
        <div
          role="group"
          aria-label="Tốc độ dựng"
          className="hidden md:flex items-center p-0.5 rounded-lg bg-[#090B10] border border-white/10 shrink-0"
        >
          {(
            [
              { id: 'fast', label: 'Nhanh' },
              { id: 'normal', label: 'Chuẩn' },
              { id: 'slow', label: 'Chậm' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeSpeed(item.id)}
              aria-pressed={speed === item.id}
              className={`h-7 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                speed === item.id
                  ? 'bg-white/15 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Toggle Overlay (G) */}
        <button
          type="button"
          onClick={onToggleOverlay}
          title="Chuyển trạng thái lớp phủ: Hiện / Mờ / Ẩn (Phím G)"
          className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
            overlayMode === 'hidden'
              ? 'text-slate-400 bg-white/[0.03] hover:bg-white/[0.08]'
              : overlayMode === 'dimmed'
              ? 'text-amber-200 bg-amber-500/15 hover:bg-amber-500/20'
              : 'text-slate-100 bg-white/[0.06] hover:bg-white/[0.12]'
          }`}
        >
          {overlayMode === 'hidden' ? (
            <EyeOff className="w-3.5 h-3.5" />
          ) : (
            <Eye className="w-3.5 h-3.5" />
          )}
          <span>{overlayLabel}</span>
          <kbd className="hidden lg:inline text-[10px] font-mono text-slate-400">G</kbd>
        </button>

        {/* Record Video (.webm) */}
        <button
          type="button"
          onClick={onToggleRecord}
          title={isRecording ? 'Dừng quay và tải video .webm' : 'Quay video slide (.webm)'}
          className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
            isRecording
              ? 'bg-rose-600 text-white hover:bg-rose-500'
              : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
          }`}
        >
          {isRecording ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span className="font-mono tabular-nums">{formatTimer(recordingSeconds)}</span>
              <span>Dừng & Lưu</span>
            </>
          ) : (
            <>
              <Video className="w-3.5 h-3.5" />
              <span>Quay video</span>
            </>
          )}
        </button>

        {/* Fullscreen */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
          title="Toàn màn hình (Phím F)"
          className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-200 hover:bg-white/10 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
