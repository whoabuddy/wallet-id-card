import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  PAYMENT_ADDRESS: string
  OPENAI_API_KEY?: string
}

const app = new Hono<{ Bindings: Bindings }>()
const HIRO_API = 'https://api.hiro.so'

// Payment configuration
const PAYMENT_CONTRACT = {
  address: 'SPP5ZMH9NQDFD2K5CEQZ6P02AP8YPWMQ75TJW20M',
  name: 'simple-oracle',
}
const CARD_PRICE = 1 // 1 microSTX for testing

// Verify payment via Hiro API
async function verifyPayment(txid: string): Promise<{ valid: boolean; sender?: string; error?: string }> {
  try {
    const normalizedTxid = txid.startsWith('0x') ? txid : `0x${txid}`
    const response = await fetch(`${HIRO_API}/extended/v1/tx/${normalizedTxid}`)

    if (!response.ok) {
      return { valid: false, error: 'Transaction not found' }
    }

    const tx = await response.json() as any

    if (tx.tx_status !== 'success') {
      return { valid: false, error: `Transaction status: ${tx.tx_status}` }
    }

    if (tx.tx_type !== 'contract_call') {
      return { valid: false, error: 'Not a contract call' }
    }

    const expectedContract = `${PAYMENT_CONTRACT.address}.${PAYMENT_CONTRACT.name}`
    if (tx.contract_call?.contract_id !== expectedContract) {
      return { valid: false, error: 'Wrong contract' }
    }

    return { valid: true, sender: tx.sender_address }
  } catch (error) {
    return { valid: false, error: `Verification failed: ${error}` }
  }
}

app.use('*', cors())

// Types for wallet data
interface WalletData {
  address: string
  bnsName: string | null
  stxBalance: string
  ftBalances: { symbol: string; balance: string; name: string }[]
  nftCount: number
  topNfts: { name: string; collection: string }[]
}

// Fetch BNS name for address (Hiro API)
async function getBnsName(address: string): Promise<string | null> {
  try {
    const res = await fetch(`${HIRO_API}/v1/addresses/stacks/${address}`)
    if (!res.ok) return null
    const data = await res.json() as any
    return data.names?.[0] || null
  } catch {
    return null
  }
}

// Fetch STX balance (Hiro API)
async function getStxBalance(address: string): Promise<string> {
  try {
    const res = await fetch(`${HIRO_API}/extended/v1/address/${address}/balances`)
    if (!res.ok) return '0'
    const data = await res.json() as any
    const balance = BigInt(data.stx?.balance || '0')
    return (Number(balance) / 1_000_000).toFixed(2)
  } catch {
    return '0'
  }
}

// Fetch FT balances (Hiro API)
async function getFtBalances(address: string): Promise<{ symbol: string; balance: string; name: string }[]> {
  try {
    const res = await fetch(`${HIRO_API}/extended/v1/address/${address}/balances`)
    if (!res.ok) return []
    const data = await res.json() as any
    const fts = data.fungible_tokens || {}
    return Object.entries(fts).slice(0, 5).map(([key, ft]: [string, any]) => {
      const parts = key.split('::')
      return {
        name: parts[1] || 'Token',
        symbol: parts[1]?.slice(0, 6) || 'TKN',
        balance: (Number(BigInt(ft.balance || '0')) / 1_000_000).toFixed(2)
      }
    })
  } catch {
    return []
  }
}

// Fetch NFT holdings (Hiro API)
async function getNftHoldings(address: string): Promise<{ count: number; top: { name: string; collection: string }[] }> {
  try {
    const res = await fetch(`${HIRO_API}/extended/v1/address/${address}/balances`)
    if (!res.ok) return { count: 0, top: [] }
    const data = await res.json() as any
    const nfts = data.non_fungible_tokens || {}
    const entries = Object.entries(nfts)
    return {
      count: entries.reduce((sum, [_, nft]: [string, any]) => sum + parseInt(nft.count || '0', 10), 0),
      top: entries.slice(0, 3).map(([key, _]: [string, any]) => {
        const parts = key.split('::')
        return {
          collection: parts[0]?.split('.')[1] || 'Unknown',
          name: parts[1] || 'NFT'
        }
      })
    }
  } catch {
    return { count: 0, top: [] }
  }
}

