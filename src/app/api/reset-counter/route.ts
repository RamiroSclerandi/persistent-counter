import { NextRequest, NextResponse } from "next/server";
import { updateCounterToZero } from "../../actions/counter";

export async function POST(req: NextRequest) {
  // Get the secret from the request headers and validate it
  const secret = req.headers.get("x-secret");

  if (secret !== process.env.RESET_SECRET) {
    console.error("Unauthorized reset attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Call the function that resets the counter
    await updateCounterToZero();
    console.log("Counter reset successfully!");
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error resetting counter:", error);
    return NextResponse.json({ error: error }, { status: 500 });
  }
}