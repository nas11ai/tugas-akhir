# Variabel
CHAINCODE_NAME="ijazah"
CHAINCODE_VERSION="1.0"
CHAINCODE_SEQUENCE="1"
CHANNEL_NAME="ijazah-channel"  # Sesuaikan dengan nama channel Anda

# Set environment variables for Peer Akademik
# export CORE_PEER_TLS_ENABLED=true
# export CORE_PEER_LOCALMSPID="AkademikMSP"
# export CORE_PEER_TLS_ROOTCERT_FILE=./crypto-config/peerOrganizations/akademik.itk.com/peers/peer0.akademik.itk.com/tls/ca.crt
# export CORE_PEER_MSPCONFIGPATH=./crypto-config/peerOrganizations/akademik.itk.com/users/Admin@akademik.itk.com/msp
# export CORE_PEER_ADDRESS=localhost:7151

# 1. Install chaincode package
echo "Installing chaincode package..."
peer lifecycle chaincode install ijazah.tar.gz

# Dapatkan package ID
PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep ijazah | awk -F: '{print $3}' | sed 's/,.*$//')
echo "Package ID: $PACKAGE_ID"

# 2. Approve chaincode untuk Akademik
echo "Approving chaincode definition for Akademik..."
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer0.itk.com \
  --channelID $CHANNEL_NAME --name $CHAINCODE_NAME --version $CHAINCODE_VERSION \
  --package-id $PACKAGE_ID --sequence $CHAINCODE_SEQUENCE \
  --tls --cafile ./crypto-config/ordererOrganizations/itk.com/tlsca/tlsca.itk.com-cert.pem

# 3. Commit chaincode definition
echo "Committing chaincode definition..."
peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer0.itk.com \
  --channelID $CHANNEL_NAME --name $CHAINCODE_NAME --version $CHAINCODE_VERSION \
  --sequence $CHAINCODE_SEQUENCE \
  --tls --cafile ./crypto-config/ordererOrganizations/itk.com/tlsca/tlsca.itk.com-cert.pem \
  --peerAddresses localhost:7151 --tlsRootCertFiles ./crypto-config/peerOrganizations/akademik.itk.com/peers/peer0.akademik.itk.com/tls/ca.crt

# 4. Verifikasi chaincode sudah di-commit
echo "Verifying chaincode commitment..."
peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME --name $CHAINCODE_NAME \
  --cafile ./crypto-config/ordererOrganizations/itk.com/tlsca/tlsca.itk.com-cert.pem

echo "Chaincode installation completed!"