# Set environment variables
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="AkademikMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/crypto-config/peerOrganizations/akademik.itk.com/peers/peer0.akademik.itk.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/crypto-config/peerOrganizations/akademik.itk.com/users/Admin@akademik.itk.com/msp
export CORE_PEER_ADDRESS=localhost:7151
export CORE_PEER_BCCSP_DEFAULT=SW
export CORE_PEER_BCCSP_SW_HASH=SHA2
export CORE_PEER_BCCSP_SW_SECURITY=256
export CORE_PEER_BCCSP_SW_FILEKEYSTORE_KEYSTORE=${PWD}/crypto-config/peerOrganizations/akademik.itk.com/users/Admin@akademik.itk.com/msp/keystore

# Join channel
peer channel join -b ./artifacts/ijazah-channel.block

# List channels yang sudah di-join
peer channel list
