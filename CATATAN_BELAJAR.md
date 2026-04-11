# 📒 Catatan Belajar GOTT — Hardhat Journey

Rekap lengkap eksperimen yang dilakukan di Hardhat console untuk memahami smart contract GOTT dari dalam.

**Tanggal:** 2026-04-11
**Branch:** main
**Contract:** `contracts/GuardiansToken.sol`

---

## 🔧 Setup & Fix Awal

### Problem
- `package.json` memakai OpenZeppelin Contracts v5.1.0 yang butuh `pragma ^0.8.24`
- `hardhat.config.js` di-set ke Solidity `0.8.20` → error `HH606`
- Setelah bump ke 0.8.24, muncul error `mcopy not found` di `OZ Bytes.sol` karena default `evmVersion` solc 0.8.24 adalah `shanghai`, padahal `mcopy` hanya ada di `cancun`

### Fix (commit history)
| Commit | Perubahan |
|---|---|
| `6a6734f` | Bump Solidity `0.8.20` → `0.8.24` di `hardhat.config.js` dan `contracts/GuardiansToken.sol` |
| `3e91cf1` | Add `package-lock.json` |
| `8b81946` | Set `evmVersion: "cancun"` di `hardhat.config.js` — BSC support Cancun sejak hardfork Tycho (Maret 2024) |

### Hasil
```
Compiled 35 Solidity files successfully (evm target: cancun).
21 passing (701ms)
```

Test suite hijau semua: Deployment (7), Minting (3), Anti-Whale (5), Pause (2), Burn (1), Governance/Votes (3).

---

## 🎓 Tahap 1 — Hardhat Console (Interaksi Dasar)

### 1.1 — 20 Wallet Gratis
```
Jumlah akun: 20
Owner: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Alice: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Owner balance: 10000.0 ETH
```

### 1.2 — Deploy GOTT
```javascript
const Token = await ethers.getContractFactory("GuardiansToken");
const token = await Token.deploy(owner.address, 40);
```
```
GOTT deployed at: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Name: Guardians Token
Symbol: GOTT
Total Supply: 400000000.0 GOTT    ← 40% dari 1B
Max Supply:   1000000000.0 GOTT   ← hard cap
Mintable Remain: 600000000.0 GOTT
```

### 1.3 — Transfer ke Alice
Transfer 1,000,000 GOTT ke Alice. Owner turun dari 400M → 399M. Receipt: `gasUsed: 65201, status: 1, blockNumber: 2`.

### 1.4 — Anti-Whale
Max wallet = 2% = 20 juta. Coba kirim 25 juta ke Bob → ditolak dengan `ExceedsMaxWallet`. Kirim 19 juta → sukses. Bob = 19,000,000 GOTT.

Owner sekarang: 400M − 1M − 19M = **380M**.

### 1.5 — Mint Access Control
- Alice (bukan MINTER_ROLE) mint 1000 GOTT → ditolak `AccessControlUnauthorizedAccount`
- Owner mint 5,000,000 GOTT ke Charlie → sukses
- Mintable Remain: 600M → 595M

### 1.6 — Hard Cap
Coba mint 700,000,000 (> remaining 595M) → ditolak dengan error:
```
ExceedsMaxSupply(700000000000000000000000000, 595000000000000000000000000)
```
Custom error Solidity 0.8.4+ membawa parameter aktual (requested, available) — lebih gas-efficient dari string `require()`.

### 1.7 — Burn (Deflationary)
Bob burn 5,000,000 dari balance-nya.
```
Supply before: 405000000.0
Supply after:  400000000.0
Bob now:       14000000.0
```

**Catatan desain:** Burn turunkan `totalSupply` tapi MAX_SUPPLY tetap 1B, jadi `mintableSupply` **naik 5 juta**. GOTT tidak punya flag "burn permanen, tidak bisa di-mint ulang".

### 1.8 — Pause Mechanism
```javascript
await token.pause();
```
Semua transfer frozen dengan `EnforcedPause()`. Pause ini blanket — bukan cuma transfer, tapi semua operasi yang panggil `_update()` internal: mint, burn, transferFrom. Unpause restore semuanya.

### 1.9 — Governance / Voting Power (Gotcha besar)

**Fakta 1 — Voting power BUKAN otomatis dari balance:**
```
Owner balance: 380M
Owner votes (before delegate): 0   ← hah?
```
ERC20Votes pakai **opt-in** — harus `delegate()` dulu (bahkan ke diri sendiri) untuk aktifkan voting power.

Setelah `token.delegate(owner.address)`:
```
Owner votes: 380000000
```

**Fakta 2 — Delegate ke orang lain:**
```javascript
await token.connect(alice).delegate(bob.address);
```
Alice tetap punya token, tapi voting power-nya pindah:
```
Alice balance: 999,800      ← token masih ada
Alice votes:   0             ← suaranya pindah
Bob balance:   14,000,000
Bob votes:     999,800       ← CUMA suara Alice! Bukan 14M!
```

