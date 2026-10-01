import { NextRequest } from "next/server";
import { handleAdminFulfillPost, handleAdminFulfillGet } from "@/lib/admin/cj-fulfillment";

interface RouteParams {
  params: Promise<{ orderId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return handleAdminFulfillPost(req, { params });
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  return handleAdminFulfillGet(req, { params });
}
