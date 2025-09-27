import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { webcrypto } from "crypto";
import { Buffer } from "buffer";
import fs from "fs";
import { ethers } from "ethers";
import lighthouse from "@lighthouse-web3/sdk";

const app = express();
const PORT = 5500;

// Enable JSON body parsing + CORS
app.use(express.json({ limit: "10mb" }));
app.use(cors());

// Make crypto available globally for Lighthouse SDK
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}
if (!globalThis.Buffer) {
  globalThis.Buffer = Buffer;
}

// Function to sign authentication message for encryption
const signAuthMessage = async (privateKey) => {
  const signer = new ethers.Wallet(privateKey);
  const publicKey = signer.address;

  const authMessage = await lighthouse.getAuthMessage(publicKey);
  const signedMessage = await signer.signMessage(authMessage.data.message);

  return signedMessage;
};

// Function to upload encrypted text
const uploadEncryptedText = async (text, apiKey, fileName = "encrypted-text", pubKey, signMess) => {
  try {
    // const privateKey = process.env.PRIVATE_KEY;
    // const signer = new ethers.Wallet(privateKey);
    // const publicKey = signer.address;

    // // Sign authentication message
    // const signedMessage = await signAuthMessage(privateKey);

    // Upload encrypted text
    const response = await lighthouse.textUploadEncrypted(
      text,
      apiKey,
      pubKey,
      signMess,
      fileName
    );

    // Save upload details
    const uploadDetails = {
      fileName: response.data.Name,
      cid: response.data.Hash,
      size: response.data.Size,
      publicKey: pubKey,
      uploadTimestamp: new Date().toISOString(),
      type: "text",
    };

    fs.writeFileSync(
      "text-upload-details.json",
      JSON.stringify(uploadDetails, null, 2)
    );

    return response;
  } catch (error) {
    console.error("Error uploading encrypted text:", error);
    throw error;
  }
};

app.get("/", (req, res) => {
  res.send("Lighthouse Encryption Server is running on port 5500");
});

// Encrypt text from frontend
app.post("/encrypt", async (req, res) => {
  try {
    const { text, fileName, pubKey, signMess } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });

    const apiKey = process.env.API_KEY;
    const response = await uploadEncryptedText(text, apiKey, fileName || "frontend-text", pubKey, signMess);

    res.json({ success: true, data: response.data });
    console.log("Encrypted text uploaded successfully:", response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
