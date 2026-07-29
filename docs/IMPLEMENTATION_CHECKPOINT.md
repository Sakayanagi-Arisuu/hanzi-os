# HANZI.OS implementation checkpoint

Date: 29 July 2026

This is a local engineering checkpoint, not production release evidence.

## Active HSK0-4 graduation scope

The active source of truth is now `docs/HSK4_GRADUATION_PLAN.md`. The target is
a local-first graduation and personal-study product with distinct HSK0, HSK1,
HSK2, HSK3 and HSK4 paths. Production-only operator auth, commerce, hosted
pilot, operational qualification and Sites are deferred.

Active progress: **81%**.

| Pillar | Earned / max | Current evidence |
| --- | ---: | --- |
| Application/offline learning foundation | 17 / 20 | Local lesson, Reader, Review, FSRS, persistence, recovery and responsive shell exist. |
| Mastery/evidence/remediation | 12 / 15 | Skill-separated evidence and mistake correction exist; HSK0-4 calibration does not. |
| Distinct HSK0-4 paths | 12 / 15 | Five profiles have a cycle-safe 18-unit graph; HSK1 has six units, HSK2 has an exact three-unit scope, and HSK3 now has 55 distinct paragraph-input, narration and guided-production lesson blueprints. |
| HSK0-4 content coverage | 29 / 30 | HSK0-2 authoring is source-bound; HSK3 paragraph, narration and all 5 guided-production stages are drafted. Assessment, review, runtime publication and HSK4 content remain. |
| HSK0-4 assessment/mock | 6 / 10 | Diagnostic authority, an uncalibrated HSK1 bank and two source-disjoint 86-item HSK2 form drafts exist; reviewed audio/rubrics, calibrated scored exams and timed mocks do not. |
| Graduation QA/local release | 5 / 10 | Strong automated baseline and architecture docs exist; demo pack and local release candidate do not. |

The initial 42% detailed baseline replaced the earlier rough 55-60% estimate for the new
scope. It is lower because “deep HSK4 content” now has an explicit 30-point
denominator while the current runtime content remains a small foundation.
Every commit must update this percentage here and in the active roadmap.

### Active G0 slice completed

- Added exactly five learner-visible starting levels: HSK0, HSK1, HSK2, HSK3
  and HSK4. The legacy stored value `basic` remains accepted and maps to HSK1
  without creating a sixth path.
- Each level has a distinct skill-weight vector, activity set, assessment mode
  and bounded exit-evidence requirements.
- Productive pronunciation, speaking and writing requirements explicitly
  require reviewed rubrics; recognition items cannot stand in for those skills.
- Onboarding, Profile, Path, local persistence, backup import and sync protocol
  all accept the expanded level contract. Self-declaration still grants no
  lesson completion, mastery or prerequisite unlock.

### Active G1 slice completed

- Pinned the official syllabus descriptor to its URL, 406-page PDF SHA-256,
  publication/effective dates, extraction tooling versions and exact page
  ranges. The PDF itself is not redistributed and the rights decision remains
  explicitly pending.
- Added a deterministic extractor and committed data inventory for HSK1-4:
  84 task rows, 195 topics, 2,000 vocabulary entries, 1,096 recognition
  characters and 332 grammar rows.
- Added fail-closed validation for source identity, exact section counts,
  sequence, level boundaries, page ranges, duplicate IDs and required fields.
- Added a checked coverage report. The current runtime maps 23 of 2,000 official
  vocabulary entries (1.15% overall; 7.67% of the HSK1 increment), reports
  `越南` as unmatched and detects a pinyin drift for `学生`. Seven character
  records map in authoring but none are released; task/topic/grammar mappings
  remain zero.
- All four HSK completion claims remain false. Inventory presence does not
  publish content, unlock lessons or count as mastery/review evidence.

### Active G2 slice in progress

- Added an inventory-bound curriculum graph with exactly five paths and 15
  cycle-safe units. Path and unit prerequisites are explicit and HSK1-4 use
  the exact incremental inventory counts from the pinned syllabus.
- Mapped all 14 released runtime lessons to HSK0/1 units and to the exact 23
  official vocabulary records they currently teach. `越南` remains explicitly
  unmapped; no task/topic/grammar mapping was invented.
- Anonymous Path and Dashboard now use the selected graph slice. HSK0 exposes
  the four boot lessons, HSK1 retains the prerequisite bridge plus ten target
  lessons, and HSK2-4 expose no lower-level substitute while their target
  packages are unpublished.
- Placement is fail-closed: self-declaration chooses the target view only;
  the current uncalibrated diagnostic remains observed-only and grants neither
  mastery nor a prerequisite waiver.
- Expanded the D1 `profiles.starting_level` constraint with a data-preserving
  migration. Restore rehearsal proves an existing HSK2 row survives, HSK4 is
  accepted and HSK5 is rejected; authenticated sync now covers HSK4.
- G2 remains open until calibrated placement authority, topic/task/grammar
  mappings and complete per-level progress behavior exist.
- Expanded HSK1 from three broad units to six ordered authoring units with
  distinct objectives and exit-evidence modes: personal exchange; time/place/
  events; daily needs; travel/leisure; study/work; and character integration.
- Added a graph- and inventory-bound HSK1 scope that partitions each official
  item into exactly one primary unit: 15 tasks, 30 topics, 300 vocabulary
  records, 66 grammar rows and 246 recognition characters. Duplicate, missing,
  cross-level or stale graph assignments fail validation.
- The scope is explicitly not lesson coverage and grants no mastery. Current
  released learning mappings remain 23 vocabulary, 0 task, 0 topic and
  0 grammar; G2 therefore remains open for real practice mapping, calibrated
  placement and complete per-level progress behavior.
- Added a graph- and inventory-bound HSK2 scope while preserving its distinct
  three-unit path: multi-turn situational dialogue, sentence/grammar chains
  and reviewed dictation/short-text production.
- The situational unit partitions all 17 tasks, 34 topics and 200 incremental
  vocabulary records across four semantic strands. Four grammar modules
  partition all 75 grammar rows; four production stages plan dictation,
  sentence reconstruction, guided messages and picture description; all 125
  recognition characters remain isolated in the productive-text unit.
- The scope plans 40 lesson blueprints but authors zero lesson or practice
  item. It remains learner-hidden, grants no mastery and keeps lesson coverage,
  reviewed content and HSK2 completion false. This differentiated roadmap
  deliverable raises active progress to **73%** without claiming content
  completion.

### Active G3 slice in progress

- Pinned a 28 July 2026 CC-CEDICT editor-export snapshot by URL, byte length,
  entry count and SHA-256. The source declares CC BY-SA 4.0; attribution and
  ShareAlike treatment are explicit, while project legal review remains
  pending.
- Added a deterministic importer that filters the 124,725-entry snapshot to
  all 300 official HSK1 vocabulary records. It checks snapshot bytes, source
  license header, official ID/order/surface/pinyin and writes a compact draft
  artifact rather than editing runtime content.
- All 300 records have English source senses. 297 are pronunciation-compatible
  directly or through standard `不`/`一` sandhi; `那边`, `那里` and `学生`
  retain explicit source-vs-syllabus tone review items. Twenty-three official
  records have multiple source matches and remain in the editorial queue.
- The checked backlog report separates source readiness from learner coverage:
  authoring scope 300/300, Vietnamese gloss review 0/300, lesson mapping
  23/300, learner-visible 0/300 and release-eligible 0/300. No HSK1 completion
  claim was created.
