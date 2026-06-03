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
  syncSheets: () => fetch('/api/sync-sheets', { method: 'POST' }).then(r => r.json()),

  getSubjects: () => fetch('/api/subjects').then(r => r.json()),
  getAttendance: () => fetch('/api/attendance').then(r => r.json()),
  scanAttendance: (data) => fetch('/api/attendance/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  updateAttendance: (data) => fetch('/api/attendance/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json())
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
  subjects: [], // For teacher subjects (NEW)
  attendance: [], // For teacher attendance (NEW)
  directoryPage: 1, // Student directory pagination page
  directoryLimit: 50, // Student directory pagination limit
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
    document.body.classList.remove('teacher-mode-active');
    btnStudentMode.classList.add('active');
    btnTeacherMode.classList.remove('active');
    studentView.classList.add('active');
    teacherView.classList.remove('active');
  } else if (view === 'teacher') {
    state.currentView = 'teacher';
    document.body.classList.add('teacher-mode-active');
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

// Teacher login validation (Updated to support multiple teacher accounts and session persistence)
document.getElementById('pwd-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('pwd-username').value.trim();
  const password = document.getElementById('pwd-input').value;
  
  const btnSubmit = document.getElementById('pwd-form').querySelector('button[type="submit"]');
  const btnOriginalText = btnSubmit.innerHTML;
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังตรวจสอบ...';
  
  try {
    const res = await fetch('/api/teacher/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    }).then(r => r.json());
    
    if (res.success) {
      closeModal(passwordModal);
      showToast(res.message, 'success');
      state.teacherData = res.teacher;
      localStorage.setItem('auth_teacher', JSON.stringify(res.teacher)); // PERSIST SESSION
      
      // Update UI for teacher logged in
      document.querySelector('.mode-toggle-container').classList.add('hidden');
      document.getElementById('btn-teacher-logout').classList.remove('hidden');
      
      logAgentEvent('teacher_login', 'Teacher', { username: res.teacher.username });
      switchView('teacher');
    } else {
      showToast(res.message, 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('เกิดข้อผิดพลาดในการตรวจสอบบัญชีผู้ใช้', 'error');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = btnOriginalText;
  }
});

// ================= STUDENT WORKFLOW =================

// Student ID login logic (Updated with Session storage and agent logs)
async function loginStudent(studentId) {
  try {
    const res = await API.getStudentInfo(studentId);
    if (res.success) {
      state.studentAuthenticated = true;
      state.studentData = res.student;
      state.studentSubmissions = res.submissions;
      localStorage.setItem('auth_student_id', studentId); // PERSIST SESSION
      
      // Update displays
      const studentAvatarContainer = document.querySelector('.profile-avatar');
      const avatarSrc = res.student.Photo ? res.student.Photo : `https://api.dicebear.com/7.x/adventurer/svg?seed=${res.student.Student_ID}`;
      studentAvatarContainer.innerHTML = `<img src="${avatarSrc}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
      studentNameDisplay.textContent = res.student.FullName;
      studentClassDisplay.textContent = `ชั้นเรียน: ${res.student.Class}`;
      studentIdDisplay.textContent = res.student.Student_ID;
      studentEmailDisplay.textContent = res.student.Email || '-';
      
      // Update Student Personal QR Code (NEW)
      const studentQrCodeImg = document.getElementById('student-qr-code-img');
      if (studentQrCodeImg) {
        studentQrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${res.student.Student_ID}&ecc=M`;
      }
      
      // Switch layouts
      studentAuthCard.classList.add('hidden');
      studentDashboard.classList.remove('hidden');
      
      // Fetch assignments and render
      await loadStudentAssignments();
      showToast(`ยินดีต้อนรับ ${res.student.FullName}`, 'success');
      logAgentEvent('student_login', 'Student', { studentId: res.student.Student_ID });

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
  logAgentEvent('student_logout', 'Student', { studentId: state.studentData ? state.studentData.Student_ID : '' });
  localStorage.removeItem('auth_student_id'); // CLEAR PERSISTENCE
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
    const subjects = await API.getSubjects();
    const attendance = await API.getAttendance();
    
    state.assignments = assignments;
    state.submissions = submissions;
    state.students = students;
    state.subjects = subjects;
    state.attendance = attendance;
    
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
    populateSubjectsDropdowns(subjects);
    populateReportsFilters();
    
    renderSubmissionsTable();
    renderStudentsDirectoryTable();
  } catch (err) {
    console.error(err);
    showToast('ไม่สามารถโหลดข้อมูลหลังบ้านได้', 'error');
  }
}

// Populate subject select dropdowns (NEW)
function populateSubjectsDropdowns(subjects) {
  const newAssignSub = document.getElementById('new-assign-subject');
  const scanSub = document.getElementById('scan-subject-select');
  const reportSub = document.getElementById('report-subject-select');
  
  if (newAssignSub) {
    newAssignSub.innerHTML = '';
    subjects.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.Subject_ID;
      opt.textContent = `${s.Subject_ID} - ${s.Subject_Name}`;
      newAssignSub.appendChild(opt);
    });
  }
  
  if (scanSub) {
    scanSub.innerHTML = '';
    subjects.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.Subject_ID;
      opt.textContent = `${s.Subject_ID} - ${s.Subject_Name}`;
      scanSub.appendChild(opt);
    });
  }
  
  if (reportSub) {
    const currentVal = reportSub.value;
    reportSub.innerHTML = '<option value="all">ทุกรายวิชา</option>';
    subjects.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.Subject_ID;
      opt.textContent = `${s.Subject_ID} - ${s.Subject_Name}`;
      reportSub.appendChild(opt);
    });
    reportSub.value = currentVal || 'all';
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
      Status: status,
      Teacher_Username: state.teacherData ? state.teacherData.username : 'admin',
      Teacher_Role: state.teacherData ? state.teacherData.role : 'Admin'
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

  const scanType = document.getElementById('scan-type-select').value;

  if (scanType === 'grade') {
    const activeAssignment = scanAssignSelect.value;
    const activeScore = Number(scanScoreInput.value);

    if (!activeAssignment) {
      showToast("กรุณาเลือกการบ้านเพื่อลงคะแนน", "error");
      scannerCooldown = false;
      return;
    }

    try {
      const res = await API.quickGrade({
        Student_ID: studentId,
        Assignment_ID: activeAssignment,
        Score: activeScore,
        Teacher_Username: state.teacherData ? state.teacherData.username : 'admin',
        Teacher_Role: state.teacherData ? state.teacherData.role : 'Admin'
      });

      if (res.success) {
        playBeep('success');
        const student = res.student;
        
        lastScannedText.textContent = `${student.FullName} (${studentId}) - บันทึก ${activeScore} คะแนน`;
        lastScannedResult.classList.remove('hidden');

        // SHOW 5-SECOND HUD OVERLAY
        hudStudentName.textContent = student.FullName;
        hudStudentId.textContent = `รหัสประจำตัว: ${student.Student_ID}`;
        hudStudentClass.textContent = `ชั้นเรียน: ${student.Class || 'ม.ทั่วไป'}`;
        hudStudentScore.textContent = activeScore;
        
        // Show Score Badge
        const scoreBadge = document.querySelector('.hud-score-badge');
        if (scoreBadge) {
          scoreBadge.innerHTML = `+ <span id="hud-student-score">${activeScore}</span> คะแนน`;
          scoreBadge.style.background = 'rgba(16, 185, 129, 0.18)';
          scoreBadge.style.color = '#34d399';
        }
        
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
  } else {
    // Attendance Check-in Scan
    const activeSubject = document.getElementById('scan-subject-select').value;
    if (!activeSubject) {
      showToast("กรุณาเลือกวิชาที่จะเช็คชื่อเข้าเรียน", "error");
      scannerCooldown = false;
      return;
    }

    try {
      const res = await API.scanAttendance({
        Student_ID: studentId,
        Subject_ID: activeSubject,
        Recorded_By: state.teacherData ? state.teacherData.username : 'admin'
      });

      if (res.success) {
        playBeep('success');
        const student = res.student;
        
        lastScannedText.textContent = `${student.FullName} (${studentId}) - เช็คชื่อเข้าเรียนสำเร็จ`;
        lastScannedResult.classList.remove('hidden');

        // SHOW 5-SECOND HUD OVERLAY
        hudStudentName.textContent = student.FullName;
        hudStudentId.textContent = `รหัสประจำตัว: ${student.Student_ID}`;
        hudStudentClass.textContent = `ชั้นเรียน: ${student.Class || 'ม.ทั่วไป'}`;
        
        // Show Check-in status instead of score
        const scoreBadge = document.querySelector('.hud-score-badge');
        if (scoreBadge) {
          scoreBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> เช็คชื่อมาเรียนแล้ว`;
          scoreBadge.style.background = 'rgba(59, 130, 246, 0.18)';
          scoreBadge.style.color = '#60a5fa';
        }
        
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
      showToast(`เกิดข้อผิดพลาดในการเช็คชื่อรหัส ${studentId}`, 'error');
      scannerCooldown = false;
    }
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
  const subjectId = document.getElementById('new-assign-subject').value;
  const due = document.getElementById('new-assign-due').value;
  const score = document.getElementById('new-assign-score').value;

  try {
    const res = await API.createAssignment({
      Assignment_ID: id,
      Assignment_Name: name,
      Subject_ID: subjectId,
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

// Database Actions (Export Report to Google Drive)
const btnExportDrive = document.getElementById('btn-export-drive');
if (btnExportDrive) {
  btnExportDrive.addEventListener('click', async () => {
    const scriptUrl = localStorage.getItem('drive_script_url');
    const folderId = localStorage.getItem('drive_folder_id');
    
    if (!scriptUrl || !folderId) {
      showToast('กรุณากดปุ่ม "ซิงก์รูปจาก Google Drive" เพื่อกรอกข้อมูลการตั้งค่าและบันทึก URL กับ Folder ID ก่อน', 'error');
      if (btnSyncDrivePhotos) btnSyncDrivePhotos.click();
      return;
    }
    
    const btnOriginalText = btnExportDrive.innerHTML;
    btnExportDrive.disabled = true;
    btnExportDrive.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังส่งรายงานไป Drive...';
    
    try {
      const res = await fetch('/api/export-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptUrl, folderId })
      }).then(r => r.json());
      
      if (res.success) {
        showToast(res.message, 'success');
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการส่งออกรายงานไปยัง Google Drive', 'error');
    } finally {
      btnExportDrive.disabled = false;
      btnExportDrive.innerHTML = btnOriginalText;
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
if (btnSyncSheets) {
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
}

// Tab Switching in Teacher Dashboard (Updated to support Accounts & Reports Tabs)
const tabs = ['submissions', 'students', 'teachers', 'reports'];
tabs.forEach(t => {
  const tabEl = document.getElementById(`tab-${t}`);
  if (tabEl) {
    tabEl.addEventListener('click', () => {
      tabs.forEach(x => {
        const xTab = document.getElementById(`tab-${x}`);
        const xView = document.getElementById(`panel-${x}-view`);
        if (xTab) xTab.classList.remove('active');
        if (xView) xView.classList.remove('active');
      });
      document.getElementById(`tab-${t}`).classList.add('active');
      document.getElementById(`panel-${t}-view`).classList.add('active');
      
      if (t === 'teachers') {
        loadTeachersTable();
      } else if (t === 'reports') {
        populateReportsFilters();
      }
    });
  }
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

// Render Students Directory (Optimized with pagination for high performance)
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
    document.getElementById('student-dir-page-info').textContent = 'หน้า 1 จาก 1';
    document.getElementById('btn-student-dir-prev').disabled = true;
    document.getElementById('btn-student-dir-next').disabled = true;
    return;
  }
  
  // Sort by Student ID
  filtered.sort((a, b) => a.Student_ID.localeCompare(b.Student_ID));
  
  // Apply pagination
  const totalPages = Math.ceil(filtered.length / state.directoryLimit) || 1;
  if (state.directoryPage > totalPages) state.directoryPage = totalPages;
  
  const startIndex = (state.directoryPage - 1) * state.directoryLimit;
  const endIndex = startIndex + state.directoryLimit;
  const paginated = filtered.slice(startIndex, endIndex);
  
  paginated.forEach(s => {
    const avatarSrc = s.Photo ? s.Photo : `https://api.dicebear.com/7.x/adventurer/svg?seed=${s.Student_ID}`;
    
    // Attendance Today (NEW)
    const today = new Date().toLocaleDateString('en-CA');
    const todayAtt = state.attendance.find(a => a.Student_ID === String(s.Student_ID) && a.Date === today);
    let attBadge = '<span class="status-badge pending" style="padding: 2px 6px; font-size: 0.65rem; display: inline-flex;"><i class="fa-solid fa-clock"></i> ยังไม่เช็คชื่อ</span>';
    if (todayAtt) {
      if (todayAtt.Status === 'Present') {
        attBadge = '<span class="status-badge graded" style="padding: 2px 6px; font-size: 0.65rem; display: inline-flex;"><i class="fa-solid fa-circle-check"></i> มาเรียน</span>';
      } else {
        attBadge = '<span class="status-badge correction" style="padding: 2px 6px; font-size: 0.65rem; display: inline-flex;"><i class="fa-solid fa-circle-xmark"></i> ขาดเรียน</span>';
      }
    }
    
    // Submissions Stats (NEW)
    const studentSubs = state.submissions.filter(sub => sub.Student_ID === s.Student_ID);
    const totalAssigns = state.assignments.length;
    const submittedCount = studentSubs.filter(sub => sub.Status === 'Graded' || sub.Status === 'Submitted' || sub.Status === 'Resubmitted').length;
    
    let taskBadge = `<span class="status-badge pending" style="padding: 2px 6px; font-size: 0.65rem; display: inline-flex;"><i class="fa-solid fa-file-invoice"></i> ส่งงาน ${submittedCount}/${totalAssigns}</span>`;
    if (totalAssigns > 0) {
      if (submittedCount === totalAssigns) {
        taskBadge = `<span class="status-badge graded" style="padding: 2px 6px; font-size: 0.65rem; display: inline-flex;"><i class="fa-solid fa-check-double"></i> ส่งครบ ${submittedCount}/${totalAssigns}</span>`;
      } else if (submittedCount > 0) {
        taskBadge = `<span class="status-badge submitted" style="padding: 2px 6px; font-size: 0.65rem; display: inline-flex;"><i class="fa-solid fa-file-arrow-up"></i> ส่งงาน ${submittedCount}/${totalAssigns}</span>`;
      } else {
        taskBadge = `<span class="status-badge correction" style="padding: 2px 6px; font-size: 0.65rem; display: inline-flex;"><i class="fa-solid fa-triangle-exclamation"></i> ยังไม่ส่ง</span>`;
      }
    } else {
      taskBadge = `<span class="status-badge pending" style="padding: 2px 6px; font-size: 0.65rem; display: inline-flex;">ไม่มีการบ้าน</span>`;
    }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><img src="${avatarSrc}" alt="Avatar" class="student-table-avatar" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; background: var(--bg-secondary); border: 1px solid var(--glass-border);"></td>
      <td><strong>${s.Student_ID}</strong></td>
      <td>${s.FullName}</td>
      <td><span class="badge-class" style="font-size:0.75rem">${s.Class || '-'}</span></td>
      <td>${s.Email || '-'}</td>
      <td>
        <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start;">
          ${attBadge}
          ${taskBadge}
        </div>
      </td>
      <td>
        <button class="btn btn-purple btn-edit-student-trigger" style="padding: 4px 10px; font-size: 0.8rem;"
                data-id="${s.Student_ID}"
                data-name="${s.FullName}"
                data-class="${s.Class || ''}"
                data-email="${s.Email || ''}"
                data-photo="${s.Photo || ''}">
          <i class="fa-solid fa-user-gear"></i> แก้ไข
        </button>
        <button class="btn btn-green btn-print-student-trigger" style="padding: 4px 10px; font-size: 0.8rem; margin-left: 4px;"
                data-id="${s.Student_ID}"
                data-name="${s.FullName}"
                data-class="${s.Class || ''}"
                data-photo="${avatarSrc}">
          <i class="fa-solid fa-print"></i> พิมพ์บัตร
        </button>
      </td>
    `;
    studentsDirTableBody.appendChild(row);
  });
  
  // Update Pagination Controls
  document.getElementById('student-dir-page-info').textContent = `หน้า ${state.directoryPage} จาก ${totalPages}`;
  document.getElementById('btn-student-dir-prev').disabled = (state.directoryPage === 1);
  document.getElementById('btn-student-dir-next').disabled = (state.directoryPage === totalPages);
  
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

// Student directory search & filter inputs (Reset pagination to page 1 on filter/search change)
document.getElementById('student-dir-search').addEventListener('input', () => {
  state.directoryPage = 1;
  renderStudentsDirectoryTable();
});
document.getElementById('filter-dir-class').addEventListener('change', () => {
  state.directoryPage = 1;
  renderStudentsDirectoryTable();
});

// Bind Pagination Button clicks
document.getElementById('btn-student-dir-prev').addEventListener('click', () => {
  if (state.directoryPage > 1) {
    state.directoryPage--;
    renderStudentsDirectoryTable();
  }
});

document.getElementById('btn-student-dir-next').addEventListener('click', () => {
  const query = document.getElementById('student-dir-search').value.toLowerCase().trim();
  const selectedClass = document.getElementById('filter-dir-class').value;
  const filtered = state.students.filter(s => {
    const matchQuery = !query || 
                       s.FullName.toLowerCase().includes(query) || 
                       s.Student_ID.toLowerCase().includes(query) ||
                       (s.Email && s.Email.toLowerCase().includes(query));
    const matchClass = !selectedClass || s.Class === selectedClass;
    return matchQuery && matchClass;
  });
  const totalPages = Math.ceil(filtered.length / state.directoryLimit) || 1;
  if (state.directoryPage < totalPages) {
    state.directoryPage++;
    renderStudentsDirectoryTable();
  }
});

// Event delegation for single student card printing
document.getElementById('students-dir-table-body').addEventListener('click', (e) => {
  const printBtn = e.target.closest('.btn-print-student-trigger');
  if (printBtn) {
    const s = {
      Student_ID: printBtn.dataset.id,
      FullName: printBtn.dataset.name,
      Class: printBtn.dataset.class,
      Photo: printBtn.dataset.photo
    };
    printStudentCards([s]);
  }
});

// Mass print cards button trigger
document.getElementById('btn-print-class-cards').addEventListener('click', () => {
  const query = document.getElementById('student-dir-search').value.toLowerCase().trim();
  const selectedClass = document.getElementById('filter-dir-class').value;
  const filtered = state.students.filter(s => {
    const matchQuery = !query || 
                       s.FullName.toLowerCase().includes(query) || 
                       s.Student_ID.toLowerCase().includes(query) ||
                       (s.Email && s.Email.toLowerCase().includes(query));
    const matchClass = !selectedClass || s.Class === selectedClass;
    return matchQuery && matchClass;
  });
  
  printStudentCards(filtered);
});

// Student Card Printing Generation logic
function printStudentCards(studentList) {
  const printArea = document.getElementById('print-cards-area');
  const selectedStyle = document.getElementById('select-card-style').value;
  printArea.innerHTML = '';
  
  if (studentList.length === 0) {
    showToast('ไม่มีรายชื่อนักเรียนที่ต้องการพิมพ์บัตร', 'error');
    return;
  }
  
  studentList.forEach(s => {
    const avatarSrc = s.Photo ? s.Photo : `https://api.dicebear.com/7.x/adventurer/svg?seed=${s.Student_ID}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${s.Student_ID}&ecc=M`;
    
    const card = document.createElement('div');
    card.className = `printable-student-card ${selectedStyle}`;
    card.innerHTML = `
      <div class="card-left">
        <img class="student-avatar" src="${avatarSrc}" alt="Avatar">
      </div>
      <div class="card-right">
        <div class="card-right-top">
          <div class="school-logo">SJMR SUBMISSION PORTAL</div>
          <div class="student-name">${s.FullName}</div>
          <div class="student-id">รหัสประจำตัว: ${s.Student_ID}</div>
        </div>
        <div class="card-right-bottom">
          <span class="student-class">${s.Class || '-'}</span>
          <img class="qr-code" src="${qrUrl}" alt="QR">
        </div>
      </div>
    `;
    printArea.appendChild(card);
  });
  
  // Fire browser print dialog with slight timeout
  setTimeout(() => {
    window.print();
  }, 450);
}

// Teacher Accounts Management Table Populator
async function loadTeachersTable() {
  const teachersTableBody = document.getElementById('teachers-table-body');
  teachersTableBody.innerHTML = '<tr><td colspan="4" class="text-center"><i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลดข้อมูล...</td></tr>';
  
  try {
    const list = await fetch('/api/teachers').then(r => r.json());
    teachersTableBody.innerHTML = '';
    
    if (list.length === 0) {
      teachersTableBody.innerHTML = '<tr><td colspan="4" class="text-center">ไม่พบบัญชีคุณครูร่วมสอน</td></tr>';
      return;
    }
    
    list.forEach(t => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${t.username}</strong></td>
        <td>${t.fullName}</td>
        <td><span class="badge-class" style="background: ${t.role === 'Admin' ? 'var(--purple)' : 'var(--blue)'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">${t.role}</span></td>
        <td>
          ${t.username.toLowerCase() === 'admin' ? '<small class="text-muted">บัญชีหลักไม่สามารถลบได้</small>' : `
            <button class="btn btn-red btn-delete-teacher-trigger" data-username="${t.username}" style="padding: 4px 10px; font-size: 0.8rem;">
              <i class="fa-solid fa-trash-can"></i> ลบ
            </button>
          `}
        </td>
      `;
      teachersTableBody.appendChild(row);
    });
    // Call loadSystemLogs() and loadSubjectsTable()
    loadSystemLogs();
    loadSubjectsTable();
  } catch (err) {
    console.error(err);
    teachersTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-red">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
  }
}

// Modal bindings for adding new teachers
const addTeacherModal = document.getElementById('add-teacher-modal');
const btnAddTeacherTrigger = document.getElementById('btn-add-teacher-trigger');
const addTeacherForm = document.getElementById('add-teacher-form');

if (btnAddTeacherTrigger && addTeacherModal) {
  btnAddTeacherTrigger.addEventListener('click', () => {
    addTeacherForm.reset();
    openModal(addTeacherModal);
  });
}

if (addTeacherForm) {
  addTeacherForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('new-teacher-username').value.trim();
    const password = document.getElementById('new-teacher-password').value;
    const fullName = document.getElementById('new-teacher-fullname').value.trim();
    const role = document.getElementById('new-teacher-role').value;
    
    const btnSubmit = addTeacherForm.querySelector('button[type="submit"]');
    const btnOriginalText = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...';
    
    try {
      const res = await fetch('/api/teacher/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, fullName, role })
      }).then(r => r.json());
      
      if (res.success) {
        showToast(res.message, 'success');
        logAgentEvent('create_teacher', 'Teacher', { target: username });
        closeModal(addTeacherModal);
        loadTeachersTable();
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = btnOriginalText;
    }
  });
}

// Delete teacher click delegation handler
document.getElementById('teachers-table-body').addEventListener('click', async (e) => {
  const delBtn = e.target.closest('.btn-delete-teacher-trigger');
  if (delBtn) {
    const username = delBtn.dataset.username;
    if (confirm(`คุณครูยืนยันว่าต้องการลบบัญชีผู้ใช้งาน "${username}" ใช่หรือไม่?`)) {
      try {
        const res = await fetch('/api/teacher/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        }).then(r => r.json());
        
        if (res.success) {
          showToast(res.message, 'success');
          logAgentEvent('delete_teacher', 'Teacher', { target: username });
          loadTeachersTable();
        } else {
          showToast(res.message, 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('เกิดข้อผิดพลาดในการลบบัญชีผู้ใช้', 'error');
      }
    }
  }
});

// Teacher Logout Button Handler (NEW)
const btnTeacherLogout = document.getElementById('btn-teacher-logout');
if (btnTeacherLogout) {
  btnTeacherLogout.addEventListener('click', () => {
    logAgentEvent('teacher_logout', 'Teacher', { username: state.teacherData ? state.teacherData.username : '' });
    localStorage.removeItem('auth_teacher'); // CLEAR PERSISTENCE
    state.teacherData = null;
    btnTeacherLogout.classList.add('hidden');
    document.querySelector('.mode-toggle-container').classList.remove('hidden');
    switchView('student');
    showToast('ออกจากระบบคุณครูเรียบร้อยแล้ว', 'success');
  });
}

// Log agent events to backend database (NEW)
async function logAgentEvent(action, role, details = {}) {
  try {
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, role, details })
    });
  } catch (err) {
    console.warn('Agent AI Logger failed:', err);
  }
}

// Agent AI Activity Logs Terminal Loader (NEW)
async function loadSystemLogs() {
  const logsTerminal = document.getElementById('ai-logs-terminal');
  if (!logsTerminal) return;
  try {
    const logs = await fetch('/api/logs').then(r => r.json());
    logsTerminal.innerHTML = '';
    if (logs.length === 0) {
      logsTerminal.innerHTML = '<div>[System Alert] No activity logs recorded yet.</div>';
      return;
    }
    logs.forEach(log => {
      const timeStr = new Date(log.timestamp).toLocaleTimeString();
      const detailsStr = JSON.stringify(log.details);
      const div = document.createElement('div');
      div.style.marginBottom = '4px';
      div.innerHTML = `<span style="color: #6ee7b7;">[${timeStr}]</span> <span style="color: #60a5fa;">[${log.role}]</span> <span style="color: #f472b6;">${log.action}</span> - ${detailsStr}`;
      logsTerminal.appendChild(div);
    });
  } catch (err) {
    logsTerminal.innerHTML = '<div>[System Error] Failed to load activity logs from server.</div>';
  }
}

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

// Initialize immediately on script execution (Includes automatic backend configuration sync handshake & persistence restore)
function initApp() {
  checkQueryParams();
  
  // Sync locally saved cloud configs to server on startup (Real-time sync handshake)
  const scriptUrl = localStorage.getItem('drive_script_url');
  const folderId = localStorage.getItem('drive_folder_id');
  if (scriptUrl && folderId) {
    fetch('/api/save-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptUrl, folderId })
    }).catch(err => console.error('Handshake config sync to cloud database failed:', err));
  }
  
  // Restore persistent login sessions (NEW)
  const authTeacher = localStorage.getItem('auth_teacher');
  const authStudentId = localStorage.getItem('auth_student_id');
  if (authTeacher) {
    try {
      state.teacherData = JSON.parse(authTeacher);
      
      // Update UI for teacher logged in
      document.querySelector('.mode-toggle-container').classList.add('hidden');
      document.getElementById('btn-teacher-logout').classList.remove('hidden');
      
      switchView('teacher');
    } catch (e) {
      localStorage.removeItem('auth_teacher');
    }
  } else if (authStudentId) {
    loginStudent(authStudentId);
  }
  
  // Theme Toggle Initializer
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    applyTheme(savedTheme);
  }
}

// Run initialization immediately since script is at the bottom of the body
initApp();

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

// ================= SCAN LIMIT & SCAN TYPE BINDINGS =================

const selectDirLimit = document.getElementById('select-dir-limit');
if (selectDirLimit) {
  selectDirLimit.addEventListener('change', () => {
    state.directoryLimit = parseInt(selectDirLimit.value) || 50;
    state.directoryPage = 1;
    renderStudentsDirectoryTable();
  });
}

const scanTypeSelect = document.getElementById('scan-type-select');
if (scanTypeSelect) {
  scanTypeSelect.addEventListener('change', () => {
    const val = scanTypeSelect.value;
    const subjectGroup = document.getElementById('scan-subject-group');
    const assignGroup = document.getElementById('scan-assign-group');
    const scoreGroup = document.getElementById('scan-score-group');
    
    if (val === 'grade') {
      if (subjectGroup) subjectGroup.style.display = 'none';
      if (assignGroup) assignGroup.style.display = 'block';
      if (scoreGroup) scoreGroup.style.display = 'block';
    } else {
      if (subjectGroup) subjectGroup.style.display = 'block';
      if (assignGroup) assignGroup.style.display = 'none';
      if (scoreGroup) scoreGroup.style.display = 'none';
    }
  });
}

// ================= REPORTS TAB LOGIC =================

function populateReportsFilters() {
  const classSelect = document.getElementById('report-class-select');
  const studentSelect = document.getElementById('report-student-select');
  
  if (!classSelect || !studentSelect) return;
  
  // Populate Class dropdown
  const classes = [...new Set(state.students.map(s => s.Class).filter(Boolean))].sort();
  classSelect.innerHTML = classes.map(c => `<option value="${c}">${c}</option>`).join('');
  
  // Add change listener to Class Select to update Student List
  classSelect.removeEventListener('change', updateStudentReportDropdown);
  classSelect.addEventListener('change', updateStudentReportDropdown);
  
  updateStudentReportDropdown();
}

function updateStudentReportDropdown() {
  const classSelect = document.getElementById('report-class-select');
  const studentSelect = document.getElementById('report-student-select');
  if (!classSelect || !studentSelect) return;
  
  const selectedClass = classSelect.value;
  const classStudents = state.students.filter(s => s.Class === selectedClass).sort((a, b) => a.Student_ID.localeCompare(b.Student_ID));
  
  studentSelect.innerHTML = classStudents.map(s => `<option value="${s.Student_ID}">${s.Student_ID} - ${s.FullName}</option>`).join('');
}

const reportTypeSelect = document.getElementById('report-type-select');
if (reportTypeSelect) {
  reportTypeSelect.addEventListener('change', () => {
    const studentFilterGroup = document.getElementById('report-student-filter-group');
    if (studentFilterGroup) {
      if (reportTypeSelect.value === 'individual') {
        studentFilterGroup.style.display = 'flex';
      } else {
        studentFilterGroup.style.display = 'none';
      }
    }
  });
}

function isWithinPeriod(dateStr, period) {
  if (!dateStr) return false;
  const dateOnlyStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA');
  
  if (period === 'daily') {
    return dateOnlyStr === todayStr;
  }
  
  const recordDate = new Date(dateOnlyStr);
  const today = new Date(todayStr);
  
  let daysDiff = 0;
  if (period === 'weekly') daysDiff = 7;
  else if (period === 'monthly') daysDiff = 30;
  else if (period === 'semester') daysDiff = 120;
  else if (period === 'yearly') daysDiff = 365;
  
  const diffTime = today - recordDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= daysDiff;
}

const btnGenerateReport = document.getElementById('btn-generate-report');
if (btnGenerateReport) {
  btnGenerateReport.addEventListener('click', () => {
    const subjectId = document.getElementById('report-subject-select').value;
    const period = document.getElementById('report-period-select').value;
    const type = document.getElementById('report-type-select').value;
    const selectedClass = document.getElementById('report-class-select').value;
    const studentId = document.getElementById('report-student-select').value;
    
    const resultsPanel = document.getElementById('report-results-panel');
    const printArea = document.getElementById('print-report-area');
    
    if (type === 'individual') {
      if (!studentId) {
        showToast('กรุณาเลือกนักเรียนเพื่อดึงรายงาน', 'error');
        return;
      }
      generateIndividualReport(studentId, subjectId, period, resultsPanel, printArea);
    } else {
      if (!selectedClass) {
        showToast('กรุณาเลือกชั้นเรียนเพื่อดึงรายงาน', 'error');
        return;
      }
      generateClassReport(selectedClass, subjectId, period, resultsPanel, printArea);
    }
  });
}

function generateIndividualReport(studentId, subjectId, period, resultsPanel, printArea) {
  const student = state.students.find(s => s.Student_ID === studentId);
  if (!student) return;
  
  const filteredAssignments = state.assignments.filter(a => {
    const matchSubject = subjectId === 'all' || a.Subject_ID === subjectId;
    const matchPeriod = isWithinPeriod(a.Due_Date, period);
    return matchSubject && matchPeriod;
  });
  
  const studentSubmissions = state.submissions.filter(sub => {
    if (sub.Student_ID !== studentId) return false;
    const assign = state.assignments.find(a => a.Assignment_ID === sub.Assignment_ID);
    if (!assign) return false;
    const matchSubject = subjectId === 'all' || assign.Subject_ID === subjectId;
    const matchPeriod = isWithinPeriod(sub.Timestamp, period);
    return matchSubject && matchPeriod;
  });
  
  const studentAttendance = state.attendance.filter(att => {
    if (att.Student_ID !== String(studentId)) return false;
    const matchSubject = subjectId === 'all' || att.Subject_ID === subjectId;
    const matchPeriod = isWithinPeriod(att.Date, period);
    return matchSubject && matchPeriod;
  });
  
  const totalTasks = filteredAssignments.length;
  let submittedTasks = 0;
  let pendingTasks = 0;
  let scoreSum = 0;
  let scoreMax = 0;
  let gradedCount = 0;
  
  filteredAssignments.forEach(assign => {
    const sub = studentSubmissions.find(s => s.Assignment_ID === assign.Assignment_ID);
    if (sub) {
      if (sub.Status === 'Graded' || sub.Status === 'Submitted' || sub.Status === 'Resubmitted') {
        submittedTasks++;
      } else {
        pendingTasks++;
      }
      if (sub.Score !== null) {
        scoreSum += sub.Score;
        scoreMax += assign.Max_Score;
        gradedCount++;
      }
    } else {
      pendingTasks++;
    }
  });
  
  const scoreAvg = gradedCount > 0 ? (scoreSum / gradedCount).toFixed(1) : '0.0';
  
  const totalAtt = studentAttendance.length;
  const presentAtt = studentAttendance.filter(a => a.Status === 'Present').length;
  const absentAtt = totalAtt - presentAtt;
  const attPercent = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 0;
  
  const avatarSrc = student.Photo ? student.Photo : `https://api.dicebear.com/7.x/adventurer/svg?seed=${student.Student_ID}`;
  
  let tasksTableRows = '';
  if (filteredAssignments.length === 0) {
    tasksTableRows = '<tr><td colspan="5" class="text-center">ไม่มีข้อมูลภาระงานในช่วงเวลานี้</td></tr>';
  } else {
    filteredAssignments.forEach(assign => {
      const sub = studentSubmissions.find(s => s.Assignment_ID === assign.Assignment_ID);
      const formattedDate = new Date(assign.Due_Date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
      let scoreDisp = '-';
      let statusDisp = 'ยังไม่ส่ง';
      
      if (sub) {
        scoreDisp = sub.Score !== null ? `${sub.Score} / ${assign.Max_Score}` : `รอตรวจ / ${assign.Max_Score}`;
        if (sub.Status === 'Graded') statusDisp = 'ตรวจแล้ว';
        else if (sub.Status === 'Need_Correction') statusDisp = 'แก้ไขใหม่';
        else statusDisp = 'ส่งแล้ว';
      }
      
      const subj = state.subjects.find(s => s.Subject_ID === assign.Subject_ID);
      const subjName = subj ? subj.Subject_Name : 'วิชาทั่วไป';
      
      tasksTableRows += `
        <tr>
          <td><strong>${assign.Assignment_ID}</strong></td>
          <td>${assign.Assignment_Name} <br><small style="color: var(--text-muted); font-size: 0.7rem;">วิชา: ${subjName}</small></td>
          <td>${formattedDate}</td>
          <td>${scoreDisp}</td>
          <td>${statusDisp}</td>
        </tr>
      `;
    });
  }
  
  let attendanceTableRows = '';
  if (studentAttendance.length === 0) {
    attendanceTableRows = '<tr><td colspan="4" class="text-center">ไม่มีบันทึกประวัติการเข้าเรียนในช่วงเวลานี้</td></tr>';
  } else {
    const sortedAtt = [...studentAttendance].sort((a, b) => new Date(b.Date) - new Date(a.Date)).slice(0, 10);
    sortedAtt.forEach(att => {
      const formattedDate = new Date(att.Date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
      const subj = state.subjects.find(s => s.Subject_ID === att.Subject_ID);
      const subjName = subj ? `${att.Subject_ID} - ${subj.Subject_Name}` : att.Subject_ID;
      const statusDisp = att.Status === 'Present' ? 'มาเรียน' : 'ขาดเรียน';
      
      attendanceTableRows += `
        <tr>
          <td>${formattedDate}</td>
          <td>${subjName}</td>
          <td>${statusDisp}</td>
          <td>${att.Recorded_By || 'system'}</td>
        </tr>
      `;
    });
  }
  
  const reportHtml = `
    <div style="display: flex; gap: 10px; margin-bottom: 20px; align-self: flex-start;">
      <button id="btn-print-active-report" class="btn btn-purple"><i class="fa-solid fa-print"></i> พิมพ์รายงานสรุป A4</button>
    </div>
    <div class="report-paper-preview">
      <div class="report-header">
        <div class="report-header-left">
          <div class="logo"><i class="fa-solid fa-graduation-cap"></i></div>
          <div class="report-title">
            <h2>โรงเรียนเซนต์โยเซฟแม่ระมาด</h2>
            <p>SJMR Student Submission & Attendance Report</p>
          </div>
        </div>
        <div class="report-metadata">
          <div><strong>ประเภทรายงาน:</strong> รายงานสรุปผลรายบุคคล</div>
          <div><strong>วันที่ออกรายงาน:</strong> ${new Date().toLocaleDateString('th-TH')}</div>
        </div>
      </div>

      <div class="report-profile-section">
        <img src="${avatarSrc}" alt="Student Avatar" class="report-avatar">
        <div class="report-profile-details">
          <div class="item"><strong>ชื่อ-นามสกุล:</strong> ${student.FullName}</div>
          <div class="item"><strong>รหัสประจำตัว:</strong> ${student.Student_ID}</div>
          <div class="item"><strong>ชั้นเรียน:</strong> ${student.Class || '-'}</div>
          <div class="item"><strong>อีเมล:</strong> ${student.Email || '-'}</div>
        </div>
      </div>

      <div class="report-stats-grid">
        <div class="report-stat-box">
          <h4><i class="fa-solid fa-calendar-check" style="color: #3b82f6;"></i> สรุปการเข้าเรียน</h4>
          <div class="report-stat-num-row">
            <div class="report-stat-num">
              <span class="num">${totalAtt}</span>
              <span class="label">คาบเรียนทั้งหมด</span>
            </div>
            <div class="report-stat-num">
              <span class="num success">${presentAtt}</span>
              <span class="label">มาเรียน</span>
            </div>
            <div class="report-stat-num">
              <span class="num error">${absentAtt}</span>
              <span class="label">ขาดเรียน</span>
            </div>
          </div>
          <div style="margin-top: 15px; text-align: center; font-size: 0.85rem; font-weight: bold; color: #1e3a8a;">
            อัตราการเข้าเรียน: ${attPercent}%
          </div>
        </div>

        <div class="report-stat-box">
          <h4><i class="fa-solid fa-book" style="color: #8b5cf6;"></i> สรุปการส่งงาน</h4>
          <div class="report-stat-num-row">
            <div class="report-stat-num">
              <span class="num">${totalTasks}</span>
              <span class="label">ภาระงานทั้งหมด</span>
            </div>
            <div class="report-stat-num">
              <span class="num success">${submittedTasks}</span>
              <span class="label">ส่งแล้ว</span>
            </div>
            <div class="report-stat-num">
              <span class="num error">${pendingTasks}</span>
              <span class="label">งานค้างส่ง</span>
            </div>
          </div>
          <div style="margin-top: 15px; text-align: center; font-size: 0.85rem; font-weight: bold; color: #1e3a8a;">
            คะแนนรวม: ${scoreSum}/${scoreMax} | เฉลี่ย: ${scoreAvg} คะแนน
          </div>
        </div>
      </div>

      <div class="report-table-section">
        <h4><i class="fa-solid fa-list-check"></i> รายการผลการส่งงานและการบ้าน</h4>
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 15%">รหัสการบ้าน</th>
              <th style="width: 45%">ชื่อภาระงาน / วิชา</th>
              <th style="width: 15%">กำหนดส่ง</th>
              <th style="width: 10%">คะแนน</th>
              <th style="width: 15%">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            ${tasksTableRows}
          </tbody>
        </table>
      </div>

      <div class="report-table-section" style="margin-top: 15px;">
        <h4><i class="fa-solid fa-clipboard-user"></i> ประวัติการเข้าเรียน (ล่าสุด 10 คาบ)</h4>
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 25%">วันที่</th>
              <th style="width: 35%">รหัสวิชา - รายวิชา</th>
              <th style="width: 20%">สถานะ</th>
              <th style="width: 20%">บันทึกโดย</th>
            </tr>
          </thead>
          <tbody>
            ${attendanceTableRows}
          </tbody>
        </table>
      </div>

      <div class="report-footer">
        <div>* รายงานฉบับนี้ประมวลผลโดยระบบอัตโนมัติ SJMR Portal</div>
        <div class="report-signature">
          <div class="line"></div>
          <div>(ลงชื่อ) คุณครูประจำชั้น / ผู้ประเมิน</div>
        </div>
      </div>
    </div>
  `;
  
  resultsPanel.innerHTML = reportHtml;
  resultsPanel.style.background = 'transparent';
  resultsPanel.style.border = 'none';
  
  printArea.innerHTML = resultsPanel.querySelector('.report-paper-preview').outerHTML;
  
  document.getElementById('btn-print-active-report').addEventListener('click', () => {
    window.print();
  });
}

function generateClassReport(selectedClass, subjectId, period, resultsPanel, printArea) {
  const classStudents = state.students.filter(s => s.Class === selectedClass);
  if (classStudents.length === 0) {
    resultsPanel.innerHTML = '<p class="text-center text-muted">ไม่พบข้อมูลนักเรียนในชั้นเรียนนี้</p>';
    return;
  }
  
  const classAssignments = state.assignments.filter(a => {
    const matchSubject = subjectId === 'all' || a.Subject_ID === subjectId;
    const matchPeriod = isWithinPeriod(a.Due_Date, period);
    return matchSubject && matchPeriod;
  });
  
  const classTotalTasks = classAssignments.length;
  let totalClassAttendanceRecords = 0;
  let presentClassAttendanceRecords = 0;
  let totalSubmissionsCount = 0;
  let totalPossibleSubmissions = classStudents.length * classTotalTasks;
  let gradedScoresSum = 0;
  let gradedScoresCount = 0;
  
  let classStudentsRows = '';
  
  classStudents.forEach(student => {
    const studentId = student.Student_ID;
    
    const studentAttendance = state.attendance.filter(att => {
      if (att.Student_ID !== String(studentId)) return false;
      const matchSubject = subjectId === 'all' || att.Subject_ID === subjectId;
      const matchPeriod = isWithinPeriod(att.Date, period);
      return matchSubject && matchPeriod;
    });
    
    const attCount = studentAttendance.length;
    const presentCount = studentAttendance.filter(a => a.Status === 'Present').length;
    
    totalClassAttendanceRecords += attCount;
    presentClassAttendanceRecords += presentCount;
    
    const attPercent = attCount > 0 ? Math.round((presentCount / attCount) * 100) : 100;
    
    const studentSubmissions = state.submissions.filter(sub => {
      if (sub.Student_ID !== studentId) return false;
      const assign = state.assignments.find(a => a.Assignment_ID === sub.Assignment_ID);
      if (!assign) return false;
      const matchSubject = subjectId === 'all' || assign.Subject_ID === subjectId;
      const matchPeriod = isWithinPeriod(sub.Timestamp, period);
      return matchSubject && matchPeriod;
    });
    
    let submittedCount = 0;
    let studentScoreSum = 0;
    let studentGradedCount = 0;
    
    classAssignments.forEach(assign => {
      const sub = studentSubmissions.find(s => s.Assignment_ID === assign.Assignment_ID);
      if (sub) {
        if (sub.Status === 'Graded' || sub.Status === 'Submitted' || sub.Status === 'Resubmitted') {
          submittedCount++;
          totalSubmissionsCount++;
        }
        if (sub.Score !== null) {
          studentScoreSum += sub.Score;
          studentGradedCount++;
          gradedScoresSum += sub.Score;
          gradedScoresCount++;
        }
      }
    });
    
    const avgScore = studentGradedCount > 0 ? (studentScoreSum / studentGradedCount).toFixed(1) : '0.0';
    
    classStudentsRows += `
      <tr>
        <td><strong>${student.Student_ID}</strong></td>
        <td>${student.FullName}</td>
        <td>${presentCount} / ${attCount} (${attPercent}%)</td>
        <td>${submittedCount} / ${classTotalTasks}</td>
        <td>${avgScore}</td>
      </tr>
    `;
  });
  
  const avgAttendance = totalClassAttendanceRecords > 0 ? Math.round((presentClassAttendanceRecords / totalClassAttendanceRecords) * 100) : 100;
  const avgScore = gradedScoresCount > 0 ? (gradedScoresSum / gradedScoresCount).toFixed(1) : '0.0';
  const classSubmittedPercent = totalPossibleSubmissions > 0 ? Math.round((totalSubmissionsCount / totalPossibleSubmissions) * 100) : 100;
  const classPendingCount = totalPossibleSubmissions - totalSubmissionsCount;
  
  const reportHtml = `
    <div style="display: flex; gap: 10px; margin-bottom: 20px; align-self: flex-start;">
      <button id="btn-print-active-report" class="btn btn-purple"><i class="fa-solid fa-print"></i> พิมพ์รายงานสรุป A4</button>
    </div>
    <div class="report-paper-preview">
      <div class="report-header">
        <div class="report-header-left">
          <div class="logo"><i class="fa-solid fa-graduation-cap"></i></div>
          <div class="report-title">
            <h2>โรงเรียนเซนต์โยเซฟแม่ระมาด</h2>
            <p>SJMR Student Submission & Attendance Report</p>
          </div>
        </div>
        <div class="report-metadata">
          <div><strong>ประเภทรายงาน:</strong> รายงานสรุปผลภาพรวมห้องเรียน</div>
          <div><strong>ชั้นเรียน:</strong> ${selectedClass}</div>
          <div><strong>วันที่ออกรายงาน:</strong> ${new Date().toLocaleDateString('th-TH')}</div>
        </div>
      </div>

      <div class="report-stats-grid">
        <div class="report-stat-box">
          <h4><i class="fa-solid fa-users" style="color: #3b82f6;"></i> ข้อมูลภาพรวมห้องเรียน</h4>
          <div class="report-stat-num-row">
            <div class="report-stat-num">
              <span class="num">${classStudents.length}</span>
              <span class="label">นักเรียนทั้งหมด</span>
            </div>
            <div class="report-stat-num">
              <span class="num success">${avgAttendance}%</span>
              <span class="label">อัตราเข้าเรียนเฉลี่ย</span>
            </div>
            <div class="report-stat-num">
              <span class="num warning">${avgScore}</span>
              <span class="label">คะแนนเฉลี่ยห้อง</span>
            </div>
          </div>
        </div>

        <div class="report-stat-box">
          <h4><i class="fa-solid fa-file-invoice" style="color: #8b5cf6;"></i> การส่งการบ้านภาพรวม</h4>
          <div class="report-stat-num-row">
            <div class="report-stat-num">
              <span class="num">${classTotalTasks}</span>
              <span class="label">การบ้านทั้งหมด</span>
            </div>
            <div class="report-stat-num">
              <span class="num success">${classSubmittedPercent}%</span>
              <span class="label">อัตราการส่งงาน</span>
            </div>
            <div class="report-stat-num">
              <span class="num error">${classPendingCount}</span>
              <span class="label">งานค้างส่งรวม</span>
            </div>
          </div>
        </div>
      </div>

      <div class="report-table-section">
        <h4><i class="fa-solid fa-table"></i> ตารางวิเคราะห์ข้อมูลนักเรียนรายบุคคลในห้องเรียน</h4>
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 15%">รหัสนักเรียน</th>
              <th style="width: 35%">ชื่อ-นามสกุล</th>
              <th style="width: 15%">เข้าเรียน (ครั้ง)</th>
              <th style="width: 15%">ส่งงาน / ทั้งหมด</th>
              <th style="width: 20%">คะแนนเฉลี่ย</th>
            </tr>
          </thead>
          <tbody>
            ${classStudentsRows}
          </tbody>
        </table>
      </div>

      <div class="report-footer">
        <div>* รายงานฉบับนี้ประมวลผลโดยระบบอัตโนมัติ SJMR Portal</div>
        <div class="report-signature">
          <div class="line"></div>
          <div>(ลงชื่อ) คุณครูประจำชั้น / ผู้ประเมิน</div>
        </div>
      </div>
    </div>
  `;
  
  resultsPanel.innerHTML = reportHtml;
  resultsPanel.style.background = 'transparent';
  resultsPanel.style.border = 'none';
  
  printArea.innerHTML = resultsPanel.querySelector('.report-paper-preview').outerHTML;
  
  document.getElementById('btn-print-active-report').addEventListener('click', () => {
    window.print();
  });
}

// ================= SUBJECT MANAGEMENT BINDINGS =================

async function loadSubjectsTable() {
  const subjectsTableBody = document.getElementById('subjects-table-body');
  if (!subjectsTableBody) return;
  subjectsTableBody.innerHTML = '<tr><td colspan="4" class="text-center"><i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลดข้อมูล...</td></tr>';
  
  try {
    const list = await fetch('/api/subjects').then(r => r.json());
    const teachersList = await fetch('/api/teachers').then(r => r.json());
    
    subjectsTableBody.innerHTML = '';
    
    if (list.length === 0) {
      subjectsTableBody.innerHTML = '<tr><td colspan="4" class="text-center">ไม่พบรายการวิชาเรียน</td></tr>';
      return;
    }
    
    list.forEach(s => {
      let teacherName = 'ครูทุกคน (วิชากิจกรรม)';
      if (s.Teacher_Username !== 'any') {
        const t = teachersList.find(x => x.username.toLowerCase() === s.Teacher_Username.toLowerCase());
        teacherName = t ? `${t.fullName} (${s.Teacher_Username})` : s.Teacher_Username;
      }
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${s.Subject_ID}</strong></td>
        <td>${s.Subject_Name}</td>
        <td><span class="badge-class" style="background: rgba(139,92,246,0.15); color: #c084fc; border: 1px solid rgba(139,92,246,0.3); font-size: 0.75rem;">${teacherName}</span></td>
        <td>
          <button class="btn btn-red btn-delete-subject-trigger" data-id="${s.Subject_ID}" style="padding: 4px 10px; font-size: 0.8rem;">
            <i class="fa-solid fa-trash-can"></i> ลบ
          </button>
        </td>
      `;
      subjectsTableBody.appendChild(row);
    });
  } catch (err) {
    console.error(err);
    subjectsTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-red">เกิดข้อผิดพลาดในการโหลดวิชาเรียน</td></tr>';
  }
}

const addSubjectModal = document.getElementById('add-subject-modal');
const btnAddSubjectTrigger = document.getElementById('btn-add-subject-trigger');
const addSubjectForm = document.getElementById('add-subject-form');

if (btnAddSubjectTrigger && addSubjectModal) {
  btnAddSubjectTrigger.addEventListener('click', async () => {
    addSubjectForm.reset();
    
    const selectTeacher = document.getElementById('new-subject-teacher');
    if (selectTeacher) {
      selectTeacher.innerHTML = '<option value="any">ครูทุกคน (วิชากิจกรรม เช่น ลูกเสือ/ชุมนุม)</option>';
      try {
        const teachersList = await fetch('/api/teachers').then(r => r.json());
        teachersList.forEach(t => {
          const opt = document.createElement('option');
          opt.value = t.username;
          opt.textContent = `${t.fullName} (${t.username})`;
          selectTeacher.appendChild(opt);
        });
      } catch (e) {
        console.error('Failed to load teachers for subject assignment:', e);
      }
    }
    
    openModal(addSubjectModal);
  });
}

if (addSubjectForm) {
  addSubjectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('new-subject-id').value.trim();
    const name = document.getElementById('new-subject-name').value.trim();
    const teacher = document.getElementById('new-subject-teacher').value;
    
    const btnSubmit = addSubjectForm.querySelector('button[type="submit"]');
    const btnOriginalText = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...';
    
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Subject_ID: id, Subject_Name: name, Teacher_Username: teacher })
      }).then(r => r.json());
      
      if (res.success) {
        showToast(res.message, 'success');
        logAgentEvent('create_subject', 'Teacher', { subjectId: id, teacher });
        closeModal(addSubjectModal);
        
        await loadTeacherDashboard(); 
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = btnOriginalText;
    }
  });
}

document.getElementById('panel-teachers-view').addEventListener('click', async (e) => {
  const delBtn = e.target.closest('.btn-delete-subject-trigger');
  if (delBtn) {
    const subjectId = delBtn.dataset.id;
    if (confirm(`คุณครูยืนยันว่าต้องการลบรายวิชา "${subjectId}" ใช่หรือไม่?`)) {
      try {
        const res = await fetch('/api/subjects/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ Subject_ID: subjectId })
        }).then(r => r.json());
        
        if (res.success) {
          showToast(res.message, 'success');
          logAgentEvent('delete_subject', 'Teacher', { subjectId });
          await loadTeacherDashboard(); 
        } else {
          showToast(res.message, 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('เกิดข้อผิดพลาดในการลบรายวิชา', 'error');
      }
    }
  }
});

