pragma solidity 0.5.12;

import "truffle/Assert.sol";
import "../contracts/commons/SortedList.sol";


contract TestSortedList {
    using SortedList for SortedList.List;

    uint256 nonce;
    mapping(uint256 => SortedList.List) lists;

    function getList() private returns (SortedList.List storage) {
        nonce = nonce + 1;
        return lists[nonce];
    }

    uint256 integrityNonce;
    mapping(uint256 => mapping(uint256 => bool)) integritySet;

    function checkIntegrity(SortedList.List storage list) private {
        uint256 nonce = integrityNonce;
        integrityNonce = nonce + 1;

        uint256 count;
        uint256 lastVal;

        // Iterate full list
        uint256 c = 0;
        uint256 next = list.links[c];

        // Iterate until finding last entry
        while (next != 0) {
            // Check if entry only appears once
            Assert.isFalse(integritySet[nonce][next], "entry appeared two times");
            integritySet[nonce][next] = true;

            // Check if entry appears as existing
            Assert.isTrue(list.exists[next], "entry appears as non-existing");

            // Check if left entry is lower
            Assert.isAtMost(lastVal, list.get(next), "entry should be lower than the next one");
            lastVal = list.get(next);

            // Should be the node at a given position
            Assert.equal(next, list.nodeAt(count), "should be node at position");

            // Load next entry
            c = next;
            next = list.links[c];
            count = count + 1;
        }

        Assert.equal(list.size, count, "list size should be equal to the defined size");
    }

    function testInsertAndGetNode() external {
        SortedList.List storage list = getList();
        uint256 node = 4000;
        uint256 value = 9000;

        list.set(node, value);

        Assert.equal(list.get(node), value, "list get should return the node value");
        checkIntegrity(list);
    }

    function testInsertAndGetMedian() external {
        SortedList.List storage list = getList();
        uint256 node = 4001;
        uint256 value = 10000;

        list.set(node, value);

        Assert.equal(list.median(), value, "median should be the only node value");
        checkIntegrity(list);
    }

    function testInsertAndGetSize() external {
        SortedList.List storage list = getList();
        uint256 node = 4001;
        uint256 value = 10000;

        list.set(node, value);

        Assert.equal(list.size, 1, "size should be one");
        checkIntegrity(list);
    }

    function testInserTwoAndGetMedian() external {
        SortedList.List storage list = getList();

        list.set(421, 200);
        list.set(144, 100);

        Assert.equal(list.median(), 150, "median should return average of the two nodes");
        checkIntegrity(list);
    }

    function testInserTwoAndGetTheNodes() external {
        SortedList.List storage list = getList();

        list.set(421, 200);
        list.set(144, 100);

        Assert.equal(list.get(421), 200, "should return node value");
        Assert.equal(list.get(144), 100, "should return node value");
        checkIntegrity(list);
    }

    function testInserTwoAndGetSize() external {
        SortedList.List storage list = getList();

        list.set(421, 200);
        list.set(144, 100);

        Assert.equal(list.size, 2, "size should be two");
        checkIntegrity(list);
    }

    function testInsertThreeAndGetMedian() external {
        SortedList.List storage list = getList();

        list.set(421, 200);
        list.set(144, 100);
        list.set(444, 600);

        Assert.equal(list.median(), 200, "median should return the median of the nodes");
        checkIntegrity(list);
    }

    function testRemoveLastNode() external {
        SortedList.List storage list = getList();

        list.set(1000, 50);
        list.set(2000, 200);
        list.set(3000, 100);
        list.set(4000, 350);
        list.set(5000, 400);
        list.set(6000, 500);
        checkIntegrity(list);

        list.remove(6000);

        Assert.isFalse(list.exists[6000], "last node should not exists");
        Assert.isZero(list.values[6000], "last node value should be zero");
        Assert.isZero(list.links[6000], "last node link should be zero");
        Assert.equal(list.median(), 200, "median should return the median of the nodes");
        checkIntegrity(list);
    }

    function testRemoveFirstNode() external {
        SortedList.List storage list = getList();

        list.set(1000, 200);
        list.set(2000, 100);
        list.set(3000, 500);
        list.set(4000, 400);
        list.set(5000, 350);
        list.set(6000, 150);
        checkIntegrity(list);

        list.remove(2000);

        Assert.isFalse(list.exists[2000], "last node should not exists");
        Assert.isZero(list.values[2000], "last node value should be zero");
        Assert.isZero(list.links[2000], "last node link should be zero");
        Assert.equal(list.median(), 350, "median should return the median of the nodes");
        checkIntegrity(list);
    }

    function testRemoveMiddleNode() external {
        SortedList.List storage list = getList();

        list.set(1000, 200);
        list.set(2000, 100);
        list.set(3000, 500);
        list.set(4000, 400);
        list.set(5000, 350);
        list.set(6000, 150);
        checkIntegrity(list);

        list.remove(4000);

        Assert.isFalse(list.exists[4000], "last node should not exists");
        Assert.isZero(list.values[4000], "last node value should be zero");
        Assert.isZero(list.links[4000], "last node link should be zero");
        Assert.equal(list.median(), 200, "median should return the median of the nodes");
        checkIntegrity(list);
    }

    // Test updates on last node

    function testUpdateLastNodeToHigher() external {
        SortedList.List storage list = getList();

        list.set(2000, 100);
        list.set(3000, 500);
        list.set(4000, 400);
        list.set(5000, 350);
        list.set(6000, 600);
        checkIntegrity(list);

        list.set(6000, 800);

        Assert.equal(list.values[6000], 800, "value should have been updated");
        Assert.isZero(list.links[6000], "last node link should be zero");
        Assert.equal(list.median(), 400, "median should return the median of the nodes");
        checkIntegrity(list);
    }

    function testUpdateLastNodeToLower() external {
        SortedList.List storage list = getList();

        list.set(2000, 100);
        list.set(3000, 500);
        list.set(4000, 400);
        list.set(5000, 350);
        list.set(6000, 600);
        checkIntegrity(list);

        list.set(6000, 505);

        Assert.equal(list.values[6000], 505, "value should have been updated");
        Assert.isZero(list.links[6000], "last node link should be zero");
        Assert.equal(list.median(), 400, "median should return the median of the nodes");
        checkIntegrity(list);
    }

    function testUpdateLastNodeToSame() external {
        SortedList.List storage list = getList();

        list.set(2000, 100);
        list.set(3000, 500);
        list.set(4000, 400);
        list.set(5000, 350);
        list.set(6000, 600);
        checkIntegrity(list);

        list.set(6000, 600);

        Assert.equal(list.values[6000], 600, "value should have been updated");
        Assert.isZero(list.links[6000], "last node link should be zero");
        Assert.equal(list.median(), 400, "median should return the median of the nodes");
        checkIntegrity(list);
    }

    function testUpdateLastNodeToLowerAndJump() external {
        SortedList.List storage list = getList();

        list.set(2000, 100);
        list.set(3000, 500);
        list.set(4000, 400);
        list.set(5000, 350);
        list.set(6000, 600);
        checkIntegrity(list);

        list.set(6000, 490);

        Assert.equal(list.values[6000], 490, "value should have been updated");
        Assert.isNotZero(list.links[6000], "prev last node link should not be zero");
        Assert.equal(list.median(), 400, "median should return the median of the nodes");
        checkIntegrity(list);
    }

    function testUpdateLastNodeToLowerAndChangeMedian() external {
        SortedList.List storage list = getList();

        list.set(2000, 100);
        list.set(3000, 500);
        list.set(4000, 400);
        list.set(5000, 350);
        list.set(6000, 600);
        checkIntegrity(list);

        list.set(6000, 390);

        Assert.equal(list.values[6000], 390, "value should have been updated");
        Assert.isNotZero(list.links[6000], "prev last node link should not be zero");
        Assert.equal(list.median(), 390, "median should return the median of the nodes");
        checkIntegrity(list);
    }

    function testUpdateLastNodeToLowerAndBecomeFirst() external {
        SortedList.List storage list = getList();

        list.set(2000, 100);
        list.set(3000, 500);
        list.set(4000, 400);
        list.set(5000, 350);
        list.set(6000, 600);
        checkIntegrity(list);

        list.set(6000, 5);

        Assert.equal(list.values[6000], 5, "value should have been updated");
        Assert.isNotZero(list.links[6000], "prev last node link should not be zero");
        Assert.isZero(list.links[3000], "new last node link should be zero");
        Assert.equal(list.median(), 350, "median should return the median of the nodes");
        checkIntegrity(list);
    }

    // Test updates on middle node


    function testUpdateMiddleNodeToHigher() external {
        SortedList.List storage list = getList();

        list.set(1000, 100);
        list.set(2000, 200);
        list.set(3000, 300);
        list.set(4000, 400);
        list.set(5000, 500);
        checkIntegrity(list);

        list.set(4000, 450);

        Assert.equal(list.values[4000], 450, "value should have been updated");
        Assert.equal(list.median(), 300, "median should return the median of the nodes");
        checkIntegrity(list);
    }

    function testUpdateMiddleNodeToLower() external {
        SortedList.List storage list = getList();

        list.set(1000, 100);
        list.set(2000, 200);
        list.set(3000, 300);
        list.set(4000, 400);
        list.set(5000, 500);
        checkIntegrity(list);

        list.set(4000, 350);

        Assert.equal(list.values[4000], 350, "value should have been updated");
        Assert.equal(list.median(), 300, "median should return the median of the nodes");
        checkIntegrity(list);
    }

    function testUpdateMiddleNodeToSame() external {
        SortedList.List storage list = getList();

        list.set(1000, 100);
        list.set(2000, 200);
        list.set(3000, 300);
        list.set(4000, 400);
        list.set(5000, 500);
        checkIntegrity(list);

        list.set(4000, 400);

        Assert.equal(list.values[4000], 400, "value should have been updated");
        Assert.equal(list.median(), 300, "median should return the median of the nodes");
        checkIntegrity(list);
    }

    function testUpdateMiddleNodeToLowerAndJump() external {
        SortedList.List storage list = getList();

        list.set(1000, 100);
        list.set(2000, 200);
        list.set(3000, 300);
        list.set(4000, 400);
        list.set(5000, 500);
        checkIntegrity(list);

        list.set(4000, 250);

        Assert.equal(list.values[4000], 250, "value should have been updated");
        Assert.equal(list.median(), 250, "median should return the median of the nodes");
        checkIntegrity(list);
    }

    function testUpdateMiddleNodeToLowerAndChangeMedian() external {
        SortedList.List storage list = getList();

        list.set(1000, 100);
        list.set(2000, 200);
        list.set(3000, 300);
        list.set(4000, 400);
        list.set(5000, 500);
        checkIntegrity(list);

        list.set(4000, 150);

        Assert.equal(list.values[4000], 150, "value should have been updated");
        Assert.equal(list.median(), 200, "median should return the median of the nodes");
        checkIntegrity(list);
    }

    function testUpdateMiddleNodeToLowerAndBecomeFirst() external {
        SortedList.List storage list = getList();

        list.set(1000, 100);
        list.set(2000, 200);
        list.set(3000, 300);
        list.set(4000, 400);
        list.set(5000, 500);
        checkIntegrity(list);

        list.set(4000, 50);

        Assert.equal(list.values[4000], 50, "value should have been updated");
        Assert.equal(list.links[0], 4000, "first link should be to the node");
        Assert.equal(list.median(), 200, "median should return the median of the nodes");
        checkIntegrity(list);
    }

    function testUpdateMiddleNodeToHigherAndBecomeLast() external {
        SortedList.List storage list = getList();

        list.set(1000, 100);
        list.set(2000, 200);
        list.set(3000, 300);
        list.set(4000, 400);
        list.set(5000, 500);
        checkIntegrity(list);

        list.set(4000, 5000);

        Assert.equal(list.values[4000], 5000, "value should have been updated");
        Assert.isZero(list.links[4000], "first link should be to zero");
        Assert.equal(list.median(), 300, "median should return the median of the nodes");
        checkIntegrity(list);
    }

    // Test updates on first node


    function testUpdateFirstNodeToHigher() external {
        SortedList.List storage list = getList();

        list.set(1000, 100);
        list.set(2000, 200);
        list.set(3000, 300);
        list.set(4000, 400);
        list.set(5000, 500);
        checkIntegrity(list);

        list.set(1000, 150);

        Assert.equal(list.values[1000], 150, "value should have been updated");
        Assert.equal(list.links[0], 1000, "first node link should be to node");
        Assert.equal(list.median(), 300, "median should return the median of the nodes");
        checkIntegrity(list);
    }

    function testUpdateFirstNodeToLower() external {
        SortedList.List storage list = getList();

        list.set(1000, 100);
        list.set(2000, 200);
        list.set(3000, 300);
        list.set(4000, 400);
        list.set(5000, 500);
        checkIntegrity(list);

        list.set(1000, 50);

        Assert.equal(list.values[1000], 50, "value should have been updated");
        Assert.equal(list.links[0], 1000, "first node link should be to node");
        Assert.equal(list.median(), 300, "median should return the median of the nodes");
        checkIntegrity(list);
    }

    function testUpdateFirstNodeToSame() external {
        SortedList.List storage list = getList();

        list.set(1000, 100);
        list.set(2000, 200);
        list.set(3000, 300);
        list.set(4000, 400);
        list.set(5000, 500);
        checkIntegrity(list);

        list.set(1000, 100);

        Assert.equal(list.values[1000], 100, "value should have been updated");
        Assert.equal(list.links[0], 1000, "first node link should be to node");
        Assert.equal(list.median(), 300, "median should return the median of the nodes");
        checkIntegrity(list);
    }

    function testUpdateFirstNodeToHigherAndJump() external {
        SortedList.List storage list = getList();

        list.set(1000, 100);
        list.set(2000, 200);
        list.set(3000, 300);
        list.set(4000, 400);
        list.set(5000, 500);
        checkIntegrity(list);

        list.set(1000, 250);

        Assert.equal(list.values[1000], 250, "value should have been updated");
        Assert.equal(list.links[0], 2000, "first node link should be to second node");
        Assert.equal(list.median(), 300, "median should return the median of the nodes");
        checkIntegrity(list);
    }

    function testUpdateFirstNodeToHigherAndChangeMedian() external {
        SortedList.List storage list = getList();

        list.set(1000, 100);
        list.set(2000, 200);
        list.set(3000, 300);
        list.set(4000, 400);
        list.set(5000, 500);
        checkIntegrity(list);

        list.set(1000, 350);

        Assert.equal(list.values[1000], 350, "value should have been updated");
        Assert.equal(list.links[0], 2000, "first node link should be to second node");
        Assert.equal(list.median(), 350, "median should return the median of the nodes");
        checkIntegrity(list);
    }

    function testUpdateFirstNodeToHigherAndBecomeLast() external {
        SortedList.List storage list = getList();

        list.set(1000, 100);
        list.set(2000, 200);
        list.set(3000, 300);
        list.set(4000, 400);
        list.set(5000, 500);
        checkIntegrity(list);

        list.set(1000, 800);

        Assert.equal(list.values[1000], 800, "value should have been updated");
        Assert.equal(list.links[0], 2000, "first node link should be to second node");
        Assert.isZero(list.links[1000], "node link should point to zero");
        Assert.equal(list.median(), 400, "median should return the median of the nodes");
        checkIntegrity(list);
    }

    function externalRemoveNonNode() external {
        SortedList.List storage list = getList();

        list.set(1000, 100);
        list.set(2000, 200);
        list.set(3000, 300);
        list.set(4000, 400);
        list.set(5000, 500);

        list.remove(6000);
    }

    function testFailToRemoveNonNode() external {
        (bool success, ) = address(this).call(
            abi.encodeWithSelector(
                this.externalRemoveNonNode.selector
            )
        );

        Assert.isFalse(success, "call to remove non existent node should have failed");
    }
}