**Gotcha:** Bob punya 14M token, tapi voting power-nya 0 untuk token itu karena Bob **belum self-delegate**. "Dormant votes" sampai dia eksplisit aktifkan.

Setelah `token.connect(bob).delegate(bob.address)`:
```
Bob votes: 14,999,800   ← 14M own balance + 999,800 dari Alice
```

**Implikasi untuk DAO:** holder harus diedukasi — banyak yang bingung kenapa token mereka "nggak bisa voting" padahal punya. Jawabannya: harus `delegate()` sendiri dulu.

---

## 🕰️ Tahap 2 — Time Travel & Governance Snapshots

### Konsep
- `block.number` vs `block.timestamp`
- ERC20Votes punya `getPastVotes(address, blockNumber)` — query voting power di masa lalu
- Ini fondasi snapshot-based DAO voting (anti flash-loan vote attack)

### 2.1 — Baseline Waktu
```
Block number: 15
Timestamp: 1775888902 → 2026-04-11
Bob votes now: 14,999,800 GOTT
```

### 2.3 — Fast Forward 1 Tahun
```javascript
await network.provider.send("evm_increaseTime", [31536000]);
await network.provider.send("evm_mine");
```
Hasil: timestamp loncat ke **2027-04-11**, block naik ke 16.

### 2.4 — Historical Voting Power
```javascript
await token.getPastVotes(bob.address, 15);
// → 14999800000000000000000000
```
Walau kita sudah di masa depan, voting power Bob di block 15 **tetap** 14,999,800 GOTT. Immutable forever.

### 2.5 — Time Travel Ekstrem + Bukti Immutability
- Maju lagi 10 tahun → **2037-04-08**
- Query `getPastVotes(bob, 15)` → masih **14,999,800 GOTT** (11 tahun "kalender" berlalu)
- Ditambah test perubahan state sekarang: Bob transfer 10M ke Charlie
  - Bob votes NOW: **4,999,800** (turun)
  - Bob votes di block 15: **14,999,800** (unchanged) ✅

**Implikasi security:** flash-loan attack dicegah — kamu nggak bisa pinjam token → vote → kembalikan, karena snapshot dikunci ke block di masa lalu.

**Trade-off:** Storage cost. Tiap perubahan balance holder yang delegated → checkpoint baru. ERC20Votes transfer ~30k gas lebih mahal dari plain ERC20.

---

## 📡 Tahap 3 — Events & Logs

### Konsep
Events = cara contract "nge-broadcast" perubahan. Cheap (~375 gas/byte vs 20k untuk storage), immutable, searchable via indexed params.

### 3.1–3.2 — Timeline Semua Transfer

Dari 8 Transfer events yang pernah terjadi:

| Block | From | To | Amount | Interpretasi |
|---|---|---|---|---|
| 1 | `0x000000` | Owner | 400M | Initial mint saat deploy |
| 2 | Owner | Alice | 1M | Transfer #1 |
| 3 | Owner | Bob | 19M | Edge-case anti-whale (< limit 20M) |
| 4 | `0x000000` | Charlie | 5M | Mint dari owner |
| 6 | Bob | `0x000000` | 5M | **Burn** 5M |
| 10 | Alice | Charlie | 100 | Transfer post-unpause |
| 12 | Alice | Charlie | 100 | Duplikat dari paste error |
| 17 | Bob | Charlie | 10M | Transfer di tahap 2.5 |

**Fakta ERC20:** Mint = `Transfer(0x0, to, v)`, Burn = `Transfer(from, 0x0, v)`. Nggak ada event terpisah. Itu kenapa BscScan bisa tampilkan mint/burn di tab Transfers.

### 3.3 — Filter by Address
```javascript
await token.queryFilter(token.filters.Transfer(null, alice.address))  // inbound
await token.queryFilter(token.filters.Transfer(alice.address, null))  // outbound
```
- Alice inbound: 1 event
- Alice outbound: 2 events

Bisa karena `from` dan `to` di `Transfer` event pakai `indexed` modifier → Bloom filter per block → cepat.

### 3.4 — DelegateChanged Events
3 events ditemukan:
```
Owner → self
Alice → Bob
Bob → self
```
Semua `from = 0x000000` artinya first-time delegation. Tools kayak Tally & Snapshot pakai ini untuk bangun delegation graph DAO.

### 3.5 — DelegateVotesChanged Timeline
4 events:
```
Block 13: Owner → 380M         (self-delegate)
Block 14: Bob   → 999,800       (terima delegasi Alice)
Block 15: Bob   → 14,999,800    (self-delegate, own balance join)
Block 17: Bob   → 4,999,800     (transfer 10M keluar)
```

**Notice:** Alice nggak pernah muncul di sini walaupun punya 999,800 GOTT — karena dia delegate ke Bob, bukan ke dirinya sendiri.

### 3.6 — Filter Client-Side (whale tracker pattern)
Query "semua transfer > 5 juta":
```javascript
events.filter(e => e.args[2] > ethers.parseEther("5000000"))
```
Hasil: 3 events (mint 400M, 19M ke Bob, 10M Bob→Charlie).

