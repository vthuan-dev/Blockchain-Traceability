require('dotenv').config({ path: '../.env' });
const bip39 = require('bip39');

const mnemonic = process.env.MNEMONIC.trim();
console.log('MNEMONIC:', mnemonic);
console.log('MNEMONIC length:', mnemonic.split(' ').length);
console.log('Is valid mnemonic:', bip39.validateMnemonic(mnemonic));