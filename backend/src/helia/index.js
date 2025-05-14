const { createHelia } = require('helia');
const { unixfs } = require('@helia/unixfs');

let helia, fsys;

async function initHelia() {
  if (!helia) {
    helia = await createHelia();
    fsys = unixfs(helia);
  }
  return { helia, fsys };
}

module.exports = { initHelia };
