import { useCallback, useEffect, useRef, useState } from "react";

export interface UseSpeechSynthesisOptions {
  readonly lang?: string;
  readonly rate?: number;
}

export interface SpeechSynthesisState {
  readonly supported: boolean;
  readonly speaking: boolean;
  readonly speak: (text: string) => void;
  readonly stop: () => void;
  readonly toggle: (text: string) => void;
}

/**
 * Wrapper around Web Speech Synthesis. Cancels any prior utterance before speaking a new one
 * so multiple message bubbles don't overlap.
 */
export function useSpeechSynthesis({
  lang = "es-ES",
  rate = 1
}: UseSpeechSynthesisOptions = {}): SpeechSynthesisState {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => () => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    utteranceRef.current = null;
  }, [supported]);

  const speak = useCallback((text: string) => {
    if (!supported || text.trim().length === 0) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = rate;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => { setSpeaking(false); utteranceRef.current = null; };
    utter.onerror = () => { setSpeaking(false); utteranceRef.current = null; };
    utteranceRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, [supported, lang, rate]);

  const toggle = useCallback((text: string) => {
    if (speaking) stop(); else speak(text);
  }, [speaking, speak, stop]);

  return { supported, speaking, speak, stop, toggle };
}
