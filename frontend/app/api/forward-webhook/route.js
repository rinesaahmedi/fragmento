import http from "http";
import https from "https";
import { NextResponse } from "next/server";

export async function POST(request) {
  if (process.env.N8N_WEBHOOK_ENABLED !== "true") {
    return NextResponse.json({ success: true, skipped: true });
  }

  const n8nUrl = new URL(
    process.env.N8N_WEBHOOK_URL || "http://localhost:5678/webhook/kitchen-order-callback",
  );
  const body = await request.text();
  const lib = n8nUrl.protocol === "https:" ? https : http;

  const result = await new Promise((resolve) => {
    const req = lib.request(
      {
        hostname: n8nUrl.hostname,
        port: n8nUrl.port || (n8nUrl.protocol === "https:" ? 443 : 80),
        path: n8nUrl.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "ngrok-skip-browser-warning": "true",
          "User-Agent": "n8n-webhook-forwarder/1.0",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode || 200,
            body: data,
          });
        });
      },
    );

    req.on("error", (error) => {
      console.error("request error:", error.message);
      resolve({
        statusCode: 500,
        body: error.message,
      });
    });

    req.write(body);
    req.end();
  });

  return new NextResponse(result.body, {
    status: result.statusCode,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
