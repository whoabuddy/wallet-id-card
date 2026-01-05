import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  STX402_BASE: string
}

const app = new Hono<{ Bindings: Bindings }>()
const HIRO_API = 'https://api.hiro.so'

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

// Generate image via stx402 AI endpoint
async function generateImage(base: string, prompt: string): Promise<Response> {
  const res = await fetch(`${base}/api/ai/generate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, width: 1024, height: 576 })
  })
  return res
}

// Health check
app.get('/', (c) => {
  return c.json({
    service: 'Wallet Identity Card',
    version: '1.0.0',
    description: 'Generate visual identity cards for Stacks wallets',
    endpoints: {
      'GET /card/:address': 'Generate identity card image (requires x402 payment)',
      'GET /data/:address': 'Get raw wallet data as JSON (free)',
      'GET /prompt/:address': 'Preview the image generation prompt (free)'
    },
    pricing: {
      '/card/:address': '0.001 STX (covers AI image generation)'
    },
    poweredBy: ['stx402.com', 'api.hiro.so']
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

// Generate identity card image (PAID - uses stx402 for image gen)
app.get('/card/:address', async (c) => {
  const address = c.req.param('address')
  const base = c.env.STX402_BASE

  // Validate address format
  if (!address.match(/^S[PM][A-Z0-9]{38,40}$/)) {
    return c.json({ error: 'Invalid Stacks address format' }, 400)
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

  // Build prompt and call stx402 image generation
  const prompt = buildImagePrompt(walletData)
  const imageRes = await generateImage(base, prompt)

  // If stx402 returns 402, pass it through (user needs to pay)
  if (imageRes.status === 402) {
    const paymentInfo = await imageRes.json()
    return c.json({
      ...paymentInfo as object,
      note: 'Pay to generate your wallet identity card',
      walletData,
      prompt
    }, 402)
  }

  if (!imageRes.ok) {
    return c.json({
      error: 'Failed to generate image',
      status: imageRes.status,
      walletData,
      prompt
    }, 500)
  }

  const image = await imageRes.arrayBuffer()

  return new Response(image, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
      'X-Wallet-Address': address,
      'X-BNS-Name': bnsName || 'none'
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
