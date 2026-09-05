import { useState } from "react";
import { ArtifactWorkspace } from "./components/ArtifactWorkspace.tsx";
import { Chat } from "./components/Chat.tsx";
import { OnboardingChoice } from "./components/OnboardingChoice.tsx";
import { PersonalityQuiz } from "./components/PersonalityQuiz.tsx";
import { Sidebar } from "./components/Sidebar.tsx";
import { loadMode, loadProfile, saveMode } from "./domain/personality/storage.ts";
import type { Profile, UserMode } from "./domain/personality/types.ts";

export function App() {
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [mode, setMode] = useState<UserMode | null>(() => loadMode());
  const [profile, setProfile] = useState<Profile | null>(() => loadProfile());

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

  return (
    <div
      className="grid h-screen min-h-screen overflow-hidden bg-slate-950 text-slate-100"
      style={{
        gridTemplateColumns: selectedArtifactId === null
          ? "340px minmax(0, 1fr)"
          : "340px minmax(0, 1fr) 420px"
      }}
    >
      <Sidebar selectedArtifactId={selectedArtifactId} onSelectArtifact={setSelectedArtifactId} />
      {selectedArtifactId !== null && <ArtifactWorkspace artifactId={selectedArtifactId} />}
      <Chat />
    </div>
  );
}
