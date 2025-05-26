#!/usr/bin/env bash

generateArtifacts() {
  printHeadline "Generating basic configs" "U1F913"

  printItalics "Generating crypto material for Orderer" "U1F512"
  certsGenerate "$FABLO_NETWORK_ROOT/fabric-config" "crypto-config-orderer.yaml" "peerOrganizations/orderer.itk.ac.id" "$FABLO_NETWORK_ROOT/fabric-config/crypto-config/"

  printItalics "Generating crypto material for Akademik" "U1F512"
  certsGenerate "$FABLO_NETWORK_ROOT/fabric-config" "crypto-config-akademik.yaml" "peerOrganizations/akademik.itk.ac.id" "$FABLO_NETWORK_ROOT/fabric-config/crypto-config/"

  printItalics "Generating genesis block for group raft-group" "U1F3E0"
  genesisBlockCreate "$FABLO_NETWORK_ROOT/fabric-config" "$FABLO_NETWORK_ROOT/fabric-config/config" "Raft-groupGenesis"

  # Create directories to avoid permission errors on linux
  mkdir -p "$FABLO_NETWORK_ROOT/fabric-config/chaincode-packages"
  mkdir -p "$FABLO_NETWORK_ROOT/fabric-config/config"
}

startNetwork() {
  printHeadline "Starting network" "U1F680"
  (cd "$FABLO_NETWORK_ROOT"/fabric-docker && docker compose up -d)
  sleep 4
}

generateChannelsArtifacts() {
  printHeadline "Generating config for 'ijazah-channel'" "U1F913"
  createChannelTx "ijazah-channel" "$FABLO_NETWORK_ROOT/fabric-config" "IjazahChannel" "$FABLO_NETWORK_ROOT/fabric-config/config"
}

installChannels() {
  printHeadline "Creating 'ijazah-channel' on Akademik/peer0" "U1F63B"
  docker exec -i cli.akademik.itk.ac.id bash -c "source scripts/channel_fns.sh; createChannelAndJoinTls 'ijazah-channel' 'AkademikMSP' 'peer0.akademik.itk.ac.id:7041' 'crypto/users/Admin@akademik.itk.ac.id/msp' 'crypto/users/Admin@akademik.itk.ac.id/tls' 'crypto-orderer/tlsca.orderer.itk.ac.id-cert.pem' 'orderer0.raft-group.orderer.itk.ac.id:7030';"

}

installChaincodes() {
  if [ -n "$(ls "$CHAINCODES_BASE_DIR/./chaincode")" ]; then
    local version="1.0.0"
    printHeadline "Packaging chaincode 'ijazah-chaincode'" "U1F60E"
    chaincodeBuild "ijazah-chaincode" "node" "$CHAINCODES_BASE_DIR/./chaincode" "16"
    chaincodePackage "cli.akademik.itk.ac.id" "peer0.akademik.itk.ac.id:7041" "ijazah-chaincode" "$version" "node" printHeadline "Installing 'ijazah-chaincode' for Akademik" "U1F60E"
    chaincodeInstall "cli.akademik.itk.ac.id" "peer0.akademik.itk.ac.id:7041" "ijazah-chaincode" "$version" "crypto-orderer/tlsca.orderer.itk.ac.id-cert.pem"
    chaincodeApprove "cli.akademik.itk.ac.id" "peer0.akademik.itk.ac.id:7041" "ijazah-channel" "ijazah-chaincode" "$version" "orderer0.raft-group.orderer.itk.ac.id:7030" "" "false" "crypto-orderer/tlsca.orderer.itk.ac.id-cert.pem" ""
    printItalics "Committing chaincode 'ijazah-chaincode' on channel 'ijazah-channel' as 'Akademik'" "U1F618"
    chaincodeCommit "cli.akademik.itk.ac.id" "peer0.akademik.itk.ac.id:7041" "ijazah-channel" "ijazah-chaincode" "$version" "orderer0.raft-group.orderer.itk.ac.id:7030" "" "false" "crypto-orderer/tlsca.orderer.itk.ac.id-cert.pem" "peer0.akademik.itk.ac.id:7041" "crypto-peer/peer0.akademik.itk.ac.id/tls/ca.crt" ""
  else
    echo "Warning! Skipping chaincode 'ijazah-chaincode' installation. Chaincode directory is empty."
    echo "Looked in dir: '$CHAINCODES_BASE_DIR/./chaincode'"
  fi

}

