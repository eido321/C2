import {forwardRef} from 'react';
import type {Block, BlockContentMap, Whiteboard} from '@/types';
import {BlockContent} from '@/components/blocks/BlockContent';

const PAGE_WIDTH = 1040;
const PAGE_HEIGHT = 1400;
const PAGE_PADDING = 48;

function boundsFor(blocks: Block[]) {
  const minX = Math.min(...blocks.map((b) => b.x));
  const minY = Math.min(...blocks.map((b) => b.y));
  const maxX = Math.max(...blocks.map((b) => b.x + b.width));
  const maxY = Math.max(...blocks.map((b) => b.y + b.height));
  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function PrintableBlock({block, originX, originY}: {block: Block; originX: number; originY: number}) {
  const {style} = block;
  const chromeless = block.type === 'divider' || block.type === 'heading';
  const showChrome = !chromeless && (style?.showBorder ?? true);
  const noop = () => {};

  return (
    <div
      className="absolute"
      style={{
        left: block.x - originX + PAGE_PADDING,
        top: block.y - originY + PAGE_PADDING,
        width: block.width,
        height: block.height,
        transform: block.rotation ? `rotate(${block.rotation}deg)` : undefined,
      }}
    >
      <div
        className={`${showChrome ? 'parchment p-3' : ''} h-full w-full overflow-hidden rounded-xl`}
        style={{
          background: style?.background,
          border: showChrome ? `1px solid ${style?.borderColor ?? 'rgba(176,141,87,0.55)'}` : undefined,
        }}
      >
        <BlockContent
          block={block}
          editing={false}
          printable
          update={noop as (content: Partial<BlockContentMap[Block['type']]>) => void}
        />
      </div>
    </div>
  );
}

export const PrintableBoard = forwardRef<HTMLElement, {board: Whiteboard}>(function PrintableBoard({board}, ref) {
  const blocks = board.blocks.filter((block) => !block.hidden);
  if (!blocks.length) return null;

  const bounds = boundsFor(blocks);
  const pageWidth = bounds.width + PAGE_PADDING * 2;
  const pageHeight = bounds.height + PAGE_PADDING * 2;
  const scale = Math.min(1, PAGE_WIDTH / pageWidth, PAGE_HEIGHT / pageHeight);

  return (
    <div className="print-root" aria-hidden="true">
      <section ref={ref} className="print-page parchment" style={{width: pageWidth * scale, height: pageHeight * scale}}>
        <div
          className="relative origin-top-left"
          style={{
            width: pageWidth,
            height: pageHeight,
            transform: `scale(${scale})`,
          }}
        >
          <h1 className="sr-only">{board.name}</h1>
          {blocks.map((block) => (
            <PrintableBlock key={block.id} block={block} originX={bounds.minX} originY={bounds.minY} />
          ))}
        </div>
      </section>
    </div>
  );
});
