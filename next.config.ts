import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Doosfoto's komen van BoardGameGeek. Staat een host hier niet in, dan geeft
    // de image-optimizer een 400 op /_next/image in plaats van netjes te falen.
    // Deze lijst MOET gelijk blijven aan ALLOWED_IMAGE_HOSTS in lib/game-metadata.ts.
    remotePatterns: [
      { protocol: "https", hostname: "cf.geekdo-images.com", pathname: "/**" },
      { protocol: "https", hostname: "images.boardgamegeek.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
