// Connected to the real backend now (Render), instead of localStorage.
// IMPORTANT: functions that talk to the server are now `async` — anywhere
// that CALLS these functions must use `await` in front of them now.
// e.g. old:  const user = signInStudent(username);
//     new:  const user = await signInStudent(username);

const API_URL = "https://study-circle-backend.onrender.com/api";

// Two fixed admin accounts (just for showing labels in the UI —
// the real password check now happens on the server)
const ADMINS = [
  { username: 'admin1', email: 'admin1@studycircle.app', role: 'admin', label: 'Admin One' },
  { username: 'admin2', email: 'admin2@studycircle.app', role: 'admin', label: 'Admin Two' },
];

function isAdminUsername(username){
  return ADMINS.some(a => a.username.toLowerCase() === username.toLowerCase());
}
function getAdmin(username){
  return ADMINS.find(a => a.username.toLowerCase() === username.toLowerCase()) || null;
}

// Checks the admin password against the server. Returns true/false, same as before.
// On success, it also saves the login token for you (needed for admin actions later).
async function checkAdminPassword(username, password){
  try{
    const res = await fetch(`${API_URL}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if(!res.ok) return false;
    const data = await res.json();
    setSession({ token: data.token, username: data.username, role: 'admin' });
    return true;
  }catch(e){ return false; }
}

// ── Sign-up / sign-in ─────────────────────────────────────────────────────────

async function signUpStudent({ email, studentId, username, password }){
  try{
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, studentId, username, password }),
    });
    const data = await res.json();
    if(!res.ok) return { ok: false, reason: data.message || 'error' };
    return { ok: true, user: data.user };
  }catch(e){ return { ok: false, reason: 'network' }; }
}

// Returns: the user object if approved (and logs them in),
// null if no account exists with that username,
// or { status: 'pending' | 'rejected' } if they signed up but aren't approved yet.
async function signInStudent(username, password){
  try{
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if(res.status === 404) return null;

    if(res.ok){
      setSession({ token: data.token, username: data.user.username, role: 'student' });
      return { ...data.user, status: 'approved' };
    }

    return { status: data.status };
  }catch(e){ return null; }
}

// ── Admin actions (require being logged in as admin - uses the saved token) ──

async function approveUser(username){
  const session = getSession();
  await fetch(`${API_URL}/admin/users/${username}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session?.token}` },
  });
}

async function rejectUser(username){
  const session = getSession();
  await fetch(`${API_URL}/admin/users/${username}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session?.token}` },
  });
}

async function removeUser(username){
  const session = getSession();
  await fetch(`${API_URL}/admin/users/${username}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${session?.token}` },
  });
}

// Gets the full list of students (for the admin panel to show pending/approved/rejected)
async function getAllUsers(){
  const session = getSession();
  try{
    const res = await fetch(`${API_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${session?.token}` },
    });
    return res.ok ? res.json() : [];
  }catch(e){ return []; }
}

// ── Leaderboard ────────────────────────────────────────────────────────────────

async function getLeaderboard(){
  try{
    const res = await fetch(`${API_URL}/leaderboard`);
    return res.ok ? res.json() : [];
  }catch(e){ return []; }
}

// NOTE: the backend now updates notesUploaded/streaks automatically whenever
// a note is actually uploaded through the file-upload endpoint. This function
// is no longer needed for that — it's kept here as a harmless no-op so nothing
// crashes if some other file still calls it. We'll clean up those old calls
// when we update the notes/upload code together.
async function recordUpload(username, fileCount){
  return null;
}

// ── Session helpers (unchanged - just remembers who's logged in + their token) ─

function setSession(payload){
  try{ sessionStorage.setItem('studycircle_session_v2', JSON.stringify(payload)); }catch(e){}
}
function getSession(){
  try{ const r = sessionStorage.getItem('studycircle_session_v2'); return r ? JSON.parse(r) : null; }
  catch(e){ return null; }
}
function clearSession(){
  try{ sessionStorage.removeItem('studycircle_session_v2'); }catch(e){}
}

// ── ⚠️ Not connected yet: note submission / approval ───────────────────────────
// Your notes-approval system (submitNote, approveNote, etc.) needs a matching
// feature on the backend that doesn't exist yet (the backend currently
// publishes notes immediately, with no pending/approval step). We'll add that
// to the backend AND update this section together when we get to app.js /
// the notes-uploading code, so nothing breaks in between. Leaving your
// original localStorage-based functions below untouched for now.

const NOTES_KEY = 'studycircle_notes_v1';

function loadSubmittedNotes(){
  try{ const r = localStorage.getItem(NOTES_KEY); return r ? JSON.parse(r) : []; }
  catch(e){ return []; }
}
function _saveSubmittedNotes(list){
  try{ localStorage.setItem(NOTES_KEY, JSON.stringify(list)); }catch(e){}
}
function submitNote({ batchId, courseId, title, author, authorUsername, authorRole, date, type, size }){
  const list = loadSubmittedNotes();
  const note = {
    id: 'n' + Date.now() + '_' + Math.floor(Math.random() * 100000),
    batchId, courseId, title, author, authorUsername, authorRole,
    date, type, size,
    status: authorRole === 'admin' ? 'approved' : 'pending',
    submittedAt: new Date().toISOString(),
  };
  list.push(note);
  _saveSubmittedNotes(list);
  return note;
}
function getApprovedNotesForCourse(batchId, courseId){
  return loadSubmittedNotes().filter(n => n.batchId === batchId && n.courseId === courseId && n.status === 'approved');
}
function getOwnNotesForCourse(batchId, courseId, username){
  return loadSubmittedNotes().filter(n => n.batchId === batchId && n.courseId === courseId && n.authorUsername === username);
}
function getPendingNotes(){
  return loadSubmittedNotes().filter(n => n.status === 'pending');
}
function approveNote(id){
  const list = loadSubmittedNotes();
  const n = list.find(x => x.id === id);
  if(n){ n.status = 'approved'; _saveSubmittedNotes(list); }
}
function rejectNote(id){
  const list = loadSubmittedNotes();
  const n = list.find(x => x.id === id);
  if(n){ n.status = 'rejected'; _saveSubmittedNotes(list); }
}
function removeSubmittedNote(id){
  _saveSubmittedNotes(loadSubmittedNotes().filter(x => x.id !== id));
}
