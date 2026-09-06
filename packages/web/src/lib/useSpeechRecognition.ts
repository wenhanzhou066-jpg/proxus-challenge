import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
}

const getCtor = (): SpeechRecognitionCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export interface UseSpeechRecognitionOptions {
  readonly lang?: string;
  readonly onTranscript: (text: string, isFinal: boolean) => void;
  /** Auto-stop after this many ms with no speech. Default 2000. Pass 0 to disable. */
  readonly silenceTimeoutMs?: number;
}

export interface SpeechRecognitionState {
  readonly supported: boolean;
  readonly listening: boolean;
  readonly error: string | null;
  readonly start: () => void;
  readonly stop: () => void;
  readonly toggle: () => void;
}

export function useSpeechRecognition({
  lang = "es-ES",
  onTranscript,
  silenceTimeoutMs = 2000
}: UseSpeechRecognitionOptions): SpeechRecognitionState {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const ctor = getCtor();
  const supported = ctor !== null;

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current !== null) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const armSilenceTimer = () => {
    if (silenceTimeoutMs <= 0) return;
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      const instance = recognitionRef.current;
      if (instance === null) return;
      try { instance.stop(); } catch { /* noop */ }
    }, silenceTimeoutMs);
  };

  useEffect(() => {
    if (ctor === null) return;
    const instance = new ctor();
    instance.continuous = true;
    instance.interimResults = true;
    instance.lang = lang;

    instance.onresult = (event) => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result === undefined) continue;
        const transcript = result[0].transcript;
        if (result.isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
        }
      }
      if (finalText.length > 0) {
        onTranscriptRef.current(finalText, true);
        armSilenceTimer();
      } else if (interim.length > 0) {
        onTranscriptRef.current(interim, false);
        armSilenceTimer();
      }
    };

    instance.onerror = (event) => {
      setError(event.error);
      setListening(false);
      clearSilenceTimer();
    };

    instance.onend = () => {
      setListening(false);
      clearSilenceTimer();
    };

    recognitionRef.current = instance;

    return () => {
      clearSilenceTimer();
      instance.onresult = null;
      instance.onerror = null;
      instance.onend = null;
      try { instance.abort(); } catch { /* noop */ }
      recognitionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctor, lang, silenceTimeoutMs]);

  const start = useCallback(() => {
    const instance = recognitionRef.current;
    if (instance === null) return;
    setError(null);
    try {
      instance.start();
      setListening(true);
      armSilenceTimer();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = useCallback(() => {
    const instance = recognitionRef.current;
    if (instance === null) return;
    clearSilenceTimer();
    try { instance.stop(); } catch { /* noop */ }
    setListening(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop(); else start();
  }, [listening, start, stop]);

  return { supported, listening, error, start, stop, toggle };
}
