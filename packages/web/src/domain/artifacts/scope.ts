const KEY = "proxus.artifacts.assignment.v1";

type Map = Record<string, string>;

function load(): Map {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) return {};
    const parsed = JSON.parse(raw);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Map : {};
  } catch {
    return {};
  }
}

function save(map: Map): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* noop */
  }
}

const listeners = new Set<() => void>();

export function subscribeArtifactScope(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function tagArtifactWithAssignment(artifactId: string, assignmentId: string): void {
  const current = load();
  if (current[artifactId] === assignmentId) return;
  current[artifactId] = assignmentId;
  save(current);
  for (const l of listeners) l();
}

export function getArtifactAssignmentMap(): Readonly<Map> {
  return load();
}

export function removeArtifactTag(artifactId: string): void {
  const current = load();
  if (!(artifactId in current)) return;
  delete current[artifactId];
  save(current);
  for (const l of listeners) l();
}

export function removeAssignmentTags(assignmentId: string): void {
  const current = load();
  let changed = false;
  for (const [artifactId, aid] of Object.entries(current)) {
    if (aid === assignmentId) { delete current[artifactId]; changed = true; }
  }
  if (changed) { save(current); for (const l of listeners) l(); }
}
