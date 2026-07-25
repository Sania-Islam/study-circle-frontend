// Community "Ask Anything" study-help chat.
// One shared board for every signed-in user — students and admins alike.
// Backed by localStorage, same pattern as users.js, so it persists across
// pages/tabs on this browser. Frontend-only prototype: it will not sync
// across different browsers or devices, only across tabs on one machine.

const COMMUNITY_KEY = 'studycircle_community_v1';

function loadCommunityMessages(){
  try{ const r = localStorage.getItem(COMMUNITY_KEY); return r ? JSON.parse(r) : []; }
  catch(e){ return []; }
}

function _saveCommunityMessages(list){
  try{ localStorage.setItem(COMMUNITY_KEY, JSON.stringify(list)); }catch(e){}
}

function postCommunityMessage({ username, role, text }){
  if(!username || !text || !text.trim()) return null;
  const list = loadCommunityMessages();
  const msg = {
    id: 'm' + Date.now() + '_' + Math.floor(Math.random() * 100000),
    username,
    role,
    text: text.trim().slice(0, 1000),
    createdAt: new Date().toISOString(),
  };
  list.push(msg);
  _saveCommunityMessages(list);
  return msg;
}

// Callers must check session.role === 'admin' themselves before calling this —
// see the guard in community.html.
function deleteCommunityMessage(id){
  _saveCommunityMessages(loadCommunityMessages().filter(m => m.id !== id));
}

function seedCommunityDemoData(){
  const SEED_FLAG = 'studycircle_community_seeded_v1';
  try{
    if(localStorage.getItem(SEED_FLAG)) return;
    localStorage.setItem(SEED_FLAG, '1');
  }catch(e){ return; }
  if(loadCommunityMessages().length > 0) return;

  _saveCommunityMessages([
    { id: 'seed1', username: 'riya_m', role: 'student',
      text: "Hey everyone! Does anyone have good resources for revising B-trees before the DBMS exam?",
      createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 'seed2', username: 'admin1', role: 'admin',
      text: "Reminder: keep discussion here course-related and respectful. Happy studying!",
      createdAt: new Date(Date.now() - 1800000).toISOString() },
    { id: 'seed3', username: 'sam_o', role: 'student',
      text: "Can someone explain the difference between TCP and UDP in simple terms?",
      createdAt: new Date(Date.now() - 600000).toISOString() },
  ]);
}
seedCommunityDemoData();
