import SessionCallEmbed from "@/components/session/SessionCallEmbed";
import BackButton from "@/components/ui/BackButton";

type Props = {
  params: Promise<{ sessionId: string }>;
};

export default async function CallPage({ params }: Props) {
  const { sessionId } = await params;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <div className="mx-auto max-w-6xl px-6 py-8">

        {/* Top bar */}
        <div className="mb-6 flex items-center gap-3">
          <BackButton />

          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>

            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              Live Session Call
            </h1>

            <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
              Live
            </span>
          </div>
        </div>

        {/* Embed — owns its own card and border */}
        <SessionCallEmbed sessionId={sessionId} />

        {/* Footer hint */}
        <p className="mt-4 text-center text-xs text-muted-foreground/50">
          End the call to return to your session dashboard
        </p>

      </div>
    </div>
  );
}