import { handle } from "@/lib/api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (request: Request) => handle(request);
export const POST = (request: Request) => handle(request);
