import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getWrapped } from "@/lib/queries";
import { SetupBanner } from "@/components/setup-banner";
import { WrappedCard } from "@/components/wrapped/wrapped-card";

export const dynamic = "force-dynamic";

interface WrappedYearPageProps {
  params: Promise<{ year: string }>;
}

const yearSchema = z.coerce.number().int().min(2000).max(2100);

export async function generateMetadata({ params }: WrappedYearPageProps) {
  const { year } = await params;
  return { title: `Spelscores ${year}` };
}

export default async function WrappedYearPage({ params }: WrappedYearPageProps) {
  const { year: rawYear } = await params;
  const parsed = yearSchema.safeParse(rawYear);
  if (!parsed.success) notFound();

  let wrapped: Awaited<ReturnType<typeof getWrapped>>;
  try {
    wrapped = await getWrapped(parsed.data);
  } catch {
    return <SetupBanner />;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/wrapped"
        className="inline-flex items-center gap-1 font-bold text-sm"
        style={{ color: "var(--muted-foreground)" }}
      >
        ← Alle jaren
      </Link>
      <WrappedCard wrapped={wrapped} />
    </div>
  );
}