// Generate image prompt from wallet data
function buildImagePrompt(wallet: WalletData): string {
  const name = wallet.bnsName || wallet.address.slice(0, 8) + '...' + wallet.address.slice(-4)
  const nfts = wallet.topNfts.map(n => n.collection).join(', ') || 'none'
  const tokens = wallet.ftBalances.length > 0
    ? wallet.ftBalances.map(t => t.name).join(', ')
    : 'STX only'

  return `Create a sleek digital identity card for a cryptocurrency wallet holder.

Style: Modern cyberpunk aesthetic, dark background (#0a0a0f) with vibrant orange (#f7931a) and electric blue (#00d4ff) accent colors. Premium holographic effect.

Layout: Horizontal card (16:9), like a premium membership card.

Elements to include:
- Display name prominently: "${name}"
- Balance display: "${wallet.stxBalance} STX"
- Token badges: ${tokens}
- NFT count: "${wallet.nftCount} NFTs"
- Abstract circuit/blockchain pattern in background
- Subtle grid lines suggesting a digital ledger
- Holographic shimmer strip on one edge
- Small Stacks logo watermark

Typography: Clean sans-serif, high contrast white text on dark.
Overall feel: Exclusive crypto club membership, collectible, premium.`
}

// Generate image via OpenAI DALL-E
async function generateImage(apiKey: string, prompt: string): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  if (!apiKey) {
    return { success: false, error: 'Image generation not configured' }
  }

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1792x1024',
        quality: 'standard',
      }),
    })

    if (!response.ok) {
      const error = await response.json() as any
      return { success: false, error: error.error?.message || 'Image generation failed' }
    }

    const data = await response.json() as any
    return { success: true, imageUrl: data.data[0].url }
  } catch (error) {
    return { success: false, error: `Image generation error: ${error}` }
  }
}

// Health check
app.get('/', (c) => {
  return c.json({
    service: 'Wallet Identity Card',
    version: '2.0.0',
    description: 'Generate AI-powered visual identity cards for Stacks wallets',
    protocol: 'x402',
    endpoints: {
      'GET /card/:address': 'Generate identity card image (x402 payment required)',
      'GET /data/:address': 'Get raw wallet data as JSON (free)',
      'GET /prompt/:address': 'Preview the image generation prompt (free)'
    },
    pricing: {
      '/card/:address': {
        price: CARD_PRICE,
        token: 'STX',
        display: `${CARD_PRICE / 1000000} STX`,
        description: 'AI-generated wallet identity card'
      }
    },
    payment: {
      contract: `${PAYMENT_CONTRACT.address}.${PAYMENT_CONTRACT.name}`,
      header: 'X-Payment',
      network: 'mainnet',
    },
    poweredBy: ['x402', 'api.hiro.so', 'openai.com']
  })
})

// Get raw wallet data (FREE - uses Hiro API)
app.get('/data/:address', async (c) => {
  const address = c.req.param('address')

  // Validate address format
  if (!address.match(/^S[PM][A-Z0-9]{38,40}$/)) {
    return c.json({ error: 'Invalid Stacks address format' }, 400)
  }

  // Fetch all data in parallel from Hiro API
  const [bnsName, stxBalance, ftBalances, nftData] = await Promise.all([
    getBnsName(address),
    getStxBalance(address),
    getFtBalances(address),
    getNftHoldings(address)
  ])

  const walletData: WalletData = {
    address,
    bnsName,
    stxBalance,
    ftBalances,
    nftCount: nftData.count,
    topNfts: nftData.top
  }

  return c.json(walletData)
})

// Preview the image prompt (FREE)
app.get('/prompt/:address', async (c) => {
  const address = c.req.param('address')

  if (!address.match(/^S[PM][A-Z0-9]{38,40}$/)) {
    return c.json({ error: 'Invalid Stacks address format' }, 400)
  }

  const [bnsName, stxBalance, ftBalances, nftData] = await Promise.all([
    getBnsName(address),
    getStxBalance(address),
    getFtBalances(address),
    getNftHoldings(address)
  ])

  const walletData: WalletData = {
    address,
    bnsName,
    stxBalance,
    ftBalances,
    nftCount: nftData.count,
    topNfts: nftData.top
  }

  const prompt = buildImagePrompt(walletData)

  return c.json({
    walletData,
    prompt,
    note: 'This prompt will be sent to AI image generation when you call /card/:address'
  })
})

