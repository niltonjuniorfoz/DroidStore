import { NextResponse } from "next/server";
import { expireStaleOrders } from "../../../../src/lib/expireOrders";

// Chamado pelo cron da Vercel (vercel.json). A Vercel envia
// "Authorization: Bearer <CRON_SECRET>" automaticamente quando a env existe.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const expired = await expireStaleOrders();
  return NextResponse.json({ expired });
}
