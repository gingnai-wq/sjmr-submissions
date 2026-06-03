// SJMR Student Submission Portal - Client Side JavaScript

// API endpoints helper
const API = {
  getStudentInfo: (id) => fetch(`/api/student/${id}`).then(r => r.json()),
  getAssignments: () => fetch('/api/assignments').then(r => r.json()),
  getSubmissions: () => fetch('/api/submissions').then(r => r.json()),
  getStudentsList: () => fetch('/api/students').then(r => r.json()),
  
  createAssignment: (data) => fetch('/api/assignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),

  gradeSubmission: (data) => fetch('/api/grade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),

  quickGrade: (data) => fetch('/api/quick-grade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),

  exportExcel: () => fetch('/api/export', { method: 'POST' }).then(r => r.json()),
  syncSheets: () => fetch('/api/sync-sheets', { method: 'POST' }).then(r => r.json())
};

// Global App State
let state = {
  currentView: 'student', // student | teacher
  studentAuthenticated: false,
  studentData: null,
  studentSubmissions: [],
  assignments: [],
  submissions: [], // For teacher dashboard
  students: [], // For teacher directory
  selectedFile: null,
  autoRouteAssignmentId: null // From URL query ?assign=AXXX
};

// HTML5-QR Code Scanner variables
let studentScanner = null;
let teacherScanner = null;
let isTeacherScannerActive = false;
let scannerCooldown = false;
let hudTimeoutId = null;

// DOM Elements
const btnStudentMode = document.getElementById('btn-student-mode');
const btnTeacherMode = document.getElementById('btn-teacher-mode');
const studentView = document.getElementById('student-view');
const teacherView = document.getElementById('teacher-view');

const studentAuthCard = document.getElementById('student-auth-card');
const studentDashboard = document.getElementById('student-dashboard');
const studentLoginForm = document.getElementById('student-login-form');
const studentIdInput = document.getElementById('student-id-input');

const studentAvatarLetter = document.getElementById('student-avatar-letter');
const studentNameDisplay = document.getElementById('student-name-display');
const studentClassDisplay = document.getElementById('student-class-display');
const studentIdDisplay = document.getElementById('student-id-display');
const studentEmailDisplay = document.getElementById('student-email-display');
const btnStudentLogout = document.getElementById('btn-student-logout');
const studentAssignmentsGrid = document.getElementById('student-assignments-grid');
const assignmentCount = document.getElementById('assignment-count');

// Teacher Elements
const statTotalStudents = document.getElementById('stat-total-students');
const statTotalAssignments = document.getElementById('stat-total-assignments');
const statTotalSubmissions = document.getElementById('stat-total-submissions');
const statGradedSubmissions = document.getElementById('stat-graded-submissions');
const submissionsTableBody = document.getElementById('submissions-table-body');
const teacherSearch = document.getElementById('teacher-search');
const filterClass = document.getElementById('filter-class');
const filterAssignment = document.getElementById('filter-assignment');
const createAssignmentForm = document.getElementById('create-assignment-form');
const btnImportExcel = document.getElementById('btn-import-excel');
const btnExportExcel = document.getElementById('btn-export-excel');
const btnSyncSheets = document.getElementById('btn-sync-sheets');

// Scanners
const btnScanStudentId = document.getElementById('btn-scan-student-id');
const studentScannerModal = document.getElementById('student-scanner-modal');
const btnCloseStudentScanner = document.getElementById('btn-close-student-scanner');
const studentLaserLine = document.getElementById('student-laser-line');

const btnToggleTeacherScanner = document.getElementById('btn-toggle-teacher-scanner');
const scanAssignSelect = document.getElementById('scan-assign-select');
const scanScoreInput = document.getElementById('scan-score-input');
const teacherLaserLine = document.getElementById('laser-line');
const lastScannedResult = document.getElementById('last-scanned-result');
const lastScannedText = document.getElementById('last-scanned-text');

// HUD elements (5-Seconds Display)
const scanHudOverlay = document.getElementById('scan-hud-overlay');
const hudStudentPhoto = document.getElementById('hud-student-photo');
const hudStudentName = document.getElementById('hud-student-name');
const hudStudentId = document.getElementById('hud-student-id');
const hudStudentClass = document.getElementById('hud-student-class');
const hudStudentScore = document.getElementById('hud-student-score');
const hudProgressBar = document.getElementById('hud-progress-bar');

// Simulator elements
const btnTriggerSimScan = document.getElementById('btn-trigger-sim-scan');
const simIdInput = document.getElementById('sim-id-input');

// Modals
const submitModal = document.getElementById('submit-modal');
const passwordModal = document.getElementById('password-modal');
const gradeModal = document.getElementById('grade-modal');
const studentEditModal = document.getElementById('student-edit-modal');
const studentEditForm = document.getElementById('student-edit-form');

// Close buttons for modals (updated to be generic and support all modals including the edit modal)
document.querySelectorAll('.btn-close-modal, .btn-close-modal-btn, .btn-close-pwd-modal, .btn-close-pwd-modal-btn, .btn-close-grade-modal, .btn-close-grade-modal-btn, .btn-close-edit-modal-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const modal = e.currentTarget.closest('.modal-overlay');
    if (modal) closeModal(modal);
  });
});

// Sound Synthesizer using Web Audio API
function playBeep(type = 'success') {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'success') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime); // 1000Hz
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12);
    } else if (type === 'error') {
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(220, audioCtx.currentTime); // 220Hz buzzer
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.35);
    }
  } catch (e) {
    console.error('AudioContext error:', e);
  }
}

