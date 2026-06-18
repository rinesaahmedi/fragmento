import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

export default function nextConfig(phase) {
  return {
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
    devIndicators: false,
    experimental: {
      serverActions: {
        bodySizeLimit: "25mb",
      },
      middlewareClientMaxBodySize: "25mb",
    },
  };
}
