const Pausable = artifacts.require('./commons/Pausable.sol');
const Helper = require('./Helper.js');

contract('Pausable', function (accounts) {
    it('Should be pausable by pauser', async () => {
        const pausable = await Pausable.new();
        await pausable.setPauser(accounts[1], true);
        await pausable.pause({ from: accounts[1] });
        expect(await pausable.canPause(accounts[1])).to.be.equal(true);
        expect(await pausable.paused()).to.be.equal(true);
    });
    it('Should be pausable by owner', async () => {
        const pausable = await Pausable.new();
        await pausable.pause();
        expect(await pausable.paused()).to.be.equal(true);
    });
    it('Should not be pausable by any user', async () => {
        const pausable = await Pausable.new();
        await Helper.tryCatchRevert(pausable.pause({ from: accounts[2] }), 'not authorized to pause');
        expect(await pausable.canPause(accounts[2])).to.be.equal(false);
        expect(await pausable.paused()).to.be.equal(false);
    });
    it('Should be restartable by owner', async () => {
        const pausable = await Pausable.new();
        await pausable.pause();
        expect(await pausable.paused()).to.be.equal(true);
        await pausable.start();
        expect(await pausable.paused()).to.be.equal(false);
    });
    it('Should not be restartable by pauser', async () => {
        const pausable = await Pausable.new();
        await pausable.setPauser(accounts[1], true);
        await pausable.pause({ from: accounts[1] });
        expect(await pausable.canPause(accounts[1])).to.be.equal(true);
        expect(await pausable.paused()).to.be.equal(true);
        await Helper.tryCatchRevert(pausable.start({ from: accounts[1] }), 'The owner should be the sender');
        expect(await pausable.paused()).to.be.equal(true);
    });
    it('Should not be restartable by external', async () => {
        const pausable = await Pausable.new();
        await pausable.pause();
        expect(await pausable.paused()).to.be.equal(true);
        await Helper.tryCatchRevert(pausable.start({ from: accounts[2] }), 'The owner should be the sender');
        expect(await pausable.paused()).to.be.equal(true);
    });
    it('Should fail to start if not paused', async () => {
        const pausable = await Pausable.new();
        await Helper.tryCatchRevert(pausable.start(), 'not paused');
        expect(await pausable.paused()).to.be.equal(false);
    });
    it('Should fail to pause if paused', async () => {
        const pausable = await Pausable.new();
        await pausable.pause();
        await Helper.tryCatchRevert(pausable.pause(), 'already paused');
        expect(await pausable.paused()).to.be.equal(true);
    });
});
