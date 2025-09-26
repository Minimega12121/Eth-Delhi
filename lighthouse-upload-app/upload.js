import * as dotenv from "dotenv";
dotenv.config();

// Import Node.js crypto module properly
import { webcrypto } from "crypto";
import { Buffer } from "buffer";

// Make crypto available globally for Lighthouse SDK
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}
if (!globalThis.Buffer) {
  globalThis.Buffer = Buffer;
}

import fs from "fs";
import { ethers } from "ethers";
import lighthouse from "@lighthouse-web3/sdk";

// Function to sign authentication message for encryption
const signAuthMessage = async (privateKey) => {
  try {
    const signer = new ethers.Wallet(privateKey);
    const publicKey = signer.address;

    // Get the authentication message from Lighthouse
    const authMessage = await lighthouse.getAuthMessage(publicKey);
    console.log("Auth message received:", authMessage.data.message);

    // Sign the message
    const signedMessage = await signer.signMessage(authMessage.data.message);
    console.log("Message signed successfully");

    return signedMessage;
  } catch (error) {
    console.error("Error signing authentication message:", error);
    throw error;
  }
};

// Function to upload a file with encryption
const uploadEncryptedFile = async (filePath, apiKey) => {
  try {
    const privateKey = process.env.PRIVATE_KEY;
    const signer = new ethers.Wallet(privateKey);
    const publicKey = signer.address;

    console.log("Using public key:", publicKey);
    console.log("Uploading file:", filePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Sign authentication message
    const signedMessage = await signAuthMessage(privateKey);

    // Upload encrypted file
    console.log("Starting encrypted file upload...");
    const response = await lighthouse.uploadEncrypted(
      filePath,
      apiKey,
      publicKey,
      signedMessage
    );

    console.log("Encrypted file uploaded successfully!");
    console.log("Upload response:", JSON.stringify(response, null, 2));

    // Save upload details to a file for later decryption
    const uploadDetails = {
      fileName: response.data[0].Name,
      cid: response.data[0].Hash,
      size: response.data[0].Size,
      publicKey: publicKey,
      uploadTimestamp: new Date().toISOString(),
    };

    fs.writeFileSync(
      "upload-details.json",
      JSON.stringify(uploadDetails, null, 2)
    );
    console.log("Upload details saved to upload-details.json");

    return response;
  } catch (error) {
    console.error("Error uploading encrypted file:", error);
    throw error;
  }
};

// Function to upload encrypted text/JSON
const uploadEncryptedText = async (
  text,
  apiKey,
  fileName = "encrypted-text"
) => {
  try {
    const privateKey = process.env.PRIVATE_KEY;
    const signer = new ethers.Wallet(privateKey);
    const publicKey = signer.address;

    console.log("Using public key:", publicKey);
    console.log("Uploading text:", text.substring(0, 50) + "...");

    // Sign authentication message
    const signedMessage = await signAuthMessage(privateKey);

    // Upload encrypted text
    console.log("Starting encrypted text upload...");
    const response = await lighthouse.textUploadEncrypted(
      text,
      apiKey,
      publicKey,
      signedMessage,
      fileName
    );

    console.log("Encrypted text uploaded successfully!");
    console.log("Upload response:", JSON.stringify(response, null, 2));

    // Save upload details
    const uploadDetails = {
      fileName: response.data.Name,
      cid: response.data.Hash,
      size: response.data.Size,
      publicKey: publicKey,
      uploadTimestamp: new Date().toISOString(),
      type: "text",
    };

    fs.writeFileSync(
      "text-upload-details.json",
      JSON.stringify(uploadDetails, null, 2)
    );
    console.log("Text upload details saved to text-upload-details.json");

    return response;
  } catch (error) {
    console.error("Error uploading encrypted text:", error);
    throw error;
  }
};

// // Function to get API key (if you need to generate one)
// const generateApiKey = async () => {
//   try {
//     const privateKey = process.env.PRIVATE_KEY;
//     const signer = new ethers.Wallet(privateKey);
//     const publicKey = signer.address;

//     console.log("Generating API key for:", publicKey);

//     // Get auth message
//     const authMessage = await lighthouse.getAuthMessage(publicKey);

//     // Sign the message
//     const signedMessage = await signer.signMessage(authMessage.data.message);

//     // Get API key
//     const response = await lighthouse.getApiKey(publicKey, signedMessage);

//     console.log("API Key generated successfully!");
//     console.log("API Key:", response.data.apiKey);

//     return response.data.apiKey;
//   } catch (error) {
//     console.error("Error generating API key:", error);
//     throw error;
//   }
// };

// Example usage
const main = async () => {
  try {
    // Check if we have all required environment variables
    if (!process.env.PRIVATE_KEY) {
      console.error("Please set PRIVATE_KEY in your .env file");
      return;
    }
    const apiKey = process.env.API_KEY;

    // Example 1: Upload an encrypted file
    console.log("\n=== UPLOADING ENCRYPTED FILE ===");

    // Create a unique sample file with timestamp each time
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const uniqueId = Math.random().toString(36).substring(2, 8);
    const sampleFilePath = `./sample-data-${timestamp}-${uniqueId}.txt`;

    const sampleData = `This is a sample encrypted file uploaded to Lighthouse!
Creation Timestamp: ${new Date().toISOString()}
Unique ID: ${uniqueId}
Random data: ${Math.random()}
Session info: Upload session ${Date.now()}

This file will be encrypted and stored on IPFS/Filecoin network.
Only the owner with the correct private key can decrypt and access this content.
Public Address: ${process.env.PUBLIC_ADDRESS || "Not set"}`;

    fs.writeFileSync(sampleFilePath, sampleData);
    console.log("Created unique sample file:", sampleFilePath);

    await uploadEncryptedFile(sampleFilePath, apiKey);

    // // Example 2: Upload encrypted text/JSON
    // console.log("\n=== UPLOADING ENCRYPTED TEXT ===");
    // const sampleText = JSON.stringify({
    //   message: "This is encrypted JSON data",
    //   timestamp: new Date().toISOString(),
    //   secrets: {
    //     apiKey: "secret-api-key-123",
    //     password: "super-secret-password",
    //   },
    //   data: [1, 2, 3, 4, 5],
    // });

    // await uploadEncryptedText(sampleText, apiKey, "secret-config");

    // console.log("\n=== UPLOAD COMPLETE ===");
    // console.log("Files have been uploaded and encrypted successfully!");
    // console.log(
    //   "You can now use the decrypt functionality in app.js to retrieve the data."
    // );
  } catch (error) {
    console.error("Main execution error:", error);
  }
};

// Run the upload if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Export functions for use in other modules
export { uploadEncryptedFile, uploadEncryptedText, signAuthMessage };
