// SJMR Student Submission Portal - Client Side JavaScript

// API endpoints helper
const API = {
  getStudentInfo: (id) => fetch(`/api/student/${id}`).then(r => r.json()),
  getAssignments: () => fetch('/api/assignments').then(r => r.json()),
  getSubmissions: () => fetch('/api/submissions').then(r => r.json()),
  getStudentsList: (username, role) => fetch(`/api/students?username=${encodeURIComponent(username || '')}&role=${encodeURIComponent(role || '')}`).then(r => r.json()),
  
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
  }).then(r => r.json()),
  bulkPromote: (data) => fetch('/api/student/bulk-promote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  bulkDelete: (data) => fetch('/api/student/bulk-delete', {
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
  studentAssignmentFilter: 'all',
  studentAssignmentSearch: '',
  studentAssignmentSubject: '',
  studentAssignmentSort: 'priority',
  selectedFile: null,
  autoRouteAssignmentId: null, // From URL query ?assign=AXXX
  selectedStudentIds: new Set() // Selected student IDs for bulk actions (NEW)
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
const studentAssignmentSummary = document.getElementById('student-assignment-summary');
const studentAssignmentSearch = document.getElementById('student-assignment-search');
const studentAssignmentSubjectFilter = document.getElementById('student-assignment-subject-filter');
const studentAssignmentSort = document.getElementById('student-assignment-sort');

// Teacher Elements
const statTotalStudents = document.getElementById('stat-total-students');
const statTotalAssignments = document.getElementById('stat-total-assignments');
const statTotalSubmissions = document.getElementById('stat-total-submissions');
const statGradedSubmissions = document.getElementById('stat-graded-submissions');
const submissionsTableBody = document.getElementById('submissions-table-body');
const teacherSearch = document.getElementById('teacher-search');
const filterClass = document.getElementById('filter-class');
const filterAssignment = document.getElementById('filter-assignment');
const filterSubject = document.getElementById('filter-subject'); // NEW
const filterStatus = document.getElementById('filter-status'); // NEW
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
const assignmentEditModal = document.getElementById('assignment-edit-modal');
const assignmentEditForm = document.getElementById('assignment-edit-form');
const assignmentsTableBody = document.getElementById('assignments-table-body');

// Close buttons for modals (updated to be generic and support all modals including the edit modal)
document.querySelectorAll('.btn-close-modal, .btn-close-modal-btn, .btn-close-pwd-modal, .btn-close-pwd-modal-btn, .btn-close-grade-modal, .btn-close-grade-modal-btn, .btn-close-edit-modal-btn, .btn-close-assignment-edit-modal-btn').forEach(btn => {
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
  const assignParam = urlParams.get('assign') || urlParams.get('assignment_id');
  if (assignParam) {
    state.autoRouteAssignmentId = assignParam;
    console.log(`Auto routing detected for assignment: ${assignParam}`);
  }
  const studentIdParam = urlParams.get('student_id') || urlParams.get('studentId');
  if (studentIdParam) {
    state.autoLoginStudentId = studentIdParam;
    console.log(`Auto login detected for student: ${studentIdParam}`);
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
    applyRolePrivileges(); // Run instantly to protect UI!
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
      
      // Update teacher profile badge (NEW)
      const teacherProfileBadge = document.getElementById('teacher-profile-badge');
      const teacherNameHeader = document.getElementById('teacher-name-display-header');
      if (teacherProfileBadge && teacherNameHeader) {
        const roleLabel = res.teacher.role === 'Admin' ? 'แอดมิน' : 'คุณครู';
        teacherNameHeader.textContent = `${roleLabel}: ${res.teacher.fullName}`;
        teacherProfileBadge.classList.remove('hidden');
      }
      
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
        const autoLoginUrl = `${window.location.origin}/?student_id=${res.student.Student_ID}`;
        studentQrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(autoLoginUrl)}&ecc=M`;
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
  state.selectedStudentIds.clear();
  updateBulkToolbar();
  
  studentAuthCard.classList.remove('hidden');
  studentDashboard.classList.add('hidden');
  showToast('ออกจากระบบเรียบร้อย');
});

// Load assignments for Student
async function loadStudentAssignments() {
  try {
    const [assignments, subjects] = await Promise.all([
      API.getAssignments(),
      state.subjects.length ? Promise.resolve(state.subjects) : API.getSubjects()
    ]);
    state.assignments = assignments;
    state.subjects = Array.isArray(subjects) ? subjects : [];
    
    renderStudentAssignments();
  } catch (err) {
    console.error(err);
    showToast('โหลดงานการบ้านไม่สำเร็จ', 'error');
  }
}

function getStudentVisibleAssignments() {
  const studentClass = state.studentData ? state.studentData.Class : '';
  return state.assignments.filter(assign => {
    if (!assign.Class) return true;
    if (Array.isArray(assign.Class)) {
      return assign.Class.includes('all') ||
             assign.Class.includes('ทุกชั้นเรียน') ||
             assign.Class.some(c => String(c).toLowerCase() === studentClass.toLowerCase());
    }
    return assign.Class === 'all' ||
           assign.Class === 'ทุกชั้นเรียน' ||
           String(assign.Class).toLowerCase() === studentClass.toLowerCase();
  });
}

function getAssignmentViewData(assign) {
  const submission = state.studentSubmissions.find(s => s.Assignment_ID === assign.Assignment_ID);
  const dueDateValue = assign.Due_Date
    ? (String(assign.Due_Date).includes('T') ? String(assign.Due_Date) : `${assign.Due_Date}T23:59:59`)
    : null;
  const dueDate = dueDateValue ? new Date(dueDateValue) : null;
  const now = new Date();
  const daysRemaining = dueDate && !Number.isNaN(dueDate.getTime())
    ? Math.ceil((dueDate.getTime() - now.getTime()) / 86400000)
    : null;

  let group = 'todo';
  let statusClass = 'status-pending';
  let statusText = 'ยังไม่ส่งงาน';
  let badgeClass = 'pending';
  let priority = 3;

  if (submission && submission.Status === 'Graded') {
    group = 'done';
    statusClass = 'status-graded';
    statusText = 'ตรวจคะแนนแล้ว';
    badgeClass = 'graded';
    priority = 5;
  } else if (submission && submission.Status === 'Need_Correction') {
    group = 'correction';
    statusClass = 'status-correction';
    statusText = 'ต้องแก้ไขและส่งใหม่';
    badgeClass = 'correction';
    priority = 0;
  } else if (submission) {
    group = 'waiting';
    statusClass = 'status-submitted';
    statusText = submission.Status === 'Resubmitted' ? 'ส่งแก้ไขแล้ว (รอตรวจ)' : 'ส่งงานแล้ว (รอตรวจ)';
    badgeClass = 'submitted';
    priority = 4;
  } else if (daysRemaining !== null && daysRemaining < 0) {
    statusClass = 'status-overdue';
    statusText = `เลยกำหนด ${Math.abs(daysRemaining)} วัน`;
    badgeClass = 'overdue';
    priority = 1;
  } else if (daysRemaining !== null && daysRemaining <= 3) {
    statusClass = 'status-due-soon';
    statusText = daysRemaining === 0 ? 'ครบกำหนดวันนี้' : `เหลือ ${daysRemaining} วัน`;
    badgeClass = 'due-soon';
    priority = 2;
  }

  return { assign, submission, dueDate, daysRemaining, group, statusClass, statusText, badgeClass, priority };
}

function updateStudentAssignmentControls(items) {
  const counts = items.reduce((result, item) => {
    result[item.group] += 1;
    return result;
  }, { todo: 0, correction: 0, waiting: 0, done: 0 });

  assignmentCount.textContent = `${items.length} งาน`;
  document.getElementById('summary-all-count').textContent = items.length;
  document.getElementById('summary-todo-count').textContent = counts.todo;
  document.getElementById('summary-correction-count').textContent = counts.correction;
  document.getElementById('summary-waiting-count').textContent = counts.waiting;
  document.getElementById('summary-done-count').textContent = counts.done;

  const availableSubjects = [...new Set(items.map(item => item.assign.Subject_ID).filter(Boolean))];
  const selectedSubject = state.studentAssignmentSubject;
  studentAssignmentSubjectFilter.innerHTML = '<option value="">ทุกวิชา</option>';
  availableSubjects.forEach(subjectId => {
    const subject = state.subjects.find(item => item.Subject_ID === subjectId);
    const option = document.createElement('option');
    option.value = subjectId;
    option.textContent = subject ? subject.Subject_Name : subjectId;
    studentAssignmentSubjectFilter.appendChild(option);
  });
  studentAssignmentSubjectFilter.value = availableSubjects.includes(selectedSubject) ? selectedSubject : '';
  if (studentAssignmentSubjectFilter.value !== selectedSubject) state.studentAssignmentSubject = '';
}

// Render Assignments
function renderStudentAssignments() {
  studentAssignmentsGrid.innerHTML = '';
  const allItems = getStudentVisibleAssignments().map(getAssignmentViewData);
  updateStudentAssignmentControls(allItems);

  const query = state.studentAssignmentSearch.toLowerCase();
  const filtered = allItems.filter(item => {
    const subject = state.subjects.find(subjectItem => subjectItem.Subject_ID === item.assign.Subject_ID);
    const searchableText = [
      item.assign.Assignment_ID,
      item.assign.Assignment_Name,
      item.assign.Subject_ID,
      subject ? subject.Subject_Name : ''
    ].join(' ').toLowerCase();
    const matchesStatus = state.studentAssignmentFilter === 'all' || item.group === state.studentAssignmentFilter;
    const matchesSubject = !state.studentAssignmentSubject || item.assign.Subject_ID === state.studentAssignmentSubject;
    return matchesStatus && matchesSubject && (!query || searchableText.includes(query));
  });

  filtered.sort((a, b) => {
    if (state.studentAssignmentSort === 'name') {
      return String(a.assign.Assignment_Name || '').localeCompare(String(b.assign.Assignment_Name || ''), 'th');
    }
    const dateA = a.dueDate ? a.dueDate.getTime() : Number.MAX_SAFE_INTEGER;
    const dateB = b.dueDate ? b.dueDate.getTime() : Number.MAX_SAFE_INTEGER;
    if (state.studentAssignmentSort === 'due-desc') return dateB - dateA;
    if (state.studentAssignmentSort === 'due-asc') return dateA - dateB;
    return a.priority - b.priority || dateA - dateB;
  });

  if (filtered.length === 0) {
    studentAssignmentsGrid.innerHTML = `
      <div class="assignment-empty-state">
        <i class="fa-solid fa-folder-open"></i>
        <h3>ไม่พบภาระงาน</h3>
        <p>${allItems.length ? 'ลองเปลี่ยนคำค้นหา ตัวกรอง หรือรายวิชา' : 'ขณะนี้ยังไม่มีงานสำหรับชั้นเรียนของคุณ'}</p>
        ${allItems.length ? '<button type="button" id="btn-reset-assignment-filters" class="btn btn-secondary">ล้างตัวกรอง</button>' : ''}
      </div>
    `;
    const resetButton = document.getElementById('btn-reset-assignment-filters');
    if (resetButton) resetButton.addEventListener('click', resetStudentAssignmentFilters);
    return;
  }

  filtered.forEach(({ assign, submission, statusClass, statusText, badgeClass }) => {
    const scoreDisplay = submission && submission.Status === 'Graded'
      ? `<span class="score-badge">${submission.Score} / ${assign.Max_Score} คะแนน</span>`
      : '';
    const subject = state.subjects.find(item => item.Subject_ID === assign.Subject_ID);
    const subjectName = subject ? subject.Subject_Name : (assign.Subject_ID || 'ไม่ระบุวิชา');

    const card = document.createElement('div');
    card.className = `assignment-card ${statusClass}`;
    
    const formattedDate = new Date(assign.Due_Date).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: '2-digit'
    });

    let classLabel = '';
    if (assign.Class) {
      if (Array.isArray(assign.Class)) {
        if (!assign.Class.includes('all') && !assign.Class.includes('ทุกชั้นเรียน')) {
          classLabel = assign.Class.join(', ');
        }
      } else if (assign.Class !== 'all' && assign.Class !== 'ทุกชั้นเรียน') {
        classLabel = assign.Class;
      }
    }
    const classBadgeHtml = classLabel
      ? `<span class="badge" style="background: rgba(139,92,246,0.15); color: #c084fc; border: 1px solid rgba(139,92,246,0.3); font-size: 0.7rem; margin-top: 4px; display: inline-block;">เฉพาะห้อง: ${classLabel}</span>`
      : '';

    const btnPreviewHtml = submission ? `
      <button class="btn btn-purple btn-block btn-view-submission-trigger" 
              style="margin-bottom: 6px; font-size: 0.8rem; padding: 6px 12px; height: auto;"
              data-id="${assign.Assignment_ID}" 
              data-name="${assign.Assignment_Name}">
        <i class="fa-solid fa-eye"></i> ดูรายละเอียดงานที่ส่ง
      </button>
    ` : '';

    card.innerHTML = `
      <div class="card-top">
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <span class="card-id">${assign.Assignment_ID}</span>
          ${classBadgeHtml}
        </div>
        <span class="assignment-subject"><i class="fa-solid fa-book-open"></i> ${subjectName}</span>
        <h4 class="card-title" style="margin-top: 6px;">${assign.Assignment_Name}</h4>
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
        ${btnPreviewHtml}
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

  // Attach view submission details events (NEW)
  document.querySelectorAll('.btn-view-submission-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const assignId = e.currentTarget.dataset.id;
      const assignName = e.currentTarget.dataset.name;
      
      const submission = state.studentSubmissions.find(s => s.Assignment_ID === assignId);
      if (!submission) return;
      
      document.getElementById('preview-assign-title').textContent = assignName;
      document.getElementById('preview-assign-id').textContent = assignId;
      
      const fileContainer = document.getElementById('preview-file-container');
      if (submission.File_Link) {
        fileContainer.innerHTML = `
          <a href="${submission.File_Link}" target="_blank" class="btn btn-blue btn-icon-left" style="font-size: 0.85rem; padding: 6px 12px; display: inline-flex;">
            <i class="fa-solid fa-file-arrow-down"></i> คลิกเพื่อเปิดดูงาน / ดาวน์โหลดไฟล์
          </a>
        `;
      } else {
        fileContainer.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">ไม่มีไฟล์แนบ (เช่น ส่งลิงก์ข้อความอย่างเดียว)</span>';
      }
      
      document.getElementById('preview-student-notes').textContent = submission.Notes || 'ไม่มีข้อความเพิ่มเติม';
      
      const dateStr = new Date(submission.Timestamp).toLocaleString('th-TH', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      document.getElementById('preview-sub-date').textContent = dateStr;
      
      const scoreEl = document.getElementById('preview-sub-score');
      if (submission.Status === 'Graded') {
        const assign = state.assignments.find(a => a.Assignment_ID === assignId);
        const maxScore = assign ? assign.Max_Score : 10;
        scoreEl.innerHTML = `${submission.Score} <span style="font-weight: normal; font-size: 0.85rem; color: var(--text-muted);">/ ${maxScore} คะแนน (ผ่านการตรวจแล้ว)</span>`;
        scoreEl.style.color = 'var(--success)';
      } else if (submission.Status === 'Need_Correction') {
        scoreEl.innerHTML = `<span style="color: var(--error);"><i class="fa-solid fa-circle-exclamation"></i> ต้องการให้แก้ไขใหม่ (ยังไม่มีคะแนน)</span>`;
      } else {
        scoreEl.textContent = 'รอการตรวจและลงคะแนนจากคุณครู';
        scoreEl.style.color = 'var(--text-muted)';
      }
      
      document.getElementById('preview-teacher-feedback').textContent = submission.Feedback || 'ไม่มีข้อเสนอแนะ';
      
      openModal(document.getElementById('student-submission-preview-modal'));
    });
  });
}

