import { createHelia } from 'helia'
import { createLibp2p } from 'libp2p'
import { webSockets } from '@libp2p/websockets'
import { noise } from '@chainsafe/libp2p-noise'
import { mplex } from '@libp2p/mplex'
import { kadDHT } from '@libp2p/kad-dht'
import { bootstrap } from '@libp2p/bootstrap'
import { createFsBlockstore } from 'blockstore-fs'
import fs from 'fs'
import path from 'path'

const bootstrapNode = process.env.BOOTSTRAP_PEER_IP

const dir = path.resolve('./ipfs-data')
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true })
}

const blockstore = await createFsBlockstore('./ipfs-data') // optional: simpan data di disk

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