- G3 can proceed before the remaining placement calibration because this slice
  is learner-hidden authoring input. Runtime promotion still depends on
  Vietnamese definitions, examples, unit/practice mapping and review.
- Added the first unit content pack for `hsk1-personal-exchange`: 107
  AI-assisted Vietnamese gloss drafts with exact source-line provenance,
  9 sequential lesson blueprints, 38 model-dialogue turns and complete
  blueprint partitions for its 2 tasks, 5 topics and 32 grammar rows.
- The pack explicitly records AI-assisted authorship, CC BY-SA treatment,
  missing Mandarin/Vietnamese/assessment reviewers and browser-TTS-only audio
  policy.
- Added 321 vocabulary practice items: exactly one meaning-recall, one
  pinyin-recognition and one listening-selection item per lexeme. Distractors
  are deterministic and distinct; synthetic voice is disclosed; every item is
  measurement/mastery-ineligible pending review.
- Added nine exact lesson review batches requiring native Mandarin,
  Vietnamese editorial and assessment roles. All batches have zero approvals,
  and the pack still has zero release-eligible item, so it is not imported
  into runtime.
- Added learner-hidden draft packs for the other four communicative HSK1
  units: 193 Vietnamese gloss drafts, 16 sequential lesson blueprints, 64
  dialogue turns and exact blueprint partitions for their 13 tasks, 25
  topics and 34 grammar rows.
- Added 579 more vocabulary practice items and 16 exact review batches. The
  complete communicative HSK1 authoring layer now covers all 300 vocabulary
  records with 25 lessons, 102 dialogue turns and 900 practice items. Every
  item remains review-pending, measurement/mastery-ineligible and excluded
  from runtime; HSK1 completion therefore remains false.
- Added the learner-hidden `hsk1-character-foundation` pack: all 246 official
  recognition characters are mapped to existing HSK1 vocabulary contexts,
  partitioned across 15 sequential lessons and exercised by 246
  character-in-word items plus 246 glyph-copy self-checks.
- The pack explicitly records zero complete pinned stroke metadata, teaches
  and assesses no stroke order, never infers writing mastery from recognition
  or self-check, and leaves all 15 character review batches unapproved.
- Added the learner-hidden HSK1 grammar/context pack: all 66 official grammar
  rows retain their source text and exact lesson mapping, with one Vietnamese
  explanation, model example and guided production self-check per row.
- Twenty grammar review batches cover the 20 applicable lesson blueprints.
  All 66 productive items remain unreviewed, self-reveal-only and
  measurement/mastery-ineligible; no runtime lesson or completion claim was
  created.
- Corrected task/topic lesson semantics while preserving exact partitions:
  weather and environment, product and health, travel planning, traditional
  food, school and work topics now bind to the intended scenario lessons.
- Added all 15 HSK1 task scenarios and all 30 topic prompts, with 60 model
  dialogue turns and 15 guided roleplays. The associated level-check blueprint
  plans 55 items across four sections; 50 objective drafts are authored but
  none is scored, reviewed, calibrated or eligible for mastery.
- Added the learner-hidden HSK1 objective item bank: 15 listening, 15 reading,
  10 vocabulary and 10 grammar items, each bound to an exact draft entity.
  Listening audio remains null and requires reviewed human/licensed recordings.
  Source-exposed drafts require independent alternate forms before calibration.
- Expanded the exact-hash review manifest to six HSK1 draft artifacts and 85
  pending batches (25 vocabulary, 15 character, 20 grammar, 15 task and 10
  assessment). It contains zero approval and cannot publish content.
- Added the local HSK1 review workflow over the exact manifest: 85 batches,
  258 required role assignments and 2,181 normalized exact target references.
  Exported assignments bind manifest/source/target hashes and require one
  decision per target; imports create idempotent Git-ignored receipts only.
- Reviewer/operator identities remain declared local metadata. The workflow
  does not mutate source drafts, manifest approvals, runtime, calibration or
  mastery, and absent listening audio cannot receive audio-rights approval.
- Pinned the official five-page `汉语拼音方案` descriptor by Ministry URL,
  PDF byte length/SHA-256 and approval date, and recorded active
  GB/T 16159-2012 orthography metadata. Rights remain pending and neither
  official PDF is redistributed.
- Added a learner-hidden 12-lesson HSK0 pronunciation pack with 111 targets
  and 208 authored activities. It covers all 21 official initials, all 35
  final-table spellings plus `er`, 14 orthography rewrites, 20 initial
  contrasts, 20 tone-category drills, the full 25-cell tone-pair matrix,
  12 connected-speech analyses and 24 survival shadowing prompts.
- Twelve exact lesson review batches require native Mandarin, Vietnamese and
  pronunciation-pedagogy review; batches with listening/recording also require
  audio-rights review. All 89 audio-dependent activities retain `audio: null`;
  browser TTS is preview-only and browser ASR cannot score tone mastery.
- The pack has 0 reviewed audio, measurement/mastery/release-eligible activity
  and remains excluded from runtime. This named G3 authoring deliverable raises
  content coverage by one point; active progress is now **72%**, while HSK0
  completion remains false until human review, audio and runtime promotion.
- Pinned a separate Debian CC-CEDICT source repack for HSK2 with exact archive
  and UTF-8 payload identities, CC BY-SA attribution and pending legal review.
  The full archive and dictionary payload remain local reconstruction inputs,
  not redistributed repository content.
- Added a deterministic importer and learner-hidden compact backlog for all
  200 official HSK2 vocabulary records. It retains 232 exact source matches,
  isolates 26 records with multiple candidates and queues 6 pronunciation
  drifts rather than silently normalizing them.
- At the source-only checkpoint, the HSK2 backlog retained 0 Vietnamese
  draft/review, blueprint/runtime lesson mapping, practice, learner-visible and
  release-eligible item. Vocabulary and level completion claims remained false.
  That bounded source-enrichment deliverable raised content coverage by one
  point and active project progress to **74%**.
- Added a deterministic HSK2 lesson-blueprint pack with 20 situational
  dialogue lessons, 10 sentence/grammar-chain lessons and 10 dictation or
  short-production lessons. One ordered prerequisite chain spans all 40
  blueprints without making them learner-visible.
- The blueprints exact-partition all 17 tasks, 34 topics, 200 vocabulary
  records, 75 grammar rows and 125 recognition characters from the pinned
  scope. Evidence modes, required practice kinds and audio requirements stay
  distinct across the three units.
- Forty pending blueprint review batches require native Mandarin curriculum,
  Vietnamese editorial and assessment roles. Authored practice, assessment
  prompts, rubrics, approvals and release-eligible lessons all remain zero;
  HSK2 completion stays false. This named authoring deliverable raises active
  progress to **75%**.
- Added 200 Vietnamese AI-assisted HSK2 vocabulary gloss drafts with exact
  official ID, part-of-speech, lesson and CC-CEDICT source-line provenance.
  Homographs remain separate records and every gloss still requires Mandarin
  linguistic plus Vietnamese editorial review.
- Added exactly three practice items per HSK2 lexeme: 200 meaning recall,
  200 pinyin recognition and 200 listening selection items across the 20
  situational blueprints. Twenty exact review batches cover all 600 items.
- All listening items retain `audio: null` and disclose synthetic browser TTS.
  The pack has zero reviewed audio, approval, measurement/mastery or
  release-eligible item; grammar, character, task production and assessment
  content remain open. This deliverable raises active progress to **76%**.
- Added 250 character-practice items over all 125 HSK2 recognition characters
  in the ten short-production blueprints: 124 character-in-word items, one
  isolated recognition item and 125 glyph-copy self-checks.
