import { FileUp } from 'lucide-react';

interface ImportOverlayProps {
  isDragging: boolean;
}

export function ImportOverlay({ isDragging }: ImportOverlayProps) {
  if (!isDragging) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#090B10]/85 backdrop-blur-sm p-6"
    >
      <div className="flex flex-col items-center gap-4 max-w-md w-full p-8 rounded-2xl bg-[#11141C] border border-sky-400/35 text-center shadow-2xl">
        <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-sky-500/15 text-sky-300 border border-sky-400/25">
          <FileUp className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <p className="text-lg font-semibold text-slate-100">Thả file bản lưu .json vào đây</p>
          <p className="text-sm text-slate-400">
            Mở lại toàn bộ slide và khối nội dung đã xuất từ <span className="font-mono text-slate-200">SwarmDeck</span>
          </p>
        </div>
      </div>
    </div>
  );
}
