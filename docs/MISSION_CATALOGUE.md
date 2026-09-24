# HUMAN ERROR mission catalogue, v0.7.0 / ruleset 7

The first two inventory tables preserve the 82-template v0.6 baseline. The v0.7 table below adds exactly 50 mechanically distinct templates, for 132 total. The baseline variation matrix adds each template’s visible seeded domain and difficulty behavior; the inventory tables supply category, interaction, mechanic, example, base timing, and distinction. New v0.7 rows include all fields together. All gameplay variation is seeded; identical version, ruleset, seed, mode, and accepted history reproduce the same question. Durations are unpaced Level 1 base milliseconds unless the row states a difficulty range.

## The 32 inherited templates

| ID / display concept | Category · input | Core mechanic | Example prompt · answer rule | Base ms | Distinctness |
|---|---|---|---|---:|---|
| `magnitude` · largest or smallest | numbers · choice | Compare a set against a randomly selected extreme | “BIGGEST NUMBER.” · choose the maximum or minimum shown | 3800 | Extrema comparison, separate from target-distance or rank selection. |
| `odd` · shape intruder | attention · choice | Scan a nine-item array for the sole fill-state mismatch | “FIND THE IMPOSTOR.” · tap the one hollow-among-filled or filled-among-hollow shape | 3800 | Visual feature search, with position as the response. |
| `opposite` · antonym | words · choice | Retrieve the lexical opposite of a displayed word | “OPPOSITE OF LEFT.” · choose RIGHT | 3800 | Word relation retrieval, independent of visual conflicts. |
| `omit` · remove a letter | words · typing | Delete every instance of a named character | “BANANA WITHOUT A.” · type BNN | 5700 | Constructed string response, rather than selecting a precomputed choice. |
| `longword` · longest or shortest | words · choice | Compare candidate strings by character count | “LONGEST WORD.” · choose greatest length | 3800 | Length comparison, unlike semantic word tasks. |
| `math` · multiplication | numbers · choice | Compute a product | “6 × 7 = ?” · choose 42 | 4250 | Direct multiplication, without operator precedence or inverse solving. |
| `brakes` · resist bait | reflex · wait | Inhibit an obvious press and wait out the prompt | “DO NOT PRESS IT.” · do nothing until it ends | 2200 | No-response control with no later instruction or cue. |
| `reaction` · wait for GO | reflex · reaction | Withhold a response until a delayed cue, then react | “WAIT FOR GO.” · press only after GO appears | ~2175 | Cue-gated speed response, not an inhibition-only task. |
| `remember` · store a code | memory · memory | Encode a short numeric item for later use | “SAVE THIS TO RAM.” · observe the three-digit code | 1800 | A single non-scored encoding setup paired with `recall`. |
| `recall` · retrieve a code | memory · choice | Retrieve the earlier encoded item after intervening tasks | “WHAT WAS THE CODE?” · choose the stored code | 3800 | Delayed retrieval, unlike `nback`'s immediate sequence position. |
| `override` · ignore later order | words · wait | Maintain an earlier rule when later text contradicts it | “IGNORE THE NEXT ORDER.” · do not press the later bait | 3100 | Prospective rule maintenance across time, beyond simple bait inhibition. |
| `parity` · even or odd | numbers · choice | Classify one number by divisibility by two | “FIND THE EVEN NUMBER.” · choose the even value | 3800 | Single-value parity classification, distinct from divisibility by three. |
| `server` · incident search | attention · choice | Search a labelled set for one status marker | “SAVE PRODUCTION.” · choose the sole ON FIRE server | 3800 | Text-and-status visual search, rather than shape-feature search. |
| `position` · press a location | attention · choice | Select a button by its physical slot despite its label | “PRESS THE LEFT BUTTON.” · choose the left-position button | 3800 | Spatial response mapping, not arrow direction or word meaning. |
| `lettercount` · count a letter | words · choice | Count occurrences of one specified character in a string | “COUNT THE O’S.” · choose the visible word's O count | 4150 | Target-character counting, unlike whole-word vowel counting. |
| `second` · second-largest value | numbers · choice | Rank four values and select rank two | “SECOND LARGEST.” · choose the second item in descending order | 3800 | Ordinal ranking, not simply selecting an extreme. |
| `match` · exact duplicate pair | attention · choice | Compare two strings for exact equality | “WHICH PAIR MATCHES EXACTLY?” · choose identical lines | 3800 | Pairwise equality detection, rather than counting or classifying. |
| `avoid` · avoid the named value | attention · choice | Inhibit a repeated forbidden value and choose the sole safe option | “DO NOT PICK 42.” · choose the different value | 3800 | Numeric stimulus inhibition, distinct from waiting without input. |
| `sequence` · next number | numbers · choice | Extrapolate a constant-difference arithmetic sequence | “WHAT COMES NEXT?” · continue the displayed step | 3800 | Numeric series induction, unlike letter or spatial patterns. |
| `vowels` · count vowels | words · choice | Count all vowels in a short word | “COUNT THE VOWELS.” · choose the count | 3800 | Vowel-class counting, rather than a single-letter count. |
| `reverse` · type backwards | words · typing | Reverse the order of every character | “TYPE ROBOT BACKWARDS.” · type TOBOR | 6000 | Whole-string order reversal, not a letter substitution cipher. |
| `pairtotal` · sum to target | numbers · choice | Find two addends that total a stated value | “WHICH PAIR MAKES 17?” · choose the pair summing to 17 | 3800 | Pair construction, not multiplication or running-state updates. |
| `middle` · middle letter | words · choice | Read the central character of an odd-length string | “MIDDLE LETTER.” · choose the centre character | 3800 | Positional character extraction, not first/last classification. |
| `notcontain` · word without a letter | attention · choice | Search candidates for absence of a specified character | “PICK THE WORD WITHOUT E.” · choose the only string lacking E | 3800 | Negative string search, distinct from positive letter counting. |
| `counter` · exact tap count | reflex · counter | Produce a precise repeated-input count | “TAP 5 TIMES.” · tap exactly five times, then send | 5000 | Motor-count interaction, unlike selecting a static answer. |
| `closest` · nearest to target | numbers · choice | Minimize numeric distance from a target | “CLOSEST TO 50.” · choose the value with the smallest absolute gap | 3800 | Distance comparison, not max/min or ordered rank. |
| `ascending` · sort three values | numbers · choice | Identify a complete increasing numeric ordering | “WHICH ORDER IS ASCENDING?” · choose low-to-high sequence | 3800 | Total numeric sorting, unlike `ordering`'s partial constraints. |
| `initial` · starts with | words · choice | Classify strings by their first character | “STARTS WITH P.” · choose the matching word | 3800 | Initial-position filtering. |
| `lastletter` · ends with | words · choice | Classify strings by their final character | “ENDS WITH T.” · choose the matching word | 3800 | Final-position filtering, separate from first-character filtering. |
| `difference` · exact gap | numbers · choice | Compare the absolute distance between a numeric pair | “WHICH PAIR IS 5 APART?” · choose the pair whose difference is five | 3800 | Pairwise distance, distinct from one-value target proximity. |
| `duplicate` · repeated digit code | attention · choice | Detect repetition within a multi-digit code | “FIND THE REPEATED DIGIT CODE.” · choose the code containing a duplicate | 3800 | Within-string repetition detection, not duplicate strings. |
| `alphabet` · next letter | attention · choice | Extrapolate a fixed-step alphabet sequence | “NEXT LETTER.” · continue the displayed letter interval | 3800 | Ordered symbol induction, separate from numeric series. |