Trade-off: fleksibel tapi nggak scale untuk contract dengan jutaan events. Solusinya pakai The Graph atau custom indexer.

---

## ⛽ Tahap 4 — Gas Profiling

### Formula
```
biaya (BNB) = gasUsed × gasPrice
biaya (USD) = biaya (BNB) × harga BNB
```
Asumsi BSC: gasPrice 3 Gwei, BNB $600.

### 4.1 — Transfer Gas (Cold vs Warm)

**Kesalahan expectation awal:** warm/cold EIP-2929 itu **per-transaction**, bukan antar TX. Jadi dua transfer berturut-turut ke address yang sudah punya balance = **sama persis 80,931 gas**.

**Yang beneran bikin gas beda:** `SSTORE` rules — zero→non-zero cost **20,000 gas**, non-zero→non-zero cost **5,000 gas**.

Transfer ke address baru (`signers[4]`, balance 0 → 1 GOTT): **98,031 gas**.

### 4.2 — Cost Transfer di BSC
```
98,031 × 3 Gwei = 0.000294 BNB
0.000294 × $600 = $0.1764 per transfer
```

Amplifikasi:
| Volume | Biaya Total |
|---|---|
| 1 transfer | $0.18 |
| 100 transfer | $18 |
| 10k/hari | $1,800/hari |
| 1M/bulan | $180,000 |

### 4.3 — Gas per Operasi

| Operasi | Gas | Biaya (BSC, 3 Gwei, BNB $600) |
|---|---|---|
| Transfer (cold, new address) | 98,031 | $0.176 |
| Transfer (warm, existing) | 80,931 | $0.146 |
| **Mint** | 81,614 | $0.147 |
| **Burn** | 73,913 | $0.133 |
| **Delegate** (first time) | 95,650 | $0.172 |

**Insight:**
- **Mint ≈ warm transfer** — karena `_mint` = transfer dari 0x0, tambah update `totalSupply`, kurang update slot sender
- **Burn termurah** — 1 SSTORE (balance) + totalSupply update, nggak ada receiver slot
- **Delegate termahal** — write `_delegates`, move voting power, push checkpoint array (2 SSTORE: length + element), emit 2 events

### 4.4 — Deploy GOTT ke BSC
```
gasUsed: 2,586,919
cost:    0.00776 BNB = $4.65
```

Perbandingan cross-chain deploy cost:
| Chain | Cost Deploy GOTT |
|---|---|
| **BSC** | ~$4.65 |
| **Ethereum L1** | ~$155 |
| **Polygon** | ~$0.08 |
| **Arbitrum** | ~$0.78 |

**Kenapa deploy mahal?** Bytecode GOTT ~13KB × 200 gas/byte = ~2M gas upload, + ~500k execution constructor.

**Optimasi future:**
- Proxy pattern (UUPS/Transparent) — implementation 1x, proxy 300k gas
- Drop ERC20Votes kalau nggak butuh governance (~40% bytecode)
- CREATE2 untuk deterministic address

### Plain ERC20 Comparison
ERC20Votes bikin transfer **~88% lebih mahal** dari plain ERC20 (~52k gas). Ini "biaya on-chain governance".

---

## 🔑 Tahap 5 — Permit / Gasless Approval (EIP-2612)

### Konsep
User sign pesan off-chain (EIP-712 structured data), siapa pun bisa submit signature itu untuk aktifkan allowance. User tidak perlu BNB/gas untuk approve. GOTT inherit `ERC20Permit`.

### Alur
1. **Build EIP-712 domain + message** — domain berisi `name`, `version`, `chainId`, `verifyingContract`
2. **Owner sign** dengan `signer.signTypedData(domain, types, message)` — **0 gas, no TX**
3. **Spender submit** signature via `token.permit(owner, spender, value, deadline, v, r, s)` — **yang submit bayar gas, bukan owner**
4. **Spender pakai allowance** dengan `transferFrom()`

### Eksperimen

**5.1 — Build signature:**
```javascript
const domain = { name: "Guardians Token", version: "1", chainId: 31337, verifyingContract: addr };
const types = { Permit: [
  {name:"owner",type:"address"}, {name:"spender",type:"address"},
  {name:"value",type:"uint256"}, {name:"nonce",type:"uint256"},
  {name:"deadline",type:"uint256"}
]};
const message = { owner: alice.address, spender: bob.address, value, nonce, deadline };
const signature = await alice.signTypedData(domain, types, message);
// → 0x...130 char hex
```

Signature dipecah jadi r/s/v via `ethers.Signature.from(signature)`.

**5.2 — Submit by Bob:**
- `gasUsed: 74,815`
- `from: 0x3C44Cd...` (**Bob**, BUKAN Alice!)
- Allowance Alice→Bob = 1000 GOTT

**5.3 — Replay attack (gagal total):**
Submit signature yang sama lagi → error:
```
ERC2612InvalidSigner(recovered, expectedAlice)
```
Karena nonce sudah increment (0 → 1), hash yang di-recompute di contract berbeda dari hash yang Alice tanda tangan, jadi ECDSA recover balik address acak, dan nggak match Alice. Clean anti-replay via counter.