// Toast system
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'fa-circle-info';
  if (type === 'success') icon = 'fa-circle-check';
  if (type === 'error') icon = 'fa-circle-xmark';
  
  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Modal open/close helpers
function openModal(modal) {
  modal.classList.add('active');
}
function closeModal(modal) {
  modal.classList.remove('active');
  if (modal === submitModal) {
    resetSubmitForm();
  }
}

// ================= ROUTING & PARAMETERS =================

// Parse query params on load
function checkQueryParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const assignParam = urlParams.get('assign');
  if (assignParam) {
    state.autoRouteAssignmentId = assignParam;
    console.log(`Auto routing detected for assignment: ${assignParam}`);
  }
}

// ================= VIEW SWITCHING & AUTH =================

// Initialize views
function switchView(view) {
  // If leaving teacher mode, stop camera scanner
  if (state.currentView === 'teacher' && isTeacherScannerActive) {
    stopTeacherScanner();
  }

  if (view === 'student') {
    state.currentView = 'student';
    btnStudentMode.classList.add('active');
    btnTeacherMode.classList.remove('active');
    studentView.classList.add('active');
    teacherView.classList.remove('active');
  } else if (view === 'teacher') {
    state.currentView = 'teacher';
    btnTeacherMode.classList.add('active');
    btnStudentMode.classList.remove('active');
    teacherView.classList.add('active');
    studentView.classList.remove('active');
    loadTeacherDashboard();
  }
}

// Toggle listener
btnStudentMode.addEventListener('click', () => {
  switchView('student');
});

btnTeacherMode.addEventListener('click', () => {
  openModal(passwordModal);
  document.getElementById('pwd-input').value = '';
  document.getElementById('pwd-input').focus();
});

// Teacher password validation
document.getElementById('pwd-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const password = document.getElementById('pwd-input').value;
  if (password === '1234') { // Default Teacher Password
    closeModal(passwordModal);
    showToast('เข้าสู่ระบบครูสำเร็จ', 'success');
    switchView('teacher');
  } else {
    showToast('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่', 'error');
  }
});

// ================= STUDENT WORKFLOW =================

