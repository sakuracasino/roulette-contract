// TODO: Remove this mock once Chainlink supports v0.8 mocks
pragma solidity ^0.8.0;

abstract contract ERC677Receiver {
  function onTokenTransfer(address _sender, uint _value, bytes memory _data) public virtual;
}