function resetStudentAssignmentFilters() {
  state.studentAssignmentFilter = 'all';
  state.studentAssignmentSearch = '';
  state.studentAssignmentSubject = '';
  state.studentAssignmentSort = 'priority';
  studentAssignmentSearch.value = '';
  studentAssignmentSubjectFilter.value = '';
  studentAssignmentSort.value = 'priority';
  document.querySelectorAll('.summary-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.status === 'all');
  });
  renderStudentAssignments();
}

studentAssignmentSummary.addEventListener('click', (event) => {
  const chip = event.target.closest('.summary-chip');
  if (!chip) return;
  state.studentAssignmentFilter = chip.dataset.status;
  document.querySelectorAll('.summary-chip').forEach(item => item.classList.toggle('active', item === chip));
  renderStudentAssignments();
});

studentAssignmentSearch.addEventListener('input', (event) => {
  state.studentAssignmentSearch = event.target.value.trim();
  renderStudentAssignments();
});

studentAssignmentSubjectFilter.addEventListener('change', (event) => {
  state.studentAssignmentSubject = event.target.value;
  renderStudentAssignments();
});

studentAssignmentSort.addEventListener('change', (event) => {
  state.studentAssignmentSort = event.target.value;
  renderStudentAssignments();
});

// Bind subPreviewModal close controls (NEW)
const subPreviewModal = document.getElementById('student-submission-preview-modal');
if (subPreviewModal) {
  const btnClosePreview = document.getElementById('btn-close-sub-preview-modal');
  if (btnClosePreview) {
    btnClosePreview.addEventListener('click', () => closeModal(subPreviewModal));
  }
  const btnClosePreviewBtn = document.querySelector('.btn-close-sub-preview-btn');
  if (btnClosePreviewBtn) {
    btnClosePreviewBtn.addEventListener('click', () => closeModal(subPreviewModal));
  }
}

// Student Submission Method and Webcam Setup
let currentStream = null;
let activeMethod = 'file';
let cameraFacingMode = 'user'; // 'user' or 'environment'

function switchSubmissionMethod(method) {
  activeMethod = method;
  
  document.querySelectorAll('.method-tab').forEach(tab => {
    if (tab.dataset.method === method) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  const dropZone = document.getElementById('drop-zone');
  const cameraZone = document.getElementById('camera-zone');
  const linkZone = document.getElementById('link-zone');
  
  if (method === 'file') {
    dropZone.classList.remove('hidden');
    cameraZone.classList.add('hidden');
    linkZone.classList.add('hidden');
    stopCamera();
  } else if (method === 'camera') {
    dropZone.classList.add('hidden');
    cameraZone.classList.remove('hidden');
    linkZone.classList.add('hidden');
    startCamera();
  } else if (method === 'link') {
    dropZone.classList.add('hidden');
    cameraZone.classList.add('hidden');
    linkZone.classList.remove('hidden');
    stopCamera();
  }
}

// Attach event listeners to method tabs
document.querySelectorAll('.method-tab').forEach(tab => {
  tab.addEventListener('click', (e) => {
    switchSubmissionMethod(e.currentTarget.dataset.method);
  });
});

async function startCamera() {
  stopCamera(); // Reset stream first
  
  const video = document.getElementById('camera-video');
  const streamContainer = document.getElementById('camera-stream-container');
  const previewContainer = document.getElementById('camera-captured-preview-container');
  const btnCapture = document.getElementById('btn-camera-capture');
  const btnRetake = document.getElementById('btn-camera-retake');
  const btnToggleFacing = document.getElementById('btn-camera-toggle-facing');
  
  streamContainer.classList.remove('hidden');
  previewContainer.classList.add('hidden');
  btnCapture.classList.remove('hidden');
  btnToggleFacing.classList.remove('hidden');
  btnRetake.classList.add('hidden');
  
  try {
    const constraints = {
      video: {
        facingMode: cameraFacingMode,
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: false
    };
    
    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = currentStream;
  } catch (err) {
    console.error('Camera access error:', err);
    showToast('ไม่สามารถเปิดกล้องได้: ' + err.message, 'error');
  }
}

function stopCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
  }
  const video = document.getElementById('camera-video');
  if (video) {
    video.srcObject = null;
  }
}

// Camera Action Handlers
document.getElementById('btn-camera-capture').addEventListener('click', () => {
  const video = document.getElementById('camera-video');
  const canvas = document.getElementById('camera-canvas');
  const streamContainer = document.getElementById('camera-stream-container');
  const previewContainer = document.getElementById('camera-captured-preview-container');
  const capturedImg = document.getElementById('camera-captured-img');
  const btnCapture = document.getElementById('btn-camera-capture');
  const btnRetake = document.getElementById('btn-camera-retake');
  const btnToggleFacing = document.getElementById('btn-camera-toggle-facing');
  
  if (!video.srcObject) return;
  
  const width = video.videoWidth || 640;
  const height = video.videoHeight || 480;
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (cameraFacingMode === 'user') {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, width, height);
  ctx.setTransform(1, 0, 0, 1, 0, 0); // reset
  
  const dataUrl = canvas.toDataURL('image/jpeg');
  capturedImg.src = dataUrl;
  
  stopCamera();
  
  streamContainer.classList.add('hidden');
  previewContainer.classList.remove('hidden');
  btnCapture.classList.add('hidden');
  btnToggleFacing.classList.add('hidden');
  btnRetake.classList.remove('hidden');
});

document.getElementById('btn-camera-retake').addEventListener('click', () => {
  startCamera();
});

document.getElementById('btn-camera-toggle-facing').addEventListener('click', () => {
  cameraFacingMode = cameraFacingMode === 'user' ? 'environment' : 'user';
  startCamera();
});

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
  document.getElementById('submit-link-input').value = '';
  document.getElementById('camera-captured-img').src = '';
  stopCamera();
  switchSubmissionMethod('file');
  resetFileSelection();
}

// Submit assignment action
document.getElementById('submission-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const studentId = document.getElementById('submit-student-id').value;
  const assignmentId = document.getElementById('submit-assignment-id').value;
  const notes = document.getElementById('submit-notes').value.trim();

  const formData = new FormData();
  formData.append('Student_ID', studentId);
  formData.append('Assignment_ID', assignmentId);
  formData.append('Notes', notes);

  if (activeMethod === 'file') {
    if (!state.selectedFile) {
      showToast('กรุณาอัปโหลดไฟล์ผลงานก่อนกดยืนยัน', 'error');
      return;
    }
    formData.append('file', state.selectedFile);
  } else if (activeMethod === 'camera') {
    const capturedImg = document.getElementById('camera-captured-img');
    if (!capturedImg.src || capturedImg.src === window.location.href || capturedImg.src.startsWith('data:image/gif')) {
      showToast('กรุณากดถ่ายภาพผลงานก่อนกดยืนยัน', 'error');
      return;
    }
    
    const dataUrl = capturedImg.src;
    try {
      const fetchRes = await fetch(dataUrl);
      const blob = await fetchRes.blob();
      formData.append('file', blob, 'submission_camera.jpg');
    } catch (err) {
      console.error('Failed to convert base64 image:', err);
      showToast('เกิดข้อผิดพลาดในการประมวลผลรูปภาพ', 'error');
      return;
    }
  } else if (activeMethod === 'link') {
    const linkInput = document.getElementById('submit-link-input').value.trim();
    if (!linkInput) {
      showToast('กรุณากรอกลิงก์ผลงานก่อนส่ง', 'error');
      return;
    }
    if (!linkInput.startsWith('http://') && !linkInput.startsWith('https://')) {
      showToast('กรุณากรอกลิงก์ที่ถูกต้อง (ขึ้นต้นด้วย http:// หรือ https://)', 'error');
      return;
    }
    formData.append('Link', linkInput);
  }

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

// Helper to determine if the logged-in teacher has access to a specific subject (NEW)
function hasSubjectAccess(subjectId) {
  if (!state.teacherData) return false;
  if (state.teacherData.role === 'Admin') return true;
  if (!subjectId) return false;
  
  const subj = Array.isArray(state.subjects) ? state.subjects.find(s => s && s.Subject_ID === subjectId) : null;
  if (!subj) return false;
  
  const teacherUsername = subj.Teacher_Username || '';
  const subjectName = subj.Subject_Name || '';
  
  if (teacherUsername === 'any' || 
      subjectName.includes('ชุมนุม') || 
      subjectName.includes('ลูกเสือ')) {
    return true;
  }
  
  return teacherUsername.toLowerCase() === (state.teacherData.username || '').toLowerCase();
}

// Helper to apply UI visibility rules based on the user's role (NEW)
function applyRolePrivileges() {
  const tabTeachers = document.getElementById('tab-teachers');
  const tabSubjects = document.getElementById('tab-subjects');
  const tabAnalytics = document.getElementById('tab-analytics');
  const isAdmin = state.teacherData && state.teacherData.role === 'Admin';
  
  if (tabTeachers) {
    if (isAdmin) {
      tabTeachers.classList.remove('hidden');
    } else {
      tabTeachers.classList.add('hidden');
      if (tabTeachers.classList.contains('active')) {
        const tabSubmissions = document.getElementById('tab-submissions');
        if (tabSubmissions) tabSubmissions.click();
      }
    }
  }

  if (tabSubjects) {
    // Both admin and regular teachers can manage/view subjects
    tabSubjects.classList.remove('hidden');
  }

  if (tabAnalytics) {
    if (isAdmin) {
      tabAnalytics.classList.remove('hidden');
    } else {
      tabAnalytics.classList.add('hidden');
      if (tabAnalytics.classList.contains('active')) {
        const tabSubmissions = document.getElementById('tab-submissions');
        if (tabSubmissions) tabSubmissions.click();
      }
    }
  }

  // Toggle display for student directory checkboxes and bulk toolbar
  const adminCells = document.querySelectorAll('.admin-only-cell');
  adminCells.forEach(cell => {
    cell.style.display = isAdmin ? '' : 'none';
  });

  const toolbar = document.getElementById('admin-bulk-toolbar');
  if (toolbar && !isAdmin) {
    toolbar.style.display = 'none';
  }

  // Hide local desktop excel sync and export cards for non-admins to prevent unauthorized modifications
  const adminDbCard = document.getElementById('admin-db-card');
  if (adminDbCard) {
    if (isAdmin) {
      adminDbCard.classList.remove('hidden');
    } else {
      adminDbCard.classList.add('hidden');
    }
  }
}

// Load Teacher Dashboard Data
async function loadTeacherDashboard() {
  try {
    const assignments = await API.getAssignments();
    const submissions = await API.getSubmissions();
    const uName = state.teacherData ? state.teacherData.username : '';
    const uRole = state.teacherData ? state.teacherData.role : '';
    const students = await API.getStudentsList(uName, uRole);
    const subjects = await API.getSubjects();
    const attendance = await API.getAttendance();
    
    state.assignments = assignments;
    state.submissions = submissions;
    state.students = students;
    state.subjects = subjects;
    state.attendance = attendance;
    
    // Apply role-based visibility checks (NEW)
    applyRolePrivileges();

    // Filter assignments and submissions by subject access for statistics (NEW)
    const permittedAssignments = assignments.filter(a => hasSubjectAccess(a.Subject_ID));
    const permittedSubmissions = submissions.filter(sub => {
      const a = assignments.find(assign => assign.Assignment_ID === sub.Assignment_ID);
      return a && hasSubjectAccess(a.Subject_ID);
    });
    
    // Update stats
    statTotalAssignments.textContent = `${permittedAssignments.length} งาน`;
    statTotalSubmissions.textContent = `${permittedSubmissions.length} รายการ`;
    
    // Total students count from master list
    statTotalStudents.textContent = `${students.length} คน`;
    
    const graded = permittedSubmissions.filter(s => s.Status === 'Graded');
    statGradedSubmissions.textContent = `${graded.length} รายการ`;
    
    populateFilters(submissions, assignments);
    populateTeacherScannerAssignments(assignments);
    populateDirectoryFilters(students);
    populateSubjectsDropdowns(subjects);
    populateReportsFilters();
    populateAssignClassesCheckboxes();
    
    renderSubmissionsTable();
    renderStudentsDirectoryTable();
    loadAssignmentsTable();
    
    // Pre-populate admin tabs if admin, otherwise just populate subjects
    if (state.teacherData && state.teacherData.role === 'Admin') {
      loadTeachersTable();
    } else {
      loadSubjectsTable();
    }
  } catch (err) {
    console.error(err);
    showToast('ไม่สามารถโหลดข้อมูลหลังบ้านได้', 'error');
  }
}

// Suggest sequential Assignment ID based on Subject (NEW)
function suggestAssignmentId(subjectId) {
  if (!subjectId) return '';
  let maxSeq = 0;
  
  const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^${escapeRegExp(subjectId)}-A(\\d+)$`, 'i');
  
  const assignmentsList = Array.isArray(state.assignments) ? state.assignments : [];
  assignmentsList.forEach(a => {
    if (a && a.Subject_ID === subjectId) {
      const match = a.Assignment_ID.match(regex);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      } else {
        const digitMatch = a.Assignment_ID.match(/-A?(\d+)$/i);
        if (digitMatch) {
          const seq = parseInt(digitMatch[1], 10);
          if (seq > maxSeq) maxSeq = seq;
        }
      }
    }
  });
  
  const nextSeq = maxSeq + 1;
  return `${subjectId}-A${String(nextSeq).padStart(2, '0')}`;
}

function updateSuggestedAssignmentId() {
  const newAssignSub = document.getElementById('new-assign-subject');
  const newAssignId = document.getElementById('new-assign-id');
  if (newAssignSub && newAssignId) {
    const subjectId = newAssignSub.value;
    if (subjectId) {
      newAssignId.value = suggestAssignmentId(subjectId);
    }
  }
}

// Populate subject select dropdowns (NEW)
function populateSubjectsDropdowns(subjects) {
  const permittedSubjects = subjects.filter(s => hasSubjectAccess(s.Subject_ID));
  const newAssignSub = document.getElementById('new-assign-subject');
  const scanSub = document.getElementById('scan-subject-select');
  const reportSub = document.getElementById('report-subject-select');
  
  if (newAssignSub) {
    newAssignSub.innerHTML = '';
    permittedSubjects.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.Subject_ID;
      opt.textContent = `${s.Subject_ID} - ${s.Subject_Name}`;
      newAssignSub.appendChild(opt);
    });
    newAssignSub.onchange = updateSuggestedAssignmentId;
    updateSuggestedAssignmentId();
  }
  
  if (scanSub) {
    scanSub.innerHTML = '';
    permittedSubjects.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.Subject_ID;
      opt.textContent = `${s.Subject_ID} - ${s.Subject_Name}`;
      scanSub.appendChild(opt);
    });
  }
  
  if (reportSub) {
    const currentVal = reportSub.value;
    reportSub.innerHTML = '';
    if (state.teacherData && state.teacherData.role === 'Admin') {
      const optAll = document.createElement('option');
      optAll.value = 'all';
      optAll.textContent = 'ทุกรายวิชา';
      reportSub.appendChild(optAll);
    }
    permittedSubjects.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.Subject_ID;
      opt.textContent = `${s.Subject_ID} - ${s.Subject_Name}`;
      reportSub.appendChild(opt);
    });
    reportSub.value = currentVal || (reportSub.options[0] ? reportSub.options[0].value : 'all');
  }
}

// Populate classes option in forms as checkboxes (NEW)
function populateAssignClassesCheckboxes() {
  const classes = [...new Set(state.students.map(s => s.Class).filter(Boolean))].sort();
  
  const setupCheckboxes = (containerId, prefix) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
      <label class="class-checkbox-item">
        <input type="checkbox" id="${prefix}-class-all" value="all" checked>
        <span>ทุกชั้นเรียน (All Classes)</span>
      </label>
      ${classes.map(c => `
        <label class="class-checkbox-item">
          <input type="checkbox" class="${prefix}-class-checkbox" value="${c}">
          <span>เฉพาะห้อง: ${c}</span>
        </label>
      `).join('')}
    `;
    
    const allCheckbox = document.getElementById(`${prefix}-class-all`);
    const specificCheckboxes = container.querySelectorAll(`.${prefix}-class-checkbox`);
    specificCheckboxes.forEach(cb => cb.disabled = true);
    
    if (allCheckbox) {
      allCheckbox.addEventListener('change', (e) => {
        specificCheckboxes.forEach(cb => {
          if (e.target.checked) {
            cb.checked = false;
            cb.disabled = true;
          } else {
            cb.disabled = false;
          }
        });
      });
    }
  };
  
  setupCheckboxes('new-assign-class-checkboxes', 'new');
  setupCheckboxes('edit-assign-class-checkboxes', 'edit');
  setupCheckboxes('new-subject-classes-checkboxes', 'new-subject');
  setupCheckboxes('edit-subject-classes-checkboxes', 'edit-subject');
}