// Student ID login logic
async function loginStudent(studentId) {
  try {
    const res = await API.getStudentInfo(studentId);
    if (res.success) {
      state.studentAuthenticated = true;
      state.studentData = res.student;
      state.studentSubmissions = res.submissions;
      
      // Update displays
      const studentAvatarContainer = document.querySelector('.profile-avatar');
      const avatarSrc = res.student.Photo ? res.student.Photo : `https://api.dicebear.com/7.x/adventurer/svg?seed=${res.student.Student_ID}`;
      studentAvatarContainer.innerHTML = `<img src="${avatarSrc}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
      studentNameDisplay.textContent = res.student.FullName;
      studentClassDisplay.textContent = `ชั้นเรียน: ${res.student.Class}`;
      studentIdDisplay.textContent = res.student.Student_ID;
      studentEmailDisplay.textContent = res.student.Email || '-';
      
      // Switch layouts
      studentAuthCard.classList.add('hidden');
      studentDashboard.classList.remove('hidden');
      
      // Fetch assignments and render
      await loadStudentAssignments();
      showToast(`ยินดีต้อนรับ ${res.student.FullName}`, 'success');

      // Auto-trigger assignment modal if requested via URL params
      if (state.autoRouteAssignmentId) {
        setTimeout(() => {
          const matchingBtn = document.querySelector(`.btn-submit-trigger[data-id="${state.autoRouteAssignmentId}"]`);
          if (matchingBtn) {
            matchingBtn.click();
            state.autoRouteAssignmentId = null;
          }
        }, 500);
      }
    } else {
      showToast(res.message, 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
  }
}

// Submit Login Form
studentLoginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const studentId = studentIdInput.value.trim();
  if (studentId) loginStudent(studentId);
});

// Logout Student
btnStudentLogout.addEventListener('click', () => {
  state.studentAuthenticated = false;
  state.studentData = null;
  state.studentSubmissions = [];
  studentIdInput.value = '';
  
  studentAuthCard.classList.remove('hidden');
  studentDashboard.classList.add('hidden');
  showToast('ออกจากระบบเรียบร้อย');
});

// Load assignments for Student
async function loadStudentAssignments() {
  try {
    const assignments = await API.getAssignments();
    state.assignments = assignments;
    assignmentCount.textContent = `${assignments.length} งาน`;
    
    renderStudentAssignments();
  } catch (err) {
    console.error(err);
    showToast('โหลดงานการบ้านไม่สำเร็จ', 'error');
  }
}

// Render Assignments
function renderStudentAssignments() {
  studentAssignmentsGrid.innerHTML = '';
  
  state.assignments.forEach(assign => {
    const submission = state.studentSubmissions.find(s => s.Assignment_ID === assign.Assignment_ID);
    
    let statusClass = 'status-pending';
    let statusText = 'ยังไม่ส่งงาน';
    let badgeClass = 'pending';
    let scoreDisplay = '';
    
    if (submission) {
      if (submission.Status === 'Graded') {
        statusClass = 'status-graded';
        statusText = 'ตรวจคะแนนแล้ว';
        badgeClass = 'graded';
        scoreDisplay = `<span class="score-badge">${submission.Score} / ${assign.Max_Score} คะแนน</span>`;
      } else if (submission.Status === 'Need_Correction') {
        statusClass = 'status-correction';
        statusText = 'แก้ไขใหม่';
        badgeClass = 'correction';
      } else {
        statusClass = 'status-submitted';
        statusText = 'ส่งงานแล้ว (รอตรวจ)';
        badgeClass = 'submitted';
      }
    }

    const card = document.createElement('div');
    card.className = `assignment-card ${statusClass}`;
    
    const formattedDate = new Date(assign.Due_Date).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: '2-digit'
    });

    card.innerHTML = `
      <div class="card-top">
        <span class="card-id">${assign.Assignment_ID}</span>
        <h4 class="card-title">${assign.Assignment_Name}</h4>
      </div>
      <div class="card-bottom">
        <div class="card-meta">
          <span><i class="fa-solid fa-calendar-day"></i> กำหนด: ${formattedDate}</span>
          <span>เต็ม ${assign.Max_Score} คะแนน</span>
        </div>
        <div class="card-meta">
          <span class="status-badge ${badgeClass}">
            <i class="fa-solid ${submission ? 'fa-check' : 'fa-clock'}"></i> ${statusText}
          </span>
          ${scoreDisplay}
        </div>
        <button class="btn ${submission ? 'btn-secondary' : 'btn-primary'} btn-block btn-submit-trigger" 
                data-id="${assign.Assignment_ID}" 
                data-name="${assign.Assignment_Name}"
                data-due="${assign.Due_Date}"
                data-score="${assign.Max_Score}">
          <i class="fa-solid ${submission ? 'fa-rotate' : 'fa-arrow-up-from-bracket'}"></i> 
          <span>${submission ? 'ส่งงานใหม่อีกครั้ง' : 'ส่งงาน'}</span>
        </button>
      </div>
    `;
    
    studentAssignmentsGrid.appendChild(card);
  });

  // Attach submit modal events
  document.querySelectorAll('.btn-submit-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget;
      const assignId = target.dataset.id;
      const assignName = target.dataset.name;
      const due = target.dataset.due;
      const score = target.dataset.score;

      document.getElementById('modal-assignment-title').textContent = `ส่งงาน: ${assignName}`;
      document.getElementById('modal-assignment-due').textContent = new Date(due).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
      document.getElementById('modal-assignment-score').textContent = score;
      document.getElementById('submit-student-id').value = state.studentData.Student_ID;
      document.getElementById('submit-assignment-id').value = assignId;

      openModal(submitModal);
    });
  });
}

// Drag and drop upload zone events
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('submit-file-input');
const filePreview = document.getElementById('file-preview-container');
const fileNameDisplay = document.getElementById('selected-file-name');
const btnRemoveFile = document.getElementById('btn-remove-file');

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) {
    handleFileSelected(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) {
    handleFileSelected(fileInput.files[0]);
  }
});

function handleFileSelected(file) {
  state.selectedFile = file;
  fileNameDisplay.textContent = file.name;
  filePreview.classList.remove('hidden');
  dropZone.querySelector('.cloud-icon').style.display = 'none';
  dropZone.querySelector('h3').style.display = 'none';
  dropZone.querySelector('p').style.display = 'none';
}

btnRemoveFile.addEventListener('click', (e) => {
  e.stopPropagation();
  resetFileSelection();
});

function resetFileSelection() {
  state.selectedFile = null;
  fileInput.value = '';
  filePreview.classList.add('hidden');
  dropZone.querySelector('.cloud-icon').style.display = 'block';
  dropZone.querySelector('h3').style.display = 'block';
  dropZone.querySelector('p').style.display = 'block';
}

function resetSubmitForm() {
  document.getElementById('submit-notes').value = '';
  resetFileSelection();
}

// Submit assignment action
document.getElementById('submission-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.selectedFile) {
    showToast('กรุณาอัปโหลดไฟล์ผลงานก่อนกดยืนยัน', 'error');
    return;
  }

  const studentId = document.getElementById('submit-student-id').value;
  const assignmentId = document.getElementById('submit-assignment-id').value;
  const notes = document.getElementById('submit-notes').value.trim();

  const formData = new FormData();
  formData.append('Student_ID', studentId);
  formData.append('Assignment_ID', assignmentId);
  formData.append('Notes', notes);
  formData.append('file', state.selectedFile);

  const btnSubmit = document.getElementById('btn-submit-work');
  const btnOriginalText = btnSubmit.innerHTML;
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังอัปโหลด...';

  try {
    const res = await fetch('/api/submit', {
      method: 'POST',
      body: formData
    }).then(r => r.json());

    if (res.success) {
      showToast(res.message, 'success');
      closeModal(submitModal);
      
      const updateData = await API.getStudentInfo(studentId);
      if (updateData.success) {
        state.studentSubmissions = updateData.submissions;
        renderStudentAssignments();
      }
    } else {
      showToast(res.message, 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('ไม่สามารถส่งงานได้ โปรดลองอีกครั้ง', 'error');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = btnOriginalText;
  }
});

// ================= STUDENT ID SCANNER (WEBCAM) =================

// Trigger student camera scanner modal
btnScanStudentId.addEventListener('click', () => {
  openModal(studentScannerModal);
  startStudentScanner();
});

btnCloseStudentScanner.addEventListener('click', () => {
  closeModal(studentScannerModal);
  stopStudentScanner();
});

function startStudentScanner() {
  studentScanner = new Html5Qrcode("student-qr-reader");
  studentScanner.start(
    { facingMode: "environment" }, 
    {
      fps: 15,
      qrbox: (width, height) => {
        const edge = Math.min(width, height) * 0.75;
        return { width: Math.round(edge), height: Math.round(edge) };
      }
    },
    (decodedText) => {
      playBeep('success');
      showToast(`สแกนรหัสสำเร็จ: ${decodedText}`, 'success');
      studentIdInput.value = decodedText;
      
      stopStudentScanner();
      closeModal(studentScannerModal);
      
      loginStudent(decodedText);
    },
    (errorMessage) => {
      // Silent error handler
    }
  ).catch(err => {
    console.error("Camera start error:", err);
    showToast("ไม่สามารถเข้าใช้งานกล้องเว็บแคมได้", "error");
    closeModal(studentScannerModal);
  });
}

function stopStudentScanner() {
  if (studentScanner) {
    studentScanner.stop().then(() => {
      studentScanner = null;
      console.log("Student camera scanner stopped.");
    }).catch(err => {
      console.error("Error stopping scanner:", err);
    });
  }
}

// ================= TEACHER WORKFLOW =================

// Load Teacher Dashboard Data
async function loadTeacherDashboard() {
  try {
    const assignments = await API.getAssignments();
    const submissions = await API.getSubmissions();
    const students = await API.getStudentsList();
    
    state.assignments = assignments;
    state.submissions = submissions;
    state.students = students;
    
    // Update stats
    statTotalAssignments.textContent = `${assignments.length} งาน`;
    statTotalSubmissions.textContent = `${submissions.length} รายการ`;
    
    // Total students count from master list
    statTotalStudents.textContent = `${students.length} คน`;
    
    const graded = submissions.filter(s => s.Status === 'Graded');
    statGradedSubmissions.textContent = `${graded.length} รายการ`;
    
    populateFilters(submissions, assignments);
    populateTeacherScannerAssignments(assignments);
    populateDirectoryFilters(students);
    
    renderSubmissionsTable();
    renderStudentsDirectoryTable();
  } catch (err) {
    console.error(err);
    showToast('ไม่สามารถโหลดข้อมูลหลังบ้านได้', 'error');
  }
}

// Populate filters dropdowns
function populateFilters(submissions, assignments) {
  const classes = new Set();
  submissions.forEach(s => {
    if (s.Class) classes.add(s.Class);
  });
  
  const currentVal = filterClass.value;
  filterClass.innerHTML = '<option value="">ชั้นเรียนทั้งหมด</option>';
  Array.from(classes).sort().forEach(cls => {
    const opt = document.createElement('option');
    opt.value = cls;
    opt.textContent = cls;
    filterClass.appendChild(opt);
  });
  filterClass.value = currentVal;

  const currentAssignVal = filterAssignment.value;
  filterAssignment.innerHTML = '<option value="">การบ้านทั้งหมด</option>';
  assignments.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.Assignment_ID;
    opt.textContent = `${a.Assignment_ID} - ${a.Assignment_Name.split(' ')[0]}`;
    filterAssignment.appendChild(opt);
  });
  filterAssignment.value = currentAssignVal;
}

// Populate Quick Scan Assignments selector
function populateTeacherScannerAssignments(assignments) {
  const currentVal = scanAssignSelect.value;
  scanAssignSelect.innerHTML = '';
  
  assignments.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.Assignment_ID;
    opt.textContent = `${a.Assignment_ID} - ${a.Assignment_Name.split(' ')[0]}`;
    scanAssignSelect.appendChild(opt);
  });
  
  // Set default score when assignment is selected
  scanAssignSelect.addEventListener('change', () => {
    const activeAssign = assignments.find(a => a.Assignment_ID === scanAssignSelect.value);
    if (activeAssign) {
      scanScoreInput.value = activeAssign.Max_Score;
    }
  });

  if (currentVal && Array.from(scanAssignSelect.options).some(o => o.value === currentVal)) {
    scanAssignSelect.value = currentVal;
  } else if (assignments.length > 0) {
    scanAssignSelect.value = assignments[0].Assignment_ID;
    scanScoreInput.value = assignments[0].Max_Score;
  }
}

// Filter triggers
teacherSearch.addEventListener('input', renderSubmissionsTable);
filterClass.addEventListener('change', renderSubmissionsTable);
filterAssignment.addEventListener('change', renderSubmissionsTable);

// Render Submissions Table
function renderSubmissionsTable() {
  submissionsTableBody.innerHTML = '';
  
  const query = teacherSearch.value.toLowerCase().trim();
  const selectedClass = filterClass.value;
  const selectedAssign = filterAssignment.value;

  const filtered = state.submissions.filter(sub => {
    const matchQuery = !query || 
                       sub.FullName.toLowerCase().includes(query) || 
                       sub.Student_ID.toLowerCase().includes(query) ||
                       (sub.Class && sub.Class.toLowerCase().includes(query));
                       
    const matchClass = !selectedClass || sub.Class === selectedClass;
    const matchAssign = !selectedAssign || sub.Assignment_ID === selectedAssign;

    return matchQuery && matchClass && matchAssign;
  });

  if (filtered.length === 0) {
    submissionsTableBody.innerHTML = '<tr><td colspan="9" class="text-center">ไม่พบรายการส่งงาน</td></tr>';
    return;
  }

  filtered.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));

  filtered.forEach(sub => {
    const time = new Date(sub.Timestamp).toLocaleString('th-TH', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });

    const fileEl = sub.File_Link 
      ? `<a href="${sub.File_Link}" target="_blank" class="table-file-btn"><i class="fa-solid fa-file-arrow-down"></i> เปิดไฟล์</a>`
      : '<span class="text-muted">-</span>';

    let statusText = 'ส่งแล้ว';
    let statusClass = 'submitted';
    if (sub.Status === 'Graded') { statusText = 'ตรวจแล้ว'; statusClass = 'graded'; }
    if (sub.Status === 'Need_Correction') { statusText = 'แก้ไขใหม่'; statusClass = 'correction'; }
    if (sub.Status === 'Resubmitted') { statusText = 'ส่งใหม่'; statusClass = 'submitted'; }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${time}</td>
      <td><strong>${sub.Student_ID}</strong></td>
      <td>${sub.FullName}</td>
      <td><span class="badge-class" style="font-size:0.75rem">${sub.Class || '-'}</span></td>
      <td>${sub.Assignment_ID}</td>
      <td>${fileEl}</td>
      <td>${sub.Score !== null ? `<span class="score-badge">${sub.Score}</span>` : '<span class="score-pending">รอตรวจ</span>'}</td>
      <td><span class="status-badge ${statusClass}">${statusText}</span></td>
      <td>
        <button class="btn btn-yellow btn-grade-trigger" style="padding: 4px 10px; font-size: 0.8rem;" 
                data-subid="${sub.Submission_ID}"
                data-studentid="${sub.Student_ID}"
                data-studentname="${sub.FullName}"
                data-class="${sub.Class}"
                data-assignid="${sub.Assignment_ID}"
                data-notes="${sub.Notes || ''}"
                data-score="${sub.Score !== null ? sub.Score : ''}"
                data-status="${sub.Status}"
                data-link="${sub.File_Link}">
          <i class="fa-solid fa-edit"></i> ตรวจงาน
        </button>
      </td>
    `;
    
    submissionsTableBody.appendChild(row);
  });

  // Attach grading trigger
  document.querySelectorAll('.btn-grade-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const data = e.currentTarget.dataset;
      const assignment = state.assignments.find(a => a.Assignment_ID === data.assignid) || { Max_Score: 10 };
      
      document.getElementById('grade-sub-id').value = data.subid;
      document.getElementById('grade-student-name').textContent = data.studentname;
      document.getElementById('grade-student-class').textContent = data.class || '-';
      document.getElementById('grade-assignment-name').textContent = `${data.assignid} - ${assignment.Assignment_Name}`;
      document.getElementById('grade-max-score-display').textContent = assignment.Max_Score;
      
      const fileLink = document.getElementById('grade-file-link');
      if (data.link) {
        fileLink.style.display = 'inline-flex';
        fileLink.href = data.link;
      } else {
        fileLink.style.display = 'none';
      }

      const notesLabel = document.getElementById('grade-notes-label');
      const notesContent = document.getElementById('grade-student-notes');
      if (data.notes) {
        notesLabel.style.display = 'inline';
        notesContent.textContent = data.notes;
      } else {
        notesLabel.style.display = 'none';
        notesContent.textContent = 'ไม่มีบันทึกข้อความจากนักเรียน';
      }

      document.getElementById('grade-score-input').max = assignment.Max_Score;
      document.getElementById('grade-score-input').value = data.score;
      document.getElementById('grade-status-select').value = data.status === 'Need_Correction' ? 'Need_Correction' : 'Graded';

      openModal(gradeModal);
    });
  });
}

