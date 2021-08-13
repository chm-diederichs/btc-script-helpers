# btc-script-helpers

Some functions to help compose bitcoin scripts.

## Usage

```sh
npm i btc-script-helper
```

```js
const scripter = require('btc-script-helper')

// keys must be passed as buffers
const keys = []
keys.push(Buffer.from('0252a536c77bb9a0e46abb21633f2382a3c68de9b48c7933142d70d759cddb35c2', 'hex'))
keys.push(Buffer.from('03e5f2f74b8277f7b69d80987bff932de1009d82f366a920bfa60359620e5f5858', 'hex'))
keys.push(Buffer.from('034f355bdcb7cc0af728ef3cceb9615d90684bb5b2ca5f859ab0f0b704075871aa', 'hex'))

// construct a 2-of-3 multisig script
const script = scripter.fromMultisig(2, 3, keys)

// create a nested P2SH-P2WSH address from the script
const address = scripter.computeNestedAddress(script)

console.log('please pay to:', address)
// please pay to: 3KruSwZhXtDaHJpcqr5cMiuMbWCWQVS343
```

## API

#### `scripter.fromMultisig(m, n, keys)`

Compute an m-of-n multisig script. `keys` should be an array of `buffer`s, `n` should be < 16.

#### `scriptet.p2shAddress(script, [network = bitcoin])`

Compute a P2SH address from a script hash. Defaults to mainnet address.

#### `scriptet.p2pkhAddress(pubKey, [network = bitcoin])`

Compute a P2PKH address from a pubKey. Defaults to mainnet address.

#### `scripter.p2wshNestedAddress(script, [network = bitcoin])`

Compute the nested P2SH-P2WSH address for the given script. Script should be passed as a `buffer`. Defaults to mainnet address.

#### `scripter.p2wpkhNestedAddress(address, [network = bitcoin])`

Compute the nested P2SH-P2WPKH address for the given segwit address. Defaults to mainnet address.

#### `scripter.p2wpkh(address)`

Compute the scriptPubKey corresponding to a P2WPKH address.

#### `scripter.p2wsh(address)`

Compute the scriptPubKey corresponding to a P2WSH address.

#### `scripter.p2pkh(address)`

Compute the scriptPubKey corresponding to a P2PKH address.

#### `scripter.p2pkh(address)`

Compute the scriptPubKey corresponding to a P2PKH address.

#### `scripter.scriptToBytecode(script)`

Compute the bytecode for a given asm script.

#### `scripter.getScriptHash(script)`

Compute the Bitcoin internal scripthash format for a given script.
