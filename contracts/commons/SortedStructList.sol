pragma solidity 0.5.10;

import "./SortedList.sol";
import "./SortedListDelegate.sol";

contract SortedStructList is SortedListDelegate {
    using SortedList for SortedList.List;

    struct Node {
        uint256 value;
    }

    mapping(uint256 => Node) internal nodes;
    SortedList.List private list;
    uint256 public id = 0;

    event AddNode(uint256 _id);
    event RemoveNode(uint256 _id);

    function newNode(address _addr, uint256 _value) external returns (uint256) {
        id = id + 1;
        nodes[id] = Node(_value);
        return id;
    }
    
    function getValue(uint256 _id) external view returns (uint256) {
        return nodes[_id].value;
    }

    function exists(uint256 _id) external view returns (bool) {
        return list.exists(_id);
    }

    function sizeOf() external view returns (uint256) {
        return list.sizeOf();
    }

    function insert(uint256 _id) external {
        if (list.insert(_id, address(this))) {
            emit AddNode(_id);
        }
    }

    function getNode(uint256 _id) external view returns (bool, uint256, uint256) {
        return list.getNode(_id);
    }

    function getNextNode(uint256 _id) external view returns (bool, uint256) {
        return list.getNextNode(_id);
    }

    function remove(uint256 _id) public returns (uint256) {
        uint256 result = list.remove(_id);
        if (result > 0) {
            emit RemoveNode(_id);
        }
        return result;
    }

    function median() external view returns (uint256) {
        return list.median(address(this));
    }

}