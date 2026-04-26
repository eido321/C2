import React, { useState, useRef, useEffect } from 'react';
import { Character } from '@/types';
import {
  Plus,
  User,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  ScrollText,
  BookOpen,
  X,
  FileJson,
  FileType,
  PanelRightOpen,
  PanelRightClose,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RulesAssistantPanel } from '@/components/rules/RulesAssistantPanel';

interface SidebarProps {
  characters: Character[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onExportPdf: () => void | Promise<void>;
  onExportJson: () => void;
  exporting?: boolean;
  isMinimized: boolean;
  setIsMinimized: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  characters,
  activeId,
  onSelect,
  onAdd,
  onDelete,
  onExportPdf,
  onExportJson,
  exporting,
  isMinimized,
  setIsMinimized
}) => {
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rulesAssistantOpen, setRulesAssistantOpen] = useState(true);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exportMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (exportWrapRef.current && !exportWrapRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [exportMenuOpen]);
  /** `/rules.pdf` breaks on file:// (resolves to drive root). Vite `base` is `./`, so this becomes `./rules.pdf` beside index.html. */
  const rulesPdfUrl = `${import.meta.env.BASE_URL}rules.pdf`;

  return (
    <>
      <div className={cn(
        "fixed inset-0 z-[100] flex flex-col bg-black/80 backdrop-blur-sm transition-opacity duration-200",
        rulesOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-900 border-b border-white/10 shrink-0 gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex items-center gap-2 text-white font-bold text-lg shrink-0">
              <BookOpen size={20} />
              <span>Rules</span>
            </div>
            <button
              type="button"
              onClick={() => setRulesAssistantOpen((o) => !o)}
              className="flex items-center gap-1.5 text-xs font-bold text-white/70 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/10 border border-white/10 transition-colors shrink-0"
              aria-expanded={rulesAssistantOpen}
              aria-controls="rules-assistant-panel"
            >
              {rulesAssistantOpen ? (
                <PanelRightClose size={16} className="text-white/80" />
              ) : (
                <PanelRightOpen size={16} className="text-emerald-400" />
              )}
              <span className="hidden sm:inline">{rulesAssistantOpen ? 'Hide assistant' : 'Assistant'}</span>
            </button>
          </div>
          <button
            onClick={() => setRulesOpen(false)}
            className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 shrink-0"
            aria-label="Close rules"
          >
            <X size={22} />
          </button>
        </div>
        <div className="flex flex-1 min-h-0 flex-col md:flex-row overflow-hidden">
          <iframe
            src={rulesPdfUrl}
            className="flex-1 min-h-[min(42vh,360px)] md:min-h-0 w-full border-0 bg-white"
            title="Rules PDF"
          />
          {rulesAssistantOpen ? (
            <div
              id="rules-assistant-panel"
              className="flex flex-1 min-h-0 min-w-0 md:w-[380px] md:max-w-[42vw] md:flex-none border-t md:border-t-0 md:border-l border-white/10"
            >
              <RulesAssistantPanel onCollapse={() => setRulesAssistantOpen(false)} />
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col transition-all duration-300 shadow-xl z-50 no-print",
          isMinimized ? "w-16" : "w-64"
        )}
      >
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="absolute -right-3 top-10 bg-accent text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-50"
        >
          {isMinimized ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="flex items-center gap-3 p-4 border-b border-white/10 overflow-hidden shrink-0">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shrink-0 shadow-lg">
            <ScrollText size={18} />
          </div>
          {!isMinimized && (
            <h1 className="font-bold tracking-tight text-xl whitespace-nowrap">C2</h1>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {!isMinimized && (
            <div className="text-[10px] uppercase font-black text-white/40 mb-2 px-2 tracking-widest">Characters</div>
          )}

          {characters.map((char) => (
            <div
              key={char.id}
              className={cn(
                "group flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200 relative",
                char.id === activeId
                  ? "bg-accent text-white shadow-lg shadow-accent/20"
                  : "text-white/60 hover:bg-white/5 hover:text-white",
                isMinimized && "justify-center"
              )}
              onClick={() => onSelect(char.id)}
            >
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <User size={16} />
              </div>

              {!isMinimized && (
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{char.name || 'Unnamed'}</div>
                  <div className="text-[10px] uppercase opacity-60 truncate">Lvl {char.level} {char.class}</div>
                </div>
              )}

              {!isMinimized && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(char.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}

          <button
            onClick={onAdd}
            className={cn(
              "w-full flex items-center gap-3 p-2.5 rounded-xl border-2 border-dashed border-white/10 hover:border-accent/50 hover:bg-accent/5 transition-all text-white/40 hover:text-accent mt-2",
              isMinimized && "justify-center"
            )}
          >
            <Plus size={18} />
            {!isMinimized && <span className="font-bold text-sm">New Profile</span>}
          </button>
        </div>

        <div className="p-4 space-y-2 border-t border-white/10 shrink-0">
          <button
            onClick={() => setRulesOpen(true)}
            className={cn(
              "w-full flex items-center gap-3 p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-sm font-bold",
              isMinimized && "justify-center"
            )}
          >
            <BookOpen size={18} />
            {!isMinimized && <span>Rules</span>}
          </button>
          <div ref={exportWrapRef} className="relative">
            <button
              type="button"
              onClick={() => setExportMenuOpen((o) => !o)}
              disabled={exporting}
              className={cn(
                'w-full flex items-center gap-3 p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-sm font-bold',
                isMinimized && 'justify-center',
                exporting && 'opacity-60 cursor-wait',
                exportMenuOpen && 'bg-white/10',
              )}
              aria-expanded={exportMenuOpen}
              aria-haspopup="menu"
            >
              <Download size={18} className={exporting ? 'animate-bounce' : ''} />
              {!isMinimized && <span>{exporting ? 'Exporting…' : 'Download'}</span>}
            </button>
            {exportMenuOpen && (
              <div
                role="menu"
                className="absolute z-[60] left-0 right-0 bottom-full mb-1 flex flex-col gap-0.5 rounded-xl border border-white/15 bg-slate-800 p-1 shadow-xl"
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={exporting}
                  aria-label="Download as PDF"
                  onClick={() => {
                    void onExportPdf();
                    setExportMenuOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-2 w-full py-2 rounded-lg text-sm font-bold text-white/90 hover:bg-white/10 disabled:opacity-50',
                    isMinimized ? 'justify-center px-2' : 'justify-start text-left px-3',
                  )}
                >
                  <FileType size={16} className="shrink-0 text-red-300" />
                  {!isMinimized && <span>PDF sheet</span>}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  aria-label="Download as JSON"
                  onClick={() => {
                    onExportJson();
                    setExportMenuOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-2 w-full py-2 rounded-lg text-sm font-bold text-white/90 hover:bg-white/10',
                    isMinimized ? 'justify-center px-2' : 'justify-start text-left px-3',
                  )}
                >
                  <FileJson size={16} className="shrink-0 text-emerald-300" />
                  {!isMinimized && <span>JSON</span>}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
