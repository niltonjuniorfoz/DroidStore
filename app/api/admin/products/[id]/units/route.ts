import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "../../../../../../src/lib/prisma";
import { requireAdmin } from "../../../../../../src/lib/admin";

const deviceUnitSchema = z.object({
  variantId: z.string().min(1),
  imei1: z.string().trim().max(30).optional(),
  imei2: z.string().trim().max(30).optional(),
  serialNumber: z.string().trim().max(40).optional(),
  batteryHealth: z.coerce.number().int().min(1).max(100).optional(),
  repairedParts: z.string().trim().max(250).optional(),
  warehouseLocation: z.string().trim().max(100).optional(),
  costPrice: z.coerce.number().min(0).max(100000).optional(),
  notes: z.string().trim().max(500).optional(),
  status: z.enum(["IN_STOCK", "RESERVED", "SOLD", "IN_MAINTENANCE", "RETURNED"]).default("IN_STOCK"),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const units = await prisma.deviceUnit.findMany({
    where: { variant: { productId: id } },
    include: { variant: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(units);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const parsed = deviceUnitSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos para o IMEI/Unidade." }, { status: 400 });
  const data = parsed.data;

  // Verificar se o IMEI 1 ou Serial já existem no banco
  if (data.imei1) {
    const existingImei = await prisma.deviceUnit.findUnique({ where: { imei1: data.imei1 } });
    if (existingImei) return NextResponse.json({ error: `O IMEI 1 "${data.imei1}" já está cadastrado em outra unidade.` }, { status: 400 });
  }
  if (data.serialNumber) {
    const existingSerial = await prisma.deviceUnit.findUnique({ where: { serialNumber: data.serialNumber } });
    if (existingSerial) return NextResponse.json({ error: `O Número de Série "${data.serialNumber}" já está cadastrado.` }, { status: 400 });
  }

  const unit = await prisma.$transaction(async (tx) => {
    const created = await tx.deviceUnit.create({
      data: {
        variantId: data.variantId,
        imei1: data.imei1 || null,
        imei2: data.imei2 || null,
        serialNumber: data.serialNumber || null,
        batteryHealth: data.batteryHealth ?? null,
        repairedParts: data.repairedParts || null,
        warehouseLocation: data.warehouseLocation || null,
        costPrice: data.costPrice ?? 0,
        notes: data.notes || null,
        status: data.status,
      },
      include: { variant: true },
    });

    if (data.status === "IN_STOCK") {
      await tx.variant.update({
        where: { id: data.variantId },
        data: { stock: { increment: 1 } },
      });
    }

    return created;
  });

  return NextResponse.json(unit, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const unitId = searchParams.get("unitId");
  if (!unitId) return NextResponse.json({ error: "ID da unidade não informado" }, { status: 400 });

  const unit = await prisma.deviceUnit.findUnique({ where: { id: unitId } });
  if (!unit) return NextResponse.json({ error: "Unidade não encontrada" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.deviceUnit.delete({ where: { id: unitId } });
    if (unit.status === "IN_STOCK") {
      await tx.variant.update({
        where: { id: unit.variantId },
        data: { stock: { decrement: 1 } },
      });
    }
  });

  return new NextResponse(null, { status: 204 });
}
