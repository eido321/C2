import {whiteboardReducer, type WhiteboardAction, type WhiteboardState} from './reducer';

export type EditorAction = WhiteboardAction | {type:'UNDO' | 'REDO'};
export interface History {
  current: WhiteboardState;
  past: WhiteboardState[];
  future: WhiteboardState[];
  gesture: number | null;
}

export function reduceHistory(history: History, event: {action:EditorAction; gesture:number|null}): History {
  const {current, past, future} = history;
  const {action} = event;
  if (action.type === 'UNDO' || action.type === 'REDO') {
    const undo = action.type === 'UNDO';
    const stack = undo ? past : future;
    const target = stack.at(-1);
    if (!target) return history;
    return {
      current:{...target, board:{...target.board,viewport:current.board.viewport}},
      past:undo ? past.slice(0,-1) : [...past,current],
      future:undo ? [...future,current] : future.slice(0,-1),
      gesture:null,
    };
  }
  const next = whiteboardReducer(current, action as WhiteboardAction);
  if (next.board === current.board || action.type === 'SET_VIEWPORT') return {...history,current:next};
  const gesture = action.type === 'DRAG' || action.type === 'UPDATE_BLOCK' ? event.gesture : null;
  return {current:next, past:gesture !== null && gesture === history.gesture ? past : [...past.slice(-79),current],future:[],gesture};
}
