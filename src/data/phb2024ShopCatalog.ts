/**
 * PHB 2024 equipment prices (chapter 6) — align with `public/rules.pdf` / PHB tables.
 * Armor and shield excluded â€” armor is handled by the sheet armor picker.
 */

export type ShopCategory =
  | 'weapon'
  | 'tool'
  | 'adventuring'
  | 'mount'
  | 'vehicle'
  | 'ship'
  | 'service';

export interface ShopItem {
  id: string;
  name: string;
  category: ShopCategory;
  /** Cost in copper pieces */
  costCp: number;
  weightLb?: number;
}

function item(
  id: string,
  name: string,
  category: ShopCategory,
  costCp: number,
  weightLb?: number
): ShopItem {
  return { id, name, category, costCp, weightLb };
}

/** Weapons (simple + martial + firearms) â€” PHB 2024 */
const WEAPONS: ShopItem[] = [
  item('w-club', 'Club', 'weapon', 10, 2),
  item('w-dagger', 'Dagger', 'weapon', 200, 1),
  item('w-greatclub', 'Greatclub', 'weapon', 20, 10),
  item('w-handaxe', 'Handaxe', 'weapon', 500, 2),
  item('w-javelin', 'Javelin', 'weapon', 50, 2),
  item('w-light-hammer', 'Light Hammer', 'weapon', 200, 2),
  item('w-mace', 'Mace', 'weapon', 500, 4),
  item('w-quarterstaff', 'Quarterstaff', 'weapon', 20, 4),
  item('w-sickle', 'Sickle', 'weapon', 100, 2),
  item('w-spear', 'Spear', 'weapon', 100, 3),
  item('w-dart', 'Dart', 'weapon', 5, 0.25),
  item('w-light-crossbow', 'Light Crossbow', 'weapon', 2500, 5),
  item('w-shortbow', 'Shortbow', 'weapon', 2500, 2),
  item('w-sling', 'Sling', 'weapon', 10, 0),
  item('w-battleaxe', 'Battleaxe', 'weapon', 1000, 7),
  item('w-flail', 'Flail', 'weapon', 1000, 2),
  item('w-glaive', 'Glaive', 'weapon', 2000, 6),
  item('w-greataxe', 'Greataxe', 'weapon', 3000, 7),
  item('w-greatsword', 'Greatsword', 'weapon', 5000, 6),
  item('w-halberd', 'Halberd', 'weapon', 2000, 6),
  item('w-lance', 'Lance', 'weapon', 1000, 6),
  item('w-longsword', 'Longsword', 'weapon', 1500, 3),
  item('w-maul', 'Maul', 'weapon', 1000, 10),
  item('w-morningstar', 'Morningstar', 'weapon', 1500, 4),
  item('w-pike', 'Pike', 'weapon', 500, 18),
  item('w-rapier', 'Rapier', 'weapon', 2500, 2),
  item('w-scimitar', 'Scimitar', 'weapon', 2500, 3),
  item('w-shortsword', 'Shortsword', 'weapon', 1000, 2),
  item('w-trident', 'Trident', 'weapon', 500, 4),
  item('w-warhammer', 'Warhammer', 'weapon', 1500, 5),
  item('w-war-pick', 'War Pick', 'weapon', 500, 2),
  item('w-whip', 'Whip', 'weapon', 200, 3),
  item('w-blowgun', 'Blowgun', 'weapon', 1000, 1),
  item('w-hand-crossbow', 'Hand Crossbow', 'weapon', 7500, 3),
  item('w-heavy-crossbow', 'Heavy Crossbow', 'weapon', 5000, 18),
  item('w-longbow', 'Longbow', 'weapon', 5000, 2),
  item('w-musket', 'Musket', 'weapon', 50000, 10),
  item('w-pistol', 'Pistol', 'weapon', 25000, 3),
  item('w-net', 'Net', 'weapon', 100, 3),
];