### Gotcha Time Travel
`Date.now()` = real time server, tapi blockchain clock bisa di posisi lain setelah time travel. Pakai `latestBlock.timestamp + 3600` buat deadline, jangan `Date.now() + 3600`. Error-nya: `ERC2612ExpiredSignature(timestamp)`.

### Perbandingan Flow

| | Classic Approve | Permit Flow |
|---|---|---|
| Alice bayar gas | ~46k ($0.08) | **0** |
| Alice butuh BNB | Ya | Tidak |
| Alice TX | 1 (approve) | 0 (cuma sign) |
| Bob bayar gas | 82k (transferFrom) | 75k (permit) + 82k (transferFrom) = 157k |
| Total gas | ~128k | ~157k (**29k lebih mahal**) |
| UX | 2 klik wallet | 1 klik (sign saja) |

**Trade-off:** 29k gas extra untuk UX 10x mulus + alice nggak butuh BNB sama sekali. Pilihan standar DeFi modern (Uniswap permit2, 1inch, Aave, DAI).

---

## 🌐 Tahap 6 — Fork BSC Mainnet

### Konsep
Hardhat bisa **clone state live chain** ke chain lokal. Baca = passthrough ke RPC mainnet, tulis = ke memory lokal. Kamu punya copy mainnet yang bisa edit bebas.

**Use case:** pre-launch testing, exploit reproduction, integration test, migration dry-run.

### Setup Fix Panjang

**Masalah RPC:**
- ❌ `bsc-dataseed.binance.org` — blocked dari server (DNS/IP)
- ❌ `binance.llamarpc.com` — DNS fail
- ❌ `bsc.publicnode.com` — responsif tapi **bukan archive**, nolak historical state
- ✅ `bsc.drpc.org` — **archive + responsif** — pemenang

**Masalah EDR Hardfork:** Hardhat 2.22+ pakai EDR engine rust, nolak execute di chain 56 dengan error "No known hardfork for execution on historical block". Fix config:

```javascript
// hardhat.config.js
hardhat: {
  chainId: 31337,
  forking: process.env.FORK === "true" ? {
    url: process.env.BSC_RPC || "https://bsc-dataseed.binance.org",
    blockNumber: process.env.FORK_BLOCK ? parseInt(process.env.FORK_BLOCK) : undefined,
  } : undefined,
  hardfork: "shanghai",
  chains: {
    56: {
      hardforkHistory: {
        byzantium: 0, constantinople: 0, petersburg: 0, istanbul: 0,
        muirGlacier: 0, berlin: 0, london: 0, arrowGlacier: 0,
        grayGlacier: 0, merge: 0, shanghai: 0,
      },
    },
  },
}
```

**Workaround runtime:** Mesti `evm_mine` 1 block lokal dulu sebelum call contract mainnet — else EDR tetap nolak karena treat fork block sebagai "historical".

**Activate fork:**
```bash
FORK=true BSC_RPC=https://bsc.drpc.org npx hardhat console
```
Lalu di console: `await network.provider.send("evm_mine")` sebelum call pertama.

### Eksperimen

**6.1 — Bukti Live Mainnet State:**
- Block number: 91,878,017 (BSC mainnet real-time)
- WBNB total supply: **1,769,110.36** WBNB
- USDT total supply: **8,984,992,663** USDT (~$9B)
- CAKE total supply: 3,968,010,755 (cumulative)

**6.2 — Impersonate Binance Hot Wallet:**
Address: `0x8894E0a0c962CB723c1976a4421c95949bE2D4E3`
Balance: **92,874 BNB** (~$55.7M — cocok dengan Nansen)

```javascript
await network.provider.request({ method: "hardhat_impersonateAccount", params: [binanceHot] });
const binanceSigner = await ethers.getSigner(binanceHot);
await binanceSigner.sendTransaction({ to: me.address, value: ethers.parseEther("100") });
```

**Signed TX "sebagai Binance" tanpa private key.** Nonce TX asli: **50,987,489** — bukti sinkron ke real chain. Signature `r` dan `s` dipalsukan EDR dengan address hex (skip ECDSA verify). Cuma work di fork.

**6.3 — Deploy GOTT di Forked BSC:**
Address: `0x7c8dd29eF968FFFc20f9459B3a9f86FA12b02EDa` (beda dari local biasa karena deployer `0xf39Fd6...` punya nonce **19,932** di BSC mainnet — address itu shared key default Hardhat yang dipakai developer di seluruh dunia).

**6.4 — Query PancakeSwap Pool WBNB-USDT:**
Pool: `0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE`
```
reserve USDT: 17,188,448.7
reserve WBNB:    28,404.47
price BNB = reserveUSDT / reserveWBNB = $605.13
```
Match persis dengan Nansen TVL ($34.4M) dan harga market.

