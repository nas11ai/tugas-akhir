cd hyperledger-fabric/orderer

docker compose down

docker compose down -v

./init.sh

cp -rf crypto-config ../peer-akademik/
cp -rf artifacts ../peer-akademik/

cp -rf crypto-config ../peer-rektor/
cp -rf artifacts ../peer-rektor/

./orderer-join-channel.sh

cd ../peer-akademik

docker compose down

docker compose down -v

docker compose up -d

./join-channel.sh


cd ../peer-rektor

docker compose down

docker compose down -v

docker compose up -d

./join-channel.sh

cd ..
cd ..

cd ipfs-cluster/peer0

docker compose down

docker compose down -v

docker compose up -d

cd ../peer1

docker compose down

docker compose down -v

docker compose up -d