// Populate filters dropdowns (Hierarchical cascading)
function populateFilters(submissions, assignments) {
  const filterSubject = document.getElementById('filter-subject');
  if (!filterSubject) return;

  const currentSubjectVal = filterSubject.value;
  filterSubject.innerHTML = '<option value="">รายวิชาทั้งหมด</option>';
  
  const permittedSubjects = state.subjects.filter(s => hasSubjectAccess(s.Subject_ID));
  permittedSubjects.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.Subject_ID;
    opt.textContent = `${s.Subject_ID} - ${s.Subject_Name}`;
    filterSubject.appendChild(opt);
  });
  
  if (currentSubjectVal && Array.from(filterSubject.options).some(o => o.value === currentSubjectVal)) {
    filterSubject.value = currentSubjectVal;
  }

  updateFilterAssignments();
}

function updateFilterAssignments() {
  const filterSubject = document.getElementById('filter-subject');
  const filterAssignment = document.getElementById('filter-assignment');
  if (!filterSubject || !filterAssignment) return;

  const selectedSubject = filterSubject.value;
  const currentAssignVal = filterAssignment.value;
  filterAssignment.innerHTML = '<option value="">การบ้านทั้งหมด</option>';

  const filteredAssignments = state.assignments.filter(a => {
    const matchAccess = hasSubjectAccess(a.Subject_ID);
    const matchSubject = !selectedSubject || a.Subject_ID === selectedSubject;
    return matchAccess && matchSubject;
  });

  filteredAssignments.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.Assignment_ID;
    opt.textContent = `${a.Assignment_ID} - ${a.Assignment_Name.split(' ')[0]}`;
    filterAssignment.appendChild(opt);
  });

  if (currentAssignVal && Array.from(filterAssignment.options).some(o => o.value === currentAssignVal)) {
    filterAssignment.value = currentAssignVal;
  } else {
    filterAssignment.value = "";
  }

  updateFilterClasses();
}

function updateFilterClasses() {
  const filterSubject = document.getElementById('filter-subject');
  const filterAssignment = document.getElementById('filter-assignment');
  const filterClass = document.getElementById('filter-class');
  if (!filterSubject || !filterAssignment || !filterClass) return;

  const selectedSubject = filterSubject.value;
  const selectedAssign = filterAssignment.value;
  const currentClassVal = filterClass.value;
  filterClass.innerHTML = '<option value="">ชั้นเรียนทั้งหมด</option>';

  const classes = new Set();
  
  if (selectedAssign) {
    const assign = state.assignments.find(a => a.Assignment_ID === selectedAssign);
    if (assign && assign.Class) {
      if (Array.isArray(assign.Class)) {
        assign.Class.forEach(c => classes.add(c));
      } else {
        classes.add(assign.Class);
      }
    }
  } else {
    const activeAssignments = state.assignments.filter(a => {
      const matchAccess = hasSubjectAccess(a.Subject_ID);
      const matchSubject = !selectedSubject || a.Subject_ID === selectedSubject;
      return matchAccess && matchSubject;
    });

    activeAssignments.forEach(a => {
      if (a.Class) {
        if (Array.isArray(a.Class)) {
          a.Class.forEach(c => classes.add(c));
        } else {
          classes.add(a.Class);
        }
      }
    });
  }

  Array.from(classes).sort().forEach(cls => {
    if (cls === 'ทุกชั้นเรียน' || cls === 'all') return;
    const opt = document.createElement('option');
    opt.value = cls;
    opt.textContent = cls;
    filterClass.appendChild(opt);
  });

  if (currentClassVal && Array.from(filterClass.options).some(o => o.value === currentClassVal)) {
    filterClass.value = currentClassVal;
  } else {
    filterClass.value = "";
  }
}

// Populate Quick Scan Assignments selector
function populateTeacherScannerAssignments(assignments) {
  const permittedAssignments = assignments.filter(a => hasSubjectAccess(a.Subject_ID));
  const currentVal = scanAssignSelect.value;
  scanAssignSelect.innerHTML = '';
  
  permittedAssignments.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.Assignment_ID;
    opt.textContent = `${a.Assignment_ID} - ${a.Assignment_Name.split(' ')[0]}`;
    scanAssignSelect.appendChild(opt);
  });
  
  // Set default score when assignment is selected
  scanAssignSelect.onchange = () => {
    const activeAssign = permittedAssignments.find(a => a.Assignment_ID === scanAssignSelect.value);
    if (activeAssign) {
      scanScoreInput.value = activeAssign.Max_Score;
    }
  };

  if (currentVal && Array.from(scanAssignSelect.options).some(o => o.value === currentVal)) {
    scanAssignSelect.value = currentVal;
  } else if (permittedAssignments.length > 0) {
    scanAssignSelect.value = permittedAssignments[0].Assignment_ID;
    scanScoreInput.value = permittedAssignments[0].Max_Score;
  }
}

// Filter triggers
teacherSearch.addEventListener('input', renderSubmissionsTable);

if (filterSubject) {
  filterSubject.addEventListener('change', () => {
    updateFilterAssignments();
    renderSubmissionsTable();
  });
}

if (filterAssignment) {
  filterAssignment.addEventListener('change', () => {
    updateFilterClasses();
    renderSubmissionsTable();
  });
}

if (filterClass) {
  filterClass.addEventListener('change', renderSubmissionsTable);
}

if (filterStatus) {
  filterStatus.addEventListener('change', renderSubmissionsTable);
}

