# Generate crypto material baru
cryptogen generate --config=./crypto-config.yaml

# Generate genesis block
configtxgen -profile IjazahChannelGenesis -outputBlock ./artifacts/ijazah-channel.block -channelID ijazah-channel

# Start network
docker-compose up -d