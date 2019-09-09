const Oracle = artifacts.require('./MultiSourceOracle.sol');
const Factory = artifacts.require('./OracleFactory.sol');
const Helper = require('./Helper.js');

const BN = web3.utils.BN;
const expect = require('chai')
    .use(require('bn-chai')(BN))
    .expect;

function bn (number) {
    return new BN(number);
}

function toUint96 (number) {
    const hex = number.toString(16);
    return `0x${'0'.repeat(24 - hex.length)}${hex}`;
}

function perm (xs) {
    const ret = [];

    for (let i = 0; i < xs.length; i = i + 1) {
        const rest = perm(xs.slice(0, i).concat(xs.slice(i + 1)));

        if (!rest.length) {
            ret.push([xs[i]]);
        } else {
            for (let j = 0; j < rest.length; j = j + 1) {
                ret.push([xs[i]].concat(rest[j]));
            }
        }
    }

    return ret;
}

contract('Multi Source Oracle', function (accounts) {
    before(async () => {
        this.owner = accounts[9];
        this.factory = await Factory.new({ from: this.owner });
    });

    async function createOracle (symbol) {
        const event = await this.factory.newOracle(
            symbol,
            `name - ${symbol}`,
            2,
            '0x6164e51D5469ce0225c0054EcF6fD98dB1E8EcDd',
            'Maintainer metadata',
            { from: this.owner }
        );

        return Oracle.at(event.logs.find(l => l.event === 'NewOracle').args._oracle);
    }

    it('Should return single rate with a single provider', async () => {
        const oracle = await createOracle('TEST-1');
        await this.factory.addSigner(oracle.address, accounts[0], 'account[0] signer', { from: this.owner });
        await this.factory.provide(oracle.address, 100000);
        const sample = await oracle.readSample();
        expect(sample[1]).to.eq.BN(bn(100000));
        expect(await oracle.providedBy(accounts[0])).to.eq.BN(bn(100000));
    });

    it('Should return average rate with a two providers', async () => {
        const oracle = await createOracle('TEST-2');
        await this.factory.addSigner(oracle.address, accounts[0], 'account[0] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[1], 'account[1] signer', { from: this.owner });
        await this.factory.provide(oracle.address, 100000, { from: accounts[0] });
        await this.factory.provide(oracle.address, 200000, { from: accounts[1] });
        const sample = await oracle.readSample();
        expect(sample[1]).to.eq.BN(bn(150000));
        expect(await oracle.providedBy(accounts[0])).to.eq.BN(bn(100000));
        expect(await oracle.providedBy(accounts[1])).to.eq.BN(bn(200000));
    });

    it('Should return the median rate with a three providers', async () => {
        const oracle = await createOracle('TEST-3');
        await this.factory.addSigner(oracle.address, accounts[0], 'account[0] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[1], 'account[1] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[2], 'account[2] signer', { from: this.owner });
        await this.factory.provide(oracle.address, 100000, { from: accounts[0] });
        await this.factory.provide(oracle.address, 200000, { from: accounts[1] });
        await this.factory.provide(oracle.address, 300000, { from: accounts[2] });
        const sample = await oracle.readSample();
        expect(sample[1]).to.eq.BN(bn(200000));
    });

    it('Should return the median rate with a three providers, regardless the order', async () => {
        const provided = perm([200000, 100000, 300000]);
        for (const i in provided) {
            const provide = provided[i];
            const oracle = await createOracle(`TEST-4-${i}`);
            await this.factory.addSigner(oracle.address, accounts[0], 'account[0] signer', { from: this.owner });
            await this.factory.addSigner(oracle.address, accounts[1], 'account[1] signer', { from: this.owner });
            await this.factory.addSigner(oracle.address, accounts[2], 'account[2] signer', { from: this.owner });
            await this.factory.provide(oracle.address, provide[0], { from: accounts[1] });
            await this.factory.provide(oracle.address, provide[1], { from: accounts[0] });
            await this.factory.provide(oracle.address, provide[2], { from: accounts[2] });
            const sample = await oracle.readSample();
            expect(sample[1]).to.eq.BN(bn(200000));
        }
    });

    it('Should return the average of the two median rate with a four providers', async () => {
        const oracle = await createOracle('TEST-5');
        await this.factory.addSigner(oracle.address, accounts[0], 'account[0] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[1], 'account[1] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[2], 'account[2] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[3], 'account[3] signer', { from: this.owner });
        await this.factory.provide(oracle.address, 100000, { from: accounts[0] });
        await this.factory.provide(oracle.address, 200000, { from: accounts[1] });
        await this.factory.provide(oracle.address, 300000, { from: accounts[2] });
        await this.factory.provide(oracle.address, 400000, { from: accounts[3] });
        const sample = await oracle.readSample();
        expect(sample[1]).to.eq.BN(bn(250000));
    });

    it('Should return the average of the two median rate with a four providers, regardless the order', async () => {
        const provided = perm([200000, 100000, 300000, 400000]);
        for (const i in provided) {
            const provide = provided[i];
            const oracle = await createOracle(`TEST-6-${i}`);
            await this.factory.addSigner(oracle.address, accounts[0], 'account[0] signer', { from: this.owner });
            await this.factory.addSigner(oracle.address, accounts[1], 'account[1] signer', { from: this.owner });
            await this.factory.addSigner(oracle.address, accounts[2], 'account[2] signer', { from: this.owner });
            await this.factory.addSigner(oracle.address, accounts[3], 'account[3] signer', { from: this.owner });
            await this.factory.provide(oracle.address, provide[0], { from: accounts[0] });
            await this.factory.provide(oracle.address, provide[1], { from: accounts[1] });
            await this.factory.provide(oracle.address, provide[2], { from: accounts[2] });
            await this.factory.provide(oracle.address, provide[3], { from: accounts[3] });
            const sample = await oracle.readSample();
            expect(sample[1]).to.eq.BN(bn(250000));
        }
    });

    it('Should return the median rate with a five providers', async () => {
        const oracle = await createOracle('TEST-7');
        await this.factory.addSigner(oracle.address, accounts[0], 'account[0] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[1], 'account[1] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[2], 'account[2] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[3], 'account[3] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[4], 'account[4] signer', { from: this.owner });
        await this.factory.provide(oracle.address, 100000, { from: accounts[0] });
        await this.factory.provide(oracle.address, 200000, { from: accounts[1] });
        await this.factory.provide(oracle.address, 300000, { from: accounts[2] });
        await this.factory.provide(oracle.address, 400000, { from: accounts[3] });
        await this.factory.provide(oracle.address, 500000, { from: accounts[4] });
        const sample = await oracle.readSample();
        expect(sample[1]).to.eq.BN(bn(300000));
    });

    it('Should return the median rate with a five providers, regardless the order', async () => {
        const provided = perm([200000, 100000, 300000, 400000, 500000]);
        for (const i in provided) {
            const provide = provided[i];
            const oracle = await createOracle(`TEST-8-${i}`);
            await this.factory.addSigner(oracle.address, accounts[0], 'account[0] signer', { from: this.owner });
            await this.factory.addSigner(oracle.address, accounts[1], 'account[1] signer', { from: this.owner });
            await this.factory.addSigner(oracle.address, accounts[2], 'account[2] signer', { from: this.owner });
            await this.factory.addSigner(oracle.address, accounts[3], 'account[3] signer', { from: this.owner });
            await this.factory.addSigner(oracle.address, accounts[4], 'account[4] signer', { from: this.owner });
            await this.factory.provide(oracle.address, provide[0], { from: accounts[0] });
            await this.factory.provide(oracle.address, provide[1], { from: accounts[1] });
            await this.factory.provide(oracle.address, provide[2], { from: accounts[2] });
            await this.factory.provide(oracle.address, provide[3], { from: accounts[3] });
            await this.factory.provide(oracle.address, provide[4], { from: accounts[4] });
            const sample = await oracle.readSample();
            expect(sample[1]).to.eq.BN(bn(300000));
        }
    });

    it('Should return the median rate with a eight providers', async () => {
        const oracle = await createOracle('TEST-9');
        await this.factory.addSigner(oracle.address, accounts[0], 'account[0] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[1], 'account[1] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[2], 'account[2] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[3], 'account[3] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[4], 'account[4] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[5], 'account[5] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[6], 'account[6] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[7], 'account[7] signer', { from: this.owner });
        await this.factory.provide(oracle.address, 100000, { from: accounts[0] });
        await this.factory.provide(oracle.address, 200000, { from: accounts[1] });
        await this.factory.provide(oracle.address, 300000, { from: accounts[2] });
        await this.factory.provide(oracle.address, 400000, { from: accounts[3] });
        await this.factory.provide(oracle.address, 500000, { from: accounts[4] });
        await this.factory.provide(oracle.address, 600000, { from: accounts[5] });
        await this.factory.provide(oracle.address, 700000, { from: accounts[6] });
        await this.factory.provide(oracle.address, 800000, { from: accounts[7] });
        const sample = await oracle.readSample();
        expect(sample[1]).to.eq.BN(bn(450000));
    });

    it('Should remove a signer and update rate, with uneven signers', async () => {
        const oracle = await createOracle('TEST-10');
        await this.factory.addSigner(oracle.address, accounts[0], 'account[0] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[1], 'account[1] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[2], 'account[2] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[3], 'account[3] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[4], 'account[4] signer', { from: this.owner });
        await this.factory.provide(oracle.address, 100000, { from: accounts[0] });
        await this.factory.provide(oracle.address, 250000, { from: accounts[1] });
        await this.factory.provide(oracle.address, 300000, { from: accounts[2] });
        await this.factory.provide(oracle.address, 450000, { from: accounts[3] });
        await this.factory.provide(oracle.address, 500000, { from: accounts[4] });
        await this.factory.removeSigner(oracle.address, accounts[2], { from: this.owner });
        const sample = await oracle.readSample();
        expect(sample[1]).to.eq.BN(bn(350000));
    });

    it('Should remove a signer and update rate, with even signers', async () => {
        const oracle = await createOracle('TEST-11');
        await this.factory.addSigner(oracle.address, accounts[0], 'account[0] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[1], 'account[1] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[2], 'account[2] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[3], 'account[3] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[4], 'account[4] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[5], 'account[5] signer', { from: this.owner });
        await this.factory.provide(oracle.address, 100000, { from: accounts[0] });
        await this.factory.provide(oracle.address, 250000, { from: accounts[1] });
        await this.factory.provide(oracle.address, 300000, { from: accounts[2] });
        await this.factory.provide(oracle.address, 450000, { from: accounts[3] });
        await this.factory.provide(oracle.address, 500000, { from: accounts[4] });
        await this.factory.provide(oracle.address, 550000, { from: accounts[5] });
        await this.factory.removeSigner(oracle.address, accounts[2], { from: this.owner });
        const sample = await oracle.readSample();
        expect(sample[1]).to.eq.BN(bn(450000));
    });

    it('Should remove a signer and update rate, with nine signers', async () => {
        const oracle = await createOracle('TEST-12');
        await this.factory.addSigner(oracle.address, accounts[0], 'account[0] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[1], 'account[1] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[2], 'account[2] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[3], 'account[3] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[4], 'account[4] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[5], 'account[5] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[6], 'account[6] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[7], 'account[7] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[8], 'account[8] signer', { from: this.owner });
        await this.factory.provide(oracle.address, 100000, { from: accounts[0] });
        await this.factory.provide(oracle.address, 200000, { from: accounts[1] });
        await this.factory.provide(oracle.address, 300000, { from: accounts[2] });
        await this.factory.provide(oracle.address, 400000, { from: accounts[3] });
        await this.factory.provide(oracle.address, 500000, { from: accounts[4] });
        await this.factory.provide(oracle.address, 600000, { from: accounts[5] });
        await this.factory.provide(oracle.address, 700000, { from: accounts[6] });
        await this.factory.provide(oracle.address, 800000, { from: accounts[7] });
        await this.factory.provide(oracle.address, 900000, { from: accounts[8] });
        await this.factory.removeSigner(oracle.address, accounts[2], { from: this.owner });
        const sample = await oracle.readSample();
        expect(sample[1]).to.eq.BN(bn(550000));
    });

    it('Should remove a signer and update rate, with ten signers', async () => {
        const oracle = await createOracle('TEST-12-B');
        await this.factory.addSigner(oracle.address, accounts[0], 'account[0] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[1], 'account[1] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[2], 'account[2] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[3], 'account[3] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[4], 'account[4] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[5], 'account[5] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[6], 'account[6] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[7], 'account[7] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[8], 'account[8] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[9], 'account[9] signer', { from: this.owner });
        await this.factory.provide(oracle.address, 100000, { from: accounts[0] });
        await this.factory.provide(oracle.address, 200000, { from: accounts[1] });
        await this.factory.provide(oracle.address, 300000, { from: accounts[2] });
        await this.factory.provide(oracle.address, 400000, { from: accounts[3] });
        await this.factory.provide(oracle.address, 500000, { from: accounts[4] });
        await this.factory.provide(oracle.address, 600000, { from: accounts[5] });
        await this.factory.provide(oracle.address, 700000, { from: accounts[6] });
        await this.factory.provide(oracle.address, 800000, { from: accounts[7] });
        await this.factory.provide(oracle.address, 900000, { from: accounts[8] });
        await this.factory.provide(oracle.address, 1000000, { from: accounts[9] });
        await this.factory.removeSigner(oracle.address, accounts[2], { from: this.owner });
        const sample = await oracle.readSample();
        expect(sample[1]).to.eq.BN(bn(600000));
    });
    it('Should update the value of the signer, with the same value', async () => {
        const oracle = await createOracle('TEST-13');
        await this.factory.addSigner(oracle.address, accounts[0], 'account[0] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[1], 'account[1] signer', { from: this.owner });
        await this.factory.provide(oracle.address, 100000, { from: accounts[0] });
        await this.factory.provide(oracle.address, 200000, { from: accounts[1] });
        await this.factory.provide(oracle.address, 100000, { from: accounts[0] });
        await this.factory.provide(oracle.address, 100000, { from: accounts[0] });
        await this.factory.provide(oracle.address, 100000, { from: accounts[0] });
        const sample = await oracle.readSample();
        expect(sample[1]).to.eq.BN(bn(150000));
    });
    it('Should update the value of the signer, with the same value', async () => {
        const oracle = await createOracle('TEST-14');
        await this.factory.addSigner(oracle.address, accounts[0], 'account[0] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[1], 'account[1] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[2], 'account[2] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[3], 'account[3] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[4], 'account[4] signer', { from: this.owner });
        await this.factory.provide(oracle.address, 100000, { from: accounts[0] });
        await this.factory.provide(oracle.address, 250000, { from: accounts[1] });
        await this.factory.provide(oracle.address, 300000, { from: accounts[2] });
        await this.factory.provide(oracle.address, 450000, { from: accounts[3] });
        await this.factory.provide(oracle.address, 500000, { from: accounts[4] });
        const sample = await oracle.readSample();
        expect(sample[1]).to.eq.BN(bn(300000));
        await this.factory.provide(oracle.address, 2000000, { from: accounts[0] });
        await this.factory.provide(oracle.address, 5000000, { from: accounts[1] });
        await this.factory.provide(oracle.address, 1000000, { from: accounts[2] });
        await this.factory.provide(oracle.address, 4000000, { from: accounts[3] });
        await this.factory.provide(oracle.address, 3100000, { from: accounts[4] });
        const sample2 = await oracle.readSample();
        expect(sample2[1]).to.eq.BN(bn(3100000));
    });
    it('Should update the value of the signer, with the same value, multiple times', async () => {
        const oracle = await createOracle('TEST-15');
        await this.factory.addSigner(oracle.address, accounts[0], 'account[0] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[1], 'account[1] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[2], 'account[2] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[3], 'account[3] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[4], 'account[4] signer', { from: this.owner });
        await this.factory.provide(oracle.address, 100000, { from: accounts[0] });
        await this.factory.provide(oracle.address, 250000, { from: accounts[1] });
        await this.factory.provide(oracle.address, 300000, { from: accounts[2] });
        await this.factory.provide(oracle.address, 450000, { from: accounts[3] });
        await this.factory.provide(oracle.address, 500000, { from: accounts[4] });
        const sample = await oracle.readSample();
        expect(sample[1]).to.eq.BN(bn(300000));
        await this.factory.provide(oracle.address, 2000000, { from: accounts[0] });
        await this.factory.provide(oracle.address, 5000000, { from: accounts[1] });
        await this.factory.provide(oracle.address, 1000000, { from: accounts[2] });
        await this.factory.provide(oracle.address, 4000000, { from: accounts[3] });
        await this.factory.provide(oracle.address, 3100000, { from: accounts[4] });
        const sample2 = await oracle.readSample();
        expect(sample2[1]).to.eq.BN(bn(3100000));
        await this.factory.provide(oracle.address, 10000, { from: accounts[0] });
        await this.factory.provide(oracle.address, 300100, { from: accounts[1] });
        await this.factory.provide(oracle.address, 200000, { from: accounts[2] });
        await this.factory.provide(oracle.address, 400000, { from: accounts[3] });
        await this.factory.provide(oracle.address, 5000000, { from: accounts[4] });
        const sample3 = await oracle.readSample();
        expect(sample3[1]).to.eq.BN(bn(300100));
    });
    it('Should provide multiple values to the oracles', async () => {
        const oracleA = await createOracle('TEST-16-A');
        const oracleB = await createOracle('TEST-16-B');
        await this.factory.addSigner(oracleA.address, accounts[0], 'account[0] signer', { from: this.owner });
        await this.factory.addSigner(oracleA.address, accounts[1], 'account[1] signer', { from: this.owner });
        await this.factory.addSigner(oracleB.address, accounts[0], 'account[0] signer', { from: this.owner });
        await this.factory.addSigner(oracleB.address, accounts[1], 'account[1] signer', { from: this.owner });
        await this.factory.provideMultiple(
            [
                `${toUint96(100000)}${oracleA.address.replace('0x', '')}`,
                `${toUint96(200)}${oracleB.address.replace('0x', '')}`,
            ], {
                from: accounts[0],
            }
        );
        await this.factory.provideMultiple(
            [
                `${toUint96(200000)}${oracleA.address.replace('0x', '')}`,
                `${toUint96(100)}${oracleB.address.replace('0x', '')}`,
            ], {
                from: accounts[1],
            }
        );
        const sampleA = await oracleA.readSample();
        expect(sampleA[1]).to.eq.BN(bn(150000));
        const sampleB = await oracleB.readSample();
        expect(sampleB[1]).to.eq.BN(bn(150));
    });
    it('Should revert on duplicated oracle', async () => {
        await createOracle('TEST-DUPLICATED');
        await Helper.tryCatchRevert(createOracle('TEST-DUPLICATED'), 'Oracle already exists');
    });
    it('Should fail to provide from invalid signer', async () => {
        const oracle = await createOracle('TEST-INVALID-SIGNER');
        await this.factory.addSigner(oracle.address, accounts[0], 'account[0] signer', { from: this.owner });
        await Helper.tryCatchRevert(this.factory.provide(oracle.address, 100000, { from: accounts[1] }), 'signer not valid');
    });
    it('Should fail to provide multiple from invalid signer', async () => {
        const oracleA = await createOracle('TEST-INVALID-SIGNER-A');
        const oracleB = await createOracle('TEST-INVALID-SIGNER-B');
        await this.factory.addSigner(oracleA.address, accounts[0], 'account[0] signer', { from: this.owner });
        await Helper.tryCatchRevert(this.factory.provideMultiple(
            [
                `${toUint96(100000)}${oracleA.address.replace('0x', '')}`,
                `${toUint96(200)}${oracleB.address.replace('0x', '')}`,
            ], {
                from: accounts[0],
            }
        ), 'signer not valid');
    });
    it('Should fail if provided rate is zero', async () => {
        const oracle = await createOracle('TEST-RATE-ZERO');
        await this.factory.addSigner(oracle.address, accounts[0], 'account[0] signer', { from: this.owner });
        await Helper.tryCatchRevert(this.factory.provide(oracle.address, 0, { from: accounts[0] }), 'rate can\'t be zero');
    });
    it('Should fail if provided rate overflows uint96', async () => {
        const oracle = await createOracle('TEST-RATE-TOO-HIGH');
        await this.factory.addSigner(oracle.address, accounts[0], 'account[0] signer', { from: this.owner });
        await Helper.tryCatchRevert(this.factory.provide(oracle.address, bn(2).pow(bn(96)), { from: accounts[0] }), 'rate too high');
    });
    it('Should fail to create if symbol is too long', async () => {
        await Helper.tryCatchRevert(createOracle('TEST-CREATE-ORACLE-WITH-SYMBOL-TOO-LONG'), 'string too long');
    });
    describe('Upgrade oracle', async () => {
        it('It should upgrade an Oracle', async () => {
            const oldOracle = await createOracle('TEST-UPGRADE-1-OLD');
            const newOracle = await createOracle('TEST-UPGRADE-1-NEW');

            await this.factory.setUpgrade(oldOracle.address, newOracle.address, { from: this.owner });

            await this.factory.addSigner(newOracle.address, accounts[0], 'signer 0', { from: this.owner });
            await this.factory.provide(newOracle.address, 100000, { from: accounts[0] });

            expect(await oldOracle.upgrade()).to.be.equal(newOracle.address);

            const sample1 = await newOracle.readSample();
            expect(sample1[1]).to.eq.BN(bn(100000));

            const sample2 = await oldOracle.readSample();
            expect(sample2[1]).to.eq.BN(bn(100000));
        });
        it('It should fail to upgrade using factory if not the owner', async () => {
            const oldOracle = await createOracle('TEST-UPGRADE-2-OLD');
            const newOracle = await createOracle('TEST-UPGRADE-2-NEW');

            await Helper.tryCatchRevert(this.factory.setUpgrade(oldOracle.address, newOracle.address), 'The owner should be the sender');
        });
        it('It should fail to upgrade if not the owner', async () => {
            const oldOracle = await createOracle('TEST-UPGRADE-3-OLD');
            const newOracle = await createOracle('TEST-UPGRADE-3-NEW');

            await Helper.tryCatchRevert(oldOracle.setUpgrade(newOracle.address), 'The owner should be the sender');
        });
    });
    describe('Handle signers', async () => {
        it('It should revert if signed is added twice', async () => {
            const oracle = await createOracle('TEST-SIGNERS-1');
            await this.factory.addSigner(oracle.address, accounts[0], 'signer accounts[0]', { from: this.owner });
            await Helper.tryCatchRevert(this.factory.addSigner(oracle.address, accounts[0], 'signer [0]', { from: this.owner }), 'signer already defined');
        });
        it('Should fail to remove a signer twice', async () => {
            const oracle = await createOracle('TEST-SIGNERS-2');
            await this.factory.addSigner(oracle.address, accounts[2], 'account[2] signer', { from: this.owner });
            await this.factory.removeSigner(oracle.address, accounts[2], { from: this.owner });
            await Helper.tryCatchRevert(this.factory.removeSigner(oracle.address, accounts[2], { from: this.owner }), 'address is not a signer');
        });
        it('Should add multiple signers at once', async () => {
            const oracleA = await createOracle('TEST-SIGNERS-3A');
            const oracleB = await createOracle('TEST-SIGNERS-3B');
            const oracleC = await createOracle('TEST-SIGNERS-3C');

            await this.factory.addSignerToOracles(
                [
                    oracleA.address,
                    oracleB.address,
                    oracleC.address,
                ],
                accounts[2],
                'account[2] signer',
                {
                    from: this.owner,
                }
            );

            expect(await oracleA.isSigner(accounts[2])).to.be.equal(true);
            expect(await oracleB.isSigner(accounts[2])).to.be.equal(true);
            expect(await oracleC.isSigner(accounts[2])).to.be.equal(true);
        });
        it('Should remove multiple signers at once', async () => {
            const oracleA = await createOracle('TEST-SIGNERS-4A');
            const oracleB = await createOracle('TEST-SIGNERS-4B');
            const oracleC = await createOracle('TEST-SIGNERS-4C');

            await this.factory.addSignerToOracles(
                [
                    oracleA.address,
                    oracleB.address,
                    oracleC.address,
                ],
                accounts[2],
                'account[2] signer',
                {
                    from: this.owner,
                }
            );

            await this.factory.removeSignerFromOracles(
                [
                    oracleA.address,
                    oracleB.address,
                    oracleC.address,
                ],
                accounts[2],
                {
                    from: this.owner,
                }
            );

            expect(await oracleA.isSigner(accounts[2])).to.be.equal(false);
            expect(await oracleB.isSigner(accounts[2])).to.be.equal(false);
            expect(await oracleC.isSigner(accounts[2])).to.be.equal(false);
        });
        it('Should fail to add multiple signers if caller is not the owner', async () => {
            const oracleA = await createOracle('TEST-SIGNERS-5A');
            const oracleB = await createOracle('TEST-SIGNERS-5B');
            const oracleC = await createOracle('TEST-SIGNERS-5C');

            await Helper.tryCatchRevert(this.factory.addSignerToOracles(
                [
                    oracleA.address,
                    oracleB.address,
                    oracleC.address,
                ],
                accounts[2],
                'account[2] signer',
                {
                    from: accounts[2],
                }
            ), 'The owner should be the sender');

            expect(await oracleA.isSigner(accounts[2])).to.be.equal(false);
            expect(await oracleB.isSigner(accounts[2])).to.be.equal(false);
            expect(await oracleC.isSigner(accounts[2])).to.be.equal(false);
        });
        it('Should fail to remove multiple signers if caller is not the owner', async () => {
            const oracleA = await createOracle('TEST-SIGNERS-6A');
            const oracleB = await createOracle('TEST-SIGNERS-6B');
            const oracleC = await createOracle('TEST-SIGNERS-6C');

            await this.factory.addSignerToOracles(
                [
                    oracleA.address,
                    oracleB.address,
                    oracleC.address,
                ],
                accounts[2],
                'account[2] signer',
                {
                    from: this.owner,
                }
            );

            await Helper.tryCatchRevert(this.factory.removeSignerFromOracles(
                [
                    oracleA.address,
                    oracleB.address,
                    oracleC.address,
                ],
                accounts[2],
                {
                    from: accounts[2],
                }
            ), 'The owner should be the sender');

            expect(await oracleA.isSigner(accounts[2])).to.be.equal(true);
            expect(await oracleB.isSigner(accounts[2])).to.be.equal(true);
            expect(await oracleC.isSigner(accounts[2])).to.be.equal(true);
        });
    });
    describe('Handle usernames', async () => {
        it('Should set the name of a signer', async () => {
            const oracle = await createOracle('TEST-NAME-1');

            await this.factory.addSigner(oracle.address, accounts[0], 'this is the first name', { from: this.owner });
            expect(await oracle.nameOfSigner(accounts[0])).to.be.equal('this is the first name');
            expect(await oracle.signerWithName('this is the first name')).to.be.equal(accounts[0]);
        });
        it('Should update the name of a signer', async () => {
            const oracle = await createOracle('TEST-NAME-2');

            await this.factory.addSigner(oracle.address, accounts[0], 'this is the first name', { from: this.owner });
            await this.factory.setName(oracle.address, accounts[0], 'this is the updated name', { from: this.owner });
            expect(await oracle.nameOfSigner(accounts[0])).to.be.equal('this is the updated name');
            expect(await oracle.signerWithName('this is the updated name')).to.be.equal(accounts[0]);
        });
        it('Should fail to use already used name', async () => {
            const oracle = await createOracle('TEST-NAME-3');

            await this.factory.addSigner(oracle.address, accounts[0], 'name 1', { from: this.owner });
            await Helper.tryCatchRevert(this.factory.addSigner(oracle.address, accounts[1], 'name 1', { from: this.owner }), 'name already in use');

            await this.factory.addSigner(oracle.address, accounts[1], 'name 2', { from: this.owner });
            await Helper.tryCatchRevert(this.factory.setName(oracle.address, accounts[1], 'name 1', { from: this.owner }), 'name already in use');
        });
        it('Should fail to use an empty name', async () => {
            const oracle = await createOracle('TEST-NAME-4');

            await Helper.tryCatchRevert(this.factory.addSigner(oracle.address, accounts[1], '', { from: this.owner }), 'name can\'t be empty');

            await this.factory.addSigner(oracle.address, accounts[1], 'name 2', { from: this.owner });
            await Helper.tryCatchRevert(this.factory.setName(oracle.address, accounts[1], '', { from: this.owner }), 'name can\'t be empty');
        });
        it('Should fail to set username of a non-existant signer', async () => {
            const oracle = await createOracle('TEST-NAME-5');
            await Helper.tryCatchRevert(this.factory.setName(oracle.address, accounts[1], '', { from: this.owner }), 'signer not defined');
        });
    });
    describe('Read and set metadta', async () => {
        it('It should create an Oracle with metadata', async () => {
            const event = await this.factory.newOracle(
                'SYMBOL',
                'This is the Currency name',
                32,
                '0xF970b8E36e23F7fC3FD752EeA86f8Be8D83375A6',
                'This is the maintainer metadata',
                { from: this.owner }
            );

            const oracle = await Oracle.at(event.logs.find(l => l.event === 'NewOracle').args._oracle);

            expect(await oracle.symbol()).to.be.equal('SYMBOL');
            expect(await oracle.name()).to.be.equal('This is the Currency name');
            expect(await oracle.decimals()).to.eq.BN(bn(32));
            expect(await oracle.token()).to.be.equal('0xF970b8E36e23F7fC3FD752EeA86f8Be8D83375A6');
            expect(await oracle.currency()).to.be.equal('0x53594d424f4c0000000000000000000000000000000000000000000000000000');
            expect(await oracle.maintainer()).to.be.equal('This is the maintainer metadata');
        });
        it('It should update the oracle metadata', async () => {
            const event = await this.factory.newOracle(
                'TEST-METADATA-2',
                'This is the Currency name',
                32,
                '0xF970b8E36e23F7fC3FD752EeA86f8Be8D83375A6',
                'This is the maintainer metadata',
                { from: this.owner }
            );

            const oracle = await Oracle.at(event.logs.find(l => l.event === 'NewOracle').args._oracle);

            await this.factory.setMetadata(
                oracle.address,
                'This is the new currency name',
                22,
                'This is the new maintainer metadata',
                {
                    from: this.owner,
                }
            );

            expect(await oracle.symbol()).to.be.equal('TEST-METADATA-2');
            expect(await oracle.name()).to.be.equal('This is the new currency name');
            expect(await oracle.decimals()).to.eq.BN(bn(22));
            expect(await oracle.token()).to.be.equal('0xF970b8E36e23F7fC3FD752EeA86f8Be8D83375A6');
            expect(await oracle.currency()).to.be.equal('0x544553542d4d455441444154412d320000000000000000000000000000000000');
            expect(await oracle.maintainer()).to.be.equal('This is the new maintainer metadata');
        });
        it('Only owner should be able to update metadata', async () => {
            const oracle = await createOracle('TEST-METADATA-3');
            await Helper.tryCatchRevert(
                this.factory.setMetadata(
                    oracle.address,
                    'This is the new currency name',
                    22,
                    'This is the new maintainer metadata',
                    {
                        from: accounts[0],
                    }
                ),
                'The owner should be the sender'
            );
        });
        it('Only factory should be able to update metadata on oracle', async () => {
            const oracle = await createOracle('TEST-METADATA-4');
            await Helper.tryCatchRevert(
                oracle.setMetadata(
                    'This is the new currency name',
                    22,
                    'This is the new maintainer metadata',
                    {
                        from: this.owner,
                    }
                ),
                'The owner should be the sender'
            );
        });
        it('It should return an empty Oracle URL', async () => {
            const oracle = await createOracle('TEST-METADATA-6');
            expect(await oracle.url()).to.be.equal('');
        });
    });
    describe('Pausable oracle', async () => {
        it('It start unpaused', async () => {
            expect(await this.factory.paused()).to.be.equal(false);
        });
        it('It should be pausable by Owner', async () => {
            await this.factory.pause({ from: this.owner });
            expect(await this.factory.paused()).to.be.equal(true);

            // restart
            await this.factory.start({ from: this.owner });
        });
        it('It should be pausable by Pauser', async () => {
            await this.factory.setPauser(accounts[0], true, { from: this.owner });
            await this.factory.pause({ from: accounts[0] });

            expect(await this.factory.paused()).to.be.equal(true);

            // restart
            await this.factory.start({ from: this.owner });
        });
        it('Should fail to get sample if paused', async () => {
            const oracle = await createOracle('TEST-PAUSABLE-3');

            await this.factory.pause({ from: this.owner });

            await this.factory.addSigner(oracle.address, accounts[0], 'account[0] signer', { from: this.owner });
            await this.factory.provide(oracle.address, 100000, { from: accounts[0] });

            await Helper.tryCatchRevert(oracle.readSample(), 'contract paused');

            // restart
            await this.factory.start({ from: this.owner });
        });
        it('Owner should be able to start contract', async () => {
            await this.factory.pause({ from: this.owner });

            expect(await this.factory.paused()).to.be.equal(true);

            await this.factory.start({ from: this.owner });

            expect(await this.factory.paused()).to.be.equal(false);
        });
        it('Pauser should fail to start contract', async () => {
            await this.factory.setPauser(accounts[0], true, { from: this.owner });
            await this.factory.pause({ from: accounts[0] });

            expect(await this.factory.paused()).to.be.equal(true);

            await Helper.tryCatchRevert(this.factory.start({ from: accounts[0] }), 'The owner should be the sender');

            expect(await this.factory.paused()).to.be.equal(true);

            // restart
            await this.factory.start({ from: this.owner });
        });
        it('It should remove pauser', async () => {
            await this.factory.setPauser(accounts[0], false, { from: this.owner });
            await Helper.tryCatchRevert(this.factory.pause({ from: accounts[0] }), 'not authorized to pause');
            expect(await this.factory.paused()).to.be.equal(false);
        });
        it('It should be individually pausable by Owner', async () => {
            const oracleA = await createOracle('TEST-IND-PAUSE-1A');
            const oracleB = await createOracle('TEST-IND-PAUSE-1B');

            // Provide rates to the oracles
            await this.factory.addSigner(oracleA.address, accounts[0], 'account[0] signer', { from: this.owner });
            await this.factory.addSigner(oracleB.address, accounts[0], 'account[0] signer', { from: this.owner });
            await this.factory.provide(oracleA.address, 100);
            await this.factory.provide(oracleB.address, 100);

            // Pause oracle A
            await this.factory.pauseOracle(oracleA.address, { from: this.owner });
            expect(await oracleA.paused()).to.be.equal(true);
            expect(await oracleB.paused()).to.be.equal(false);

            // Oracle A should revert on readSample, oracle B should keep working
            await Helper.tryCatchRevert(oracleA.readSample(), 'contract paused');
            const sampleB = await oracleB.readSample();
            expect(sampleB[1]).to.eq.BN(bn(100));
        });
        it('It should be individually pausable by Pauser', async () => {
            const oracleA = await createOracle('TEST-IND-PAUSE-2A');
            const oracleB = await createOracle('TEST-IND-PAUSE-2B');

            // Provide rates to the oracles
            await this.factory.addSigner(oracleA.address, accounts[0], 'account[0] signer', { from: this.owner });
            await this.factory.addSigner(oracleB.address, accounts[0], 'account[0] signer', { from: this.owner });
            await this.factory.provide(oracleA.address, 100);
            await this.factory.provide(oracleB.address, 100);

            // Set pauser
            await this.factory.setPauser(accounts[1], true, { from: this.owner });

            // Pause oracle A
            await this.factory.pauseOracle(oracleA.address, { from: accounts[1] });
            expect(await oracleA.paused()).to.be.equal(true);
            expect(await oracleB.paused()).to.be.equal(false);

            // Remove pauser
            await this.factory.setPauser(accounts[1], false, { from: this.owner });

            // Oracle A should revert on readSample, oracle B should keep working
            await Helper.tryCatchRevert(oracleA.readSample(), 'contract paused');
            const sampleB = await oracleB.readSample();
            expect(sampleB[1]).to.eq.BN(bn(100));
        });
        it('Should fail to be paused by non-pauser', async () => {
            const oracle = await createOracle('TEST-IND-PAUSE-3');
            await Helper.tryCatchRevert(this.factory.pauseOracle(oracle.address, { from: accounts[1] }), 'not authorized to pause');
        });
        it('Should fail to restart by pauser', async () => {
            const oracle = await createOracle('TEST-IND-PAUSE-4');
            await this.factory.setPauser(accounts[1], true, { from: this.owner });
            await this.factory.pauseOracle(oracle.address, { from: accounts[1] });
            await Helper.tryCatchRevert(this.factory.startOracle(oracle.address, { from: accounts[1] }), 'The owner should be the sender');
            expect(await oracle.paused()).to.be.equal(true);
        });
        it('Should fail to restart by pauser calling oracle directly', async () => {
            const oracle = await createOracle('TEST-IND-PAUSE-5');
            await this.factory.setPauser(accounts[1], true, { from: this.owner });
            await this.factory.pauseOracle(oracle.address, { from: accounts[1] });
            await Helper.tryCatchRevert(oracle.start({ from: accounts[1] }), 'The owner should be the sender');
            expect(await oracle.paused()).to.be.equal(true);
        });
        it('Should restart by owner', async () => {
            const oracle = await createOracle('TEST-IND-PAUSE-6');
            await this.factory.setPauser(accounts[1], true, { from: this.owner });
            await this.factory.pauseOracle(oracle.address, { from: accounts[1] });
            await this.factory.startOracle(oracle.address, { from: this.owner });
            expect(await oracle.paused()).to.be.equal(false);
        });
        it('Should fail to be paused by calling oracle directly', async () => {
            const oracle = await createOracle('TEST-IND-PAUSE-7');
            await Helper.tryCatchRevert(oracle.pause({ from: this.owner }), 'not authorized to pause');
        });
    });
});
