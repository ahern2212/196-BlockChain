// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Message {
    string private message;

    event MessageUpdated(string newMessage);

    constructor() {
        message = "Hello World!";
    }

    function setMessage(string memory _message) public {
        message = _message;
        emit MessageUpdated(_message);
    }

    function getMessage() public view returns (string memory) {
        return message;
    }
} 