## The 50 new templates

| ID / display concept | Category · input | Core mechanic | Example prompt · answer rule | Base ms | Distinctness from inherited and adjacent mechanics |
|---|---|---|---|---:|---|
| `mirror` · reflect a grid | attention · choice | Reflect each row across a vertical axis | “MIRROR LEFT ↔ RIGHT.” · reverse each row's cells | 4700 | Two-dimensional reflection; `reverse` reorders a word and `rotate` changes orientation. |
| `rotate` · rotate a tile | attention · choice | Apply a clockwise quarter-turn to a 2×2 tile | “ROTATE THE TILE CLOCKWISE.” · move each cell one quarter-turn | 4300 | Rotation preserves handedness differently from `mirror` reflection. |
| `loopcount` · count digit holes | attention · choice | Count enclosed regions in a string of digits | “COUNT ENCLOSED LOOPS.” · count one loop in 0/6/9 and two in 8 | 4000 | Feature counting inside glyphs, not grid connectivity or repeated symbols. |
| `overlap` · shared symbols | attention · choice | Compute the intersection of two sets | “KEEP ONLY SHARED SYMBOLS.” · return symbols present in both sets | 4200 | Symmetric intersection; `setdiff` is directional removal from A by B. |
| `occlusion` · depth order | attention · choice | Infer which of three objects is behind both others | “WHICH OBJECT IS BEHIND BOTH?” · choose the last in front-to-back order | 4300 | Scene depth judgment, not position-in-row or symbol search. |
| `changegrid` · find changed cell | attention · choice | Compare two aligned strings and locate the changed index | “FIND THE CHANGED CELL.” · return the one-based changed position | 4200 | Temporal visual change detection, unlike static exact-match comparison. |
| `pathtrace` · trace a route | attention · choice | Update a grid coordinate through a sequence of moves | “TRACE THE PATH.” · apply N/E/S/W moves and choose the endpoint | 5000 | Multi-step spatial state update; `queueorder` edits an ordered list. |
| `components` · count connected patches | attention · choice | Count four-neighbour connected components in a cell grid | “COUNT EDGE-CONNECTED PATCHES.” · count separate filled regions | 4300 | Graph connectivity in a grid, not enclosed loops in numerals. |
| `tilefit` · complete a tile pattern | attention · choice | Infer a cyclic row shift in a 3×3 symbol pattern | “COMPLETE THE TILE GRID.” · choose the missing symbol from the row transform | 4500 | Repeating spatial transformation; `sequence` extrapolates numeric differences. |
| `cubeface` · fold a cube net | attention · choice | Mentally fold a cross-like net to identify an opposite face | “FOLD THE CUBE NET.” · select the face opposite C | 4400 | Three-dimensional adjacency from a net, beyond 2D rotation/reflection. |
| `conflict` · follow the arrow | attention · choice | Inhibit a conflicting direction word and follow the arrow glyph | “FOLLOW THE ARROW, IGNORE THE WORD.” · choose the arrow's direction | 3900 | Symbol-direction conflict; `position` maps a physical slot and `override` tests delayed rule maintenance. |
| `ruleswitch` · cue selects low/high | attention · choice | Use a presented A/B cue to select a minimum or maximum | “RULE A: LOW.” · apply the cued comparison to the pair | 4600 | Cue-dependent rule selection; `magnitude` has no changing rule cue. |
| `ruleinfer` · infer a mapping | attention · choice | Infer a constant input-output multiplier from examples | “INFER THE MAPPING.” · apply the demonstrated function to the next input | 4800 | Function induction from examples, separate from constant-step sequence continuation. |
| `errorcheck` · detect a rule violation | attention · choice | Inspect unmarked values and identify the item contradicting a stated parity rule | “RULE: VALUES MUST BE EVEN. FIND THE ERROR.” · choose the sole odd value | 4700 | Diagnosis of an observed violation; `counterexample` constructs a disproof. |
| `rulefollow` · combine then increment | attention · choice | Execute a named binary operation and a second instruction | “APPLY SUM, THEN ADD 1.” · compute sum or product, then increment | 4500 | Two-stage instruction execution; `stateupdate` applies signed changes to a running value. |
| `queueorder` · edit a queue | memory · choice | Apply two ordered edits to a four-item queue | “UPDATE THE QUEUE.” · swap endpoints, then move C to front | 4800 | Procedural sequence of list mutations, unlike logical order inference. |
| `stateupdate` · update running total | memory · choice | Maintain a numeric state through two signed updates | “UPDATE THE RUNNING TOTAL.” · apply both changes in displayed order | 4800 | State tracking with arithmetic, unlike `rulefollow`'s operation-plus-command. |
| `nback` · two-back recall | memory · choice | Retrieve the symbol two positions before the sequence end | “TWO-BACK CHECK.” · choose the item at the specified lag | 4600 | Short-lag sequence memory; `recall` retrieves a single delayed code. |
| `timeline` · middle event in time | memory · choice | Sort three explicit timestamps and find the middle event | “WHICH EVENT HAPPENED SECOND?” · choose the event with median time | 4500 | Timestamp sorting; `ordering` infers a partial order from constraints. |
| `elapsed` · elapsed minutes | memory · choice | Compute duration across clock-hour and midnight boundaries | “ELAPSED MINUTES?” · subtract times modulo one day | 4700 | Clock arithmetic, distinct from comparing beat intervals. |
| `beats` · longest beat interval | memory · choice | Derive consecutive intervals from cumulative event times | “WHICH GAP IS LONGEST?” · subtract adjacent timestamps and select maximum | 4400 | Interval extraction and comparison, unlike absolute event sorting. |
| `prime` · identify prime | numbers · choice | Test nearby candidates for primality | “WHICH NUMBER IS PRIME?” · choose the sole prime among nearby composite distractors | 5200 | Primality classification without a smallest-value shortcut; `sieve` filters by two named divisibility predicates. |
| `factorpairs` · count factor pairs | numbers · choice | Count unique positive factor pairs of a target integer | “FACTOR PAIRS OF 24.” · count pairs with product 24 | 4600 | Divisor-pair enumeration, not direct multiplication. |
| `modthree` · remainder modulo three | numbers · choice | Compute a modular remainder | “REMAINDER AFTER DIVIDING BY 3.” · select n mod 3 | 4000 | Modular arithmetic, distinct from parity's mod-2 classification. |
| `fraction` · compare fractions | numbers · choice | Compare rational magnitudes with unequal numerators and denominators | “PICK THE LARGEST FRACTION.” · choose the greatest value | 4700 | Magnitude comparison of ratios, while `ratio` checks equivalence. |
| `ratio` · equivalent ratio | numbers · choice | Test whether a pair preserves a base ratio | “CHOOSE THE EQUIVALENT RATIO.” · choose the pair reducible to the base | 4500 | Proportional equivalence; `chance` interprets favourable outcomes over a total. |
| `estimate` · round to nearest ten | numbers · choice | Approximate by place-value rounding | “ROUND TO THE NEAREST TEN.” · select the nearest multiple of ten | 4100 | Approximation, not exact extrema or distance-to-target. |
| `binary` · decode binary | numbers · choice | Convert a four-bit numeral to its decimal value | “DECODE THE BINARY NUMBER.” · evaluate base-2 positional weights | 4300 | Base conversion, not the base-10 arithmetic missions. |
| `balance` · solve an equation | numbers · choice | Reverse an addition or subtraction operation to solve for X | “SOLVE: X − 4 = 7.” · isolate X with the inverse operation | 4600 | Equation inversion, unlike forward multiplication or cumulative updates. |
| `precedence` · operator precedence | numbers · choice | Evaluate a mixed expression with multiplication before addition | “FOLLOW OPERATOR PRECEDENCE.” · compute a + b×c | 4700 | Order-of-operations reasoning, beyond single-operation arithmetic. |
| `unitrate` · distance per hour | numbers · choice | Normalize a total quantity by elapsed units | “DISTANCE PER HOUR.” · divide kilometres by hours | 4700 | Rate normalization, distinct from equivalent-ratio recognition. |
| `chance` · probability of red | numbers · choice | Compute favourable count divided by total outcomes | “PROBABILITY OF RED?” · reduce red/(red+blue) | 4400 | Probability interpretation; a numerical ratio has an event/sample-space meaning. |
| `roman` · decode Roman numeral | numbers · choice | Parse additive and subtractive Roman numeral symbols | “DECODE THE ROMAN NUMERAL.” · convert the visible numeral to decimal | 4300 | Symbol-system decoding, unlike positional binary conversion. |
| `mean` · arithmetic mean | numbers · choice | Aggregate values then divide by their count | “FIND THE MEAN.” · sum the values and divide by three | 4400 | Statistical aggregation, separate from pointwise comparison. |
| `perimeter` · rectangle perimeter | numbers · choice | Combine side lengths around a closed shape | “RECTANGLE PERIMETER.” · compute 2×(length+width) | 4300 | Geometric boundary measure, not area or arithmetic series. |
| `anagram` · unscramble letters | words · choice | Reorder a multiset of letters into a word | “UNSCRAMBLE THE LETTERS.” · choose the matching letter multiset | 4700 | Permutation-based lexical search, unlike substitution decoding. |
| `weave` · interleave strings | words · choice | Alternate characters from two ordered strings | “INTERLEAVE THE TWO STRINGS.” · take one character from each in turn | 4500 | Two-source merge pattern, not reversing one string. |
| `rhyme` · recognize rhyme | words · choice | Match an ending-sound pattern | “WHICH WORD RHYMES WITH LIGHT?” · choose the word sharing its rhyme | 3900 | Phonological ending match; `homophone` uses same-sound words with sentence meaning. |
| `analogy` · complete a relation | words · choice | Transfer a semantic relation to a new pair | “DAY : NIGHT :: UP : ?” · preserve the relation | 4300 | Relational transfer, distinct from category membership. |
| `compound` · join word parts | words · choice | Concatenate two semantic word parts into a compound | “JOIN BOTH PARTS INTO ONE WORD.” · combine the displayed parts | 4500 | Morphological construction, not anagram rearrangement. |
| `caesar` · decode shifted text | words · choice | Reverse a stated alphabetic substitution shift | “DECODE SHIFT −2.” · shift each letter back by two | 4800 | Uniform character substitution, unlike anagram permutation or reversal. |
| `homophone` · meaning selects sound-alike | words · choice | Choose the homophone that fits sentence meaning | “I can ___ the sea.” · choose SEE | 4300 | Contextual spelling selection, not rhyme detection. |
| `categorize` · semantic category | words · choice | Classify an object by its real-world class | “WHICH IS A TOOL?” · choose the item belonging to that class | 4200 | Semantic membership, separate from visual-feature oddity. |
| `xor` · exactly one is true | attention · choice | Evaluate exclusive OR over two truth values | “EXACTLY ONE STATEMENT IS TRUE.” · choose true iff values differ | 4100 | Exclusive truth table; `implication` has a different conditional truth rule. |
| `implication` · conditional truth | attention · choice | Evaluate “if P then Q” | “IF P, THEN Q. IS THE RULE TRUE?” · false only for true P and false Q | 4500 | Conditional inference, not exclusive counting of true statements. |
| `syllogism` · chain categories | attention · choice | Compose two universal category inclusions | “FOLLOW THE TWO FACTS.” · infer whether the category chain entails the conclusion | 4500 | Transitive class inference, unlike Boolean truth evaluation. |
| `ordering` · infer who is last | attention · choice | Derive the forced final item from partial precedence constraints | “WHO MUST BE LAST?” · apply A-before-B, B-before-C, D-before-A | 4500 | Constraint entailment; `ascending` directly sorts numeric values and `queueorder` edits a list. |
| `setdiff` · remove shared symbols | attention · choice | Compute directional set subtraction A\B | “A MINUS B: KEEP A-ONLY SYMBOLS.” · return members of A absent from B | 4300 | Directional difference; `overlap` returns the symmetric intersection. |
| `counterexample` · disprove a universal | attention · choice | Falsify a universal claim by selecting one violating instance | “DISPROVE: ‘EVERY CODE IS EVEN.’” · select an odd code | 4700 | Constructive falsification, distinct from finding an error in supplied examples. |
| `sieve` · odd multiples of three | numbers · choice | Filter values by two simultaneous divisibility properties | “KEEP ODD MULTIPLES OF THREE.” · choose the sole odd multiple of three | 4300 | Combined mod-2/mod-3 filter; `prime` tests prime factor structure. |

