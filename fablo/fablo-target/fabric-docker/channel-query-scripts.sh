#!/usr/bin/env bash

source "$FABLO_NETWORK_ROOT/fabric-docker/scripts/channel-query-functions.sh"

set -eu

channelQuery() {
  if [ "$#" -eq 1 ]; then
    printChannelsHelp

  elif [ "$1" = "list" ] && [ "$2" = "akademik" ] && [ "$3" = "peer0" ]; then

    peerChannelListTls "cli.akademik.itk.ac.id" "peer0.akademik.itk.ac.id:7041" "crypto-orderer/tlsca.orderer.itk.ac.id-cert.pem"

  elif

    [ "$1" = "getinfo" ] && [ "$2" = "ijazah-channel" ] && [ "$3" = "akademik" ] && [ "$4" = "peer0" ]
  then

    peerChannelGetInfoTls "ijazah-channel" "cli.akademik.itk.ac.id" "peer0.akademik.itk.ac.id:7041" "crypto-orderer/tlsca.orderer.itk.ac.id-cert.pem"

  elif [ "$1" = "fetch" ] && [ "$2" = "config" ] && [ "$3" = "ijazah-channel" ] && [ "$4" = "akademik" ] && [ "$5" = "peer0" ]; then
    TARGET_FILE=${6:-"$channel-config.json"}

    peerChannelFetchConfigTls "ijazah-channel" "cli.akademik.itk.ac.id" "$TARGET_FILE" "peer0.akademik.itk.ac.id:7041" "crypto-orderer/tlsca.orderer.itk.ac.id-cert.pem"

  elif [ "$1" = "fetch" ] && [ "$3" = "ijazah-channel" ] && [ "$4" = "akademik" ] && [ "$5" = "peer0" ]; then
    BLOCK_NAME=$2
    TARGET_FILE=${6:-"$BLOCK_NAME.block"}

    peerChannelFetchBlockTls "ijazah-channel" "cli.akademik.itk.ac.id" "${BLOCK_NAME}" "peer0.akademik.itk.ac.id:7041" "crypto-orderer/tlsca.orderer.itk.ac.id-cert.pem" "$TARGET_FILE"

  else

    echo "$@"
    echo "$1, $2, $3, $4, $5, $6, $7, $#"
    printChannelsHelp
  fi

}

printChannelsHelp() {
  echo "Channel management commands:"
  echo ""

  echo "fablo channel list akademik peer0"
  echo -e "\t List channels on 'peer0' of 'Akademik'".
  echo ""

  echo "fablo channel getinfo ijazah-channel akademik peer0"
  echo -e "\t Get channel info on 'peer0' of 'Akademik'".
  echo ""
  echo "fablo channel fetch config ijazah-channel akademik peer0 [file-name.json]"
  echo -e "\t Download latest config block and save it. Uses first peer 'peer0' of 'Akademik'".
  echo ""
  echo "fablo channel fetch <newest|oldest|block-number> ijazah-channel akademik peer0 [file name]"
  echo -e "\t Fetch a block with given number and save it. Uses first peer 'peer0' of 'Akademik'".
  echo ""

}
