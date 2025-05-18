# Set environment variables
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="RektorMSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/crypto-config/peerOrganizations/rektor.itk.com/peers/peer0.rektor.itk.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/crypto-config/peerOrganizations/rektor.itk.com/users/Admin@rektor.itk.com/msp
export CORE_PEER_ADDRESS=localhost:7051

# Join channel
peer channel join -b ./artifacts/ijazah-channel.block

# List channels yang sudah di-join
peer channel list