installChaincode() {
  local chaincodeName="$1"
  if [ -z "$chaincodeName" ]; then
    echo "Error: chaincode name is not provided"
    exit 1
  fi

  local version="$2"
  if [ -z "$version" ]; then
    echo "Error: chaincode version is not provided"
    exit 1
  fi

  if [ "$chaincodeName" = "ijazah-chaincode" ]; then
    if [ -n "$(ls "$CHAINCODES_BASE_DIR/./chaincode")" ]; then
      printHeadline "Packaging chaincode 'ijazah-chaincode'" "U1F60E"
      chaincodeBuild "ijazah-chaincode" "node" "$CHAINCODES_BASE_DIR/./chaincode" "16"
      chaincodePackage "cli.akademik.itk.ac.id" "peer0.akademik.itk.ac.id:7041" "ijazah-chaincode" "$version" "node" printHeadline "Installing 'ijazah-chaincode' for Akademik" "U1F60E"
      chaincodeInstall "cli.akademik.itk.ac.id" "peer0.akademik.itk.ac.id:7041" "ijazah-chaincode" "$version" "crypto-orderer/tlsca.orderer.itk.ac.id-cert.pem"
      chaincodeApprove "cli.akademik.itk.ac.id" "peer0.akademik.itk.ac.id:7041" "ijazah-channel" "ijazah-chaincode" "$version" "orderer0.raft-group.orderer.itk.ac.id:7030" "" "false" "crypto-orderer/tlsca.orderer.itk.ac.id-cert.pem" ""
      printItalics "Committing chaincode 'ijazah-chaincode' on channel 'ijazah-channel' as 'Akademik'" "U1F618"
      chaincodeCommit "cli.akademik.itk.ac.id" "peer0.akademik.itk.ac.id:7041" "ijazah-channel" "ijazah-chaincode" "$version" "orderer0.raft-group.orderer.itk.ac.id:7030" "" "false" "crypto-orderer/tlsca.orderer.itk.ac.id-cert.pem" "peer0.akademik.itk.ac.id:7041" "crypto-peer/peer0.akademik.itk.ac.id/tls/ca.crt" ""

    else
      echo "Warning! Skipping chaincode 'ijazah-chaincode' install. Chaincode directory is empty."
      echo "Looked in dir: '$CHAINCODES_BASE_DIR/./chaincode'"
    fi
  fi
}

runDevModeChaincode() {
  local chaincodeName=$1
  if [ -z "$chaincodeName" ]; then
    echo "Error: chaincode name is not provided"
    exit 1
  fi

  if [ "$chaincodeName" = "ijazah-chaincode" ]; then
    local version="1.0.0"
    printHeadline "Approving 'ijazah-chaincode' for Akademik (dev mode)" "U1F60E"
    chaincodeApprove "cli.akademik.itk.ac.id" "peer0.akademik.itk.ac.id:7041" "ijazah-channel" "ijazah-chaincode" "1.0.0" "orderer0.raft-group.orderer.itk.ac.id:7030" "" "false" "" ""
    printItalics "Committing chaincode 'ijazah-chaincode' on channel 'ijazah-channel' as 'Akademik' (dev mode)" "U1F618"
    chaincodeCommit "cli.akademik.itk.ac.id" "peer0.akademik.itk.ac.id:7041" "ijazah-channel" "ijazah-chaincode" "1.0.0" "orderer0.raft-group.orderer.itk.ac.id:7030" "" "false" "" "peer0.akademik.itk.ac.id:7041" "" ""

  fi
}