// Submit Grade Form
document.getElementById('grade-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const subId = document.getElementById('grade-sub-id').value;
  const score = document.getElementById('grade-score-input').value;
  const status = document.getElementById('grade-status-select').value;

  try {
    const res = await API.gradeSubmission({
      Submission_ID: subId,
      Score: Number(score),
      Status: status
    });

    if (res.success) {
      showToast(res.message, 'success');
      closeModal(gradeModal);
      await loadTeacherDashboard();
    } else {
      showToast(res.message, 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('บันทึกคะแนนไม่สำเร็จ โปรดลองอีกครั้ง', 'error');
  }
});

// ================= TEACHER QUICK SCAN GRADER =================

// Process Quick Grade Scan
async function processQuickGradeScan(studentId) {
  if (scannerCooldown) return;
  scannerCooldown = true;

  const activeAssignment = scanAssignSelect.value;
  const activeScore = Number(scanScoreInput.value);

  if (!activeAssignment) {
    showToast("กรุณาเลือกการบ้านเพื่อลงคะแนน", "error");
    scannerCooldown = false;
    return;
  }

  playBeep('success');

  try {
    const res = await API.quickGrade({
      Student_ID: studentId,
      Assignment_ID: activeAssignment,
      Score: activeScore
    });

    if (res.success) {
      const student = res.student;
      
      lastScannedText.textContent = `${student.FullName} (${studentId}) - บันทึก ${activeScore} คะแนน`;
      lastScannedResult.classList.remove('hidden');

      // SHOW 5-SECOND HUD OVERLAY
      hudStudentName.textContent = student.FullName;
      hudStudentId.textContent = `รหัสประจำตัว: ${student.Student_ID}`;
      hudStudentClass.textContent = `ชั้นเรียน: ${student.Class || 'ม.ทั่วไป'}`;
      hudStudentScore.textContent = activeScore;
      
      // Display student photo (custom photo if exists, otherwise DiceBear)
      hudStudentPhoto.src = student.Photo ? student.Photo : `https://api.dicebear.com/7.x/adventurer/svg?seed=${studentId}`;
      
      hudProgressBar.classList.remove('hud-countdown-active');
      void hudProgressBar.offsetWidth;
      
      scanHudOverlay.classList.remove('hidden');
      hudProgressBar.classList.add('hud-countdown-active');

      if (hudTimeoutId) clearTimeout(hudTimeoutId);

      hudTimeoutId = setTimeout(() => {
        scanHudOverlay.classList.add('hidden');
        hudProgressBar.classList.remove('hud-countdown-active');
        scannerCooldown = false;
      }, 5000);

      await loadTeacherDashboard();
    } else {
      playBeep('error');
      showToast(res.message, 'error');
      scannerCooldown = false;
    }
  } catch (err) {
    console.error(err);
    playBeep('error');
    showToast(`เกิดข้อผิดพลาดในการลงคะแนนให้รหัส ${studentId}`, 'error');
    scannerCooldown = false;
  }
}

// Toggle Teacher Camera Scanner
btnToggleTeacherScanner.addEventListener('click', () => {
  if (isTeacherScannerActive) {
    stopTeacherScanner();
  } else {
    startTeacherScanner();
  }
});

function startTeacherScanner() {
  const activeAssignment = scanAssignSelect.value;
  if (!activeAssignment) {
    showToast("กรุณาสร้างการบ้านเพื่อใช้ในการตรวจคะแนนก่อน", "error");
    return;
  }

  isTeacherScannerActive = true;
  btnToggleTeacherScanner.innerHTML = '<i class="fa-solid fa-camera-slash"></i> <span>ปิดกล้องสแกน</span>';
  btnToggleTeacherScanner.className = 'btn btn-secondary btn-block btn-icon-left';
  teacherLaserLine.classList.remove('hidden');
  
  teacherScanner = new Html5Qrcode("teacher-qr-reader");
  teacherScanner.start(
    { facingMode: "environment" }, 
    {
      fps: 15,
      qrbox: (width, height) => {
        const edge = Math.min(width, height) * 0.75;
        return { width: Math.round(edge), height: Math.round(edge) };
      }
    },
    (decodedText) => {
      processQuickGradeScan(decodedText);
    },
    (errorMessage) => {
      // Silent error handler
    }
  ).catch(err => {
    console.error("Teacher camera scanner start error:", err);
    showToast("ไม่สามารถเปิดกล้องเว็บแคมได้", "error");
    stopTeacherScanner();
  });
}

function stopTeacherScanner() {
  isTeacherScannerActive = false;
  btnToggleTeacherScanner.innerHTML = '<i class="fa-solid fa-camera"></i> <span>เปิดกล้องสแกนตรวจงาน</span>';
  btnToggleTeacherScanner.className = 'btn btn-green btn-block btn-icon-left';
  teacherLaserLine.classList.add('hidden');
  lastScannedResult.classList.add('hidden');
  scanHudOverlay.classList.add('hidden');
  if (hudTimeoutId) clearTimeout(hudTimeoutId);
  scannerCooldown = false;

  if (teacherScanner) {
    teacherScanner.stop().then(() => {
      teacherScanner = null;
      console.log("Teacher camera scanner stopped.");
    }).catch(err => {
      console.error("Error stopping teacher scanner:", err);
    });
  }
}

// ================= SCANNER SIMULATOR EVENTS =================

document.querySelectorAll('.btn-sim-scan').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const studentId = e.currentTarget.dataset.id;
    processQuickGradeScan(studentId);
  });
});