## Similarity audit

These adjacent pairs were explicitly reviewed. They remain separate templates because their visible contracts require different operations and their independent test oracles compute different results; none is counted solely because its wording, operands, or button order differs.

| Reviewed pair or cluster | Shared surface | Distinct mechanic retained |
|---|---|---|
| `mirror` / `rotate` / `cubeface` | Spatial transformation | Row reflection, quarter-turn mapping, and 3D net folding respectively. |
| `loopcount` / `components` / `duplicate` | Count or detect a pattern | Enclosed glyph regions, graph-connected cells, and repeated digits within a code. |
| `sequence` / `alphabet` / `tilefit` / `ruleinfer` | Infer a pattern | Numeric difference, alphabet interval, cyclic grid shift, and learned input-output function. |
| `ascending` / `ordering` / `queueorder` / `timeline` | Order items | Numeric total sort, logical partial-order entailment, procedural queue edits, and timestamp median. |
| `overlap` / `setdiff` | Set operations | Symmetric intersection versus directional relative complement. |
| `magnitude` / `closest` / `second` / `fraction` | Compare values | Extreme, target distance, ordinal rank, and rational magnitude. |
| `ratio` / `chance` / `unitrate` | Proportional quantities | Equivalent pair, favourable/total probability, and quantity-per-time normalization. |
| `ruleswitch` / `ruleinfer` / `rulefollow` / `stateupdate` | Apply or infer rules | Cue-selected comparison, learned function, named operation followed by command, and sequential signed state changes. |
| `errorcheck` / `counterexample` | Find a false case | Detect an existing rule violation versus produce a counterexample to a universal statement. |
| `beats` / `timeline` / `elapsed` | Reason about time | Compare adjacent intervals, sort absolute event times, and compute duration across a clock boundary. |
| `rhyme` / `homophone` / `analogy` / `categorize` | Word meaning or sound | Ending phonology, contextual homophone, relation transfer, and semantic class membership. |
| `conflict` / `position` / `override` / `brakes` | Resist a misleading cue | Follow a direction glyph, map physical slot, maintain a prior instruction, and inhibit all response. |
| `xor` / `implication` / `syllogism` | Logic | Exclusive truth count, conditional truth table, and transitive category entailment. |
| `balance` / `stateupdate` / `precedence` / `rulefollow` | Multi-step arithmetic | Inverse equation solving, cumulative state, mixed operator order, and operation-plus-instruction. |

