import { NextResponse } from "next/server";
import { lookupIsbn } from "@/lib/isbn";

export async function GET(
  _request: Request,
  context: { params: Promise<{ isbn: string }> }
) {
  const { isbn } = await context.params;
  if (!isbn) {
    return NextResponse.json({ error: "Brak ISBN" }, { status: 400 });
  }

  const result = await lookupIsbn(isbn);
  if (!result) {
    return NextResponse.json(
      { error: "Nie znaleziono książki o podanym ISBN" },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
