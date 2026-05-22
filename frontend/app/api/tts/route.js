import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TTS_TEXT_LENGTH = 1800;
const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

function readEnvValue(name, fallback = "") {
  return String(process.env[name] || fallback).trim().replace(/^["']|["']$/g, "");
}

function readNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function synthesizeWithElevenLabs(text, metadata = {}) {
  const apiKey = readEnvValue("ELEVENLABS_API_KEY");
  const voiceId = readEnvValue("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb");
  const modelId = readEnvValue("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2");
  const outputFormat = readEnvValue("ELEVENLABS_OUTPUT_FORMAT", "mp3_44100_128");
  const requestedSpeed = readNumber(metadata.speed, NaN);
  const defaultSpeed = readNumber(readEnvValue("ELEVENLABS_SPEED", 0.86), 0.86);
  const speed = Number.isFinite(requestedSpeed)
    ? Math.min(1.2, Math.max(0.7, requestedSpeed))
    : defaultSpeed;

  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is missing.");
  }

  const startedAt = Date.now();
  console.info("[tts] ElevenLabs request", {
    chars: text.length,
    language: metadata.language || "unknown",
    chunk: metadata.chunkIndex && metadata.chunkCount ? `${metadata.chunkIndex}/${metadata.chunkCount}` : "1/1",
    voiceIdSuffix: voiceId.slice(-6),
    modelId,
    speed,
    preview: text.slice(0, 140),
  });

  const response = await fetch(
    `${ELEVENLABS_BASE_URL}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${encodeURIComponent(outputFormat)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: Number(readEnvValue("ELEVENLABS_STABILITY", 0.45)),
          similarity_boost: Number(readEnvValue("ELEVENLABS_SIMILARITY_BOOST", 0.75)),
          style: Number(readEnvValue("ELEVENLABS_STYLE", 0)),
          speed,
          use_speaker_boost: readEnvValue("ELEVENLABS_SPEAKER_BOOST", "true") !== "false",
        },
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`ElevenLabs failed with ${response.status}${detail ? `: ${detail}` : ""}`);
  }

  return {
    audio: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") || "audio/mpeg",
    durationMs: Date.now() - startedAt,
  };
}

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = String(payload?.text || "").trim().slice(0, MAX_TTS_TEXT_LENGTH);
  const metadata = {
    language: String(payload?.language || ""),
    chunkIndex: Number(payload?.chunkIndex || 1),
    chunkCount: Number(payload?.chunkCount || 1),
    speed: payload?.speed,
  };
  if (!text) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }

  try {
    const { audio, contentType, durationMs } = await synthesizeWithElevenLabs(text, metadata);
    console.info("[tts] ElevenLabs response", {
      chars: text.length,
      chunk: metadata.chunkIndex && metadata.chunkCount ? `${metadata.chunkIndex}/${metadata.chunkCount}` : "1/1",
      bytes: audio.length,
      durationMs,
      contentType,
    });
    return new Response(audio, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[tts] ElevenLabs speech generation failed:", error);
    return NextResponse.json(
      {
        error: "Speech could not be generated.",
        detail: error?.message || String(error),
      },
      { status: 503 },
    );
  }
}
