import {useState} from 'react';
import type {Whiteboard, WhiteboardTemplate} from '@/types';
import {WHITEBOARD_SCHEMA_VERSION} from '@/types';
import {loadWhiteboard} from '@/lib/persistence';
import {createEmptyBoard, WhiteboardProvider} from '@/store/WhiteboardContext';
import {StartScreen} from '@/components/templates/StartScreen';
import {Workspace} from '@/components/Workspace';

function boardFromTemplate(template: WhiteboardTemplate): Whiteboard {
  return {
    id: `wb_${Date.now()}`,
    name: template.name,
    blocks: template.build(),
    groups: [],
    viewport: {pan: {x: 60, y: 40}, zoom: 1},
    updatedAt: Date.now(),
    version: WHITEBOARD_SCHEMA_VERSION,
  };
}

export default function App() {
  const [saved] = useState<Whiteboard | null>(() => loadWhiteboard());
  const [board, setBoard] = useState<Whiteboard | null>(saved);
  const [showStart, setShowStart] = useState(saved === null);

  const start = (next: Whiteboard) => {
    setBoard(next);
    setShowStart(false);
  };

  return (
    <>
      {board ? (
        <WhiteboardProvider key={board.id} initialBoard={board}>
          <Workspace onOpenStart={() => setShowStart(true)} />
        </WhiteboardProvider>
      ) : null}

      {showStart ? (
        <StartScreen
          onSelectBlank={() => start(createEmptyBoard())}
          onSelectTemplate={(template) => start(boardFromTemplate(template))}
          onContinue={board ? () => setShowStart(false) : undefined}
          onClose={board ? () => setShowStart(false) : undefined}
        />
      ) : null}
    </>
  );
}