- The checked report records `留` as the one character without a cumulative
  HSK1-2 vocabulary context instead of inventing a mapping. All radical,
  stroke-count and stroke-data fields remain null; stroke order and writing
  mastery are neither taught nor assessed.
- Ten character review batches remain pending with zero approval,
  measurement/mastery or release-eligible item. Active progress remains
  **76%** because grammar, task production, assessment and HSK3-4 content are
  still substantially larger remaining deliverables.
- Added the learner-hidden HSK2 grammar-context pack: all 75 official rows
  retain exact source text/page and lesson/track mapping across the ten
  sentence-chain blueprints. Each row has one Vietnamese AI-assisted
  explanation, one Hanzi-Pinyin-Vietnamese model example and one distinct
  guided-pattern-production self-check.
- Ten grammar review batches require native Mandarin, Vietnamese editorial
  and grammar-pedagogy roles. All 75 productive items remain unreviewed,
  self-reveal-only and measurement/mastery/release-ineligible. This bounded
  named deliverable raises content coverage by one point and active progress
  to **77%**; task/dialogue production, assessment, audio, runtime promotion
  and HSK3-4 remain open.
- Replaced count-even HSK2 situational assignment with explicit semantic
  lesson mappings while preserving exact partitions. Regression coverage now
  pins object/color comparison to its object-description task and Chinese
  surnames/forms of address to the culture lesson.
- Added 20 six-turn situational dialogues (120 Hanzi-Pinyin-Vietnamese turns),
  17 task scenarios, 34 topic prompts with support questions and 20 guided
  roleplay self-checks. Twenty exact review batches remain pending; all audio
  is null and approval, measurement/mastery and release eligibility remain
  zero. This named G3 deliverable raises content coverage by one point and
  active progress to **78%**; short-text production, assessment, review/audio,
  runtime promotion and HSK3-4 remain open.
- Added all 104 minimum prompt units for the ten HSK2 short-text production
  blueprints: 36 dictations, 36 sentence reconstructions, 16 three-sentence
  messages and 16 picture descriptions, with 168
  Hanzi-Pinyin-Vietnamese model sentences for self-revision.
- All 125 assigned recognition characters occur in exactly one prompt answer
  within their lesson. Reconstruction fragments must exactly match the model
  answer; guided prompts require three elements and three model sentences.
  The `留学生` support context does not erase the recorded absence of a
  cumulative official HSK1-2 vocabulary context for `留`.
- Thirty-six dictation prompts retain null audio. Ten review batches have no
  approvals and every item remains self-reveal-only and
  measurement/mastery/release-ineligible. Active progress remains **78%**
  rather than exhausting the content pillar while HSK2 assessment and all
  HSK3-4 content remain open.
- Added two source-disjoint HSK2 assessment forms with 86 items each: 15
  listening, 15 reading, 15 vocabulary, 15 grammar, 10 speaking and 16 writing
  per form. Across both forms the bank contains 120 objective items and 52
  constructed responses, while exact source-entity overlap remains zero.
- Speaking prompts cover all 17 official tasks and 34 topics through the 20
  situational lessons; writing prompts cover all 32 guided-message and
  picture-description sources. Every item contributes to exactly one declared
  skill, and 12 section/form review batches exact-partition the 172 items.
- All 30 listening audio references remain null. The bank is source-exposed,
  unreviewed and uncalibrated, with no cut score, measurement, mastery,
  prerequisite waiver or release eligibility. Independent authoring raises
  the assessment pillar by one point and active progress to **79%**; it does
  not make the HSK2 level check issuable.
- Added an exact-hash HSK2 review manifest over seven source artifacts and all
  122 pending batches: 40 blueprint, 20 vocabulary, 10 character, 10 grammar,
  20 situational, 10 short-text production and 12 assessment batches.
- The local workflow resolves 405 role assignments and 1,732 normalized exact
  targets. Exports bind manifest/source/target hashes and require one decision
  per target; imports create idempotent Git-ignored receipts only.
- The workflow cannot approve absent audio rights and never mutates draft
  content, manifest approvals, runtime, calibration or mastery. No human
  receipt exists, so this packaging slice keeps active progress at **79%**.
- Added the graph- and inventory-bound HSK3 scope with three ordered units:
  paragraph listening/reading input, narration/discourse linking and guided
  paragraph/spoken production. It does not reuse the HSK2 situational/
  sentence-chain/short-text route shape.
- Five semantic discourse domains exact-partition all 22 tasks and 54 topics;
  five grammar modules exact-partition all 96 rows. All 500 vocabulary records
  and 284 recognition characters are scoped to paragraph input without
  inventing source-unreviewed semantic clusters.
- The scope plans 55 lesson blueprints and five production stages with at
  least 92 prompts: main-idea/detail notes, cohesion reconstruction, retelling,
  six-to-eight-sentence paragraphs and spoken explanation/comparison. It is
  learner-hidden and grants no lesson coverage or mastery. This differentiated
  route raises active progress to **80%**.
- Pinned the HSK3 vocabulary enrichment to the exact Debian CC-CEDICT archive
  and UTF-8 payload already governed in the source descriptor. All 500 official
  HSK3 records resolve to 529 source matches; 24 multiple-candidate records and
  8 pronunciation drifts remain explicit review work.
- Added 55 learner-hidden HSK3 lesson blueprints: 25 paragraph input, 15
  narration/grammar and 15 guided production. One ordered prerequisite chain
  exact-partitions all 22 tasks, 54 topics, 500 vocabulary records, 96 grammar
  rows and 284 recognition characters.
- Source-sense scoring provides a declared signal for 287 vocabulary records;
  213 cross-domain/function records remain explicitly labelled foundation
  fallback rather than receiving a false semantic claim. 283 characters have
  an incremental vocabulary context and one gap remains visible.
- All 55 review batches are pending and the pack has zero authored practice,
  rubric, approval, measurement/mastery or release eligibility. This closes a
  named G2 lesson-architecture/prerequisite deliverable and raises active
  progress to **81%** without increasing content coverage.
- Authored the first HSK3 paragraph-input content pack for the
  identity/transactions lesson: 20 Vietnamese AI-assisted glosses and two
  eight-line Hanzi-Pinyin-Vietnamese texts, one graded reading and one graded
  listening. Every lesson vocabulary record appears in the authored texts.
- Added 60 vocabulary items, ten reading/listening comprehension items, two
  note grids and two guided summaries or retellings: 74 practice items total.
  Main idea, detail, sequence, reference and simple inference remain separate
  item kinds.
- Twenty-seven items require listening or recorded retelling and retain null
  audio. One exact review batch has zero approvals; measurement, mastery and
  release eligibility remain zero. At 1/55 authored HSK3 lessons this bounded
  slice keeps active progress at **81%**.
- Completed the other four personal-life paragraph lessons: food/shopping,
  travel/transport, health care and home/family/leisure. They add 80
  Vietnamese gloss drafts, eight eight-line texts and 296 practice items.
- Combined with the first lesson, this discourse domain now has 5/5 lessons,
  100 vocabulary drafts, 10 Hanzi-Pinyin-Vietnamese texts with 80 lines, 300
  vocabulary items, 50 comprehension items, ten note grids and ten guided
  summaries/retellings: 370 practice items in five exact review batches.
- All 135 audio-dependent items remain silent and all five batches have zero
  approval. One of five paragraph discourse domains, 5/55 total HSK3 lessons,
  is authored; review, runtime and level completion remain false, so active
  progress stays **81%**.
