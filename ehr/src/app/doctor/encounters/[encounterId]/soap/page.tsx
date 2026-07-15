import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SOAPNoteEditor from "@/components/clinical/SOAPNoteEditor";
import { Card } from "@/design-system";

export default async function SOAPNotePage({ params }: { params: { encounterId: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user) redirect("/login");
  const role = (session.user as any).role;
  if (role !== "DOCTOR" && role !== "ADMIN") redirect("/unauthorized");
  const { encounterId } = params;
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold text-neutral-900">Clinical Note</h1>
      <p className="text-sm text-neutral-500">Encounter: <code className="font-mono">{encounterId}</code></p>
      <Card variant="outlined" className="p-6">
        <SOAPNoteEditor
          encounterId={encounterId}
          practitionerName={(session.user as any).name ?? "Unknown Physician"}
        />
      </Card>
    </div>
  );
}