btnTriggerSimScan.addEventListener('click', () => {
  const studentId = simIdInput.value.trim();
  if (!studentId) {
    showToast("กรุณาระบุรหัสประจำตัวที่จะจำลองสแกน", "error");
    return;
  }
  processQuickGradeScan(studentId);
  simIdInput.value = '';
});

simIdInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    btnTriggerSimScan.click();
  }
});

// Create New Assignment
createAssignmentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('new-assign-id').value.trim();
  const name = document.getElementById('new-assign-name').value.trim();
  const due = document.getElementById('new-assign-due').value;
  const score = document.getElementById('new-assign-score').value;

  try {
    const res = await API.createAssignment({
      Assignment_ID: id,
      Assignment_Name: name,
      Due_Date: due,
      Max_Score: Number(score)
    });

    if (res.success) {
      showToast('สร้างใบงานการบ้านเรียบร้อย', 'success');
      createAssignmentForm.reset();
      await loadTeacherDashboard();
    } else {
      showToast(res.message, 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('สร้างใบงานไม่สำเร็จ', 'error');
  }
});

// Database Actions (Sync from local Desktop Excel) (NEW)
const btnReloadLocalExcel = document.getElementById('btn-reload-local-excel');
if (btnReloadLocalExcel) {
  btnReloadLocalExcel.addEventListener('click', async () => {
    const btnOriginalText = btnReloadLocalExcel.innerHTML;
    btnReloadLocalExcel.disabled = true;
    btnReloadLocalExcel.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังซิงก์ข้อมูล...';

    try {
      const res = await fetch('/api/import-excel', { method: 'POST' }).then(r => r.json());
      if (res.success) {
        showToast(res.message, 'success');
        await loadTeacherDashboard(); // Refresh data
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการดึงข้อมูลจากไฟล์ Excel บนเดสก์ท็อป', 'error');
    } finally {
      btnReloadLocalExcel.disabled = false;
      btnReloadLocalExcel.innerHTML = btnOriginalText;
    }
  });
}

// Database Actions (Import from Excel File)
const excelFileInput = document.getElementById('excel-file-input');

btnImportExcel.addEventListener('click', () => {
  excelFileInput.click(); // Trigger file dialog
});

excelFileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const btnOriginalText = btnImportExcel.innerHTML;
  btnImportExcel.disabled = true;
  btnImportExcel.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังวิเคราะห์ไฟล์...';

  const formData = new FormData();
  formData.append('excel', file);

  try {
    const res = await fetch('/api/import-excel-file', {
      method: 'POST',
      body: formData
    }).then(r => r.json());

    if (res.success) {
      showToast(res.message, 'success');
      await loadTeacherDashboard();
    } else {
      showToast(res.message, 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('เกิดข้อผิดพลาดในการอัปโหลดและวิเคราะห์ไฟล์ Excel', 'error');
  } finally {
    btnImportExcel.disabled = false;
    btnImportExcel.innerHTML = btnOriginalText;
    excelFileInput.value = ''; // Reset file input
  }
});

// Database Actions (Import Photos from ZIP File)
const btnImportPhotosZip = document.getElementById('btn-import-photos-zip');
const photosZipInput = document.getElementById('photos-zip-input');

if (btnImportPhotosZip && photosZipInput) {
  btnImportPhotosZip.addEventListener('click', () => {
    photosZipInput.click(); // Trigger file dialog
  });

  photosZipInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const btnOriginalText = btnImportPhotosZip.innerHTML;
    btnImportPhotosZip.disabled = true;
    btnImportPhotosZip.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังแตกไฟล์รูป...';

    const formData = new FormData();
    formData.append('zip', file);

    try {
      const res = await fetch('/api/import-photos-zip', {
        method: 'POST',
        body: formData
      }).then(r => r.json());

      if (res.success) {
        showToast(res.message, 'success');
        await loadTeacherDashboard();
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการอัปโหลดและนำเข้ารูปภาพนักเรียน', 'error');
    } finally {
      btnImportPhotosZip.disabled = false;
      btnImportPhotosZip.innerHTML = btnOriginalText;
      photosZipInput.value = ''; // Reset file input
    }
  });
}

