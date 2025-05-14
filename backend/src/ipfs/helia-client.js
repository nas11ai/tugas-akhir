import { createHelia } from 'helia'
import { createLibp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
import { noise } from '@chainsafe/libp2p-noise'
import { mplex } from '@libp2p/mplex'
import { kadDHT } from '@libp2p/kad-dht'
import { bootstrap } from '@libp2p/bootstrap'
import { FsBlockstore } from 'blockstore-fs'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const bootstrapNode = process.env.BOOTSTRAP_PEER_IP
const dir = path.resolve(__dirname, 'ipfs-data')

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true })
}

const blockstore = new FsBlockstore(dir)
await blockstore.open()

const libp2p = await createLibp2p({
  transports: [webSockets()],
  connectionEncryption: [noise()],
  streamMuxers: [mplex()],
  dht: kadDHT(),
  peerDiscovery: [
    bootstrap({
      list: [bootstrapNode]
    })
  ]
})

export const helia = await createHelia({ libp2p, blockstore })
export const fsStore = helia.blockstore