- Authored all five HSK3 study/work paragraph lessons across learning methods,
  campus education, office process, colleague coordination and career
  experience. Their exact blueprint partition contains 107 vocabulary drafts,
  10 eight-line Hanzi-Pinyin-Vietnamese texts, 321 vocabulary items, 50
  comprehension items, ten note grids and ten summaries/retellings: 391
  practice items in five pending review batches.
- The two completed paragraph domains now total 10/25 paragraph lessons, 207
  vocabulary drafts, 20 texts/160 lines and 761 practice items. A shared
  builder and fail-closed validator now enforce source/prerequisite digests,
  exact vocabulary partition, in-lesson text coverage, item identity and
  review eligibility for the remaining domains.
- All 277 combined audio-dependent items remain silent and all ten batches
  have zero approval. Narration/grammar, guided production, assessment,
  runtime and HSK3 completion remain false, so active progress stays **81%**.
- Authored all five HSK3 nature/environment paragraph lessons across
  climate/seasons, plants/animals, landscape/directions, environmental state
  and protection responses. The exact partition adds 100 vocabulary drafts,
  10 eight-line texts and 370 practice items: 300 vocabulary items, 50
  comprehension items, ten note grids and ten summaries/retellings.
- Three of five paragraph domains now total 15/25 paragraph lessons, 307
  vocabulary drafts, 30 texts/240 lines and 1,131 practice items. All 412
  audio-dependent items remain silent and all 15 batches have zero approval.
  The remaining paragraph, narration/grammar, guided production, assessment,
  runtime and HSK3 completion work keeps active progress at **81%**.
- Authored all five HSK3 society/arts/sports paragraph lessons across modern
  life, city services, performing arts, sports introduction and competition
  reporting. The exact partition adds 96 vocabulary drafts, 10 eight-line
  texts and 358 practice items: 288 vocabulary items, 50 comprehension items,
  ten note grids and ten summaries/retellings.
- Four of five paragraph domains now total 20/25 paragraph lessons, 403
  vocabulary drafts, 40 texts/320 lines and 1,489 practice items. All 543
  audio-dependent items remain silent and all 20 batches have zero approval.
  The final paragraph domain plus narration/grammar, guided production,
  assessment, runtime and HSK3 completion keep progress at **81%**.
- Authored all five HSK3 culture/tradition paragraph lessons across regional
  cuisine, table etiquette, festivals, bounded regional comparison and
  intercultural visits. The exact partition adds 97 vocabulary drafts, ten
  eight-line texts and 361 practice items: 291 vocabulary items, 50
  comprehension items, ten note grids and ten summaries/retellings.
- All five paragraph domains now close 25/25 paragraph-input lessons and all
  500 HSK3 vocabulary mappings with 50 texts/400 lines and 1,850 practice
  items. Cultural comparisons require sources and limitations rather than
  turning examples into universal rules. All 675 audio-dependent items remain
  silent, all 25 batches have zero approval and all content remains hidden.
  Narration/grammar, guided production, assessment, runtime and HSK3
  completion keep active progress at **81%**.
- Authored the first HSK3 narration/grammar module over reference, quantity
  and phrase building: three lessons exact-partition 21/96 official grammar
  rows into 21 bounded explanations, examples and correction pairs, three
  six-line model narrations and 45 practice items.
- The practice layer has 21 grammar-in-paragraph items, 21 discourse
  corrections and three ordered retellings. Grammar-writing and
  speaking-retelling evidence remain separate; self-reveal and browser ASR
  cannot grant mastery. All three batches have zero approval and remain
  learner-hidden. The remaining 12 narration lessons, 15 guided-production
  lessons, assessment, review and runtime keep progress at **81%**.
- Authored the HSK3 modality/time/viewpoint narration module: three lessons
  exact-partition 27 grammar rows for health advice, learning viewpoints and
  family attitude into 27 explanations/examples/correction pairs, three
  six-line narrations and 57 practice items.
- The two completed modules now total 6/15 narration lessons, 48/96 grammar
  rows, six narrations/36 lines and 102 practice items. Viewpoint and
  generalization patterns explicitly retain scope and exceptions. All six
  batches have zero approval and remain learner-hidden; nine narration
  lessons plus guided production, assessment, review and runtime keep
  progress at **81%**.
- Authored the HSK3 event/complements/voice narration module: three lessons
  exact-partition 18 grammar rows for event sequencing, result/potential/
  directional complements, 把/被 and existential change into 18 bounded
  explanations/examples/correction pairs, three six-line narrations and 39
  practice items.
- The three completed modules now total 9/15 narration lessons, 66/96 grammar
  rows, nine narrations/54 lines and 141 practice items. Exact prerequisite,
  official-row provenance and skill-separated evidence remain fail-closed.
  All nine batches have zero approval and remain learner-hidden; six
  narration lessons plus guided production, assessment, review and runtime
  keep progress at **81%**.
- Authored the HSK3 comparison/description/evaluation narration module: three
  lessons exact-partition 13 grammar rows for natural change, environmental
  description and scoped social-service comparison into 13 bounded
  explanations/examples/correction pairs, three six-line narrations and 29
  practice items.
- The four completed modules now total 12/15 narration lessons, 79/96 grammar
  rows, 12 narrations/72 lines and 170 practice items. Comparisons require the
  same dimension and conditions; `不比` cannot be inflated into a stronger
  conclusion and narration claims cannot exceed their evidence. All 12
  batches have zero approval and remain learner-hidden; three narration
  lessons plus guided production, assessment, review and runtime keep
  progress at **81%**.
- Authored the fifth and final HSK3 discourse-linking narration module: three
  lessons exact-partition 17 grammar rows for arts information, match/food
  sequencing and custom-related condition/purpose into 17 bounded
  explanations/examples/correction pairs, three six-line narrations and 37
  practice items.
- All five narration modules now total 15/15 lessons, 96/96 official grammar
  rows, 15 narrations/90 lines and 207 practice items. Hypothetical, necessary
  and sufficient conditions remain distinct; sequence, concurrency,
  progression and concession cannot substitute for one another. All 15
  batches have zero approval and remain learner-hidden. Narration authoring is
  complete, but guided production, assessment, review and runtime keep active
  progress at **81%**.
- Authored the first HSK3 guided-production stage for main-idea/detail notes:
  three lessons bind 24 prompt units to 24 exact paragraph source texts/192
  lines. Eight prompts use reading, eight use listening and eight integrate a
  reading/listening pair, yielding 16 reading-input and 16 listening-input
  prompts.
- Every prompt binds evidence lines, four response fields, an answer guide and
  a three-step revision checklist. Input and writing evidence remain separate;
  model reveal and browser TTS cannot grant mastery. The stage consumes the
  existing 284 paragraph-bound character mappings and claims zero new
  character ownership. All 16 audio-dependent prompts lack reviewed audio and
  all three batches remain pending, so progress stays **81%**.
- Authored the second HSK3 guided-production stage for cohesion
  reconstruction: three lessons bind 20 reading/writing prompts to 18 exact
  paragraph source texts/144 lines. The split is seven temporal-order
  reconstructions, seven reference/linker restorations and six order-rationale
  explanations.
- Every ordering block, cloze answer and evidence line is exact-source-bound.
  Source exposure, automatic ordering and model reveal can only start a
  revision loop; they cannot grant writing mastery or calibrate assessment.
  Two stages now total 6/15 lessons, 44 prompts, 42 source bindings/336 lines
  and six pending review batches. The stage claims zero new character
  ownership and keeps progress at **81%** while nine production lessons,
  assessment, review and runtime remain.
