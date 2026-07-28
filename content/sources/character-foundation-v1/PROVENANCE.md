# Character foundation source bundle v1

This bundle is a local, review-only source snapshot for the seven character
items already present in `foundation-2026.07.5`. It is not linguistic, legal or
release approval.

## Immutable source pins

### Radical records

- Dataset: `skishore/makemeahanzi` `dictionary.txt`
- Dataset revision:
  `618dbab8a8ddefb958763c8b4afbaa741a4460de`
- Source:
  <https://github.com/skishore/makemeahanzi/blob/618dbab8a8ddefb958763c8b4afbaa741a4460de/dictionary.txt>
- License statement:
  <https://github.com/skishore/makemeahanzi/blob/618dbab8a8ddefb958763c8b4afbaa741a4460de/COPYING>
- License text:
  <https://github.com/skishore/makemeahanzi/blob/618dbab8a8ddefb958763c8b4afbaa741a4460de/LGPL>
- Pinned hashes:
  - `COPYING`:
    `sha256:26fa6b699b32401de4b75a4af574c2e0a99b3df6cb12df9313d257ee4634359c`
  - `LGPL`:
    `sha256:eeb6fd06beac4a94a12ffb66876ecd6af68d5b6f38650d5f11aa90125933098b`

Each JSON file under `makemeahanzi/` is an HANZI.OS extraction envelope. It
keeps the exact source revision, the SHA-256 of the original newline-terminated
JSON record and only the `character` and `radical` fields used by the import.
This format conversion is an HANZI.OS modification made on 28 July 2026.

### Structure and component records

- Dataset: `cjkvi/cjkvi-ids` `ids.txt`
- Dataset revision:
  `86b4d16159f0079437870408f0ca186e529015db`
- Source:
  <https://github.com/cjkvi/cjkvi-ids/blob/86b4d16159f0079437870408f0ca186e529015db/ids.txt>
- Dataset terms:
  <https://github.com/cjkvi/cjkvi-ids/blob/86b4d16159f0079437870408f0ca186e529015db/README.md#licenses>
- Upstream project:
  <https://www.chise.org/index.en.html>
- Pinned README hash:
  `sha256:810382e8b554a6adca612e915191cd031b9bb02121c12aa3387131af57ea46de`

The CJKVI README says `ids.txt` is derived from CHISE and follows the CHISE
terms. The descriptor therefore records the conservative identifier
`CHISE-IDS-terms`, not an inferred SPDX license. An attributable legal/license
review remains mandatory before release.

Each JSON file under `cjkvi-ids/` is an HANZI.OS extraction envelope. It keeps
the exact revision, source line, SHA-256 of that newline-terminated TSV line
and parsed IDS. This format conversion is an HANZI.OS modification made on
28 July 2026.

For this bounded inventory:

- a source IDS equal to the target glyph supports `independent`;
- root `⿰` supports `left-right`;
- root `⿱` supports `top-bottom`;
- leaf glyphs become components in source order;
- every component role remains the neutral `graphic`.

No semantic, phonetic or etymological role is inferred from glyph shape.

### Stroke records

- Package: `hanzi-writer-data@2.0.1`
- NPM integrity:
  `sha512-nbQwM+MaryGoq7pBMIZLCd3lFq03nXuJuwku1+6UbjL58uU+9OULVcMkoNvNuJSoIV7f1bbPRfD4D/LQa5S7qg==`
- Release tag commit:
  `ad1a9905cada18d07630acc27d438b070d753ec0`
- Pinned Make Me a Hanzi submodule revision:
  `9d54d6bbba93023078628589ffbffff1edf91335`
- Source:
  <https://github.com/chanind/hanzi-writer-data/tree/ad1a9905cada18d07630acc27d438b070d753ec0>
- License evidence:
  <https://github.com/chanind/hanzi-writer-data/blob/ad1a9905cada18d07630acc27d438b070d753ec0/ARPHICPL.TXT>
- License hash:
  `sha256:5590533436c70f10f2f524ee61456238c290175c6662fbe1c700b5f038a6d328`

The seven installed JSON files were compared byte-for-byte with the pinned
release commit before import. The importer independently inspects and copies
those bytes into the immutable candidate package.

## Deliberate release boundary

- The source records support a candidate for editorial review only.
- No content owner, package license approval, native linguistic approval,
  coverage claim or promotion is created.
- Character items remain `review`.
- `config/hanzi-data-manifest.json.characters` remains empty, so the public
  build continues to publish no character stroke geometry.
