import { Readable } from 'node:stream'

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

async function run() {
  const res = await fetch(
    `https://www.googleapis.com/webfonts/v1/webfonts?key=${process.env.GOOGLE_API_KEY}`,
  )

  Readable.fromWeb(res.body as any).pipe(process.stdout)
}
