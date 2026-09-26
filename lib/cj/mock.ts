import {
  CJApiResponse,
  CJCreateOrderRequest,
  CJCreateOrderResult,
  CJOrderDetailResult,
  CJProductItem,
  CJProductListResult,
  CJFreightOption,
} from "./types";
import { DEMO_PRODUCTS } from "@/lib/db/seed-data";

/**
 * High-fidelity Mock CJ Provider for Local Development.
 * Active ONLY when CJ API credentials are unset and NODE_ENV !== 'production'.
 */
export class CJMockProvider {
  async getProducts(pageNum = 1, pageSize = 20): Promise<CJApiResponse<CJProductListResult>> {
    const list: CJProductItem[] = DEMO_PRODUCTS.map((p) => ({
      pid: p.cjProductId,
      productSku: p.cjProductSku,
      productName: p.name,
      productImage: p.images[0]?.publicUrl || "",
      productWeight: p.variants[0]?.weight || 250,
      productType: "Dropshipping",
      categoryName: p.categoryId.replace("cat-", "").replace("-", " "),
      sellPrice: p.variants[0]?.costPrice || 15.0,
      sourceFrom: 1,
      createTime: "2026-01-01 00:00:00",
      variants: p.variants.map((v) => ({
        vid: v.cjVariantId,
        pid: p.cjProductId,
        variantSku: v.sku,
        variantName: `${v.option1Name || "Option"}: ${v.option1Value || "Default"}`,
        variantPrice: v.costPrice,
        variantStandard: v.option1Value || "Standard",
        variantWeight: v.weight,
        variantVolume: 100,
        inventory: v.inventoryQuantity,
      })),
    }));

    return {
      code: 200,
      result: true,
      message: "Success (Development Mock Mode)",
      data: {
        pageNumber: pageNum,
        pageSize,
        total: list.length,
        list: list.slice((pageNum - 1) * pageSize, pageNum * pageSize),
      },
    };
  }

  async getProductDetail(pid: string): Promise<CJApiResponse<CJProductItem>> {
    const found = DEMO_PRODUCTS.find((p) => p.cjProductId === pid);
    if (!found) {
      return {
        code: 404,
        result: false,
        message: "Mock Product Not Found",
        data: null as unknown as CJProductItem,
      };
    }

    return {
      code: 200,
      result: true,
      message: "Success (Development Mock Mode)",
      data: {
        pid: found.cjProductId,
        productSku: found.cjProductSku,
        productName: found.name,
        productImage: found.images[0]?.publicUrl || "",
        productWeight: found.variants[0]?.weight || 250,
        productType: "Dropshipping",
        categoryName: found.categoryId,
        sellPrice: found.variants[0]?.costPrice || 15.0,
        sourceFrom: 1,
        createTime: "2026-01-01 00:00:00",
      },
    };
  }

  async createOrder(request: CJCreateOrderRequest): Promise<CJApiResponse<CJCreateOrderResult>> {
    const mockCjOrderId = `CJ_ORD_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    return {
      code: 200,
      result: true,
      message: "Success (Development Mock Mode: Order Created)",
      data: {
        orderId: mockCjOrderId,
        cjOrderNumber: `CJN-${request.orderNumber}`,
        status: "CREATED_AWAITING_PAYMENT",
      },
    };
  }

  async getOrderDetail(orderId: string): Promise<CJApiResponse<CJOrderDetailResult>> {
    return {
      code: 200,
      result: true,
      message: "Success (Development Mock Mode)",
      data: {
        orderId,
        orderNum: `MY-${orderId.substring(0, 8)}`,
        cjOrderNum: `CJ-${orderId}`,
        orderStatus: "PROCESSING",
        paymentStatus: "PAID",
        trackNumber: `CJTRK${Date.now().toString().substring(5)}`,
        trackUrl: `https://www.17track.net/en/track?nums=CJTRK${Date.now().toString().substring(5)}`,
        logisticName: "CJ Packet Ordinary",
        shippingTime: "2-4 days",
      },
    };
  }

  async calculateFreight(endCountryCode: string): Promise<CJApiResponse<{ logisticList: CJFreightOption[] }>> {
    return {
      code: 200,
      result: true,
      message: "Success (Development Mock Mode)",
      data: {
        logisticList: [
          {
            logisticName: "CJ Packet Fast Line",
            logisticPrice: 6.8,
            logisticAging: "7-12 business days",
          },
          {
            logisticName: "CJ Express Air",
            logisticPrice: 14.5,
            logisticAging: "4-7 business days",
          },
        ],
      },
    };
  }
}

export const cjMockProvider = new CJMockProvider();
