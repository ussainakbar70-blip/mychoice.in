/**
 * CJdropshipping Open API v2.0 TypeScript Definitions
 * Official Base URL: https://developers.cjdropshipping.com/api2.0
 */

export interface CJApiResponse<T = unknown> {
  code: number;
  result: boolean;
  message: string;
  data: T;
  requestId?: string;
}

export interface CJAccessTokenData {
  accessToken: string;
  accessTokenExpiryDate: string;
  refreshToken: string;
  refreshTokenExpiryDate: string;
  openId?: string;
}

export interface CJProductVariant {
  vid: string;
  pid: string;
  variantSku: string;
  variantName: string;
  variantPrice: number;
  variantStandard?: string;
  variantWeight: number;
  variantVolume?: number;
  variantImage?: string;
  variantKey?: string;
  inventory?: number;
  warehouse?: string;
}

export interface CJProductItem {
  pid: string;
  productSku: string;
  productName: string;
  productNameEn?: string;
  productImage: string;
  productWeight: number;
  productType?: string;
  categoryName?: string;
  categoryId?: string;
  sellPrice: string | number;
  sourceFrom?: number;
  createTime?: string;
  description?: string;
  variants?: CJProductVariant[];
  warehouseList?: Array<{ warehouseName: string; stock: number }>;
}

export interface CJProductListV2Params {
  page?: number;
  size?: number;
  keyword?: string;
  categoryId?: string;
  startPrice?: number;
  endPrice?: number;
  countryCode?: string;
  sort?: string;
  features?: string[];
}

export interface CJProductListResult {
  pageNumber: number;
  pageSize: number;
  total: number;
  list: CJProductItem[];
}

export interface CJStockQueryItem {
  vid: string;
  sku?: string;
  inventory: number;
  warehouse?: string;
  areaId?: string;
}

export interface CJFreightOption {
  logisticName: string;
  logisticPrice: number;
  logisticAging: string;
  estimatedDays?: string;
}

export interface CJFreightResult {
  logisticList: CJFreightOption[];
}

export interface CJCreateOrderProduct {
  vid: string;
  quantity: number;
  shippingName?: string;
}

export interface CJCreateOrderRequest {
  orderNumber: string;
  shippingCountryCode: string;
  shippingCountry: string;
  shippingProvince: string;
  shippingCity: string;
  shippingAddress: string;
  shippingAddress2?: string;
  shippingCustomerName: string;
  shippingZip: string;
  shippingPhone: string;
  remark?: string;
  fromCountryCode?: string;
  logisticName?: string;
  houseNumber?: string;
  email?: string;
  payType: 2 | 3; // 2: Direct balance payment, 3: Create order only (pay balance later)
  products: CJCreateOrderProduct[];
}

export interface CJCreateOrderResult {
  orderId: string;
  cjOrderNumber: string;
  status: string;
}

export interface CJOrderDetailResult {
  orderId: string;
  orderNum: string;
  cjOrderNum: string;
  orderStatus: string;
  paymentStatus: string;
  trackNumber?: string;
  trackUrl?: string;
  logisticName?: string;
  shippingTime?: string;
  shippedTime?: string;
  deliveryTime?: string;
  rawStatus?: string;
}

export interface CJConfirmOrderRequest {
  orderId: string;
}

export interface CJConfirmOrderResult {
  orderId: string;
  status: string;
}

export interface CJTrackingCheckpoint {
  time: string;
  status: string;
  location?: string;
  description: string;
}

export interface CJTrackingResult {
  trackingNumber: string;
  carrier: string;
  status: "pending" | "shipped" | "in_transit" | "delivered" | "cancelled";
  rawStatus: string;
  checkpoints: CJTrackingCheckpoint[];
}

export interface CJWebhookPayload {
  openId?: string;
  messageType: "PRODUCT" | "STOCK" | "ORDER" | "LOGISTICS" | string;
  messageId: string;
  sendTime: number;
  data: {
    orderId?: string;
    orderNumber?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    orderStatus?: string;
    shippingStatus?: string;
    productId?: string;
    variantId?: string;
    inventory?: number;
    [key: string]: unknown;
  };
}

export interface CJWebhookSubscription {
  id: string;
  cjProductId: string;
  localProductId?: string;
  topic: "PRODUCT" | "STOCK" | "ORDER" | "LOGISTICS";
  status: "active" | "paused" | "failed" | "unsubscribed";
  subscribedAt: string;
  lastEventAt?: string;
}