/** Artisanâ€™s tools, other tools, gaming sets, instruments â€” PHB 2024 */
const TOOLS: ShopItem[] = [
  item('t-alchemist', "Alchemist's Supplies", 'tool', 5000, 8),
  item('t-brewer', "Brewer's Supplies", 'tool', 2000, 9),
  item('t-calligrapher', "Calligrapher's Supplies", 'tool', 1000, 5),
  item('t-carpenter', "Carpenter's Tools", 'tool', 800, 6),
  item('t-cartographer', "Cartographer's Tools", 'tool', 1500, 6),
  item('t-cobbler', "Cobbler's Tools", 'tool', 500, 5),
  item('t-cook', "Cook's Utensils", 'tool', 100, 8),
  item('t-glassblower', "Glassblower's Tools", 'tool', 3000, 5),
  item('t-jeweler', "Jeweler's Tools", 'tool', 2500, 2),
  item('t-leatherworker', "Leatherworker's Tools", 'tool', 500, 5),
  item('t-mason', "Mason's Tools", 'tool', 1000, 8),
  item('t-painter', "Painter's Supplies", 'tool', 1000, 5),
  item('t-potter', "Potter's Tools", 'tool', 1000, 3),
  item('t-smith', "Smith's Tools", 'tool', 2000, 8),
  item('t-tinker', "Tinker's Tools", 'tool', 5000, 10),
  item('t-weaver', "Weaver's Tools", 'tool', 100, 5),
  item('t-woodcarver', "Woodcarver's Tools", 'tool', 100, 5),
  item('t-disguise', 'Disguise Kit', 'tool', 2500, 3),
  item('t-forgery', 'Forgery Kit', 'tool', 1500, 5),
  item('t-herbalism', 'Herbalism Kit', 'tool', 500, 3),
  item('t-navigator', "Navigator's Tools", 'tool', 2500, 2),
  item('t-poisoner', "Poisoner's Kit", 'tool', 5000, 2),
  item('t-thieves', "Thieves' Tools", 'tool', 2500, 1),
  item('t-dice', 'Dice Set', 'tool', 10, 0),
  item('t-dragonchess', 'Dragonchess Set', 'tool', 100, 0.5),
  item('t-playing-cards', 'Playing Card Set', 'tool', 50, 0),
  item('t-three-dragon-ante', 'Three-Dragon Ante Set', 'tool', 100, 0),
  item('t-bagpipes', 'Bagpipes', 'tool', 3000, 6),
  item('t-drum', 'Drum', 'tool', 600, 3),
  item('t-dulcimer', 'Dulcimer', 'tool', 2500, 10),
  item('t-flute', 'Flute', 'tool', 200, 1),
  item('t-lute', 'Lute', 'tool', 3500, 2),
  item('t-lyre', 'Lyre', 'tool', 3000, 2),
  item('t-horn', 'Horn', 'tool', 300, 2),
  item('t-pan-flute', 'Pan Flute', 'tool', 1200, 2),
  item('t-shawm', 'Shawm', 'tool', 200, 1),
  item('t-viol', 'Viol', 'tool', 3000, 1),
];

