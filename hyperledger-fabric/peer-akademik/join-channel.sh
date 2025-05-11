# Set environment variables
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="AkademikMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/crypto-config/peerOrganizations/akademik.itk.com/peers/peer0.akademik.itk.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/crypto-config/peerOrganizations/akademik.itk.com/users/Admin@akademik.itk.com/msp
export CORE_PEER_ADDRESS=localhost:7151

# Set orderer TLS certificate
export ORDERER_CA=${PWD}/../orderer/crypto-config/ordererOrganizations/itk.com/orderers/orderer0.itk.com/tls/ca.crt

# Fetch genesis block
peer channel fetch 0 ./artifacts/ijazah-channel.block -o localhost:7050 \
--channelID ijazah-channel \
--ordererTLSHostnameOverride orderer0.itk.com \
--tls \
--cafile $ORDERER_CA

# Join channel
peer channel join -b ./artifacts/ijazah-channel.block

# List channels yang sudah di-join
peer channel list
