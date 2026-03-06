import SessionCallEmbed from "@/components/session/SessionCallEmbed";
import BackButton from "@/components/ui/BackButton";

type Props = {
  params: Promise<{ sessionId: string }>;
};

export default async function CallPage({ params }: Props) {
  const { sessionId } = await params;

  return (
    <div className="mx-auto max-w-6xl p-6">
      
      {/* Top bar */}
      <div className="mb-4 flex items-center gap-3">
        <BackButton />
        <h1 className="text-lg font-semibold">Live Session Call</h1>
      </div>

      <SessionCallEmbed sessionId={sessionId} />
    </div>
  );
}