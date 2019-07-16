pragma solidity ^0.5.10;


library AddressHeap {
    using AddressHeap for AddressHeap.Heap;

    struct Heap {
        bool inverted;
        uint256[] entries;
        mapping(address => uint256) index;
    }

    function initialize(Heap storage _heap, bool _inverted) internal {
        if (_heap.entries.length == 0) {
            _heap.entries.push(0);
            _heap.inverted = _inverted;
        }
    }

    function encode(Heap storage _heap, address _addr, uint256 _value) internal view returns (uint256 _entry) {
        /* solium-disable-next-line */
        assembly {
            _entry := or(_addr, shl(160, _value))
        }

        if (_heap.inverted) {
            _entry = -_entry;
        }
    }

    function decode(Heap storage _heap, uint256 _entry) internal view returns (address _addr, uint256 _value) {
        uint256 entry = _heap.inverted ? -_entry : _entry;

        /* solium-disable-next-line */
        assembly {
            _addr := and(entry, 0xffffffffffffffffffffffffffffffffffffffff)
            _value := shr(160, entry)
        }
    }

    function decodeAddress(uint256 _entry, bool _negated) internal pure returns (address _addr) {
        uint256 entry = _negated ? -_entry : _entry;

        /* solium-disable-next-line */
        assembly {
            _addr := and(entry, 0xffffffffffffffffffffffffffffffffffffffff)
        }
    }

    function top(Heap storage _heap) internal view returns(address, uint256) {
        if (_heap.entries.length < 2) {
            return (address(0), 0);
        }

        return _heap.decode(_heap.entries[1]);
    }

    function has(Heap storage _heap, address _addr) internal view returns (bool) {
        return _heap.index[_addr] != 0;
    }

    function size(Heap storage _heap) internal view returns (uint256) {
        return _heap.entries.length - 1;
    }

    function getAddr(Heap storage _heap, address _addr) internal view returns (uint256 _index, uint256 _value) {
        _index = _heap.index[_addr];
        (,_value) = _heap.decode(_heap.entries[_index]);
        _index--;
    }

    // RemoveMax pops off the root element of the heap (the highest value here) and rebalances the heap
    function popTop(Heap storage _heap) internal returns(address _addr, uint256 _value) {
        // Ensure the heap exists
        uint256 heapLength = _heap.entries.length;
        require(heapLength > 1, "The heap does not exists");

        // take the root value of the heap
        (_addr, _value) = _heap.decode(_heap.entries[1]);
        _heap.index[_addr] = 0;

        if (heapLength == 2) {
            _heap.entries.length = 1;
        } else {
            // Takes the last element of the array and put it at the root
            uint256 val = _heap.entries[heapLength - 1];
            _heap.entries[1] = val;

            // Delete the last element from the array
            _heap.entries.length = heapLength - 1;

            // Start at the top
            uint256 ind = 1;

            // Bubble down
            ind = _heap.bubbleDown(ind, val);

            // Update index
            _heap.index[decodeAddress(val, _heap.inverted)] = ind;
        }
    }

    // Inserts adds in a value to our heap.
    function insert(Heap storage _heap, address _addr, uint256 _value) internal {
        require(_heap.index[_addr] == 0, "The entry already exists");

        // Add the value to the end of our array
        uint256 encoded = _heap.encode(_addr, _value);
        _heap.entries.push(encoded);

        // Start at the end of the array
        uint256 currentIndex = _heap.entries.length - 1;

        // Bubble Up
        currentIndex = _heap.bubbleUp(currentIndex, encoded);

        // Update index
        _heap.index[_addr] = currentIndex;
    }

    function update(Heap storage _heap, address _addr, uint256 _value) internal {
        uint256 ind = _heap.index[_addr];
        require(ind != 0, "The entry does not exists");

        uint256 can = _heap.encode(_addr, _value);
        uint256 val = _heap.entries[ind];

        if (can < val) {
            // Bubble down
            ind = _heap.bubbleDown(ind, can);
        } else if (can > val) {
            // Bubble up
            ind = _heap.bubbleUp(ind, can);
        }

        // Update entry
        _heap.entries[ind] = can;

        // Update index
        _heap.index[_addr] = ind;
    }

    function bubbleUp(Heap storage _heap, uint256 _ind, uint256 _val) internal returns (uint256 ind) {
        // Bubble up
        ind = _ind;
        bool inverted = _heap.inverted;
        if (ind != 1) {
            uint256 parent = _heap.entries[ind / 2];
            while (parent < _val) {
                // If the parent value is lower than our current value, we swap them
                (_heap.entries[ind / 2], _heap.entries[ind]) = (_val, parent);

                // Update moved Index
                _heap.index[decodeAddress(parent, inverted)] = ind;

                // change our current Index to go up to the parent
                ind = ind / 2;
                if (ind == 1) {
                    break;
                }

                // Update parent
                parent = _heap.entries[ind / 2];
            }
        }
    }

    function bubbleDown(Heap storage _heap, uint256 _ind, uint256 _val) internal returns (uint256 ind) {
        // Bubble down
        ind = _ind;
        bool inverted = _heap.inverted;
        uint256 target = _heap.entries.length - 1;
        while (ind * 2 < target) {
            // get the current index of the children
            uint256 j = ind * 2;

            // left child value
            uint256 leftChild = _heap.entries[j];
            // right child value
            uint256 rightChild = _heap.entries[j + 1];

            // Store the value of the child
            uint256 childValue;

            // Compare the left and right child. if the rightChild is greater, then point j to it's index
            if (leftChild < rightChild) {
                childValue = rightChild;
                j = j + 1;
            } else {
                // The left child is greater
                childValue = leftChild;
            }

            if (_heap.entries[ind] > childValue) {
                break;
            }

            // else swap the value
            (_heap.entries[ind], _heap.entries[j]) = (childValue, _val);

            // Update moved Index
            _heap.index[decodeAddress(childValue, inverted)] = ind;

            // and let's keep going down the heap
            ind = j;
        }
    }
}