// Render Submissions Table
function renderSubmissionsTable() {
  submissionsTableBody.innerHTML = '';
  
  const query = teacherSearch.value.toLowerCase().trim();
  const selectedSubject = filterSubject ? filterSubject.value : '';
  const selectedClass = filterClass.value;
  const selectedAssign = filterAssignment.value;
  const selectedStatus = filterStatus ? filterStatus.value : '';

  const submissionsList = Array.isArray(state.submissions) ? state.submissions : [];
  const assignmentsList = Array.isArray(state.assignments) ? state.assignments : [];

  const filtered = submissionsList.filter(sub => {
    if (!sub) return false;
    // Enforce subject access controls (NEW)
    const assign = assignmentsList.find(a => a && a.Assignment_ID === sub.Assignment_ID);
    if (!assign || !hasSubjectAccess(assign.Subject_ID)) {
      return false;
    }

    const fullName = sub.FullName || '';
    const studentId = sub.Student_ID || '';
    const subClass = sub.Class || '';

    const matchQuery = !query || 
                       fullName.toLowerCase().includes(query) || 
                       studentId.toLowerCase().includes(query) ||
                       subClass.toLowerCase().includes(query);
                       
    const matchClass = !selectedClass || subClass === selectedClass;
    const matchAssign = !selectedAssign || sub.Assignment_ID === selectedAssign;
    const matchSubject = !selectedSubject || assign.Subject_ID === selectedSubject;
    const matchStatus = !selectedStatus || sub.Status === selectedStatus;

    return matchQuery && matchClass && matchAssign && matchSubject && matchStatus;
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

      const submissionObj = state.submissions.find(s => s.Submission_ID === data.subid);
      const feedbackInput = document.getElementById('grade-feedback-input');
      if (feedbackInput) {
        feedbackInput.value = (submissionObj && submissionObj.Feedback) ? submissionObj.Feedback : '';
      }

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
  const feedback = document.getElementById('grade-feedback-input') ? document.getElementById('grade-feedback-input').value.trim() : '';

  try {
    const res = await API.gradeSubmission({
      Submission_ID: subId,
      Score: Number(score),
      Status: status,
      Feedback: feedback,
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
    let activeAssignment = scanAssignSelect.value;
    let activeScore = Number(scanScoreInput.value);

    if (!activeAssignment) {
      showToast("กรุณาเลือกการบ้านเพื่อลงคะแนน", "error");
      scannerCooldown = false;
      return;
    }

    // Check if scanned value is a URL
    if (studentId.startsWith('http://') || studentId.startsWith('https://')) {
      try {
        const urlObj = new URL(studentId);
        const params = new URLSearchParams(urlObj.search);
        
        const qScore = params.get('score');
        if (qScore !== null) activeScore = Number(qScore);
        
        const qAssign = params.get('assignment_id') || params.get('assign');
        if (qAssign !== null) activeAssignment = qAssign;
        else activeAssignment = 'BANANA01'; // Default
        
        const qStudentId = params.get('student_id') || params.get('studentId');
        if (qStudentId) {
          studentId = qStudentId;
        } else {
          // If no student_id, hit the GET endpoint directly to match/register
          const response = await fetch(studentId);
          const responseText = await response.text();
          
          playBeep('success');
          const qName = params.get('name') || 'ไม่ระบุชื่อ';
          const qRoom = params.get('room') || '';
          const qNo = params.get('no') || '';
          
          lastScannedText.textContent = `${qName} (ห้อง ${qRoom} เลขที่ ${qNo}) - บันทึก ${activeScore} คะแนนสำเร็จ`;
          lastScannedResult.classList.remove('hidden');

          // Show HUD
          hudStudentName.textContent = qName;
          hudStudentId.textContent = `เลขที่: ${qNo || '-'}`;
          hudStudentClass.textContent = `ห้องเรียน: ${qRoom || 'ทั่วไป'}`;
          hudStudentScore.textContent = activeScore;
          
          const scoreBadge = document.querySelector('.hud-score-badge');
          if (scoreBadge) {
            scoreBadge.innerHTML = `+ <span>${activeScore}</span> คะแนน`;
            scoreBadge.style.background = 'rgba(16, 185, 129, 0.18)';
            scoreBadge.style.color = '#34d399';
          }
          hudStudentPhoto.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${qName}`;
          
          hudProgressBar.classList.remove('hud-countdown-active');
          void hudProgressBar.offsetWidth;
          scanHudOverlay.classList.remove('hidden');
          hudProgressBar.classList.add('hud-countdown-active');

          if (hudTimeoutId) clearTimeout(hudTimeoutId);
          hudTimeoutId = setTimeout(() => {
            scanHudOverlay.classList.add('hidden');
            scannerCooldown = false;
          }, 5000);
          return;
        }
      } catch (err) {
        console.error("Error parsing scanned QR URL:", err);
      }
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
  const scanType = document.getElementById('scan-type-select').value;
  const activeAssignment = scanAssignSelect.value;
  const activeSubject = document.getElementById('scan-subject-select').value;
  if (scanType === 'grade' && !activeAssignment) {
    showToast("กรุณาสร้างการบ้านเพื่อใช้ในการตรวจคะแนนก่อน", "error");
    return;
  }
  if (scanType === 'attendance' && !activeSubject) {
    showToast("กรุณาเลือกวิชาที่จะเช็คชื่อก่อน", "error");
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

// Manual ID Keyboard Entry Submit handler (NEW)
const manualScanStudentId = document.getElementById('manual-scan-student-id');
const btnManualScanSubmit = document.getElementById('btn-manual-scan-submit');

if (btnManualScanSubmit && manualScanStudentId) {
  const handleManualSubmit = () => {
    const studentId = manualScanStudentId.value.trim();
    if (!studentId) {
      showToast("กรุณากรอกรหัสประจำตัวนักเรียน", "error");
      return;
    }
    // Temporarily bypass cooldown to allow immediate manual input processing
    scannerCooldown = false;
    processQuickGradeScan(studentId);
    manualScanStudentId.value = '';
    manualScanStudentId.focus();
  };

  btnManualScanSubmit.addEventListener('click', handleManualSubmit);
  manualScanStudentId.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleManualSubmit();
    }
  });
}


// Create New Assignment
createAssignmentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('new-assign-id').value.trim();
  const name = document.getElementById('new-assign-name').value.trim();
  const subjectId = document.getElementById('new-assign-subject').value;
  
  let assignClass = 'ทุกชั้นเรียน';
  const allCheckbox = document.getElementById('new-class-all');
  if (allCheckbox && !allCheckbox.checked) {
    const checkedBoxes = document.querySelectorAll('.new-class-checkbox:checked');
    if (checkedBoxes.length > 0) {
      assignClass = Array.from(checkedBoxes).map(cb => cb.value);
    }
  }

  const due = document.getElementById('new-assign-due').value;
  const score = document.getElementById('new-assign-score').value;

  try {
    const res = await API.createAssignment({
      Assignment_ID: id,
      Assignment_Name: name,
      Subject_ID: subjectId,
      Class: assignClass,
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
      const res = await fetch('/api/import-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Requester_Username: state.teacherData ? state.teacherData.username : '',
          Requester_Role: state.teacherData ? state.teacherData.role : ''
        })
      }).then(r => r.json());
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
  if (state.teacherData) {
    formData.append('Requester_Username', state.teacherData.username);
    formData.append('Requester_Role', state.teacherData.role);
  }

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
    if (state.teacherData) {
      formData.append('Requester_Username', state.teacherData.username);
      formData.append('Requester_Role', state.teacherData.role);
    }

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

// Database Actions (Import Submissions from ZIP File)
const btnImportSubmissionsZip = document.getElementById('btn-import-submissions-zip');
const submissionsZipInput = document.getElementById('submissions-zip-input');

if (btnImportSubmissionsZip && submissionsZipInput) {
  btnImportSubmissionsZip.addEventListener('click', () => {
    submissionsZipInput.click(); // Trigger file dialog
  });

  submissionsZipInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const btnOriginalText = btnImportSubmissionsZip.innerHTML;
    btnImportSubmissionsZip.disabled = true;
    btnImportSubmissionsZip.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังแตกไฟล์งาน...';

    const formData = new FormData();
    formData.append('zip', file);
    if (state.teacherData) {
      formData.append('Requester_Username', state.teacherData.username);
      formData.append('Requester_Role', state.teacherData.role);
    }

    try {
      const res = await fetch('/api/import-submissions-zip', {
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
      showToast('เกิดข้อผิดพลาดในการอัปโหลดและนำเข้าไฟล์งานส่งนักเรียน', 'error');
    } finally {
      btnImportSubmissionsZip.disabled = false;
      btnImportSubmissionsZip.innerHTML = btnOriginalText;
      submissionsZipInput.value = ''; // Reset file input
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
        body: JSON.stringify({
          scriptUrl,
          folderId,
          Requester_Username: state.teacherData ? state.teacherData.username : '',
          Requester_Role: state.teacherData ? state.teacherData.role : ''
        })
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
        body: JSON.stringify({
          scriptUrl,
          folderId,
          Requester_Username: state.teacherData ? state.teacherData.username : '',
          Requester_Role: state.teacherData ? state.teacherData.role : ''
        })
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

const btnDownloadBackup = document.getElementById('btn-download-backup');
if (btnDownloadBackup) {
  btnDownloadBackup.addEventListener('click', async () => {
    const originalText = btnDownloadBackup.innerHTML;
    btnDownloadBackup.disabled = true;
    btnDownloadBackup.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังเตรียมข้อมูลสำรอง...';

    try {
      const response = await fetch('/api/backup/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Requester_Username: state.teacherData ? state.teacherData.username : '',
          Requester_Role: state.teacherData ? state.teacherData.role : ''
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'ไม่สามารถสร้างข้อมูลสำรองได้');
      }

      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') || '';
      const fileNameMatch = disposition.match(/filename="?([^"]+)"?/i);
      const fileName = fileNameMatch ? fileNameMatch[1] : `sjmr-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
      showToast('ดาวน์โหลดข้อมูลสำรองเรียบร้อยแล้ว กรุณาเก็บไฟล์นี้ไว้ในที่ปลอดภัย', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'เกิดข้อผิดพลาดในการดาวน์โหลดข้อมูลสำรอง', 'error');
    } finally {
      btnDownloadBackup.disabled = false;
      btnDownloadBackup.innerHTML = originalText;
    }
  });
}

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

// Tab Switching in Teacher Dashboard (Updated to support Accounts, Subjects, Assignments & Reports Tabs)
const tabs = ['submissions', 'students', 'assignments', 'subjects', 'teachers', 'reports', 'analytics'];
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
      
      // Control sidebar visibility based on active tab
      const controlsGrid = document.querySelector('.teacher-controls-grid');
      if (controlsGrid) {
        if (['submissions', 'assignments'].includes(t)) {
          controlsGrid.classList.remove('sidebar-hidden');
        } else {
          controlsGrid.classList.add('sidebar-hidden');
        }
      }
      
      if (t === 'teachers') {
        loadTeachersTable();
      } else if (t === 'subjects') {
        loadSubjectsTable();
      } else if (t === 'assignments') {
        loadAssignmentsTable();
      } else if (t === 'reports') {
        populateReportsFilters();
      } else if (t === 'analytics') {
        loadSystemLogs();
      }
    });
  }
});

// Bind click listener to the refresh button for analytics (NEW)
const btnRefreshAnalytics = document.getElementById('btn-refresh-analytics');
if (btnRefreshAnalytics) {
  btnRefreshAnalytics.addEventListener('click', loadSystemLogs);
}

// Bind click handlers on stats summary cards (NEW)
const cardStatStudents = document.getElementById('card-stat-students');
const cardStatAssignments = document.getElementById('card-stat-assignments');
const cardStatSubmissions = document.getElementById('card-stat-submissions');
const cardStatGraded = document.getElementById('card-stat-graded');

