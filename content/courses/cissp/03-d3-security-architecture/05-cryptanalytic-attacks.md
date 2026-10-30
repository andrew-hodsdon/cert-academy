---
title: "Cryptanalytic attacks"
kind: reading
est_minutes: 40
objectives:
  - Classify an attack by what the attacker has (ciphertext only, known plaintext, chosen plaintext, chosen ciphertext)
  - Estimate brute-force and birthday-attack effort and explain what salting, key length and digest length change
  - Recognise implementation, side-channel, timing and fault-injection attacks and their countermeasures
  - Explain man-in-the-middle, pass the hash, Kerberos exploitation and ransomware and the controls that stop them
sources: [d3-isc2-cissp-outline, d3-menezes-handbook, d3-kocher-timing-1996, d3-shattered, d3-nist-sp-800-38a, d3-fips-197, d3-fips-180-4, d3-mitre-attack-credential-access, d3-cisa-stopransomware, d3-anderson-security-engineering, d3-nist-sp-800-131ar2]
---

## The attacker's view

Kerckhoffs's principle says a cryptosystem should be secure even if everything about it except the key
is public. So attackers rarely attack the algorithm head-on. They go for the keys, the implementation,
the people, or the protocol around the cryptography. Objective 3.7 names: brute force, ciphertext only,
known plaintext, frequency analysis, chosen ciphertext, implementation attacks, side-channel, fault
injection, timing, man-in-the-middle, pass the hash, Kerberos exploitation and ransomware.

## Attack models: what does the attacker hold?

| Model | Attacker has | Classic example |
|---|---|---|
| **Ciphertext only** | Only ciphertext | Hardest case for the attacker; frequency analysis on a substitution cipher |
| **Known plaintext** | Some plaintext and its ciphertext | WWII codebreakers' "cribs" (predictable weather-report wording) |
| **Chosen plaintext** | Can encrypt plaintexts of their choice | Attacking an encryption oracle; differential cryptanalysis |
| **Chosen ciphertext** | Can get chosen ciphertexts decrypted (or learn whether they decrypt validly) | Padding-oracle attacks on CBC; Bleichenbacher's attack on RSA PKCS #1 v1.5 |

The attacker's power increases down the table. Modern ciphers are designed to resist even adaptive
chosen-ciphertext attacks, which is one reason **authenticated encryption** (AES-GCM) is preferred: it
rejects tampered ciphertext before decryption reveals anything.

**Frequency analysis** exploits the uneven distribution of letters in a language (E, T, A are common in
English). It breaks monoalphabetic substitution ciphers such as Caesar from ciphertext alone. Modern
ciphers resist it because good encryption makes ciphertext statistically indistinguishable from random,
but **ECB mode** leaks the same idea at block level: repeated plaintext blocks produce repeated
ciphertext blocks.

## Brute force and the birthday attack

**Brute force (exhaustive key search)** tries every key. Work grows as **2^k** for a *k*-bit key; on
average the key is found after trying half the keyspace. Each extra bit doubles the work.

**Dictionary attacks** try likely passwords first. **Rainbow tables** precompute hashes of many
passwords so an attacker can look up an unsalted hash instantly. A unique random **salt** per password
defeats precomputation, and a deliberately slow function (bcrypt, scrypt, Argon2, PBKDF2) makes each
guess expensive.

The **birthday attack** finds collisions in a hash. Because any pair can match, a collision is expected
after about **2^(n/2)** attempts for an *n*-bit digest, not 2^n. That is why a 128-bit digest gives only
about 64 bits of collision resistance, and why SHA-256 is the minimum for signatures.

**Meet-in-the-middle** explains why double DES was never adopted: encrypting twice with two 56-bit keys
gives roughly 2^57 work, not 2^112, because the attacker can encrypt from one end and decrypt from the
other and match in the middle. Triple DES was used instead.

### Worked example: how long does brute force take?

Assume an attacker can test **10¹² keys per second** (a large GPU cluster).

| Target | Keyspace | Worst case | Average |
|---|---|---|---|
| DES, 56-bit | 2^56 ≈ 7.2 × 10^16 | 7.2 × 10^4 s ≈ **20 hours** | ≈ 10 hours |
| AES-128 | 2^128 ≈ 3.4 × 10^38 | 3.4 × 10^26 s ≈ **1.1 × 10^19 years** | ≈ 5 × 10^18 years |

The universe is about 1.4 × 10^10 years old. AES-128 is not attacked by brute force; it is attacked
through keys, implementations and people.

Now passwords, at **10¹⁰ guesses per second** against a fast, unsalted hash:

| Password policy | Keyspace | Worst case |
|---|---|---|
| 8 lower-case letters | 26^8 ≈ 2.1 × 10^11 | ≈ **21 seconds** |
| 12 characters from 94 printable | 94^12 ≈ 4.8 × 10^23 | 4.8 × 10^13 s ≈ **1.5 million years** |

And the birthday bound for a 64-bit digest: 2^32 ≈ **4.3 billion** hashes for a likely collision,
seconds of work at these speeds. Length beats complexity, and digest length must be twice the security
level you need against collisions.

> [!TIP]
> Exam arithmetic shortcut: 2^10 ≈ 10^3. So 2^56 ≈ 2^6 × 10^15 ≈ 6.4 × 10^16 (close enough), and
> 2^128 ≈ 2^8 × 10^36 ≈ 2.6 × 10^38. You will rarely compute, but you must know that adding bits
> multiplies work exponentially, and that collisions cost the square root of preimages.

## Implementation attacks

The algorithm is fine; the code, configuration or randomness around it is not. Examples:

