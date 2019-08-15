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
        const event = await this.factory.newOracle(symbol, { from: this.owner });
        return Oracle.at(event.logs.find(l => l.event === 'NewOracle').args._oracle);
    }

    it('Should return single rate with a single provider', async () => {
        const oracle = await createOracle('TEST-1');
        await this.factory.addSigner(oracle.address, accounts[0], 'account[0] signer', { from: this.owner });
        await this.factory.provide(oracle.address, 100000);
        const sample = await oracle.readSample();
        expect(sample[1]).to.eq.BN(bn(100000));
    });

    it('Should return average rate with a two providers', async () => {
        const oracle = await createOracle('TEST-2');
        await this.factory.addSigner(oracle.address, accounts[0], 'account[0] signer', { from: this.owner });
        await this.factory.addSigner(oracle.address, accounts[1], 'account[1] signer', { from: this.owner });
        await this.factory.provide(oracle.address, 100000, { from: accounts[0] });
        await this.factory.provide(oracle.address, 200000, { from: accounts[1] });
        const sample = await oracle.readSample();
        expect(sample[1]).to.eq.BN(bn(150000));
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
    });
});
