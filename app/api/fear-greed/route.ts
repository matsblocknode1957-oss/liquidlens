import { NextResponse } from "next/server";

export async function GET() {
  const res = await fetch("https://pegcheck.uk/api/fear-greed", {
    next: { revalidate: 300 },
  });
  const data = await res.json();
  return NextResponse.json(data);
}