upgradeChaincode() {
  local chaincodeName="$1"
  if [ -z "$chaincodeName" ]; then
    echo "Error: chaincode name is not provided"
    exit 1
  fi

  local version="$2"
  if [ -z "$version" ]; then
    echo "Error: chaincode version is not provided"
    exit 1
  fi

  if [ "$chaincodeName" = "ijazah-chaincode" ]; then
    if [ -n "$(ls "$CHAINCODES_BASE_DIR/./chaincode")" ]; then
      printHeadline "Packaging chaincode 'ijazah-chaincode'" "U1F60E"
      chaincodeBuild "ijazah-chaincode" "node" "$CHAINCODES_BASE_DIR/./chaincode" "16"
      chaincodePackage "cli.akademik.itk.ac.id" "peer0.akademik.itk.ac.id:7041" "ijazah-chaincode" "$version" "node" printHeadline "Installing 'ijazah-chaincode' for Akademik" "U1F60E"
      chaincodeInstall "cli.akademik.itk.ac.id" "peer0.akademik.itk.ac.id:7041" "ijazah-chaincode" "$version" "crypto-orderer/tlsca.orderer.itk.ac.id-cert.pem"
      chaincodeApprove "cli.akademik.itk.ac.id" "peer0.akademik.itk.ac.id:7041" "ijazah-channel" "ijazah-chaincode" "$version" "orderer0.raft-group.orderer.itk.ac.id:7030" "" "false" "crypto-orderer/tlsca.orderer.itk.ac.id-cert.pem" ""
      printItalics "Committing chaincode 'ijazah-chaincode' on channel 'ijazah-channel' as 'Akademik'" "U1F618"
      chaincodeCommit "cli.akademik.itk.ac.id" "peer0.akademik.itk.ac.id:7041" "ijazah-channel" "ijazah-chaincode" "$version" "orderer0.raft-group.orderer.itk.ac.id:7030" "" "false" "crypto-orderer/tlsca.orderer.itk.ac.id-cert.pem" "peer0.akademik.itk.ac.id:7041" "crypto-peer/peer0.akademik.itk.ac.id/tls/ca.crt" ""

    else
      echo "Warning! Skipping chaincode 'ijazah-chaincode' upgrade. Chaincode directory is empty."
      echo "Looked in dir: '$CHAINCODES_BASE_DIR/./chaincode'"
    fi
  fi
}

notifyOrgsAboutChannels() {

  printHeadline "Creating new channel config blocks" "U1F537"
  createNewChannelUpdateTx "ijazah-channel" "AkademikMSP" "IjazahChannel" "$FABLO_NETWORK_ROOT/fabric-config" "$FABLO_NETWORK_ROOT/fabric-config/config"

  printHeadline "Notyfing orgs about channels" "U1F4E2"
  notifyOrgAboutNewChannelTls "ijazah-channel" "AkademikMSP" "cli.akademik.itk.ac.id" "peer0.akademik.itk.ac.id" "orderer0.raft-group.orderer.itk.ac.id:7030" "crypto-orderer/tlsca.orderer.itk.ac.id-cert.pem"

  printHeadline "Deleting new channel config blocks" "U1F52A"
  deleteNewChannelUpdateTx "ijazah-channel" "AkademikMSP" "cli.akademik.itk.ac.id"

}

printStartSuccessInfo() {
  printHeadline "Done! Enjoy your fresh network" "U1F984"
}

stopNetwork() {
  printHeadline "Stopping network" "U1F68F"
  (cd "$FABLO_NETWORK_ROOT"/fabric-docker && docker compose stop)
  sleep 4
}

networkDown() {
  printHeadline "Destroying network" "U1F916"
  (cd "$FABLO_NETWORK_ROOT"/fabric-docker && docker compose down)

  printf "Removing chaincode containers & images... \U1F5D1 \n"
  for container in $(docker ps -a | grep "dev-peer0.akademik.itk.ac.id-ijazah-chaincode" | awk '{print $1}'); do
    echo "Removing container $container..."
    docker rm -f "$container" || echo "docker rm of $container failed. Check if all fabric dockers properly was deleted"
  done
  for image in $(docker images "dev-peer0.akademik.itk.ac.id-ijazah-chaincode*" -q); do
    echo "Removing image $image..."
    docker rmi "$image" || echo "docker rmi of $image failed. Check if all fabric dockers properly was deleted"
  done

  printf "Removing generated configs... \U1F5D1 \n"
  rm -rf "$FABLO_NETWORK_ROOT/fabric-config/config"
  rm -rf "$FABLO_NETWORK_ROOT/fabric-config/crypto-config"
  rm -rf "$FABLO_NETWORK_ROOT/fabric-config/chaincode-packages"

  printHeadline "Done! Network was purged" "U1F5D1"
}
