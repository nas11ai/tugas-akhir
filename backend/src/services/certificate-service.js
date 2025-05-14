import { getContract } from '../fabric/gateway/index.js';
import { fsStore } from '../ipfs/helia-client.js';

export async function createCertificate(req, res) {
  try {
    const org = req.user.role;
    const userId = req.headers['x-user-id'];
    const contract = await getContract(org, userId, 'ijazah');

    const file = req.file;
    const ipfsResult = await fsStore.addBytes(file.buffer);

    const certData = {
      id: req.body.id,
      name: req.body.name,
      nim: req.body.nim,
      ipfsHash: ipfsResult.cid.toString()
    };

    await contract.submitTransaction('CreateCertificate', JSON.stringify(certData));
    res.json({ message: 'Certificate created', ipfsHash: certData.ipfsHash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getCertificate(req, res) {
  try {
    const org = req.user?.role || 'akademik'; // default jika tidak pakai auth middleware
    const userId = req.headers['x-user-id'];
    const contract = await getContract(org, userId, 'ijazah');

    const certId = req.params.id;
    const result = await contract.evaluateTransaction('ReadCertificate', certId);
    const parsed = JSON.parse(result.toString());

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateCertificate(req, res) {
  try {
    const org = req.user.role;
    const userId = req.headers['x-user-id'];
    const contract = await getContract(org, userId, 'ijazah');

    const certId = req.params.id;
    const existing = await contract.evaluateTransaction('ReadCertificate', certId);
    const certData = JSON.parse(existing.toString());

    let newIpfsHash = certData.ipfsHash;
    if (req.file) {
      const ipfsResult = await fsStore.addBytes(req.file.buffer);
      newIpfsHash = ipfsResult.cid.toString();
    }

    const updatedCert = {
      id: certId,
      name: req.body.name || certData.name,
      nim: req.body.nim || certData.nim,
      ipfsHash: newIpfsHash
    };

    await contract.submitTransaction('UpdateCertificate', JSON.stringify(updatedCert));
    res.json({ message: 'Certificate updated', ipfsHash: newIpfsHash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteCertificate(req, res) {
  try {
    const org = req.user.role;
    const userId = req.headers['x-user-id'];
    const contract = await getContract(org, userId, 'ijazah');

    const certId = req.params.id;
    await contract.submitTransaction('DeleteCertificate', certId);

    res.json({ message: 'Certificate deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getAllCertificates(req, res) {
  try {
    const org = req.user.role;
    const userId = req.headers['x-user-id'];
    const contract = await getContract(org, userId, 'ijazah');

    const result = await contract.evaluateTransaction('GetAllCertificates');
    const parsed = JSON.parse(result.toString());

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
