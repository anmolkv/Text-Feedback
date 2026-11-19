/* =========================================================
   Helpers
   ========================================================= */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const words = t => (String(t).match(/[A-Za-z0-9ऀ-ॿ'’-]+/g) || []).length;
const has = (t, re) => re.test(t);
const count = (t, re) => (t.match(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g")) || []).length;
const clamp = (x, a=0, b=4) => Math.max(a, Math.min(b, Math.round(x)));

const STOP = new Set("a an the and or but so to of in on at for with from by is are was were be been am i you he she it we they my your our their me him her us them this that these those there here as if then than not no do does did have has had will would can could should may might must very also just about into over after before when while what which who whom how why all any some more most other such only own same too s t don now".split(" "));
const contentWords = t => (t.toLowerCase().match(/[a-z']+/g) || []).filter(w => w.length > 2 && !STOP.has(w));

function splitSentences(text){
  const out = []; const re = /[^.!?\n]+(?:[.!?]+|(?=\n)|$)/g; let m;
  while ((m = re.exec(text))){
    const raw = m[0]; const lead = raw.length - raw.trimStart().length;
    const s = raw.trim(); if (s.length < 2) continue;
    out.push({text:s, start:m.index + lead, end:m.index + lead + s.length});
  }
  return out;
}

const LINKERS = /\b(firstly|first of all|secondly|thirdly|also|however|because|therefore|so|but|for example|for instance|in addition|moreover|finally|overall|in conclusion|as a result|although|besides|on the other hand|such as|then)\b/gi;
const OPINION = /\b(i think|i believe|in my opinion|in my view|i feel|i agree|i disagree|i strongly|i don'?t think|i do not think|should|must not|should not|shouldn'?t)\b/i;
const REASON = /\b(firstly|first|secondly|second|another reason|also|moreover|because|since|besides|in addition|thirdly)\b/gi;
const EXAMPLE = /\b(for example|for instance|such as|e\.g\.|like when|when i|in my case|my friend|last year)\b/i;
const CONCLUDE = /\b(overall|in conclusion|to conclude|to sum up|so i think|therefore|that'?s why|finally|in short)\b/i;
const INFORMAL = /\b(u|ur|pls|plz|gonna|wanna|coz|bcoz|cuz|thx|tnx|lol|ok+|hey)\b|!!+/gi;
const FORMAL_IN_CHAT = /\b(dear|respected|regards|sincerely|yours faithfully|yours truly|kindly)\b/i;

/* Indian-English phrases: shown as tips, never counted as errors */
const IE_TIPS = [
  [/\bdo the needful\b/i, "“Do the needful” is common in India but unclear elsewhere. Say exactly what you need, e.g. “Please tell me the process.”"],
  [/\bmyself [A-Z][a-z]+/, "“Myself Ananya” is common in Indian English. In writing, use “My name is Ananya” or “I am Ananya.”"],
  [/\bprepone\b/i, "“Prepone” is Indian English. Outside India, say “bring forward” or “move earlier.”"],
  [/\brevert back\b/i, "“Revert back” repeats itself, and “revert” means “go back.” Use “reply” or “get back to you.”"],
  [/\bout of station\b/i, "“Out of station” is Indian English. You can say “out of town.”"],
  [/\bpass(ed)? out\b/i, "“Passed out” means “fainted” outside India. Say “graduated.”"],
  [/\bi am (having|belonging|knowing|understanding|wanting)\b/i, "Verbs like have, belong, know and want are not usually used with “-ing.” Say “I have,” “I belong,” “I know.”"],
  [/\bdiscuss about\b/i, "Say “discuss the plan,” not “discuss about the plan.”"],
  [/\bcope up\b/i, "Say “cope with,” not “cope up with.”"],
];

/* =========================================================
   Tasks
   ========================================================= */
const PASSAGE = `On the first day at a new institute, most students feel a mix of excitement and worry. They do not know where the classrooms are, who their teachers will be, or whether they will make friends. Many institutes now run an orientation day to help. Senior students wait at the gate to guide newcomers, show them where to register, and answer simple questions. New students also get a printed map and a timetable. Research shows that students who attend orientation feel more confident and are less likely to drop out in the first year. However, orientation works best when it is short and friendly, not a long list of rules. A warm welcome in the first few hours can shape how a student feels about the whole year.`;

const P = (label, test) => ({label, test});
const TASKS = {
  summary:{
    label:"Summary", min:40, max:80, passage:PASSAGE,
    prompt:"Read the passage. Summarise it in your own words in 40–80 words. Include the main idea and two key points.",
    points:[
      P("First-day worries", c => has(c.lc, /(worr|nervous|anxious|excit|fear|scared|tense|confus)/)),
      P("Seniors guide newcomers", c => has(c.lc, /(senior|guide|help)/)),
      P("Map & timetable", c => has(c.lc, /(map|timetable|time table|schedule)/)),
      P("Orientation builds confidence", c => has(c.lc, /(confiden|drop ?out|leave|quit|comfortable)/)),
      P("Keep it short & friendly", c => has(c.lc, /(short|friendly|warm|welcom|brief|not .{0,20}rules)/)),
    ],
    criteria:[["Main ideas","checklist"],["Own words","ownwords"],["Concise & organised","concise"],["Language accuracy","accuracy"]],
    sample:`The passage is about first day of new student in institute. Students are feeling excited and worry because they dont know classroom and teachers. Many institute is doing orientation day where seniors are guiding the new student and giving map and timetable. Research show that student who attend orientation feel more confident. Orientation should be short and friendly not long rules.`
  },
  opinion:{
    label:"Opinion", min:80, max:150,
    prompt:"Should first-year students have to attend a one-week orientation before classes start? Give your opinion with at least two reasons and an example. Write 80–150 words.",
    points:[
      P("Clear opinion", c => c.sents.slice(0,2).some(s => OPINION.test(s.text))),
      P("Reason 1", c => count(c.lc, REASON) >= 1),
      P("Reason 2", c => count(c.lc, REASON) >= 2),
      P("An example", c => EXAMPLE.test(c.lc)),
      P("Conclusion", c => c.sents.length > 2 && c.sents.slice(-2).some(s => CONCLUDE.test(s.text))),
    ],
    criteria:[["Clear position","position"],["Reasons & examples","reasons"],["Organisation","organisation"],["Language accuracy","accuracy"]],
    sample:`In my opinion orientation week is very much important for first year students. Firstly, the new students are not knowing anything about college, so orientation help them to know the campus and the teachers. For example when I came to my college I was not knowing where is the library and I wasted one hour. Secondly student can make new friends in orientation and they will not feel alone. But one week is too much long, students will get bored. So I think it should be only two or three days. Overall orientation is good for students and every college must do it.`
  },
  email:{
    label:"Email", min:60, max:120,
    prompt:"Write an email to the college office (office@institute.edu). You want to change your elective from Accounting to Computer Applications. Explain why and ask what you need to do next. Write 60–120 words.",
    points:[
      P("Subject line", c => /^\s*subject\s*:/im.test(c.text)),
      P("Greeting", c => /^\s*(dear|respected|hello|hi|good (morning|afternoon|evening))\b/im.test(c.text)),
      P("Your request", c => has(c.lc, /(change|switch|shift|transfer|move)/) && has(c.lc, /(elective|subject|course|computer)/)),
      P("Reason for change", c => has(c.lc, /(because|as i |since|interest|reason|due to|passion|career|want to learn)/)),
      P("Ask about next steps", c => has(c.lc, /(process|procedure|next step|what (do|should|must) i|how (can|do|should) i|let me know|inform me|guide me|document|form|\?)/)),
      P("Polite closing + name", c => has(c.lc, /(regards|sincerely|faithfully|thank(s| you)|yours)/) && lastLineIsName(c.text)),
    ],
    criteria:[["Task completion","checklist"],["Format & tone","emailformat"],["Organisation","organisation"],["Language accuracy","accuracy"]],
    sample:`hello sir,

i am Ananya from first year BCom. I want to change my elective from accounting to computer application because I am more interested in computers and I have done basic course also. Please do the needful and tell me what is the process for it. I will be very thankful.

Ananya`
  },
  reply:{
    label:"Reply to a message", min:30, max:80,
    prompt:"Your classmate Meera sends you this message:\n“Hey! Are you coming to the library tomorrow at 4? We need to finish the project slides. Also, can you bring your laptop?”\nReply to Meera. Answer both questions. Write 30–80 words.",
    points:[
      P("Coming at 4?", c => has(c.lc, /(\b4\b|four|coming|come|reach|be there|join|can'?t make|cannot|won'?t be able|late|busy)/)),
      P("Bringing laptop?", c => has(c.lc, /laptop/)),
      P("Friendly tone", c => /^\s*(hi|hey|hello|yes|yeah|sure|ok|okay)\b/i.test(c.text) && !FORMAL_IN_CHAT.test(c.text)),
    ],
    criteria:[["Task completion","checklist"],["Tone","replytone"],["Clarity","clarity"],["Language accuracy","accuracy"]],
    sample:`Hi Meera, yes I will coming tomorrow but I can reach only at 4:30 because I have lab till 4. Laptop I will bring but charger is not working so u please bring yours. See you`
  },
  intro:{
    label:"Self-introduction", min:60, max:120,
    prompt:"Introduce yourself to your new classmates. Include your name, where you are from, what you are studying, one hobby and one goal for this year. Write 60–120 words.",
    points:[
      P("Name", c => /\b(my name is|i am [A-Z]|i'm [A-Z]|myself [A-Z]|this is [A-Z])/.test(c.text)),
      P("Where you are from", c => has(c.lc, /(\bfrom\b|belong|hometown|live in|grew up|native)/)),
      P("Course", c => has(c.lc, /(studying|study|b\.? ?com|\bba\b|b\.? ?sc|b\.? ?tech|bca|bba|course|degree|pursuing|first year|1st year|semester)/)),
      P("A hobby", c => has(c.lc, /(hobby|hobbies|like to|love to|enjoy|free time|spare time|passion|fond of)/)),
      P("A goal", c => has(c.lc, /(goal|want to|plan to|hope to|aim|dream|wish to|this year i)/)),
    ],
    criteria:[["Content","checklist"],["Organisation","organisation"],["Vocabulary","vocab"],["Language accuracy","accuracy"]],
    sample:`Hello everyone, myself Ananya Sharma. I am belonging to Jaipur, Rajasthan. Currently I am doing BCom first year in this college. In my free time I like to read novels and also I like to read story books. My goal for this year is to improve my english speaking and make lots of new friends. I am very happy to be here and I hope we will all have a good time together.`
  },
  custom:{
    label:"Custom task", min:30, max:200, custom:true, prompt:"", keywords:"",
    points:[],
    criteria:[["Task relevance","relevance"],["Organisation","organisation"],["Vocabulary","vocab"],["Language accuracy","accuracy"]],
    sample:""
  }
};

function lastLineIsName(text){
  const lines = text.trim().split(/\n/).map(l=>l.trim()).filter(Boolean);
  const last = lines[lines.length-1] || "";
  return words(last) >= 1 && words(last) <= 4 && /^[A-Z]/.test(last) && !/[.?]$/.test(last);
}

/* =========================================================
   Grammar engine: LanguageTool (+ offline fallback)
   ========================================================= */
const ltCache = new Map();
let engineState = "unknown";

function setEngine(state){
  engineState = state;
  const el = $("engine");
  el.className = "engine " + (state==="lt" ? "on" : state==="local" ? "off" : "");
  el.querySelector("span").textContent = state==="lt" ? "LanguageTool connected" : state==="local" ? "Grammar: offline checks" : "Grammar: not checked";
  el.title = state==="lt" ? "Grammar engine: LanguageTool (connected)" : state==="local" ? "Grammar engine: basic offline checks (LanguageTool unreachable)" : "Grammar engine: not checked yet";
}

function classify(m){
  const cat = (m.rule && m.rule.category && m.rule.category.id) || "";
  const issue = (m.rule && m.rule.issueType) || "";
  const id = (m.rule && m.rule.id) || "";
  if (cat === "TYPOS" || issue === "misspelling") return "spelling";
  if (cat === "CASING") return "capitalisation";
  if (cat === "PUNCTUATION" || cat === "TYPOGRAPHY" || issue === "typographical" || id === "WHITESPACE_RULE") return "punctuation";
  if (cat === "STYLE" || cat === "REDUNDANCY" || cat === "PLAIN_ENGLISH" || issue === "style" || issue === "locale-violation") return "tip";
  if (cat === "CONFUSED_WORDS" || cat === "COLLOCATIONS" || cat === "SEMANTICS") return "word choice";
  return "grammar";
}

async function grammarCheck(text){
  const lang = $("ltLang").value, url = $("ltUrl").value.trim();
  const key = lang + "|" + text;
  if (ltCache.has(key)) return ltCache.get(key);
  try{
    const ctl = new AbortController(); const to = setTimeout(()=>ctl.abort(), 8000);
    const res = await fetch(url, {method:"POST", signal:ctl.signal,
      headers:{"Content-Type":"application/x-www-form-urlencoded","Accept":"application/json"},
      body:new URLSearchParams({text, language:lang, enabledOnly:"false"})});
    clearTimeout(to);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const issues = (data.matches||[]).map(m => {
      const span = text.substr(m.offset, m.length);
      let type = classify(m);
      // Likely a proper noun (Indian names/places): don't count capitalised unknown words mid-sentence
      if (type === "spelling" && /^[A-Z]/.test(span) && m.offset > 0 && !/[.!?]\s*$/.test(text.slice(0, m.offset).trimEnd().slice(-1) || ".")) type = "name";
      // A word right after "my name is", "I am", "myself", "I'm from"… is a name or place, in any case (anmol / Anmol)
      if (type === "spelling" && /\b(my name is|my name's|name is|i am|i'm|im|myself|this is|call me|called|i live in|i'm from|i am from|from)\s+$/i.test(text.slice(Math.max(0, m.offset - 24), m.offset))) type = "name";
      return {start:m.offset, end:m.offset+m.length, span, type,
        fix:(m.replacements||[]).slice(0,2).map(r=>r.value).filter(v=>v!==undefined),
        why:m.message || m.shortMessage || "", rule:(m.rule&&m.rule.id)||"", ruleName:(m.rule&&m.rule.description)||""};
    }).filter(i => i.type !== "name");
    const result = {source:"lt", issues};
    ltCache.set(key, result); setEngine("lt");
    return result;
  } catch(e){
    setEngine("local");
    return {source:"local", issues:localGrammar(text)};
  }
}

/* Basic offline checks, used only when LanguageTool can't be reached */
function localGrammar(text){
  const out = [];
  const add = (re, type, fixFn, why, rule) => { let m; const r = new RegExp(re.source, re.flags.includes("g")?re.flags:re.flags+"g");
    while ((m = r.exec(text))){ out.push({start:m.index, end:m.index+m[0].length, span:m[0], type, fix:[fixFn(m[0])], why, rule}); } };
  const APOS = {dont:"don't",cant:"can't",wont:"won't",didnt:"didn't",doesnt:"doesn't",isnt:"isn't",im:"I'm",ive:"I've",wasnt:"wasn't",arent:"aren't",couldnt:"couldn't",shouldnt:"shouldn't",wouldnt:"wouldn't",thats:"that's",whats:"what's",lets:"let's"};
  add(/\b(dont|cant|wont|didnt|doesnt|isnt|im|ive|wasnt|arent|couldnt|shouldnt|wouldnt|thats|whats)\b/i, "spelling", w => APOS[w.toLowerCase()] || w, "This short form needs an apostrophe.", "APOSTROPHE");
  add(/(?<![A-Za-z'])i(?![A-Za-z'])/, "capitalisation", () => "I", "Always write “I” as a capital letter.", "LOWERCASE_I");
  add(/\b(\w+)\s+\1\b/i, "grammar", w => w.split(/\s+/)[0], "The same word is repeated.", "REPEATED_WORD");
  add(/\ba\s+(?=[aeiou][a-z])(?!(one|uni|use|eu|uti))\w+/i, "grammar", w => w.replace(/^a/i, m => m==="A"?"An":"an"), "Use “an” before a vowel sound.", "A_AN");
  add(/ {2,}/, "punctuation", () => " ", "Extra space.", "DOUBLE_SPACE");
  add(/\s+[,.](?=\S)/, "punctuation", w => w.trim(), "No space before a comma or full stop.", "SPACE_BEFORE_PUNCT");
  splitSentences(text).forEach(s => { if (/^[a-z]/.test(s.text)) out.push({start:s.start, end:s.start+1, span:s.text[0], type:"capitalisation", fix:[s.text[0].toUpperCase()], why:"Start a sentence with a capital letter.", rule:"SENTENCE_CAPITAL"}); });
  return out.sort((a,b)=>a.start-b.start).filter((x,i,arr)=> i===0 || x.start >= arr[i-1].end);
}

/* =========================================================
   Analysis context
   ========================================================= */
function copyPercent(answer, passage){
  if (!passage) return null;
  const toks = s => s.toLowerCase().replace(/[^a-z0-9\s]/g," ").split(/\s+/).filter(Boolean);
  const Pt = toks(passage), A = toks(answer);
  const grams = new Set(); for (let i=0;i+5<=Pt.length;i++) grams.add(Pt.slice(i,i+5).join(" "));
  const covered = new Array(A.length).fill(false);
  for (let i=0;i+5<=A.length;i++) if (grams.has(A.slice(i,i+5).join(" "))) for (let k=i;k<i+5;k++) covered[k]=true;
  return A.length ? Math.round(100*covered.filter(Boolean).length/A.length) : 0;
}

function buildCtx(text, t){
  const lc = text.toLowerCase();
  const sents = splitSentences(text);
  const n = words(text);
  const cw = contentWords(text);
  const sample = cw.slice(0, 80);
  const ttr = sample.length ? new Set(sample).size / sample.length : 0;
  const freq = {}; cw.forEach(w => freq[w]=(freq[w]||0)+1);
  const taskWords = new Set(contentWords((t.prompt||"") + " " + (t.passage||"") + " " + (t.keywords||"")));
  const repeated = Object.entries(freq).filter(([w,c]) => c >= 3 && !taskWords.has(w)).sort((a,b)=>b[1]-a[1]).map(([w,c])=>`${w} (${c}×)`);
  const overlap = new Set(cw.filter(w => taskWords.has(w))).size;
  const sentLens = sents.map(s => words(s.text));
  const ctx = {text, lc, t, sents, n, ttr, repeated, overlap, sentLens,
    avgLen: sentLens.length ? sentLens.reduce((a,b)=>a+b,0)/sentLens.length : 0,
    longSents: sentLens.filter(x => x > 30).length,
    linkers: [...new Set((lc.match(LINKERS)||[]).map(x=>x.toLowerCase()))],
    paragraphs: text.trim().split(/\n\s*\n/).filter(p=>p.trim()).length,
    copyPct: copyPercent(text, t.passage),
    informal: (text.match(INFORMAL)||[]).map(x=>x.trim()),
  };
  ctx.checklist = (t.points||[]).map(p => ({point:p.label, status: safe(()=>p.test(ctx)) ? "done" : "missing"}));
  ctx.offTask = n > 15 && overlap < 2 && !t.custom;
  ctx.ieTips = IE_TIPS.filter(([re]) => re.test(text)).map(([re,msg]) => { const m = text.match(re); return {span:m[0], msg}; });
  return ctx;
}
const safe = f => { try { return f(); } catch { return false; } };

/* =========================================================
   Rubric scorers (0–4 each, with a reason)
   ========================================================= */
const ADVICE = {
  checklist:"Re-read the task and tick off each point. Add the ones that are missing.",
  accuracy:"Read your answer slowly, one sentence at a time, and check the verbs and plurals.",
  ownwords:"Close the passage, then write the main ideas from memory using your own words.",
  concise:"Keep to the word limit: one main idea, two key points, no extra detail.",
  organisation:"Use linking words (firstly, also, however, so) and keep sentences between 8 and 25 words.",
  vocab:"Replace repeated words with different ones, e.g. “like” → enjoy, love, am interested in.",
  position:"Say your opinion clearly in the first sentence, e.g. “I believe that…”.",
  reasons:"Give two separate reasons (Firstly…, Secondly…) and one real example (For example…).",
  emailformat:"Use the email shape: Subject → Dear Sir/Madam → purpose → details → Regards + your name.",
  replytone:"Keep it friendly and natural: “Hi Meera! Yes, I'll be there…”. Avoid “Dear” and “Regards” in a chat.",
  clarity:"Answer each question in its own short sentence, and give exact times.",
  relevance:"Use the key words from the question in your answer and stay on that topic.",
};

const SCORERS = {
  checklist(c){
    const total = c.checklist.length || 1, done = c.checklist.filter(x=>x.status==="done").length;
    let s = clamp(4*done/total); if (c.offTask) s = Math.min(s,1);
    const miss = c.checklist.filter(x=>x.status!=="done").map(x=>x.point);
    return {score:s, reason: miss.length ? `You covered ${done} of ${total} points. Missing: ${miss.join(", ")}.` : `You covered all ${total} required points.`};
  },
  accuracy(c){
    const errs = c.errors.length, per100 = errs*100/Math.max(c.n,1);
    const s = per100 < 1 ? 4 : per100 < 3 ? 3 : per100 < 6 ? 2 : per100 < 10 ? 1 : 0;
    const byType = {}; c.errors.forEach(e => byType[e.type]=(byType[e.type]||0)+1);
    const top = Object.entries(byType).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${v} ${k}`).join(", ");
    return {score:s, reason: errs ? `${errs} mistake${errs>1?"s":""} in ${c.n} words (${top}).` : "No grammar, spelling or punctuation mistakes found."};
  },
  ownwords(c){
    const p = c.copyPct ?? 0;
    const s = p < 15 ? 4 : p < 25 ? 3 : p < 40 ? 2 : p < 60 ? 1 : 0;
    return {score:s, reason: p < 15 ? `Only ${p}% matches the passage word-for-word. Good paraphrasing.` : `${p}% of your words are copied in long phrases from the passage.`};
  },
  concise(c){
    const {min,max} = c.t; let s = 4; const notes = [];
    if (c.n < min){ s -= c.n < min*0.6 ? 2 : 1; notes.push(`${c.n} words is below the ${min}-word minimum`); }
    if (c.n > max){ s -= c.n > max*1.3 ? 2 : 1; notes.push(`${c.n} words is over the ${max}-word limit`); }
    if (c.longSents){ s -= 1; notes.push(`${c.longSents} sentence${c.longSents>1?"s are":" is"} over 30 words`); }
    if (c.sents.length < 2 && c.n > 20){ s -= 1; notes.push("it is all one sentence"); }
    return {score:clamp(s), reason: notes.length ? cap(notes.join("; ")) + "." : `Good length (${c.n} words) with clear sentences.`};
  },
  organisation(c){
    let s = 4; const notes = [];
    if (c.linkers.length === 0){ s -= 2; notes.push("no linking words"); } else if (c.linkers.length === 1 && c.n > 60){ s -= 1; notes.push("only one linking word"); }
    if (c.longSents){ s -= 1; notes.push(`${c.longSents} very long sentence${c.longSents>1?"s":""}`); }
    if (c.avgLen && c.avgLen < 6){ s -= 1; notes.push("sentences are very short and choppy"); }
    if (c.t.label==="Email" && c.paragraphs < 2){ s -= 1; notes.push("no separate paragraphs"); }
    if (c.t.label==="Opinion" && !c.sents.slice(-2).some(x => CONCLUDE.test(x.text))){ s -= 1; notes.push("no clear concluding sentence"); }
    if (c.n < c.t.min*0.6){ s -= 1; notes.push("too short to show structure"); }
    return {score:clamp(s), reason: notes.length ? cap(notes.join("; ")) + "." : `Ideas flow well, with linking words: ${c.linkers.slice(0,4).join(", ")}.`};
  },
  vocab(c){
    const r = c.ttr; let s = r > .78 ? 4 : r > .68 ? 3 : r > .58 ? 2 : r > .45 ? 1 : 0;
    if (c.repeated.length && s > 2) s -= 1;
    return {score:s, reason: c.repeated.length ? `Some words are repeated a lot: ${c.repeated.slice(0,3).join(", ")}.` : `Good variety: ${Math.round(r*100)}% of your key words are different.`};
  },
  position(c){
    const early = c.sents.slice(0,2).some(s => OPINION.test(s.text)), any = OPINION.test(c.text);
    return early ? {score:4, reason:"You state your opinion clearly at the start."}
      : any ? {score:2, reason:"Your opinion is there, but it comes late. Put it in the first sentence."}
      : {score:0, reason:"I couldn't find a clear opinion (e.g. “I think…”, “In my opinion…”)."};
  },
  reasons(c){
    const r = Math.min(count(c.lc, REASON), 3), ex = EXAMPLE.test(c.lc);
    const s = r >= 2 && ex ? 4 : r >= 2 ? 3 : r === 1 && ex ? 2 : r === 1 ? 1 : 0;
    return {score:s, reason: `${r >= 2 ? "Two or more reasons" : r === 1 ? "Only one reason" : "No clear reasons"} found, ${ex ? "with an example." : "and no example (try “For example…”)."}`};
  },
  emailformat(c){
    const miss = [];
    if (!/^\s*subject\s*:/im.test(c.text)) miss.push("subject line");
    if (!/^\s*(dear|respected|hello|hi|good (morning|afternoon|evening))\b/im.test(c.text)) miss.push("greeting");
    if (!/(regards|sincerely|faithfully|thank(s| you)|yours)/i.test(c.text)) miss.push("closing (e.g. Regards)");
    if (!lastLineIsName(c.text)) miss.push("your name at the end");
    let s = 4 - miss.length;
    const notes = [];
    if (/^\s*(hello|hi)\b/im.test(c.text)) { s -= 1; notes.push("“Hello/Hi” is too casual for the college office; use “Dear Sir/Madam”"); }
    if (c.informal.length){ s -= 1; notes.push(`informal words: ${[...new Set(c.informal)].slice(0,3).join(", ")}`); }
    return {score:clamp(s), reason: [miss.length ? "Missing: " + miss.join(", ") : "", ...notes].filter(Boolean).join(". ") + (miss.length||notes.length ? "." : "Clear email format with a polite, formal tone.")};
  },
  replytone(c){
    let s = 4; const notes = [];
    if (!/^\s*(hi|hey|hello|yes|yeah|sure|ok|okay)\b/i.test(c.text)) { s -= 1; notes.push("start with a friendly word like “Hi Meera!”"); }
    if (FORMAL_IN_CHAT.test(c.text)) { s -= 2; notes.push("words like “Dear” or “Regards” are too formal for a chat"); }
    if (/\b(u|ur|pls|plz)\b/i.test(c.text)) { s -= 1; notes.push("write “you/please” in full, even in chats"); }
    return {score:clamp(s), reason: notes.length ? cap(notes.join("; ")) + "." : "Friendly and natural for a message to a classmate."};
  },
  clarity(c){
    let s = 4; const notes = [];
    if (c.longSents){ s -= 1; notes.push("a sentence is very long"); }
    if (c.avgLen > 22){ s -= 1; notes.push("sentences are long on average"); }
    if (c.t.label==="Reply to a message" && !/\b\d{1,2}([:.]\d{2})?\s*(pm|am)?\b|four|half past/i.test(c.text)) { s -= 1; notes.push("no clear time given"); }
    if (c.sents.length < 2){ s -= 1; notes.push("everything is in one sentence"); }
    return {score:clamp(s), reason: notes.length ? cap(notes.join("; ")) + "." : "Clear and easy to follow."};
  },
  relevance(c){
    const kw = contentWords((c.t.prompt||"") + " " + (c.t.keywords||""));
    const uniq = [...new Set(kw)], used = uniq.filter(w => c.lc.includes(w));
    const r = uniq.length ? used.length / Math.min(uniq.length, 8) : 0;
    const s = clamp(r >= 1 ? 4 : r >= .6 ? 3 : r >= .35 ? 2 : r > 0 ? 1 : 0);
    return {score:s, reason: `Your answer uses ${used.length} of the key words from the task${used.length?": "+used.slice(0,5).join(", "):""}.`};
  },
};
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

/* =========================================================
   UI: tabs, prompt, counter
   ========================================================= */
let current = "summary"; const drafts = {};
/* Best score per task, shown on the task list: key "w:summary" → "12/16" */
const RESULTS = {};
const tabHTML = (k, label, meta, active, best) =>
  `<button class="tab ${active?'active':''}" data-k="${k}"><span class="tab-ico"><i class="ico"></i></span>` +
  `<span class="tab-txt"><b>${esc(label)}</b><small>${esc(meta)}</small>` +
  `<em class="badge ${best?'done':''}">${best ? "Done · best " + esc(best) : "New"}</em></span></button>`;
function renderDone(id, prefix, total){
  const n = Object.keys(RESULTS).filter(k => k.startsWith(prefix)).length, el = $(id); if (!el) return;
  el.querySelector("em").textContent = `${n}/${total}`;
  el.querySelector("i").style.width = (total ? n/total*100 : 0) + "%";
  el.style.setProperty("--p", total ? n/total : 0);
  el.title = `${n} of ${total} tasks done`;
}
const T_COLORS = {summary:"#ff6a3d", opinion:"#3ee08f", email:"#f2e94e", reply:"#6f9bff", intro:"#c48bff", custom:"#ff8fc7"};
let wPrev = null;
function wTabHTML(k, t, active){
  const best = RESULTS["w:"+k], [x,y] = best ? best.split("/").map(Number) : [0,1];
  const p = best ? x/y : 0, pct = Math.round(p*100);
  return `<button class="tab ${active?"active":""} ${!active && k===wPrev ? "was" : ""}" data-k="${k}" style="--c:${T_COLORS[k]||"#6f9bff"};--p:${p}" title="${best ? "Best score " + esc(best) : (t.custom ? "Your own task" : `${t.min}–${t.max} words`)}">` +
    `<span class="tab-ico"><i class="ico"></i></span>` +
    `<span class="tab-txt"><b>${esc(t.label)}</b><small>${esc(t.custom ? "Your own task" : `${t.min}–${t.max} words`)}</small></span>` +
    `<em class="pct ${best?"on":""}">${best ? pct + "%" : "New"}</em></button>`;
}
function renderTabs(){
  $("writeView").style.setProperty("--c", T_COLORS[current] || "#6f9bff");
  $("tabs").innerHTML = Object.entries(TASKS).map(([k,t]) => wTabHTML(k, t, k===current)).join("");
  renderDone("wDone", "w:", Object.keys(TASKS).length);
  $("tabs").querySelectorAll(".tab").forEach(b => b.onclick = () => {
    if (b.dataset.k === current) return;
    wPrev = current; drafts[current] = $("answer").value; current = b.dataset.k;
    renderTabs(); renderPrompt(); $("answer").value = drafts[current] || ""; updateCount(); coachLocal(); scheduleLT();
    $("out").innerHTML = `<div class="empty">Your feedback will appear here.</div>`;
  });
}
function renderPrompt(){
  const t = TASKS[current]; $("wTitle").textContent = t.label;
  if (t.custom){
    $("promptBox").innerHTML = `<div class="q-card prompt custom"><div class="card-top"><span class="tag">Your own task</span></div>
      <label style="font-size:13px">Question / instructions for the learner<textarea id="customPrompt" placeholder="e.g. Write a short note to your hostel warden asking for permission to come back late on Friday.">${esc(t.prompt)}</textarea></label>
      <label style="font-size:13px">Key words a good answer should use (comma-separated)<input id="cKw" value="${esc(t.keywords)}" placeholder="e.g. permission, Friday, late, reason"></label>
      <div style="display:flex;gap:8px"><label style="font-size:13px;flex:1">Min words <input id="cMin" type="number" value="${t.min}"></label>
      <label style="font-size:13px;flex:1">Max words <input id="cMax" type="number" value="${t.max}"></label></div></div>`;
    $("customPrompt").oninput = e => { t.prompt = e.target.value; buildCustomPoints(); coachLocal(); };
    $("cKw").oninput = e => { t.keywords = e.target.value; buildCustomPoints(); coachLocal(); };
    $("cMin").oninput = e => { t.min = +e.target.value||0; updateCount(); };
    $("cMax").oninput = e => { t.max = +e.target.value||0; updateCount(); };
    $("sampleBtn").style.display = "none"; buildCustomPoints();
  } else {
    $("promptBox").innerHTML = `<div class="q-card w-task"><div class="card-top"><span class="tag">Your task</span><span class="meta">Write ${t.min}–${t.max} words</span></div><div class="w-text">${esc(t.prompt).replace(/\n/g,"<br>")}</div></div>
      ${t.passage ? `<div class="passage-card"><div class="card-top"><span class="tag">Passage</span><span class="meta">${words(t.passage)} words</span></div><div class="passage-text">${esc(t.passage)}</div></div>` : ""}`;
    $("sampleBtn").style.display = "";
  }
  $("rubricInfo").innerHTML = "<b>Rubric:</b> " + t.criteria.map(c => `<b>${esc(c[0])}</b>`).join(" · ") +
    " · each scored 0–4 by fixed rules, so the same answer always gets the same score.";
}
function buildCustomPoints(){
  const t = TASKS.custom;
  t.points = t.keywords.split(",").map(k=>k.trim()).filter(Boolean).slice(0,6)
    .map(k => P(k, c => c.lc.includes(k.toLowerCase())));
}
function updateCount(){
  const t = TASKS[current], n = words($("answer").value), el = $("count");
  el.textContent = `${n} word${n===1?"":"s"} · target ${t.min}–${t.max}`;
  el.className = "count " + (n===0 ? "" : (n<t.min||n>t.max) ? "bad" : "ok");
}

/* =========================================================
   Writing coach (live, line by line)
   ========================================================= */
let ltTimer = null, ltText = "", ltIssues = null;

function nudge(issue){
  const w = `“${issue.span.trim() || issue.span}”`;
  const r = issue.rule || "";
  if (issue.type === "spelling") return `Check the spelling of ${w}.`;
  if (issue.type === "capitalisation") return `Should ${w} have a capital letter?`;
  if (issue.type === "punctuation") return `Check the punctuation near ${w}.`;
  if (issue.type === "word choice") return `Is ${w} the right word here?`;
  if (issue.type === "tip") return `${w} could be said more simply or clearly.`;
  if (/AGREEMENT|_SVA|HE_VERB|PLURAL|NON3PRS/i.test(r)) return `Look at ${w}: do the subject and verb agree (singular or plural)?`;
  if (/A_AN|EN_A_VS_AN|DT_|ARTICLE|THE_/i.test(r)) return `Look at ${w}: check “a / an / the”.`;
  if (/PROGRESSIVE|BE_VBG|HAVE_PART|MD_BASEFORM|TENSE|VB/i.test(r)) return `Look at ${w}: check the verb form or tense.`;
  return `Look again at ${w}: something in the grammar is off.`;
}

function coachLocal(){
  const t = TASKS[current], text = $("answer").value;
  if (!$("autoCoach").checked){ $("coachStatus").textContent = "Live hints are off."; return; }
  const ctx = buildCtx(text, t);
  renderChecklist(ctx.checklist);
  if (words(text) < 3){
    $("sentences").innerHTML = `<div class="sub">The coach checks each sentence and tells you where to look. It won't give you the answer.</div>`;
    $("coachTone").textContent = ""; $("coachStatus").textContent = "Start writing, and hints will appear here."; return;
  }
  const issues = (ltIssues && ltText === text) ? ltIssues : null;
  const sents = ctx.sents;
  let flagged = 0;
  const lastOpen = !/[.!?]\s*$/.test(text);
  $("sentences").innerHTML = sents.map((s, i) => {
    const hints = [];
    const isLast = i === sents.length - 1;
    if (issues) issues.filter(x => x.type !== "tip" && x.start >= s.start && x.start < s.end).slice(0,2).forEach(x => hints.push(nudge(x)));
    const n = words(s.text);
    if (n > 30) hints.push("This sentence is long. Can you split it into two?");
    if (/^[a-z]/.test(s.text) && !issues) hints.push("Start the sentence with a capital letter.");
    if (t.label !== "Reply to a message" && INFORMAL.test(s.text)) { INFORMAL.lastIndex = 0; hints.push("Some words are too informal for this task."); }
    INFORMAL.lastIndex = 0;
    if (t.label === "Reply to a message" && FORMAL_IN_CHAT.test(s.text)) hints.push("This sounds too formal for a chat with a friend.");
    ctx.ieTips.forEach(tip => { if (s.text.includes(tip.span)) hints.push(tip.msg.split(".")[0] + "."); });
    const pending = isLast && lastOpen;
    if (hints.length && !pending) flagged++;
    const show = hints.length && !pending;
    return `<div class="sent"><div class="dot ${show?"hint":"ok"}">${show?"!":pending?"…":"✓"}</div><div><div class="txt">${esc(s.text)}</div>${show?hints.map(h=>`<div class="hinttxt">${esc(h)}</div>`).join(""):""}</div></div>`;
  }).join("");

  const toneBits = [];
  if (t.label === "Email" && /^\s*(hello|hi)\b/im.test(text)) toneBits.push("“Hello/Hi” is casual. For the college office, try “Dear Sir/Madam”.");
  if (ctx.copyPct !== null && ctx.copyPct > 25) toneBits.push(`${ctx.copyPct}% is copied from the passage. Try your own words.`);
  if (ctx.offTask) toneBits.push("Your answer doesn't seem to use the task's key ideas yet.");
  $("coachTone").innerHTML = toneBits.map(esc).join(" · ");

  const done = ctx.checklist.filter(c=>c.status==="done").length;
  const pts = ctx.checklist.length ? `${done}/${ctx.checklist.length} points covered · ` : "";
  const state = issues ? "" : (engineState==="local" ? " · basic checks only" : " · grammar check pending…");
  $("coachStatus").textContent = `${pts}${flagged ? flagged + " sentence" + (flagged>1?"s":"") + " to check" : "no issues spotted"}${state}`;
}

function renderChecklist(items){
  $("checklist").innerHTML = items.map(i => `<span class="${i.status}">${i.status==="done"?"✓":"○"} ${esc(i.point)}</span>`).join("");
}

function scheduleLT(){
  clearTimeout(ltTimer);
  if (!$("autoCoach").checked) return;
  const text = $("answer").value;
  if (words(text) < 3) return;
  ltTimer = setTimeout(async () => {
    const snap = $("answer").value;
    const r = await grammarCheck(snap);
    if ($("answer").value === snap){ ltText = snap; ltIssues = r.issues; coachLocal(); }
  }, 2500);
}

/* =========================================================
   Full feedback
   ========================================================= */
$("evalBtn").onclick = async () => {
  const t = TASKS[current], text = $("answer").value;
  if (t.custom && !t.prompt.trim()){ $("out").innerHTML = `<div class="callout warn">Please type the task instructions first.</div>`; return; }
  if (words(text) < 5){ $("out").innerHTML = `<div class="callout warn">Please write at least a few sentences before asking for feedback.</div>`; return; }
  const btn = $("evalBtn"); btn.disabled = true; btn.innerHTML = `<span class="spinner"></span>Checking…`;
  try{
    const g = await grammarCheck(text);
    ltText = text; ltIssues = g.issues; coachLocal();
    renderFeedback(text, t, g); showOnPhone('out');
  } finally { btn.disabled = false; btn.textContent = "Get feedback"; }
};

function renderFeedback(text, t, g){
  const ctx = buildCtx(text, t);
  ctx.errors = g.issues.filter(i => i.type !== "tip");
  ctx.tips = g.issues.filter(i => i.type === "tip");
  const scores = t.criteria.map(([name, key]) => ({name, key, ...SCORERS[key](ctx)}));
  const total = scores.reduce((a,s)=>a+s.score,0);
  const band = total>=14?["Excellent","var(--green-dot)","var(--green-soft)"]:total>=10?["Good","var(--accent)","var(--accent-soft)"]:total>=6?["Developing","var(--amber-dot)","var(--amber-soft)"]:["Beginning","var(--red-dot)","var(--red-soft)"];

  // quick checks
  const chips = [];
  const {min,max} = t;
  chips.push(ctx.n<min ? ["bad",`Too short (${ctx.n}/${min} words)`] : ctx.n>max ? ["mid",`Too long (${ctx.n}/${max} words)`] : ["",`Length OK (${ctx.n} words)`]);
  if (ctx.copyPct !== null) chips.push([ctx.copyPct>40?"bad":ctx.copyPct>20?"mid":"", `Copied from passage: ${ctx.copyPct}%`]);
  chips.push([g.source==="lt"?"":"mid", g.source==="lt" ? "Grammar: LanguageTool" : "Grammar: basic offline checks"]);

  let h = `<div class="checks">${chips.map(([c,m])=>`<span class="chk ${c}">${esc(m)}</span>`).join("")}</div>`;
  if (ctx.offTask) h += `<div class="callout warn"><b>This answer may be off-topic.</b> It uses very few of the task's key words. Check that you answered the question.</div>`;

  h += `<div class="scorecard"><div class="score-head">${ringHTML(total, 16, band[1])}
        <div><div class="band">${band[0]}</div><div class="sub">${esc(t.label)} · ${ctx.n} words</div></div></div>`;
  h += scores.map(s => `<div class="crit"><div><div class="name">${esc(s.name)}</div><div class="bar">${[1,2,3,4].map(k=>`<span class="${k<=s.score?"on":""}"></span>`).join("")}</div><div class="sub">${s.score}/4</div></div><div>${esc(s.reason)}</div></div>`).join("") + `</div>`;

  const strengths = scores.filter(s => s.score >= 3).map(s => `${s.name}: ${s.reason}`);
  if (strengths.length) h += `<div class="section"><h3>What you did well</h3><ul class="clean">${strengths.map(s=>`<li>${esc(s)}</li>`).join("")}</ul></div>`;

  const marks = [...ctx.errors.map((e,i)=>({...e, n:i+1})), ...ctx.tips.map(e=>({...e, n:null}))].sort((a,b)=>a.start-b.start);
  h += `<div class="section"><h3>Your answer</h3><div class="answer-view">${highlight(text, marks)}</div>
        <div class="sub" style="margin-top:6px">Red = grammar or word choice · Yellow = spelling, punctuation or capital letters · Dotted = style tip. Hover over a highlight to see the fix.</div></div>`;

  if (ctx.errors.length){
    h += `<div class="section"><h3>Fix these (${ctx.errors.length})</h3>${ctx.errors.slice(0,12).map((e,i)=>`
      <div class="err ${isSerious(e)?"serious":""}"><div class="n">${i+1}</div><div>
        <span class="tag">${esc(e.type)}</span><br>
        <s>${esc(e.span)}</s>${e.fix&&e.fix.length?` → <span class="fix">${esc(e.fix[0]===""?"(remove)":e.fix[0])}</span>`:""}
        <div class="sub">${esc(e.why)}</div></div></div>`).join("")}${ctx.errors.length>12?`<div class="sub">+${ctx.errors.length-12} more highlighted above.</div>`:""}</div>`;
  }

  const tipList = [...ctx.ieTips.map(x=>x.msg), ...ctx.tips.slice(0,3).map(x=>`“${x.span}”: ${x.why}`)];
  if (ctx.repeated.length) tipList.push(`You repeat some words a lot: ${ctx.repeated.slice(0,3).join(", ")}. Try a synonym.`);
  if (tipList.length) h += `<div class="section"><h3>Tips (not counted as mistakes)</h3><ul class="clean">${tipList.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`;

  const pat = findPattern(ctx.errors);
  if (pat) h += `<div class="callout pattern"><b>Repeated mistake:</b> ${esc(pat)}</div>`;
  const weakest = [...scores].sort((a,b)=>a.score-b.score)[0];
  h += weakest.score === 4 ? `<div class="callout next"><b>Great work.</b> Try a harder task, or add one more example or detail.</div>` : `<div class="callout next"><b>Your next step (${esc(weakest.name)}):</b> ${esc(ADVICE[weakest.key])}</div>`;

  const fixed = applyFixes(text, ctx.errors);
  if (fixed !== text) h += `<div class="section"><details><summary>See your answer with the fixes applied</summary><div class="improved" style="margin-top:8px">${esc(fixed)}</div>
      <div class="sub" style="margin-top:6px">These are automatic fixes for grammar, spelling and punctuation only. Your ideas and structure are unchanged.</div></details></div>`;

  h += `<details class="section settings"><summary>How this was scored</summary><table class="metrics">
      <tr><td>Words / sentences</td><td>${ctx.n} / ${ctx.sents.length}</td></tr>
      <tr><td>Average sentence length</td><td>${ctx.avgLen.toFixed(1)} words</td></tr>
      <tr><td>Mistakes per 100 words</td><td>${(ctx.errors.length*100/Math.max(ctx.n,1)).toFixed(1)}</td></tr>
      <tr><td>Word variety (unique key words)</td><td>${Math.round(ctx.ttr*100)}%</td></tr>
      <tr><td>Linking words used</td><td>${esc(ctx.linkers.join(", ")||"none")}</td></tr>
      ${ctx.copyPct!==null?`<tr><td>Copied from passage (5-word matches)</td><td>${ctx.copyPct}%</td></tr>`:""}
      <tr><td>Checklist points covered</td><td>${ctx.checklist.filter(c=>c.status==="done").length}/${ctx.checklist.length}</td></tr>
      <tr><td>Grammar source</td><td>${g.source==="lt"?"LanguageTool API":"Offline rules"}</td></tr></table></details>`;

  h += `<div class="row" style="margin-top:16px"><button class="ghost" id="copyBtn">Copy feedback as JSON</button><button class="ghost" id="retryBtn">Edit &amp; try again</button></div>`;
  $("out").innerHTML = h;
  $("retryBtn").onclick = () => { $("answer").focus(); $("answer").scrollIntoView({behavior:"smooth",block:"center"}); };
  $("copyBtn").onclick = async () => {
    const payload = {task:t.label, answer:text, total, band:band[0], scores:scores.map(({name,score,reason})=>({name,score,reason})),
      checklist:ctx.checklist, errors:ctx.errors.map(({span,type,fix,why})=>({span,type,fix,why})), pattern:pat, next_step:ADVICE[weakest.key], grammar_source:g.source};
    try{ await navigator.clipboard.writeText(JSON.stringify(payload,null,2)); $("copyBtn").textContent="Copied"; }
    catch{ $("copyBtn").textContent="Copy not allowed here"; }
  };
}

const showOnPhone = id => { if (window.innerWidth < 900) $(id).closest('.card').scrollIntoView({behavior:'smooth', block:'start'}); };
const ringHTML = (total, max, color) => { const c = 2*Math.PI*30, p = max ? Math.min(1, total/max) : 0;
  return `<div class="ring"><svg viewBox="0 0 72 72"><circle cx="36" cy="36" r="30" class="track"/><circle cx="36" cy="36" r="30" class="prog" style="stroke:${color};stroke-dasharray:${(c*p).toFixed(1)} ${c.toFixed(1)}"/></svg><span class="ring-num">${total}<small>/${max}</small></span></div>`; };
const isSerious = e => e.type === "grammar" || e.type === "word choice";

function highlight(text, marks){
  let html = "", pos = 0;
  marks.forEach(m => {
    if (m.start < pos) return;
    html += esc(text.slice(pos, m.start));
    const cls = m.n === null ? "" : isSerious(m) ? "serious" : "";
    const style = m.n === null ? ` style="background:none;border-bottom:2px dotted var(--teal)"` : "";
    const tip = (m.fix && m.fix.length ? "→ " + m.fix[0] + ". " : "") + (m.why || "");
    html += `<mark class="${cls}"${style} title="${esc(tip)}">${esc(text.slice(m.start, m.end))}${m.n?`<sup>${m.n}</sup>`:""}</mark>`;
    pos = m.end;
  });
  return html + esc(text.slice(pos));
}

function applyFixes(text, errs){
  let out = text;
  [...errs].filter(e => e.fix && e.fix.length).sort((a,b)=>b.start-a.start).forEach(e => { out = out.slice(0, e.start) + e.fix[0] + out.slice(e.end); });
  return out;
}

function findPattern(errs){
  const byRule = {}; errs.forEach(e => { if (e.rule) (byRule[e.rule] ||= []).push(e); });
  const rep = Object.values(byRule).filter(a => a.length >= 2).sort((a,b)=>b.length-a.length)[0];
  if (rep) return `You made the same kind of mistake ${rep.length} times (${rep[0].ruleName || rep[0].type}), e.g. “${rep[0].span}” and “${rep[1].span}”. Watch for it in your next answer.`;
  const byType = {}; errs.forEach(e => (byType[e.type] ||= []).push(e));
  const top = Object.entries(byType).filter(([,a]) => a.length >= 3).sort((a,b)=>b[1].length-a[1].length)[0];
  if (top) return `Most of your mistakes are ${top[0]} (${top[1].length}), e.g. “${top[1][0].span}”. Check this first when you revise.`;
  return "";
}

/* =========================================================
   Wire up
   ========================================================= */
$("answer").addEventListener("input", () => { updateCount(); coachLocal(); scheduleLT(); });
$("sampleBtn").onclick = () => { $("answer").value = TASKS[current].sample; updateCount(); coachLocal(); scheduleLT(); };
$("autoCoach").onchange = () => { coachLocal(); scheduleLT(); };
$("ltLang").onchange = () => { ltText = ""; ltIssues = null; scheduleLT(); };
$("ltUrl").onchange = () => { ltText = ""; ltIssues = null; scheduleLT(); };

/* Settings sheet */
const openSheet = () => { $("settingsSheet").hidden = false; setTimeout(()=>$("settingsDone").focus(), 50); };
const closeSheet = () => {
  const s = $("settingsSheet"); if (s.hidden || s.classList.contains("closing")) return;
  s.classList.add("closing");
  setTimeout(() => { s.hidden = true; s.classList.remove("closing"); }, 280);
};
$("settingsBtn").onclick = openSheet; $("settingsDone").onclick = closeSheet;
$("settingsSheet").addEventListener("click", e => { if (e.target.id === "settingsSheet") closeSheet(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("settingsSheet").hidden) closeSheet(); });

renderTabs(); renderPrompt(); updateCount(); coachLocal();


/* ---------- Feedback pop-up: opens once there is feedback ---------- */
(function(){
  const view = $("writeView"), out = $("out"), modal = $("fbModal");
  const isEmpty = () => out.children.length === 1 && out.firstElementChild.classList.contains("empty") && !out.querySelector(".spinner");
  let had = false;
  const open = () => {
    $("fbTitle").textContent = TASKS[current].label;
    const keys = Object.keys(TASKS), i = keys.indexOf(current);
    $("fbNext").textContent = i < keys.length - 1 ? `Next: ${TASKS[keys[i+1]].label} →` : "Back to the first task →";
    view.classList.add("fb-on"); modal.classList.add("show"); modal.setAttribute("aria-hidden","false");
    setTimeout(() => $("fbClose").focus({preventScroll:true}), 60);
  };
  const close = () => { view.classList.remove("fb-on"); modal.classList.remove("show"); modal.setAttribute("aria-hidden","true"); };
  // a short warning (e.g. "write a few sentences first") isn't feedback: show it as a note, keep the pop-up shut
  const note = msg => {
    let n = document.getElementById("inlineNote");
    if (!n){ n = document.createElement("div"); n.id = "inlineNote"; n.className = "inline-note"; n.setAttribute("role","status"); document.body.appendChild(n); }
    n.textContent = msg; n.classList.add("show"); clearTimeout(n._t); n._t = setTimeout(() => n.classList.remove("show"), 3800);
  };
  function sync(){
    if (out.children.length === 1 && out.firstElementChild.matches(".callout.warn")){
      note(out.firstElementChild.textContent.trim());
      out.innerHTML = `<div class="empty">Your feedback will appear here.</div>`;
      return;
    }
    const has = !isEmpty();
    view.classList.toggle("has-fb", has);
    if (has && !had) open();
    if (!has) close();
    had = has;
  }
  new MutationObserver(sync).observe(out, {childList:true});
  $("fbClose").onclick = close;
  $("fbOpen").onclick = open;
  const retry = () => { close(); setTimeout(() => $("answer").focus(), 200); };
  $("fbRetry").onclick = retry;
  out.addEventListener("click", e => { if (e.target.closest("#retryBtn")) retry(); });
  $("fbNext").onclick = () => {
    const keys = Object.keys(TASKS), next = keys[(keys.indexOf(current) + 1) % keys.length];
    close(); document.querySelector(`#tabs .tab[data-k="${next}"]`)?.click();
  };
  modal.addEventListener("click", e => { if (e.target === modal) close(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && modal.classList.contains("show") && $("settingsSheet").hidden) close(); });
  sync();
})();

/* ---------- Phone: task rail opens on tap / hover ---------- */
(function(){
  const rail = document.querySelector(".sidebar"), tb = document.querySelector(".toolbar");
  if (!rail || !tb) return;
  const phone = () => innerWidth < 900;
  const setH = () => document.documentElement.style.setProperty("--tb-h", tb.offsetHeight + "px");
  const open = () => { if (phone()) rail.classList.add("open"); };
  const close = () => rail.classList.remove("open");
  setH(); addEventListener("resize", () => { setH(); if (!phone()) close(); });
  rail.addEventListener("click", e => {
    if (phone() && !rail.classList.contains("open")){ e.preventDefault(); e.stopPropagation(); open(); }
  }, true);
  rail.addEventListener("click", e => { if (phone() && e.target.closest(".tab")) setTimeout(close, 280); });
  document.addEventListener("click", e => { if (rail.classList.contains("open") && !rail.contains(e.target)) close(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  if (matchMedia("(hover:hover)").matches){ rail.addEventListener("mouseenter", open); rail.addEventListener("mouseleave", close); }
})();
