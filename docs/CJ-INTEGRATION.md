# CJdropshipping Open API v2.0 Integration Manual

**Platform**: MYCHOICE.in  
**Supplier Protocol**: CJdropshipping Open API v2.0  
**Official Base URL**: `https://developers.cjdropshipping.com/api2.0`  
**Dedicated Service Layer**: `lib/cj/`

---

## 1. Onboarding & Obtaining Credentials

1. Create or log in to your account at [cjdropshipping.com](https://cjdropshipping.com).
2. Go to **My CJ > Authorization > API > API Key**.
3. Generate or copy your private **API Key**.
4. Configure in `.env.local` (or production environment settings):
   ```env
   CJ_API_BASE_URL=https://developers.cjdropshipping.com/api2.0
   CJ_API_KEY=your_private_api_key_here
   CJ_WEBHOOK_SECRET=your_webhook_secret_here
   ```

---

## 2. API Endpoints Utilized

| Service | Method | Path | Function |
| :--- | :--- | :--- | :--- |
| **Authentication** | `POST` | `/v1/authentication/getAccessToken` | Generates token valid for 24h via `apiKey` |
| **Product Search** | `GET` | `/v1/product/list` | Keyword, category, and country-filtered search |
| **Product Details** | `GET` | `/v1/product/query` | Product specs, images, variant IDs (`vid`), pricing |
| **Order Creation** | `POST` | `/v1/shopping/order/createOrderV2` | Creates order with `payType=3` (Pay later) or `payType=2` |
| **Order Details** | `GET` | `/v1/shopping/order/getOrderDetail` | Order status and tracking assignment |
| **Freight Estimation**| `POST` | `/v1/logistic/freightCalculate` | Live courier trial calculation and shipping pricing |
| **Tracking Telemetry**| `GET` | `/v1/logistic/orderTrack` | Live tracking events by tracking number |

---

## 3. Order Pipeline Lifecycle & Failure Recovery

```
Customer Order Placed
  │
  ▼
Order Persisted (status: confirmed, fulfillment: pending_sync)
  │
  ▼
POST /v1/shopping/order/createOrderV2
  │
  ├───► SUCCESS ──► Save CJ Order ID ──► fulfillment: awaiting_cj_payment
  │
  └───► TRANSIENT FAILURE (Network/429/50x)
         │
         ▼
        Do NOT lose customer order!
        Order remains safely stored with fulfillment: pending_sync.
        Admin notified on /admin/integrations/cj for retry.
```

---

## 4. Webhook Authentication & Idempotency

CJ sends event notifications (`ORDER_STATUS_UPDATE`, `SHIPPING_TRACKING_UPDATE`, `INVENTORY_CHANGE`) to `/api/webhooks/cj`.

- **Signature Check**: Uses HMAC-SHA256 of the raw payload matched against the `sign` header.
- **Idempotency Guard**: Every incoming `messageId` is stored in the deduplication ledger. Duplicate webhook delivery is safely ignored.
