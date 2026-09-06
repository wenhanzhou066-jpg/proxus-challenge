import type { Assignment, Material } from "./types.ts";

const LIST_KEY = "proxus.assignments.list.v1";
const CURRENT_KEY = "proxus.assignments.current.v1";

export function loadAssignments(): ReadonlyArray<Assignment> {
  try {
    const raw = localStorage.getItem(LIST_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw) as ReadonlyArray<Assignment>;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((assignment): Assignment => ({
      ...assignment,
      materials: (assignment.materials ?? []).map((material: Material): Material => ({
        ...material,
        tags: material.tags ?? []
      }))
    }));
  } catch {
    return [];
  }
}

export function saveAssignments(list: ReadonlyArray<Assignment>): void {
  localStorage.setItem(LIST_KEY, JSON.stringify(list));
}

export function loadCurrentId(): string | null {
  return localStorage.getItem(CURRENT_KEY);
}

export function saveCurrentId(id: string | null): void {
  if (id === null) {
    localStorage.removeItem(CURRENT_KEY);
    return;
  }
  localStorage.setItem(CURRENT_KEY, id);
}

export function createAssignment(
  title: string,
  description: string,
  materials: ReadonlyArray<Material> = []
): Assignment {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    title: title.trim(),
    description: description.trim(),
    createdAt: new Date().toISOString(),
    materials
  };
}

export function loadMessages(assignmentId: string): unknown {
  try {
    const raw = localStorage.getItem(`proxus.chat.${assignmentId}.messages.v1`);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveMessages(assignmentId: string, messages: unknown): void {
  try {
    localStorage.setItem(`proxus.chat.${assignmentId}.messages.v1`, JSON.stringify(messages));
  } catch {
    // storage quota — silently drop, chat still works in-memory
  }
}

export function clearMessages(assignmentId: string): void {
  localStorage.removeItem(`proxus.chat.${assignmentId}.messages.v1`);
}

export function readFileAsMaterial(file: File): Promise<Material> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unexpected file reader result"));
        return;
      }
      resolve({
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        sizeBytes: file.size,
        addedAt: new Date().toISOString(),
        dataUrl: result,
        tags: []
      });
    };
    reader.readAsDataURL(file);
  });
}
