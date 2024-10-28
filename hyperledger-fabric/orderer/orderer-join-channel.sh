export ORDERER_0_CA=${PWD}/crypto-config/ordererOrganizations/itk.com/orderers/orderer0.itk.com/tls/ca.crt
export ORDERER_1_CA=${PWD}/crypto-config/ordererOrganizations/itk.com/orderers/orderer1.itk.com/tls/ca.crt
export ORDERER_2_CA=${PWD}/crypto-config/ordererOrganizations/itk.com/orderers/orderer2.itk.com/tls/ca.crt
export ADMIN_TLS_SIGN_CERT=${PWD}/crypto-config/ordererOrganizations/itk.com/users/Admin@itk.com/tls/client.crt
export ADMIN_TLS_PRIVATE_KEY=${PWD}/crypto-config/ordererOrganizations/itk.com/users/Admin@itk.com/tls/client.key

osnadmin channel join --channelID ijazah-channel \
--config-block ./artifacts/ijazah-channel.block \
-o localhost:7054 \
--ca-file $ORDERER_0_CA \
--client-cert $ADMIN_TLS_SIGN_CERT \
--client-key $ADMIN_TLS_PRIVATE_KEY

osnadmin channel join --channelID ijazah-channel \
--config-block ./artifacts/ijazah-channel.block \
-o localhost:8054 \
--ca-file $ORDERER_1_CA \
--client-cert $ADMIN_TLS_SIGN_CERT \
--client-key $ADMIN_TLS_PRIVATE_KEY

osnadmin channel join --channelID ijazah-channel \
--config-block ./artifacts/ijazah-channel.block \
-o localhost:9054 \
--ca-file $ORDERER_1_CA \
--client-cert $ADMIN_TLS_SIGN_CERT \
--client-key $ADMIN_TLS_PRIVATE_KEY
