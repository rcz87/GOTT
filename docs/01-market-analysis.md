# 01 — Market Analysis

## Problem Statement

Setiap wallet crypto yang aktif > 6 bulan akan terkontaminasi oleh 4 tipe sampah blockchain yang tidak bisa dihilangkan secara manual dengan mudah.

## Tipe Sampah Blockchain

### Tipe 1 — Dust Token

**Definisi:** Token bernilai sangat kecil (< $5 USD) yang terakumulasi di wallet dari berbagai aktivitas.

**Sumber dust:**
- Sisa airdrop yang nggak di-claim besar
- Residual dari DEX swap (rounding)
- Fork token yang pernah aktif tapi sudah mati
- Remnant setelah sell sebagian besar

**Kenapa problematik:**
- Gas fee swap > value token (ekonomi negatif)
- Clutter wallet interface
- Manually hide satu-satu = tedious

**Contoh real BSC:**
- 0.0003 CAKE (~$0.001)
- 0.5 BUSD dari sisa stable swap
- 100 token X dari airdrop yang sudah rug

### Tipe 2 — Scam/Drainer Token

**Definisi:** Token yang di-airdrop paksa dengan tujuan malicious.

**Karakteristik:**
- Nama meniru token legit ("CAKE Airdrop", "Bitcoin BSC")
- Metadata contains URL phishing
- Beberapa di-design sebagai honeypot (bisa beli, nggak bisa jual)
- Some have hidden drain function saat user approve

**Bahaya real:**
- User click "swap" → redirect ke phishing site
- User approve → kehilangan semua asset di wallet
- Social engineering target (user yang frustrasi mau hapus)

**Statistik:**
- ~30% wallet BSC aktif punya minimal 1 scam token
- Drainer loss tahunan: $300M+ crypto-wide (Chainalysis 2025)

### Tipe 3 — Dead Token

**Definisi:** Token dari project yang sudah rug, abandoned, atau mati secara ekonomi.

**Kriteria dead:**
- Liquidity pool < $1,000
- Zero trading volume dalam 30+ hari
- Social media inactive > 6 bulan
- Contract owner tidak renounce, tapi nggak aktif

**Real data:**
- BSC punya ~500,000+ token contracts
- Estimate 70%+ adalah dead token
- User kumpulin rata-rata 20-50 dead tokens per wallet aktif

### Tipe 4 — Spam NFT

**Definisi:** NFT yang di-mint massive dan di-airdrop paksa, biasanya sebagai drainer trap.

**Pattern umum:**
- Mint batch 10k-100k dalam satu TX
- Airdrop ke wallet random
- Metadata URL: "Visit [site] to claim reward"
- Transfer function di-gated ke specific wallet

**Scale:**
- OpenSea (dan equivalent BSC) penuh spam NFT
- 1 wallet aktif biasanya punya 5-50 spam NFT
- Effort manual hide/burn: ~30 menit per batch

## Market Size

### BSC Overall

- **BSC active wallets:** ~500 juta (BscScan 2026)
- **Average dust per wallet:** $2-$50 USD estimate
- **Total dust value stranded on BSC:** $1 billion - $25 billion potential

### Indonesia Specific

Berdasarkan estimasi dari:
- Indodax user: ~5 juta
- Pintu user: ~7 juta
- Tokocrypto user: ~3 juta
- Asumsi 60% punya on-chain wallet selain CEX

**Indonesia wallet estimate:** 8-12 juta wallet aktif
**Estimated dust value Indonesia:** $50M-$500M
**Target addressable market 1st year:** ~100k wallets ($500k-$5M dust processed)

### Asia Tenggara Expansion

- Vietnam: 2nd largest crypto adoption globally (Chainalysis 2024)
- Thailand, Philippines: growing rapidly
- Combined regional: 20-30 juta wallet potential

## User Demographics

### Primary Persona — "Budi the Degen"

- **Umur:** 24-30
- **Lokasi:** Jakarta, Surabaya, Bandung
- **Crypto experience:** 2-4 tahun
- **Wallet:** MetaMask + Trust Wallet
- **Behavior:** Active in Telegram groups, follow crypto Twitter, frequent meme coin trader
- **Pain point:** Wallet-nya penuh scam, takut approve yang salah, nggak tau mana token yang aman

### Secondary Persona — "Ani the Cautious Investor"

- **Umur:** 30-40
- **Lokasi:** Urban/suburban Indonesia
- **Crypto experience:** 1-2 tahun
- **Wallet:** CEX-heavy (Indodax), baru mulai self-custody
- **Behavior:** Long-term holder, nggak banyak trade, risk-averse
- **Pain point:** Takut security, nggak paham teknis, butuh tool yang "aman dan simple"

### Tertiary Persona — "Crypto Dave from SG"

- **Umur:** 25-35
- **Lokasi:** Singapore, Malaysia, Hong Kong
- **Crypto experience:** 4+ tahun
- **Wallet:** Multiple (Rabby, Frame, hardware)
- **Behavior:** Cross-chain, DeFi power user, airdrop hunter
- **Pain point:** Multi-wallet management, cross-chain dust, time-consuming cleanup

## Market Timing

### Why Now (2026)

1. **BSC user ritel Asia terus bertambah** — Binance penetration di Indonesia tinggi
2. **Sol Incinerator terbukti** — validasi use case di Solana, EVM open
3. **AI/LLM enables better scam detection** — classifier jauh lebih akurat
4. **Regulasi Indonesia makin jelas** — OJK framework 2025-2026 memberikan clarity
5. **Wallet drainer attacks meningkat** — user aware butuh protection
6. **Self-custody movement** — more users moving dari CEX ke wallet sendiri

### Headwinds

1. Bear market reduce user activity
2. Kompetitor bisa masuk EVM anytime
3. Wallet provider bisa bundle cleanup feature (threat: Trust Wallet native feature)

## Conclusion

Market opportunity **massive** di EVM chains, especially BSC. Sol Incinerator success memvalidasi demand. Indonesia positioning punya advantage linguistic + cultural. Timing favorable karena regulasi makin clear + user awareness meningkat.

**Key insight:** First mover di BSC cleanup + native token + Indonesia-first = defendable moat.
