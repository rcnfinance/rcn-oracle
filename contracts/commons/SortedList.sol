pragma solidity 0.5.11;

import "../utils/Math.sol";


/**
 * @title SortedList
 * @author Joaquin Gonzalez & Agustin Aguilar (jpgonzalezra@gmail.com & agusxrun@gmail.com)
 * @dev An utility library for using sorted list data structures.
 */
library SortedList {
    using SortedList for SortedList.List;

    uint256 private constant HEAD = 0;

    struct List {
        uint256 size;
        mapping(uint256 => uint256) values;
        mapping(uint256 => uint256) links;
        mapping(uint256 => bool) exists;
    }

    /**
     * @dev Returns the value of a `_node`
     * @param self stored linked list from contract
     * @param _node a node to search value of
     * @return value of the node
     */
    function get(List storage self, uint256 _node) internal view returns (uint256) {
        return self.values[_node];
    }

    /**
     * @dev Insert node `_node` with a value
     * @param self stored linked list from contract
     * @param _node new node to insert
     * @param _value value of the new `_node` to insert
     * @notice If the `_node` does not exists, it's added to the list
     *   if the `_node` already exists, it updates its value.
     */
    function set(List storage self, uint256 _node, uint256 _value) internal {
        // Check if node previusly existed
        if (self.exists[_node]) {

            // Load the new and old position
            (uint256 leftOldPos, uint256 leftNewPos) = self.findOldAndNewLeftPosition(_node, _value);

            // If node position changed, we need to re-do the linking
            if (leftOldPos != leftNewPos && _node != leftNewPos) {
                // Remove prev link
                self.links[leftOldPos] = self.links[_node];

                // Create new link
                uint256 next = self.links[leftNewPos];
                self.links[leftNewPos] = _node;
                self.links[_node] = next;
            }
        } else {
            // Update size of the list
            self.size = self.size + 1;
            // Set node as existing
            self.exists[_node] = true;
            // Find position for the new node and update the links
            uint256 leftPosition = self.findLeftPosition(_value);
            uint256 next = self.links[leftPosition];
            self.links[leftPosition] = _node;
            self.links[_node] = next;
        }

        // Set the value for the node
        self.values[_node] = _value;
    }

    /**
     * @dev Returns the previus node of a given `_node`
     *   alongside to the previus node of a hypothetical new `_value`
     * @param self stored linked list from contract
     * @param _node a node to search for its left node
     * @param _value a value to seach for its hypothetical left node
     * @return `leftNodePost` the node previus to the given `_node` and
     *   `leftValPost` the node previus to the hypothetical new `_value`
     * @notice This method performs two seemingly unrelated tasks at the same time
     *   because both of those tasks require a list iteration, thus saving gas.
     */
    function findOldAndNewLeftPosition(
        List storage self,
        uint256 _node,
        uint256 _value
    ) internal view returns (
        uint256 leftNodePos,
        uint256 leftValPos
    ) {
        // Find old and new value positions
        bool foundNode;
        bool foundVal;

        // Iterate links
        uint256 c = HEAD;
        while (!foundNode || !foundVal) {
            uint256 next = self.links[c];

            // We should have found the old position
            // the new one must be at the end
            if (next == 0) {
                leftValPos = c;
                break;
            }

            // If the next node is the current node
            // we found the old position
            if (next == _node) {
                leftNodePos = c;
                foundNode = true;
            }

            // If the next value is higher and we didn't found one yet
            // the next value if the position
            if (self.values[next] > _value && !foundVal) {
                leftValPos = c;
                foundVal = true;
            }

            c = next;
        }
    }

    /**
     * @dev Get the left node for a given hypothetical `_value`
     * @param self stored linked list from contract
     * @param _value value to seek
     * @return uint256 left node for the given value
     */
    function findLeftPosition(List storage self, uint256 _value) internal view returns (uint256) {
        uint256 next = HEAD;
        uint256 c;

        do {
            c = next;
            next = self.links[c];
        } while(self.values[next] < _value && next != 0);

        return c;
    }

    /**
     * @dev Get the node on a given `_position`
     * @param self stored linked list from contract
     * @param _position node position to retrieve
     * @return the node key
     */
    function nodeAt(List storage self, uint256 _position) internal view returns (uint256) {
        uint256 next = self.links[HEAD];
        for (uint256 i = 0; i < _position; i++) {
            next = self.links[next];
        }

        return next;
    }

    /**
     * @dev Removes an entry from the sorted list
     * @param self stored linked list from contract
     * @param _node node to remove from the list
     */
    function remove(List storage self, uint256 _node) internal {
        require(self.exists[_node], "the node does not exists");

        uint256 c = self.links[HEAD];
        while (c != 0) {
            uint256 next = self.links[c];
            if (next == _node) {
                break;
            }

            c = next;
        }

        self.size -= 1;
        self.exists[_node] = false;
        self.links[c] = self.links[_node];
        delete self.links[_node];
        delete self.values[_node];
    }

    /**
     * @dev Get median beetween entry from the sorted list
     * @param self stored linked list from contract
     * @return uint256 the median
     */
    function median(List storage self) internal view returns (uint256) {
        uint256 elements = self.size;
        if (elements % 2 == 0) {
            uint256 node = self.nodeAt(elements / 2 - 1);
            return Math.average(self.values[node], self.values[self.links[node]]);
        } else {
            return self.values[self.nodeAt(elements / 2)];
        }
    }
}
