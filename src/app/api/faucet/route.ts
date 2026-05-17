import { NextRequest, NextResponse } from "next/server";

// Native USDC faucet — users should use https://faucet.circle.com
export async function POST(req: NextRequest) {
  const { address } = await req.json();

  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  return NextResponse.json({
    message: "Arc testnet uses native USDC. Get test USDC from the Circle faucet.",
    faucetUrl: "https://faucet.circle.com",
    instructions: "Select 'Arc Testnet' and paste your wallet address.",
  });
}
