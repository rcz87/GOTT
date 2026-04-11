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

## 🔑 Insight Utama yang Dipelajari

1. **Custom errors > string require** — gas-efficient, bisa carry parameter aktual untuk debugging
2. **Voting power opt-in, bukan default** — holder harus delegate dulu; gotcha governance yang perlu edukasi user
3. **Snapshot immutability** — `getPastVotes` ngunci voting power ke block tertentu, fondasi anti flash-loan vote attack
4. **Mint = Transfer dari 0x0, Burn = Transfer ke 0x0** — konvensi ERC20, bukan event terpisah
5. **`indexed` parameter + Bloom filter** — bikin event query fast
6. **EIP-2929 warm/cold per-TX, bukan antar-TX** — jangan expect "warm discount" dari TX sebelumnya
7. **SSTORE pricing** — zero→non-zero 20k, non-zero→non-zero 5k; alokasi slot baru mahal
8. **ERC20Votes ~88% more expensive** — checkpoint write overhead, trade-off untuk on-chain governance
9. **BSC deploy cost ~$5** — sweet spot untuk retail vs Ethereum L1 ($155)
10. **Time travel test yang butuh bulan, jadi detik** — `evm_increaseTime` + `evm_mine` untuk vesting/timelock/staking test

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

## 🚧 To-Do / Tahap Selanjutnya

- [ ] Tahap 5 — Permit / Gasless Approval (EIP-2612)
- [ ] Tahap 6 — Fork BSC Mainnet (simulasi real-world deploy dengan PancakeSwap)
- [ ] Challenge: deploy GOTT dengan `initialMintPercent = 60`, set max wallet 5%, test edge cases
- [ ] Explore: proxy pattern untuk upgradeability
- [ ] Explore: hardhat-gas-reporter plugin untuk automated gas table generation

---

_Catatan dibuat selama session belajar interaktif di Hardhat console._