- Authored the third HSK3 guided-production stage for event retelling:
  three lessons use all 20 unique graded-listening texts from the study,
  nature, society and culture domains exactly once. The 7/7/6 split covers
  retelling from a four-point note card, change–cause retelling and a complete
  opening–body–closing paragraph.
- Each listening-to-speaking prompt binds all eight source lines, the exact
  four-element source summary and its existing Hanzi/Pinyin/Vietnamese model.
  The learner loop is listen, note, record, reveal, revise and record again.
  Browser TTS cannot count as listening mastery; an unreviewed self-recording
  cannot count as speaking mastery. Three stages now total 9/15 lessons, 64
  prompts, 62 source bindings/496 lines and nine pending batches. All 36
  audio-dependent prompts lack reviewed audio and all 20 recording prompts
  lack a reviewed rubric, so progress remains **81%** while six guided
  production lessons, assessment, review and runtime remain.
- Authored the fourth HSK3 guided-production stage for paragraph writing:
  three lessons contain 16 reading-to-writing prompts—six question-guided
  six-sentence paragraphs, five dual-source evidence comparisons and five
  eight-sentence paragraphs with a cohesion audit.
- The stage binds 16 exact graded-reading texts/128 lines through 21 source
  inputs and 21 exact source-summary models. Learners must produce at least
  106 sentences across first drafts, reveal evidence only afterward, mark two
  revisions and submit a rewritten draft. Source exposure, model summaries
  and self-checks cannot grant writing mastery without a reviewed rubric.
  Four stages now total 12/15 lessons, 80 prompts, 78 source artifacts/624
  lines and 12 pending batches. Progress remains **81%** while the final three
  guided-production lessons, assessment, review and runtime remain.
- Authored the fifth and final HSK3 guided-production stage for structured
  spoken explanation: 12 dual-source listening/speaking prompts split evenly
  across choice-with-reason, criteria-based comparison and bounded viewpoint.
  They bind 18 exact listening texts/144 lines through 24 source inputs.
- Each prompt requires evidence from both sources, a limit or counterpoint,
  at least 4–6 spoken sentences and two recording attempts. Across the stage
  that is at least 64 spoken sentences and 24 recordings. Browser TTS,
  revealed models and self-recordings remain non-mastery until reviewed audio
  and a reviewed speaking rubric exist. All five stages now total 15/15
  lessons, 92 prompts, 96 source artifacts/768 lines and 15 pending batches.
  Guided-production authoring is complete, but assessment, human review,
  runtime publication and HSK4 content keep progress at **81%**.

## Repository state

- Branch: `codex/hsk4-graduation`
- Base commit: `5cc78673cd91445adbcad8f69286c0b9081d1d1d`
- Production checkpoint carried forward: `594cf83`.
- This branch contains a reviewed local engineering checkpoint split into
  auditable commits. No release tag, saved Sites version, deployment or
  production evidence was created.
- Commit boundaries organize the reconstructed worktree by dependency layer
  for review; intermediate commits are not a green-bisect guarantee. The full
  verification below applies to the complete branch tip.
- The committed source contains technical slices mapped to Phases 0-3; it does
  not satisfy any phase exit criterion.
- Phase 4, commerce, reviewed A0/HSK coverage, pilot evidence, hosted
  operational qualification and Sites deployment remain pending.
- The local Sites-era D1 binding and Drizzle migration packaging in
  `.openai/hosting.json` and `build/sites-vite-plugin.ts` are preparation only.
  Freeze both files until the final Sites step; no saved version or deployment
  has occurred.

## Deferred production roadmap progress estimate

Headline estimate: **55.1% of the original production roadmap** as of
28 July 2026.

This is a planning estimate, not a release claim. The nine workstreams are
weighted equally. Each workstream has at most 40 points for implemented product
and infrastructure, 30 points for repeatable local evidence, and 30 points for
hosted, human, pilot, legal or operational acceptance evidence. No production
acceptance points are claimed yet because the project still has no deployment,
reviewed content release, learner pilot, hosted recovery drill or independent
security/privacy sign-off.

| Workstream | Technical + local evidence (max 70) | Production acceptance (max 30) | Overall | Current position |
| --- | ---: | ---: | ---: | --- |
| WS1 Identity/backend/durable data | 58 | 0 | 58% | Repository boundaries, D1 schema, sync/outboxes, export/delete and local restore exist; immutable provider identity, hosted multi-device proof, PostgreSQL target and hosted recovery remain. |
| WS2 Curriculum/content production | 56 | 0 | 56% | Versioned packages, governance/import tooling, readiness projection and the verified E3a assignment persistence kernel exist; authenticated editor workflow, reviewed A0 volume, licensed audio and human approvals remain. |
| WS3 Mandarin phonology/tone | 52 | 0 | 52% | Syllable-aware technical model and validation exist; native golden approval and release evidence remain. |
| WS4 Assessment/mastery | 55 | 0 | 55% | Skill-specific server authority and evidence separation exist; adaptive calibration, confidence thresholds and pilot validity remain. |
| WS5 Release/prerequisites | 64 | 0 | 64% | Fail-closed states, prerequisites, content versions and route/server guards are broadly implemented; hosted contract proof and reviewed activation remain. |
| WS6 Unified learning evidence | 51 | 0 | 51% | Lesson, Reader, assessment and Review command/evidence paths exist; verified writing/speaking and consented acoustic scoring remain. |
| WS7 Quality/operations | 58 | 0 | 58% | Strong local unit/content/restore/E2E/Lighthouse gates include the E3a database boundary; production telemetry, staging, alert ownership, SLO and incident/rollback drills remain. |
| WS8 Performance/inclusive UX | 62 | 0 | 62% | Bundle budgets, responsive assets, offline recovery, keyboard/mobile/reduced-motion and local Lighthouse targets exist; production RUM p75 evidence remains. |
| WS9 Security/privacy/legal/SEO | 40 | 0 | 40% | Baseline headers, policy gates, dependency audit and public metadata exist; independent review, consent lifecycle, privacy operations, legal decisions and public verification remain. |

The technical/local portion is about **79% complete** (496 of 630 possible
technical/local points), while the end-to-end production acceptance portion is
still **0% claimed**. This explains why the repository can contain substantial
engineering work while `verify:production` correctly remains fail-closed.

Current bounded milestone:

- E3a assignment persistence kernel: **100%** — implementation, migration,
  restore rehearsal, focused lifecycle/integrity tests and the complete local
  baseline are green.
- E3b authenticated/authorized operator workflow: **0%** — next dependency,
  deliberately not started before E3a is green and committed.
- Sites ownership, saved version and deployment: deferred to the final step at
  the user's request.

Forecast from the current delivery pace:

- The available Git sample covers 26–28 July, not a complete seven-day
  steady-state week. It contains 21 commits, but the first 12 split a
  reconstructed checkpoint into auditable boundaries and must not be treated
  as ordinary feature throughput.
- If the later bounded-slice pace is sustained, the remaining local
  engineering can reach a feature-complete, pre-deployment candidate in about
  **2–3 weeks** (11–18 August 2026).
- A closed-alpha-ready candidate is more realistically **4–7 weeks** away
  (25 August–15 September 2026), assuming legal and native reviewers, licensed
  content/audio and pilot recruitment are available in parallel.
- Full production completion is approximately **12–16 weeks** away
  (20 October–17 November 2026) in an optimistic cross-functional path.
  A primarily solo path or delayed human review/content/pilot recruitment is
  more realistically **16–24 weeks** (17 November 2026–12 January 2027).
- These dates cannot be shortened by code throughput alone: the roadmap
  requires a 14-day, 100-person closed alpha, followed by retention/outcome
  observation including D30, plus legal, security, hosted recovery and
  operational evidence.

