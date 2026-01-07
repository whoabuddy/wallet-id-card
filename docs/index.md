---
title: Home
layout: home
nav_order: 1
---

# Wallet Identity Card API

> Generate AI-powered visual identity cards for Stacks wallets.

This Cloudflare Worker API combines BNS names, STX balances, token holdings, and NFT collections into unique, cyberpunk-styled collectible cards using AI image generation.

---

## Quick Start

### Get Wallet Data

{: .free }
Free endpoint - no payment required.

```bash
curl https://wallet-id-card.YOUR-WORKER.workers.dev/data/SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7
```

### Preview Image Prompt

{: .free }
Free endpoint - no payment required.

```bash
curl https://wallet-id-card.YOUR-WORKER.workers.dev/prompt/SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7
```

### Generate Identity Card

{: .paid }
Requires x402 micropayment (0.001 STX).

```bash
curl https://wallet-id-card.YOUR-WORKER.workers.dev/card/SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7
```

---

## Features

| Feature | Description |
|:--------|:------------|
| **BNS Integration** | Displays your .btc name if available |
| **Balance Display** | Shows STX and top 5 token holdings |
| **NFT Showcase** | Includes NFT count and top 3 collections |
| **AI-Generated Art** | Unique cyberpunk card design per wallet |
| **x402 Payments** | Pay-per-use with Stacks micropayments |

---

## How It Works

1. **Fetch Data** - Queries [Hiro API](https://docs.hiro.so/) for wallet information
2. **Build Prompt** - Transforms wallet data into an AI image prompt
3. **Generate Image** - Sends prompt to [stx402](https://stx402.com) AI endpoint
4. **Return Card** - Returns PNG image with wallet metadata headers

---

## Contents

| Item | Description |
|:-----|:------------|
| [`src/`](./src.html) | API source code and endpoint handlers |
| [API Reference](./api.html) | Full endpoint documentation |

---

*Updated: 2026-01-07*