**6.5 — Create Pool GOTT/WBNB di Real PancakeSwap:**
1. `gott.toggleMaxWallet(false)` — disable anti-whale untuk test
2. `gott.approve(router, MaxUint256)` — infinite allowance
3. `router.addLiquidityETH(gott, 10M, 0, 0, me, dl, {value: 100 BNB})` — gas: **3,478,329** (~$6.31 di mainnet)
4. Pair address: `0xd8a77a0E13F6B4C9166E11FF9610b453e2D84AdF`
5. Initial reserves: 10,000,000 GOTT + 100 BNB
6. Initial price: 0.00001 BNB/GOTT = **$0.00605** per GOTT
7. FDV (400M circulating): **$2.42M**

**6.6 — Retail Swap (1 BNB buy):**
```
Input:   1 BNB ($605)
Output:  98,764.82 GOTT
Slippage: ~1.25% (fee 0.25% + price impact ~1%)
Gas:     165,148
```

**6.7 — Whale Dump 1000 BNB (AMM Math Horror):**

Quote sebelum swap:
```
1000 BNB → 8,990,880 GOTT  (rate: 8,990 GOTT/BNB)
```

Bandingkan dengan retail rate 98,764 GOTT/BNB — **whale bayar 11x lebih mahal per GOTT**! Formula constant product:
```
x × y = k = 10M × 100 = 1,000,000,000
Fee-adjusted input: 1000 × 0.9975 = 997.5 BNB
New BNB reserve: 1097.5
New GOTT reserve: 1,000,000,000 / 1097.5 = 911,162
Whale receives: 10,000,000 - 911,162 ≈ 9,088,838 (~9M GOTT)
```

**State pool post-dump:**

| | Sebelum | Sesudah | Δ |
|---|---|---|---|
| GOTT reserve | 10,000,000 | 910,354 | **−91%** |
| WBNB reserve | 100 | 1,101 | **+1001%** |
| Price BNB/GOTT | 0.00001 | 0.001209 | **+120x** |
| Price USD | $0.00605 | $0.731 | **+120x** |

**Post-whale quote untuk retail baru:**
```
1 BNB → 824 GOTT  (vs 98,764 sebelum whale)
```
Retail #2 FOMO di harga pucuk → dapat 0.83% dari retail #1. **"Bought the top"**.

### 6.12 — Whale Dump (Exit Phase) — Full Cycle

Whale approve GOTT ke router, lalu `swapExactTokensForETH(8990880 GOTT, 0, pathSell)`.

Quote: 8,990,880 GOTT → **999.54 BNB output**.

**Whale invest 1000 BNB → cash out 999.54 BNB → LOSS 0.46 BNB** (~$278).

**Kenapa rugi?** Round-trip kena 2× fee 0.25% (~0.5%) + slippage bolak-balik. Kalau tidak ada trader lain yang push harga naik di antara buy dan sell, whale **selalu rugi fees**.

**Pelajaran AMM:** Pump-and-dump profit datang dari **bagholder**, bukan dari math. Whale baru untung kalau ada retail FOMO masuk di antara buy dan sell-nya.

State pool post full-cycle:
```
GOTT reserve: 9,901,234 (naik dari 910k saat pump, hampir balik awal)
BNB reserve:  101.46    (awal 100 — LP gain 1.46 BNB dari fees)
Harga GOTT:   96,395/BNB (vs 98,764 awal — naik 2.4% karena fee accrual)
```

**LP (kamu) profit** ~5 BNB total fee kumulatif dari semua swap (walaupun net reserves gain cuma 1.46 BNB karena offset slippage loss whale).

### 6.13 — Anti-Whale IN ACTION

Re-enable max wallet set ke 1M (minimum MAX_SUPPLY/1000), exempt pair address (supaya sell ke pool tetap jalan).

**Test A — retail kecil (0.1 BNB):**
```
Output: 9,724 GOTT → under 1M limit → PASS ✅
```

**Test B — whale 1000 BNB via router:**
```
Error: Pancake: TRANSFER_FAILED
```
PancakeSwap wrap revert jadi generic error string. Root cause: `ExceedsMaxWallet` di `_update()`, tapi router pakai `require(token.transfer(...), "Pancake: TRANSFER_FAILED")` pattern yang mask error asli.

**Test C — direct transfer 2M ke whale (expose root cause):**
```
Error: ExceedsMaxWallet("0x8894E0...", 2000000374274801842066894, 1000000000000000000000000)
```
Custom error GOTT dengan parameter lengkap: (account, wouldBeBalance, limit). Edukatif.

**Test D — accumulation attack (split jadi kecil lalu top-up):**
- Whale buy 0.5 BNB → dapat 48,339 GOTT (PASS, di bawah limit)
- Owner top-up 1,000,000 GOTT ke whale → total akan 1,048,339 (di atas 1M)
- **DITOLAK dengan ExceedsMaxWallet** ✅

**Anti-whale bekerja karena check dilakukan di `_update()` (internal hook) dan cek post-balance, bukan per-TX amount.** Split attack tidak lolos.

**Insight UX untuk frontend:** translate `Pancake: TRANSFER_FAILED` jadi "⚠️ Transaction blocked: anti-whale max wallet (1M GOTT) limit reached". Tanpa ini, user stuck confused dengan error router generic.