The v0.6 fixed-pool note is superseded by the v0.7 seeded generators and the measured audit below. Finite cue systems remain finite by design; their constrained domains are named and justified in the entropy report. The historical v0.6 catalogue remains preserved in `docs/MISSION_CATALOGUE_v0.6.md`.

## The 50 v0.7 additions (82 → 132 total)

| ID | Category · interaction | Core mechanic | Example · answer rule | Procedural variables and domain | Difficulty scaling | Base ms | Distinction from similar missions |
|---|---|---|---|---|---|---:|---|
| `raysight` | attention · choice | Find the sole target with an unobstructed straight ray from the observer. | “WHICH MARK HAS A CLEAR LINE OF SIGHT?” · inspect aligned targets and blockers. | Seeded 7×7 grid; three targets on different rays; random blocker placement. | Fixed geometry; run tempo supplies pressure. | 4400 | Visibility along a ray; unlike `routeplan`, it does not search a path. |
| `knightmove` | attention · choice | Recognize legal chess-knight displacements. | “KNIGHT MOVE FROM C4.” · choose the sole legal shown destination. | Random 8×8 origin, all legal destinations, and nonlegal distractors. | Edge positions naturally show fewer legal moves. | 4400 | Discrete L-shaped move legality; unlike `orientation`, there is no accumulated heading. |
| `taxicab` | numbers · choice | Measure Manhattan distance between grid coordinates. | “A2 to F7” · add horizontal and vertical steps. | Two seeded A1–H8 coordinates and distance-adjacent numeric distractors. | Fixed coordinate span. | 4400 | Coordinate distance; unlike `area` or `perimeter`, it measures a route metric. |
| `foldpaper` | attention · choice | Map a hole through a paper fold over a centre line. | Explicit 6×6 A–F / 1–6 grid; reflect only the folded half. | Random axis and fold side; coordinates are defined left→right and top→bottom. | Protected for multistep spatial reasoning. | 5400 | Conditional coordinate reflection; distinct from whole-grid `mirror`. |
| `stackview` | attention · choice | Count rear cubes hidden by front stacks. | Front heights 2·5·1; Behind 4·2·6 · sum each column’s overlap. | Three front and three rear heights, each 1–6. | Fixed three-column view. | 4400 | Quantifies occluded volume; `occlusion` asks only which layer is behind two others. |
| `griddegree` | attention · choice | Count filled cells sharing an edge with a marked cell. | “COUNT THE MARKED CELL’S EDGE NEIGHBOURS.” · inspect four orthogonal neighbors. | Seeded 5×5 binary grid and interior marked cell. | Fixed local neighborhood. | 4400 | Local graph degree; unlike `components`, it does not count connected regions. |
| `routeplan` | attention · choice | Find a shortest open orthogonal path through a blocked grid. | “SHORTEST OPEN ROUTE.” · move up/down/left/right and count steps from S to G. | Seeded 5×5 obstacles; answer distribution is balanced across 8/10/12-step routes with deterministic fallbacks. | Protected multistep search. | 6000 | Global path search; distinct from line-of-sight `raysight` and distance-only `taxicab`. |
| `linecross` | attention · choice | Count interleaving chord pairs on a circle. | “HOW MANY CHORD PAIRS CROSS?” · count alternating endpoint order. | Four random disjoint chords over points A–H. | Fixed four-chord load. | 4400 | Geometric crossing relation; unlike `overlap`/`setdiff`, no set membership is computed. |
| `orientation` | attention · choice | Update a compass heading through left, right, and U-turn cues. | Start E; turn L · U · R · … · select the final heading. | Random initial direction and seeded turn sequence. | Sequence has 4–7 turns by level. | 4400 | State accumulation over directions; distinct from one-step `conflict` cue following. |
| `focusfilter` | attention · choice | Match an item on four simultaneous visual attributes. | “MATCH ALL FOUR FEATURES.” · find exact size, colour, fill, and shape. | Seeded target with three distractors, each violating a different feature subset. | Fixed four-feature conjunction. | 4400 | Conjunctive object search; unlike `server`, the answer depends on four properties, not a status word. |
| `gcd` | numbers · choice | Find the greatest common divisor. | “GREATEST COMMON DIVISOR.” · compute gcd of two visible values. | A shared factor 2–12 multiplied by two coprime multipliers, keeping factor search bounded. | Protected arithmetic reasoning. | 5600 | Largest shared factor; unlike `lcm`, seeks a common divisor. |
| `lcm` | numbers · choice | Find the least common multiple. | “LEAST COMMON MULTIPLE.” · choose the smallest shared multiple. | Two values from 2–18 with balanced nearby distractors. | Protected arithmetic reasoning. | 5600 | Shared multiple search; unlike `gcd`, moves upward to a common multiple. |
| `percent` | numbers · choice | Calculate a percentage of a quantity. | “WHAT IS 35% OF 840?” · multiply and divide by 100. | Percentage 5–95 by fives; base is 100–2000 by hundreds. | Integral values keep arithmetic exact. | 4400 | Part-of-whole scaling; distinct from probability and equivalent-ratio interpretation. |
| `square` | numbers · choice | Detect the unique perfect square among nearby values. | “WHICH VALUE IS A PERFECT SQUARE?” · identify n² among close non-squares. | Root is bounded to roughly 4–36 by level; distractors sit near the square instead of only above it. | Protected recognition/calculation time. | 5400 | Square recognition; unlike `prime`, it tests square structure rather than divisibility. |
| `calendar` | numbers · choice | Advance a weekday by a number of days. | “WHAT DAY AFTER 347 DAYS?” · reduce the offset modulo seven. | Any weekday and 1–999 days. | Fixed arithmetic span. | 4400 | Cyclic time-index arithmetic; distinct from absolute `timeline` sorting. |
| `clockangle` | numbers · choice | Compute the smaller angle between analogue clock hands. | “SMALLER CLOCK-HAND ANGLE?” · use the displayed hour and minute. | Hours 1–12; minutes are 00/10/20/30/40/50 to keep mental geometry tractable. | Protected calculation time. | 5600 | Hand geometry; unlike `elapsed`, no duration subtraction. |
| `area` | numbers · choice | Compute rectangular area. | “RECTANGLE AREA.” · multiply the visible side lengths. | Length 2–30 and width 2–24 with balanced nearby distractors. | Fixed bounded two-factor calculation. | 4400 | Interior measure; unlike `perimeter`, does not sum boundary lengths. |
| `combinations` | numbers · choice | Count unordered pairs under one of three concise constraints. | Count all pairs, pairs including the captain, or pairs excluding the captain. | 5–13 people; order never matters; the rule mode varies per seed. | Protected combinatorial reasoning. | 5600 | Pair-count combinatorics; distinct from partition existence, set cover, or assignment. |
| `unitconvert` | numbers · choice | Convert centimetres to millimetres. | “37 cm = ? mm” · multiply by ten. | Seeded whole-centimetre value 1–999. | Fixed exact scale conversion. | 4400 | Unit scaling; unlike `unitrate`, there is no time denominator. |
| `fractionadd` | numbers · choice | Add proper fractions with a shared denominator and reduce. | “3/17 + 5/17” · add numerators, then simplify. | Denominator 3–40; positive numerators partition the proper-fraction range. | Exact arithmetic; same denominator avoids unnecessary complexity. | 4400 | Rational addition; unlike `fraction`, it combines values rather than comparing them. |
| `signedcompare` | numbers · choice | Select the greatest signed value. | “LARGEST SIGNED NUMBER.” · compare the visible negative/positive set. | Three unique values within −99..99; some instances include a positive value. | Fixed bounded integers. | 4400 | Signed ordering; unlike `magnitude`, sign changes the number-line interpretation. |
| `weightedmean` | numbers · choice | Compute a weighted average from visible weights. | Three independent scores weighted 1/2/3; divide the weighted sum by six. | Instances regenerate until the mean is integral and is not itself one of the displayed scores. | Protected calculation time. | 5600 | Weighted aggregation without a middle-value shortcut; distinct from the unweighted `mean`. |
| `consecutive` | numbers · choice | Sum a run of consecutive integers. | “21 through 27” · sum the inclusive sequence. | First value 1–100; count 2–5 at level 1 and 2–9 thereafter. | Sequence length expands with level. | 4400 | Closed-form series sum; unlike `sequence`, it asks for an aggregate, not the next term. |
| `palindrome` | words · choice | Detect a word identical in reverse. | “WHICH WORD READS THE SAME BOTH WAYS?” · choose the palindrome. | Seeded palindrome plus shared-vocabulary distractors and candidate order. | Fixed short-word recognition. | 4400 | Symmetry of character order; unlike `reverse`, the player classifies rather than types a transform. |
| `wordladder` | words · choice | Find a valid one-letter bridge between two words. | “STONE → ? → SHONE” · each step changes one letter. | Precomputed valid five-letter triples and seeded non-bridging distractors. | Fixed two-step chain; longer 5800 ms base. | 5800 | Constrained path through a lexical graph; unlike `editdistance`, it asks for a specific intermediate word. |
| `alphabetize` | words · choice | Put four words in lexicographic order. | “PUT THE WORDS IN A–Z ORDER.” · select the full sorted string. | Four seeded shared-vocabulary words and randomized wrong orders. | Four-item ordering stays bounded. | 4400 | Lexical sorting; unlike `ascending`, it compares strings rather than numbers. |
| `homograph` | words · choice | Use sentence context to select a word’s intended sense. | “MEANING OF ‘BARK’ HERE.” · choose the sense supported by context. | Word, two meanings, sentence frames, and answer side from the shared homograph set. | Fixed short context. | 4400 | Same spelling, multiple meanings; distinct from sound-based `homophone`. |
| `phraseorder` | words · choice | Reconstruct a simple subject–verb–object sentence from tiles. | “BIRDS · WATCH · CLOUDS” · select subject, action, object order. | One seeded subject, verb, object and two role-order distractors. | Three-token syntax task. | 4400 | Syntactic role order; unlike `queueorder`, tokens have grammatical roles. |
| `editdistance` | words · choice | Compute minimum single-letter insertions, deletions, or substitutions. | A 5–8 letter source is altered at 1–3 distinct positions; return the minimum edit count. | Seeded source, mutation positions, and replacement letters keep distance bounded and human-solvable. | Protected multistep comparison. | 5800 | Minimum edit count; unlike `wordladder`, it does not require a fixed bridge word. |
| `letterpairs` | words · choice | Count adjacent letters that advance one alphabet position. | “Letters: ABQXY” · count AB and XY. | Seeded shared-vocabulary word of at least four letters. | Fixed short scan. | 4400 | Local alphabet adjacency; distinct from whole-word `alphabetize`. |
| `acronym` | words · choice | Read category initials in their displayed order. | “Categories: ANIMALS · OBJECTS · …” · concatenate initials. | Four seeded categories with unique initials and randomized distractors. | Four-item sequence. | 4400 | Initial extraction; unlike `initial`, it processes an ordered category list. |
| `subsequence` | words · choice | Recognize a string whose characters occur in order within a source. | “Source: PLANETS” · choose an ordered, possibly gapped subsequence. | Seeded word of length ≥6; three sampled source positions and non-subsequence distractors. | Fixed three-letter candidate. | 4400 | Order-preserving deletion; unlike `omit`, it searches rather than constructs by deletion. |
| `letterpattern` | words · choice | Match repeated-character positions while ignoring letter identity. | “Pattern source: ABACA” · select the same equality pattern. | Five-letter source over eight symbols, forced repetition, and distinct pattern distractors. | Fixed five-character pattern. | 4400 | Abstract equality structure; unlike `anagram`, character identity and counts are not the rule. |
| `codebreak` | attention · choice | Decode a symbol sequence through a visible substitution key. | “Key ▲=3 · ●=7 … Code ▲●■” · translate in order. | Four of five symbols, four unique digits, three-symbol code, and seeded wrong codes. | Three-symbol decode; longer 5400 ms base. | 5400 | Keyed symbolic substitution; unlike `caesar`, mappings are arbitrary per instance. |
| `assignment` | attention · choice | Infer a unique one-to-one person–job assignment from exclusions. | “A, B, C get one each. Clues: A ≠ RED …” · identify who gets the target job. | Three people and jobs; generated exclusion set is retained only when it yields one solution. | Three-by-three search; longer 5600 ms base. | 5600 | Constraint satisfaction; unlike `ordering`, constraints map two different entity sets. |
| `decisiontree` | attention · choice | Follow parity-selected arithmetic branches, then compare to a threshold. | “Start 42 · If even add 7; if odd subtract 4 · Is result at least 51?” · choose YES/NO. | Seeded start, two branch operations, and threshold; equality is unambiguous. | Protected two-branch calculation. | 5600 | Conditional computation; unlike `ruleinfer`, the rule is shown rather than learned. |
| `causalorder` | attention · choice | Identify a direct incoming cause in a directed event graph. | “WHICH EVENT DIRECTLY CAUSES D?” · find the edge ending at D. | Six shuffled labels and four seeded directed links. | Fixed local edge lookup. | 4400 | Direct causal predecessor; unlike `reachability`, transitive paths do not count. |
| `setcover` | attention · choice | Find the fewest displayed sets covering a universe. | “FEWEST SETS THAT COVER EVERY ITEM?” · minimize the selected set count. | Universe A–E and four seeded 2–3 item subsets with deterministic forced coverage. | Protected four-set subset search. | 6200 | Minimum cover optimization; unlike `overlap`/`setdiff`, it selects a family of sets. |
| `scheduling` | attention · choice | Compute critical-path completion when two jobs run in parallel before two serial jobs. | “A (4) and B (6) run together; then C (2); then D (3)” · max(A,B)+C+D. | Four seeded durations 1–7. | Four-task dependency graph; longer 5600 ms base. | 5600 | Dependency-aware completion time; unlike `elapsed`, it is not clock arithmetic. |
| `stateflow` | memory · choice | Run a finite-state machine through a visible transition table and input string. | “Start A · Inputs XYX” · apply each transition in order. | Two shuffled three-state transition maps, start state, three input symbols. | Protected three-transition trace. | 6200 | Symbol-driven state transition; unlike `stateupdate`, transitions are table lookups. |
| `reachability` | attention · choice | Decide whether a directed graph has a path from start to goal. | “CAN START REACH GOAL?” · follow arrows forward from A to F. | Seeded six-node graph regenerated to 3–8 links with approximately balanced reachable/unreachable outcomes. | Bounded graph search. | 5200 | Any-length path existence; unlike `causalorder`, intermediate nodes may matter. |
| `dualtrack` | memory · choice | Track and report two independent counts from parallel streams. | “Count evens. Shapes: … Count ●” · report numeric and symbol totals in order. | Eight digits 1–9 and eight seeded shapes. | Fixed 16-item divided-attention load; 5000 ms base. | 5000 | Concurrent independent tallies; unlike `crossmonitor`, streams use separate criteria. |
| `visualtracking` | memory · choice | Track a labelled object through sequential slot swaps. | “TRACK C THROUGH THE SWAPS.” · report its final slot. | Four unique objects, target chosen randomly, four pairwise swaps. | Four updates; 5200 ms base. | 5200 | Object identity tracking; unlike `position`, labels move while slots stay fixed. |
| `suppressrepeat` | reflex · choice | Invert a direction unless the current cue repeats, in which case withhold. | Previous LEFT · Current LEFT · choose HOLD. | All four previous/current LEFT/RIGHT pairs are equally available. | Inherent four-state cue space; 4400 ms. | 4400 | Rule-based response suppression; unlike `brakes`, a nonrepeated cue requires an active opposite response. |
| `stopsignal` | reflex · choice | Cancel a prepared direction only if a stop cue arrives before its deadline. | GO RIGHT · deadline 700 ms · STOP at 420 ms · choose HOLD. | Direction, deadline 400–1000 ms, stop time 100–1200 ms. | Timing relation drives response; 4200 ms base. | 4200 | Temporal cancellation race; unlike `reaction`, it can require cancelling an already specified response. |
| `taskshift` | attention · choice | Switch a row’s classification rule using its visible cue. | Compact C=<colour> / S=<shape> rule followed by four cued rows; count matches. | Four rows with seeded C/S cues, colours, shapes, and rule targets. | Protected four-rule scan. | 6200 | Repeated task-set switching; unlike `ruleswitch`, the cue can change on each row. |
| `crossmonitor` | attention · choice | Count aligned numeric pairs where the left value exceeds the right. | “Paired streams: 7/3 · 1/9 …” · count qualifying columns. | Seven independent pairs of values 1–9. | Seven comparisons; 5000 ms base. | 5000 | Pairwise relational monitoring; unlike `dualtrack`, it does not maintain separate feature counts. |
| `keymap` | attention · choice | Use a randomized key-to-direction control map. | “WHICH KEY MOVES NORTH?” · read the displayed control map. | Four directions mapped to four shuffled keys sampled from 1–6. | Four-key mapping. | 4400 | Arbitrary symbol mapping; unlike `position`, printed key identity—not physical button location—matters. |
| `partition` | numbers · choice | Decide whether all values can split into two equal-sum groups. | “CAN FOUR VALUES SPLIT INTO EQUAL SUMS?” · use every value once. | Four values 1–15; generator targets balanced YES/NO instances. | Protected four-item subset search. | 5600 | Equal-sum partition; unlike `combinations`, the question is existence, not pair count. |
| `interval` | memory · choice | Classify two closed numeric intervals as overlapping, touching, or separate. | “A [2, 7] · B [7, 11]” · endpoints meeting means TOUCH. | Relation is selected first so OVERLAP/TOUCH/SEPARATE are balanced, then endpoints are generated to match. | Fixed two-interval comparison. | 4400 | Endpoint topology; unlike `difference` or `elapsed`, it classifies interval relations. |