- **Weak random numbers:** predictable keys or IVs. Reusing an ECDSA nonce reveals the private key.
- **Nonce or IV reuse** in CTR or GCM mode reveals plaintext relationships and can break authentication.
- **Padding oracles:** an error message that distinguishes "bad padding" from "bad MAC" lets an attacker
  decrypt CBC data byte by byte (a chosen-ciphertext attack).
- **Memory-handling bugs:** Heartbleed (2014) let attackers read server memory, including private keys,
  from a bug in OpenSSL's heartbeat extension. The cipher was not touched.
- **Downgrade attacks:** forcing peers to negotiate a weak, legacy cipher suite.

Countermeasures: vetted, maintained libraries; FIPS 140-3 validated modules; disable legacy algorithms
(SP 800-131A); uniform error messages; code review and fuzzing of crypto code.

## Side-channel, timing and fault-injection attacks

A **side-channel attack** learns secrets from the physical behaviour of an implementation rather than
its inputs and outputs.

| Attack | Signal | Countermeasure |
|---|---|---|
| **Timing** | How long an operation takes depends on secret bits (Kocher, 1996) | Constant-time code; blinding |
| **Power analysis** (SPA/DPA) | Power draw during crypto operations | Masking, noise, balanced logic, tamper-resistant hardware |
| **Electromagnetic emanation** | Radiated signals (TEMPEST) | Shielding, Faraday cages, distance (zones) |
| **Acoustic / cache** | Sound, or cache-hit timing shared between processes or VMs | Isolation, cache partitioning, constant-time code |
| **Fault injection** | Deliberately induced errors (voltage or clock glitching, lasers) that make the device output a faulty result, which leaks the key | Verify results before output, sensors that zeroise on tamper (FIPS 140-3 level 3–4 behaviour) |

Smart cards, HSMs and TPMs are the classic targets because attackers can hold them. Timing attacks also
work remotely across a network against poorly written servers.

> [!WARNING]
> "Increase the key length" does **not** stop a side-channel attack. The leak is in the
> implementation, so the fix is in the implementation or the hardware.

## Protocol and credential attacks

### Man-in-the-middle (MITM, also on-path or adversary-in-the-middle)

The attacker sits between two parties, relaying and possibly altering traffic. Unauthenticated
Diffie-Hellman is the textbook case. Defences: mutual authentication with certificates, certificate
validation (and pinning where appropriate), HSTS for web traffic, and never clicking through certificate
warnings.

**Replay attacks** resend captured valid messages. Defences: nonces, timestamps and sequence numbers.

### Pass the hash

Windows NTLM authentication proves knowledge of the password **hash**, not the password itself. An
attacker who dumps hashes from memory or the SAM can authenticate as that user without cracking anything.
Defences: disable NTLM where possible, Credential Guard, unique local administrator passwords (LAPS),
tiered admin accounts so domain admins never log on to workstations, and least privilege.

### Kerberos exploitation

| Attack | How it works | Key defence |
|---|---|---|
| **Kerberoasting** | Any domain user requests service tickets for accounts with SPNs; tickets are encrypted with the service account's password hash and cracked offline | Long random service-account passwords, group managed service accounts, AES-only tickets |
| **AS-REP roasting** | Accounts with pre-authentication disabled return crackable data | Require pre-authentication |
| **Golden ticket** | With the `krbtgt` account hash, forge TGTs for any user | Protect domain controllers; reset `krbtgt` twice after compromise |
| **Silver ticket** | With a service account hash, forge service tickets for that service | Strong service passwords; PAC validation |
| **Pass the ticket** | Steal and reuse a valid ticket from memory | Credential Guard; limit privileged logons |

Kerberos also depends on **time synchronisation** (default tolerance five minutes) to defeat replay, so
an attacker who can shift clocks can cause denial of service.

### Ransomware

Ransomware turns cryptography into a weapon: it encrypts the victim's data (often with a per-victim
symmetric key wrapped by the attacker's public key) and demands payment, now often with data theft and
"double extortion". The CISA #StopRansomware guide's top controls: **offline, encrypted, tested
backups**; MFA on remote access; patching of internet-facing systems; segmentation; and an exercised
incident response plan.

> [!IMPORTANT]
> On the exam, the best preventive answer for ransomware impact is almost always **tested offline (or
> immutable) backups**, because they make recovery possible without paying. Paying is a business and
> legal decision for senior management, never the security team's first step.

## Check yourself

1. An attacker can submit modified ciphertexts to a server and observe whether it returns "padding
   error" or "MAC error". What class of attack is this, and what single design change best prevents it?
2. Why is a 160-bit hash said to give only 80 bits of security against collisions?
3. A smart card's RSA key is recovered after the attacker briefly drops its supply voltage during signing.
   What type of attack is this?

<details>
<summary>Answers</summary>

1. A chosen-ciphertext (padding-oracle) implementation attack. Use authenticated encryption (for
   example AES-GCM) and return a single, uniform error.
2. The birthday bound: collisions are expected after about 2^(n/2) = 2^80 attempts.
3. Fault injection (voltage glitching). Unlike passive side channels, it actively induces errors in the
   device to make it leak the key.

</details>

## Sources

Menezes et al., *Handbook of Applied Cryptography* (attack models, exhaustive search, birthday
paradox); Kocher (1996) on timing attacks; SHAttered (2017) for the SHA-1 collision; NIST SP 800-38A
and SP 800-131A Rev. 2; FIPS 197 and FIPS 180-4; MITRE ATT&CK credential-access techniques (T1550.002,
T1558, T1557); CISA #StopRansomware Guide; Anderson, *Security Engineering* (emission security and
physical tamper).