if (cardStatStudents) {
  cardStatStudents.addEventListener('click', () => {
    const tab = document.getElementById('tab-students');
    if (tab) tab.click();
  });
}
if (cardStatAssignments) {
  cardStatAssignments.addEventListener('click', () => {
    const tab = document.getElementById('tab-assignments');
    if (tab) tab.click();
  });
}
if (cardStatSubmissions) {
  cardStatSubmissions.addEventListener('click', () => {
    const tab = document.getElementById('tab-submissions');
    if (tab) {
      if (filterSubject) filterSubject.value = '';
      updateFilterAssignments();
      if (filterAssignment) filterAssignment.value = '';
      updateFilterClasses();
      if (filterClass) filterClass.value = '';
      if (filterStatus) filterStatus.value = '';
      renderSubmissionsTable();
      tab.click();
    }
  });
}
if (cardStatGraded) {
  cardStatGraded.addEventListener('click', () => {
    const tab = document.getElementById('tab-submissions');
    if (tab) {
      if (filterSubject) filterSubject.value = '';
      updateFilterAssignments();
      if (filterAssignment) filterAssignment.value = '';
      updateFilterClasses();
      if (filterClass) filterClass.value = '';
      if (filterStatus) filterStatus.value = 'Graded';
      renderSubmissionsTable();
      tab.click();
    }
  });
}


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
  
  if (!studentsDirTableBody) return;
  studentsDirTableBody.innerHTML = '';
  
  const query = studentDirSearch ? studentDirSearch.value.toLowerCase().trim() : '';
  const selectedClass = filterDirClass ? filterDirClass.value : '';
  
  const studentsList = Array.isArray(state.students) ? state.students : [];
  
  const filtered = studentsList.filter(s => {
    if (!s) return false;
    const fullName = s.FullName || '';
    const studentId = s.Student_ID || '';
    const email = s.Email || '';
    const sClass = s.Class || '';

    const matchQuery = !query || 
                       fullName.toLowerCase().includes(query) || 
                       studentId.toLowerCase().includes(query) ||
                       email.toLowerCase().includes(query);
    const matchClass = !selectedClass || sClass === selectedClass;
    return matchQuery && matchClass;
  });
  
  if (studentDirCount) {
    studentDirCount.textContent = `${filtered.length} คน`;
  }
  
  if (filtered.length === 0) {
    const isAdmin = state.teacherData && state.teacherData.role === 'Admin';
    const cols = isAdmin ? 8 : 7;
    studentsDirTableBody.innerHTML = `<tr><td colspan="${cols}" class="text-center">ไม่พบรายชื่อนักเรียน</td></tr>`;
    const pageInfo = document.getElementById('student-dir-page-info');
    if (pageInfo) pageInfo.textContent = 'หน้า 1 จาก 1';
    const btnPrev = document.getElementById('btn-student-dir-prev');
    if (btnPrev) btnPrev.disabled = true;
    const btnNext = document.getElementById('btn-student-dir-next');
    if (btnNext) btnNext.disabled = true;
    updateBulkToolbar();
    return;
  }
  
  // Sort by Student ID
  filtered.sort((a, b) => {
    const idA = a && a.Student_ID ? String(a.Student_ID) : '';
    const idB = b && b.Student_ID ? String(b.Student_ID) : '';
    return idA.localeCompare(idB);
  });
  
  // Apply pagination
  const limit = state.directoryLimit || 50;
  const totalPages = Math.ceil(filtered.length / limit) || 1;
  if (state.directoryPage > totalPages) state.directoryPage = totalPages;
  
  const page = state.directoryPage || 1;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginated = filtered.slice(startIndex, endIndex);
  
  const attendanceList = Array.isArray(state.attendance) ? state.attendance : [];
  const submissionsList = Array.isArray(state.submissions) ? state.submissions : [];
  const assignmentsList = Array.isArray(state.assignments) ? state.assignments : [];
  
  const isAdmin = state.teacherData && state.teacherData.role === 'Admin';

  paginated.forEach(s => {
    if (!s) return;
    const studentId = s.Student_ID || '';
    const avatarSrc = s.Photo ? s.Photo : `https://api.dicebear.com/7.x/adventurer/svg?seed=${studentId}`;
    
    // Attendance Today (NEW)
    const today = new Date().toLocaleDateString('en-CA');
    const todayAtt = attendanceList.find(a => a && String(a.Student_ID) === String(studentId) && a.Date === today);
    let attBadge = '<span class="status-badge pending" style="padding: 2px 6px; font-size: 0.65rem; display: inline-flex;"><i class="fa-solid fa-clock"></i> ยังไม่เช็คชื่อ</span>';
    if (todayAtt) {
      if (todayAtt.Status === 'Present') {
        attBadge = '<span class="status-badge graded" style="padding: 2px 6px; font-size: 0.65rem; display: inline-flex;"><i class="fa-solid fa-circle-check"></i> มาเรียน</span>';
      } else {
        attBadge = '<span class="status-badge correction" style="padding: 2px 6px; font-size: 0.65rem; display: inline-flex;"><i class="fa-solid fa-circle-xmark"></i> ขาดเรียน</span>';
      }
    }
    
    // Submissions Stats (NEW)
    const studentSubs = submissionsList.filter(sub => sub && sub.Student_ID === studentId);
    const totalAssigns = assignmentsList.length;
    const submittedCount = studentSubs.filter(sub => sub && (sub.Status === 'Graded' || sub.Status === 'Submitted' || sub.Status === 'Resubmitted')).length;
    
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

      const editBtnHtml = isAdmin ? `
        <button class="btn btn-purple btn-edit-student-trigger" style="padding: 4px 10px; font-size: 0.8rem;"
                data-id="${s.Student_ID}"
                data-name="${s.FullName}"
                data-class="${s.Class || ''}"
                data-email="${s.Email || ''}"
                data-photo="${s.Photo || ''}">
          <i class="fa-solid fa-user-gear"></i> แก้ไข
        </button>
      ` : '';

      const isChecked = state.selectedStudentIds.has(String(s.Student_ID)) ? 'checked' : '';
      const checkboxTdHtml = isAdmin ? `
        <td class="admin-only-cell" style="width: 40px; text-align: center;">
          <input type="checkbox" class="student-select-check" data-id="${s.Student_ID}" ${isChecked}>
        </td>
      ` : '';

      const row = document.createElement('tr');
      row.innerHTML = `
        ${checkboxTdHtml}
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
          ${editBtnHtml}
          <button class="btn btn-green btn-print-student-trigger" style="padding: 4px 10px; font-size: 0.8rem; ${isAdmin ? 'margin-left: 4px;' : ''}"
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

  updateBulkToolbar();
  
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

// Admin Bulk Actions Controllers (NEW)
function updateBulkToolbar() {
  const toolbar = document.getElementById('admin-bulk-toolbar');
  const countSpan = document.getElementById('bulk-selected-count');
  const checkAll = document.getElementById('check-all-students');
  
  if (!toolbar || !countSpan) return;
  
  const selectedCount = state.selectedStudentIds ? state.selectedStudentIds.size : 0;
  const isAdmin = state.teacherData && state.teacherData.role === 'Admin';
  
  if (isAdmin && selectedCount > 0) {
    toolbar.style.display = 'flex';
    countSpan.textContent = `เลือกแล้ว ${selectedCount} คน`;
  } else {
    toolbar.style.display = 'none';
  }
  
  if (checkAll) {
    const visibleChecks = document.querySelectorAll('.student-select-check');
    if (visibleChecks.length > 0) {
      checkAll.checked = Array.from(visibleChecks).every(cb => cb.checked);
    } else {
      checkAll.checked = false;
    }
  }
}

// Bind Checkbox events
const checkAllStudents = document.getElementById('check-all-students');
if (checkAllStudents) {
  checkAllStudents.addEventListener('change', (e) => {
    const visibleChecks = document.querySelectorAll('.student-select-check');
    const isChecked = e.target.checked;
    visibleChecks.forEach(cb => {
      cb.checked = isChecked;
      const studentId = String(cb.dataset.id);
      if (isChecked) {
        state.selectedStudentIds.add(studentId);
      } else {
        state.selectedStudentIds.delete(studentId);
      }
    });
    updateBulkToolbar();
  });
}

document.getElementById('students-dir-table-body').addEventListener('change', (e) => {
  if (e.target.classList.contains('student-select-check')) {
    const studentId = String(e.target.dataset.id);
    if (e.target.checked) {
      state.selectedStudentIds.add(studentId);
    } else {
      state.selectedStudentIds.delete(studentId);
    }
    updateBulkToolbar();
  }
});

// Bulk Promote Button Click
document.getElementById('btn-bulk-promote').addEventListener('click', async () => {
  if (state.selectedStudentIds.size === 0) return;
  
  if (!confirm(`คุณต้องการเลื่อนชั้นเรียนของนักเรียนที่เลือกทั้งหมด ${state.selectedStudentIds.size} คน ใช่หรือไม่?`)) {
    return;
  }
  
  try {
    const res = await API.bulkPromote({
      Student_IDs: Array.from(state.selectedStudentIds),
      Requester_Username: state.teacherData ? state.teacherData.username : '',
      Requester_Role: state.teacherData ? state.teacherData.role : ''
    });
    
    if (res.success) {
      showToast(res.message, 'success');
      state.selectedStudentIds.clear();
      // Reload students directory
      const uName = state.teacherData ? state.teacherData.username : '';
      const uRole = state.teacherData ? state.teacherData.role : '';
      state.students = await API.getStudentsList(uName, uRole);
      renderStudentsDirectoryTable();
      logAgentEvent('bulk_promote_students', 'Admin', { count: res.message });
    } else {
      showToast(res.message || 'เกิดข้อผิดพลาดในการเลื่อนชั้นเรียน', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('การเชื่อมต่อล้มเหลว', 'error');
  }
});

// Bulk Delete Button Click
document.getElementById('btn-bulk-delete').addEventListener('click', async () => {
  if (state.selectedStudentIds.size === 0) return;
  
  if (!confirm(`คำเตือน: คุณต้องการลบรายชื่อนักเรียนที่เลือกทั้งหมด ${state.selectedStudentIds.size} คนรวมถึงข้อมูลการส่งงานและเข้าเรียนทั้งหมด ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้!`)) {
    return;
  }
  
  try {
    const res = await API.bulkDelete({
      Student_IDs: Array.from(state.selectedStudentIds),
      Requester_Username: state.teacherData ? state.teacherData.username : '',
      Requester_Role: state.teacherData ? state.teacherData.role : ''
    });
    
    if (res.success) {
      showToast(res.message, 'success');
      state.selectedStudentIds.clear();
      // Reload students directory
      const uName = state.teacherData ? state.teacherData.username : '';
      const uRole = state.teacherData ? state.teacherData.role : '';
      state.students = await API.getStudentsList(uName, uRole);
      renderStudentsDirectoryTable();
      logAgentEvent('bulk_delete_students', 'Admin', { count: res.message });
    } else {
      showToast(res.message || 'เกิดข้อผิดพลาดในการลบรายชื่อนักเรียน', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('การเชื่อมต่อล้มเหลว', 'error');
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
    const autoLoginUrl = `${window.location.origin}/?student_id=${s.Student_ID}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(autoLoginUrl)}&ecc=M`;
    
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
  if (!teachersTableBody) return;
  teachersTableBody.innerHTML = '<tr><td colspan="4" class="text-center"><i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลดข้อมูล...</td></tr>';
  
  try {
    const list = await fetch('/api/teachers').then(r => r.json());
    teachersTableBody.innerHTML = '';
    
    if (!Array.isArray(list) || list.length === 0) {
      teachersTableBody.innerHTML = '<tr><td colspan="4" class="text-center">ไม่พบบัญชีคุณครูร่วมสอน</td></tr>';
      loadSystemLogs();
      loadSubjectsTable();
      return;
    }
    
    list.forEach(t => {
      if (!t || !t.username) return;
      const username = t.username;
      const fullName = t.fullName || '-';
      const role = t.role || 'Teacher';
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${username}</strong></td>
        <td>${fullName}</td>
        <td><span class="badge-class" style="background: ${role === 'Admin' ? 'var(--purple)' : 'var(--blue)'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">${role}</span></td>
        <td>
          ${username.toLowerCase() === 'admin' ? '<small class="text-muted">บัญชีหลักไม่สามารถแก้ไข/ลบได้</small>' : `
            <button class="btn btn-secondary btn-edit-teacher-trigger" data-username="${username}" data-fullname="${fullName}" data-role="${role}" style="padding: 4px 10px; font-size: 0.8rem; margin-right: 5px;">
              <i class="fa-solid fa-pen-to-square"></i> แก้ไข
            </button>
            <button class="btn btn-red btn-delete-teacher-trigger" data-username="${username}" style="padding: 4px 10px; font-size: 0.8rem;">
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
    console.error('Error in loadTeachersTable:', err);
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
        body: JSON.stringify({
          username,
          password,
          fullName,
          role,
          Requester_Username: state.teacherData ? state.teacherData.username : '',
          Requester_Role: state.teacherData ? state.teacherData.role : ''
        })
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

// Teacher click delegation handler (Edit & Delete)
document.getElementById('teachers-table-body').addEventListener('click', async (e) => {
  // 1. Delete Teacher
  const delBtn = e.target.closest('.btn-delete-teacher-trigger');
  if (delBtn) {
    const username = delBtn.dataset.username;
    if (confirm(`คุณครูยืนยันว่าต้องการลบบัญชีผู้ใช้งาน "${username}" ใช่หรือไม่?`)) {
      try {
        const res = await fetch('/api/teacher/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            Requester_Username: state.teacherData ? state.teacherData.username : '',
            Requester_Role: state.teacherData ? state.teacherData.role : ''
          })
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
        showToast('เกิดข้อผิดพลาดในการลบบัญชีผู้ใช้งาน', 'error');
      }
    }
  }

  // 2. Edit Teacher
  const editBtn = e.target.closest('.btn-edit-teacher-trigger');
  if (editBtn) {
    const username = editBtn.dataset.username;
    const fullname = editBtn.dataset.fullname;
    const role = editBtn.dataset.role;
    
    document.getElementById('edit-teacher-username').value = username;
    document.getElementById('edit-teacher-username-display').value = username;
    document.getElementById('edit-teacher-fullname').value = fullname;
    document.getElementById('edit-teacher-role').value = role;
    document.getElementById('edit-teacher-password').value = '';
    
    openModal(document.getElementById('teacher-edit-modal'));
  }
});