**Satu-satunya bypass valid:**
1. Admin set recipient jadi exempt (`setExemptFromMaxWallet(addr, true)`)
2. Admin increase `maxWalletAmount` atau `toggleMaxWallet(false)`
3. Whale pakai banyak wallet berbeda (Sybil — cost overhead tinggi, jejak on-chain mudah di-track)

### Pelajaran untuk Real Launch GOTT

1. **Liquidity awal wajib dalam** — minimal $500k-$1M per side supaya whale 1000 BNB cuma geser harga ~5%, bukan 120x
2. **Biarkan anti-whale max wallet 2% aktif** — blokade natural whale pump (kami disable untuk test doang)
3. **Lock LP token** — pakai Unicrypt/Team.Finance, minimal 6-12 bulan, biar dev nggak bisa rug
4. **Vesting team tokens** — cliff 3-6 bulan, linear 12-24 bulan
5. **Launch dengan max-buy limit** beberapa menit pertama (pakai contract helper)
6. **Edukasi retail** — "jangan FOMO di menit pertama"

### Insight Baru Tahap 5-6

11. **Permit bukan gratis, cuma shift gas ke spender** — total gas sedikit lebih mahal, tapi UX jauh mulus
12. **Signature replay protection = 1 nonce counter** — sederhana, murah, efektif
13. **Fork = copy mainnet bisa-edit** — mindset ini membuka test scenario yang nggak mungkin di testnet
14. **Impersonate account = testing superpower** — simulate whale, multisig, contract interaction tanpa private key
15. **RPC provider matters untuk fork** — public RPC biasa bukan archive, butuh yang serve historical state (drpc.org)
16. **EDR hardfork issue → workaround evm_mine** — lesson: kadang solusi Hardhat issues adalah satu call kecil sebelum operasi besar
17. **Constant product AMM brutal untuk trade besar vs pool kecil** — 91% price impact dari 1000 BNB ke pool 100 BNB
18. **Default Hardhat signer `0xf39Fd6...` punya nonce real di mainnet** — public key dari mnemonic default, ribuan dev pernah pakai
19. **Pair address deterministik** — dihitung dari CREATE2(factory, salt=keccak(token0+token1)), sama di semua fork
20. **Price impact naik eksponensial** — 1 BNB → 1% impact, 10 BNB → 10% impact, 100 BNB → 50% impact, 1000 BNB → 90%+ impact
21. **AMM round-trip = guaranteed loss** dari fees kecuali ada trader lain push harga — pump & dump bukan strategi profitable sendirian
22. **PancakeSwap wrap revert** pakai string generik — masking real error. Fix: pre-check di frontend sebelum submit TX
23. **Anti-whale post-balance check** > per-TX amount check — split attack tidak lolos karena dihitung saat balance recipient setelah transfer

---

## 🔍 Tahap 7 — Slither Static Analysis

### Setup
```bash
pip3 install slither-analyzer --break-system-packages
solc-select install 0.8.24 && solc-select use 0.8.24
slither . --filter-paths "node_modules"
```

### Hasil (`--print human-summary`)
```
Total number of contracts in source files:   1
Source lines of code (SLOC) in source files: 97
Number of assembly lines:                    0
High issues:          0 ✅
Medium issues:        0 ✅
Low issues:           0 ✅
Informational issues: 0 ✅
Optimization issues:  0 ✅
Complex code:         No
```

**ZERO FINDINGS di GuardiansToken.sol** dari 101 detector Slither. Clean baseline.

### Yang Dicek (sebagian dari 101 detector)
- **Reentrancy** — `reentrancy-eth`, `reentrancy-no-eth`, `reentrancy-events`
- **Access** — `suicidal`, `arbitrary-send`, `tx-origin`, `incorrect-modifier`
- **Logic** — `incorrect-equality`, `divide-before-multiply`, `uninitialized-state`
- **ERC20** — `approve-race-cond`, `unchecked-transfer`
- **Flow** — `dead-code`, `unused-return`, `unused-state`

### Catatan dari Report
1. **"∞ Minting" flag** — contract bisa mint sampai MAX_SUPPLY 1B. Bukan bug tapi harus di-disclose investor.
2. **"Approve Race Condition"** — inherent di ERC20 spec (semua token kena). Mitigasi: pakai permit (EIP-2612, sudah di GOTT) atau `approve(0)` dulu.
3. **"Pausable"** — `PAUSER_ROLE` power harus diumumkan. Production: multisig atau timelock.
4. **"Ecrecover"** — dipakai permit signature verify. Standar & aman.
5. **"No complex code"** — kompleksitas siklomatik rendah, mudah audit manual.

### Batasan Slither
Slither = **static analysis** pattern matching. Dia TIDAK menggantikan:
- Business logic audit
- Economic attack analysis (MEV, oracle manipulation)
- Governance game theory
- Integration risks
- Manual review oleh auditor pengalaman

**Slither = baseline wajib sebelum audit profesional, bukan pengganti.**