Progress accounting rules:

- Update this section at every green checkpoint commit, not after every test
  invocation.
- Generated migration snapshots and line counts do not increase the estimate.
- Tests increase only the local-evidence portion; they cannot close content,
  pilot, hosted, legal, security or operational acceptance gates.
- A workstream percentage moves only when a named roadmap deliverable and its
  applicable evidence are both present.

## Stabilization completed

- Reader open, attempt, submission and abandonment records now hash the same
  canonical queued command at enqueue and delivery preparation.
- Compatibility assumption: the Reader command outbox is new in this
  checkpoint and was absent from base `5cc7867`; no released v1 Reader records
  therefore require migration from pre-canonical timestamps.
- Delivery preparation rejects a valid-looking command mutation when its
  envelope or original request hash no longer matches.
- Reader dependency aliases, sequence ordering and submission dependency keys
  are checked before delivery.
- Projected Reader anchor insertion and open-receipt acknowledgement now
  perform opposing duplicate-authority checks inside serialized IndexedDB
  read/write transactions. A redundant open is terminally quarantined when the
  projected authority committed first, so it cannot be resent indefinitely.
- Regression coverage reproduces mutations of all four Reader command kinds
  and the projected-anchor/open-receipt interleaving, including coordinator
  proof that the redundant open is sent only once.
- The remediation E2E selector was aligned with the current local-practice
  wording.
- Reset E2E proves the injected cache and response are removed while allowing
  the active service worker to recreate public offline asset caches.
- All six registered content packages now retain exact immutable source
  snapshots, so historical validation no longer depends on mutable HEAD files.
- The mandatory content gate validates every registry entry and lineage edge;
  runtime-bound candidates also fail on live-source drift.
- Content mutations serialize through a repository lock, new versions validate
  the existing history before staged rename, and reviews cannot be appended
  after publication.
- `foundation-2026.07.5` is the first schema-v4 / item-catalog-v2 candidate.
  Its full authoring inventory has 74 canonical payloads: 24 lexemes, 24
  lessons, 1 graded text, 5 grammar items, 5 pronunciation items, 7 character
  items and 8 communicative-function items.
- The four new knowledge-item types are source-derived from immutable lesson
  guides, lexemes and explicit blueprints. They remain `review`, have no
  owner/license/review evidence, and character radical/stroke metadata remains
  null rather than being guessed.
- Lesson knowledge membership, typed prerequisite references/cycles, source
  reciprocity, runtime-representable lesson closure and graded-text prerequisite
  limits fail closed. Review scopes name exact targets and coverage paths must
  equal the full typed transitive dependency closure.
- Client curriculum imports a separate canonical `runtime-catalog.json` with
  24 used lexemes, 14 released lessons and 1 released story. Field allowlists
  strip item governance, review/audio metadata, hashes, draft/review payloads
  and all four new knowledge types; schema-v4 source may not import any other
  package JSON artifact.
- Catalog export rehydrates the complete immutable authoring inventory instead
  of reading sanitized runtime, preventing the 10 draft lessons from being
  dropped in the next version.
- Catalog-v4 export now reprojects core and knowledge payloads from current
  authoring sources while preserving exact source-addressed character
  artifacts. Canonical audio bindings may follow an unchanged transcript;
  incompatible text changes require explicit replacement and target removal is
  rejected until an audio-retirement workflow exists.
- Release counts use distinct reviewed payloads, not raw IDs. Empty graded
  texts, duplicate payload IDs, boolean-only audio, incomplete A0 graphs,
  relabeled HSK paths and production that skips closed-alpha gates all fail
  closed.
- The candidate has no owner/license, scoped approval, coverage claim or audio;
  24 cataloged lexemes therefore count as 0 reviewed lexemes and 64 transitive
  release-relevant items remain unready.
- A separate `content:audio:import` mutation can create future content-schema-v5
  / item-catalog-v3 candidates from a schema-v2 authoring catalog plus an exact
  descriptor. It derives canonical target/file/transcript hashes, speaker and
  rights bindings, byte-inspected WAV media metadata and timestamp alignment.
- Audio policy v1 accepts only bounded RIFF/WAVE PCM mono 16-bit bytes at an
  allow-listed sample rate. Repository-relative non-symlink source files are
  copied exclusively into a temporary package and re-read/revalidated before
  rename and registry mutation; errors clean the temporary package and retain
  the previous registry/target.
- Historical catalog schemas remain validation-compatible, but their
  uninspected audio can no longer satisfy the production audio gate. Malformed
  audio collections also fail policy assessment without throwing.
- This is tooling only: no real audio, speaker identity, license evidence,
  review, release promotion or runtime playback was added to `.07.5`.
- A separate `content:character:import` mutation can create a future
  content-schema-v6 / item-catalog-v4 candidate from the schema-v2 authoring
  catalog and an exact, complete character descriptor. It binds every
  radical, component and structure claim to package-local source records and
  every stroke count to inspected Hanzi Writer bytes.
- Character policy v1 rejects malformed UTF-8/JSON, unknown or duplicate root
  keys, oversized data, invalid paths/medians and duplicate or out-of-range
  radical stroke indices. Linguistic records must be non-empty JSON objects
  whose character key matches the target; stroke records carry the same
  record key and glyph filename. Repository-relative sources are hash-checked,
  protected from symlink/junction escape, aggregate-bounded, copied
  exclusively into a temporary package and re-read before the package rename
  and registry mutation.
- Catalog v4 distinguishes independent characters, where zero components are
  valid, from compound characters. Linguistic claims must resolve to a
  linguistic reference, stroke data must resolve to exactly one stroke
  dataset, every declared source must be used, and inspected stroke count must
  match the payload. Legacy hash-shaped character fields are release-ineligible.
- The Characters screen now stays fail-closed while no reviewed character
  projection exists. Released vocabulary is no longer repurposed as a
  character inventory, and hard-coded radical, structure and mnemonic claims
  are no longer exposed. The public build likewise publishes no stroke JSON
  until character content has passed its own release boundary.
- The bundled Arphic license is copied byte-for-byte from
  `hanzi-writer-data`; repository attributes and a regression test prevent
  newline or trailing-whitespace rewriting.
- `foundation-2026.07.6` is the first real schema-v6 / catalog-v4 character
  candidate. It copies exact source-addressed radical, IDS and stroke records
  for 一, 二, 三, 人, 你, 好 and 家 into an immutable package.
- Radical records pin Make Me a Hanzi `dictionary.txt` revision
  `618dbab8a8ddefb958763c8b4afbaa741a4460de`; structure/component records pin
  CJKVI IDS revision `86b4d16159f0079437870408f0ca186e529015db`;
  stroke bytes match `hanzi-writer-data@2.0.1` tag commit
  `ad1a9905cada18d07630acc27d438b070d753ec0` byte-for-byte.
- IDS root/self mappings, not glyph appearance, determine independent,
  left-right and top-bottom structure. Component roles remain neutral
  `graphic`; no semantic or phonetic role was invented.
- The CJKVI README delegates `ids.txt` licensing to CHISE terms. The candidate
  records `CHISE-IDS-terms` without inventing an SPDX identity; legal/license
  review remains a release blocker.
- All seven items remain `review`, owner and item/package source license remain
  null, reviews and coverage claims remain empty, and no promotion or runtime
  character exposure occurred.
- Schema-v6 routine versioning, audio import and character reimport now preserve
  and reinspect both media families. Audio replacement may reuse an ID only on
  its existing target; partial rights rotation, stale target text and silent
  artifact loss fail before registry handoff.
