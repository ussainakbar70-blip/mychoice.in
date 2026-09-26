/**
 * CJdropshipping Open API v2.0 TypeScript Definitions
 * Official Base URL: https://developers.cjdropshipping.com/api2.0
 */

export interface CJApiResponse<T = unknown> {
  code: number;
  result: boolean;
  message: string;
  data: T;
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
  variantStandard: string;
  variantWeight: number;
  variantVolume: number;
  variantImage?: string;
  variantKey?: string;
  inventory?: number;
}

export interface CJProductItem {
  pid: string;
  productSku: string;
  productName: string;
  productImage: string;
  productWeight: number;
  productType: string;
  categoryName: string;
  sellPrice: string | number;
  sourceFrom: number;
  createTime: string;
  variants?: CJProductVariant[];
}

export interface CJProductListResult {
  pageNumber: number;
  pageSize: number;
  total: number;
  list: CJProductItem[];
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
  payType: 2 | 3; // 2: Direct balance payment, 3: Order only, pay balance later
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
}

export interface CJFreightOption {
  logisticName: string;
  logisticPrice: number;
  logisticAging: string;
}

export interface CJFreightResult {
  logisticList: CJFreightOption[];
}

export interface CJWebhookPayload {
  openId?: string;
  messageType: string;
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
