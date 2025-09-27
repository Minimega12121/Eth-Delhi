import * as dotenv from "dotenv";
dotenv.config();

// Import Node.js crypto module properly for decryption
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
import https from "https";
import axios from "axios";

// Function to download and view a regular file from IPFS
const downloadRegularFile = async (cid, fileName = "downloaded-file") => {
  try {
    console.log(`Downloading file with CID: ${cid}`);

    const url = `https://gateway.lighthouse.storage/ipfs/${cid}`;
    console.log(`Download URL: ${url}`);

    const response = await axios.get(url);

    console.log("File downloaded successfully!");
    console.log("Content type:", response.headers["content-type"]);
    console.log("File size:", response.headers["content-length"]);

    // Save the downloaded content
    const downloadedFileName = `downloaded-${fileName}`;

    // Handle different content types
    if (typeof response.data === "object") {
      // JSON content
      fs.writeFileSync(
        downloadedFileName,
        JSON.stringify(response.data, null, 2)
      );
      console.log(`JSON file saved as: ${downloadedFileName}`);
      console.log("\n=== JSON CONTENT ===");
      console.log(JSON.stringify(response.data, null, 2));
      console.log("=== END CONTENT ===\n");
    } else {
      // Text content
      fs.writeFileSync(downloadedFileName, response.data);
      console.log(`File saved as: ${downloadedFileName}`);

      // If it's text content, also display it
      if (typeof response.data === "string") {
        console.log("\n=== FILE CONTENT ===");
        console.log(response.data);
        console.log("=== END CONTENT ===\n");
      }
    }

    return response.data;
  } catch (error) {
    console.error("Error downloading file:", error);
    throw error;
  }
};

// Function to sign authentication message (using your preferred method)
const signAuthMessage = async (publicKey, privateKey) => {
  try {
    const provider = new ethers.JsonRpcProvider();
    const signer = new ethers.Wallet(privateKey, provider);
    const messageRequested = (await lighthouse.getAuthMessage(publicKey)).data
      .message;
    const signedMessage = await signer.signMessage(messageRequested);
    return signedMessage;
  } catch (error) {
    console.error("Error signing auth message:", error);
    throw error;
  }
};

// Function to attempt decryption using your preferred method
const attemptDecryption = async (cid, publicKey, privateKey) => {
  try {
    console.log(`Attempting to decrypt file with CID: ${cid}`);

    // Get file encryption key using your snippet approach
    const signedMessage = await signAuthMessage(publicKey, privateKey);
    console.log("Authentication message signed");

    try {
      const fileEncryptionKey = await lighthouse.fetchEncryptionKey(
        cid,
        publicKey,
        signedMessage
      );

      console.log("Encryption key fetched successfully");
      console.log("Key:", fileEncryptionKey.data.key ? "Found" : "Not found");

      // Decrypt File
      const decrypted = await lighthouse.decryptFile(
        cid,
        fileEncryptionKey.data.key
      );

      console.log("File decrypted successfully!");

      // Save File with appropriate extension
      const timestamp = Date.now();
      const decryptedFileName = `decrypted-${timestamp}.txt`;
      fs.writeFileSync(decryptedFileName, Buffer.from(decrypted));
      console.log(`Decrypted file saved as: ${decryptedFileName}`);

      // Also try to display content if it's text
      try {
        const content = Buffer.from(decrypted).toString("utf8");
        if (content && content.length > 0 && content.length < 1000) {
          console.log("\n=== DECRYPTED CONTENT ===");
          console.log(content);
          console.log("=== END DECRYPTED CONTENT ===\n");
        }
      } catch (displayError) {
        console.log("Content appears to be binary data");
      }

      return decrypted;
    } catch (decryptError) {
      console.log("Decryption failed:", decryptError.message);
      console.log(
        "This file may not be encrypted or you don't have access rights"
      );
      console.log("Falling back to regular file download...");
      return null;
    }
  } catch (error) {
    console.error("Error during decryption attempt:", error);
    return null;
  }
};

// Function to get deal status for a file
const getDealStatus = async (cid) => {
  try {
    console.log(`Getting Filecoin deal status for CID: ${cid}`);
    const status = await lighthouse.dealStatus(cid);
    console.log("Deal Status:", JSON.stringify(status.data, null, 2));
    return status.data;
  } catch (error) {
    console.error("Error getting deal status:", error);
    return null;
  }
};

