/**
 * LingoFriends V2 — Core Type Exports
 *
 * Central re-export barrel for all shared types.
 * Import from '$lib/types' rather than individual files where possible.
 *
 * Domain types (db schema types, AI response types, etc.) are added
 * as each phase is implemented.
 */

// Language utilities — always import from here, never inline
export type { LanguageCode, LanguageConfig } from './language';
export { toCode, toName, getTTSCode, getFlag, getAllLanguages, isValidCode } from './language';
