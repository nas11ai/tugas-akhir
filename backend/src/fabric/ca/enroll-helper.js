const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function enrollAdmin(orgName, adminId, adminPw, mspId, connectionProfilePath) {
  try {
    const ccpPath = path.resolve(__dirname, '..', '..', connectionProfilePath);
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    const caName = Object.keys(ccp.certificateAuthorities)[0];
    const caInfo = ccp.certificateAuthorities[caName];
    const caTLSCACertsPath = path.resolve(__dirname, '..', '..', caInfo.tlsCACerts.path);
    const caTLSCACerts = fs.readFileSync(caTLSCACertsPath);

    const ca = new FabricCAServices(caInfo.url, {
      trustedRoots: caTLSCACerts,
      verify: false
    }, caInfo.caName);

    const walletPath = path.join(__dirname, '..', '..', 'wallet', orgName);
    if (!fs.existsSync(walletPath)) {
      fs.mkdirSync(walletPath, { recursive: true });
      console.log(`📁 Folder wallet untuk ${orgName} dibuat di ${walletPath}`);
    }

    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const identity = await wallet.get(adminId);
    if (identity) {
      console.log(`⚠️ Admin "${adminId}" untuk ${orgName} sudah ada di wallet`);
      return;
    }

    const enrollment = await ca.enroll({
      enrollmentID: adminId,
      enrollmentSecret: adminPw
    });

    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes()
      },
      mspId,
      type: 'X.509'
    };

    await wallet.put(adminId, x509Identity);
    console.log(`✅ Admin "${adminId}" berhasil di-enroll dan disimpan ke wallet ${walletPath}`);
  } catch (error) {
    console.error(`❌ Gagal enroll admin ${orgName}: ${error}`);
    process.exit(1);
  }
}

module.exports = { enrollAdmin };
