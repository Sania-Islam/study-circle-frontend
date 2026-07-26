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
