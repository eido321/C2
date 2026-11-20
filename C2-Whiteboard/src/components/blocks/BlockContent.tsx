import type {Block, BlockContentMap} from '@/types';
import {SpellSlotsBlock} from './SpellSlotsBlock';
import {AbilityScoreBlock} from './AbilityScoreBlock';
import {AbilityScoresBlock} from './AbilityScoresBlock';
import {DividerBlock} from './DividerBlock';
import {HeadingBlock} from './HeadingBlock';
import {ImageBlock} from './ImageBlock';
import {ListBlock} from './ListBlock';
import {SpellListBlock} from './SpellListBlock';
import {StatBlock} from './StatBlock';
import {TextBlock} from './TextBlock';

interface Props {
  block: Block;
  editing: boolean;
  update: (content: Partial<BlockContentMap[Block['type']]>) => void;
}

export function BlockContent(props: Props) {
  const style = props.block.style;
  return <div className={style?.color ? 'contents custom-font-color' : 'contents'}
    style={{'--block-color':style?.color,'--block-font':style?.fontSize ? style.fontSize+'px' : undefined} as React.CSSProperties}>
    <Content {...props}/>
  </div>;
}

function Content({block, editing, update}: Props) {
  switch (block.type) {
    case 'text':
      return <TextBlock block={block} editing={editing} update={update} />;
    case 'heading':
      return <HeadingBlock block={block} editing={editing} update={update} />;
    case 'spellSlots': return <SpellSlotsBlock block={block} editing={editing} update={update}/>;
    case 'abilityScore': return <AbilityScoreBlock block={block} editing={editing} update={update}/>;
    case 'abilityScores':
      return <AbilityScoresBlock block={block} editing={editing} update={update} />;
    case 'statBlock':
      return <StatBlock block={block} editing={editing} update={update} />;
    case 'image':
      return <ImageBlock block={block} editing={editing} update={update} />;
    case 'divider':
      return <DividerBlock block={block} editing={editing} update={update} />;
    case 'list':
      return <ListBlock block={block} editing={editing} update={update} />;
    case 'spellList':
      return <SpellListBlock block={block} editing={editing} update={update} />;
  }
}





