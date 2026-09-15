/**
 * Title: Remembering the Settings tab's open menu across a panel close and reopen
 *
 * Purpose: Opening certain modals tears down and rebuilds the quick-access panel, which would
 * normally reset the Settings tab. This file remembers one thing about it — whether the AI
 * character's accent-intensity menu was left open — so it looks the same when the panel reopens
 * instead of resetting closed.
 *
 * Used for: the Settings tab's accent-intensity dropdown.
 *
 * Solves: without this, opening a modal from Settings (or the panel closing and reopening on its
 * own) would close a menu the person had left open.
 *
 * Does not: save any actual setting value — those are saved permanently through
 * `usePluginSettings`'s own save path. This file only remembers whether one menu was open, and
 * only for as long as the panel stays open.
 *
 * How it works: this is a thin wrapper around `createTabLocalSurvival()`, giving it the Settings
 * tab's own snapshot shape (just the one on/off flag) and exporting tab-specific names for it.
 */
import { createTabLocalSurvival } from "./createTabLocalSurvival";

export type SettingsTabLocalSnapshot = {
  accentIntensityMenuOpen: boolean;
};

const survival = createTabLocalSurvival<SettingsTabLocalSnapshot>();

export function registerSettingsTabLocalGetter(fn: () => SettingsTabLocalSnapshot): void {
  survival.registerGetter(fn);
}

export function unregisterSettingsTabLocalGetter(): void {
  survival.unregisterGetter();
}

export function captureSettingsTabLocalSnapshot(): SettingsTabLocalSnapshot | null {
  return survival.captureSnapshot();
}

export function peekSettingsTabLocalPending(): SettingsTabLocalSnapshot | null {
  return survival.peekPending();
}

export function consumeSettingsTabLocalPending(): SettingsTabLocalSnapshot | null {
  return survival.consumePending();
}

export function clearSettingsTabLocalSurvival(): void {
  survival.clear();
}