- Immutable package control files, nested snapshots and inherited artifacts are
  captured only through trusted regular-file paths with post-read identity
  checks. Mutation failures keep the registry and target package unchanged.
- Runtime and item prerequisite cycle checks are iterative. Matched
  item/runtime lesson closure uses a bounded reachability bitset, including
  non-lesson dependency frontiers, so a 10,000-lesson chain no longer performs
  repeated quadratic closure scans.
- `content:report` now includes a deterministic editorial-readiness projection
  bound to the exact content version, manifest, item catalog and review
  envelope. It reuses release-policy scope, precedence, dependency closure,
  self-review, audio and character semantics rather than maintaining a second
  approval model.
- The `.07.6` projection exposes 74 authoring items, 64 release-relevant items,
  74 missing owners/licenses, 25 unresolved prerequisite decisions and zero
  approvals. Draft inventory remains visible but separate from the
  release-critical queue; no payload or evidence reference is emitted.
- E2 adds `EditorialAssignmentEnvelope` schema v1 and a pure validator for one
  immutable assignment bound to exact content version, manifest, item catalog,
  accountable role, declared operators, timestamp and item/audio scope.
- The assignment contract stays outside immutable content packages,
  `reviews.json`, registry, promotion and learner runtime. It never counts as
  review, mastery, coverage or release evidence.
- E3a adds one operational `editorial_assignment_events` table outside the
  learner/user realm. Exact content streams append immutable `assigned`,
  `reassigned` and `cancelled` events through predecessor CAS and
  operator-scoped idempotency; replay independently verifies the canonical
  stream, intent, envelope and event hash plus lifecycle and active
  role/target ownership.
- The database rejects update/delete, forks, invalid transitions, overlapping
  active role/targets, oversized rows and streams, while the repository bounds
  replay to 10,000 events and 16 MiB. Restore rehearsal now covers the event
  chain and all five authority triggers.
- No real assignment row, descriptor, mutation CLI, authenticated/authorized
  operator, service/API, learner-runtime route, dashboard UI, hosted D1
  mutation, Sites version or deployment was created. Operator IDs remain
  declared strings until the next trusted-principal boundary.

## Local verification

### Current G3 content-authoring baseline

The results below are bound to the exact G3 checkpoint worktree. Any later
edit to code, configuration or content makes this snapshot stale and requires
the applicable gates to run again before the next checkpoint commit.

