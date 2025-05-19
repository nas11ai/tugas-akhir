#!/usr/bin/env bash

chaincodeList() {
  if [ "$#" -ne 2 ]; then
    echo "Expected 2 parameters for chaincode list, but got: $*"
    exit 1

  elif [ "$1" = "peer0.akademik.itk.ac.id" ]; then

    peerChaincodeListTls "cli.akademik.itk.ac.id" "peer0.akademik.itk.ac.id:7041" "$2" "crypto-orderer/tlsca.orderer.itk.ac.id-cert.pem" # Third argument is channel name

  elif
    [ "$1" = "peer0.rektor.itk.ac.id" ]
  then

    peerChaincodeListTls "cli.rektor.itk.ac.id" "peer0.rektor.itk.ac.id:7061" "$2" "crypto-orderer/tlsca.orderer.itk.ac.id-cert.pem" # Third argument is channel name

  else

    echo "Fail to call listChaincodes. No peer or channel found. Provided peer: $1, channel: $2"
    exit 1

  fi
}

# Function to perform chaincode invoke. Accepts 5 parameters:
#   1. comma-separated peers
#   2. channel name
#   3. chaincode name
#   4. chaincode command
#   5. transient data (optional)
chaincodeInvoke() {
  if [ "$#" -ne 4 ] && [ "$#" -ne 5 ]; then
    echo "Expected 4 or 5 parameters for chaincode list, but got: $*"
    echo "Usage: fablo chaincode invoke <peer_domains_comma_separated> <channel_name> <chaincode_name> <command> [transient]"
    exit 1
  fi

  # Cli needs to be from the same org as the first peer
  if [[ "$1" == "peer0.akademik.itk.ac.id"* ]]; then
    cli="cli.akademik.itk.ac.id"
  fi
  if [[ "$1" == "peer0.rektor.itk.ac.id"* ]]; then
    cli="cli.rektor.itk.ac.id"
  fi

  peer_addresses="$1"
  peer_addresses="${peer_addresses//peer0.akademik.itk.ac.id/peer0.akademik.itk.ac.id:7041}"
  peer_addresses="${peer_addresses//peer0.rektor.itk.ac.id/peer0.rektor.itk.ac.id:7061}"

  peer_certs="$1"
  peer_certs="${peer_certs//peer0.akademik.itk.ac.id/crypto/peers/peer0.akademik.itk.ac.id/tls/ca.crt}"
  peer_certs="${peer_certs//peer0.rektor.itk.ac.id/crypto/peers/peer0.rektor.itk.ac.id/tls/ca.crt}"

  if [ "$2" = "ijazah-channel" ]; then
    ca_cert="crypto-orderer/tlsca.orderer.itk.ac.id-cert.pem"
  fi
  peerChaincodeInvokeTls "$cli" "$peer_addresses" "$2" "$3" "$4" "$5" "$peer_certs" "$ca_cert"
}
