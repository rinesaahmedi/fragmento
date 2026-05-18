import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TTS_TEXT_LENGTH = 1800;
const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

async function synthesizeWithElevenLabs(text) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
  const modelId = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
  const outputFormat = process.env.ELEVENLABS_OUTPUT_FORMAT || "mp3_44100_128";

  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is missing.");
  }

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
          stability: Number(process.env.ELEVENLABS_STABILITY || 0.45),
          similarity_boost: Number(process.env.ELEVENLABS_SIMILARITY_BOOST || 0.75),
          style: Number(process.env.ELEVENLABS_STYLE || 0),
          speed: Number(process.env.ELEVENLABS_SPEED || 0.86),
          use_speaker_boost: process.env.ELEVENLABS_SPEAKER_BOOST !== "false",
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
  if (!text) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }

  try {
    const { audio, contentType } = await synthesizeWithElevenLabs(text);
    return new Response(audio, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Speech could not be generated.",
        detail: error?.message || String(error),
      },
      { status: 503 },
    );
  }
}
