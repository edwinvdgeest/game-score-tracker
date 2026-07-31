import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Version skew protection. Next.js hangt hiermee ?dpl=<id> aan de statische assets en
  // zet een x-nextjs-deployment-id op navigatieresponses; ziet de client een andere id
  // dan waarmee hij geladen is, dan doet hij een volledige herlaad in plaats van een
  // client-side navigatie. Precies wat je wil voor een webapp die dagen open blijft
  // staan: na een deploy stapt hij vanzelf over op de nieuwe build.
  // VERCEL_DEPLOYMENT_ID is een system env var van Vercel. Lokaal is die leeg en dan is
  // deze optie een no-op.
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  images: {
    // Alleen de hosts die door de image-optimizer mogen. Staat een host hier niet in,
    // dan geeft /_next/image een 400 — daarom rendert GameCover een zelf geplakte URL
    // van een onbekende host met `unoptimized`, buiten de optimizer om.
    // Deze lijst MOET gelijk blijven aan OPTIMIZED_IMAGE_HOSTS in lib/game-images.ts.
    remotePatterns: [
      { protocol: "https", hostname: "cf.geekdo-images.com", pathname: "/**" },
      { protocol: "https", hostname: "images.boardgamegeek.com", pathname: "/**" },
    ],
  },
  async headers() {
    return [
      {
        // De service worker mag zelf nooit uit de HTTP-cache komen. Doet hij dat wel,
        // dan ziet de browser een wijziging in sw.js pas uren later en blijft de oude
        // cachestrategie draaien. Samen met updateViaCache: "none" bij de registratie
        // (lib/hooks/useOfflineQueue.ts) is dit wat een update daadwerkelijk laat landen.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
