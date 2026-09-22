// Pinata configuration — credentials are read from process.env in utils/ipfs.js.
// This file centralises the gateway URL helper for consistency.

const PINATA_GATEWAY_URL = () => process.env.PINATA_GATEWAY_URL;

module.exports = { PINATA_GATEWAY_URL };
