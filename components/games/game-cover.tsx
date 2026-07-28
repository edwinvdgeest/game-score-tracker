"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { isAllowedImageHost } from "@/lib/game-images";
import type { Game, ParentGameRef } from "@/lib/schemas";

type GameCoverSize = "sm" | "md" | "lg";

const SIZES: Record<GameCoverSize, { px: number; emoji: string; radius: string }> = {
  sm: { px: 40, emoji: "text-2xl", radius: "rounded-xl" },
  md: { px: 56, emoji: "text-2xl", radius: "rounded-xl" },
  lg: { px: 96, emoji: "text-5xl", radius: "rounded-2xl" },
};

type CoverGame = Pick<Game, "name" | "emoji"> &
  Partial<Pick<Game, "image_url" | "thumbnail_url">> & {
    parent?: ParentGameRef | null;
  };

interface GameCoverProps {
  game: CoverGame;
  size?: GameCoverSize;
  className?: string;
  priority?: boolean;
}

/**
 * Doosfoto met emoji als terugval.
 *
 * Een variant zonder eigen afbeelding gebruikt die van zijn hoofdspel: zo krijgen
 * alle Keer op Keer- en Qwixx-varianten in één klap een plaatje.
 *
 * De terugval is bewust exact de emoji-weergave van vóór deze wijziging, zodat een
 * nog niet verrijkt spel er onveranderd uitziet in plaats van kapot.
 */
export function GameCover({ game, size = "sm", className, priority }: GameCoverProps) {
  const [failed, setFailed] = useState(false);
  const { px, emoji, radius } = SIZES[size];

  // Groot: liever de volle afbeelding. Klein: de thumbnail is genoeg en scheelt data.
  const own = size === "lg"
    ? game.image_url ?? game.thumbnail_url
    : game.thumbnail_url ?? game.image_url;
  const inherited = size === "lg"
    ? game.parent?.image_url ?? game.parent?.thumbnail_url
    : game.parent?.thumbnail_url ?? game.parent?.image_url;

  const src = own ?? inherited ?? null;
  const usable = !failed && isAllowedImageHost(src);

  if (usable && src) {
    return (
      <Image
        src={src}
        // Decoratief: de spelnaam staat op elk oppervlak direct ernaast, dus een
        // alt-tekst zou schermlezers de naam twee keer laten voorlezen.
        alt=""
        width={px}
        height={px}
        priority={priority}
        onError={() => setFailed(true)}
        className={cn(radius, "object-cover flex-shrink-0", className)}
        style={{ width: px, height: px }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        radius,
        "flex items-center justify-center flex-shrink-0 leading-none",
        emoji,
        className
      )}
      style={{
        width: px,
        height: px,
        backgroundColor: "var(--color-warm-gray)",
      }}
    >
      {game.emoji}
    </span>
  );
}