/** Adventuring gear (alphabetical excerpt + ammo + focuses) â€” PHB 2024 */
const ADVENTURING: ShopItem[] = [
  item('a-abacus', 'Abacus', 'adventuring', 200, 2),
  item('a-acid', 'Acid (vial)', 'adventuring', 2500, 1),
  item('a-alchemist-fire', 'Alchemistâ€™s Fire (flask)', 'adventuring', 5000, 1),
  item('a-antitoxin', 'Antitoxin (vial)', 'adventuring', 5000, 0),
  item('a-arrows', 'Arrows (20)', 'adventuring', 100, 1),
  item('a-blowgun-needles', 'Blowgun Needles (50)', 'adventuring', 100, 1),
  item('a-crossbow-bolts', 'Crossbow Bolts (20)', 'adventuring', 150, 1.5),
  item('a-sling-bullets', 'Sling Bullets (20)', 'adventuring', 4, 1.5),
  item('a-musket-bullets', 'Musket Bullets (10)', 'adventuring', 300, 2),
  item('a-pistol-bullets', 'Pistol Bullets (10)', 'adventuring', 200, 1),
  item('a-backpack', 'Backpack', 'adventuring', 200, 5),
  item('a-ball-bearings', 'Ball Bearings', 'adventuring', 100, 2),
  item('a-barrel', 'Barrel', 'adventuring', 200, 70),
  item('a-basket', 'Basket', 'adventuring', 40, 1),
  item('a-bedroll', 'Bedroll', 'adventuring', 100, 7),
  item('a-bell', 'Bell', 'adventuring', 100, 0),
  item('a-blanket', 'Blanket', 'adventuring', 50, 3),
  item('a-block-tackle', 'Block and Tackle', 'adventuring', 100, 5),
  item('a-book', 'Book', 'adventuring', 2500, 5),
  item('a-bottle-glass', 'Bottle, Glass', 'adventuring', 200, 2),
  item('a-bucket', 'Bucket', 'adventuring', 5, 2),
  item('a-caltrops', 'Caltrops (bag of 20)', 'adventuring', 100, 2),
  item('a-candle', 'Candle', 'adventuring', 1, 0),
  item('a-case-crossbow-bolt', 'Case, Crossbow Bolt', 'adventuring', 100, 1),
  item('a-case-map-scroll', 'Case, Map or Scroll', 'adventuring', 100, 1),
  item('a-chain', 'Chain (10 feet)', 'adventuring', 500, 10),
  item('a-chalk', 'Chalk (1 piece)', 'adventuring', 1, 0),
  item('a-chest', 'Chest', 'adventuring', 500, 25),
  item('a-climbers-kit', "Climber's Kit", 'adventuring', 2500, 12),
  item('a-clothes-common', 'Clothes, Common', 'adventuring', 50, 3),
  item('a-clothes-costume', 'Clothes, Costume', 'adventuring', 500, 4),
  item('a-clothes-fine', 'Clothes, Fine', 'adventuring', 1500, 6),
  item('a-clothes-travelers', 'Clothes, Travelerâ€™s', 'adventuring', 200, 4),
  item('a-component-pouch', 'Component Pouch', 'adventuring', 2500, 2),
  item('a-crowbar', 'Crowbar', 'adventuring', 200, 5),
  item('a-druidic-focus-sprig', 'Druidic Focus (Sprig of Mistletoe)', 'adventuring', 100, 0),
  item('a-druidic-focus-totem', 'Druidic Focus (Totem)', 'adventuring', 100, 0),
  item('a-druidic-focus-staff', 'Druidic Focus (Wooden Staff)', 'adventuring', 500, 4),
  item('a-emblem-holy', 'Holy Symbol (Emblem)', 'adventuring', 500, 0),
  item('a-amulet-holy', 'Holy Symbol (Amulet)', 'adventuring', 500, 1),
  item('a-reliquary-holy', 'Holy Symbol (Reliquary)', 'adventuring', 500, 2),
  item('a-arcane-crystal', 'Arcane Focus (Crystal)', 'adventuring', 1000, 1),
  item('a-arcane-orb', 'Arcane Focus (Orb)', 'adventuring', 2000, 3),
  item('a-arcane-rod', 'Arcane Focus (Rod)', 'adventuring', 1000, 2),
  item('a-arcane-staff', 'Arcane Focus (Staff)', 'adventuring', 500, 4),
  item('a-arcane-wand', 'Arcane Focus (Wand)', 'adventuring', 1000, 1),
  item('a-flask-tankard', 'Flask or Tankard', 'adventuring', 2, 1),
  item('a-grappling-hook', 'Grappling Hook', 'adventuring', 200, 4),
  item('a-hammer', 'Hammer', 'adventuring', 100, 3),
  item('a-hammer-sledge', 'Hammer, Sledge', 'adventuring', 200, 10),
  item('a-healers-kit', "Healer's Kit", 'adventuring', 500, 3),
  item('a-holy-water', 'Holy Water (flask)', 'adventuring', 2500, 1),
  item('a-hourglass', 'Hourglass', 'adventuring', 2500, 1),
  item('a-hunting-trap', 'Hunting Trap', 'adventuring', 500, 25),
  item('a-ink-ounce', 'Ink (1 ounce bottle)', 'adventuring', 1000, 0),
  item('a-ink-pen', 'Ink Pen', 'adventuring', 2, 0),
  item('a-jug', 'Jug or Pitcher', 'adventuring', 2, 4),
  item('a-ladder', 'Ladder (10-foot)', 'adventuring', 10, 25),
  item('a-lamp', 'Lamp', 'adventuring', 50, 1),
  item('a-lantern-bullseye', 'Lantern, Bullseye', 'adventuring', 1000, 2),
  item('a-lantern-hooded', 'Lantern, Hooded', 'adventuring', 500, 2),
  item('a-lock', 'Lock', 'adventuring', 1000, 1),
  item('a-magnifying-glass', 'Magnifying Glass', 'adventuring', 10000, 0),
  item('a-manacles', 'Manacles', 'adventuring', 200, 6),
  item('a-mirror-steel', 'Mirror, Steel', 'adventuring', 500, 0.5),
  item('a-oil', 'Oil (flask)', 'adventuring', 10, 1),
  item('a-paper', 'Paper (one sheet)', 'adventuring', 20, 0),
  item('a-parchment', 'Parchment (one sheet)', 'adventuring', 100, 0),
  item('a-perfume', 'Perfume (vial)', 'adventuring', 500, 0),
  item('a-piton', 'Piton', 'adventuring', 5, 0.25),
  item('a-poison-basic', 'Poison, Basic (vial)', 'adventuring', 10000, 0),
  item('a-pole', 'Pole (10-foot)', 'adventuring', 5, 7),
  item('a-pot-iron', 'Pot, Iron', 'adventuring', 200, 10),
  item('a-potion-healing', 'Potion of Healing', 'adventuring', 5000, 0.5),
  item('a-pouch', 'Pouch', 'adventuring', 50, 1),
  item('a-quiver', 'Quiver', 'adventuring', 100, 1),
  item('a-ram-portable', 'Ram, Portable', 'adventuring', 400, 35),
  item('a-rations', 'Rations (1 day)', 'adventuring', 50, 2),
  item('a-rope-hemp', 'Rope, Hempen (50 feet)', 'adventuring', 100, 10),
  item('a-rope-silk', 'Rope, Silk (50 feet)', 'adventuring', 1000, 5),
  item('a-sack', 'Sack', 'adventuring', 1, 0.5),
  item('a-scale-merchants', "Scale, Merchant's", 'adventuring', 500, 3),
  item('a-sealing-wax', 'Sealing Wax', 'adventuring', 5, 0),
  item('a-shovel', 'Shovel', 'adventuring', 200, 5),
  item('a-signal-whistle', 'Signal Whistle', 'adventuring', 5, 0),
  item('a-signet-ring', 'Signet Ring', 'adventuring', 500, 0),
  item('a-soap', 'Soap', 'adventuring', 2, 0),
  item('a-spellbook', 'Spellbook', 'adventuring', 5000, 3),
  item('a-spikes-iron', 'Spikes, Iron (10)', 'adventuring', 100, 5),
  item('a-spyglass', 'Spyglass', 'adventuring', 100000, 1),
  item('a-tent-two', 'Tent, two-person', 'adventuring', 200, 20),
  item('a-tinderbox', 'Tinderbox', 'adventuring', 50, 1),
  item('a-torch', 'Torch', 'adventuring', 1, 1),
  item('a-vial', 'Vial', 'adventuring', 100, 0),
  item('a-waterskin', 'Waterskin', 'adventuring', 20, 5),
  item('a-whetstone', 'Whetstone', 'adventuring', 1, 1),
];