// Database Actions (Google Drive Photos Sync)
const btnSyncDrivePhotos = document.getElementById('btn-sync-drive-photos');
const driveSyncModal = document.getElementById('drive-sync-modal');
const driveSyncForm = document.getElementById('drive-sync-form');
const btnCloseDriveModalBtn = document.querySelector('.btn-close-drive-modal-btn');

if (btnSyncDrivePhotos && driveSyncModal) {
  btnSyncDrivePhotos.addEventListener('click', () => {
    const savedUrl = localStorage.getItem('drive_script_url') || '';
    const savedFolderId = localStorage.getItem('drive_folder_id') || '';
    document.getElementById('drive-script-url').value = savedUrl;
    document.getElementById('drive-folder-id').value = savedFolderId;
    openModal(driveSyncModal);
  });
}

if (btnCloseDriveModalBtn && driveSyncModal) {
  btnCloseDriveModalBtn.addEventListener('click', () => {
    closeModal(driveSyncModal);
  });
}

if (driveSyncForm) {
  driveSyncForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const scriptUrl = document.getElementById('drive-script-url').value.trim();
    const folderId = document.getElementById('drive-folder-id').value.trim();
    
    localStorage.setItem('drive_script_url', scriptUrl);
    localStorage.setItem('drive_folder_id', folderId);
    
    const btnSubmit = document.getElementById('btn-submit-drive-sync');
    const btnOriginalText = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังซิงก์รูปถ่าย...';
    
    try {
      const res = await fetch('/api/import-photos-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptUrl, folderId })
      }).then(r => r.json());
      
      if (res.success) {
        showToast(res.message, 'success');
        closeModal(driveSyncModal);
        await loadTeacherDashboard();
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อดาวน์โหลดรูปภาพ', 'error');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = btnOriginalText;
    }
  });
}

