import { NextRequest, NextResponse } from "next/server";
import { cjService, getCJProductDetail } from "@/lib/cj";
import { importCJProductAsDraft } from "@/lib/cj/products";

function extractPid(input: string): string | null {
  const trimmed = input.trim();
  // If numeric string of 10+ digits
  if (/^\d{10,25}$/.test(trimmed)) {
    return trimmed;
  }
  // If CJ URL containing -p-XXXXXX or pid=XXXXXX
  const urlPidMatch = trimmed.match(/-p-(\d+)/) || trimmed.match(/[?&]pid=(\d+)/);
  if (urlPidMatch && urlPidMatch[1]) {
    return urlPidMatch[1];
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword") || searchParams.get("productName") || "";
    const pageNum = parseInt(searchParams.get("pageNum") || searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || searchParams.get("size") || "12", 10);

    const pid = extractPid(keyword);

    if (pid) {
      // Direct lookup by PID or pasted CJ URL
      const detail = await getCJProductDetail(pid);
      if (detail.result && detail.data) {
        return NextResponse.json({
          success: true,
          data: {
            list: [detail.data],
            total: 1,
            pageNum: 1,
            pageSize: 1,
          },
        });
      }
    }

    const result = await cjService.getProducts({
      productName: keyword.trim() || undefined,
      pageNum,
      pageSize,
    });

    return NextResponse.json({
      success: true,
      data: result.data || { list: [], total: 0 },
    });
  } catch (error: any) {
    console.error("[API CJ Products GET] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch CJ catalog",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cjProductId, localCategoryId, markupPercentage, customTitle, customDescription } = body;

    if (!cjProductId) {
      return NextResponse.json(
        { success: false, error: "cjProductId is required" },
        { status: 400 }
      );
    }

    // Default to 'Pet Supplies' or 'Home & Kitchen' if not provided
    const targetCategoryId = localCategoryId || "a1000000-0000-0000-0000-000000000001";

    const result = await importCJProductAsDraft({
      cjProductId,
      localCategoryId: targetCategoryId,
      markupPercentage: markupPercentage ?? 150,
      customTitle,
      customDescription,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      productId: result.productId,
      message: result.message,
    });
  } catch (error: any) {
    console.error("[API CJ Products POST] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to import product",
      },
      { status: 500 }
    );
  }
}
