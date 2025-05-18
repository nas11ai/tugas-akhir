# Buat direktori package
mkdir -p ijazah-external-chaincode/

# Simpan connection.json
cat > ijazah-external-chaincode/connection.json << EOL
{
  "address": "chaincode-ijazah-contract-1:9999",
  "dial_timeout": "10s",
  "tls_required": false
}
EOL

# Simpan metadata.json
cat > ijazah-external-chaincode/metadata.json << EOL
{
  "type": "external",
  "label": "ijazah"
}
EOL

cd ijazah-external-chaincode

tar -czvf code.tar.gz connection.json

tar -czvf ijazah.tar.gz metadata.json code.tar.gz

peer lifecycle chaincode install ijazah.tar.gz