---

## 🎯 Tahap 8 — Foundry Fuzzing & Invariant Testing

### Setup
```bash
curl -L https://foundry.paradigm.xyz | bash
source ~/.bashrc
foundryup
```

Foundry install: `forge`, `cast`, `anvil`, `chisel` (v1.5.1).

Config `foundry.toml` (coexist dengan Hardhat, pakai folder terpisah):
```toml
[profile.default]
src = "contracts"
out = "out"
libs = ["node_modules", "lib"]
test = "test-foundry"
cache_path = "cache_forge"
solc = "0.8.24"
evm_version = "cancun"
optimizer = true
optimizer_runs = 200
remappings = ["@openzeppelin/=node_modules/@openzeppelin/"]

[fuzz]
runs = 500

[invariant]
runs = 100
depth = 50
fail_on_revert = false
```

Install `forge-std`:
```bash
forge install foundry-rs/forge-std --no-git
```

### Test File: `test-foundry/GuardiansToken.t.sol`

7 tests: 6 fuzz + 1 invariant.

**Run:**
```bash
forge test --match-path "test-foundry/**"
```

### Hasil (Setelah Fix)
```
7 tests passed | 0 failed | 0 skipped
Total fuzz runs: 2500 (5 × 500 runs)
Total invariant calls: 5000 (100 runs × 50 depth)
Duration: 302ms
```

| Test | Runs | Bukti |
|---|---|---|
| `testFuzz_burnDecreasesTotalSupply` | 500 | `totalSupply` selalu turun sesuai amount burn |
| `testFuzz_delegateSetsVotingPower` | 500 | Voting power match balance setelah delegate |
| `testFuzz_mintRespectsMaxSupply` | 501 | Mint selalu respect hard cap 1B |
| `testFuzz_onlyMinterCanMint` | 500 | **No random address** bisa mint (500 address acak tried) |
| `testFuzz_transferAntiWhale` | 500 | Transfer selalu respect max wallet |
| **INVARIANT** `totalSupplyNeverExceedsMaxSupply` | **5,000 calls** | Hard cap **mathematically proven** — 5000 panggilan random dari ANY fungsi tidak pernah melewati MAX_SUPPLY |

### Bug yang Fuzzer Temukan (di TEST, Bukan Contract)

Fuzzer catch test assumption salah:
- **Asumsi salah**: `mint()` cuma check hard cap
- **Kenyataan**: `mint()` juga kena anti-whale check di `_update()` (karena `_mint()` panggil `_update()` internal)

Counterexample yang fuzzer temukan: mint 522M GOTT → fail dengan `ExceedsMaxWallet` (bukan `ExceedsMaxSupply`), karena recipient balance > 20M limit.

**Fix test:** exempt recipient dari max wallet dulu untuk isolate supply cap test:
```solidity
vm.prank(owner);
token.setExemptFromMaxWallet(alice, true);
```

**Pelajaran:** fuzzer mengekspos **hidden constraint** yang nggak obvious dari unit test biasa. Ini insight yang wajib di-dokumentasi di NatSpec contract:
```
@dev mint() juga subject ke maxWallet — exempt recipient dulu kalau bulk mint
```

### Invariant Testing = Security Silver Bullet

Foundry invariant runner:
1. Deploy contract
2. Generate **random call sequence**: fungsi random, caller random, param random
3. Cek invariant setelah setiap call
4. Ulang 5,000× (100 runs × 50 depth)

**Kalau ada path di contract yang bisa break invariant**, fuzzer akan temukan dalam detik. Ini jauh lebih kuat dari unit test manual karena explore state space yang **tidak terpikirkan human**.

**Invariants yang sudah terbukti untuk GOTT:**
- `totalSupply ≤ MAX_SUPPLY` — hard cap absolute

**Invariant lanjutan yang bisa ditambah:**
- `mintableSupply + totalSupply == MAX_SUPPLY` (math consistency)
- `totalVotingPower ≤ totalSupply` (delegation correctness)
- `balanceOf(address(0)) == 0` (zero address never holds)
- `sum(all balances) == totalSupply` (accounting correctness)

### Insight Tahap 7-8

24. **Slither cuma baseline** — 0 findings bukan berarti 100% aman, cuma pattern matching lolos
25. **Fuzzer bikin assumption kamu exposed** — test yang pass di Mocha belum tentu pass di fuzzer
26. **Invariant > unit test** untuk prove safety property absolute
27. **`fail_on_revert = false`** penting untuk invariant — sering revert itu HARAPAN (access control, validation), fuzzer cuma care "state valid nggak setelah semua call"
28. **Foundry + Hardhat coexist** — nggak perlu migrasi full, bisa pakai dua-duanya paralel
29. **Pre-deploy audit stack**: Slither (pattern) → Foundry fuzz (property) → Echidna (deeper invariants) → human auditor → bug bounty

---

## 🛠️ Pattern Command yang Penting