// Database Actions (Export to Excel)
btnExportExcel.addEventListener('click', async () => {
  const btnOriginalText = btnExportExcel.innerHTML;
  btnExportExcel.disabled = true;
  btnExportExcel.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังส่งออก...';

  try {
    const res = await API.exportExcel();
    if (res.success) {
      showToast('ส่งออกรายงาน Excel สำเร็จ!', 'success');
    } else {
      showToast(res.message, 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('เกิดข้อผิดพลาดในการเชื่อมโยงไฟล์', 'error');
  } finally {
    btnExportExcel.disabled = false;
    btnExportExcel.innerHTML = btnOriginalText;
  }
});

// Database Actions (Sync with Google Sheets API)
btnSyncSheets.addEventListener('click', async () => {
  const btnOriginalText = btnSyncSheets.innerHTML;
  btnSyncSheets.disabled = true;
  btnSyncSheets.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังเชื่อมโยง...';

  try {
    const res = await API.syncSheets();
    if (res.success) {
      showToast('ซิงก์ประวัติการส่งงานกับ Google Sheets API เรียบร้อย!', 'success');
    } else {
      showToast(res.message, 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย', 'error');
  } finally {
    btnSyncSheets.disabled = false;
    btnSyncSheets.innerHTML = btnOriginalText;
  }
});

// Tab Switching in Teacher Dashboard
document.getElementById('tab-submissions').addEventListener('click', (e) => {
  document.getElementById('tab-submissions').classList.add('active');
  document.getElementById('tab-students').classList.remove('active');
  document.getElementById('panel-submissions-view').classList.add('active');
  document.getElementById('panel-students-view').classList.remove('active');
});

document.getElementById('tab-students').addEventListener('click', (e) => {
  document.getElementById('tab-students').classList.add('active');
  document.getElementById('tab-submissions').classList.remove('active');
  document.getElementById('panel-students-view').classList.add('active');
  document.getElementById('panel-submissions-view').classList.remove('active');
});

// Populate directory class filters dropdown
function populateDirectoryFilters(students) {
  const classes = new Set();
  students.forEach(s => {
    if (s.Class) classes.add(s.Class);
  });
  
  const filterDirClass = document.getElementById('filter-dir-class');
  const currentVal = filterDirClass.value;
  filterDirClass.innerHTML = '<option value="">ชั้นเรียนทั้งหมด</option>';
  Array.from(classes).sort().forEach(cls => {
    const opt = document.createElement('option');
    opt.value = cls;
    opt.textContent = cls;
    filterDirClass.appendChild(opt);
  });
  filterDirClass.value = currentVal;
}

// Render Students Directory
function renderStudentsDirectoryTable() {
  const studentsDirTableBody = document.getElementById('students-dir-table-body');
  const studentDirSearch = document.getElementById('student-dir-search');
  const filterDirClass = document.getElementById('filter-dir-class');
  const studentDirCount = document.getElementById('student-dir-count');
  
  studentsDirTableBody.innerHTML = '';
  
  const query = studentDirSearch.value.toLowerCase().trim();
  const selectedClass = filterDirClass.value;
  
  const filtered = state.students.filter(s => {
    const matchQuery = !query || 
                       s.FullName.toLowerCase().includes(query) || 
                       s.Student_ID.toLowerCase().includes(query) ||
                       (s.Email && s.Email.toLowerCase().includes(query));
    const matchClass = !selectedClass || s.Class === selectedClass;
    return matchQuery && matchClass;
  });
  
  studentDirCount.textContent = `${filtered.length} คน`;
  
  if (filtered.length === 0) {
    studentsDirTableBody.innerHTML = '<tr><td colspan="7" class="text-center">ไม่พบรายชื่อนักเรียน</td></tr>';
    return;
  }
  
  // Sort by Student ID
  filtered.sort((a, b) => a.Student_ID.localeCompare(b.Student_ID));
  
  filtered.forEach(s => {
    const avatarSrc = s.Photo ? s.Photo : `https://api.dicebear.com/7.x/adventurer/svg?seed=${s.Student_ID}`;
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><img src="${avatarSrc}" alt="Avatar" class="student-table-avatar" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; background: var(--bg-secondary); border: 1px solid var(--glass-border);"></td>
      <td><strong>${s.Student_ID}</strong></td>
      <td>${s.FullName}</td>
      <td><span class="badge-class" style="font-size:0.75rem">${s.Class || '-'}</span></td>
      <td>${s.Email || '-'}</td>
      <td><span class="status-badge graded" style="padding: 2px 8px; font-size: 0.7rem;">${s.Status || 'กำลังศึกษาอยู่'}</span></td>
      <td>
        <button class="btn btn-purple btn-edit-student-trigger" style="padding: 4px 10px; font-size: 0.8rem;"
                data-id="${s.Student_ID}"
                data-name="${s.FullName}"
                data-class="${s.Class || ''}"
                data-email="${s.Email || ''}"
                data-photo="${s.Photo || ''}">
          <i class="fa-solid fa-user-gear"></i> แก้ไข
        </button>
      </td>
    `;
    studentsDirTableBody.appendChild(row);
  });
  
  // Attach event listener for clicking Edit button
  document.querySelectorAll('.btn-edit-student-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const data = e.currentTarget.dataset;
      
      const editStudentId = document.getElementById('edit-student-id');
      const editStudentIdDisplayOnly = document.getElementById('edit-student-id-display-only');
      const editStudentName = document.getElementById('edit-student-name');
      const editStudentClass = document.getElementById('edit-student-class');
      const editStudentEmail = document.getElementById('edit-student-email');
      const editHudAvatarPreview = document.getElementById('edit-hud-avatar-preview');
      const editPhotoInput = document.getElementById('edit-photo-input');
      
      editStudentId.value = data.id;
      editStudentIdDisplayOnly.value = data.id;
      editStudentName.value = data.name;
      editStudentClass.value = data.class;
      editStudentEmail.value = data.email;
      
      const avatarSrc = data.photo ? data.photo : `https://api.dicebear.com/7.x/adventurer/svg?seed=${data.id}`;
      editHudAvatarPreview.src = avatarSrc;
      editPhotoInput.value = ''; // Reset file input
      
      openModal(studentEditModal);
    });
  });
}

// Student directory search & filter inputs
document.getElementById('student-dir-search').addEventListener('input', renderStudentsDirectoryTable);
document.getElementById('filter-dir-class').addEventListener('change', renderStudentsDirectoryTable);

// Student photo edit preview
document.getElementById('edit-photo-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      document.getElementById('edit-hud-avatar-preview').src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
});

// Update student profile form submit handler
document.getElementById('student-edit-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const form = e.target;
  const formData = new FormData(form);
  const btnSubmit = form.querySelector('button[type="submit"]');
  const btnOriginalText = btnSubmit.innerHTML;
  
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...';
  
  try {
    const res = await fetch('/api/student/update', {
      method: 'POST',
      body: formData
    }).then(r => r.json());
    
    if (res.success) {
      showToast(res.message, 'success');
      closeModal(studentEditModal);
      await loadTeacherDashboard(); // Reload data
    } else {
      showToast(res.message, 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('ไม่สามารถอัปเดตข้อมูลนักเรียนได้', 'error');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = btnOriginalText;
  }
});

// Initialize on window load
window.addEventListener('load', () => {
  checkQueryParams();
  
  // Theme Toggle Initializer
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    applyTheme(savedTheme);
  }
});

// Theme Toggle Logic
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const themeText = btnThemeToggle.querySelector('span');

function applyTheme(theme) {
  if (theme === 'pastel') {
    document.body.classList.add('pastel-theme');
    document.body.classList.remove('dark-theme');
    themeText.textContent = 'ธีมดาร์กโหมด';
    localStorage.setItem('theme', 'pastel');
  } else {
    document.body.classList.remove('pastel-theme');
    document.body.classList.add('dark-theme');
    themeText.textContent = 'ธีมพาสเทล';
    localStorage.setItem('theme', 'dark');
  }
}

btnThemeToggle.addEventListener('click', () => {
  if (document.body.classList.contains('pastel-theme')) {
    applyTheme('dark');
  } else {
    applyTheme('pastel');
  }
});

