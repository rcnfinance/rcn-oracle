pragma solidity ^0.5.10;


library StringUtils {
    function concat(string memory _a, string memory _b) internal pure returns (string memory) {
        return string(abi.encodePacked(_a, _b));
    }

    function toBytes32(string memory _a) internal pure returns (bytes32 b) {
        require(bytes(_a).length <= 32, "string too long");

        assembly {
            let bi := mul(mload(_a), 8)
            b := and(mload(add(_a, 32)), shl(sub(256, bi), sub(exp(2, bi), 1)))
        }
    }

    function fromBytes32(bytes32 _b) internal pure returns (string memory o) {
        assembly {
            let mask := shl(248, 0xff)
            let s := 0

            for { } lt(s, 256) { s := add(s, 8) } {
                if iszero(and(mask, shl(s, _b))) {
                    break
                }
            }

            mstore(o, div(s, 8))
            mstore(add(o, 32), _b)
        }
    }

    function toString(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }

        uint256 i = _i;
        uint256 j = i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }

        bytes memory bstr = new bytes(len);
        uint256 k = len - 1;
        while (i != 0) {
            bstr[k--] = byte(uint8(48 + i % 10));
            i /= 10;
        }

        return string(bstr);
    }
}
