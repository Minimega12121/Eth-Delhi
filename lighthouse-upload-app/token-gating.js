import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "ethers";
import lighthouse from "@lighthouse-web3/sdk";
import axios from "axios";

const signAuthMessage = async (privateKey) => {
  try {
    const signer = new ethers.Wallet(privateKey);
    const messageRequested = (await lighthouse.getAuthMessage(signer.address))
      .data.message;
    const signedMessage = await signer.signMessage(messageRequested);
    return signedMessage;
  } catch (error) {
    console.error("Error signing auth message:", error);
    throw error;
  }
};

const accessControl = async (givenCID) => {
  try {
    console.log("Applying access control to CID:", givenCID);

    // CID of encrypted file
    const cid = givenCID;
    const privateKey = process.env.PRIVATE_KEY;
    const signer = new ethers.Wallet(privateKey);
    const publicKey = signer.address;

    console.log("Owner address:", publicKey);

    // Simple access conditions for testing
    // Condition 1: Check block number (always passes on Optimism)
    const conditions = [
      {
        id: 1,
        chain: "Base_Testnet",
        method: "getBlockNumber",
        standardContractType: "",
        returnValueTest: {
          comparator: ">=",
          value: "1", // Very low threshold, should always pass
        },
      },
    ];

    // Aggregator - how to combine conditions
    const aggregator = "([1])";

    console.log("Conditions:", JSON.stringify(conditions, null, 2));
    console.log("Aggregator:", aggregator);

    const signedMessage = await signAuthMessage(privateKey);
    console.log("Signed message:", signedMessage.substring(0, 20) + "...");

    console.log("Calling Lighthouse API...");

    const response = await lighthouse.applyAccessCondition(
      publicKey,
      cid,
      signedMessage,
      conditions,
      aggregator
    );

    console.log("✅ Access control applied successfully!");
    console.log("Response:", JSON.stringify(response, null, 2));
    return response;
  } catch (error) {
    console.error("❌ Error applying access control:");
    console.error("Error details:", error);

    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }

    throw error;
  }
};


const getZkConditions = async (privateKey,cid) => {
  const signedMessage = await signAuthMessage(privateKey);
  const config = {
    method: "get",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${signedMessage}`,
    },
  };
  const response = await axios({
    url: `https://encryption.lighthouse.storage/api/getZkConditions/${cid}`,
    ...config,
  });
  console.log(response.data);
};


const getFileEncryptionKey = async (cid, userPrivateKey) => {
  try {

    console.log("Getting encryption key for CID:", cid);

    const privateKey = userPrivateKey || process.env.PRIVATE_KEY;
    const signer = new ethers.Wallet(privateKey);
    const publicKey = signer.address;

    getZkConditions(privateKey,cid)

    console.log("User address:", publicKey);

    const signedMessage = await signAuthMessage(privateKey);
    console.log("Signed message:", signedMessage.substring(0, 20) + "...");

    console.log("Fetching encryption key...");
    /*
      fetchEncryptionKey(cid, publicKey, signedMessage)
        Parameters:
          cid: CID of the file
          publicKey: your public key
          signedMessage: message signed by the owner of the public key
    */
    const key = await lighthouse.fetchEncryptionKey(
      cid,
      publicKey,
      signedMessage
    );

    console.log("✅ Encryption key retrieved successfully!");
    console.log("Key data:", key);
    return key;
  } catch (error) {
    console.error("❌ Error getting encryption key:");
    console.error("Error details:", error);

    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }

    throw error;
  }
};

// Test both access control and key retrieval
const testAccessControlWorkflow = async (cid) => {
  try {
    console.log("\n🧪 TESTING ACCESS CONTROL WORKFLOW");
    console.log("=".repeat(50));

    // Step 1: Apply access control
    console.log("\n📝 Step 1: Applying access control...");
    await accessControl(cid);

    // Step 2: Try to get encryption key
    console.log("\n🔑 Step 2: Testing encryption key retrieval...");
    await getFileEncryptionKey(cid);

    console.log("\n✅ Workflow test completed successfully!");
  } catch (error) {
    console.error("\n❌ Workflow test failed:", error.message);
  }
};

// Main execution
const main = async () => {
  try {
    console.log("🚀 Lighthouse File Access Control Tool\n");

    if (!process.env.PRIVATE_KEY) {
      console.error("❌ Please set PRIVATE_KEY in your .env file");
      return;
    }

    const signer = new ethers.Wallet(process.env.PRIVATE_KEY);
    console.log("Using wallet address:", signer.address);
    console.log();

    // Check if a specific CID was provided as command line argument
    const specificCID = process.argv[2];
    const command = process.argv[3] || "access-control"; // default command

    if (!specificCID) {
      console.error(
        "❌ No CID provided. Please provide a CID as a command line argument."
      );
      console.log("\nUsage:");
      console.log("  node token-gating.js <CID> [command]");
      console.log("\nCommands:");
      console.log("  access-control  - Apply access control (default)");
      console.log("  get-key        - Get encryption key");
      console.log("  test-workflow  - Test complete workflow");
      console.log("\nExample:");
      console.log("  node token-gating.js bafkrei... access-control");
      return;
    }

    // Validate CID format
    if (!specificCID.startsWith("bafkrei") && !specificCID.startsWith("Qm")) {
      console.warn(
        "⚠️  Warning: CID format looks unusual. Expected format: bafkrei... or Qm..."
      );
    }

    console.log("🎯 CID:", specificCID);
    console.log("📝 Command:", command);
    console.log();

    switch (command) {
      case "access-control":
        await accessControl(specificCID);
        break;
      case "get-key":
        await getFileEncryptionKey(specificCID);
        break;
      case "test-workflow":
        await testAccessControlWorkflow(specificCID);
        break;
      default:
        console.error("❌ Unknown command:", command);
        console.log(
          "Available commands: access-control, get-key, test-workflow"
        );
    }
  } catch (error) {
    console.error("❌ Main execution error:", error.message);

    // Provide helpful debugging info
    console.log("\n🔧 Debugging Information:");
    console.log("- Environment variables loaded:", !!process.env.PRIVATE_KEY);
    console.log(
      "- Wallet address:",
      process.env.PRIVATE_KEY
        ? new ethers.Wallet(process.env.PRIVATE_KEY).address
        : "N/A"
    );
    console.log("- Node version:", process.version);
    console.log("- Current working directory:", process.cwd());

    if (error.code === "ENOTFOUND") {
      console.log("- Network issue: Check your internet connection");
    }
  }
};

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