// Teacher Edit Form submit handler
const teacherEditForm = document.getElementById('teacher-edit-form');
const teacherEditModal = document.getElementById('teacher-edit-modal');
if (teacherEditForm) {
  teacherEditForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('edit-teacher-username').value;
    const fullName = document.getElementById('edit-teacher-fullname').value.trim();
    const role = document.getElementById('edit-teacher-role').value;
    const password = document.getElementById('edit-teacher-password').value;
    
    const btnSubmit = teacherEditForm.querySelector('button[type="submit"]');
    const btnOriginalText = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...';
    
    try {
      const res = await fetch('/api/teacher/update-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          fullName,
          role,
          password,
          Requester_Username: state.teacherData ? state.teacherData.username : '',
          Requester_Role: state.teacherData ? state.teacherData.role : ''
        })
      }).then(r => r.json());
      
      if (res.success) {
        showToast(res.message, 'success');
        closeModal(teacherEditModal);
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


// Teacher Logout Button Handler (NEW)
const btnTeacherLogout = document.getElementById('btn-teacher-logout');
if (btnTeacherLogout) {
  btnTeacherLogout.addEventListener('click', () => {
    logAgentEvent('teacher_logout', 'Teacher', { username: state.teacherData ? state.teacherData.username : '' });
    localStorage.removeItem('auth_teacher'); // CLEAR PERSISTENCE
    state.teacherData = null;
    btnTeacherLogout.classList.add('hidden');
    document.querySelector('.mode-toggle-container').classList.remove('hidden');
    
    // Hide teacher profile badge (NEW)
    const teacherProfileBadge = document.getElementById('teacher-profile-badge');
    if (teacherProfileBadge) {
      teacherProfileBadge.classList.add('hidden');
    }
    
    switchView('student');
    state.selectedStudentIds.clear();
    updateBulkToolbar();
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

// Helper to get color code for different system activities (NEW)
function getLogColor(action) {
  const act = (action || '').toLowerCase();
  if (act.includes('login')) return '#34d399'; // Green
  if (act.includes('logout')) return '#94a3b8'; // Gray
  if (act.includes('create') || act.includes('import')) return '#22d3ee'; // Cyan
  if (act.includes('delete') || act.includes('remove')) return '#f87171'; // Red
  if (act.includes('edit') || act.includes('update') || act.includes('grade') || act.includes('save') || act.includes('promote')) return '#fbbf24'; // Yellow
  if (act.includes('sync')) return '#d946ef'; // Magenta
  return '#cbd5e1'; // Default slate-300
}

// Agent AI Activity Logs Terminal Loader (NEW)
async function loadSystemLogs() {
  const logsTerminal = document.getElementById('ai-logs-terminal');
  if (!logsTerminal) return;
  try {
    const logs = await fetch('/api/logs').then(r => r.json());
    
    // Parse metrics
    let adminLogins = 0;
    let teacherLogins = 0;
    let studentLogins = 0;
    let actionCount = logs.length;
    
    const hourCounts = {};
    const userCounts = {};
    
    logs.forEach(log => {
      // Login counts
      if (log.action === 'teacher_login') {
        if (log.details && log.details.username === 'admin') {
          adminLogins++;
        } else {
          teacherLogins++;
        }
      } else if (log.action === 'student_login') {
        studentLogins++;
      }
      
      // Hour count (local time)
      if (log.timestamp) {
        const date = new Date(log.timestamp);
        const hour = date.getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
      
      // User count
      let user = null;
      if (log.details && log.details.username) {
        user = log.details.username;
      } else if (log.details && log.details.studentId) {
        user = log.details.studentId;
      } else if (log.role === 'Admin') {
        user = 'admin';
      }
      if (user) {
        userCounts[user] = (userCounts[user] || 0) + 1;
      }
    });
    
    // Update metric DOMs
    const metricLogins = document.getElementById('metric-logins');
    if (metricLogins) {
      metricLogins.textContent = `A: ${adminLogins} | T: ${teacherLogins} | S: ${studentLogins}`;
    }
    
    const metricActions = document.getElementById('metric-actions');
    if (metricActions) {
      metricActions.textContent = `${actionCount} ครั้ง`;
    }
    
    const metricPeakHour = document.getElementById('metric-peak-hour');
    if (metricPeakHour) {
      let maxHour = -1;
      let maxHourCount = 0;
      for (const hr in hourCounts) {
        if (hourCounts[hr] > maxHourCount) {
          maxHourCount = hourCounts[hr];
          maxHour = parseInt(hr);
        }
      }
      if (maxHour !== -1) {
        const nextHour = (maxHour + 1) % 24;
        const formatHour = (h) => String(h).padStart(2, '0');
        metricPeakHour.textContent = `${formatHour(maxHour)}:00 - ${formatHour(nextHour)}:00 น.`;
      } else {
        metricPeakHour.textContent = '-';
      }
    }
    
    const metricTopUser = document.getElementById('metric-top-user');
    if (metricTopUser) {
      let topUser = '-';
      let maxUserCount = 0;
      for (const usr in userCounts) {
        if (userCounts[usr] > maxUserCount) {
          maxUserCount = userCounts[usr];
          topUser = usr;
        }
      }
      metricTopUser.textContent = topUser !== '-' ? `${topUser} (${maxUserCount} ครั้ง)` : '-';
    }
    
    // Render terminal log items
    logsTerminal.innerHTML = '';
    if (logs.length === 0) {
      logsTerminal.innerHTML = '<div style="color: #cbd5e1;">[System Alert] No activity logs recorded yet.</div>';
      return;
    }
    
    logs.forEach(log => {
      const timeStr = new Date(log.timestamp).toLocaleTimeString();
      const detailsStr = JSON.stringify(log.details);
      const div = document.createElement('div');
      div.style.marginBottom = '4px';
      
      const actionColor = getLogColor(log.action);
      
      div.innerHTML = `<span style="color: #94a3b8;">[${timeStr}]</span> <span style="color: #60a5fa; font-weight: bold;">[${log.role}]</span> <span style="color: ${actionColor}; font-weight: bold;">${log.action}</span> - <span style="color: #cbd5e1;">${detailsStr}</span>`;
      logsTerminal.appendChild(div);
    });
  } catch (err) {
    console.error(err);
    logsTerminal.innerHTML = '<div style="color: #f87171;">[System Error] Failed to load activity logs from server.</div>';
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
    if (state.teacherData) {
      formData.append('Requester_Username', state.teacherData.username);
      formData.append('Requester_Role', state.teacherData.role);
    }

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
async function initApp() {
  checkQueryParams();
  
  // Restore persistent login sessions (NEW)
  const authTeacher = localStorage.getItem('auth_teacher');
  const authStudentId = localStorage.getItem('auth_student_id');
  if (authTeacher) {
    try {
      state.teacherData = JSON.parse(authTeacher);
      
      // Update UI for teacher logged in
      document.querySelector('.mode-toggle-container').classList.add('hidden');
      document.getElementById('btn-teacher-logout').classList.remove('hidden');
      
      // Update teacher profile badge (NEW)
      const teacherProfileBadge = document.getElementById('teacher-profile-badge');
      const teacherNameHeader = document.getElementById('teacher-name-display-header');
      if (teacherProfileBadge && teacherNameHeader && state.teacherData) {
        const roleLabel = state.teacherData.role === 'Admin' ? 'แอดมิน' : 'คุณครู';
        teacherNameHeader.textContent = `${roleLabel}: ${state.teacherData.fullName}`;
        teacherProfileBadge.classList.remove('hidden');
      }
      
      switchView('teacher');
      applyRolePrivileges(); // Apply instant shield on session restore
    } catch (e) {
      localStorage.removeItem('auth_teacher');
    }
  } else if (state.autoLoginStudentId) {
    loginStudent(state.autoLoginStudentId);
  } else if (authStudentId) {
    loginStudent(authStudentId);
  }

  // Sync locally saved cloud configs to server on startup (Real-time sync handshake)
  const scriptUrl = localStorage.getItem('drive_script_url');
  const folderId = localStorage.getItem('drive_folder_id');
  const isAdmin = state.teacherData && state.teacherData.role === 'Admin';
  if (scriptUrl && folderId && isAdmin) {
    try {
      console.log('Sending handshake to load database from Google Drive...');
      await fetch('/api/save-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptUrl,
          folderId,
          Requester_Username: state.teacherData.username,
          Requester_Role: state.teacherData.role
        })
      });
      console.log('Google Drive database sync handshake completed successfully.');
    } catch (err) {
      console.error('Handshake config sync to cloud database failed:', err);
    }
  }
  
  // Theme Toggle Initializer
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    applyTheme(savedTheme);
  }

  // Initialize Banana Planting Quiz integration links
  const bananaStudentLink = document.getElementById('banana-student-link');
  const btnCopyBananaLink = document.getElementById('btn-copy-banana-link');
  const btnOpenBananaLink = document.getElementById('btn-open-banana-link');
  const genericIntegrationEndpoint = document.getElementById('generic-integration-endpoint');
  const btnCopyIntegrationEndpoint = document.getElementById('btn-copy-integration-endpoint');
  
  if (bananaStudentLink) {
    const initBananaLink = async () => {
      let origin = window.location.origin;
      
      // If accessed via localhost, try to replace with LAN IP from server info config
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        try {
          const res = await fetch('/api/server-info');
          const data = await res.json();
          if (data.ip && data.ip !== 'localhost') {
            origin = `http://${data.ip}:${data.port}`;
          }
        } catch (err) {
          console.error("Failed to fetch server LAN IP:", err);
        }
      }

      const localGradingUrl = `${origin}/api/grade-external`;
      const integrationUrl = `${origin}/api/integrations/submissions`;
      const fullBananaUrl = `https://gingnai-wq.github.io/banana-planting-edu/?form=${encodeURIComponent(localGradingUrl)}`;
      bananaStudentLink.value = fullBananaUrl;
      if (genericIntegrationEndpoint) genericIntegrationEndpoint.value = integrationUrl;
      
      if (btnOpenBananaLink) {
        btnOpenBananaLink.href = fullBananaUrl;
      }
      
      if (btnCopyBananaLink) {
        btnCopyBananaLink.addEventListener('click', () => {
          navigator.clipboard.writeText(fullBananaUrl).then(() => {
            btnCopyBananaLink.innerHTML = '<i class="fa-solid fa-check-double"></i> คัดลอกแล้ว!';
            setTimeout(() => {
              btnCopyBananaLink.innerHTML = '<i class="fa-regular fa-copy"></i> คัดลอกลิงก์';
            }, 2000);
          }).catch(err => {
            console.error('Copy link failed:', err);
          });
        });
      }

      if (btnCopyIntegrationEndpoint) {
        btnCopyIntegrationEndpoint.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(integrationUrl);
            showToast('คัดลอก Integration API แล้ว', 'success');
          } catch (err) {
            window.prompt('คัดลอก Integration API', integrationUrl);
          }
        });
      }
    };
    initBananaLink();
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
    <div class="report-actions-bar" style="display: flex; gap: 10px; margin-bottom: 20px; align-self: flex-start; flex-wrap: wrap;">
      <button id="btn-print-active-report" class="btn btn-purple"><i class="fa-solid fa-print"></i> พิมพ์รายงานสรุป A4</button>
      <button id="btn-excel-active-report" class="btn btn-green"><i class="fa-solid fa-file-excel"></i> ส่งออกเป็น Excel</button>
      <button id="btn-close-active-report" class="btn btn-secondary"><i class="fa-solid fa-xmark"></i> ปิดรายงาน</button>
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
  resultsPanel.style.display = 'block';
  resultsPanel.style.width = '100%';
  resultsPanel.style.overflowX = 'auto';
  
  printArea.innerHTML = resultsPanel.querySelector('.report-paper-preview').outerHTML;
  
  document.getElementById('btn-print-active-report').addEventListener('click', () => {
    window.print();
  });
  
  document.getElementById('btn-excel-active-report').addEventListener('click', () => {
    if (typeof XLSX === 'undefined') {
      showToast('ไม่สามารถโหลดระบบส่งออก Excel ได้ กรุณาลองใหม่อีกครั้ง', 'error');
      return;
    }
    
    try {
      const wb = XLSX.utils.book_new();
      
      // Sheet 1: Metadata & Submission Table
      const ws1Data = [
        ["รายงานสรุปผลรายบุคคล - ข้อมูลการส่งงาน"],
        [`ชื่อ-นามสกุล: ${student.FullName}`, `รหัสประจำตัว: ${student.Student_ID}`],
        [`ชั้นเรียน: ${student.Class || '-'}`, `อีเมล: ${student.Email || '-'}`],
        [`วันที่ออกรายงาน: ${new Date().toLocaleDateString('th-TH')}`],
        [],
        ["สรุปการส่งงาน"],
        ["ภาระงานทั้งหมด", "ส่งแล้ว", "งานค้างส่ง", "คะแนนรวม", "คะแนนเต็ม", "คะแนนเฉลี่ย"],
        [totalTasks, submittedTasks, pendingTasks, scoreSum, scoreMax, scoreAvg],
        [],
        ["รายการผลการส่งงานและการบ้าน"],
        ["รหัสการบ้าน", "ชื่อภาระงาน / วิชา", "กำหนดส่ง", "คะแนน", "สถานะ"]
      ];
      
      const tables = resultsPanel.querySelectorAll('.report-table');
      const taskTable = tables[0];
      const attTable = tables[1];
      
      const taskRows = taskTable ? taskTable.querySelectorAll('tbody tr') : [];
      taskRows.forEach(row => {
        const cols = row.querySelectorAll('td');
        if (cols.length >= 5) {
          ws1Data.push([
            cols[0].innerText.trim(),
            cols[1].innerText.trim(),
            cols[2].innerText.trim(),
            cols[3].innerText.trim(),
            cols[4].innerText.trim()
          ]);
        }
      });
      
      const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
      XLSX.utils.book_append_sheet(wb, ws1, "ข้อมูลการส่งงาน");
      
      // Sheet 2: Attendance Table
      const ws2Data = [
        ["รายงานสรุปผลรายบุคคล - ประวัติการเข้าเรียน"],
        [`ชื่อ-นามสกุล: ${student.FullName}`, `รหัสประจำตัว: ${student.Student_ID}`],
        [`ชั้นเรียน: ${student.Class || '-'}`, `วันที่ออกรายงาน: ${new Date().toLocaleDateString('th-TH')}`],
        [],
        ["สรุปการเข้าเรียน"],
        ["คาบเรียนทั้งหมด", "มาเรียน", "ขาดเรียน", "อัตราการเข้าเรียน"],
        [totalAtt, presentAtt, absentAtt, `${attPercent}%`],
        [],
        ["ประวัติการเข้าเรียน (ล่าสุด 10 คาบ)"],
        ["วันที่", "รหัสวิชา - รายวิชา", "สถานะ", "บันทึกโดย"]
      ];
      
      const attRows = attTable ? attTable.querySelectorAll('tbody tr') : [];
      attRows.forEach(row => {
        const cols = row.querySelectorAll('td');
        if (cols.length >= 4) {
          ws2Data.push([
            cols[0].innerText.trim(),
            cols[1].innerText.trim(),
            cols[2].innerText.trim(),
            cols[3].innerText.trim()
          ]);
        } else if (cols.length === 1) {
          ws2Data.push([cols[0].innerText.trim()]);
        }
      });
      
      const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
      XLSX.utils.book_append_sheet(wb, ws2, "ประวัติการเข้าเรียน");
      
      XLSX.writeFile(wb, `Report_Individual_${student.Student_ID}_${student.FullName}.xlsx`);
      showToast('ส่งออกไฟล์ Excel สำเร็จ', 'success');
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการส่งออก Excel: ' + err.message, 'error');
    }
  });
  
  document.getElementById('btn-close-active-report').addEventListener('click', () => {
    resultsPanel.innerHTML = `
      <i class="fa-solid fa-chart-bar" style="font-size: 3rem; color: var(--text-muted); opacity: 0.5; margin-bottom: 12px;"></i>
      <p style="color: var(--text-muted);">กรุณากดปุ่ม <strong>"ดึงรายงาน"</strong> เพื่อประมวลผลสรุปข้อมูล</p>
    `;
    resultsPanel.style.background = 'var(--glass-bg)';
    resultsPanel.style.border = '1px solid var(--glass-border)';
    resultsPanel.style.display = 'flex';
    resultsPanel.style.flexDirection = 'column';
    resultsPanel.style.justifyContent = 'center';
    resultsPanel.style.alignItems = 'center';
    resultsPanel.style.overflowX = 'visible';
    
    printArea.innerHTML = '';
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
    <div class="report-actions-bar" style="display: flex; gap: 10px; margin-bottom: 20px; align-self: flex-start; flex-wrap: wrap;">
      <button id="btn-print-active-report" class="btn btn-purple"><i class="fa-solid fa-print"></i> พิมพ์รายงานสรุป A4</button>
      <button id="btn-excel-active-report" class="btn btn-green"><i class="fa-solid fa-file-excel"></i> ส่งออกเป็น Excel</button>
      <button id="btn-close-active-report" class="btn btn-secondary"><i class="fa-solid fa-xmark"></i> ปิดรายงาน</button>
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
  resultsPanel.style.display = 'block';
  resultsPanel.style.width = '100%';
  resultsPanel.style.overflowX = 'auto';
  
  printArea.innerHTML = resultsPanel.querySelector('.report-paper-preview').outerHTML;
  
  document.getElementById('btn-print-active-report').addEventListener('click', () => {
    window.print();
  });
  
  document.getElementById('btn-excel-active-report').addEventListener('click', () => {
    if (typeof XLSX === 'undefined') {
      showToast('ไม่สามารถโหลดระบบส่งออก Excel ได้ กรุณาลองใหม่อีกครั้ง', 'error');
      return;
    }
    
    try {
      const wb = XLSX.utils.book_new();
      
      const wsData = [
        ["รายงานสรุปผลภาพรวมห้องเรียน"],
        [`ชั้นเรียน: ${selectedClass}`, `วันที่ออกรายงาน: ${new Date().toLocaleDateString('th-TH')}`],
        [],
        ["ข้อมูลภาพรวมห้องเรียน"],
        ["นักเรียนทั้งหมด", "อัตราเข้าเรียนเฉลี่ย", "คะแนนเฉลี่ยห้อง", "การบ้านทั้งหมด", "อัตราการส่งงาน", "งานค้างส่งรวม"],
        [classStudents.length, `${avgAttendance}%`, avgScore, classTotalTasks, `${classSubmittedPercent}%`, classPendingCount],
        [],
        ["ตารางวิเคราะห์ข้อมูลนักเรียนรายบุคคลในห้องเรียน"],
        ["รหัสนักเรียน", "ชื่อ-นามสกุล", "เข้าเรียน (ครั้ง)", "ส่งงาน / ทั้งหมด", "คะแนนเฉลี่ย"]
      ];
      
      const classTable = resultsPanel.querySelector('.report-table');
      const classRows = classTable ? classTable.querySelectorAll('tbody tr') : [];
      classRows.forEach(row => {
        const cols = row.querySelectorAll('td');
        if (cols.length >= 5) {
          wsData.push([
            cols[0].innerText.trim(),
            cols[1].innerText.trim(),
            cols[2].innerText.trim(),
            cols[3].innerText.trim(),
            cols[4].innerText.trim()
          ]);
        }
      });
      
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, "ภาพรวมห้องเรียน");
      
      XLSX.writeFile(wb, `Report_Class_${selectedClass}.xlsx`);
      showToast('ส่งออกไฟล์ Excel สำเร็จ', 'success');
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการส่งออก Excel: ' + err.message, 'error');
    }
  });
  
  document.getElementById('btn-close-active-report').addEventListener('click', () => {
    resultsPanel.innerHTML = `
      <i class="fa-solid fa-chart-bar" style="font-size: 3rem; color: var(--text-muted); opacity: 0.5; margin-bottom: 12px;"></i>
      <p style="color: var(--text-muted);">กรุณากดปุ่ม <strong>"ดึงรายงาน"</strong> เพื่อประมวลผลสรุปข้อมูล</p>
    `;
    resultsPanel.style.background = 'var(--glass-bg)';
    resultsPanel.style.border = '1px solid var(--glass-border)';
    resultsPanel.style.display = 'flex';
    resultsPanel.style.flexDirection = 'column';
    resultsPanel.style.justifyContent = 'center';
    resultsPanel.style.alignItems = 'center';
    resultsPanel.style.overflowX = 'visible';
    
    printArea.innerHTML = '';
  });
}

// ================= SUBJECT MANAGEMENT BINDINGS =================

async function loadSubjectsTable() {
  const subjectsTableBody = document.getElementById('subjects-table-body');
  if (!subjectsTableBody) return;
  subjectsTableBody.innerHTML = '<tr><td colspan="5" class="text-center"><i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลดข้อมูล...</td></tr>';
  
  try {
    const list = await fetch('/api/subjects').then(r => r.json());
    const teachersList = await fetch('/api/teachers').then(r => r.json());
    
    subjectsTableBody.innerHTML = '';
    
    if (!Array.isArray(list) || list.length === 0) {
      subjectsTableBody.innerHTML = '<tr><td colspan="5" class="text-center">ไม่พบรายการวิชาเรียน</td></tr>';
      return;
    }
    
    const tList = Array.isArray(teachersList) ? teachersList : [];
    
    // Group subjects by department
    const groups = {
      "วิทยาศาสตร์และเทคโนโลยี": [],
      "คณิตศาสตร์": [],
      "ภาษาไทย": [],
      "สังคมศึกษา ศาสนา และวัฒนธรรม": [],
      "ภาษาต่างประเทศ": [],
      "สุขศึกษาและพลศึกษา": [],
      "ศิลปะ": [],
      "การงานอาชีพ": [],
      "กิจกรรมพัฒนาผู้เรียน": [],
      "อื่นๆ / ไม่ระบุ": []
    };
    
    list.forEach(s => {
      if (!s || !s.Subject_ID) return;
      const dept = s.Department || "อื่นๆ / ไม่ระบุ";
      if (groups[dept]) {
        groups[dept].push(s);
      } else {
        groups["อื่นๆ / ไม่ระบุ"].push(s);
      }
    });
    
    Object.keys(groups).forEach(deptName => {
      const deptSubjects = groups[deptName];
      if (deptSubjects.length === 0) return;
      
      // Render department divider row
      const divRow = document.createElement('tr');
      divRow.style.background = 'rgba(139, 92, 246, 0.08)';
      divRow.style.fontWeight = 'bold';
      divRow.innerHTML = `
        <td colspan="5" style="color: #c084fc; padding: 10px 16px;">
          <i class="fa-solid fa-folder-open" style="margin-right: 6px;"></i> กลุ่มสาระฯ: ${deptName}
        </td>
      `;
      subjectsTableBody.appendChild(divRow);
      
      deptSubjects.forEach(s => {
        let teacherName = 'ครูทุกคน (วิชากิจกรรม)';
        const tUsername = s.Teacher_Username || '';
        
        if (tUsername && tUsername !== 'any') {
          const t = tList.find(x => x && x.username && x.username.toLowerCase() === tUsername.toLowerCase());
          teacherName = t ? `${t.fullName || '-'} (${tUsername})` : tUsername;
        }
        
        let classDisplay = 'ทุกชั้นเรียน';
        let classDataAttr = 'all';
        if (s.Classes) {
          if (Array.isArray(s.Classes)) {
            if (!s.Classes.includes('all') && !s.Classes.includes('ทุกชั้นเรียน')) {
              classDisplay = s.Classes.join(', ');
              classDataAttr = s.Classes.join(',');
            }
          } else if (s.Classes !== 'all' && s.Classes !== 'ทุกชั้นเรียน') {
            classDisplay = s.Classes;
            classDataAttr = s.Classes;
          }
        }
        
        const isOwner = state.teacherData && (state.teacherData.username.toLowerCase() === tUsername.toLowerCase() || tUsername === 'any');
        const isAdmin = state.teacherData && state.teacherData.role === 'Admin';
        
        const row = document.createElement('tr');
        row.innerHTML = `
          <td style="padding-left: 25px;"><small class="text-muted">${deptName}</small></td>
          <td><strong>${s.Subject_ID}</strong></td>
          <td>${s.Subject_Name || '-'}</td>
          <td>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <span class="badge-class" style="background: rgba(139,92,246,0.15); color: #c084fc; border: 1px solid rgba(139,92,246,0.3); font-size: 0.75rem; width: fit-content;">${teacherName}</span>
              <span style="font-size: 0.75rem; color: var(--text-muted);">ห้องเรียน: ${classDisplay}</span>
            </div>
          </td>
          <td>
            <div style="display: flex; gap: 6px;">
              ${(isAdmin || isOwner) ? `
                <button class="btn btn-secondary btn-icon-only btn-edit-subject-trigger" 
                        data-id="${s.Subject_ID}" 
                        data-name="${s.Subject_Name || ''}" 
                        data-teacher="${tUsername}" 
                        data-department="${s.Department || ''}" 
                        data-classes="${classDataAttr}" 
                        style="padding: 4px 8px; font-size: 0.8rem;" 
                        title="แก้ไขรายวิชา">
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn btn-red btn-icon-only btn-delete-subject-trigger" 
                        data-id="${s.Subject_ID}" 
                        style="padding: 4px 8px; font-size: 0.8rem;" 
                        title="ลบรายวิชา">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              ` : `<small class="text-muted">ไม่มีสิทธิ์จัดการ</small>`}
            </div>
          </td>
        `;
        subjectsTableBody.appendChild(row);
      });
    });
  } catch (err) {
    console.error('Error in loadSubjectsTable:', err);
    subjectsTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-red">เกิดข้อผิดพลาดในการโหลดวิชาเรียน</td></tr>';
  }
}

const addSubjectModal = document.getElementById('add-subject-modal');
const btnAddSubjectTrigger = document.getElementById('btn-add-subject-trigger');
const addSubjectForm = document.getElementById('add-subject-form');

if (btnAddSubjectTrigger && addSubjectModal) {
  btnAddSubjectTrigger.addEventListener('click', async () => {
    addSubjectForm.reset();
    
    // Auto generate sequential Subject ID (e.g. S005)
    let nextNum = 1;
    if (state.subjects && state.subjects.length > 0) {
      const sIds = state.subjects
        .map(s => {
          const match = s.Subject_ID.match(/^S(\d+)$/i);
          return match ? parseInt(match[1], 10) : null;
        })
        .filter(n => n !== null);
      if (sIds.length > 0) {
        nextNum = Math.max(...sIds) + 1;
      }
    }
    const generatedId = `S${String(nextNum).padStart(3, '0')}`;
    const newSubjectIdInput = document.getElementById('new-subject-id');
    if (newSubjectIdInput) {
      newSubjectIdInput.value = generatedId;
    }
    
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
    const department = document.getElementById('new-subject-department').value;
    
    let subjectClasses = 'ทุกชั้นเรียน';
    const allCheckbox = document.getElementById('new-subject-class-all');
    if (allCheckbox && !allCheckbox.checked) {
      const checkedBoxes = document.querySelectorAll('.new-subject-class-checkbox:checked');
      if (checkedBoxes.length > 0) {
        subjectClasses = Array.from(checkedBoxes).map(cb => cb.value);
      }
    }
    
    const btnSubmit = addSubjectForm.querySelector('button[type="submit"]');
    const btnOriginalText = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...';
    
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Subject_ID: id,
          Subject_Name: name,
          Teacher_Username: teacher,
          Department: department,
          Classes: subjectClasses,
          Requester_Username: state.teacherData ? state.teacherData.username : '',
          Requester_Role: state.teacherData ? state.teacherData.role : ''
        })
      }).then(r => r.json());
      
      if (res.success) {
        showToast(res.message, 'success');
        logAgentEvent('create_subject', 'Teacher', { subjectId: id, teacher });
        closeModal(addSubjectModal);
        
        await loadTeacherDashboard(); 
        await loadSubjectsTable();
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

async function populateEditSubjectTeacherDropdown(selectedUsername) {
  const selectTeacher = document.getElementById('edit-subject-teacher');
  if (!selectTeacher) return;
  
  selectTeacher.innerHTML = '<option value="any">ครูทุกคน (วิชากิจกรรม เช่น ลูกเสือ/ชุมนุม)</option>';
  try {
    const teachersList = await fetch('/api/teachers').then(r => r.json());
    teachersList.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.username;
      opt.textContent = `${t.fullName} (${t.username})`;
      selectTeacher.appendChild(opt);
    });
    
    selectTeacher.value = selectedUsername || 'any';
    
    const isAdmin = state.teacherData && state.teacherData.role === 'Admin';
    selectTeacher.disabled = !isAdmin;
  } catch (e) {
    console.error('Failed to load teachers for subject edit reassignment:', e);
  }
}

