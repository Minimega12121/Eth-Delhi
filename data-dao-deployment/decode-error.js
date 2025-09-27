const { ethers } = require("ethers");

// Error signature to decode
const errorSignature = "0x8c6645e0";

// Common error names from the ABI
const errorNames = [
  "EnforcedPause",
  "ExpectedPause", 
  "FailedDeployment",
  "InsufficientBalance",
  "InsufficientLockAmount",
  "InvalidAllocation",
  "InvalidFeeConfig", 
  "InvalidTaxConfig",
  "InvalidVestingDuration",
  "LPTokensAlreadyWithdrawn",
  "LPTokensStillLocked",
  "LiquidityAdditionFailed",
  "LiquidityAlreadyAdded", 
  "NoLPTokensToWithdraw",
  "NotCreator",
  "OnlyDataCoin"
];

console.log(`🔍 Decoding error signature: ${errorSignature}\n`);

for (const errorName of errorNames) {
  const signature = ethers.id(`${errorName}()`).substring(0, 10);
  console.log(`${errorName}(): ${signature}`);
  
  if (signature === errorSignature) {
    console.log(`\n✅ MATCH FOUND: ${errorName}()`);
    break;
  }
}
