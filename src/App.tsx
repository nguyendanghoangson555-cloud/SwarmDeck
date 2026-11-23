import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FolderOpen,
  HelpCircle,
  Pencil,
  Play,
  Plus,
  X,
} from 'lucide-react';
import { ControlDock } from './components/ControlDock';
import { ImportOverlay } from './components/ImportOverlay';
import { SlideEditorStage } from './components/SlideEditorStage';
import { SlideInspector } from './components/SlideInspector';
import { SlideRail } from './components/SlideRail';
import { SwarmStage } from './components/SwarmStage';
import type {
  AppMode,
  BlockType,
  BuildSpeed,
  CursorMode,
  EditableDeck,
  EditableSlide,
  OverlayMode,
  SlideBackground,
  SlideBlock,
  SwarmPhase,
} from './types/deck';
import {
  createBlankSlide,
  createDefaultBlock,
  isColorDarkHex,
  loadDeckFromStorage,
  saveDeckToStorage,
  validateDeckJson,
} from './utils/deckStorage';
import { createDemoDeck } from './utils/demoDeck';

function slugifyFileName(title: string): string {
  const cleaned = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'swarmdeck-slides';
}

export default function App() {
  const initialDeck = useMemo<EditableDeck>(() => loadDeckFromStorage() ?? createDemoDeck(), []);
  const [deck, setDeck] = useState<EditableDeck>(initialDeck);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [appMode, setAppMode] = useState<AppMode>('edit');

  // Swarm Controller state
  const [cursorMode, setCursorMode] = useState<CursorMode>('swarm');
  const [speed, setSpeed] = useState<BuildSpeed>('normal');
  const [overlayMode, setOverlayMode] = useState<OverlayMode>('active');
  const [replayToken, setReplayToken] = useState(1);
  const [swarmPhase, setSwarmPhase] = useState<SwarmPhase>('idle');

  // Presentation Chrome state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Import & Notifications
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Video Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const idleTimerRef = useRef<number | null>(null);
  const dragCounterRef = useRef(0);

  const safeIndex = Math.max(0, Math.min(deck.slides.length - 1, currentIndex));
  const currentSlide = deck.slides[safeIndex] ?? deck.slides[0];
  const selectedBlock = useMemo(
    () => currentSlide.blocks.find((b) => b.id === selectedBlockId) ?? null,
    [currentSlide.blocks, selectedBlockId]
  );

  // Persist deck changes automatically to localStorage
  useEffect(() => {
    saveDeckToStorage(deck);
  }, [deck]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  const updateCurrentSlide = useCallback(
    (updater: (slide: EditableSlide) => EditableSlide) => {
      setDeck((prev) => ({
        ...prev,
        updatedAt: Date.now(),
        slides: prev.slides.map((s, idx) => (idx === safeIndex ? updater(s) : s)),
      }));
    },
    [safeIndex]
  );

  const goToSlide = useCallback(
    (nextIdx: number) => {
      const clamped = Math.max(0, Math.min(deck.slides.length - 1, nextIdx));
      if (clamped !== safeIndex) {
        setCurrentIndex(clamped);
        setSelectedBlockId(null);
        setReplayToken((t) => t + 1);
      }
    },
    [deck.slides.length, safeIndex]
  );

  // Slide CRUD handlers
  const handleAddSlide = useCallback(() => {
    const newSlide = createBlankSlide(deck.slides.length + 1);
    const insertAt = safeIndex + 1;
    setDeck((prev) => {
      const nextSlides = [...prev.slides];
      nextSlides.splice(insertAt, 0, newSlide);
      return { ...prev, updatedAt: Date.now(), slides: nextSlides };
    });
    setCurrentIndex(insertAt);
    setSelectedBlockId(null);
    showToast(`Đã thêm Slide ${insertAt + 1}`);
  }, [deck.slides.length, safeIndex, showToast]);

  const handleDuplicateSlide = useCallback(
    (index: number) => {
      const target = deck.slides[index];
      if (!target) return;
      const cloned: EditableSlide = {
        ...target,
        id: `slide-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: `${target.title} (bản sao)`,
        background: { ...target.background },
        blocks: target.blocks.map((b, idx) => ({
          ...b,
          id: `blk-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
        })),
      };
      const insertAt = index + 1;
      setDeck((prev) => {
        const nextSlides = [...prev.slides];
        nextSlides.splice(insertAt, 0, cloned);
        return { ...prev, updatedAt: Date.now(), slides: nextSlides };
      });
      setCurrentIndex(insertAt);
      setSelectedBlockId(null);
      showToast('Đã nhân bản slide');
    },
    [deck.slides, showToast]
  );

  const handleDeleteSlide = useCallback(
    (index: number) => {
      if (deck.slides.length <= 1) return;
      setDeck((prev) => ({
        ...prev,
        updatedAt: Date.now(),
        slides: prev.slides.filter((_, idx) => idx !== index),
      }));
      setCurrentIndex((prevIdx) => {
        if (prevIdx > index) return prevIdx - 1;
        return Math.max(0, Math.min(deck.slides.length - 2, prevIdx));
      });
      setSelectedBlockId(null);
      showToast('Đã xóa slide');
    },
    [deck.slides.length, showToast]
  );

  // Block CRUD handlers
  const handleAddBlock = useCallback(
    (type: BlockType) => {
      const dark = isColorDarkHex(currentSlide.background.color);
      const block = createDefaultBlock(type, currentSlide.blocks.length, dark);
      updateCurrentSlide((slide) => ({
        ...slide,
        blocks: [...slide.blocks, block],
      }));
      setSelectedBlockId(block.id);
    },
    [currentSlide.background.color, currentSlide.blocks.length, updateCurrentSlide]
  );

  const handleUpdateBlock = useCallback(
    (blockId: string, patch: Partial<SlideBlock>) => {
      updateCurrentSlide((slide) => ({
        ...slide,
        blocks: slide.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
      }));
    },
    [updateCurrentSlide]
  );

  const handleMoveBlockLayer = useCallback(
    (blockId: string, direction: 'up' | 'down') => {
      updateCurrentSlide((slide) => {
        const idx = slide.blocks.findIndex((b) => b.id === blockId);
        if (idx === -1) return slide;
        const nextIdx = direction === 'up' ? idx + 1 : idx - 1;
        if (nextIdx < 0 || nextIdx >= slide.blocks.length) return slide;
        const copy = [...slide.blocks];
        const [item] = copy.splice(idx, 1);
        copy.splice(nextIdx, 0, item);
        return { ...slide, blocks: copy };
      });
    },
    [updateCurrentSlide]
  );

  const handleDuplicateBlock = useCallback(
    (blockId: string) => {
      const target = currentSlide.blocks.find((b) => b.id === blockId);
      if (!target) return;
      const cloned: SlideBlock = {
        ...target,
        id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        label: `${target.label} (sao)`,
        x: Math.min(1 - target.width, target.x + 0.03),
        y: Math.min(1 - target.height, target.y + 0.03),
      };
      updateCurrentSlide((slide) => ({
        ...slide,
        blocks: [...slide.blocks, cloned],
      }));
      setSelectedBlockId(cloned.id);
    },
    [currentSlide.blocks, updateCurrentSlide]
  );

  const handleDeleteBlock = useCallback(
    (blockId: string) => {
      updateCurrentSlide((slide) => ({
        ...slide,
        blocks: slide.blocks.filter((b) => b.id !== blockId),
      }));
      setSelectedBlockId((prev) => (prev === blockId ? null : prev));
    },
    [updateCurrentSlide]
  );

  const handleUpdateSlideBg = useCallback(
    (bgPatch: Partial<SlideBackground>) => {
      updateCurrentSlide((slide) => ({
        ...slide,
        background: { ...slide.background, ...bgPatch },
      }));
    },
    [updateCurrentSlide]
  );

  // Mode transitions
  const enterPresentMode = useCallback(() => {
    setSelectedBlockId(null);
    setAppMode('present');
    if (overlayMode === 'hidden') {
      setOverlayMode('active');
    }
    setControlsVisible(true);
    setReplayToken((t) => t + 1);
  }, [overlayMode]);

  const exitPresentMode = useCallback(async () => {
    if (isRecording && recorderRef.current && recorderRef.current.state === 'recording') {
      try {
        recorderRef.current.requestData();
        recorderRef.current.stop();
      } catch {
        setIsRecording(false);
      }
    }
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Ignore fullscreen exit failure
      }
    }
    setAppMode('edit');
    setControlsVisible(true);
  }, [isRecording]);

  const handleReplay = useCallback(() => {
    if (overlayMode === 'hidden') {
      setOverlayMode('active');
    }
    setReplayToken((t) => t + 1);
  }, [overlayMode]);

  const handleToggleOverlay = useCallback(() => {
    setOverlayMode((prev) => {
      if (prev === 'active') return 'dimmed';
      if (prev === 'dimmed') return 'hidden';
      return 'active';
    });
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await (rootRef.current ?? document.documentElement).requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      setErrorMessage('Trình duyệt không hỗ trợ hoặc đã chặn chế độ toàn màn hình.');
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      setControlsVisible(true);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Auto-hide controls after mouse inactivity ONLY while in presentation mode
  const resetIdleTimer = useCallback(() => {
    setControlsVisible(true);
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
    }
    if (appMode !== 'present') return;
    idleTimerRef.current = window.setTimeout(() => {
      if (!isRecording && !showShortcuts) {
        setControlsVisible(false);
      }
    }, 5000);
  }, [appMode, isRecording, showShortcuts]);

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
      }
    };
  }, [resetIdleTimer, replayToken, safeIndex]);

  // Recording duration timer
  useEffect(() => {
    if (!isRecording) {
      setRecordingSeconds(0);
      return;
    }
    const interval = window.setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isRecording]);

  const handleCanvasReady = useCallback((el: HTMLCanvasElement | null) => {
    canvasRef.current = el;
  }, []);

  const handleToggleRecord = useCallback(() => {
    if (isRecording && recorderRef.current) {
      try {
        if (recorderRef.current.state === 'recording') {
          recorderRef.current.requestData();
        }
        recorderRef.current.stop();
      } catch {
        setIsRecording(false);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas || typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
      setErrorMessage('Trình duyệt hiện tại không hỗ trợ quay video Canvas (MediaRecorder).');
      return;
    }

    try {
      const stream = canvas.captureStream(30);
      const mimeTypes = ['video/webm;codecs=vp8', 'video/webm', 'video/webm;codecs=vp9'];
      const supportedMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
      const recorder = supportedMime
        ? new MediaRecorder(stream, { mimeType: supportedMime, videoBitsPerSecond: 4_000_000 })
        : new MediaRecorder(stream);

      recordedChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          recordedChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        setIsRecording(false);
        const blob = new Blob(recordedChunksRef.current, { type: supportedMime || 'video/webm' });
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${slugifyFileName(deck.title)}-slide-${safeIndex + 1}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.setTimeout(() => URL.revokeObjectURL(url), 4000);
          showToast(`Đã lưu video slide ${safeIndex + 1} (.webm)`);
        } else {
          setErrorMessage('Video ghi được không có dữ liệu. Hãy thử quay lại ít nhất 1 giây.');
        }
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.onerror = () => {
        setIsRecording(false);
        setErrorMessage('Quá trình quay video gặp sự cố. Vui lòng thử lại.');
      };

      recorderRef.current = recorder;
      recorder.start(200);
      setIsRecording(true);
      if (overlayMode === 'hidden') {
        setOverlayMode('active');
      }
      setReplayToken((t) => t + 1);
    } catch {
      setIsRecording(false);
      setErrorMessage('Không thể khởi động trình quay video trên trình duyệt này.');
    }
  }, [isRecording, deck.title, safeIndex, overlayMode, showToast]);

  // JSON Export / Import
  const handleExportJson = useCallback(() => {
    const fileName = `${slugifyFileName(deck.title)}.json`;
    const blob = new Blob([JSON.stringify(deck, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    showToast(`Đã xuất bản lưu ${fileName}`);
  }, [deck, showToast]);

  const handleImportJsonFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.json')) {
        setErrorMessage('Vui lòng chọn file bản lưu định dạng .json.');
        return;
      }
      try {
        setErrorMessage(null);
        const text = await file.text();
        const parsed = validateDeckJson(JSON.parse(text));
        setDeck(parsed);
        setCurrentIndex(0);
        setSelectedBlockId(null);
        setReplayToken((t) => t + 1);
        showToast(`Đã mở ${parsed.slides.length} slide từ ${file.name}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'File .json không hợp lệ hoặc bị hỏng.';
        setErrorMessage(msg);
      }
    },
    [showToast]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inEditableField =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');

      if (inEditableField) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      resetIdleTimer();

      if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts((v) => !v);
        return;
      }

      if (e.key === 'Escape') {
        if (showShortcuts) {
          setShowShortcuts(false);
        } else if (appMode === 'present') {
          exitPresentMode();
        } else if (selectedBlockId) {
          setSelectedBlockId(null);
        }
        return;
      }

      if (appMode === 'present') {
        if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
          e.preventDefault();
          goToSlide(safeIndex + 1);
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          e.preventDefault();
          goToSlide(safeIndex - 1);
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          handleReplay();
        } else if (e.key === 'g' || e.key === 'G') {
          e.preventDefault();
          handleToggleOverlay();
        } else if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          handleToggleFullscreen();
        }
      } else {
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlockId) {
          e.preventDefault();
          handleDeleteBlock(selectedBlockId);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    appMode,
    safeIndex,
    selectedBlockId,
    showShortcuts,
    goToSlide,
    handleReplay,
    handleToggleOverlay,
    handleToggleFullscreen,
    handleDeleteBlock,
    exitPresentMode,
    resetIdleTimer,
  ]);

  // Drag & Drop handlers for .json backup files
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImportJsonFile(file);
    }
  };

  const headerHidden = appMode === 'present' && !controlsVisible && !isRecording;

  return (
    <div
      ref={rootRef}
      onMouseMove={resetIdleTimer}
      onPointerDown={resetIdleTimer}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex flex-col w-full h-screen overflow-hidden bg-[#090B10] text-slate-100"
    >
      {/* Hidden native .json file input */}
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json,application/json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportJsonFile(file);
          e.target.value = '';
        }}
        aria-label="Nhập bản lưu JSON"
        className="sr-only"
      />

      {/* Top Header Bar */}
      <header
        className={`flex items-center justify-between gap-3 px-4 sm:px-5 h-14 shrink-0 border-b border-white/[0.08] bg-[#0D1017]/95 transition-all duration-200 z-20 ${
          headerHidden ? 'opacity-0 -translate-y-full pointer-events-none' : 'opacity-100 translate-y-0'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-base font-bold tracking-tight text-slate-50 whitespace-nowrap shrink-0">
            SwarmDeck
          </span>

          {appMode === 'edit' ? (
            <input
              type="text"
              aria-label="Tên bộ trình chiếu"
              value={deck.title}
              onChange={(e) =>
                setDeck((prev) => ({
                  ...prev,
                  title: e.target.value,
                  updatedAt: Date.now(),
                }))
              }
              className="hidden sm:block h-8 px-2.5 w-44 md:w-56 rounded-lg bg-[#090B10] border border-white/10 text-xs font-medium text-slate-200 truncate focus:outline-none focus:border-sky-400"
            />
          ) : (
            <span className="hidden sm:inline text-xs font-medium text-slate-300 truncate max-w-[220px]">
              {deck.title}
            </span>
          )}

          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 whitespace-nowrap shrink-0">
            <span className="font-mono tabular-nums">
              Slide {safeIndex + 1} / {deck.slides.length}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{currentSlide.blocks.length} khối</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {appMode === 'edit' && (
            <>
              <button
                type="button"
                onClick={handleExportJson}
                title="Xuất bản lưu .json"
                className="inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Xuất .json</span>
              </button>

              <button
                type="button"
                onClick={() => jsonInputRef.current?.click()}
                title="Mở bản lưu .json"
                className="inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Nhập .json</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setShowShortcuts((v) => !v)}
            aria-label="Xem phím tắt"
            title="Phím tắt (?)"
            className="inline-flex items-center justify-center sm:gap-1.5 h-8 w-8 sm:w-auto sm:px-2.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden xl:inline">Phím tắt</span>
          </button>

          {appMode === 'edit' ? (
            <button
              type="button"
              onClick={enterPresentMode}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold bg-sky-500 text-slate-950 hover:bg-sky-400 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Trình chiếu</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={exitPresentMode}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium bg-white/10 text-slate-100 hover:bg-white/15 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Quay lại soạn thảo</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      {appMode === 'edit' ? (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Compact Mobile Slide Switcher (visible on < md where SlideRail is hidden) */}
          <div className="flex md:hidden items-center justify-between gap-2 px-3 py-2 border-b border-white/[0.06] bg-[#0D1017]">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => goToSlide(safeIndex - 1)}
                disabled={safeIndex === 0}
                aria-label="Slide trước"
                className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-white/[0.06] text-slate-200 disabled:opacity-35"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-mono tabular-nums text-slate-300">
                Slide {safeIndex + 1} / {deck.slides.length}
              </span>
              <button
                type="button"
                onClick={() => goToSlide(safeIndex + 1)}
                disabled={safeIndex >= deck.slides.length - 1}
                aria-label="Slide tiếp theo"
                className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-white/[0.06] text-slate-200 disabled:opacity-35"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={handleAddSlide}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-medium bg-sky-500/15 text-sky-300 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm slide</span>
            </button>
          </div>

          <div className="flex flex-1 min-h-0">
            <SlideRail
              slides={deck.slides}
              currentIndex={safeIndex}
              editable
              onSelectSlide={goToSlide}
              onAddSlide={handleAddSlide}
              onDuplicateSlide={handleDuplicateSlide}
              onDeleteSlide={handleDeleteSlide}
            />

            <SlideEditorStage
              slide={currentSlide}
              slideIndex={safeIndex}
              selectedBlockId={selectedBlockId}
              onSelectBlock={setSelectedBlockId}
              onUpdateBlock={handleUpdateBlock}
              onAddBlock={handleAddBlock}
              onPreviewSwarm={enterPresentMode}
            />

            <SlideInspector
              slide={currentSlide}
              selectedBlock={selectedBlock}
              onUpdateSlideBg={handleUpdateSlideBg}
              onUpdateBlock={handleUpdateBlock}
              onMoveBlockLayer={handleMoveBlockLayer}
              onDuplicateBlock={handleDuplicateBlock}
              onDeleteBlock={handleDeleteBlock}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 relative">
          <main className="flex-1 flex items-center justify-center px-4 sm:px-10 pt-3 pb-20 min-w-0 min-h-0 relative">
            <SwarmStage
              slide={currentSlide}
              slideIndex={safeIndex}
              cursorMode={cursorMode}
              speed={speed}
              overlayMode={overlayMode}
              replayToken={replayToken}
              isRecording={isRecording}
              onCanvasReady={handleCanvasReady}
              onPhaseChange={setSwarmPhase}
            />
          </main>

          <ControlDock
            currentIndex={safeIndex}
            totalSlides={deck.slides.length}
            cursorMode={cursorMode}
            speed={speed}
            overlayMode={overlayMode}
            isFullscreen={isFullscreen}
            isRecording={isRecording}
            recordingSeconds={recordingSeconds}
            visible={controlsVisible}
            onPrev={() => goToSlide(safeIndex - 1)}
            onNext={() => goToSlide(safeIndex + 1)}
            onReplay={handleReplay}
            onChangeCursorMode={(m) => {
              setCursorMode(m);
              setReplayToken((t) => t + 1);
            }}
            onChangeSpeed={(s) => {
              setSpeed(s);
              setReplayToken((t) => t + 1);
            }}
            onToggleOverlay={handleToggleOverlay}
            onToggleRecord={handleToggleRecord}
            onToggleFullscreen={handleToggleFullscreen}
            onExitPresent={exitPresentMode}
          />
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Phím tắt điều khiển"
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-[#11141C] border border-white/10 p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100">Phím tắt SwarmDeck</h2>
              <button
                type="button"
                onClick={() => setShowShortcuts(false)}
                aria-label="Đóng bảng phím tắt"
                className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-white/[0.06] text-xs">
              {[
                { key: '← / →', desc: 'Chuyển slide trước hoặc sau (khi trình chiếu)' },
                { key: 'R', desc: 'Dựng lại hiệu ứng Swarm trên slide hiện tại' },
                { key: 'G', desc: 'Chuyển lớp phủ (Hiện / Làm mờ / Ẩn)' },
                { key: 'F', desc: 'Bật hoặc tắt chế độ toàn màn hình' },
                { key: 'Delete', desc: 'Xóa khối đang chọn (khi soạn thảo)' },
                { key: 'Esc', desc: 'Quay lại soạn thảo / bỏ chọn khối' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-2.5 gap-4">
                  <span className="text-slate-300">{item.desc}</span>
                  <kbd className="px-2 py-0.5 rounded bg-[#090B10] border border-white/10 font-mono text-[11px] text-slate-200 whitespace-nowrap">
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="fixed top-16 right-5 z-40 flex items-center gap-3 max-w-md px-4 py-3 rounded-xl bg-rose-950/95 border border-rose-500/40 text-rose-100 text-xs shadow-xl"
        >
          <span className="flex-1">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            aria-label="Đóng thông báo lỗi"
            className="p-1 rounded hover:bg-white/10"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Quiet Toast Notification */}
      {toastMessage && !errorMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-16 right-5 z-40 px-4 py-2.5 rounded-xl bg-[#11141C]/95 border border-sky-400/30 text-slate-100 text-xs shadow-xl"
        >
          {toastMessage}
        </div>
      )}

      {/* Drag-and-drop .json Overlay */}
      <ImportOverlay isDragging={isDragging} />

      {/* Verification state hook */}
      <span
        className="sr-only"
        data-testid="swarm-status"
        data-mode={appMode}
        data-phase={swarmPhase}
      >
        {appMode}:{swarmPhase}
      </span>
    </div>
  );
}