document.getElementById('panel-subjects-view').addEventListener('click', async (e) => {
  // 1. Delete Subject
  const delBtn = e.target.closest('.btn-delete-subject-trigger');
  if (delBtn) {
    const subjectId = delBtn.dataset.id;
    if (confirm(`คุณครูยืนยันว่าต้องการลบรายวิชา "${subjectId}" ใช่หรือไม่?`)) {
      try {
        const res = await fetch('/api/subjects/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Subject_ID: subjectId,
            Requester_Username: state.teacherData ? state.teacherData.username : '',
            Requester_Role: state.teacherData ? state.teacherData.role : ''
          })
        }).then(r => r.json());
        
        if (res.success) {
          showToast(res.message, 'success');
          logAgentEvent('delete_subject', 'Teacher', { subjectId });
          await loadTeacherDashboard(); 
          await loadSubjectsTable();
        } else {
          showToast(res.message, 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('เกิดข้อผิดพลาดในการลบรายวิชา', 'error');
      }
    }
  }
  
  // 2. Edit Subject
  const editBtn = e.target.closest('.btn-edit-subject-trigger');
  if (editBtn) {
    const subjectId = editBtn.dataset.id;
    const name = editBtn.dataset.name;
    const teacher = editBtn.dataset.teacher;
    const department = editBtn.dataset.department;
    const classes = editBtn.dataset.classes;
    
    document.getElementById('edit-subject-id').value = subjectId;
    document.getElementById('edit-subject-id-display').value = subjectId;
    document.getElementById('edit-subject-name').value = name;
    document.getElementById('edit-subject-department').value = department || 'วิทยาศาสตร์และเทคโนโลยี';
    
    await populateEditSubjectTeacherDropdown(teacher);
    
    // Set classes checkboxes
    const classesList = (classes || 'all').split(',');
    const isAll = classesList.includes('all') || classesList.includes('ทุกชั้นเรียน') || classesList.includes('');
    const allCheckbox = document.getElementById('edit-subject-class-all');
    const specificCheckboxes = document.querySelectorAll('.edit-subject-class-checkbox');
    
    if (allCheckbox) {
      if (isAll) {
        allCheckbox.checked = true;
        specificCheckboxes.forEach(cb => {
          cb.checked = false;
          cb.disabled = true;
        });
      } else {
        allCheckbox.checked = false;
        specificCheckboxes.forEach(cb => {
          cb.disabled = false;
          cb.checked = classesList.includes(cb.value);
        });
      }
    }
    
    openModal(document.getElementById('subject-edit-modal'));
  }
});