// Generate identity card image (PAID - x402 gated)
app.get('/card/:address', async (c) => {
  const address = c.req.param('address')
  const paymentTxid = c.req.header('X-Payment')

  // Validate address format
  if (!address.match(/^S[PM][A-Z0-9]{38,40}$/)) {
    return c.json({ error: 'Invalid Stacks address format' }, 400)
  }

  // Check for payment
  if (!paymentTxid) {
    const nonce = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    return c.json({
      error: 'Payment Required',
      code: 'PAYMENT_REQUIRED',
      resource: `/card/${address}`,
      payment: {
        contract: `${PAYMENT_CONTRACT.address}.${PAYMENT_CONTRACT.name}`,
        function: 'call-with-stx',
        price: CARD_PRICE,
        token: 'STX',
        recipient: PAYMENT_CONTRACT.address,
        network: 'mainnet',
      },
      instructions: [
        '1. Call the contract function with STX payment',
        '2. Wait for transaction confirmation',
        '3. Retry request with X-Payment header containing txid',
      ],
      nonce,
      expiresAt,
      description: 'Generate AI-powered wallet identity card',
    }, 402)
  }

  // Verify payment
  const verification = await verifyPayment(paymentTxid)
  if (!verification.valid) {
    return c.json({
      error: 'Payment verification failed',
      details: verification.error,
    }, 403)
  }

  // Fetch all wallet data in parallel from Hiro API (free)
  const [bnsName, stxBalance, ftBalances, nftData] = await Promise.all([
    getBnsName(address),
    getStxBalance(address),
    getFtBalances(address),
    getNftHoldings(address)
  ])

  const walletData: WalletData = {
    address,
    bnsName,
    stxBalance,
    ftBalances,
    nftCount: nftData.count,
    topNfts: nftData.top
  }

  // Build prompt and generate image
  const prompt = buildImagePrompt(walletData)
  const imageResult = await generateImage(c.env.OPENAI_API_KEY || '', prompt)

  if (!imageResult.success) {
    return c.json({
      error: 'Image generation failed',
      details: imageResult.error,
      walletData,
      prompt,
      payment_received: true,
      payment_txid: paymentTxid,
    }, 500)
  }

  // Fetch the generated image
  const imageResponse = await fetch(imageResult.imageUrl!)
  if (!imageResponse.ok) {
    return c.json({
      error: 'Failed to fetch generated image',
      imageUrl: imageResult.imageUrl,
      walletData,
    }, 500)
  }

  const image = await imageResponse.arrayBuffer()

  return new Response(image, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
      'X-Wallet-Address': address,
      'X-BNS-Name': bnsName || 'none',
      'X-Payment-Verified': 'true',
    }
  })
})

// OpenAPI spec
app.get('/openapi.json', (c) => {
  return c.json({
    openapi: '3.0.0',
    info: {
      title: 'Wallet Identity Card API',
      version: '1.0.0',
      description: 'Generate visual identity cards for Stacks wallets. Combines BNS, balances, NFTs into AI-generated collectible cards.'
    },
    paths: {
      '/data/{address}': {
        get: {
          summary: 'Get wallet data',
          description: 'Returns BNS name, STX balance, token holdings, and NFT count. FREE endpoint.',
          parameters: [{
            name: 'address',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7'
          }],
          responses: {
            '200': { description: 'Wallet data JSON' },
            '400': { description: 'Invalid address format' }
          }
        }
      },
      '/prompt/{address}': {
        get: {
          summary: 'Preview image prompt',
          description: 'Shows the AI prompt that will be used to generate the card. FREE endpoint.',
          parameters: [{
            name: 'address',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }],
          responses: {
            '200': { description: 'Wallet data and prompt' }
          }
        }
      },
      '/card/{address}': {
        get: {
          summary: 'Generate identity card',
          description: 'Creates AI-generated visual identity card. Requires x402 payment for image generation.',
          parameters: [{
            name: 'address',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }],
          responses: {
            '200': {
              description: 'PNG image',
              content: { 'image/png': { schema: { type: 'string', format: 'binary' } } }
            },
            '402': { description: 'Payment required for image generation' }
          }
        }
      }
    }
  })
})

export default app
