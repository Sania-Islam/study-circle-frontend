// App state + rendering

let batchesData = [];
let activeBatchNumber = null;
let activeCourseId = null;
let activeCourseDetail = null;
let activeTab = "notes";
let activeGroupIndex = null;

const fileIcon = { PDF: "PDF", DOCX: "DOC", IMG: "IMG", FILE: "FILE" };

function formatDate(dateStr){
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

async function initApp(){
  batchesData = await fetchBatches();
  if(batchesData.length){
    activeBatchNumber = batchesData[0].number;
    batchesData[0].courses = await fetchCoursesForBatch(activeBatchNumber);
  }
  renderSidebar();
  renderMain();
}

function renderSidebar(){
  const container = document.getElementById("batchContainer");
  container.innerHTML = "";

  batchesData.forEach(batch => {
    const isActiveBatch = batch.number === activeBatchNumber;

    const batchEl = document.createElement("div");
    batchEl.className = "batch-item" + (isActiveBatch ? " active" : "");
    batchEl.innerHTML = `<span>${batch.name}</span><span class="batch-chevron">${isActiveBatch ? "▾" : "▸"}</span>`;
    batchEl.onclick = async () => {
      activeBatchNumber = batch.number;
      activeCourseId = null;
      activeCourseDetail = null;
      if(!batch.courses){
        batch.courses = await fetchCoursesForBatch(batch.number);
      }
      renderSidebar();
      renderMain();
    };
    container.appendChild(batchEl);

    const courseList = document.createElement("div");
    courseList.className = "course-list" + (isActiveBatch ? " open" : "");
    (batch.courses || []).forEach(course => {
      const cEl = document.createElement("div");
      cEl.className = "course-item" + (course._id === activeCourseId ? " active" : "");
      cEl.textContent = course.name;
      cEl.onclick = async (e) => {
        e.stopPropagation();
        activeBatchNumber = batch.number;
        activeCourseId = course._id;
        activeGroupIndex = null;
        renderSidebar();
        await openCourse(course._id);
      };
      courseList.appendChild(cEl);
    });
    container.appendChild(courseList);
  });
}

async function openCourse(courseId){
  activeCourseDetail = await fetchCourseDetail(courseId);
  renderMain();
}

function renderMain(){
  const crumb = document.getElementById("crumb");
  const courseTitle = document.getElementById("courseTitle");
  const activeBatch = batchesData.find(b => b.number === activeBatchNumber);

  if(!activeCourseId || !activeCourseDetail){
    crumb.innerHTML = `<b>${activeBatch ? activeBatch.name : ""}</b>`;
    courseTitle.textContent = "Select a course to get started";
    document.getElementById("notesGrid").innerHTML = `<div class="empty-state">Pick a course from the sidebar to see notes and study groups.</div>`;
    document.getElementById("groupList").innerHTML = "";
    document.getElementById("chatWindow").style.display = "none";
    return;
  }

  const course = activeCourseDetail;
  crumb.innerHTML = `Batch ${course.batchNumber} &nbsp;/&nbsp; <b>${course.name}</b>`;
  courseTitle.textContent = course.name;

  renderNotes(course);
  renderGroups(course);
}

function renderNotes(course){
  const grid = document.getElementById("notesGrid");
  grid.innerHTML = "";
  const notes = course.notes || [];
  if(notes.length === 0){
    grid.innerHTML = `<div class="empty-state">No notes shared in this course yet — be the first to upload one!</div>`;
    return;
  }
  notes.forEach(note => {
    const card = document.createElement("div");
    card.className = "note-card";
    card.innerHTML = `
      <div class="note-icon">${fileIcon[note.type] || "FILE"}</div>
      <div class="note-title">${note.title}</div>
      <div class="note-meta">${note.author} &middot; ${formatDate(note.createdAt)} &middot; ${note.size}</div>
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
  if(note.fileUrl){
    window.open(note.fileUrl, "_blank");
  } else {
    showUploadToast(`"${note.title}" has no file attached.`);
  }
}

function downloadNote(note){
  if(note.fileUrl){
    const a = document.createElement("a");
    a.href = note.fileUrl;
    a.download = note.title;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    showUploadToast(`"${note.title}" has no file attached.`);
  }
}

function renderGroups(course){
  const list = document.getElementById("groupList");
  list.innerHTML = "";
  const groups = course.groups || [];
  if(groups.length === 0){
    list.innerHTML = `<div class="empty-state">No study groups here yet — check back soon.</div>`;
  }
  groups.forEach((group, idx) => {
    const lastMsg = group.messages && group.messages.length ? group.messages[group.messages.length - 1] : null;
    const card = document.createElement("div");
    card.className = "group-card";
    card.innerHTML = `
      <div class="group-avatar">${group.initials}</div>
      <div class="group-info">
        <div class="group-name">${group.name}</div>
        <div class="group-last">${lastMsg ? lastMsg.username + ": " + lastMsg.text : "No messages yet"}</div>
      </div>
      <div class="group-meta">
        <div class="group-time">${lastMsg ? formatDate(lastMsg.createdAt) : ""}</div>
        <div class="member-count">${(group.members || []).length} members</div>
      </div>
    `;
    card.onclick = () => openChat(course, idx);
    list.appendChild(card);
  });

  if(activeGroupIndex !== null && groups[activeGroupIndex]){
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
  document.getElementById("chatGroupSub").innerHTML = `${(group.members || []).length} members`;

  const session = getSession();
  const myUsername = session ? session.username : null;

  const body = document.getElementById("chatBody");
  body.innerHTML = "";
  (group.messages || []).forEach(m => {
    const isMe = m.username === myUsername;
    const div = document.createElement("div");
    div.className = "msg " + (isMe ? "me" : "them");
    div.innerHTML = (!isMe ? `<div class="msg-author">${m.username}</div>` : "") +
      `<div class="msg-bubble">${m.text}</div>`;
    body.appendChild(div);
  });
  body.scrollTop = body.scrollHeight;

  if(!skipRerender) win.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function sendMessage(){
  if(!activeCourseId || activeGroupIndex === null || !activeCourseDetail) return;
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if(!text) return;
  const group = activeCourseDetail.groups[activeGroupIndex];
  input.value = "";
  await postGroupMessage(activeCourseId, group._id, text);
  activeCourseDetail = await fetchCourseDetail(activeCourseId);
  renderGroups(activeCourseDetail);
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

// File upload
const uploadZone = document.getElementById("uploadZone");
const fileInput = document.getElementById("fileInput");
const uploadToast = document.getElementById("uploadToast");

function showUploadToast(message){
  uploadToast.textContent = message;
  uploadToast.classList.add("show");
  clearTimeout(showUploadToast._t);
  showUploadToast._t = setTimeout(() => uploadToast.classList.remove("show"), 3200);
}

async function handleFiles(fileList){
  if(!activeCourseId){
    showUploadToast("Pick a course first, then upload a note to it.");
    return;
  }
  const files = Array.from(fileList || []);
  if(files.length === 0) return;

  for(const file of files){
    const result = await uploadNoteToServer(activeCourseId, file);
    if(!result.ok){
      showUploadToast(`Failed to upload "${file.name}": ${result.reason}`);
      continue;
    }
    let streakNote = "";
    if(result.streak){
      streakNote = ` You're on a ${result.streak}-day streak — ${result.notesUploaded} notes total.`;
      const streakNum = document.getElementById("streakNum");
      const streakNotesCount = document.getElementById("streakNotesCount");
      if(streakNum) streakNum.textContent = result.streak;
      if(streakNotesCount) streakNotesCount.textContent = result.notesUploaded + " notes shared";
    }
    showUploadToast(`"${file.name}" was added.${streakNote}`);
  }

  activeCourseDetail = await fetchCourseDetail(activeCourseId);
  renderNotes(activeCourseDetail);
}

uploadZone.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", (e) => {
  handleFiles(e.target.files);
  fileInput.value = "";
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
initApp();
