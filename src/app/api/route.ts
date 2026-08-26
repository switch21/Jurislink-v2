import { NextResponse } from "next/server";
import { authenticate, isErrorResponse } from '@/lib/auth-server'

export async function GET(request: Request) {
  const auth = await authenticate(request, 'route.ts', 'read')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json({ message: "Hello, world!" });
}