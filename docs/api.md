---
title: API Reference
layout: default
nav_order: 3
---

[← Home](./index.html) | **API Reference**

# API Reference

> Complete endpoint documentation for the Wallet Identity Card API.

---

## Base URL

```
https://wallet-id-card.YOUR-WORKER.workers.dev
```

---

## Endpoints

### Health Check

```
GET /
```

{: .free }
Returns service information and available endpoints.

**Response**

```json
{
  "service": "Wallet Identity Card",
  "version": "1.0.0",
  "description": "Generate visual identity cards for Stacks wallets",
  "endpoints": {
    "GET /card/:address": "Generate identity card image (requires x402 payment)",
    "GET /data/:address": "Get raw wallet data as JSON (free)",
    "GET /prompt/:address": "Preview the image generation prompt (free)"
  },
  "pricing": {
    "/card/:address": "0.001 STX (covers AI image generation)"
  },
  "poweredBy": ["stx402.com", "api.hiro.so"]
}
```

---

### Get Wallet Data

```
GET /data/:address
```

{: .free }
Returns raw wallet data as JSON.

**Parameters**

| Name | Type | Description |
|:-----|:-----|:------------|
| `address` | string | Stacks address (SP... or SM...) |

**Response**

```json
{
  "address": "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7",
  "bnsName": "whoabuddy.btc",
  "stxBalance": "1234.56",
  "ftBalances": [
    { "symbol": "WELSH", "balance": "100.00", "name": "WELSH" }
  ],
  "nftCount": 42,
  "topNfts": [
    { "name": "megapont-robot-nft", "collection": "megapont-robot-nft" }
  ]
}
```

**Errors**

| Status | Description |
|:-------|:------------|
| 400 | Invalid Stacks address format |

---

### Preview Image Prompt

```
GET /prompt/:address
```

{: .free }
Shows the AI prompt that will be used to generate the card.

**Parameters**

| Name | Type | Description |
|:-----|:-----|:------------|
| `address` | string | Stacks address (SP... or SM...) |

**Response**

```json
{
  "walletData": { ... },
  "prompt": "Create a sleek digital identity card...",
  "note": "This prompt will be sent to AI image generation when you call /card/:address"
}
```

---

### Generate Identity Card

```
GET /card/:address
```

{: .paid }
Creates an AI-generated visual identity card. Requires x402 payment.

**Parameters**

| Name | Type | Description |
|:-----|:-----|:------------|
| `address` | string | Stacks address (SP... or SM...) |

**Success Response**

| Field | Value |
|:------|:------|
| Status | 200 |
| Content-Type | `image/png` |
| X-Wallet-Address | The wallet address |
| X-BNS-Name | The BNS name (or "none") |
| Cache-Control | `public, max-age=3600` |

**Payment Required Response (402)**

```json
{
  "payment": { ... },
  "note": "Pay to generate your wallet identity card",
  "walletData": { ... },
  "prompt": "..."
}
```

{: .important }
When you receive a 402 response, use the x402 protocol to make a micropayment and retry the request with the payment header.

---

### OpenAPI Specification

```
GET /openapi.json
```

{: .free }
Returns the OpenAPI 3.0 specification for this API.

---

## Address Format

Valid Stacks addresses match the pattern:

```
^S[PM][A-Z0-9]{38,40}$
```

**Examples:**
- Mainnet: `SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7`
- Testnet: `ST2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7`

---

## Error Handling

All errors return JSON with an `error` field:

```json
{
  "error": "Invalid Stacks address format"
}
```

---

*Updated: 2026-01-07*
