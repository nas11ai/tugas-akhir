import { Wallets, Gateway } from 'fabric-network';
import fs from 'fs';
import path from 'path';

export async function getContract(org, userId, chaincodeName, channelName = 'ijazah-channel') {
  const ccpPath = path.resolve('src', 'config', `connection-${org}.json`);
  const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

  const walletPath = path.resolve('wallet', org);
  const wallet = await Wallets.newFileSystemWallet(walletPath);

  if (!await wallet.get(userId)) throw new Error(`User ${userId} not enrolled`);

  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: userId,
    discovery: { enabled: true, asLocalhost: true }
  });

  const network = await gateway.getNetwork(channelName);
  return network.getContract(chaincodeName);
}
