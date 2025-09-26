// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AccessToken
 * @dev Simple ERC20 token for testing access control in Lighthouse
 * This token can be minted by anyone for testing purposes
 */
contract AccessToken is ERC20, Ownable {
    uint256 public constant MINT_AMOUNT = 1000 * 10**18; // 1000 tokens per mint
    uint256 public constant MAX_SUPPLY = 1000000 * 10**18; // 1M tokens max

    // Cooldown period between mints per address (24 hours)
    uint256 public constant MINT_COOLDOWN = 24 hours;

    // Track last mint time for each address
    mapping(address => uint256) public lastMintTime;

    event TokensMinted(address indexed to, uint256 amount);

    constructor() ERC20("LighthouseAccess", "LHTA") Ownable(msg.sender) {
        // Mint initial supply to contract owner
        _mint(msg.sender, 100000 * 10**18); // 100k tokens to owner
    }

    /**
     * @dev Mint tokens to caller (once per day per address)
     * Anyone can call this function to get test tokens
     */
    function mintTestTokens() external {
        require(
            block.timestamp >= lastMintTime[msg.sender] + MINT_COOLDOWN,
            "Must wait 24 hours between mints"
        );
        require(
            totalSupply() + MINT_AMOUNT <= MAX_SUPPLY,
            "Would exceed maximum supply"
        );

        lastMintTime[msg.sender] = block.timestamp;
        _mint(msg.sender, MINT_AMOUNT);

        emit TokensMinted(msg.sender, MINT_AMOUNT);
    }

    /**
     * @dev Mint tokens to a specific address (owner only)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mintTo(address to, uint256 amount) external onlyOwner {
        require(
            totalSupply() + amount <= MAX_SUPPLY,
            "Would exceed maximum supply"
        );
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev Check if address can mint tokens
     * @param user Address to check
     * @return bool Whether the address can mint
     */
    function canMint(address user) external view returns (bool) {
        return block.timestamp >= lastMintTime[user] + MINT_COOLDOWN;
    }

    /**
     * @dev Get time until next mint is available
     * @param user Address to check
     * @return uint256 Seconds until next mint (0 if can mint now)
     */
    function timeUntilNextMint(address user) external view returns (uint256) {
        uint256 nextMintTime = lastMintTime[user] + MINT_COOLDOWN;
        if (block.timestamp >= nextMintTime) {
            return 0;
        }
        return nextMintTime - block.timestamp;
    }

    /**
     * @dev Burn tokens from caller's balance
     * @param amount Amount of tokens to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}