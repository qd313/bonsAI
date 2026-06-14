export type SettingsTabLocalSnapshot = {
  accentIntensityMenuOpen: boolean;
};

let getter: (() => SettingsTabLocalSnapshot) | null = null;
let pendingLocal: SettingsTabLocalSnapshot | null = null;

export function registerSettingsTabLocalGetter(fn: () => SettingsTabLocalSnapshot): void {
  getter = fn;
}

export function unregisterSettingsTabLocalGetter(): void {
  getter = null;
}

export function captureSettingsTabLocalSnapshot(): SettingsTabLocalSnapshot | null {
  const snap = getter?.() ?? null;
  if (snap) pendingLocal = snap;
  return snap;
}

export function peekSettingsTabLocalPending(): SettingsTabLocalSnapshot | null {
  return pendingLocal;
}

export function consumeSettingsTabLocalPending(): SettingsTabLocalSnapshot | null {
  const snap = pendingLocal;
  pendingLocal = null;
  return snap;
}

export function clearSettingsTabLocalSurvival(): void {
  pendingLocal = null;
  getter = null;
}