// Function to access files using details from upload
const accessUploadedFiles = async () => {
  try {
    console.log("=== ACCESSING UPLOADED FILES ===\n");

    // Check if we have regular upload details
    if (fs.existsSync("regular-upload-details.json")) {
      console.log("📄 Found regular file upload details");
      const regularDetails = JSON.parse(
        fs.readFileSync("regular-upload-details.json", "utf8")
      );

      console.log("File details:");
      console.log("- Name:", regularDetails.fileName);
      console.log("- CID:", regularDetails.cid);
      console.log("- Size:", regularDetails.size);
      console.log("- Upload time:", regularDetails.uploadTimestamp);
      console.log("- View URL:", regularDetails.viewUrl);

      console.log("\nDownloading regular file...");
      await downloadRegularFile(regularDetails.cid, regularDetails.fileName);

      console.log("\nGetting Filecoin deal status...");
      await getDealStatus(regularDetails.cid);
    }

    // Check if we have text upload details
    if (fs.existsSync("text-upload-details.json")) {
      console.log("\n📄 Found text file upload details");
      const textDetails = JSON.parse(
        fs.readFileSync("text-upload-details.json", "utf8")
      );

      console.log("Text file details:");
      console.log("- Name:", textDetails.fileName);
      console.log("- CID:", textDetails.cid);
      console.log("- Size:", textDetails.size);
      console.log("- View URL:", textDetails.viewUrl);

      console.log("\nDownloading text file...");
      await downloadRegularFile(textDetails.cid, textDetails.fileName);
    }

    // Check if we have encrypted upload details
    if (fs.existsSync("encrypted-upload-details.json")) {
      console.log("\n🔐 Found encrypted file upload details");
      const encryptedDetails = JSON.parse(
        fs.readFileSync("encrypted-upload-details.json", "utf8")
      );

      console.log("Encrypted file details:");
      console.log("- Name:", encryptedDetails.fileName);
      console.log("- CID:", encryptedDetails.cid);
      console.log("- Size:", encryptedDetails.size);

      const privateKey = process.env.PRIVATE_KEY;
      const publicKey =
        encryptedDetails.publicKey || process.env.PUBLIC_ADDRESS;

      console.log("\nAttempting to decrypt file...");
      const decrypted = await attemptDecryption(
        encryptedDetails.cid,
        publicKey,
        privateKey
      );

      if (!decrypted) {
        console.log("Decryption failed, trying regular download...");
        await downloadRegularFile(
          encryptedDetails.cid,
          encryptedDetails.fileName
        );
      }
    }

    if (
      !fs.existsSync("regular-upload-details.json") &&
      !fs.existsSync("text-upload-details.json") &&
      !fs.existsSync("encrypted-upload-details.json")
    ) {
      console.log("No uploaded file details found.");
      console.log(
        'Please run "node upload-regular.js" first to upload some files.'
      );
    }
  } catch (error) {
    console.error("Error accessing uploaded files:", error);
  }
};

// Function to access a specific file by CID
const accessSpecificFile = async (cid) => {
  try {
    if (!cid) {
      console.log("Please provide a CID to access a specific file");
      return;
    }

    console.log(`=== ACCESSING SPECIFIC FILE: ${cid} ===\n`);

    const privateKey = process.env.PRIVATE_KEY;
    const signer = new ethers.Wallet(privateKey);
    const publicKey = signer.address;

    // First try decryption (in case it's an encrypted file)
    console.log("Attempting decryption first...");
    const decrypted = await attemptDecryption(cid, publicKey, privateKey);

    if (!decrypted) {
      console.log(
        "Decryption failed or file is not encrypted, trying regular download..."
      );
      await downloadRegularFile(cid, "specific-file");
    }

    // Get deal status
    await getDealStatus(cid);
  } catch (error) {
    console.error("Error accessing specific file:", error);
  }
};

// Main execution
const main = async () => {
  try {
    console.log("🚀 Lighthouse File Access Tool\n");

    if (!process.env.PRIVATE_KEY) {
      console.error("Please set PRIVATE_KEY in your .env file");
      return;
    }

    const signer = new ethers.Wallet(process.env.PRIVATE_KEY);
    console.log("Using wallet address:", signer.address);
    console.log();

    // Check if a specific CID was provided as command line argument
    const specificCID = process.argv[2];

    if (specificCID) {
      await accessSpecificFile(specificCID);
    } else {
      await accessUploadedFiles();
    }

    console.log("\n=== DONE ===");
    console.log("Usage:");
    console.log("- Access all uploaded files: node app.js");
    console.log("- Access specific file: node app.js <CID>");
    console.log("- Upload new files: node upload-regular.js");
  } catch (error) {
    console.error("Main execution error:", error);
  }
}; 

main();

