---
title: src
layout: default
nav_order: 2
---

[← Home](./index.html) | **src**

# src

> Cloudflare Worker API source code using Hono framework.

## Contents

| Item | Description |
|:-----|:------------|
| [`index.ts`](https://github.com/whoabuddy/wallet-id-card/blob/master/src/index.ts) | Main API entry point with all endpoint handlers |

## Architecture

The API is built as a single-file Cloudflare Worker using:

- **[Hono](https://hono.dev/)** - Lightweight web framework for edge
- **[Hiro API](https://docs.hiro.so/)** - Stacks blockchain data (BNS, balances, NFTs)
- **[stx402](https://stx402.com)** - AI image generation with micropayments

## Key Functions

| Function | Purpose |
|:---------|:--------|
| `getBnsName()` | Fetches BNS name for a Stacks address |
| `getStxBalance()` | Retrieves STX balance in human-readable format |
| `getFtBalances()` | Gets top 5 fungible token holdings |
| `getNftHoldings()` | Counts NFTs and lists top 3 collections |
| `buildImagePrompt()` | Constructs AI prompt from wallet data |
| `generateImage()` | Calls stx402 AI endpoint for image generation |

## Endpoints

| Route | Method | Description |
|:------|:-------|:------------|
| `/` | GET | Health check and API info |
| `/data/:address` | GET | Raw wallet data (free) |
| `/prompt/:address` | GET | Preview AI prompt (free) |
| `/card/:address` | GET | Generate identity card (paid) |
| `/openapi.json` | GET | OpenAPI 3.0 specification |

## Environment Variables

| Variable | Description |
|:---------|:------------|
| `STX402_BASE` | Base URL for stx402 API (set in wrangler.toml) |

## Relationships

- **Depends on**: Hiro API for blockchain data
- **Integrates with**: stx402 for paid AI image generation

---

*Updated: 2026-01-07*
