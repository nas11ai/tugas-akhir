import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';

const helia = await createHelia();
const fsStore = unixfs(helia);

export { helia, fsStore };