- `npm run check`: pass
  - lockfile policy, typecheck, full lint, content validation and Drizzle check
  - local D1 restore rehearsal: 14 migrations, 26 restored tables, expanded
    HSK4 profile persistence, 4 editorial events and 5 editorial triggers
  - pinned HSK1-4 source/inventory validation and checked coverage report
  - source-bound HSK0 pronunciation draft: 12 lessons, 111 targets and 208
    activities; 89 audio-dependent activities remain silent and ineligible
  - exact HSK2 authoring scope: 3 graph units, 4 situational strands, 4 grammar
    modules, 4 production stages, 17 tasks, 34 topics, 200 vocabulary, 75
    grammar rows and 125 recognition characters
  - exact HSK3 authoring scope: 3 graph units, 5 discourse domains, 5 grammar
    modules, 5 production stages, 55 planned lesson blueprints, 92 planned
    prompt units, 22 tasks, 54 topics, 500 vocabulary, 96 grammar rows and 284
    recognition characters
  - pinned HSK3 CC-CEDICT draft: 500/500 source-matched, 529 source matches,
    24 multiple-match records, 8 pronunciation review items and 0
    release-eligible item
  - exact HSK3 lesson-blueprint pack: 25 paragraph-input, 15
    narration/grammar and 15 guided-production lessons; all 22 tasks, 54
    topics, 500 vocabulary, 96 grammar rows and 284 recognition characters
    mapped; 287 source-sense keyword matches, 213 declared foundation
    fallbacks, 283 incremental character contexts and one gap; 0 authored
    practice, approval, mastery or release-eligible lesson
  - first HSK3 paragraph-input content pack: 1 lesson, 20 vocabulary drafts,
    2 eight-line Hanzi-Pinyin-Vietnamese texts, 60 vocabulary items, 10
    comprehension items, 2 note grids and 2 guided summaries/retellings;
    74 total practice items, 27 audio-dependent and 0 measurement/mastery/
    release-eligible
  - complete HSK3 personal-life paragraph domain draft: 5 lessons, 100
    vocabulary drafts, 10 texts/80 lines, 300 vocabulary items, 50
    comprehension items, 10 note grids and 10 summaries/retellings; 370 total
    practice items, 135 audio-dependent and 0 reviewed audio, approval,
    measurement/mastery or release eligibility
  - complete HSK3 study/work paragraph domain draft: 5 lessons, 107
    vocabulary drafts, 10 texts/80 lines, 321 vocabulary items, 50
    comprehension items, 10 note grids and 10 summaries/retellings; 391 total
    practice items, 142 audio-dependent and 0 reviewed audio, approval,
    measurement/mastery or release eligibility
  - complete HSK3 nature/environment paragraph domain draft: 5 lessons, 100
    vocabulary drafts, 10 texts/80 lines, 300 vocabulary items, 50
    comprehension items, 10 note grids and 10 summaries/retellings; 370 total
    practice items, 135 audio-dependent and 0 reviewed audio, approval,
    measurement/mastery or release eligibility
  - complete HSK3 society/arts/sports paragraph domain draft: 5 lessons, 96
    vocabulary drafts, 10 texts/80 lines, 288 vocabulary items, 50
    comprehension items, 10 note grids and 10 summaries/retellings; 358 total
    practice items, 131 audio-dependent and 0 reviewed audio, approval,
    measurement/mastery or release eligibility
  - complete HSK3 culture/tradition paragraph domain draft: 5 lessons, 97
    vocabulary drafts, 10 texts/80 lines, 291 vocabulary items, 50
    comprehension items, 10 note grids and 10 summaries/retellings; 361 total
    practice items, 132 audio-dependent and 0 reviewed audio, approval,
    measurement/mastery or release eligibility
  - current combined HSK3 paragraph authoring: 5/5 discourse domains, 25/25
    paragraph lessons, all 500 vocabulary drafts, 50 texts/400 lines and 1,850
    practice items; 675 audio-dependent, 25 pending review batches and 0
    learner-visible item
  - first HSK3 narration/grammar module draft: 3/15 lessons, 21/96 exact
    grammar rows, 21 explanations/examples/correction pairs, 3 model
    narrations/18 lines and 45 practice items (21 grammar-in-paragraph, 21
    discourse corrections and 3 ordered retellings); 3 pending review batches
    and 0 measurement/mastery/release-eligible item
  - complete HSK3 narration/grammar authoring: 5/5 modules, 15/15 lessons,
    96/96 exact grammar rows, 96 explanations/examples/correction pairs, 15
    model narrations/90 lines and 207 practice items; 15 pending review
    batches and 0 measurement/mastery/release-eligible item
  - first HSK3 guided-production stage: 3/15 lessons, 24 source texts/192
    lines and 24 prompt units; 16 reading-input, 16 listening-input and 8
    integrated listening/reading prompts with evidence lines and revision
    checklists; 16 audio-dependent, 3 pending review batches and 0
    measurement/mastery/release-eligible item
  - second HSK3 guided-production stage: 3 more lessons and 20 reading/writing
    prompts over 18 exact source texts/144 lines: 7 temporal-order
    reconstructions, 7 reference/linker restorations and 6 order-rationale
    explanations; two stages total 6/15 lessons, 44 prompts and 6 pending
    review batches with 0 measurement/mastery/release-eligible item
  - third HSK3 guided-production stage: 3 more lessons and 20
    listening/speaking retellings over all 20 unique study, nature, society
    and culture listening texts/160 lines: 7 note-card, 7 change–cause and 6
    opening–body–closing prompts; three stages total 9/15 lessons, 64 prompts,
    36 audio-dependent prompts, 20 learner-recording prompts and 9 pending
    review batches with 0 reviewed audio/rubric or
    measurement/mastery/release-eligible item
  - fourth HSK3 guided-production stage: 3 more lessons and 16
    reading/writing prompts over 16 exact graded-reading texts/128 lines and
    21 source bindings: 6 question-guided six-sentence paragraphs, 5
    dual-source comparisons and 5 eight-sentence cohesion-revision paragraphs;
    at least 106 learner-written sentences, 21 exact model evidence summaries,
    3 pending batches and 0 reviewed rubric or
    measurement/mastery/release-eligible item
  - fifth HSK3 guided-production stage: final 3 lessons and 12 dual-source
    listening/speaking prompts over 18 exact listening texts/144 lines and 24
    input bindings: 4 choice–reason, 4 criteria-comparison and 4 bounded
    viewpoint explanations; at least 64 spoken sentences and 24 recording
    attempts, 3 pending batches and 0 reviewed audio/rubric or
    measurement/mastery/release-eligible item
  - complete HSK3 guided-production authoring: 5/5 stages, 15/15 lessons, 92
    prompts, 96 source artifacts/768 lines, 117 source input bindings, 15
    pending batches and 0 measurement/mastery/release-eligible item
  - exact HSK1 authoring scope: 6 units, 15 tasks, 30 topics, 300 vocabulary,
    66 grammar rows and 246 recognition characters
  - HSK1 communicative draft packs: 25 lesson blueprints, 300 Vietnamese gloss
    drafts, 66 grammar mappings, 102 dialogue turns, 900 vocabulary practice
    items and 25 pending review batches; 0 release-eligible item
  - HSK1 character-foundation draft pack: 15 lesson blueprints, 246
    vocabulary-context mappings, 492 recognition/copy practice items and 15
    pending review batches; 0 pinned full-inventory stroke metadata and 0
    release-eligible item
  - HSK1 grammar-context draft pack: 66 Vietnamese explanations, 66 model
    examples, 66 guided production self-checks and 20 pending review batches;
    0 measurement-eligible or release-eligible item
  - HSK1 task/assessment draft pack: 30 topic prompts, 15 task scenarios, 60
    dialogue turns, 15 roleplay self-checks and 15 pending review batches;
    level-check blueprint plans 55 items and binds 50 objective drafts
  - hidden HSK1 objective item bank: 15 listening, 15 reading, 10 vocabulary
    and 10 grammar items in 10 pending review batches; 0 reviewed audio,
    independent form, calibrated or measurement-eligible item
  - exact-hash HSK1 review manifest: 6 source artifacts and 85 pending batches
    with 0 approval; manifest assignment readiness does not publish content
  - local HSK1 review workflow: 85 exact batches, 258 role assignments and
    2,181 normalized target references; 0 manifest approval or runtime mutation
  - pinned CC-CEDICT source identity and HSK1 draft/report validation:
    300/300 source-matched, 297 pronunciation-compatible, 0 release-eligible
  - pinned Debian CC-CEDICT source identity and HSK2 draft/report validation:
    200/200 source-matched, 232 source matches, 26 multiple-match records,
    194 pronunciation-compatible and 0 release-eligible
  - exact HSK2 lesson-blueprint pack: 40 lessons split 20 situational,
    10 sentence-chain and 10 short-production; all 17 tasks, 34 topics,
    200 vocabulary, 75 grammar rows and 125 recognition characters mapped;
    0 authored practice, assessment prompt, approval or release-eligible lesson
  - HSK2 vocabulary-practice pack: 200 Vietnamese AI-assisted gloss drafts,
    200 meaning-recall, 200 pinyin-recognition and 200 listening-selection
    items across 20 situational lessons; 0 reviewed audio, measurement/mastery
    or release-eligible item
  - HSK2 character-practice pack: 125 character drafts and 250 practice items
    across 10 production lessons; 124 cumulative vocabulary contexts plus the
    explicit `留` gap, 0 pinned stroke metadata or writing-mastery claim
  - HSK2 grammar-context draft pack: 75 Vietnamese explanations, 75 distinct
    model examples, 75 guided production self-checks and 10 pending review
    batches; 0 approval, measurement/mastery or release-eligible item
  - HSK2 situational-dialogue draft pack: 20 lessons, 120 model-dialogue
    turns, 17 task scenarios, 34 topic prompts, 20 guided roleplay self-checks
    and 20 pending review batches; 0 reviewed audio, approval,
    measurement/mastery or release-eligible item
  - HSK2 short-text production draft pack: 10 lessons, 104 prompt units
    (36 dictation, 36 reconstruction, 16 guided-message and 16
    picture-description), 168 model sentences, 125 exact character-prompt
    mappings and 10 pending review batches; 0 reviewed audio, approval,
    measurement/mastery or release-eligible item
  - HSK2 level-assessment draft bank: 2 source-disjoint forms, 86 items per
    form, 120 objective items and 52 speaking/writing responses across 12
    pending review batches; 0 reviewed audio, calibration, measurement,
    mastery, prerequisite waiver or release-eligible item
  - exact-hash HSK2 review manifest: 7 source artifacts and 122 pending
    batches; local workflow resolves 405 role assignments and 1,732 exact
    targets with 0 manifest approval or runtime/calibration/mastery mutation
  - Vitest: 187 files, 1,403 tests passed
  - production build and bundle policy passed; conservative client asset
    ceiling: 394.8 KiB
- `npm run test:e2e`: 19 tests passed
- `npm run test:lighthouse`: three cold-profile runs
  - Performance: 94 / 98 / 98, median 98
  - Accessibility: 100
  - Best Practices: 100
  - SEO: 100
  - Median LCP: 1,899 ms; CLS: 0; TBT: 94 ms
- `npm audit --omit=dev`: 0 vulnerabilities
- `git diff --check`: pass

## Deliberately pending release evidence

`verify:production` must remain fail-closed. The readiness manifest still has
9 pending gates and 23 blockers:

- native linguistic review;
- content ownership, licensing, exact-hash approval and production promotion;
- learner pilot and assessment calibration;
- immutable provider identity and public recovery rehearsal;
- hosted backup/restore;
- independent security and privacy review;
- operational owner, on-call, SLO, alert and incident rehearsal;
- production load, accessibility and performance qualification;
- Sites ownership and production deployment verification.

The production content channel separately remains blocked by 10 policy
requirements plus registry activation. Local tests cannot close any of these
human, pilot, hosted or ownership gates.

## Next dependency-ordered milestone

1. Add HSK3 skill-separated assessment now that all learning-source
   partitions exist. Keep forms source-disjoint where required and keep
   reviewed audio/rubrics, calibration and prerequisite authority fail-closed.
2. Package HSK3 review manifests/workflow, then finish remaining G2
   placement/progress work when reviewed
   content can exercise it; keep imports unpublished until provenance and
   linguistic gates pass.
3. Leave operator auth, commerce, hosted pilot and Sites frozen until the
   active HSK0-4 graduation roadmap is complete or the user explicitly resumes
   production work.

Use one bounded G0-G5 slice at a time and end each commit with updated active
progress in both roadmap and checkpoint.
