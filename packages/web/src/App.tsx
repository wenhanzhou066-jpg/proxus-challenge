import { useEffect, useRef, useState } from "react";
import { ArtifactWorkspace } from "./components/ArtifactWorkspace.tsx";
import { Chat } from "./components/Chat.tsx";
import { CreateAssignmentModal } from "./components/CreateAssignmentModal.tsx";
import { OnboardingChoice } from "./components/OnboardingChoice.tsx";
import { PdfPanel } from "./components/PdfPanel.tsx";
import { PdfPreviewModal } from "./components/PdfPreviewModal.tsx";
import { PersonalityQuiz } from "./components/PersonalityQuiz.tsx";
import { ResizeHandle } from "./components/ResizeHandle.tsx";
import { SettingsModal } from "./components/SettingsModal.tsx";
import { Sidebar } from "./components/Sidebar.tsx";
import {
  clearMessages,
  createAssignment,
  loadAssignments,
  loadCurrentId,
  saveAssignments,
  saveCurrentId
} from "./domain/assignments/storage.ts";
import type { Assignment } from "./domain/assignments/types.ts";
import { clearAll, loadMode, loadProfile, saveMode } from "./domain/personality/storage.ts";
import type { Profile, UserMode } from "./domain/personality/types.ts";
import { removeAssignmentTags } from "./domain/artifacts/scope.ts";
import { precomputeMaterials } from "./domain/precompute/service.ts";
import { clearAll as clearPrecomputeAll } from "./domain/precompute/storage.ts";
import { clearDeck } from "./domain/precompute/srs.ts";

// ── Layout constants ──
const MOBILE_BREAKPOINT = 768;

const SIDEBAR_DEFAULT = 280;
const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 480;

const PDF_DEFAULT = 420;
const PDF_MIN = 280;
const PDF_MAX = 800;

const ARTIFACT_WIDTH = 420;
const CHAT_MIN_WIDTH = 340;

interface AnimatedPdfPanelProps {
  readonly visible: boolean;
  readonly width: number;
  readonly onResize: (x: number) => void;
  readonly children: React.ReactNode;
}

