const crypto = require('crypto')
const assert = require('nanoassert')
const base58 = require('bs58')
const { bech32 } = require('bech32')
const bint = require('bint8array')
const Script = require('btc-script-builder')
const NETWORKS = require('./networks')

const BECH32_PREFIXES = Object.values(NETWORKS).reduce(getSegwitPrefixes, [])

module.exports = {
  fromMultisig,
  payToAddress,
  p2pkh,
  p2wpkh,
  p2wsh,
  p2pkhAddress,
  p2shAddress,
  p2wpkhNestedAddress,
  p2wshNestedAddress,
  scriptToBytecode,
  getScriptHash
}

// compute the redeem script for m-o-n multisig
function fromMultisig (m, n, keys) {
  assert(keys.length === n, `${n} keys required for multisig.`)
  assert(m > 0 && m <= n)
  assert(n > 0 && n < 16)
  assert(Array.isArray(keys))

  for (const key of keys) {
    assert(Buffer.isBuffer(key))
  }

  const orderedKeys = []

  const sortKeys = keys.sort(Buffer.compare)
  for (const key of sortKeys) {
    orderedKeys.push(key)
  }

  const script = new Script()

  script.addOp(m)
  for (const key of orderedKeys) {
    script.addData(key)
  }
  script.addOp(n)
  script.addOp('CHECKMULTISIG')

  // return script compiled to a buffer
  return script.compile()
}

// given an address, return the scriptPubKey
function payToAddress (addr, network) {
  return isBech32(addr, network) ? p2wpkh(addr) : p2pkh(addr)
}

// given a script, return the p2sh address
function p2shAddress (script, network = NETWORKS.bitcoin) {
  assert(Buffer.isBuffer(script), 'script hash must be passed as raw bytes')

  // compute ripemd160 hsah of sha256(script)
  const digest = hash160(script)

  // include network flag
  const extendedDigest = Buffer.alloc(21)
  extendedDigest[0] = network.scriptHash
  extendedDigest.set(digest, 1)

  // first 4 bytes of SHAd result taken as checksum
  const checksum = sha256(sha256(extendedDigest)).slice(0, 4)

  // base58 encode result
  const address = Buffer.concat([extendedDigest, checksum])
  return base58.encode(address)
}

// given a pubKey, return the p2pkh address
function p2pkhAddress (pubKey, network = NETWORKS.bitcoin) {
  const pubKeyHash = hash160(pubKey)

  const extendedDigest = Buffer.allocUnsafe(21)
  extendedDigest.writeUint8(network.pubKeyHash)
  extendedDigest.set(pubKeyHash)

  // first 4 bytes of SHAd result taken as checksum
  const checksum = sha256(sha256(extendedDigest)).slice(0, 4)

  // base58 encode result
  const address = Buffer.concat([extendedDigest, checksum])
  return base58.encode(address)
}

// given a p2pkh address, return the scriptPubKey
function p2pkh (addr) {
  assert(!isBech32(addr), 'Bech32 addresses should use p2sh-p2wpkh script')

  const script = new Script()

  script.addOp('DUP')
  script.addOp('HASH160')
  script.addData(pkhFromLegacyAddress(addr))
  script.addOp('EQUALVERIFY')
  script.addOp('CHECKSIG')

  return script.compile()
}

// given a p2wpkh address, return the scriptPubKey
function p2wpkh (addr) {
  assert(isBech32(addr), 'Legacy addresses cannot be used for p2wpkh scripts')
  return fromProgram(0, pkhFromBech32Address(addr))
}

// given a p2wsh address, return the scriptPubKey
function p2wsh (script) {
  assert(script instanceof Uint8Array, 'script should be encoded to bytes')
  const scriptHash = sha256(script)
  return fromProgram(0, scriptHash)
}

// given a p2wpkh address, return the p2sh-p2wpkh nested address
function p2wpkhNestedAddress (address, network) {
  return p2shAddress(p2wpkh(address), network)
}

// given a p2wsh address, return the p2sh-p2wsh nested address
function p2wshNestedAddress (script, network) {
  return p2shAddress(p2wsh(script), network)
}

// given a program, return the segwit scriptPubKey
function fromProgram (version, data) {
  assert((version & 0xff) === version && version >= 0 && version <= 16)
  assert(data instanceof Uint8Array && data.length >= 2 && data.length <= 40)

  const versionOp = version === 0 ? 0 : version + 0x50

  const script = new Script()

  script.addOp(versionOp)
  script.addData(data)

  // return script compiled to buffer
  return script.compile()
}

function isBech32 (address, network) {
  const prefix = address.split(1)[0]
  const checkFor = network
    ? [network].reduce(getSegwitPrefixes, [])
    : BECH32_PREFIXES

  return checkFor.includes(prefix)
}

// extract pubKey hash from legacy address
function pkhFromLegacyAddress (addr) {
  return base58decode(addr).data
}

// extract pubKey hash from bech32 address
function pkhFromBech32Address (addr) {
  const { words } = bech32.decode(addr)
  return new Uint8Array(bech32.fromWords(words.slice(1)))
}

function getSegwitPrefixes (acc, network) {
  if (network.bech32) acc.push(network.bech32)
  if (network.blech32) acc.push(network.blech32)
  return acc
}

function base58decode (addr) {
  const bytes = base58.decode(addr)

  const split = bytes.byteLength - 4
  const checksum = bytes.slice(split)
  const hash = sha256(sha256(bytes.subarray(0, split)))
  assert(bint.compare(hash.subarray(0, 4), checksum) === 0)

  return {
    prefix: bytes[0],
    data: bytes.subarray(1, split)
  }
}

function scriptToBytecode (script) {
  return Script.from(script)
}

function getScriptHash (script) {
  return sha256(script).reverse()
}

function sha256 (data) {
  return crypto.createHash('sha256').update(data).digest()
}

function ripemd160 (data) {
  return crypto.createHash('ripemd160').update(data).digest()
}

function hash160 (data) {
  return ripemd160(sha256(data))
}