// Subject Edit Form submit handler
const subjectEditForm = document.getElementById('subject-edit-form');
const subjectEditModal = document.getElementById('subject-edit-modal');
if (subjectEditForm) {
  subjectEditForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-subject-id').value;
    const name = document.getElementById('edit-subject-name').value.trim();
    const teacher = document.getElementById('edit-subject-teacher').value;
    const department = document.getElementById('edit-subject-department').value;
    
    let subjectClasses = 'ทุกชั้นเรียน';
    const allCheckbox = document.getElementById('edit-subject-class-all');
    if (allCheckbox && !allCheckbox.checked) {
      const checkedBoxes = document.querySelectorAll('.edit-subject-class-checkbox:checked');
      if (checkedBoxes.length > 0) {
        subjectClasses = Array.from(checkedBoxes).map(cb => cb.value);
      }
    }
    
    const btnSubmit = subjectEditForm.querySelector('button[type="submit"]');
    const btnOriginalText = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...';
    
    try {
      const res = await fetch('/api/subjects/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Subject_ID: id,
          Subject_Name: name,
          Teacher_Username: teacher,
          Department: department,
          Classes: subjectClasses,
          Requester_Username: state.teacherData ? state.teacherData.username : '',
          Requester_Role: state.teacherData ? state.teacherData.role : ''
        })
      }).then(r => r.json());
      
      if (res.success) {
        showToast(res.message, 'success');
        logAgentEvent('edit_subject', 'Teacher', { subjectId: id });
        closeModal(subjectEditModal);
        await loadTeacherDashboard();
        await loadSubjectsTable();
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

// Render Assignments Table in Teacher Dashboard (NEW)
async function loadAssignmentsTable() {
  if (!assignmentsTableBody) return;
  assignmentsTableBody.innerHTML = '<tr><td colspan="7" class="text-center"><i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลดข้อมูล...</td></tr>';

  try {
    // Sort assignments by ID descending
    const list = Array.isArray(state.assignments) ? [...state.assignments] : [];
    list.sort((a, b) => {
      const idA = a && a.Assignment_ID ? String(a.Assignment_ID) : '';
      const idB = b && b.Assignment_ID ? String(b.Assignment_ID) : '';
      return idB.localeCompare(idA);
    });

    assignmentsTableBody.innerHTML = '';
    
    // Filter assignments that are permitted
    const permitted = list.filter(a => a && hasSubjectAccess(a.Subject_ID));

    if (permitted.length === 0) {
      assignmentsTableBody.innerHTML = '<tr><td colspan="7" class="text-center">ไม่พบข้อมูลภาระงานที่ท่านมีสิทธิ์เข้าถึง</td></tr>';
      return;
    }
    
    permitted.forEach(assign => {
      if (!assign || !assign.Assignment_ID) return;
      const subj = Array.isArray(state.subjects) ? state.subjects.find(s => s && s.Subject_ID === assign.Subject_ID) : null;
      const subjectName = subj ? `${subj.Subject_Name || '-'} (${assign.Subject_ID || '-'})` : (assign.Subject_ID || '-');
      
      let formattedDate = '-';
      if (assign.Due_Date) {
        try {
          const d = new Date(assign.Due_Date);
          if (!isNaN(d.getTime())) {
            formattedDate = d.toLocaleDateString('th-TH', {
              day: 'numeric',
              month: 'short',
              year: '2-digit'
            });
          } else {
            formattedDate = assign.Due_Date;
          }
        } catch (e) {
          formattedDate = assign.Due_Date;
        }
      }

      const maxScore = assign.Max_Score !== undefined ? assign.Max_Score : '-';
      const submissionUrl = `${window.location.origin}/?assign=${encodeURIComponent(assign.Assignment_ID)}`;
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&ecc=M&data=${encodeURIComponent(submissionUrl)}`;
      
      let classDisplay = 'ทุกชั้นเรียน';
      let classDataAttr = 'all';
      if (assign.Class) {
        if (Array.isArray(assign.Class)) {
          if (!assign.Class.includes('all') && !assign.Class.includes('ทุกชั้นเรียน')) {
            classDisplay = assign.Class.join(', ');
            classDataAttr = assign.Class.join(',');
          }
        } else if (assign.Class !== 'all' && assign.Class !== 'ทุกชั้นเรียน') {
          classDisplay = assign.Class;
          classDataAttr = assign.Class;
        }
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${assign.Assignment_ID}</strong></td>
        <td>${assign.Assignment_Name || '-'}</td>
        <td>${subjectName}</td>
        <td><span class="badge" style="background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border);">${classDisplay}</span></td>
        <td>${formattedDate}</td>
        <td><strong>${maxScore}</strong></td>
        <td>
          <div class="actions-group" style="display: flex; gap: 8px;">
            <button class="btn btn-green btn-icon-only btn-assignment-qr"
                    data-url="${submissionUrl}"
                    data-qr="${qrImageUrl}"
                    data-id="${assign.Assignment_ID}"
                    title="เปิดและดาวน์โหลด QR สำหรับส่งงาน">
              <i class="fa-solid fa-qrcode"></i>
            </button>
            <button class="btn btn-blue btn-icon-only btn-copy-assignment-link"
                    data-url="${submissionUrl}"
                    title="คัดลอกลิงก์ส่งงาน">
              <i class="fa-solid fa-link"></i>
            </button>
            <button class="btn btn-secondary btn-icon-only btn-edit-assign-trigger" 
                    data-id="${assign.Assignment_ID}"
                    data-name="${assign.Assignment_Name || ''}"
                    data-subject="${assign.Subject_ID || ''}"
                    data-class="${classDataAttr}"
                    data-due="${assign.Due_Date || ''}"
                    data-score="${maxScore}"
                    style="padding: 4px 8px; font-size: 0.8rem;"
                    title="แก้ไขการบ้าน">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn btn-red btn-icon-only btn-delete-assign-trigger" 
                    data-id="${assign.Assignment_ID}"
                    style="padding: 4px 8px; font-size: 0.8rem;"
                    title="ลบการบ้าน">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      `;
      assignmentsTableBody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error in loadAssignmentsTable:', err);
    assignmentsTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-red">เกิดข้อผิดพลาดในการแสดงตารางภาระงาน</td></tr>';
  }
}

document.getElementById('panel-assignments-view').addEventListener('click', async (event) => {
  const copyButton = event.target.closest('.btn-copy-assignment-link');
  if (copyButton) {
    try {
      await navigator.clipboard.writeText(copyButton.dataset.url);
      showToast('คัดลอกลิงก์ส่งงานแล้ว', 'success');
    } catch (err) {
      window.prompt('คัดลอกลิงก์ส่งงานนี้', copyButton.dataset.url);
    }
    return;
  }

  const qrButton = event.target.closest('.btn-assignment-qr');
  if (qrButton) {
    const popup = window.open('', '_blank', 'width=720,height=820');
    if (!popup) {
      showToast('เบราว์เซอร์บล็อกหน้าต่าง QR กรุณาอนุญาต Pop-up', 'error');
      return;
    }
    const assignmentName = state.assignments.find(item => item.Assignment_ID === qrButton.dataset.id)?.Assignment_Name || qrButton.dataset.id;
    popup.document.write(`
      <!doctype html>
      <html lang="th">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>QR ส่งงาน ${qrButton.dataset.id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 28px; text-align: center; color: #172033; }
          .sheet { max-width: 620px; margin: auto; border: 2px solid #e5e7eb; border-radius: 20px; padding: 28px; }
          img { width: min(82vw, 480px); height: auto; }
          h1 { font-size: 1.5rem; margin-bottom: 6px; }
          p { color: #64748b; overflow-wrap: anywhere; }
          .actions { display: flex; gap: 10px; justify-content: center; margin-top: 18px; }
          button, a { border: 0; border-radius: 10px; padding: 11px 16px; background: #2563eb; color: white; text-decoration: none; cursor: pointer; }
          @media print { .actions { display: none; } body { padding: 0; } .sheet { border: 0; } }
        </style>
      </head>
      <body>
        <main class="sheet">
          <h1>${assignmentName}</h1>
          <strong>${qrButton.dataset.id}</strong>
          <p>สแกนเพื่อเปิดงานนี้โดยตรง แล้วเข้าสู่ระบบนักเรียนเพื่อส่งงาน</p>
          <img src="${qrButton.dataset.qr}" alt="QR ส่งงาน ${qrButton.dataset.id}">
          <p>${qrButton.dataset.url}</p>
          <div class="actions">
            <button onclick="window.print()">พิมพ์ QR</button>
            <a href="${qrButton.dataset.qr}" download="QR-${qrButton.dataset.id}.png">ดาวน์โหลดรูป QR</a>
          </div>
        </main>
      </body>
      </html>
    `);
    popup.document.close();
  }
});

// Modal bindings for editing assignments
if (assignmentEditForm) {
  // Populate subject options in edit modal
  const populateEditSubjectDropdown = () => {
    const editAssignSub = document.getElementById('edit-assign-subject');
    if (editAssignSub && state.subjects) {
      editAssignSub.innerHTML = '';
      const permittedSubjects = state.subjects.filter(s => hasSubjectAccess(s.Subject_ID));
      permittedSubjects.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.Subject_ID;
        opt.textContent = `${s.Subject_ID} - ${s.Subject_Name}`;
        editAssignSub.appendChild(opt);
      });
    }
  };

  // Listen to Edit Button Clicks
  document.getElementById('panel-assignments-view').addEventListener('click', (e) => {
    const editBtn = e.target.closest('.btn-edit-assign-trigger');
    if (editBtn) {
      populateEditSubjectDropdown();

      const assignId = editBtn.dataset.id;
      const assignName = editBtn.dataset.name;
      const subjectId = editBtn.dataset.subject;
      const assignClass = editBtn.dataset.class;
      const due = editBtn.dataset.due;
      const score = editBtn.dataset.score;

      document.getElementById('edit-assign-id-display').value = assignId;
      document.getElementById('edit-assign-id').value = assignId;
      document.getElementById('edit-assign-name').value = assignName;
      document.getElementById('edit-assign-subject').value = subjectId;
      
      // Handle setting checkboxes in edit modal
      const classesList = (assignClass || 'all').split(',');
      const isAll = classesList.includes('all') || classesList.includes('ทุกชั้นเรียน') || classesList.includes('');
      const allCheckbox = document.getElementById('edit-class-all');
      const specificCheckboxes = document.querySelectorAll('.edit-class-checkbox');
      
      if (allCheckbox) {
        if (isAll) {
          allCheckbox.checked = true;
          specificCheckboxes.forEach(cb => {
            cb.checked = false;
            cb.disabled = true;
          });
        } else {
          allCheckbox.checked = false;
          specificCheckboxes.forEach(cb => {
            cb.disabled = false;
            cb.checked = classesList.includes(cb.value);
          });
        }
      }
      
      document.getElementById('edit-assign-due').value = due;
      document.getElementById('edit-assign-score').value = score;

      openModal(assignmentEditModal);
    }
  });

  // Handle Edit Form Submission
  assignmentEditForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = assignmentEditForm.querySelector('button[type="submit"]');
    const btnOriginalText = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...';

    let assignClass = 'ทุกชั้นเรียน';
    const allCheckbox = document.getElementById('edit-class-all');
    if (allCheckbox && !allCheckbox.checked) {
      const checkedBoxes = document.querySelectorAll('.edit-class-checkbox:checked');
      if (checkedBoxes.length > 0) {
        assignClass = Array.from(checkedBoxes).map(cb => cb.value);
      }
    }

    const formData = {
      Assignment_ID: document.getElementById('edit-assign-id').value,
      Assignment_Name: document.getElementById('edit-assign-name').value.trim(),
      Subject_ID: document.getElementById('edit-assign-subject').value,
      Class: assignClass,
      Due_Date: document.getElementById('edit-assign-due').value,
      Max_Score: Number(document.getElementById('edit-assign-score').value),
      Requester_Username: state.teacherData ? state.teacherData.username : '',
      Requester_Role: state.teacherData ? state.teacherData.role : ''
    };

    try {
      const res = await fetch('/api/assignments/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      }).then(r => r.json());

      if (res.success) {
        showToast(res.message, 'success');
        logAgentEvent('edit_assignment', 'Teacher', { assignmentId: formData.Assignment_ID });
        closeModal(assignmentEditModal);
        
        await loadTeacherDashboard(); // This will refresh table, dropdowns, and state!
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

// Listen to Delete Button Clicks
document.getElementById('panel-assignments-view').addEventListener('click', async (e) => {
  const delBtn = e.target.closest('.btn-delete-assign-trigger');
  if (delBtn) {
    const assignmentId = delBtn.dataset.id;
    if (confirm(`คุณครูยืนยันว่าต้องการลบการบ้านรหัส "${assignmentId}" หรือไม่?\n(การลบจะลบประวัติการส่งงานและคะแนนของเด็กทั้งหมดด้วย)`)) {
      try {
        const res = await fetch('/api/assignments/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Assignment_ID: assignmentId,
            Requester_Username: state.teacherData ? state.teacherData.username : '',
            Requester_Role: state.teacherData ? state.teacherData.role : ''
          })
        }).then(r => r.json());
        
        if (res.success) {
          showToast(res.message, 'success');
          logAgentEvent('delete_assignment', 'Teacher', { assignmentId });
          await loadTeacherDashboard(); // This will refresh everything!
        } else {
          showToast(res.message, 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('เกิดข้อผิดพลาดในการลบการบ้าน', 'error');
      }
    }
  }
});

// 10-Minute Inactivity Auto-Logout System
let lastActivityTime = Date.now();
const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes

function resetInactivityTimer() {
  lastActivityTime = Date.now();
}

window.addEventListener('mousemove', resetInactivityTimer);
window.addEventListener('click', resetInactivityTimer);
window.addEventListener('keydown', resetInactivityTimer);
window.addEventListener('scroll', resetInactivityTimer);

setInterval(() => {
  const loggedInStudent = state.studentData || localStorage.getItem('auth_student_id');
  const loggedInTeacher = state.teacherData || localStorage.getItem('auth_teacher');
  
  if (!loggedInStudent && !loggedInTeacher) {
    return;
  }
  
  if (Date.now() - lastActivityTime > INACTIVITY_TIMEOUT) {
    console.log('Inactivity timeout reached (10 minutes). Automatic logout...');
    resetInactivityTimer();
    
    if (loggedInTeacher) {
      const btnLogout = document.getElementById('btn-teacher-logout');
      if (btnLogout) {
        btnLogout.click();
      }
      showToast('คุณถูกออกจากระบบโดยอัตโนมัติเนื่องจากไม่มีการเคลื่อนไหวเกิน 10 นาที', 'warning');
    } else if (loggedInStudent) {
      const btnLogout = document.getElementById('btn-student-logout');
      if (btnLogout) {
        btnLogout.click();
      }
      showToast('ออกจากระบบโดยอัตโนมัติเนื่องจากไม่มีการเคลื่อนไหวเกิน 10 นาที', 'warning');
    }
  }
}, 5000); // Check every 5 seconds
