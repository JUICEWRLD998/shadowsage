import { getQvacStatus } from "@/lib/qvac";

export function GET() {
  return Response.json(getQvacStatus());
}
