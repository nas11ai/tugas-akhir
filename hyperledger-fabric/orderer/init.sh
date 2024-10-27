# Generate crypto material baru
cryptogen generate --config=./crypto-config.yaml

# Generate genesis block
mkdir artifacts
configtxgen -profile IjazahChannelGenesis -outputBlock ./artifacts/ijazahChannel.block -channelID ijazahChannel

# Start network
docker-compose up -d