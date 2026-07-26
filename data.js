// Mock data — Batches -> Courses -> {Notes, Chat Groups}
//
// COURSE_CATALOG is just a lookup of available courses (key -> name).
// It does NOT automatically apply to every batch anymore.
// Below, BATCH_COURSES tells you exactly which courses each batch has —
// edit that list whenever a batch's courses change.

const COURSE_CATALOG = {
  dsa:  "Data Structures & Algorithms",
  dbms: "Database Management Systems",
  os:   "Operating Systems",
  cn:   "Computer Networks",
  sedp: "Software Engineering & Design Pattern",
  ai:   "Artificial Intelligence",
  ml:   "Machine Learning",
  web:  "Web Development",
  math: "Discrete Mathematics",
  BiC:  "Bioinformatics Computing",
  CC:   "Compiler Construction",
  toc:  "Theory of Computation",
  bc:   "Business Communication",
  coa:  "Computer Organization & Architecture",
  "mp&i": "Microprocessor & Interfacing",
  cp:   "Competitive Programming",
  "g&va": "Geometry & Vector Analysis",
  oop:  "Object Oriented Programming",
  eecl: "Engineering Ethics and Cyber Law",
  bsp:  "Basic Statistics & Probability",
};

const BATCH_COURSES = {
  58: ["cn", "BiC", "CC"],
  59: ["sedp", "ml", "toc"],
  60: ["coa", "os", "bc"],
  61: ["cp", "dbms", "mp&i", "g&va"],
  62: ["oop", "bsp", "eecl"],
  63: ["dsa", "web", "math"],
  64: ["dbms", "web", "ml"],
  65: ["ai", "ml", "sedp"],
  66: ["dsa", "dbms", "os", "cn", "sedp", "ai"],
};
// ─────────────────────────────────────────────────────────────────────────

const SAMPLE_AUTHORS = ["Riya M.", "Tom K.", "Aisha R.", "Sam O.", "Nadia F.", "Leo P.", "Maya T.", "Dev N.", "Priya S."];

function _sampleNotesFor(courseName, batchNum){
  return [
    {
      title: `${courseName} — Week 1 Recap`,
      author: SAMPLE_AUTHORS[batchNum % SAMPLE_AUTHORS.length],
      date: "Jun 10",
      type: "PDF",
      size: "1.2 MB",
    },
    {
      title: `${courseName} — Practice Questions`,
      author: SAMPLE_AUTHORS[(batchNum + 3) % SAMPLE_AUTHORS.length],
      date: "Jun 14",
      type: "DOCX",
      size: "480 KB",
    },
  ];
}

function _sampleGroupFor(courseName, batchNum){
  const a1 = SAMPLE_AUTHORS[batchNum % SAMPLE_AUTHORS.length];
  const a2 = SAMPLE_AUTHORS[(batchNum + 4) % SAMPLE_AUTHORS.length];
  const initials = courseName.split(" ").filter(w => /^[A-Z]/.test(w)).map(w => w[0]).join("").slice(0, 2) || courseName.slice(0,2).toUpperCase();
  return [{
    name: `${courseName.split(" ")[0]} Study Group`,
    initials: initials.toUpperCase(),
    online: 1 + (batchNum % 5),
    members: 6 + (batchNum % 10),
    last: `${a1}: anyone up for a quick review?`,
    time: "Today",
    messages: [
      { from: "them", author: a1, text: "Hey, is anyone free to go over this week's topic?" },
      { from: "them", author: a2, text: "I'm in — drop your questions here." },
      { from: "me", text: "Sounds good, I'll share my notes in the group." },
    ],
  }];
}

function _buildBatch(num){
  const courseKeys = BATCH_COURSES[num] || [];
  return {
    id: "b" + num,
    name: "Batch " + num,
    courses: courseKeys.map(key => {
      const name = COURSE_CATALOG[key];
      return {
        id: key + "_b" + num,
        name: name,
        notes: [],
        groups: _sampleGroupFor(name, num),
      };
    }),
  };
}

const DATA = {
  batches: []
};
for(let n = 58; n <= 66; n++){
  DATA.batches.push(_buildBatch(n));
}
async function uploadNoteToServer(courseId, file){
  const session = getSession();
  const formData = new FormData();
  formData.append("file", file);
  try{
    const res = await fetch(`${API_URL}/courses/${courseId}/notes`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.token}` },
      body: formData,
    });
    const data = await res.json();
    if(!res.ok) return { ok: false, reason: data.message || "upload failed" };
    return { ok: true, note: data.note, streak: data.streak, notesUploaded: data.notesUploaded };
  }catch(e){ return { ok: false, reason: "network" }; }
}

async function fetchNotesForCourse(courseId){
  try{
    const res = await fetch(`${API_URL}/courses/${courseId}/notes`);
    return res.ok ? res.json() : [];
  }catch(e){ return []; }
}
