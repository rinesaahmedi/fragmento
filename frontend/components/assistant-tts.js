"use client";

export async function speakAssistantTextWithTts(text, options = {}) {
  const answer = String(text || "").trim();
  if (!answer || typeof window === "undefined") {
    return;
  }

  const {
    audioRef,
    language = "en-US",
    fallbackRate = 0.96,
  } = options;

  window.speechSynthesis?.cancel?.();
  if (audioRef?.current) {
    audioRef.current.pause();
    audioRef.current.src = "";
    audioRef.current = null;
  }

  try {
    const response = await fetch("/api/tts", {
      method: "POST",
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

    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const releaseAudio = () => {
      URL.revokeObjectURL(audioUrl);
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
    };

    audio.addEventListener("ended", releaseAudio, { once: true });
    audio.addEventListener("error", releaseAudio, { once: true });
    await audio.play();
    return;
  } catch (error) {
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