## Randomization contract for the original 82

Each ID below joins by ID to the original inventory tables above, which provide its category, input, core mechanic, example/answer rule, timing, and distinction. The fields here record the visible seeded question domain and level behavior used in ruleset 7.

| ID | Visible procedural variables and domain | Difficulty behavior |
|---|---|---|
| `magnitude` | Three values drawn from separated ranges 3–15, 20–42, 51–90; asks seeded minimum or maximum. | Fixed operand ranges; global level pace only. |
| `odd` | One of five robust filled/hollow glyph pairs; intruder position 1–9; either fill state may be the singleton. | Fixed 3×3 array; global pace only. |
| `opposite` | Seeded word and orientation from the shared antonym pairs. | Fixed lexical lookup; global pace only. |
| `omit` | Shared-vocabulary word length 5–10; removes every copy of a seeded letter. | Longer words have greater typing load; deadline contracts by level. |
| `longword` | Three seeded words length 3–10; asks longest or shortest. | Fixed three candidates; global pace only. |
| `math` | Two seeded factors; operand maxima expand with level and product follows. | Larger factors by level; base time includes a calculation allowance. |
| `brakes` | Bait label from BONUS/DEPLOY/TRUST/FIX and a two-digit lure. | Wait duration shortens by level. |
| `reaction` | Four safe wait-for-GO phrasings and seeded cue delay 650–1100 ms. | Cue window is level-adjusted while preserving the visible reaction window. |
| `remember` | Three-digit code 120–989; memory schedule chooses ordinal 2–12 and recall gap 2–7. | Fixed encoding item; placement/gap vary by seed. |
| `recall` | Actual stored code plus two seeded three-digit distractors. | No later-memory fallback; consumed once. |
| `override` | Bait wording from four labels and seeded 850–1350 ms cue delay. | Wait duration follows the cue; renderer must confirm bait visibility. |
| `parity` | Random even/odd target and two values of the other parity from bounded ranges. | Fixed three-choice classification; global pace only. |
| `server` | Three services sampled from eight; fire marker position randomized. | Fixed three-item search. |
| `position` | Target slot 1–4 and independently shuffled position labels. | Four physical positions stay constant. |
| `lettercount` | Shared-vocabulary word length 4–11 and a seeded letter occurring in it. | Prompt word/target change; added base-time allowance. |
| `second` | Four values from separated ranges, randomly ordered; select rank two. | Fixed four-item sort. |
| `match` | Seeded words length 4–8; one exact pair and two one-character near-matches. | String length varies within that bound. |
| `avoid` | Forbidden integer 10–999; sole safe value is offset by 1–30; bait duplicates. | Fixed response rule; large visible numeric domain. |
| `sequence` | Start 2–12 and step 2–7; four-term arithmetic progression. | Fixed three shown terms and one continuation. |
| `vowels` | Shared-vocabulary word length 4–10; counts A/E/I/O/U. | Word content and count vary; fixed scan length bound. |
| `reverse` | Shared-vocabulary word length 5–10; types exact reverse. | Longer words; typing allowance contracts by level. |
| `pairtotal` | Target 11–99 and seeded positive addend split. | Exact two-addend construction. |
| `middle` | Odd-length shared word 3–11; distractor letters vary. | Word length varies within bound. |
| `notcontain` | Seeded letter, one word without it, two words containing it. | Requires two available traps; no rule change. |
| `counter` | Exact tap count 2–12 and one of four concise send instructions. | Tap deadline shortens by level. |
| `closest` | Target 20–999 and a correct value offset +1–4; distractors at −7 and +11. | Fixed three-value distance comparison. |
| `ascending` | First integer 1–300 and two increments 1–8. | Numeric spacing varies; three-item sort. |
| `initial` | Word length 3–10; target is its first letter; two nonmatching words. | Word examples vary from shared vocabulary. |
| `lastletter` | Word length 3–10; target is its last letter; two nonmatching words. | Word examples vary from shared vocabulary. |
| `difference` | Gap 1–40 and base 10–999; answer pair has that exact difference. | Large numeric pair domain. |
| `duplicate` | Repeated digit 0–9 in a four-digit code; two seeded all-distinct codes and order. | Four-digit visual scan. |
| `alphabet` | Letter start and step 1–4 for a four-term sequence. | Valid alphabet bounds prevent wraparound. |
| `mirror` | Nine seeded binary cells; horizontally reflected answer plus distinct distractors. | Grid remains 3×3. |
| `rotate` | Four seeded two-digit tiles in a 2×2 grid; clockwise answer. | Fixed quarter-turn. |
| `loopcount` | Four seeded digits from loop-counting glyphs; counts enclosed holes. | Regenerates until at least one loop appears. |
| `overlap` | Two shuffled symbol sets with two shared members and distinct exclusive members. | Fixed four-symbol sets. |
| `occlusion` | Three of A–F in randomized front-to-back order. | Layer order varies; three objects. |
| `changegrid` | Five-cell strings over A–D and one seeded replacement position. | Fixed five-cell comparison. |
| `pathtrace` | Seeded 4×4 start and four legal compass moves that stay in bounds. | Four move instructions. |
| `components` | 4×4 filled/empty grid; regenerates until 2–4 edge-connected components. | Fixed grid; count is guaranteed within answer range. |
| `tilefit` | Three distinct A–F symbols in a cyclic 3×3 shift pattern. | Fixed grid size; symbol identities vary. |
| `cubeface` | Six shuffled face labels A–F in a fixed cross-shaped cube net. | Face labels and displayed distractors vary. |
| `conflict` | Word cue and arrow selected independently from four directions. | 16 direction pairings; arrow is always authoritative. |
| `ruleswitch` | Cue A/B selects low/high; two values are sampled from disjoint ranges. | Cue and values vary; two-way rule. |
| `ruleinfer` | Multiplier 2–4, start 2–7, three examples and one query. | Rule remains constant within the question. |
| `errorcheck` | Even/odd rule, two valid values, one invalid value, shuffled row order. | Numeric magnitude varies within safe range. |
| `rulefollow` | Two values 1–9 and SUM/PRODUCT cue; then add one. | Cue changes the displayed operation and result. |
| `queueorder` | Four shuffled labels; swap ends, then move C to the front. | Fixed two-step manipulation, randomized start order. |
| `stateupdate` | Start 2–8, first increment 2–5, second signed change 2–4. | Small bounded totals and randomized sign. |
| `nback` | Five A–D symbols; the requested two-back item is generated independently and the final symbol is forced different to prevent answer leakage. | Sequence identities vary; lag remains two. |
| `timeline` | Three events with seeded elapsed-minute values, then randomized display order. | Fixed three-event median without clock-format ambiguity. |
| `elapsed` | Seeded start time and duration 20–180 minutes; wraps across midnight. | Exact minute arithmetic; same-day/midnight case varies. |
| `beats` | Three seeded intervals in separated ranges; displays cumulative beat times. | Fixed four timestamp scan. |
| `prime` | Prime 11–199 mixed with two nearby composite values. | Candidate ordering and local composites vary; no smallest-value shortcut. |
| `factorpairs` | Target integer 30–999; asks unique positive factor-pair count. | Target domain widened; exact integer divisor scan. |
| `modthree` | Integer 111–899; asks remainder modulo three. | Broad numeric domain; three possible remainders. |
| `fraction` | Three proper fractions with denominators 2–20 and distinct rational values. | Fraction values/order vary; exactly one largest. |
| `ratio` | Base numerator/denominator 2–19 and scale 2–12. | Exact integer equivalent; alternatives are non-equivalent. |
| `estimate` | Integer 101–899 adjusted away from tie-to-five; nearest ten. | Broad rounding domain; no ambiguous midpoint. |
| `binary` | Seeded bit string; 6 bits at levels 1–2 and 8 bits at levels 3–4. | Bit width expands by level. |
| `balance` | X 2–12, offset 2–9, and addition/subtraction equation. | Inverse-operation answer stays exact and positive/nearby. |
| `precedence` | Seeded a + b×c with a 2–6, b 2–5, c 2–4. | Small exact integer arithmetic. |
| `unitrate` | Rate 3–12 km/h and duration 2–5 hours; shows the product distance. | Exact division; seeded rate/time combinations. |
| `chance` | Red and blue counts independently 1–50, forced unequal. | Probability numerator/total and distractors vary across the full count domain. |
| `roman` | Roman numeral value 1–399. | Uses I,V,X,L,C including subtractive pairs; value is bounded. |
| `mean` | Three values around seeded base 10–99 with offsets summing to zero. | Keeps an exact integer mean while varying all shown values. |
| `perimeter` | Rectangle sides length 2–12, width 2–9. | Exact bounded two-side calculation. |
| `anagram` | Shared word length 5–6 with repeated-letter patterns allowed; seeded scramble and distractors. | Word identity and scramble order vary. |
| `weave` | Two seeded four-character strings from A–F and 1–6. | Interleaves two independent sources. |
| `rhyme` | Target/answer from shared rhyme families; nonfamily vocabulary distractors. | Target and correct rhyme vary by family. |
| `analogy` | Seeded row from shared semantic relation table. | Relationship and all three displayed words vary. |
| `compound` | Seeded valid word-part pair from shared compound table. | Parts, answer, and wrong compounds vary. |
| `caesar` | Shared word length 3–8 and alphabet shift 1–7. | Word and shift vary; wrong strings are altered positions. |
| `homophone` | Seeded sentence and sound-alike answer/distractors from shared table. | Sentence, target sound, and spelling vary. |
| `categorize` | Seeded category and item from shared semantic groups. | Categories and objects vary; distractors come from other groups. |
| `xor` | Two seeded entity names and two seeded Boolean values. | All four truth assignments and visible names vary. |
| `implication` | Two seeded entity names and P/Q truth values. | Conditional state and named propositions vary. |
| `syllogism` | Seeded member, middle and second category, with linked/unlinked relation. | Chain entailment or non-entailment is selected per seed. |
| `ordering` | Four shuffled labels with three randomized partial-order constraints. | Label permutation changes; one forced-last result. |
| `setdiff` | Seeded A–H universe partition with shared and exclusive symbols; output order is explicitly irrelevant. | Set members vary; A\B remains directional while reversed-equivalent answers are not treated as distinct. |
| `counterexample` | Odd value generated from 101–999. | Any odd witness in the bounded range refutes the claim. |
| `sieve` | Target is 6n+3 for n=1–300, plus an even multiple and nonmultiple. | Target range 9–1803; unique odd multiple of three. |

