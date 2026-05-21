"use client";

export function stopAssistantSpeech(audioRef, abortControllerRef) {
  abortControllerRef?.current?.abort?.();
  if (abortControllerRef) {
    abortControllerRef.current = null;
  }

  window.speechSynthesis?.cancel?.();
  if (audioRef?.current) {
    const audio = audioRef.current;
    audio.pause();
    audio.src = "";
    audioRef.current = null;
  }
}

export async function speakAssistantTextWithTts(text, options = {}) {
  const answer = String(text || "").trim();
  if (!answer || typeof window === "undefined") {
    return;
  }

  const {
    audioRef,
    abortControllerRef,
    language = "en-US",
    fallbackRate = 0.96,
  } = options;

  stopAssistantSpeech(audioRef, abortControllerRef);

  const controller = new AbortController();
  if (abortControllerRef) {
    abortControllerRef.current = controller;
  }

  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: answer, language }),
    });

    if (!response.ok) {
      throw new Error("TTS route unavailable.");
    }

    const blob = await response.blob();
    if (!blob.size) {
      throw new Error("TTS route returned empty audio.");
    }
    if (controller.signal.aborted) {
      return;
    }

    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const releaseAudio = () => {
      URL.revokeObjectURL(audioUrl);
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
      if (abortControllerRef?.current === controller) {
        abortControllerRef.current = null;
      }
    };

    audio.addEventListener("ended", releaseAudio, { once: true });
    audio.addEventListener("error", releaseAudio, { once: true });
    audio.addEventListener("pause", releaseAudio, { once: true });
    await audio.play();
    return;
  } catch (error) {
    if (controller.signal.aborted) {
      return;
    }
    console.warn("Assistant TTS fell back to browser speech:", error?.message || error);
    if (!window.speechSynthesis) {
      return;
    }

    const utterance = new SpeechSynthesisUtterance(answer);
    utterance.lang = language;
    utterance.rate = fallbackRate;
    window.speechSynthesis.speak(utterance);
  }
}
