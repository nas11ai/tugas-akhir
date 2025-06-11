#!/usr/bin/env node

'use strict';

const { CaliperEngine } = require('@hyperledger/caliper-core');
const Config = require('@hyperledger/caliper-core/lib/common/config/config-util');

async function main() {
    try {
        // ganti path config sesuai lokasi file
        const benchmarkConfigPath = './benchmarks/benchmark-config.yaml';
        const networkConfigPath = './networks/network-config.yaml';

        const benchmarkConfig = Config.parseObjectOrFile(benchmarkConfigPath);
        const networkConfig = Config.parseObjectOrFile(networkConfigPath);

        const caliperEngine = new CaliperEngine(benchmarkConfig, networkConfig);
        await caliperEngine.run();
    } catch (err) {
        console.error('[caliper.js] Benchmark failed:', err);
        process.exit(1);
    }
}

main();
