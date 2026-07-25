// App state + rendering

let activeBatchId = DATA.batches[0].id;
let activeCourseId = null;
let activeTab = "notes";
let activeGroupIndex = null;

const fileIcon = { PDF: "PDF", DOCX: "DOC", IMG: "IMG", FILE: "FILE" };

function classifyFile(file){
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if(ext === "pdf") return "PDF";
  if(["doc","docx","txt"].includes(ext)) return "DOCX";
  if(["png","jpg","jpeg","gif","webp"].includes(ext)) return "IMG";
  return "FILE";
}

function formatSize(bytes){
  if(bytes < 1024) return bytes + " B";
  if(bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function currentUploaderName(){
  try{
    const raw = sessionStorage.getItem("studycircle_session_v2");
    if(raw){
      const session = JSON.parse(raw);
      if(session && session.username) return session.username;
    }
  }catch(err){ /* ignore */ }
  return "You";
}

function todayLabel(){
  return new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getBatch(id){ return DATA.batches.find(b => b.id === id); }
function getCourse(batchId, courseId){
  return getBatch(batchId).courses.find(c => c.id === courseId);
}

function renderSidebar(){
  const container = document.getElementById("batchContainer");
  container.innerHTML = "";

  DATA.batches.forEach(batch => {
    const isActiveBatch = batch.id === activeBatchId;

    const batchEl = document.createElement("div");
    batchEl.className = "batch-item" + (isActiveBatch ? " active" : "");
    batchEl.innerHTML = `<span>${batch.name}</span><span class="batch-chevron">${isActiveBatch ? "▾" : "▸"}</span>`;
    batchEl.onclick = () => {
      activeBatchId = batch.id;
      activeCourseId = null;
      renderSidebar();
      renderMain();
    };
    container.appendChild(batchEl);

    const courseList = document.createElement("div");
    courseList.className = "course-list" + (isActiveBatch ? " open" : "");
    batch.courses.forEach(course => {
      const cEl = document.createElement("div");
      cEl.className = "course-item" + (course.id === activeCourseId ? " active" : "");
      cEl.textContent = course.name;
      cEl.onclick = (e) => {
        e.stopPropagation();
        activeBatchId = batch.id;
        activeCourseId = course.id;
        activeGroupIndex = null;
        renderSidebar();
        renderMain();
      };
      courseList.appendChild(cEl);
    });
    container.appendChild(courseList);
  });
}

function renderMain(){
  const crumbCourse = document.getElementById("crumbCourse");
  const courseTitle = document.getElementById("courseTitle");
  const crumb = document.getElementById("crumb");

  if(!activeCourseId){
    crumb.innerHTML = `<b>${getBatch(activeBatchId).name}</b>`;
    courseTitle.textContent = "Select a course to get started";
    document.getElementById("notesGrid").innerHTML = `<div class="empty-state">Pick a course from the sidebar to see notes and study groups.</div>`;
    document.getElementById("groupList").innerHTML = "";
    document.getElementById("chatWindow").style.display = "none";
    return;
  }

  const course = getCourse(activeBatchId, activeCourseId);
  crumb.innerHTML = `${getBatch(activeBatchId).name} &nbsp;/&nbsp; <b>${course.name}</b>`;
  courseTitle.textContent = course.name;

  renderNotes(course);
  renderGroups(course);
}

function renderNotes(course){
  const grid = document.getElementById("notesGrid");
  grid.innerHTML = "";
  if(course.notes.length === 0){
    grid.innerHTML = `<div class="empty-state">No notes shared in this course yet — be the first to upload one!</div>`;
    return;
  }
  course.notes.forEach(note => {
    const card = document.createElement("div");
    card.className = "note-card";
    card.innerHTML = `
      <div class="note-icon">${fileIcon[note.type] || "FILE"}</div>
      <div class="note-title">${note.title}</div>
      <div class="note-meta">${note.author} &middot; ${note.date} &middot; ${note.size}</div>
      <div class="note-foot">
        <span class="tag">${note.type}</span>
        <div style="display:flex; gap:6px;">
          <button class="btn-dl btn-view">View</button>
          <button class="btn-dl">Download</button>
        </div>
      </div>
    `;
    card.querySelector(".btn-view").addEventListener("click", () => viewNote(note));
    card.querySelector(".btn-dl:not(.btn-view)").addEventListener("click", () => downloadNote(note));
    grid.appendChild(card);
  });
}

function viewNote(note){
  if(note._fileObj){
    const url = URL.createObjectURL(note._fileObj);
    window.open(url, "_blank");
    // Don't revoke immediately — the new tab needs the URL to stay valid
    // while it's open. It'll be cleaned up when the tab/page closes.
  } else {
    showUploadToast(`"${note.title}" is a sample note in this prototype — no real file is attached.`);
  }
}

function downloadNote(note){
  if(note._fileObj){
    const url = URL.createObjectURL(note._fileObj);
    const a = document.createElement("a");
    a.href = url;
    a.download = note.title;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else {
    showUploadToast(`"${note.title}" is a sample note in this prototype — no real file is attached.`);
  }
}

function renderGroups(course){
  const list = document.getElementById("groupList");
  list.innerHTML = "";
  if(course.groups.length === 0){
    list.innerHTML = `<div class="empty-state">No study groups here yet — check back soon.</div>`;
  }
  course.groups.forEach((group, idx) => {
    const card = document.createElement("div");
    card.className = "group-card";
    card.innerHTML = `
      <div class="group-avatar">${group.initials}</div>
      <div class="group-info">
        <div class="group-name">${group.name}</div>
        <div class="group-last">${group.last}</div>
      </div>
      <div class="group-meta">
        <div class="group-time">${group.time}</div>
        <div class="member-count"><span class="online-dot"></span>${group.online} online &middot; ${group.members} members</div>
      </div>
    `;
    card.onclick = () => openChat(course, idx);
    list.appendChild(card);
  });

  if(activeGroupIndex !== null && course.groups[activeGroupIndex]){
    openChat(course, activeGroupIndex, true);
  } else {
    document.getElementById("chatWindow").style.display = "none";
  }
}

function openChat(course, idx, skipRerender){
  activeGroupIndex = idx;
  const group = course.groups[idx];
  const win = document.getElementById("chatWindow");
  win.style.display = "block";
  document.getElementById("chatAvatar").textContent = group.initials;
  document.getElementById("chatGroupName").textContent = group.name;
  document.getElementById("chatGroupSub").innerHTML = `<span class="online-dot"></span>${group.online} online &middot; ${group.members} members`;

  const body = document.getElementById("chatBody");
  body.innerHTML = "";
  group.messages.forEach(m => {
    const div = document.createElement("div");
    div.className = "msg " + m.from;
    div.innerHTML = (m.from === "them" ? `<div class="msg-author">${m.author}</div>` : "") +
      `<div class="msg-bubble">${m.text}</div>`;
    body.appendChild(div);
  });
  body.scrollTop = body.scrollHeight;

  if(!skipRerender) win.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function sendMessage(){
  if(!activeCourseId || activeGroupIndex === null) return;
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if(!text) return;
  const course = getCourse(activeBatchId, activeCourseId);
  course.groups[activeGroupIndex].messages.push({ from: "me", text });
  course.groups[activeGroupIndex].last = "You: " + text;
  input.value = "";
  renderGroups(course);
  document.getElementById("chatInput").focus();
}

// Tabs
document.getElementById("tabRow").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab-btn");
  if(!btn) return;
  activeTab = btn.dataset.tab;
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b === btn));
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  document.getElementById("panel-" + activeTab).classList.add("active");
});

document.getElementById("sendBtn").onclick = sendMessage;
document.getElementById("chatInput").addEventListener("keydown", (e) => {
  if(e.key === "Enter") sendMessage();
});

// File upload: click-to-pick + drag & drop, both add real note cards
const uploadZone = document.getElementById("uploadZone");
const fileInput = document.getElementById("fileInput");
const uploadToast = document.getElementById("uploadToast");

function showUploadToast(message){
  uploadToast.textContent = message;
  uploadToast.classList.add("show");
  clearTimeout(showUploadToast._t);
  showUploadToast._t = setTimeout(() => uploadToast.classList.remove("show"), 3200);
}

function handleFiles(fileList){
  if(!activeCourseId){
    showUploadToast("Pick a course first, then upload a note to it.");
    return;
  }
  const files = Array.from(fileList || []);
  if(files.length === 0) return;

  const course = getCourse(activeBatchId, activeCourseId);
  const uploader = currentUploaderName();
  const dateLabel = todayLabel();

  files.forEach(file => {
    course.notes.unshift({
      title: file.name,
      author: uploader,
      date: dateLabel,
      type: classifyFile(file),
      size: formatSize(file.size),
      _fileObj: file, // kept in memory so "Download" can retrieve the real file this session
    });
  });

  renderNotes(course);

  const uploaderUsername = (() => {
    try{
      const raw = sessionStorage.getItem("studycircle_session_v2");
      if(raw){
        const session = JSON.parse(raw);
        if(session && session.role === "student") return session.username;
      }
    }catch(err){ /* ignore */ }
    return null;
  })();

  let streakNote = "";
  if(uploaderUsername && typeof recordUpload === "function"){
    const updated = recordUpload(uploaderUsername, files.length);
    if(updated){
      streakNote = ` You're on a ${updated.currentStreak}-day streak — ${updated.notesUploaded} notes total.`;
      const streakNum = document.getElementById("streakNum");
      const streakNotesCount = document.getElementById("streakNotesCount");
      if(streakNum) streakNum.textContent = updated.currentStreak || 0;
      if(streakNotesCount) streakNotesCount.textContent = (updated.notesUploaded || 0) + " notes shared";
    }
  }

  showUploadToast((files.length === 1
    ? `"${files[0].name}" was added to ${course.name}.`
    : `${files.length} files were added to ${course.name}.`) + streakNote);
}

uploadZone.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", (e) => {
  handleFiles(e.target.files);
  fileInput.value = ""; // allow re-uploading the same file name later
});

["dragenter", "dragover"].forEach(evt => {
  uploadZone.addEventListener(evt, (e) => {
    e.preventDefault();
    uploadZone.classList.add("drag-over");
  });
});

["dragleave", "drop"].forEach(evt => {
  uploadZone.addEventListener(evt, (e) => {
    e.preventDefault();
    uploadZone.classList.remove("drag-over");
  });
});

uploadZone.addEventListener("drop", (e) => {
  if(e.dataTransfer && e.dataTransfer.files){
    handleFiles(e.dataTransfer.files);
  }
});

// Init
renderSidebar();
renderMain();
