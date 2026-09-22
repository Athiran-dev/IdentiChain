const axios = require('axios');
const FormData = require('form-data');

/**
 * Upload a file buffer to Pinata/IPFS.
 * @param {Buffer} buffer - File contents
 * @param {string} filename - Name for the pinned file
 * @returns {Promise<string>} IPFS CID (hash)
 */
async function uploadFileToPinata(buffer, filename) {
  const formData = new FormData();
  formData.append('file', buffer, filename);

  const res = await axios.post(
    'https://api.pinata.cloud/pinning/pinFileToIPFS',
    formData,
    {
      maxBodyLength: Infinity,
      headers: {
        ...formData.getHeaders(),
        pinata_api_key: process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_SECRET_KEY,
      },
    }
  );

  return res.data.IpfsHash;
}

/**
 * Pin a JSON object to Pinata/IPFS.
 * @param {object} jsonObject - The JSON to pin
 * @returns {Promise<string>} IPFS CID (hash)
 */
async function uploadJSONToPinata(jsonObject) {
  const res = await axios.post(
    'https://api.pinata.cloud/pinning/pinJSONToIPFS',
    jsonObject,
    {
      headers: {
        'Content-Type': 'application/json',
        pinata_api_key: process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_SECRET_KEY,
      },
    }
  );

  return res.data.IpfsHash;
}

/**
 * Fetch a file from IPFS via the Pinata gateway.
 * @param {string} cid - The IPFS CID to fetch
 * @returns {Promise<Buffer>} File contents as a buffer
 */
async function fetchFromIPFS(cid) {
  const res = await axios.get(`${process.env.PINATA_GATEWAY_URL}/${cid}`, {
    responseType: 'arraybuffer',
  });
  return Buffer.from(res.data);
}

module.exports = { uploadFileToPinata, uploadJSONToPinata, fetchFromIPFS };
