# Voice-over

> **Status after the 74-screen rebuild:** `tools/vo_script.json` now holds the 120 lines of the new lesson. Each one has a spoken form that follows the rules below. The 18 lines that match an earlier recording keep their clip id and still play. The 102 new lines (`vo162`–`vo263`) type silently until they are generated in the studio and built with `node tools/vo_build.mjs`. That run also deletes the old clips that no line uses any more. The figures in the rest of this document describe the earlier 29-screen version.

Every line the narration bar can show is voiced: **161 lines, 11.5 minutes, 2.7 MB** in `assets/vo/`. That covers screen titles, steps, prompts, hints, wrong- and right-answer feedback, proof steps and the recap. Each clip is looked up by the exact text on screen, and the line types word by word at the voice's pace.

## How the clips were made

| Setting | Value |
|---|---|
| Studio | [Ai Wala Human By Aamir](https://ai-wala-human-by-aamir-809572708022.asia-southeast1.run.app/), tab *Batch Generation* |
| Language | Hindi |
| Voice | Female Teacher (Standard), a clear North Indian accent |
| Studio download | MP3, 24 kHz mono, 128 kbps |
| Shipped format | Ogg Opus, 32 kbps, mono, 48 kHz (about a quarter of the MP3 size) |
| Clip ids | `vo001` … `vo161`, in the order a learner first hears them |

**Why Hindi script for English lines.** Before speaking, the studio rewrites each line in the chosen language's script. English written in Devanagari ("Move ray O B." → "मूव रे ओ बी.") is spoken as English with an Indian accent, and the words stay English. Choose *English* instead for a neutral accent.

**Each row makes two requests.** First `gemini-3-flash-preview` rewrites the text in Devanagari, then `gemini-3.1-flash-tts-preview` speaks it.

**Rate limit.** The studio's proxy allows **100 requests per 15 minutes per IP**, which is about 48 lines per window. Over the limit it returns `429 Too many requests from this IP`. The headers `ratelimit-remaining` and `ratelimit-reset` say where you stand. The 161 lines took four windows.

## Spoken-form rules

The voice reads exactly what it is given, so `tools/vo_script.json` holds a **spoken** form beside each **line as shown**. The screen text never changes.

- Symbols are written as words: `∠1` → "angle one", `∠AOB` → "angle A O B", `°` → "degrees", `+` → "plus", `=` → "equals", `→` → "means".
- **Numbers are English words** ("one hundred and eighty"). If you write a digit, the script step sometimes turns it into a Hindi number word (180 → एक सौ अस्सी), and the voice then says it in Hindi.
- Point names are spaced so each letter is read: `OA` → "O A", `CD` → "C D".
- Dashes become sentence breaks, and commas add short pauses where a formula needs grouping ("So, angle one plus angle two, equals angle two plus angle three.").

88 of the 161 lines have a spoken form that differs from the text shown. The table below lists them all.

## Checks run on every clip

1. **Devanagari check.** The script-step output for every line is compared with its spoken form. Each line is flagged if it contains:
   - a Hindi number word (एक … सौ) or a digit;
   - a common Hindi word, meaning the English was translated rather than transliterated (कोण, रेखा, और …).

   The final result is 0 flagged.
2. **Pace check.** Characters of the spoken form ÷ seconds must fall within 6–22. One clip failed: vo017 "Move ray O B." read haltingly (3.3 s of speech with a 0.65 s pause). Its spoken form became "Move the ray O B." and it was regenerated, which brought it down to 2.38 s.
3. **Format check.** Every Ogg file decodes in Chrome, reports a length within 10 ms of the measured one, and plays (`currentTime` advances).
4. **In-game check.** Narration played on real screens. Each clip plays to its end, the words shown match the clip, and the last word appears at 60–85% of the clip (the tail is silence).

## How the game uses the clips

- `js/vo_lines.js` (generated, do not edit) maps the **exact plain line** to `[clip id, seconds]`.
- `js/core/voice.js` is the player. It uses one reused `<audio>` element, which is unlocked on the *Begin* tap so tablets will play it later. All clips are prefetched one at a time after Begin.
- `ctx.say()` in `js/core/engine.js` is the single choke point. It shows the line and speaks it, and the screen's timeline waits for the voice to finish. The line appears **word by word at `max(16, (seconds − 0.35) × 1000 / characters)` ms per character**, so each word lands as it is said.
- A new line stops the previous voice, and a screen change stops it too. If a line is already playing, asking for it again joins that clip instead of restarting it, and a line that was just said is not repeated.
- Sound effects duck under the voice.
- **Safety.** A stalled clip times out after its length plus about 1.4 s. If `play()` is rejected or a file is missing, the line types silently at reading pace. The lesson never waits on audio.
- **Turning it off.** `?vo=0` turns the narration off. Browsers without Ogg Opus (`canPlayType('audio/ogg; codecs="opus"')` is empty, as on older Safari and iPadOS) type the lines silently. `?speed=N` sets the playback rate (0.5–4) for testing.
- On screens whose first line tells the learner to move a ray, that line is held until the figure is built (`holdTitle`), so the words and the ray demo start together.

## Remaking a line

1. **Edit** the line's `spoken` text in `tools/vo_script.json`, keeping its `id` and `line`. For a new line, add an entry whose `line` is exactly what the screen shows.
2. **Generate** it in the studio. Upload an `.xlsx` with the columns `filename` (the id) and `text` (the spoken form), choose Hindi, MP3 and *Female Teacher (Standard)*, and press `GENERATE (N)`, then `DOWNLOAD ALL (.ZIP)`. Keep each batch to 48 rows or fewer, and wait 15 minutes between batches.
3. **Build** it into the game:

   ```
   node tools/vo_build.mjs voiceovers_batch.zip
   ```

   The build converts the clips, keeps the existing ones, regenerates `js/vo_lines.js`, lists any line still without a clip, and removes clips that no line uses. It is safe to run again, and it needs Node 22+ and Google Chrome. Chrome does the MP3 decode and the Opus encode with WebCodecs, and the tool writes the Ogg pages itself (RFC 7845). No ffmpeg or Python is required. Set `CHROME=` if Chrome is not at the default Windows path.

## All clips

| Clip | Line as shown | Spoken as (`=` if the same) | Devanagari sent to the voice | Seconds |
|---|---|---|---|---|
| vo001 | Geometry starts with a few simple objects. | = | ज्योमेट्री स्टार्ट्स विद अ फ्यू सिंपल ऑब्जेक्ट्स. | 3.77 |
| vo002 | A point marks an exact position. | = | ए पॉइंट मार्क्स एन एग्जैक्ट पोजीशन। | 3.34 |
| vo003 | Two endpoints make a line segment. | = | टू एंडपॉइंट्स मेक ए लाइन सेगमेंट। | 3.22 |
| vo004 | A ray starts at one point and goes on in one direction. | = | ए रे स्टार्ट्स एट वन पॉइंट एंड गोज़ ऑन इन वन डायरेक्शन। | 4.58 |
| vo005 | A line goes on in both directions. | = | ए लाइन गोज़ ऑन इन बोथ डायरेक्शन्स. | 3.26 |
| vo006 | Match each name to its drawing. | = | मैच ईच नेम टू इट्स ड्रॉइंग। | 2.81 |
| vo007 | A point has no length — it only marks a position. | A point has no length. It only marks a position. | ए पॉइंट हैज नो लेंथ। इट ओनली मार्क्स ए पोजीशन। | 4.85 |
| vo008 | A line segment stops at two endpoints. | = | ए लाइन सेगमेंट स्टॉप्स एट टू एंडपॉइंट्स। | 3.65 |
| vo009 | A ray has exactly one endpoint and one arrow. | = | ए रे हैज़ एक्ज़ैक्टली वन एंडपॉइंट एंड वन एरो। | 4.54 |
| vo010 | A line has no endpoints — it goes on both ways. | A line has no endpoints. It goes on both ways. | ए लाइन हैज़ नो एंडपॉइंट्स। इट गोज ऑन बोथ वेज़। | 4.78 |
| vo011 | All matched — endpoints and arrows tell them apart. | All matched! Endpoints and arrows tell them apart. | ऑल मैच्ड! एंडप्वॉइंट्स एंड एरोज टेल देम अपार्ट। | 4.73 |
| vo012 | Now give this ray a partner. | = | नाउ गिव दिस रे अ पार्टनर। | 2.81 |
| vo013 | Two rays with one common endpoint form an angle. | = | टू रेज़ विद वन कॉमन एंडपॉइंट फॉर्म एन एंगल। | 4.49 |
| vo014 | The two rays are the arms. | = | द टू रेज़ आर द आर्म्स। | 2.66 |
| vo015 | Their common endpoint, O, is the vertex. | = | देयर कॉमन एंडपॉइंट, ओ, इज द वरटेक्स. | 4.01 |
| vo016 | Name it with the vertex in the middle: ∠AOB. | Name it with the vertex in the middle: angle A, O, B. | नेम इट विद द वर्टेक्स इन द मिडिल एंगल ए ओ बी | 5.86 |
| vo017 | Move ray OB. | Move the ray O B. | मूव द रे ओ बी. | 2.38 |
| vo018 | Tap the two arms. | = | टैप द टू आर्म्स | 2.30 |
| vo019 | That is the vertex. Tap the two arms. | = | दैट इज द वर्टेक्स। टैप द टू आर्म्स। | 3.70 |
| vo020 | Now tap the vertex. | = | नाउ टैप द वरटेक्स. | 2.30 |
| vo021 | That is an arm. Tap the shared endpoint. | = | दैट इज़ एन आर्म। टैप द शेयर्ड एंडपॉइंट। | 4.34 |
| vo022 | OA and OB are the arms; O is the vertex. | O A and O B are the arms. O is the vertex. | ओ ए एंड ओ बी आर द आर्म्स। ओ इज द वर्टेक्स। | 4.78 |
| vo023 | Angles are measured in degrees. | = | एंगल्स आर मेजर्ड इन डिग्रीज़। | 2.74 |
| vo024 | Drag the arm. Find every type of angle. | = | ड्रैग द आर्म। फाइंड एवरी टाइप ऑफ एंगल। | 4.61 |
| vo025 | The angle type depends on how far the ray turns. | = | द एंगल टाइप डिपेंड्स ऑन हाउ फार द रे टर्न्स। | 4.01 |
| vo026 | Make an obtuse angle. | = | मेक एन ऑब्ट्यूस एंगल। | 2.42 |
| vo027 | Look at the size of the angle again. | = | लुक एट द साइज ऑफ द एंगल अगेन। | 2.81 |
| vo028 | That is exactly a right angle. Open it wider. | = | दैट इज़ इग्ज़ैक्टली अ राइट एंगल। ओपन इट वाइडर। | 4.06 |
| vo029 | Obtuse lies between the two dashed guides. | = | ऑब्ट्यूस लाइज़ बिटवीन द टू डैश्ड गाइड्स। | 3.74 |
| vo030 | Too wide — obtuse is less than a straight angle. | Too wide. Obtuse is less than a straight angle. | टू वाइड। ऑब्ट्यूस इज लेस दैन अ स्ट्रेट एंगल। | 4.46 |
| vo031 | Yes — more than 90°, less than 180°. | Yes! More than ninety degrees, less than one hundred and eighty degrees. | येस! मोर दैन नाइन्टी डिग्रीज़, लेस दैन वन हंड्रेड एंड एटी डिग्रीज़। | 5.50 |
| vo032 | What happens if we keep turning? | = | वॉट हैपन्स इफ़ वी कीप टर्निंग? | 2.66 |
| vo033 | Keep turning — past a straight angle. | Keep turning, past a straight angle. | कीप टर्निंग, पास्ट अ स्ट्रेट एंगल। | 2.93 |
| vo034 | Now make a reflex angle. | = | नाउ मेक अ रिफ्लेक्स एंगल। | 2.90 |
| vo035 | That is a straight angle. Keep turning. | = | दैट इज़ अ स्ट्रेट एंगल। कीप टर्निंग। | 3.41 |
| vo036 | Look at the size again. Reflex is more than a straight angle. | = | लुक एट द साइज़ अगेन. रिफ्लेक्स इज़ मोर दैन अ स्ट्रेट एंगल. | 4.73 |
| vo037 | Exactly — more than 180°, less than a full turn. | Exactly! More than one hundred and eighty degrees, less than a full turn. | इक्ज़ैक्टली! मोर दैन वन हंड्रेड एंड एटी डिग्रीज़, लेस दैन अ फुल टर्न। | 4.78 |
| vo038 | Find each pair's total. | = | फाइंड ईच पेयर्स टोटल। | 2.62 |
| vo039 | Add each pair and choose its total. | = | ऐड ईच पेयर एंड चूज इट्स टोटल। | 3.05 |
| vo040 | 180° is a straight angle. Add 35° and 55° again. | One hundred and eighty degrees is a straight angle. Add thirty-five degrees and fifty-five degrees again. | वन हंड्रेड एंड एटी डिग्रीज़ इज़ अ स्ट्रेट एंगल। ऐड थर्टी फाइव डिग्रीज़ एंड फिफ्टी फाइव डिग्रीज़ अगेन। | 7.01 |
| vo041 | Not quite. Add 35° + 55° carefully. | Not quite. Add thirty-five degrees plus fifty-five degrees, carefully. | नॉट क्वाइट। ऐड थर्टी फाइव डिग्रीज़ प्लस फिफ्टी फाइव डिग्रीज़, केयरफुली। | 6.70 |
| vo042 | A little more. Try 125 + 50, then add 5. | A little more. Try one hundred and twenty-five plus fifty, then add five. | अ लिटिल मोर। ट्राई वन हंड्रेड एंड ट्वेंटी-फाइव प्लस फिफ्टी, देन ऐड फाइव। | 6.38 |
| vo043 | A little less. Try 125 + 50, then add 5. | A little less. Try one hundred and twenty-five plus fifty, then add five. | अ लिटिल लेस। ट्राई वन हंड्रेड एंड ट्वेंटी-फाइव प्लस फिफ्टी, देन ऐड फाइव। | 8.26 |
| vo044 | These add to 90° — they are complementary. | These add to ninety degrees. They are complementary. | दीज़ ऐड टू नाइन्टी डिग्रीज़। दे आर कॉम्प्लीमेंट्री। | 4.22 |
| vo045 | These add to 180° — they are supplementary. | These add to one hundred and eighty degrees. They are supplementary. | दीज़ ऐड टू वन हंड्रेड एंड एटी डिग्रीज़। दे आर सप्लीमेंट्री। | 3.98 |
| vo046 | What if two angles also share a vertex? | = | वॉट इफ़ टू एंगल्स ऑल्सो शेयर अ वर्टेक्स? | 3.34 |
| vo047 | Here is ∠AOB. | Here is angle A O B. | हियर इज़ एंगल ए ओ बी। | 3.22 |
| vo048 | Draw ray OC inside it. | Draw ray O C inside it. | ड्रॉ रे ओ सी इनसाइड इट। | 3.14 |
| vo049 | The two angles share the same vertex. | = | द टू एंगल्स शेयर द सेम वर्टेक्स। | 3.41 |
| vo050 | They also share one arm. | = | दे ऑल्सो शेयर वन आर्म। | 2.62 |
| vo051 | Angles like these are adjacent angles. | = | एंगल्स लाइक दीज़ आर एडजेसेंट एंगल्स। | 3.46 |
| vo052 | Drag C between OA and OB. | Drag C between O A and O B. | ड्रैग सी बिटवीन ओ ए एंड ओ बी। | 4.18 |
| vo053 | Tap the shared vertex. | = | टैप द शेयर्ड वर्टेक्स। | 3.62 |
| vo054 | Now tap the common arm. | = | नाउ टैप द कॉमन आर्म। | 2.50 |
| vo055 | OA belongs to only one angle. Which arm do both use? | O A belongs to only one angle. Which arm do both use? | ओ ए बिलोंग्स टू ओनली वन एंगल। विच आर्म डू बोथ यूज़? | 5.54 |
| vo056 | OB belongs to only one angle. Which arm do both use? | O B belongs to only one angle. Which arm do both use? | ओ बी बिलोंग्स टू ओनली वन एंगल। विच आर्म डू बोथ यूज़? | 4.97 |
| vo057 | Common vertex, common arm, no overlap. | = | कॉमन वर्टेक्स, कॉमन आर्म, नो ओवरलैप। | 4.42 |
| vo058 | Which pair is adjacent? | = | विच पेयर इज एडजेसेंट? | 2.57 |
| vo059 | These overlap. Adjacent angles sit side by side. | = | दीज़ ओवरलैप। एडजेसेंट एंगल्स सिट साइड बाय साइड। | 5.14 |
| vo060 | They share a vertex — but do they share an arm? | They share a vertex. But do they share an arm? | दे शेयर ए वर्टेक्स। बट डू दे शेयर एन आर्म? | 4.25 |
| vo061 | Correct — one vertex, one arm, no overlap. | Correct! One vertex, one arm, no overlap. | करेक्ट! वन वर्टेक्स, वन आर्म, नो ओवरलैप। | 4.73 |
| vo062 | Move C and watch both angles. | = | मूव सी एंड वॉच बोथ एंगल्स। | 3.82 |
| vo063 | The two angles change... | = | द टू एंगल्स चेंज... | 2.30 |
| vo064 | ...but their total stays 180°. | ...but their total stays one hundred and eighty degrees. | बट देअर टोटल स्टेज़ वन हंड्रेड एंड एटी डिग्रीज़। | 3.53 |
| vo065 | What stays the same? | = | वॉट स्टेज़ द सेम? | 2.09 |
| vo066 | Drag C again — do the two measures really stay the same? | Drag C again. Do the two measures really stay the same? | ड्रैग सी अगेन. डू द टू मेजर्स रियली स्टे द सेम? | 4.61 |
| vo067 | Wherever C goes, the angles add up to 180°. | Wherever C goes, the angles add up to one hundred and eighty degrees. | वेयरएवर सी गोज़, द एंगल्स ऐड अप टू वन हंड्रेड एंड एटी डिग्रीज़। | 5.09 |
| vo068 | These two angles are adjacent. | = | दीज़ टू एंगल्स आर एडजसेंट। | 3.02 |
| vo069 | Tap the arm they share. | = | टैप द आर्म दे शेयर। | 2.18 |
| vo070 | OA belongs to one angle only. Tap the shared arm. | O A belongs to one angle only. Tap the shared arm. | ओ ए बिलॉन्ग्स टू वन एंगल ओनली। टैप द शेयर्ड आर्म। | 5.38 |
| vo071 | OB belongs to one angle only. Tap the shared arm. | O B belongs to one angle only. Tap the shared arm. | ओ बी बिलॉन्ग्स टू वन एंगल ओनली। टैप द शेयर्ड आर्म। | 5.14 |
| vo072 | Now tap the two non-common arms. | = | नाउ टैप द टू नॉन-कॉमन आर्म्स. | 3.10 |
| vo073 | OC is shared. Tap the two outer arms. | O C is shared. Tap the two outer arms. | ओ सी इज़ शेयर्ड। टैप द टू आउटर आर्म्स। | 4.34 |
| vo074 | Their non-common arms form a straight line. | = | देअर नॉन कॉमन आर्म्स फॉर्म अ स्ट्रेट लाइन। | 3.50 |
| vo075 | This is a linear pair. | = | दिस इज़ अ लीनियर पेयर। | 2.26 |
| vo076 | If a ray stands on a line, the two angles add up to 180°. | If a ray stands on a line, the two angles add up to one hundred and eighty degrees. | इफ़ अ रे स्टैंड्स ऑन अ लाइन, द टू एंगल्स ऐड अप टू वन हंड्रेड एंड एटी डिग्रीज़। | 5.38 |
| vo077 | Which pair forms a linear pair? | = | विच पेयर फॉर्म्स अ लीनियर पेयर? | 2.98 |
| vo078 | Adjacent — but 80° + 50° is not 180°. | Adjacent. But eighty degrees plus fifty degrees is not one hundred and eighty degrees. | अडजेसेंट। बट एटी डिग्रीज प्लस फिफ्टी डिग्रीज इज नॉट वन हंड्रेड एंड एटी डिग्रीज। | 5.57 |
| vo079 | They total 180°, but they are not adjacent. | They total one hundred and eighty degrees, but they are not adjacent. | दे टोटल वन हंड्रेड एंड एटी डिग्रीज़, बट दे आर नॉट एडजेसेंट। | 5.06 |
| vo080 | Adjacent, and the outside arms form a line. | = | एडजसेंट, एंड द आउटसाइड आर्म्स फॉर्म ए लाइन। | 3.89 |
| vo081 | A linear pair totals 180°. | A linear pair totals one hundred and eighty degrees. | ए लीनियर पेयर टोटल्स वन हंड्रेड एंड एटी डिग्रीज़। | 4.30 |
| vo082 | What must the missing angle be? | = | वॉट मस्ट द मिसिंग एंगल बी? | 2.66 |
| vo083 | That is the known angle. What adds to 128° to make 180°? | That is the known angle. What adds to one hundred and twenty-eight degrees, to make one hundred and eighty degrees? | दैट इज़ द नोन एंगल। वट ऐड्स टू वन हंड्रेड एंड ट्वेंटी-एट डिग्रीज़, टू मेक वन हंड्रेड एंड एटी डिग्रीज़? | 7.70 |
| vo084 | Check: 128° + 62° = 190°, not 180°. | Check: one hundred and twenty-eight degrees plus sixty-two degrees equals one hundred and ninety degrees, not one hundred and eighty. | चेक: वन हंड्रेड एंड ट्वेंटी एट डिग्रीज़ प्लस सिक्सटी टू डिग्रीज़ इक्वल्स वन हंड्रेड एंड नाइंटी डिग्रीज़, नॉट वन हंड्रेड एंड एटी। | 8.42 |
| vo085 | 128° + 52° = 180°. | One hundred and twenty-eight degrees plus fifty-two degrees equals one hundred and eighty degrees. | वन हंड्रेड एंड ट्वेंटी-एट डिग्रीज़ प्लस फिफ्टी-टू डिग्रीज़ इक्वल्स वन हंड्रेड एंड एटी डिग्रीज़। | 6.38 |
| vo086 | Drag A so ∠1 and ∠2 form a linear pair. | Drag A so angle one and angle two form a linear pair. | ड्रैग ए सो एंगल वन एंड एंगल टू फॉर्म ए लीनियर पेयर। | 5.69 |
| vo087 | Do the non-common arms OA and OB form a straight line? | Do the non-common arms, O A and O B, form a straight line? | डू द नॉन-कॉमन आर्म्स, ओ ए एंड ओ बी, फॉर्म ए स्ट्रेट लाइन? | 5.45 |
| vo088 | Line OA up with the dashed extension of OB. | Line O A up with the dashed extension of O B. | लाईन ओ ए अप विद द डैश्ड एक्सटेंशन ऑफ ओ बी। | 5.14 |
| vo089 | The non-common arms now form one straight line. | = | द नॉन-कॉमन आर्म्स नाउ फॉर्म वन स्ट्रेट लाइन। | 3.65 |
| vo090 | Drag A until the total is 180°. | Drag A until the total is one hundred and eighty degrees. | ड्रैग ए अंटिल द टोटल इज़ वन हंड्रेड एंड एटी डिग्रीज़। | 4.94 |
| vo091 | Look at the outside arms. | = | लुक एट द आउटसाइड आर्म्स। | 2.21 |
| vo092 | Total 180° — the outside arms form a straight line. | Total one hundred and eighty degrees. The outside arms form a straight line. | टोटल वन हंड्रेड एंड एटी डिग्रीज़। द आउटसाइड आर्म्स फॉर्म ए स्ट्रेट लाइन। | 5.33 |
| vo093 | If adjacent angles total 180°, what follows? | If adjacent angles total one hundred and eighty degrees, what follows? | इफ़ एडजेसेंट एंगल्स टोटल वन हंड्रेड एंड एटी डिग्रीज़, वॉट फ़ॉलोस? | 4.61 |
| vo094 | OC points away from the line. Look only at the outside arms. | O C points away from the line. Look only at the outside arms. | ओ सी पॉइंट्स अवे फ्रॉम द लाइन। लुक ओनली एट द आउटसाइड आर्म्स। | 5.21 |
| vo095 | So the rule also works in reverse. | = | सो द रूल ऑल्सो वर्क्स इन रिवर्स। | 2.81 |
| vo096 | Now let another line cross it. | = | नाओ लेट अनदर लाइन क्रॉस इट। | 3.10 |
| vo097 | Extend the ray through O. | = | एक्सटेंड द रे थ्रू ओ। | 2.66 |
| vo098 | Lines AB and CD intersect at O. | Lines A B and C D intersect at O. | लाइन्स ए बी एंड सी डी इंटरसेक्ट एट ओ। | 3.98 |
| vo099 | Tap the angle opposite ∠1, then Check. | Tap the angle opposite angle one, then check. | टैप द एंगल ऑपोजिट एंगल वन, देन चेक। | 4.01 |
| vo100 | ∠2 shares an arm with ∠1. Look across the vertex. | Angle two shares an arm with angle one. Look across the vertex. | एंगल टू शेयर्स एन आर्म विद एंगल वन। लुक अक्रॉस द वर्टेक्स। | 5.21 |
| vo101 | ∠4 shares an arm with ∠1. Look across the vertex. | Angle four shares an arm with angle one. Look across the vertex. | एंगल फोर शेयर्स एन आर्म विद एंगल वन। लुक अक्रॉस द वर्टेक्स। | 5.81 |
| vo102 | ∠1 and ∠3 sit directly opposite. | Angle one and angle three sit directly opposite. | एंगल वन एंड एंगल थ्री सिट डायरेक्टली अपोजिट। | 4.54 |
| vo103 | Now tap the angle opposite ∠2. | Now tap the angle opposite angle two. | नाउ टैप द एंगल अपोजिट एंगल टू। | 3.26 |
| vo104 | ∠1 shares an arm with ∠2. Look straight across O. | Angle one shares an arm with angle two. Look straight across O. | एंगल वन शेयर्स एन आर्म विद एंगल टू। लुक स्ट्रेट अक्रॉस ओ। | 6.05 |
| vo105 | ∠3 shares an arm with ∠2. Look straight across O. | Angle three shares an arm with angle two. Look straight across O. | एंगल थ्री शेयर्स एन आर्म विद एंगल टू. लुक स्ट्रेट अक्रॉस ओ. | 5.33 |
| vo106 | Two pairs of vertically opposite angles. | = | टू पेयर्स ऑफ वर्टिकली ऑपोजिट एंगल्स। | 3.17 |
| vo107 | Rotate CD. Compare opposite angles. | Rotate C D. Compare opposite angles. | रोटेट सी डी. कम्पेयर अपोजिट एंगल्स. | 4.01 |
| vo108 | The angles change... | = | द एंगल्स चेंज... | 2.18 |
| vo109 | ...but opposite angles stay equal. | = | ...बट ऑपोज़िट एंगल्स स्टे इक्वल। | 2.62 |
| vo110 | Can we show ∠1 = ∠3 without measuring? | Can we show angle one equals angle three, without measuring? | कैन वी शो एंगल वन इक्वल्स एंगल थ्री, विदाउट मेज़रिंग? | 4.66 |
| vo111 | Tap the two angles we want to compare. | = | टैप द टू एंगल्स वी वॉन्ट टू कंपेयर. | 2.62 |
| vo112 | We want ∠1 and the angle opposite it. | We want angle one, and the angle opposite it. | वी वॉन्ट एंगल वन, एंड द एंगल अपोजिट इट। | 3.77 |
| vo113 | Goal: prove ∠1 = ∠3 with reasons, not a protractor. | Goal: prove angle one equals angle three, with reasons, not a protractor. | गोल: प्रूव एंगल वन इक्वल्स एंगल थ्री, विद रीजन्स, नॉट अ प्रोट्रैक्टर। | 5.33 |
| vo114 | ∠1 and ∠2 form a linear pair. | Angle one and angle two form a linear pair. | एंगल वन एंड एंगल टू फॉर्म ए लीनियर पेअर। | 3.62 |
| vo115 | Choose the total, then the reason. | = | चूज़ द टोटल, देन द रीज़न। | 3.02 |
| vo116 | 90° is a right angle. These two fill a straight line. | Ninety degrees is a right angle. These two fill a straight line. | नाइनटी डिग्रीज़ इज़ अ राइट एंगल। दीज़ टू फिल अ स्ट्रेट लाइन। | 5.78 |
| vo117 | 360° is a full turn. These two fill only a straight line. | Three hundred and sixty degrees is a full turn. These two fill only a straight line. | थ्री हंड्रेड एंड सिक्सटी डिग्रीज़ इज़ अ फुल टर्न। दीज़ टू फिल ओनली अ स्ट्रेट लाइन। | 6.26 |
| vo118 | They are next to each other, not opposite. | = | दे आर नेक्स्ट टू ईच अदर, नॉट ऑपोजिट. | 3.22 |
| vo119 | A proof cannot rely on measuring. | = | ए प्रूफ कैननॉट रिलाय ऑन मेजरिंग। | 3.41 |
| vo120 | ∠1 + ∠2 = 180°, a linear pair. | Angle one plus angle two equals one hundred and eighty degrees. A linear pair. | एंगल वन प्लस एंगल टू इक्वल्स वन हंड्रेड एंड एटी डिग्रीज़। ए लीनियर पेअर। | 6.74 |
| vo121 | ∠2 and ∠3 form a linear pair. | Angle two and angle three form a linear pair. | एंगल टू एंड एंगल थ्री फॉर्म ए लीनियर पेयर। | 4.82 |
| vo122 | Notice: both totals are 180°. | Notice: both totals are one hundred and eighty degrees. | नोटिस बोथ टोटल्स आर वन हंड्रेड एंड एटी डिग्रीज़ | 4.13 |
| vo123 | Tap the two equal totals. | = | टैप द टू इक्वल टोटल्स | 2.50 |
| vo124 | Both expressions equal the same value. | = | बोथ एक्सप्रेसन्स इक्वल द सेम वैल्यू। | 3.38 |
| vo125 | So ∠1 + ∠2 = ∠2 + ∠3. | So, angle one plus angle two, equals angle two plus angle three. | सो, एंगल वन प्लस एंगल टू, इक्वल्स एंगल टू प्लस एंगल थ्री। | 5.98 |
| vo126 | The same ∠2 appears on both sides. | The same angle two appears on both sides. | द सेम एंगल टू अपीयर्स ऑन बोथ साइड्स। | 3.53 |
| vo127 | Tap ∠2 on each side. | Tap angle two on each side. | टैप एंगल टू ऑन ईच साइड। | 2.90 |
| vo128 | That angle is on only one side. | = | दैट एंगल इज ऑन ओनली वन साइड। | 2.86 |
| vo129 | Subtract it from both sides. | = | सब्ट्रैक्ट इट फ्रॉम बोथ साइड्स। | 2.69 |
| vo130 | ∠1 = ∠3 — proved without measuring. | Angle one equals angle three. Proved, without measuring. | एंगल वन इक्वल्स एंगल थ्री। प्रूव्ड, विदाउट मेजरिंग। | 5.18 |
| vo131 | Now show ∠2 = ∠4. | Now show that angle two equals angle four. | नाउ शो दैट एंगल टू इक्वल्स एंगल फोर। | 3.65 |
| vo132 | Which angle pairs with both ∠2 and ∠4? | Which angle pairs with both angle two and angle four? | विच एंगल पेयर्स विद बोथ एंगल टू एंड एंगल फोर? | 4.25 |
| vo133 | Both are true — but to cancel, use the same angle in both. | Both are true. But to cancel, use the same angle in both. | बोथ आर ट्रू। बट टू कैंसिल, यूज़ द सेम एंगल इन बोथ। | 4.73 |
| vo134 | Both are 180°, so ∠2 + ∠1 = ∠4 + ∠1. | Both are one hundred and eighty degrees. So, angle two plus angle one, equals angle four plus angle one. | बोथ आर वन हंड्रेड एंड एटी डिग्रीज़। सो, एंगल टू प्लस एंगल वन, इक्वल्स एंगल फोर प्लस एंगल वन। | 8.42 |
| vo135 | Both are 180°, so ∠2 + ∠3 = ∠4 + ∠3. | Both are one hundred and eighty degrees. So, angle two plus angle three, equals angle four plus angle three. | बोथ आर वन हंड्रेड एंड एटी डिग्रीज़। सो, एंगल टू प्लस एंगल थ्री, इक्वल्स एंगल फोर प्लस एंगल थ्री। | 8.66 |
| vo136 | Same reasoning, different pair: ∠2 = ∠4. | Same reasoning, different pair: angle two equals angle four. | सेम रीजनिंग, डिफरेंट पेयर: एंगल टू इक्वल्स एंगल फोर। | 5.69 |
| vo137 | Tap an angle to see its opposite pair. | = | टैप एन एंगल टू सी इट्स ऑपोजिट पेयर। | 3.17 |
| vo138 | Vertically opposite angles are always equal. | = | वर्टिकली अपोजिट एंगल्स आर ऑलवेज इक्वल। | 3.89 |
| vo139 | ∠1 is 67°. Find the other three angles. | Angle one is sixty-seven degrees. Find the other three angles. | एंगल वन इज़ सिक्सटी सेवन डिग्रीज़। फाइंड द अदर थ्री एंगल्स। | 5.02 |
| vo140 | Choose each measure and its reason. | = | चूज़ ईच मेजर एंड इट्स रीज़न। | 2.93 |
| vo141 | ∠1 and ∠2 are a linear pair — they make 180°. | Angle one and angle two are a linear pair. They make one hundred and eighty degrees. | एंगल वन एंड एंगल टू आर अ लीनियर पेयर। दे मेक वन हंड्रेड एंड एटी डिग्रीज़। | 5.21 |
| vo142 | ∠2 is next to ∠1, not opposite it. | Angle two is next to angle one, not opposite it. | एंगल टू इज नेक्स्ट टू एंगल वन, नॉट ऑपोजिट इट। | 3.94 |
| vo143 | ∠3 sits directly across the vertex from ∠1. | Angle three sits directly across the vertex from angle one. | एंगल थ्री सिट्स डायरेक्टली अक्रॉस द वर्टेक्स फ्रॉम एंगल वन। | 5.14 |
| vo144 | ∠3 is across the vertex from ∠1. | Angle three is across the vertex from angle one. | एंगल थ्री इज अक्रॉस द वर्टेक्स फ्रॉम एंगल वन। | 4.66 |
| vo145 | ∠4 and ∠1 are a linear pair along line CD. | Angle four and angle one are a linear pair, along line C D. | ऐंगल फोर एंड ऐंगल वन आर ए लीनियर पेअर, अलौन्ग लाइन सी डी। | 5.42 |
| vo146 | Opposite angles are equal: ∠3 = 67°, ∠4 = ∠2. | Opposite angles are equal: angle three equals sixty-seven degrees, and angle four equals angle two. | अपोजिट एंगल्स आर इक्वल: एंगल थ्री इक्वल्स सिक्स्टी सेवन डिग्रीज, एंड एंगल फोर इक्वल्स एंगल टू। | 7.70 |
| vo147 | Linear pairs total 180°: 67° + 113° = 180°. | Linear pairs total one hundred and eighty degrees: sixty-seven degrees plus one hundred and thirteen degrees equals one hundred and eighty degrees. | लीनियर पेयर्स टोटल वन हंड्रेड एंड एटी डिग्रीज़: सिक्सटी-सेवन डिग्रीज़ प्लस वन हंड्रेड एंड थर्टीन डिग्रीज़ इक्वल्स वन हंड्रेड एंड एटी डिग्रीज़। | 9.89 |
| vo148 | Which angle is vertically opposite to ∠1? | Which angle is vertically opposite to angle one? | विच एंगल इज वर्टिकली ऑपोजिट टू एंगल वन? | 3.53 |
| vo149 | Every angle is 90° — so don’t use the number. | Every angle is ninety degrees, so don’t use the number. | एवरी एंगल इज नाइन्टी डिग्रीज़, सो डोन्ट यूज़ द नंबर। | 4.18 |
| vo150 | Look across the vertex, then Check. | Look across the vertex, then check. | लुक अक्रॉस द वर्टेक्स, देन चेक। | 3.22 |
| vo151 | ∠2 shares an arm with ∠1. Opposite angles share only the vertex. | Angle two shares an arm with angle one. Opposite angles share only the vertex. | एंगल टू शेयर्स एन आर्म विद एंगल वन। अपोजिट एंगल्स शेयर ओनली द वर्टेक्स। | 6.17 |
| vo152 | ∠4 shares an arm with ∠1. Opposite angles share only the vertex. | Angle four shares an arm with angle one. Opposite angles share only the vertex. | एंगल फोर शेयर्स एन आर्म विद एंगल वन। अपोजिट एंगल्स शेयर ओनली द वर्टेक्स। | 7.22 |
| vo153 | Yes — ∠3 sits directly across from ∠1. | Yes! Angle three sits directly across from angle one. | येस! एंगल थ्री सिट्स डायरेक्टली अक्रॉस फ्रॉम एंगल वन। | 4.90 |
| vo154 | Which pair's non-common arms must form a line? | = | विच पेयर्स नॉन-कॉमन आर्म्स मस्ट फॉर्म अ लाइन? | 4.06 |
| vo155 | Pair B totals 180° too — but it is not adjacent. | Pair B totals one hundred and eighty degrees too. But it is not adjacent. | पेअर बी टोटल्स वन हंड्रेड एंड एटी डिग्रीज़ टू। बट इट इज़ नॉट एडजेसेंट। | 5.14 |
| vo156 | Adjacent and 180° — so the outer arms form a line. | Adjacent, and one hundred and eighty degrees. So the outer arms form a line. | एडजेसेंट, एंड वन हंड्रेड एंड एटी डिग्रीज़। सो द आउटर आर्म्स फॉर्म ए लाइन। | 6.10 |
| vo157 | You can find angles without measuring them. | = | यू कैन फाइंड एंगल्स विदाउट मेजरिंग देम। | 3.46 |
| vo158 | Tap each relationship to replay it. | = | टैप ईच रिलेशनशिप टू रिप्ले इट। | 2.98 |
| vo159 | Vertically opposite angles are equal. | = | वर्टिकली अपोजिट एंगल्स आर इक्वल। | 2.93 |
| vo160 | Adjacent + 180° → outer arms form a line. | Adjacent, plus one hundred and eighty degrees, means the outer arms form a line. | अडजेसेंट, प्लस वन हंड्रेड एंड एटी डिग्रीज़, मीन्स द आउटर आर्म्स फॉर्म ए लाइन। | 7.37 |
| vo161 | You built it, explored it, and proved it. | = | यू बिल्ट इट, एक्सप्लोर्ड इट, एंड प्रूव्ड इट। | 5.09 |