function AnimatedPdfPanel({ visible, width, onResize, children }: AnimatedPdfPanelProps) {
  const [mounted, setMounted] = useState(visible);
  const [animatingToggle, setAnimatingToggle] = useState(false);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; setMounted(visible); return; }
    setAnimatingToggle(true);
    if (visible) setMounted(true);
    const t = setTimeout(() => {
      setAnimatingToggle(false);
      if (!visible) setMounted(false);
    }, 280);
    return () => clearTimeout(t);
  }, [visible]);

  if (!mounted && !visible) return null;

  return (
    <>
      {visible && <ResizeHandle onResize={onResize} />}
      <div
        className={`flex h-screen shrink-0 overflow-hidden ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
        style={{
          width: visible ? width : 0,
          transition: animatingToggle
            ? "width 280ms cubic-bezier(0.4,0,0.2,1), opacity 220ms ease-out"
            : "opacity 220ms ease-out"
        }}
        aria-hidden={!visible}
      >
        {children}
      </div>
    </>
  );
}

function clamp(value: number, min: number, max: number) {
  if (max < min) return min;
  return Math.max(min, Math.min(max, value));
}

function useWindowWidth() {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    let raf = 0;
    const handler = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setWidth(window.innerWidth));
    };
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("resize", handler);
      cancelAnimationFrame(raf);
    };
  }, []);
  return width;
}

export function App() {
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < MOBILE_BREAKPOINT;

  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [mobilePreviewId, setMobilePreviewId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const [pdfWidth, setPdfWidth] = useState(PDF_DEFAULT);
  const [mode, setMode] = useState<UserMode | null>(() => loadMode());
  const [profile, setProfile] = useState<Profile | null>(() => loadProfile());
  const [assignments, setAssignments] = useState<ReadonlyArray<Assignment>>(() => loadAssignments());
  const [currentAssignmentId, setCurrentAssignmentIdState] = useState<string | null>(() => loadCurrentId());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  function updateAssignments(next: ReadonlyArray<Assignment>) {
    setAssignments(next);
    saveAssignments(next);
  }

  function selectAssignment(id: string | null) {
    setCurrentAssignmentIdState(id);
    saveCurrentId(id);
  }

  function handleChooseMode(next: UserMode) {
    saveMode(next);
    setMode(next);
  }

  const currentAssignment = assignments.find((a) => a.id === currentAssignmentId) ?? null;
  const currentMaterials = currentAssignment?.materials ?? [];

  useEffect(() => {
    if (currentMaterials.length > 0) {
      setSelectedMaterialId((prev) =>
        currentMaterials.some((m) => m.id === prev) ? prev : (currentMaterials[0]?.id ?? null)
      );
    } else {
      setSelectedMaterialId(null);
    }
  }, [currentAssignmentId]);

  // Auto-collapse sidebar when crossing into mobile
  useEffect(() => {
    if (isMobile) setSidebarCollapsed(true);
  }, [isMobile]);

  // Backfill precompute for any material without cached analysis (mount + on assignment changes).
  // precomputeMaterial is idempotent + deduped, so calling it on every render is safe.
  useEffect(() => {
    for (const assignment of assignments) {
      precomputeMaterials(assignment.materials);
    }
  }, [assignments]);

  const artifactVisible = selectedArtifactId !== null && !isMobile;
  const pdfPanelVisible = !isMobile && selectedMaterialId !== null && currentMaterials.length > 0 && selectedArtifactId === null;

  // ── Live max-width computation given other visible panels ──
  const otherReservedWidth =
    (artifactVisible ? ARTIFACT_WIDTH : 0) +
    (pdfPanelVisible ? pdfWidth : 0);
  const otherReservedForPdf =
    (artifactVisible ? ARTIFACT_WIDTH : 0) +
    (!sidebarCollapsed && !isMobile ? sidebarWidth : 0);

  const maxSidebarNow = clamp(windowWidth - otherReservedWidth - CHAT_MIN_WIDTH, SIDEBAR_MIN, SIDEBAR_MAX);
  const maxPdfNow = clamp(windowWidth - otherReservedForPdf - CHAT_MIN_WIDTH, PDF_MIN, PDF_MAX);

  // ── Clamp widths when window resizes or panel visibility changes ──
  useEffect(() => {
    if (isMobile) return;
    setSidebarWidth((w) => Math.min(w, maxSidebarNow));
    setPdfWidth((w) => Math.min(w, maxPdfNow));
  }, [windowWidth, isMobile, artifactVisible, pdfPanelVisible, maxSidebarNow, maxPdfNow]);

  if (mode === null) {
    return <OnboardingChoice onChoose={handleChooseMode} />;
  }

  if (mode === "guided" && profile === null) {
    return (
      <PersonalityQuiz
        onComplete={setProfile}
        onSkip={() => {
          saveMode("free");
          setMode("free");
        }}
      />
    );
  }

  const toggleSidebar = () => setSidebarCollapsed((c) => !c);

  const sidebarProps = {
    selectedArtifactId,
    onSelectArtifact: setSelectedArtifactId,
    assignments,
    currentAssignmentId,
    onSelectAssignment: selectAssignment,
    onOpenCreateAssignment: () => setShowCreateModal(true),
    onDeleteAssignment: (id: string) => {
      const target = assignments.find((a) => a.id === id);
      clearMessages(id);
      removeAssignmentTags(id);
      // Purge per-material caches for this assignment
      if (target !== undefined) {
        for (const material of target.materials) {
          clearPrecomputeAll(material.id);
          clearDeck(material.id);
        }
      }
      updateAssignments(assignments.filter((a) => a.id !== id));
      if (currentAssignmentId === id) selectAssignment(null);
    },
    onRenameAssignment: (id: string, newTitle: string) => {
      updateAssignments(assignments.map((a) => a.id === id ? { ...a, title: newTitle } : a));
    },
    onToggleCollapse: toggleSidebar,
    onOpenSettings: () => setShowSettings(true),
  };

  const modals = (
    <>
    {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    {showCreateModal && (
    <CreateAssignmentModal
      onClose={() => setShowCreateModal(false)}
      onCreate={(title, description, materials) => {
        const next = createAssignment(title, description, materials);
        try {
          updateAssignments([...assignments, next]);
          selectAssignment(next.id);
          setShowCreateModal(false);
        } catch (cause) {
          window.alert(
            `Could not save assignment locally. Your browser may be out of storage space.\n\n${
              cause instanceof Error ? cause.message : String(cause)
            }`
          );
        }
      }}
    />
    )}
    </>
  );

  const openMaterialPreview = (materialId: string) => {
    if (isMobile) {
      setMobilePreviewId(materialId);
    } else {
      setSelectedMaterialId(materialId);
    }
  };

  const chatEl = (
    <Chat
      profile={profile}
      assignments={assignments}
      currentAssignment={currentAssignment}
      onOpenCreateAssignment={() => setShowCreateModal(true)}
      onResetPreferences={() => { clearAll(); setProfile(null); setMode(null); }}
      onToggleSidebar={toggleSidebar}
      onOpenMaterialPreview={openMaterialPreview}
      sidebarCollapsed={sidebarCollapsed}
    />
  );

  const mobilePreviewMaterial = mobilePreviewId !== null
    ? currentMaterials.find((m) => m.id === mobilePreviewId) ?? null
    : null;
  const mobilePreviewEl = mobilePreviewMaterial !== null && (
    <PdfPreviewModal material={mobilePreviewMaterial} onClose={() => setMobilePreviewId(null)} />
  );

  /* ── Mobile: drawer sidebar, chat fills ── */
  if (isMobile) {
    return (
      <div className="flex h-screen min-h-screen overflow-hidden bg-slate-950 text-slate-100">
        {!sidebarCollapsed && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarCollapsed(true)}
            aria-hidden
          />
        )}
        <div
          className="fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-out"
          style={{ transform: sidebarCollapsed ? "translateX(-100%)" : "translateX(0)" }}
        >
          <Sidebar
            {...sidebarProps}
            collapsed={false}
            width={Math.min(320, Math.round(windowWidth * 0.85))}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">{chatEl}</div>
        {modals}
        {mobilePreviewEl}
      </div>
    );
  }

  /* ── Desktop / tablet: split panels ── */
  return (
    <div className="flex h-screen min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <Sidebar
        {...sidebarProps}
        collapsed={sidebarCollapsed}
        width={sidebarWidth}
      />
      {!sidebarCollapsed && (
        <ResizeHandle onResize={(x) => setSidebarWidth(clamp(x, SIDEBAR_MIN, maxSidebarNow))} />
      )}

      {artifactVisible ? (
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <ArtifactWorkspace artifactId={selectedArtifactId} onClose={() => setSelectedArtifactId(null)} />
        </div>
      ) : (
        chatEl
      )}

      <AnimatedPdfPanel
        visible={pdfPanelVisible && selectedMaterialId !== null}
        width={pdfWidth}
        onResize={(x) => setPdfWidth(clamp(windowWidth - x, PDF_MIN, maxPdfNow))}
      >
        {selectedMaterialId !== null && (
          <PdfPanel
            materials={currentMaterials}
            selectedId={selectedMaterialId}
            onSelectId={setSelectedMaterialId}
            onClose={() => setSelectedMaterialId(null)}
          />
        )}
      </AnimatedPdfPanel>

      {modals}
    </div>
  );
}
