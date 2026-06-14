import type { DeveloperConnectionStatus } from "../components/DeveloperTab";

export type OllamaTabLocalSnapshot = {
  connectionStatus: DeveloperConnectionStatus | null;
  mdnsHosts: Array<{ label: string; host: string; port: number; verified?: boolean }>;
  mdnsDiscoveryMessage: string | null;
  localInstallMenuOpen: boolean;
};

let getter: (() => OllamaTabLocalSnapshot) | null = null;
let pendingLocal: OllamaTabLocalSnapshot | null = null;

export function registerOllamaTabLocalGetter(fn: () => OllamaTabLocalSnapshot): void {
  getter = fn;
}

export function unregisterOllamaTabLocalGetter(): void {
  getter = null;
}

export function captureOllamaTabLocalSnapshot(): OllamaTabLocalSnapshot | null {
  const snap = getter?.() ?? null;
  if (snap) pendingLocal = snap;
  return snap;
}

export function peekOllamaTabLocalPending(): OllamaTabLocalSnapshot | null {
  return pendingLocal;
}

export function consumeOllamaTabLocalPending(): OllamaTabLocalSnapshot | null {
  const snap = pendingLocal;
  pendingLocal = null;
  return snap;
}

export function clearOllamaTabLocalSurvival(): void {
  pendingLocal = null;
  getter = null;
}
