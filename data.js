// Connected to the real backend (Render) — no localStorage for auth/notes anymore.

const API_URL = "https://study-circle-backend.onrender.com/api";

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

// ── Sign-up / sign-in ─────────────────────────────────────────────────────

async function signUpStudent({ email, studentId, username }){
  try{
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, studentId, username }),
    });
    const data = await res.json();
    if(!res.ok) return { ok: false, reason: data.message || 'error' };
    return { ok: true, user: data.user };
  }catch(e){ return { ok: false, reason: 'network' }; }
}

async function signInStudent(username){
  try{
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
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

// ── Admin actions ────────────────────────────────────────────────────────

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

async function getAllUsers(){
  const session = getSession();
  try{
    const res = await fetch(`${API_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${session?.token}` },
    });
    return res.ok ? res.json() : [];
  }catch(e){ return []; }
}

// ── Leaderboard ─────────────────────────────────────────────────────────

async function getLeaderboard(){
  try{
    const res = await fetch(`${API_URL}/leaderboard`);
    return res.ok ? res.json() : [];
  }catch(e){ return []; }
}

async function recordUpload(username, fileCount){
  return null; // backend updates streaks automatically on real upload now
}

// ── Session helpers ────────────────────────────────────────────────────

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

// ── Notes (real backend now) ───────────────────────────────────────────

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

// ── Batches & courses (real backend) ───────────────────────────────────

async function fetchBatches(){
  try{
    const res = await fetch(`${API_URL}/batches`);
    return res.ok ? res.json() : [];
  }catch(e){ return []; }
}

async function fetchCoursesForBatch(number){
  try{
    const res = await fetch(`${API_URL}/batches/${number}/courses`);
    return res.ok ? res.json() : [];
  }catch(e){ return []; }
}

async function fetchCourseDetail(id){
  try{
    const res = await fetch(`${API_URL}/courses/${id}`);
    return res.ok ? res.json() : null;
  }catch(e){ return null; }
}

// ── Chat groups (real backend) ──────────────────────────────────────────

async function postGroupMessage(courseId, groupId, text){
  const session = getSession();
  try{
    const res = await fetch(`${API_URL}/courses/${courseId}/groups/${groupId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.token}` },
      body: JSON.stringify({ text }),
    });
    return res.ok;
  }catch(e){ return false; }
}
