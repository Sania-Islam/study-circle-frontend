// Extra functions for notes, batches/courses, and group chat —
// everything else (auth, admin, leaderboard, session) lives in users.js

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
async function deleteNoteFromServer(noteId){
  const session = getSession();
  try{
    const res = await fetch(`${API_URL}/notes/${noteId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session?.token}` },
    });
    return res.ok;
  }catch(e){ return false; }
}
