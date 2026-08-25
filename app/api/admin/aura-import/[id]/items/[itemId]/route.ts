import { NextResponse } from "next/server";
import { z } from "zod";
import { isOwnerAdmin, requireAdmin } from "../../../../../../../src/lib/admin";
import { decideAuraImportItem } from "../../../../../../../src/lib/aura/jobService";

const schema = z.object({ decision: z.enum(["approve", "ignore"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!isOwnerAdmin(session)) return NextResponse.json({ error: "Somente o administrador principal revisa conflitos." }, { status: 403 });
  const body = schema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: "Decisão inválida." }, { status: 400 });
  const { id, itemId } = await params;
  const user = session.user as { id?: string };
  try {
    return NextResponse.json(await decideAuraImportItem({ jobId: id, itemId, decision: body.data.decision, actorId: user.id }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível revisar o item." }, { status: 400 });
  }
}
