import React, { useState, useEffect } from 'react';
import { Character, INITIAL_CHARACTER } from '@/types';
import { Sidebar } from '@/components/layout/Sidebar';
import { CharacterSheet } from '@/components/sheet/CharacterSheet';
import { CharacterCreationWizard } from '@/components/creation/CharacterCreationWizard';
import { cn } from '@/lib/utils';
import { exportCharacterPDF } from '@/lib/exportCharacterPDF';
import { exportCharacterJSON } from '@/lib/exportCharacterJSON';
import { migrateCharacterTabDefaults, migrateWeaponAttackAbility } from '@/lib/characterMigration';

export default function App() {
  const [characters, setCharacters] = useState<Character[]>(() => {
    const saved = localStorage.getItem('mythic_characters');
    if (!saved) return [INITIAL_CHARACTER];
    const parsed: Character[] = JSON.parse(saved);
    return parsed.map((ch) => migrateWeaponAttackAbility(migrateCharacterTabDefaults(ch)));
  });
  
  const [activeId, setActiveId] = useState<string>(() => {
    const saved = localStorage.getItem('mythic_active_id');
    return saved || (characters[0]?.id || '');
  });

  const [isMinimized, setIsMinimized] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('mythic_dark_mode') === 'true';
  });

  const [accentColor, setAccentColor] = useState<string>(() => {
    return localStorage.getItem('mythic_accent_color') || '#2563eb';
  });

  useEffect(() => {
    localStorage.setItem('mythic_characters', JSON.stringify(characters));
  }, [characters]);

  useEffect(() => {
    localStorage.setItem('mythic_active_id', activeId);
  }, [activeId]);

  useEffect(() => {
    localStorage.setItem('mythic_dark_mode', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('mythic_accent_color', accentColor);
    document.documentElement.style.setProperty('--color-accent', accentColor);
  }, [accentColor]);

  const activeCharacter = characters.find(c => c.id === activeId) || characters[0];

  const handleUpdate = (updated: Character) => {
    setCharacters(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const handleAdd = () => {
    const newChar = { 
      ...INITIAL_CHARACTER, 
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Hero ' + (characters.length + 1)
    };
    setCharacters(prev => [...prev, newChar]);
    setActiveId(newChar.id);
  };

  const handleWizardConfirm = (character: Character) => {
    setCharacters(prev => [...prev, character]);
    setActiveId(character.id);
    setShowWizard(false);
  };

  const handleWizardBlank = () => {
    handleAdd();
    setShowWizard(false);
  };

  const handleDelete = (id: string) => {
    const remaining = characters.filter(c => c.id !== id);
    setCharacters(remaining);
    if (activeId === id) setActiveId(remaining[0]?.id ?? '');
  };

  const [exporting, setExporting] = useState(false);

  const handleExportPdf = async () => {
    if (exporting || !activeCharacter) return;
    setExporting(true);
    try {
      await exportCharacterPDF(activeCharacter);
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportJson = () => {
    if (!activeCharacter) return;
    exportCharacterJSON(activeCharacter);
  };

  return (
    <div className={cn(
      "min-h-screen bg-bg transition-all duration-300",
      isMinimized ? "pl-16" : "pl-64"
    )}>
      <Sidebar
        characters={characters}
        activeId={activeId}
        onSelect={setActiveId}
        onAdd={() => setShowWizard(true)}
        onDelete={handleDelete}
        onExportPdf={handleExportPdf}
        onExportJson={handleExportJson}
        exporting={exporting}
        isMinimized={isMinimized}
        setIsMinimized={setIsMinimized}
      />

      {showWizard && (
        <CharacterCreationWizard
          onConfirm={handleWizardConfirm}
          onBlank={handleWizardBlank}
          onClose={() => setShowWizard(false)}
        />
      )}
      
      <main className="p-4 md:p-8">
        {activeCharacter ? (
          <CharacterSheet
            character={activeCharacter}
            onUpdate={handleUpdate}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            accentColor={accentColor}
            setAccentColor={setAccentColor}
          />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center select-none">
            <div className="text-7xl opacity-20">⚔️</div>
            <div>
              <p className="text-2xl font-black text-muted/40 tracking-tight">No characters yet</p>
              <p className="text-sm text-muted/30 mt-1">Press <span className="font-bold">+</span> in the sidebar to create one</p>
            </div>
          </div>
        )}
      </main>
      
      {/* Footer / Credits */}
      <footer className="max-w-5xl mx-auto px-8 pb-12 text-muted/20 text-[10px] uppercase font-bold tracking-widest text-center">
        C2 &copy; 2026 • Designed for the Bold
      </footer>
    </div>
  );
}

