---
title: Home
layout: home
nav_order: 1
---

# Wallet Identity Card API

Generate AI-powered visual identity cards for Stacks wallets.

This API combines BNS names, STX balances, token holdings, and NFT collections into a unique, cyberpunk-styled collectible card.

---

## Quick Start

### Get Wallet Data (Free)

```bash
curl https://wallet-id-card.YOUR-WORKER.workers.dev/data/SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7
```

### Preview Image Prompt (Free)

```bash
curl https://wallet-id-card.YOUR-WORKER.workers.dev/prompt/SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7
```

### Generate Identity Card (Paid)

```bash
curl https://wallet-id-card.YOUR-WORKER.workers.dev/card/SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7
```

{: .note }
The `/card` endpoint requires an x402 micropayment (0.001 STX) for AI image generation.

---

## Features

- **BNS Integration**: Displays your .btc name if available
- **Balance Display**: Shows STX and top token holdings
- **NFT Showcase**: Includes NFT count and top collections
- **AI-Generated Art**: Unique cyberpunk card design for each wallet
- **x402 Payments**: Pay-per-use with Stacks micropayments

---

## How It Works

1. **Fetch Data**: The API queries Hiro's APIs for wallet information
2. **Build Prompt**: Wallet data is transformed into an AI image prompt
3. **Generate Image**: The prompt is sent to stx402's AI endpoint
4. **Return Card**: A PNG image is returned with wallet metadata headers

---

## Powered By

- [Hiro API](https://docs.hiro.so/) - Blockchain data
- [stx402](https://stx402.com) - AI image generation with micropayments