## Question entropy

Audit: `scripts/question-entropy.mjs`, receipt `qa/v07-question-entropy.json`. Each of the 132 templates was generated for 100 deterministic seeds. A signature includes template ID, title, hint, visible option labels in displayed order, and visible memory value. The audit passed the declared per-family thresholds.

| Group | Count | Minimum | Median | Mean | Maximum | Target |
|---|---:|---:|---:|---:|---:|---:|
| All templates | 132 | 4 | 100 | 93.41 | 100 | Family-specific |
| Numeric/procedural | 39 | 80 | 100 | 98.03 | 100 | ≥80 |
| Grid/state/symbolic | 61 | 62 | 100 | 95.77 | 100 | ≥60 |
| Vocabulary/semantic | 27 | 35 | 100 | 93.70 | 100 | ≥30 |
| Constrained reflex | 5 | 4 | 4 | 27.00 | 84 | ≥4 |

Every template below 30 signatures per 100 seeds:

| ID | Unique / 100 | Reason and fairness boundary |
|---|---:|---|
| `reaction` | 4 | The response is necessarily “wait, then press on GO”; four safe cue phrasings vary while the cue delay remains 650–1100 ms. The core response state is intentionally finite. |
| `override` | 4 | The invariant is to maintain the first rule and ignore a later bait instruction; four bait labels vary, with seeded cue delay. Changing the rule would undermine clarity. |
| `suppressrepeat` | 4 | Two binary cues create exactly four meaningful previous/current states. Each state changes whether the player holds or presses the opposite direction; additional randomization would be decorative. |