/** Mounts â€” PHB 2024 â€œMounts and Other Animalsâ€ (barding excluded â€” armor chapter) */
const MOUNTS: ShopItem[] = [
  item('m-camel', 'Camel', 'mount', 5000, 0),
  item('m-elephant', 'Elephant', 'mount', 200000, 0),
  item('m-horse-draft', 'Horse, Draft', 'mount', 5000, 0),
  item('m-horse-riding', 'Horse, Riding', 'mount', 7500, 0),
  item('m-mastiff', 'Mastiff', 'mount', 2500, 0),
  item('m-mule', 'Mule', 'mount', 800, 0),
  item('m-pony', 'Pony', 'mount', 3000, 0),
  item('m-warhorse', 'Warhorse', 'mount', 40000, 0),
];

/** Tack & drawn vehicles â€” PHB 2024 */
const VEHICLES: ShopItem[] = [
  item('v-carriage', 'Carriage', 'vehicle', 10000, 600),
  item('v-cart', 'Cart', 'vehicle', 1500, 200),
  item('v-chariot', 'Chariot', 'vehicle', 25000, 100),
  item('v-sled', 'Sled', 'vehicle', 2000, 300),
  item('v-wagon', 'Wagon', 'vehicle', 3500, 400),
  item('v-saddle-riding', 'Saddle, Riding', 'vehicle', 1000, 25),
  item('v-saddle-military', 'Saddle, Military', 'vehicle', 2000, 30),
  item('v-saddle-exotic', 'Saddle, Exotic', 'vehicle', 6000, 40),
];

const MOUNT_SERVICES: ShopItem[] = [
  item('ms-feed', 'Feed (per day)', 'service', 5, 10),
  item('ms-stabling', 'Stabling (per day)', 'service', 50, 0),
];

/** Ships & airship â€” PHB 2024 */
const SHIPS: ShopItem[] = [
  item('s-airship', 'Airship', 'ship', 4000000, 0),
  item('s-galley', 'Galley', 'ship', 3000000, 0),
  item('s-keelboat', 'Keelboat', 'ship', 300000, 0),
  item('s-longship', 'Longship', 'ship', 1000000, 0),
  item('s-rowboat', 'Rowboat', 'ship', 5000, 0),
  item('s-sailing', 'Sailing Ship', 'ship', 1000000, 0),
  item('s-warship', 'Warship', 'ship', 2500000, 0),
];

