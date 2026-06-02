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

const TTS_CHUNK_MAX_CHARS = 260;
const TTS_CHUNK_PAUSE_MS = 350;

function splitTtsChunks(text) {
  const answer = String(text || "").trim();
  if (answer.length <= TTS_CHUNK_MAX_CHARS) {
    return [answer];
  }

  const sentences = answer.match(/[^.!?]+[.!?]*/g) || [answer];
  const chunks = [];
  let current = "";

  for (const sentence of sentences) {
    const part = sentence.trim();
    if (!part) continue;

    if (current && `${current} ${part}`.length > TTS_CHUNK_MAX_CHARS) {
      chunks.push(current);
      current = part;
    } else {
      current = current ? `${current} ${part}` : part;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.length ? chunks : [answer];
}

function wait(ms, signal) {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timeout = window.setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      window.clearTimeout(timeout);
      resolve();
    }, { once: true });
  });
}

async function playAudioBlob(blob, { audioRef, controller }) {
  const audioUrl = URL.createObjectURL(blob);
  const audio = new Audio(audioUrl);
  if (audioRef) {
    audioRef.current = audio;
  }

  await new Promise((resolve, reject) => {
    const releaseAudio = () => {
      URL.revokeObjectURL(audioUrl);
      if (audioRef?.current === audio) {
        audioRef.current = null;
      }
    };

    audio.addEventListener("ended", () => {
      releaseAudio();
      resolve();
    }, { once: true });
    audio.addEventListener("error", () => {
      releaseAudio();
      reject(new Error("Generated audio could not be played."));
    }, { once: true });
    controller.signal.addEventListener("abort", () => {
      audio.pause();
      audio.src = "";
      releaseAudio();
      resolve();
    }, { once: true });

    audio.play().catch((error) => {
      releaseAudio();
      reject(error);
    });
  });
}

async function fetchTtsChunk({ chunk, index, chunks, language, ttsSpeed, controller }) {
  const response = await fetch("/api/tts", {
    method: "POST",
    signal: controller.signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: chunk,
      language,
      chunkIndex: index + 1,
      chunkCount: chunks.length,
      speed: ttsSpeed,
    }),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.detail || detail?.error || "TTS route unavailable.");
  }

  const blob = await response.blob();
  if (!blob.size) {
    throw new Error("TTS route returned empty audio.");
  }

  return { blob, chunk, index };
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
    chunkLongText = false,
    ttsSpeed,
  } = options;

  stopAssistantSpeech(audioRef, abortControllerRef);

  const controller = new AbortController();
  if (abortControllerRef) {
    abortControllerRef.current = controller;
  }

  const chunks = chunkLongText ? splitTtsChunks(answer) : [answer];
  const isDebug = process.env.NODE_ENV !== "production";

  if (isDebug) {
    console.debug("[tts-client] speak request", {
      language,
      chars: answer.length,
      chunks: chunks.length,
      preview: answer.slice(0, 180),
    });
  }

  try {
    const audioParts = await Promise.all(
      chunks.map((chunk, index) => fetchTtsChunk({
        chunk,
        index,
        chunks,
        language,
        ttsSpeed,
        controller,
      })),
    );

    for (const { blob, chunk, index } of audioParts.sort((a, b) => a.index - b.index)) {
      if (controller.signal.aborted) {
        return;
      }

      if (isDebug) {
        console.debug("[tts-client] playing generated audio", {
          language,
          chunk: `${index + 1}/${chunks.length}`,
          chars: chunk.length,
          bytes: blob.size,
          preview: chunk.slice(0, 120),
        });
      }

      await playAudioBlob(blob, { audioRef, controller });
      if (index < chunks.length - 1) {
        await wait(TTS_CHUNK_PAUSE_MS, controller.signal);
      }
    }
    if (abortControllerRef?.current === controller) {
      abortControllerRef.current = null;
    }
    return;
  } catch (error) {
    if (controller.signal.aborted) {
      return;
    }
    if (abortControllerRef?.current === controller) {
      abortControllerRef.current = null;
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
