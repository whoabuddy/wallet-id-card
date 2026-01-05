import app from './src/index'

const server = Bun.serve({
  port: 3456,
  fetch: (req) => app.fetch(req, { STX402_BASE: 'https://stx402.com' })
})

console.log(`Server running at http://localhost:${server.port}`)
