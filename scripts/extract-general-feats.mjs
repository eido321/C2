/**
 * General feats are now generated from docs/rules_copypaste.md by:
 *   python tools/sync_feats_from_rules_copypaste.py
 * which writes src/data/phb2024FeatsFromRules.json (imported in src/data/feats.ts).
 */
import process from 'process';

console.error(
  'extract-general-feats.mjs is deprecated. Run: python tools/sync_feats_from_rules_copypaste.py',
);
process.exit(1);
