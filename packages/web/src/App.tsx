import { useState } from "react";
import { ArtifactWorkspace } from "./components/ArtifactWorkspace.tsx";
import { Chat } from "./components/Chat.tsx";
import { CreateAssignmentModal } from "./components/CreateAssignmentModal.tsx";
import { OnboardingChoice } from "./components/OnboardingChoice.tsx";
import { PersonalityQuiz } from "./components/PersonalityQuiz.tsx";
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

export function App() {
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [mode, setMode] = useState<UserMode | null>(() => loadMode());
  const [profile, setProfile] = useState<Profile | null>(() => loadProfile());
  const [assignments, setAssignments] = useState<ReadonlyArray<Assignment>>(() => loadAssignments());
  const [currentAssignmentId, setCurrentAssignmentIdState] = useState<string | null>(() => loadCurrentId());
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  const currentAssignment = assignments.find((a) => a.id === currentAssignmentId) ?? null;

  return (
    <div
      className="grid h-screen min-h-screen overflow-hidden bg-slate-950 text-slate-100"
      style={{
        gridTemplateColumns: selectedArtifactId === null
          ? "340px minmax(0, 1fr)"
          : "340px minmax(0, 1fr) 420px"
      }}
    >
      <Sidebar
        selectedArtifactId={selectedArtifactId}
        onSelectArtifact={setSelectedArtifactId}
        assignments={assignments}
        currentAssignmentId={currentAssignmentId}
        onSelectAssignment={selectAssignment}
        onOpenCreateAssignment={() => setShowCreateModal(true)}
        onDeleteAssignment={(id) => {
          clearMessages(id);
          updateAssignments(assignments.filter((a) => a.id !== id));
          if (currentAssignmentId === id) selectAssignment(null);
        }}
        onRenameAssignment={(id, newTitle) => {
          updateAssignments(assignments.map((a) => a.id === id ? { ...a, title: newTitle } : a));
        }}
      />
      {selectedArtifactId !== null && <ArtifactWorkspace artifactId={selectedArtifactId} />}
      <Chat
        profile={profile}
        assignments={assignments}
        currentAssignment={currentAssignment}
        onOpenCreateAssignment={() => setShowCreateModal(true)}
        onResetPreferences={() => {
          clearAll();
          setProfile(null);
          setMode(null);
        }}
      />
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
    </div>
  );
}
