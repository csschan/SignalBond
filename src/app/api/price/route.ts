import { NextResponse } from "next/server";
import { getAllPrices } from "@/services/price";

export async function GET() {
  try {
    const prices = await getAllPrices();
    return NextResponse.json(prices);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