### Console REPL
```javascript
const signers = await ethers.getSigners();
const [owner, alice, bob, charlie] = signers;
const Token = await ethers.getContractFactory("GuardiansToken");
const token = await Token.deploy(owner.address, 40);
```

### Multi-user Simulation
```javascript
await token.connect(alice).transfer(...);  // Alice yang kirim TX
```

### Try-Catch Revert Check
```javascript
try {
  await token.someFunction();
} catch (e) {
  console.log(e.shortMessage || e.message.split("\n")[0]);
}
```

### Event Query
```javascript
const filter = token.filters.Transfer(null, alice.address);  // filter by indexed param
const events = await token.queryFilter(filter, 0, "latest");
```

### Time Travel
```javascript
await network.provider.send("evm_increaseTime", [seconds]);
await network.provider.send("evm_mine");
```

### Gas Measurement
```javascript
const receipt = await (await token.someFunction()).wait();
receipt.gasUsed.toString();
```

---

## 🛠️ Pattern Command Tambahan (Tahap 5-6)

### Permit Signature (EIP-712)
```javascript
const domain = { name: "Guardians Token", version: "1", chainId: 31337, verifyingContract: addr };
const types = { Permit: [
  {name:"owner",type:"address"}, {name:"spender",type:"address"},
  {name:"value",type:"uint256"}, {name:"nonce",type:"uint256"},
  {name:"deadline",type:"uint256"}
]};
const signature = await signer.signTypedData(domain, types, message);
const sig = ethers.Signature.from(signature);  // pecah jadi r/s/v
await token.permit(owner, spender, value, deadline, sig.v, sig.r, sig.s);
```

### Fork Activation
```bash
FORK=true BSC_RPC=https://bsc.drpc.org npx hardhat console
```
Lalu di console:
```javascript
await network.provider.send("evm_mine");  // workaround EDR hardfork
```

### Impersonate Account
```javascript
await network.provider.request({ method: "hardhat_impersonateAccount", params: [addr] });
const signer = await ethers.getSigner(addr);
// Sekarang signer bisa kirim TX seolah-olah dia owner address-nya
```

### Interaksi Real PancakeSwap
```javascript
const routerAbi = [
  "function addLiquidityETH(address,uint256,uint256,uint256,address,uint256) payable returns (uint256,uint256,uint256)",
  "function getAmountsOut(uint256,address[]) view returns (uint256[])",
  "function swapExactETHForTokens(uint256,address[],address,uint256) payable returns (uint256[])",
  "function factory() view returns (address)"
];
const router = new ethers.Contract("0x10ED43C718714eb63d5aA57B78B54704E256024E", routerAbi, signer);
```

### AMM Price Formula
```javascript
// Harga token dari reserves V2:
const price = (Number(reserves[0]) / 1e18) / (Number(reserves[1]) / 1e18);
// Quote output tanpa execute:
const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
```

---

## 🛠️ Pattern Command Tahap 7-8

### Slither
```bash
pip3 install slither-analyzer --break-system-packages
solc-select install 0.8.24 && solc-select use 0.8.24
slither . --filter-paths "node_modules"
slither . --filter-paths "node_modules" --print human-summary
```

### Foundry Fuzz
```bash
forge test --match-path "test-foundry/**"
forge test --match-test testFuzz_mintRespectsMaxSupply -vvv
forge test --fuzz-runs 10000  # override fuzz budget
```

### Invariant Test Pattern
```solidity
contract Test {
    function setUp() public { ... }

    function invariant_totalSupplyNeverExceedsMax() public view {
        assertLe(token.totalSupply(), MAX_SUPPLY);
    }
}
```

### Fuzz Test Pattern
```solidity
function testFuzz_someProperty(uint256 amount) public {
    vm.assume(amount > 0 && amount <= upperBound);
    vm.prank(caller);
    // action
    // assert property
}
```

---

## 🚧 To-Do / Tahap Selanjutnya

- [x] Tahap 5 — Permit / Gasless Approval (EIP-2612) ✅
- [x] Tahap 6 — Fork BSC Mainnet + PancakeSwap integration ✅
- [x] Tahap 7 — Slither static analysis (0 findings) ✅
- [x] Tahap 8 — Foundry fuzzing + invariant testing (7 tests, 5000 invariant calls) ✅
- [ ] Tahap 9 — Hardhat coverage (line + branch coverage metric)
- [ ] Tahap 10 — Deploy ke BSC testnet real, verify di BscScan
- [ ] Tahap 11 — Upgradeability exploration (UUPS proxy pattern)
- [ ] Challenge: deploy GOTT dengan `initialMintPercent = 60`, set max wallet 5%, test edge cases
- [ ] Explore: hardhat-gas-reporter plugin untuk automated gas table generation
- [ ] Explore: launch helper contract dengan max-buy limit beberapa menit pertama
- [ ] Explore: LP token locker integration (Unicrypt/Team.Finance pattern)
- [ ] Explore: Echidna deeper invariants (lebih advanced dari Foundry invariant)
- [ ] Explore: manual audit checklist sebelum mainnet

---

_Catatan dibuat selama session belajar interaktif di Hardhat console._
