import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getCoversDir, getLegacyCoversDir } from "@/lib/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

type Params = { params: Promise<{ filename: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { filename } = await params;
  const safe = path.basename(filename);
  if (!safe || safe !== filename || safe.includes("..")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const candidates = [
    path.join(getCoversDir(), safe),
    path.join(getLegacyCoversDir(), safe),
  ];

  const filePath = candidates.find((p) => fs.existsSync(p));
  if (!filePath) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = safe.split(".").pop()?.toLowerCase() || "jpg";
  const body = fs.readFileSync(filePath);
  return new NextResponse(body, {
    headers: {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