No ordinary mission is fixed. No mission is below 20 other than the three documented constrained-response tasks above. Numeric/procedural missions have minimum 80, median 100, mean 98.03, and maximum 100. No numeric mission is below 30.

The 1,000-seed opening audit reached all 16 warm-start templates:

| First mission | Seeds | First mission | Seeds |
|---|---:|---|---:|
| `prime` | 85 | `lastletter` | 64 |
| `sequence` | 65 | `magnitude` | 74 |
| `opposite` | 63 | `vowels` | 68 |
| `position` | 68 | `alphabet` | 50 |
| `estimate` | 61 | `initial` | 65 |
| `duplicate` | 45 | `closest` | 61 |
| `parity` | 62 | `ascending` | 55 |
| `odd` | 58 | `categorize` | 56 |

## Additional similarity review for ruleset 7

The table above documents each new mechanic’s nearest distinction. These clusters received an additional cross-inventory review; each pair changes the operation the player must perform, not just its examples or labels.

| Cluster | Different cognitive operation retained |
|---|---|
| `raysight` / `routeplan` / `taxicab` | Ray visibility tests alignment and blockers; route planning searches a path around obstacles; taxicab computes coordinate distance without obstacles. |
| `mirror` / `foldpaper` / `rotate` / `cubeface` | Reflect every row; reflect only the folded half; permute a 2×2 tile under rotation; infer opposite faces from a 3D net. |
| `griddegree` / `components` / `crossmonitor` | Count local edge neighbors; count whole connected components; count ordered numeric comparisons across paired columns. |
| `stackview` / `occlusion` / `server` / `focusfilter` | Sum hidden cube depth; infer a back layer; locate a status-labelled service; match a conjunction of four object attributes. |
| `linecross` / `overlap` / `setdiff` / `setcover` | Count alternating chord endpoints; intersect two sets; subtract B from A; minimize a family of sets covering a universe. |
| `knightmove` / `orientation` / `keymap` / `position` / `visualtracking` | Validate a chess displacement; accumulate turns; decode a control mapping; use a physical button slot; track identity through swaps. |
| `gcd` / `lcm` / `fraction` / `fractionadd` / `ratio` / `chance` / `unitrate` | Greatest divisor; least multiple; compare rational magnitude; add fractions; test proportional equivalence; interpret a sample-space probability; normalize quantity by time. |
| `area` / `perimeter` / `taxicab` / `interval` | Interior measure; boundary length; grid-path metric; endpoint relation of two intervals. |
| `mean` / `weightedmean` / `combinations` / `partition` / `setcover` / `assignment` | Unweighted average; weighted average; count unordered pairs; decide equal-sum partition existence; minimum set coverage; infer a unique bipartite assignment. |
| `sequence` / `consecutive` / `ruleinfer` / `decisiontree` / `stateflow` / `ordering` | Continue a numeric pattern; aggregate an integer run; infer a mapping; execute a shown conditional branch; run a state transition table; derive what partial-order constraints force. |
| `rulefollow` / `ruleswitch` / `taskshift` / `conflict` / `stopsignal` / `brakes` / `override` / `suppressrepeat` | Apply a named operation; select by one cue; switch a row-wise rule; prioritize one conflicting cue; cancel a response by deadline; wait without responding; maintain a prior instruction; suppress repeated cues conditionally. |
| `wordladder` / `editdistance` / `subsequence` / `letterpattern` / `weave` / `anagram` / `reverse` | Find a one-edit bridge; compute minimum edit count; test order-preserving inclusion; compare equality-pattern structure; interleave sources; permute a letter multiset; reverse an entire string. |
| `homograph` / `homophone` / `rhyme` / `analogy` / `categorize` / `phraseorder` | Resolve a spelling by context; choose sound-alike spelling by meaning; match ending sound; transfer a relation; classify semantic membership; restore grammatical roles. |
| `timeline` / `elapsed` / `beats` / `calendar` / `scheduling` / `stopsignal` | Sort event times; calculate elapsed minutes; compare inter-beat gaps; advance a weekday; compute dependency completion; compare stop time to response deadline. |

## Qualification checkpoint

- Inventory: **132 total**, comprising **82 v0.6 baseline** and **50 v0.7 additions**.
- No-replacement tests passed for Adaptive and Challenge; each template is consumed once and exhaustion is explicit. Practice’s explicit practice-length limit remains separate from deck exhaustion.
- Memory schedule selects a seed-bound remember position and a 2–7 mission recall gap; recall uses the stored generated code.
- Full Node suite: **88/88 passed**. Added-mechanic visible-contract oracles: **50,000 cases**; baseline novel oracles: **50,000 cases**; all generators: **132,000 cases**. Final hardening coverage includes immediate streaming-body rejection, bounded leaderboard-store admission, player-name/score separation, and locale-independent alphabetization.
- The final question-entropy receipt passes every family threshold: minimum **4**, median **100**, mean **93.41**, maximum **100** unique visible signatures per 100 seeds. Browser qualification is recorded under the `qa/v07-*` receipts.
- The release artifact is **103,057 raw / 38,360 level-9 gzip bytes**, below the unchanged strict limits of **126,976 raw / 39,936 gzip bytes**. The bounded static audit passes and the artifact SHA-256 is `b3e5934fadb5cd4a72396f309b399b0ca75b5252bcd55a87322e85037dcee1b5`.
