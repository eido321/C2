/**
 * Forgotten Realms deities commonly listed in the Player’s Handbook “Gods of the Multiverse” / rules.pdf tables
 * (names, alignments, domains). Sample prayers are original flavor text for roleplay — not rules text.
 */
export interface ClericPrayer {
  label: string;
  text: string;
}

export interface ClericDeity {
  id: string;
  name: string;
  /** Epithet or portfolio line */
  titles: string;
  alignment: string;
  /** Typical cleric domains / divine themes (2024 PHB lists Life, Light, Trickery, War; many tables add more) */
  suggestedDomains: string;
  prayers: ClericPrayer[];
}

export const CLERIC_DEITIES: ClericDeity[] = [
  {
    id: 'auril',
    name: 'Auril',
    titles: 'Goddess of Winter',
    alignment: 'NE',
    suggestedDomains: 'Nature, Tempest, Death',
    prayers: [
      { label: 'Frost at dawn', text: 'Ice on the branch, patience in the heart — Auril, let me endure what must be frozen.' },
      { label: 'Before a hard march', text: 'Winter claims the weak; steel my steps so I am not among them.' },
      { label: 'For the fallen in snow', text: 'Sleep beneath the white veil until the thaw; your rest is Auril’s keeping.' },
    ],
  },
  {
    id: 'azuth',
    name: 'Azuth',
    titles: 'God of Wizards',
    alignment: 'LN',
    suggestedDomains: 'Arcana, Knowledge',
    prayers: [
      { label: 'Before study', text: 'Azuth of the spellbound hand, order my mind; let no syllable stray.' },
      { label: 'Teaching a pupil', text: 'As you taught the first arcanists, let truth pass cleanly from mind to mind.' },
      { label: 'After a miscast', text: 'Discipline over pride — I begin again, one gesture at a time.' },
    ],
  },
  {
    id: 'bane',
    name: 'Bane',
    titles: 'God of Tyranny',
    alignment: 'LE',
    suggestedDomains: 'Order, War, Trickery',
    prayers: [
      { label: 'Claiming authority', text: 'Bane, black hand of dominion — let fear teach obedience where mercy failed.' },
      { label: 'Before battle', text: 'Break their will before their bones; victory is the only sermon.' },
      { label: 'Oath of iron', text: 'I am the chain that holds the world from chaos; strengthen my grip.' },
    ],
  },
  {
    id: 'beshaba',
    name: 'Beshaba',
    titles: 'Goddess of Misfortune',
    alignment: 'CE',
    suggestedDomains: 'Trickery, Death',
    prayers: [
      { label: 'Warding ill luck', text: 'Lady of bad fortune, turn your gaze to my foes; let their dice fall cold.' },
      { label: 'Bitter honesty', text: 'What you take from one, grant me the wit to survive without it.' },
      { label: 'After a setback', text: 'You have laughed — now show me the lesson in the wound.' },
    ],
  },
  {
    id: 'chauntea',
    name: 'Chauntea',
    titles: 'Goddess of Agriculture',
    alignment: 'NG',
    suggestedDomains: 'Life, Nature',
    prayers: [
      { label: 'Blessing a meal', text: 'Great Mother, from soil to table — sanctify this bread and those who sowed it.' },
      { label: 'Planting or harvest', text: 'Root and rain, sun and season; let the field remember your kindness.' },
      { label: 'Healing the hungry', text: 'Where bellies are empty, multiply mercy as you multiply grain.' },
    ],
  },
  {
    id: 'cyric',
    name: 'Cyric',
    titles: 'God of Lies',
    alignment: 'CE',
    suggestedDomains: 'Trickery, Death',
    prayers: [
      { label: 'Whispered bargain', text: 'Prince of Madness, if truth is a chain, slip me the key — for one breath only.' },
      { label: 'Warning', text: 'Let no mask I wear become my face; Cyric, I borrow your cunning, not your end.' },
    ],
  },
  {
    id: 'deneir',
    name: 'Deneir',
    titles: 'God of Writing',
    alignment: 'NG',
    suggestedDomains: 'Knowledge, Arcana',
    prayers: [
      { label: 'Before recording lore', text: 'Deneir, let the stroke be true; may this page outlive the lie.' },
      { label: 'Deciphering', text: 'Unspool the tangled script; show me the pattern the author feared.' },
    ],
  },
  {
    id: 'eldath',
    name: 'Eldath',
    titles: 'Goddess of Peace',
    alignment: 'NG',
    suggestedDomains: 'Life, Nature, Peace',
    prayers: [
      { label: 'Calming strife', text: 'Still water, still tongue — Eldath, cool the blood that would boil to steel.' },
      { label: 'Sanctuary', text: 'Let this ground be neutral as moss; let wrath pass around us like a stream.' },
      { label: 'After violence', text: 'Wash from my hands what had to be done; leave only resolve to heal.' },
    ],
  },
  {
    id: 'gond',
    name: 'Gond',
    titles: 'God of Craft',
    alignment: 'N',
    suggestedDomains: 'Forge, Knowledge',
    prayers: [
      { label: 'Before forging or repair', text: 'Wonderbringer, steady my hand; let the hinge hold, the edge stay true.' },
      { label: 'New invention', text: 'Bless the curious spark — if it serves many, let no fear smother it.' },
    ],
  },
  {
    id: 'helm',
    name: 'Helm',
    titles: 'God of Protection',
    alignment: 'LN',
    suggestedDomains: 'Life, Order, War',
    prayers: [
      { label: 'Vigil', text: 'Helm, unblinking sentinel — I take the watch; let no harm pass my shield unseen.' },
      { label: 'Oath to guard', text: 'I am the door that does not swing; strengthen my arm until relief comes.' },
      { label: 'After doubt', text: 'Duty does not ask for comfort; grant me only clarity.' },
    ],
  },
  {
    id: 'ilmater',
    name: 'Ilmater',
    titles: 'God of Endurance',
    alignment: 'LG',
    suggestedDomains: 'Life, Peace',
    prayers: [
      { label: 'Bearing suffering', text: 'Broken One, if I must carry this pain, let it not be wasted on cruelty.' },
      { label: 'Comforting another', text: 'Your tears are sacred; Ilmater counts each one.' },
      { label: 'Refusing vengeance', text: 'Endurance over outrage — I choose the long road of mercy.' },
    ],
  },
  {
    id: 'kelemvor',
    name: 'Kelemvor',
    titles: 'God of the Dead',
    alignment: 'LN',
    suggestedDomains: 'Death, Grave',
    prayers: [
      { label: 'Last rites', text: 'Kelemvor, Judge of Souls — weigh this life fairly; let the path be just.' },
      { label: 'Against undeath', text: 'What should lie still, make still; what should walk on, guide onward.' },
      { label: 'Facing mortality', text: 'I do not fear your scales; I fear only an unexamined heart.' },
    ],
  },
  {
    id: 'lathander',
    name: 'Lathander',
    titles: 'God of Birth and Renewal',
    alignment: 'NG',
    suggestedDomains: 'Life, Light',
    prayers: [
      { label: 'Dawn', text: 'Morninglord, paint the horizon; let yesterday’s failures die with the stars.' },
      { label: 'New beginnings', text: 'From ash, green; from grief, purpose — renew what we thought finished.' },
      { label: 'Healing light', text: 'Let radiance knit what shadow tore; I am only the vessel of your dawn.' },
    ],
  },
  {
    id: 'leira',
    name: 'Leira',
    titles: 'Goddess of Illusion',
    alignment: 'CN',
    suggestedDomains: 'Trickery, Knowledge',
    prayers: [
      { label: 'Veil and mask', text: 'Lady of Mists, let my deceit spare the innocent and unmask the proud.' },
      { label: 'Doubting senses', text: 'If all is veil, grant me one anchor of truth to hold.' },
    ],
  },
  {
    id: 'lliira',
    name: 'Lliira',
    titles: 'Goddess of Joy',
    alignment: 'CG',
    suggestedDomains: 'Life, Light',
    prayers: [
      { label: 'Festival', text: 'Lliira, turn our feet to music; let sorrow rest outside the circle.' },
      { label: 'Comfort in grief', text: 'Joy will return like spring — until then, hold my tears as sacred too.' },
    ],
  },
  {
    id: 'loviatar',
    name: 'Loviatar',
    titles: 'Goddess of Pain',
    alignment: 'LE',
    suggestedDomains: 'Death, Trickery',
    prayers: [
      { label: 'Discipline of hurt', text: 'Scourge Maiden, teach me to master pain — never to gift it without purpose.' },
      { label: 'Trial', text: 'What breaks the body may yet refine the will; witness my endurance.' },
    ],
  },
  {
    id: 'mask',
    name: 'Mask',
    titles: 'God of Thieves',
    alignment: 'CN',
    suggestedDomains: 'Trickery',
    prayers: [
      { label: 'Shadow work', text: 'Lord of Hidden Ways — let the lock yield, the guard look elsewhere, the secret stay secret.' },
      { label: 'Repentance', text: 'I stole more than gold once; now I steal only from tyrants.' },
    ],
  },
  {
    id: 'mielikki',
    name: 'Mielikki',
    titles: 'Goddess of Forests',
    alignment: 'NG',
    suggestedDomains: 'Nature, Life',
    prayers: [
      { label: 'Entering the wild', text: 'Forest Queen, I walk as guest, not conqueror — show me the path beasts honor.' },
      { label: 'Protecting beasts', text: 'Fang and feather are your hymns; let no cruelty echo in your groves.' },
    ],
  },
  {
    id: 'milil',
    name: 'Milil',
    titles: 'God of Poetry and Song',
    alignment: 'NG',
    suggestedDomains: 'Light, Knowledge',
    prayers: [
      { label: 'Before performance', text: 'Milil, tune my voice to truth dressed in beauty.' },
      { label: 'Memorial', text: 'Let this verse outlive the battle; names spoken are names not lost.' },
    ],
  },
  {
    id: 'myrkul',
    name: 'Myrkul',
    titles: 'God of Death (historic)',
    alignment: 'NE',
    suggestedDomains: 'Death',
    prayers: [
      { label: 'Cold end', text: 'Myrkul, Lord of Bones — all debts end; teach me to face the ledger calmly.' },
    ],
  },
  {
    id: 'mystra',
    name: 'Mystra',
    titles: 'Goddess of Magic',
    alignment: 'NG',
    suggestedDomains: 'Arcana, Knowledge',
    prayers: [
      { label: 'Weave-touched', text: 'Mother of All Spells, let my casting honor the Weave; no thread pulled in spite.' },
      { label: 'Wild magic', text: 'When power surges beyond intent, bind it gently home.' },
      { label: 'Teaching magic', text: 'What I open in another, let it serve wonder, not dominion.' },
    ],
  },
  {
    id: 'oghma',
    name: 'Oghma',
    titles: 'God of Knowledge',
    alignment: 'N',
    suggestedDomains: 'Knowledge, Light',
    prayers: [
      { label: 'Seeking truth', text: 'Oghma, patron of sages — cut through rumor; let the fact shine plain.' },
      { label: 'Before debate', text: 'Let words be bridges, not blades, unless truth itself is under siege.' },
    ],
  },
  {
    id: 'savras',
    name: 'Savras',
    titles: 'God of Divination and Fate',
    alignment: 'LN',
    suggestedDomains: 'Knowledge, Arcana',
    prayers: [
      { label: 'Augury', text: 'All-Seeing One, I ask not to escape fate — only to meet it with open eyes.' },
      { label: 'Uncertainty', text: 'If the future forks, grant me wisdom to choose the path that harms least.' },
    ],
  },
  {
    id: 'selune',
    name: 'Selûne',
    titles: 'Goddess of the Moon',
    alignment: 'CG',
    suggestedDomains: 'Knowledge, Life, Twilight',
    prayers: [
      { label: 'Night journey', text: 'Silver Lady, light the road the sun forgets; guide the lost and the lonely.' },
      { label: 'Against darkness', text: 'Your moon still rises over every shadow; let me reflect even a sliver of it.' },
      { label: 'Tides and change', text: 'Wax and wane — teach me that endings make room for return.' },
    ],
  },
  {
    id: 'shar',
    name: 'Shar',
    titles: 'Goddess of Darkness and Loss',
    alignment: 'NE',
    suggestedDomains: 'Death, Trickery, Twilight',
    prayers: [
      { label: 'Embrace of night', text: 'Mistress of Night, hide me from prying eyes; let silence be my cloak.' },
      { label: 'Grief', text: 'What was taken, you keep in velvet dark; I do not ask it back — only peace.' },
      { label: 'Cold resolve', text: 'Let hope’s noise fade; in stillness I find my true edge.' },
    ],
  },
  {
    id: 'silvanus',
    name: 'Silvanus',
    titles: 'God of Wild Nature',
    alignment: 'N',
    suggestedDomains: 'Nature',
    prayers: [
      { label: 'Wild places', text: 'Oak Father, I am small among your roots; let me walk without breaking the web.' },
      { label: 'Balance', text: 'Predator and prey are both your hymn; let me not upset the verse.' },
    ],
  },
  {
    id: 'sune',
    name: 'Sune',
    titles: 'Goddess of Love and Beauty',
    alignment: 'CG',
    suggestedDomains: 'Life, Light',
    prayers: [
      { label: 'Compassion', text: 'Firehair, let love be courage, not only passion — bind hearts that would break alone.' },
      { label: 'Inspiring allies', text: 'Let them see themselves as you see them: worthy of the light.' },
    ],
  },
  {
    id: 'talona',
    name: 'Talona',
    titles: 'Goddess of Disease and Poison',
    alignment: 'CE',
    suggestedDomains: 'Death, Nature',
    prayers: [
      { label: 'Warding plague', text: 'Lady of Plagues, turn your favor from the innocent; let contagion seek the cruel.' },
      { label: 'Antidote work', text: 'What you brew in venom, teach me to unbrew in mercy.' },
    ],
  },
  {
    id: 'talos',
    name: 'Talos',
    titles: 'God of Storms',
    alignment: 'CE',
    suggestedDomains: 'Tempest, War',
    prayers: [
      { label: 'Storm’s edge', text: 'Storm Lord, I do not command the lightning — only ask it strike true.' },
      { label: 'Sea and sky', text: 'Roar if you must; I will still stand until the gale chooses another target.' },
    ],
  },
  {
    id: 'tempus',
    name: 'Tempus',
    titles: 'God of War',
    alignment: 'N',
    suggestedDomains: 'War',
    prayers: [
      { label: 'Before battle', text: 'Tempus, Lord of Battles — honor the clash; let cowards find no glory in my wake.' },
      { label: 'Respect for foe', text: 'A worthy enemy hones the soul; bless the fight, not the slaughter.' },
      { label: 'After victory', text: 'I thank you for survival; teach me humility beside the fallen.' },
    ],
  },
  {
    id: 'torm',
    name: 'Torm',
    titles: 'God of Courage and Self-Sacrifice',
    alignment: 'LG',
    suggestedDomains: 'Order, War',
    prayers: [
      { label: 'Facing fear', text: 'True Loyalty, if I must fall, let it be forward, shielding those behind me.' },
      { label: 'Oath', text: 'Bind my word to my spine; let no convenience unmake what I swore.' },
    ],
  },
  {
    id: 'tyr',
    name: 'Tyr',
    titles: 'God of Justice',
    alignment: 'LG',
    suggestedDomains: 'Order, War',
    prayers: [
      { label: 'Judgment', text: 'Maimed God, you paid in flesh for law — let my verdict weigh mercy and truth.' },
      { label: 'Accusation', text: 'Let no innocent bear chains; let no guilty hide behind title.' },
      { label: 'Personal failing', text: 'When I skewed the scale, Tyr, give me strength to confess and mend.' },
    ],
  },
  {
    id: 'umberlee',
    name: 'Umberlee',
    titles: 'Goddess of the Sea',
    alignment: 'CE',
    suggestedDomains: 'Tempest, Nature',
    prayers: [
      { label: 'Voyage', text: 'Bitch Queen, I pay respect to your depths; spare this hull one more crossing.' },
      { label: 'Drowning sorrow', text: 'What the tide takes is yours; leave me breath to serve the living.' },
    ],
  },
  {
    id: 'waukeen',
    name: 'Waukeen',
    titles: 'Goddess of Trade',
    alignment: 'N',
    suggestedDomains: 'Knowledge, Trickery',
    prayers: [
      { label: 'Fair deal', text: 'Merchant’s Friend, let coin flow honest; let greed break on fair measure.' },
      { label: 'Prosperity', text: 'Bless the market that feeds the many, not the hoard that starves the town.' },
    ],
  },
];

export const CLERIC_DEITY_BY_ID: Record<string, ClericDeity> = Object.fromEntries(
  CLERIC_DEITIES.map((d) => [d.id, d]),
);

export function getClericDeity(id: string | undefined | null): ClericDeity | undefined {
  if (!id) return undefined;
  return CLERIC_DEITY_BY_ID[id];
}
