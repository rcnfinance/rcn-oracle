const Oracle = artifacts.require('./MultiSourceOracle.sol');
const Factory = artifacts.require('./OracleFactory.sol');
const { BN } = require('openzeppelin-test-helpers');
const { expect } = require('chai');

function perm(xs) {
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
/* eslint guard-for-in: */
// TODO: make refactor
contract('Multi Source Oracle', function (accounts) {

    async function createOracle (symbol) {
        const event = await this.factory.newOracle(
            symbol,
            symbol,
            18,
            accounts[3],
            'maintainer',
            { from: this.owner }
        );

        return Oracle.at(event.logs.find(l => l.event === 'NewOracle').args._oracle);
    }

    before(async () => {
        this.owner = accounts[9];
        this.factory = await Factory.new({ from: this.owner });
    });

    it('Should return the median rate with a three providers', async () => {
        const oracle = await createOracle('TEST-3');
        await this.factory.addSigner(oracle.address, accounts[0], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[1], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[2], { from: this.owner });
        await this.factory.provide(oracle.address, 100000, { from: accounts[0] });
        await this.factory.provide(oracle.address, 300000, { from: accounts[2] });
        await this.factory.provide(oracle.address, 200000, { from: accounts[1] });
        const sample = await oracle.readSample();
        expect(sample[1]).to.be.bignumber.equal(new BN(200000));
    });

    it('Should set an retrieve metadata', async () => {
        const event = await this.factory.newOracle(
            'TEST-META',
            'Test oracle metadata',
            18,
            accounts[5],
            'Test maintainer field',
            { from: this.owner }
        );

        const oracle = await Oracle.at(event.logs.find(l => l.event === 'NewOracle').args._oracle);
        expect(await oracle.symbol()).to.be.equal('TEST-META');
        expect(await oracle.name()).to.be.equal('Test oracle metadata');
        expect(await oracle.decimals()).to.be.bignumber.equal(new BN(18));
        expect(await oracle.token()).to.be.equal(accounts[5]);
        expect(await oracle.maintainer()).to.equal('Test maintainer field');

        // Change name and maintainer
        await this.factory.setMaintainer(oracle.address, 'test maintaner updated', { from: this.owner });
        await this.factory.setName(oracle.address, 'test update name', { from: this.owner });
    });

    it('Should return single rate with a single provider', async () => {
        const oracle = await createOracle('TEST-1');
        const amount = new BN(100000);
        await this.factory.addSigner(oracle.address, accounts[0], { from: this.owner });
        await this.factory.provide(oracle.address, amount);
        const sample = await oracle.readSample();
        expect(sample[1]).to.be.bignumber.equal(amount);
    });

    it('Should return average rate with a two providers', async () => {
        const oracle = await createOracle('TEST-2');
        await this.factory.addSigner(oracle.address, accounts[0], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[1], { from: this.owner });
        await this.factory.provide(oracle.address, 200000, { from: accounts[1] });
        await this.factory.provide(oracle.address, 100000, { from: accounts[0] });
        const sample = await oracle.readSample();
        expect(sample[1]).to.be.bignumber.equal(new BN(150000));
    });

    it('Should return the median rate with a three providers, regardless the order', async () => {
        const provided = perm([200000, 100000, 300000]);
        for (const i in provided) {
            const provide = provided[i];
            const oracle = await createOracle(`TEST-4-${i}`);
            await this.factory.addSigner(oracle.address, accounts[0], { from: this.owner });
            await this.factory.addSigner(oracle.address, accounts[1], { from: this.owner });
            await this.factory.addSigner(oracle.address, accounts[2], { from: this.owner });
            await this.factory.provide(oracle.address, provide[0], { from: accounts[1] });
            await this.factory.provide(oracle.address, provide[1], { from: accounts[0] });
            await this.factory.provide(oracle.address, provide[2], { from: accounts[2] });
            const sample = await oracle.readSample();

            expect(sample[1]).to.be.bignumber.equal(new BN(200000));
        }
    });

    it('Should return the average of the two median rate with a four providers', async () => {
        const oracle = await createOracle('TEST-5');
        await this.factory.addSigner(oracle.address, accounts[0], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[1], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[2], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[3], { from: this.owner });
        await this.factory.provide(oracle.address, 100000, { from: accounts[0] });
        await this.factory.provide(oracle.address, 200000, { from: accounts[1] });
        await this.factory.provide(oracle.address, 300000, { from: accounts[2] });
        await this.factory.provide(oracle.address, 400000, { from: accounts[3] });
        const sample = await oracle.readSample();
        expect(sample[1]).to.be.bignumber.equal(new BN(250000));
    });

    it('Should return the average of the two median rate with a four providers, regardless the order', async () => {
            
        const provided = perm([200000, 100000, 300000, 400000]);
        for (const i in provided) {
            const provide = provided[i];
            const oracle = await createOracle(`TEST-6-${i}`);
            await this.factory.addSigner(oracle.address, accounts[0], { from: this.owner });
            await this.factory.addSigner(oracle.address, accounts[1], { from: this.owner });
            await this.factory.addSigner(oracle.address, accounts[2], { from: this.owner });
            await this.factory.addSigner(oracle.address, accounts[3], { from: this.owner });
            await this.factory.provide(oracle.address, provide[0], { from: accounts[0] });
            await this.factory.provide(oracle.address, provide[1], { from: accounts[1] });
            await this.factory.provide(oracle.address, provide[2], { from: accounts[2] });
            await this.factory.provide(oracle.address, provide[3], { from: accounts[3] });
            const sample = await oracle.readSample();
            expect(sample[1]).to.be.bignumber.equal(new BN(250000));
        }
    });

    it('Should return the median rate with a five providers', async () => {
        const oracle = await createOracle('TEST-7');
        await this.factory.addSigner(oracle.address, accounts[0], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[1], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[2], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[3], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[4], { from: this.owner });
        await this.factory.provide(oracle.address, 100000, { from: accounts[0] });
        await this.factory.provide(oracle.address, 200000, { from: accounts[1] });
        await this.factory.provide(oracle.address, 300000, { from: accounts[2] });
        await this.factory.provide(oracle.address, 400000, { from: accounts[3] });
        await this.factory.provide(oracle.address, 500000, { from: accounts[4] });
        const sample = await oracle.readSample();
        expect(sample[1]).to.be.bignumber.equal(new BN(300000));
    });

    it('Should return the median rate with a five providers, regardless the order', async () => {
        const provided = perm([200000, 100000, 300000, 400000, 500000]);
        for (const i in provided) {
            const provide = provided[i];
            const oracle = await createOracle(`TEST-8-${i}`);
            await this.factory.addSigner(oracle.address, accounts[0], { from: this.owner });
            await this.factory.addSigner(oracle.address, accounts[1], { from: this.owner });
            await this.factory.addSigner(oracle.address, accounts[2], { from: this.owner });
            await this.factory.addSigner(oracle.address, accounts[3], { from: this.owner });
            await this.factory.addSigner(oracle.address, accounts[4], { from: this.owner });
            await this.factory.provide(oracle.address, provide[0], { from: accounts[0] });
            await this.factory.provide(oracle.address, provide[1], { from: accounts[1] });
            await this.factory.provide(oracle.address, provide[2], { from: accounts[2] });
            await this.factory.provide(oracle.address, provide[3], { from: accounts[3] });
            await this.factory.provide(oracle.address, provide[4], { from: accounts[4] });
            const sample = await oracle.readSample();
            expect(sample[1]).to.be.bignumber.equal(new BN(300000));
        }
    });

    it('Should return the median rate with a eight providers', async () => {
        const oracle = await createOracle('TEST-9');
        await this.factory.addSigner(oracle.address, accounts[0], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[1], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[2], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[3], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[4], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[5], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[6], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[7], { from: this.owner });
        await this.factory.provide(oracle.address, 100000, { from: accounts[0] });
        await this.factory.provide(oracle.address, 200000, { from: accounts[1] });
        await this.factory.provide(oracle.address, 300000, { from: accounts[2] });
        await this.factory.provide(oracle.address, 400000, { from: accounts[3] });
        await this.factory.provide(oracle.address, 500000, { from: accounts[4] });
        await this.factory.provide(oracle.address, 600000, { from: accounts[5] });
        await this.factory.provide(oracle.address, 700000, { from: accounts[6] });
        await this.factory.provide(oracle.address, 800000, { from: accounts[7] });
        const sample = await oracle.readSample();
        expect(sample[1]).to.be.bignumber.equal(new BN(450000));
    });

    it('Should remove a signer and update rate, with uneven signers', async () => {
        const oracle = await createOracle('TEST-10');
        await this.factory.addSigner(oracle.address, accounts[0], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[1], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[2], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[3], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[4], { from: this.owner });
        await this.factory.provide(oracle.address, 100000, { from: accounts[0] });
        await this.factory.provide(oracle.address, 250000, { from: accounts[1] });
        await this.factory.provide(oracle.address, 300000, { from: accounts[2] });
        await this.factory.provide(oracle.address, 450000, { from: accounts[3] });
        await this.factory.provide(oracle.address, 500000, { from: accounts[4] });
        await this.factory.removeSigner(oracle.address, accounts[2], { from: this.owner });
        const sample = await oracle.readSample();
        expect(sample[1]).to.be.bignumber.equal(new BN(350000));
    });

    it('Should remove a signer and update rate, with even signers', async () => {
        const oracle = await createOracle('TEST-11');
        await this.factory.addSigner(oracle.address, accounts[0], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[1], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[2], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[3], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[4], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[5], { from: this.owner });
        await this.factory.provide(oracle.address, 100000, { from: accounts[0] });
        await this.factory.provide(oracle.address, 250000, { from: accounts[1] });
        await this.factory.provide(oracle.address, 300000, { from: accounts[2] });
        await this.factory.provide(oracle.address, 450000, { from: accounts[3] });
        await this.factory.provide(oracle.address, 500000, { from: accounts[4] });
        await this.factory.provide(oracle.address, 550000, { from: accounts[5] });
        await this.factory.removeSigner(oracle.address, accounts[2], { from: this.owner });
        const sample = await oracle.readSample();
        expect(sample[1]).to.be.bignumber.equal(new BN(450000));
    });

    it('Should remove a signer and update rate, with nine signers', async () => {
        const oracle = await createOracle('TEST-12');
        await this.factory.addSigner(oracle.address, accounts[0], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[1], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[2], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[3], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[4], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[5], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[6], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[7], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[8], { from: this.owner });
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
        expect(sample[1]).to.be.bignumber.equal(new BN(550000));
    });

    it('Should remove a signer and update rate, with ten signers', async () => {
        const oracle = await createOracle('TEST-12');
        await this.factory.addSigner(oracle.address, accounts[0], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[1], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[2], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[3], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[4], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[5], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[6], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[7], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[8], { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[9], { from: this.owner });
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
        expect(sample[1]).to.be.bignumber.equal(new BN(600000));
    });
});