/** Lifestyle, food, travel, hirelings, spellcasting, ship repair â€” PHB 2024 Services */
const SERVICES: ShopItem[] = [
  item('sv-squalid', 'Lifestyle: Squalid (1 day)', 'service', 10, 0),
  item('sv-poor', 'Lifestyle: Poor (1 day)', 'service', 20, 0),
  item('sv-modest', 'Lifestyle: Modest (1 day)', 'service', 100, 0),
  item('sv-comfortable', 'Lifestyle: Comfortable (1 day)', 'service', 200, 0),
  item('sv-wealthy', 'Lifestyle: Wealthy (1 day)', 'service', 400, 0),
  item('sv-aristocratic', 'Lifestyle: Aristocratic (1 day)', 'service', 1000, 0),
  item('fd-ale', 'Ale (mug)', 'service', 4, 0),
  item('fd-bread', 'Bread (loaf)', 'service', 2, 0),
  item('fd-cheese', 'Cheese (wedge)', 'service', 10, 0),
  item('fd-wine-common', 'Wine, Common (bottle)', 'service', 200, 0),
  item('fd-wine-fine', 'Wine, Fine (bottle)', 'service', 100000, 0),
  item('inn-squalid', 'Inn stay (Squalid, 1 day)', 'service', 7, 0),
  item('inn-poor', 'Inn stay (Poor, 1 day)', 'service', 10, 0),
  item('inn-modest', 'Inn stay (Modest, 1 day)', 'service', 50, 0),
  item('inn-comfortable', 'Inn stay (Comfortable, 1 day)', 'service', 80, 0),
  item('inn-wealthy', 'Inn stay (Wealthy, 1 day)', 'service', 20000, 0),
  item('inn-aristocratic', 'Inn stay (Aristocratic, 1 day)', 'service', 40000, 0),
  item('meal-squalid', 'Meal (Squalid)', 'service', 1, 0),
  item('meal-poor', 'Meal (Poor)', 'service', 2, 0),
  item('meal-modest', 'Meal (Modest)', 'service', 10, 0),
  item('meal-comfortable', 'Meal (Comfortable)', 'service', 20, 0),
  item('meal-wealthy', 'Meal (Wealthy)', 'service', 30, 0),
  item('meal-aristocratic', 'Meal (Aristocratic)', 'service', 60, 0),
  item('tr-coach-town', 'Coach ride between towns (1 mile)', 'service', 3, 0),
  item('tr-coach-city', 'Coach ride within a city (1 mile)', 'service', 1, 0),
  item('tr-toll', 'Road or gate toll', 'service', 1, 0),
  item('tr-ship-mile', "Ship's passage (1 mile)", 'service', 10, 0),
  item('h-skilled', 'Skilled hireling (1 day)', 'service', 20000, 0),
  item('h-untrained', 'Untrained hireling (1 day)', 'service', 200, 0),
  item('h-messenger-mile', 'Messenger (1 mile)', 'service', 2, 0),
  item('ship-repair-hp', 'Ship repair (1 HP while berthed)', 'service', 2000, 0),
  item('spell-0', 'Spellcasting: Cantrip', 'service', 3000, 0),
  item('spell-1', 'Spellcasting: 1st-level spell', 'service', 5000, 0),
  item('spell-2', 'Spellcasting: 2nd-level spell', 'service', 20000, 0),
  item('spell-3', 'Spellcasting: 3rd-level spell', 'service', 30000, 0),
  item('spell-45', 'Spellcasting: 4thâ€“5th-level spell', 'service', 200000, 0),
  item('spell-68', 'Spellcasting: 6thâ€“8th-level spell', 'service', 2000000, 0),
  item('spell-9', 'Spellcasting: 9th-level spell', 'service', 10000000, 0),
];

export const SHOP_ITEMS: ShopItem[] = [
  ...WEAPONS,
  ...TOOLS,
  ...ADVENTURING,
  ...MOUNTS,
  ...VEHICLES,
  ...MOUNT_SERVICES,
  ...SHIPS,
  ...SERVICES,
];

export const SHOP_CATEGORY_LABELS: Record<ShopCategory, string> = {
  weapon: 'Weapons',
  tool: 'Tools',
  adventuring: 'Adventuring gear',
  mount: 'Mounts',
  vehicle: 'Tack & vehicles',
  ship: 'Ships',
  service: 'Services',
};
