const crypto = require('crypto')
const assert = require('nanoassert')
const base58 = require('bs58')
const Script = require('btc-script-builder')

module.exports = {
  fromMultisig,
  computeNestedAddress
}

function fromMultisig (m , n, keys) {
  assert(keys.length === n, `${n} keys required for multisig.`)
  assert(m > 0 && m <= n)
  assert(n > 0 && n < 16)
  assert(Array.isArray(keys))
  
  for (let key of keys) {
    assert(Buffer.isBuffer(key))
  }

  const orderedKeys = []
  let len = 0

  const sortKeys = keys.sort(Buffer.compare)
  for (let key of sortKeys) {
    orderedKeys.push(key)
  }

  const script = new Script()

  script.addOp(m)
  for (let key of orderedKeys) {
    script.addData(key)
  }
  script.addOp(n)
  script.addOp('CHECKMULTISIG')

  // return script compiled to a buffer
  return script.compile()
}

function computeNestedAddress (script) {
  assert(script instanceof Uint8Array, 'script should be encoded to bytes')
  const scriptHash = sha256(script)
  const p2sh = fromProgram(0, scriptHash)

  return addressFromScript(p2sh)
}

function fromProgram (version, data) {
  assert((version & 0xff) === version && version >= 0 && version <= 16)
  assert(Buffer.isBuffer(data) && data.length >= 2 && data.length <= 40)

  const versionOp = version === 0 ? 0 : version + 0x50

  const script = new Script()

  script.addOp(versionOp)
  script.addData(data)

  // return script compiled to buffer
  return script.compile()
}

function addressFromScript (script, testnet = false) {
  assert(Buffer.isBuffer(script), 'script hash must be passed as raw bytes')

  // compute ripemd160 hsah of sha256(script)
  const digest = hash160(script)
  
  // include a network flag for mainnet/testnet
  let extendedDigest = Buffer.alloc(21)
  extendedDigest[0] = testnet ? 0xc4 : 0x05
  extendedDigest.set(digest, 1)

  // first 4 bytes of SHAd result taken as checksum
  const checksum = sha256(sha256(extendedDigest)).slice(0, 4)

  // base58 encode result
  const address = Buffer.concat([extendedDigest, checksum])
  return base58.encode(address)
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
