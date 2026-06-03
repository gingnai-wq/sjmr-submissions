const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');
const ASSIGNMENTS_FILE = path.join(DATA_DIR, 'assignments.json');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
const TEACHERS_FILE = path.join(DATA_DIR, 'teachers.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let students = [];
let assignments = [];
let submissions = [];
let teachers = [];
let config = { scriptUrl: '', folderId: '' };
let isSyncing = false;

// 1. Core Data Load/Save
function loadData() {
  // Load config
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (e) {
      console.error('Error reading config file:', e);
    }
  }

  // Load students
  if (fs.existsSync(STUDENTS_FILE)) {
    try {
      students = JSON.parse(fs.readFileSync(STUDENTS_FILE, 'utf8'));
    } catch (e) {
      console.error('Error reading students file, resetting:', e);
      students = [];
    }
  } else {
    students = [];
  }

  // Load assignments
  if (fs.existsSync(ASSIGNMENTS_FILE)) {
    try {
      assignments = JSON.parse(fs.readFileSync(ASSIGNMENTS_FILE, 'utf8'));
    } catch (e) {
      console.error('Error reading assignments file, resetting:', e);
      assignments = [];
    }
  } else {
    assignments = [
      {
        Assignment_ID: "A001",
        Assignment_Name: "Coding Project 1 (การเขียนโค้ดเบื้องต้น)",
        Due_Date: "2026-06-15",
        Max_Score: 10,
        QR_Link: "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=A001"
      },
      {
        Assignment_ID: "A002",
        Assignment_Name: "Scratch Game Creation (สร้างเกมสร้างสรรค์ด้วย Scratch)",
        Due_Date: "2026-06-22",
        Max_Score: 20,
        QR_Link: "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=A002"
      },
      {
        Assignment_ID: "A003",
        Assignment_Name: "HTML Personal Website (สร้างเว็บไซต์แนะนำตัว)",
        Due_Date: "2026-06-30",
        Max_Score: 15,
        QR_Link: "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=A003"
      }
    ];
    saveAssignments();
  }

  // Load submissions
  if (fs.existsSync(SUBMISSIONS_FILE)) {
    try {
      submissions = JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, 'utf8'));
    } catch (e) {
      console.error('Error reading submissions file, resetting:', e);
      submissions = [];
    }
  } else {
    submissions = [];
  }

  // Load teachers
  if (fs.existsSync(TEACHERS_FILE)) {
    try {
      teachers = JSON.parse(fs.readFileSync(TEACHERS_FILE, 'utf8'));
    } catch (e) {
      console.error('Error reading teachers file, resetting:', e);
      loadDefaultTeachers();
    }
  } else {
    loadDefaultTeachers();
  }
}

function loadDefaultTeachers() {
  teachers = [
    {
      username: "admin",
      password: "1234",
      fullName: "คุณครูผู้ดูแลระบบ",
      role: "Admin"
    }
  ];
  saveTeachers();
}

function saveStudents() {
  fs.writeFileSync(STUDENTS_FILE, JSON.stringify(students, null, 2), 'utf8');
}

function saveAssignments() {
  fs.writeFileSync(ASSIGNMENTS_FILE, JSON.stringify(assignments, null, 2), 'utf8');
}

function saveSubmissions() {
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2), 'utf8');
}

function saveTeachers() {
  fs.writeFileSync(TEACHERS_FILE, JSON.stringify(teachers, null, 2), 'utf8');
}

function saveConfig() {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

// 2. Merge Logic for Two-Way Cloud Sync
function mergeStudents(localList, driveList) {
  const map = {};
  driveList.forEach(s => {
    map[s.Student_ID] = s;
  });
  localList.forEach(s => {
    const existing = map[s.Student_ID];
    if (!existing) {
      map[s.Student_ID] = s;
    } else {
      const merged = { ...existing, ...s };
      // Keep photo path if either has it
      if (s.Photo && !existing.Photo) merged.Photo = s.Photo;
      if (!s.Photo && existing.Photo) merged.Photo = existing.Photo;
      map[s.Student_ID] = merged;
    }
  });
  return Object.values(map);
}

function mergeAssignments(localList, driveList) {
  const map = {};
  driveList.forEach(a => {
    map[a.Assignment_ID] = a;
  });
  localList.forEach(a => {
    map[a.Assignment_ID] = { ...map[a.Assignment_ID], ...a };
  });
  return Object.values(map);
}

function mergeSubmissions(localList, driveList) {
  const map = {};
  driveList.forEach(s => {
    map[s.Submission_ID] = s;
  });
  localList.forEach(s => {
    const existing = map[s.Submission_ID];
    if (!existing) {
      map[s.Submission_ID] = s;
    } else {
      const localTime = new Date(s.Timestamp || 0).getTime();
      const driveTime = new Date(existing.Timestamp || 0).getTime();
      // Keep graded status, higher score, or newer timestamp
      if ((s.Status === 'Graded' && existing.Status !== 'Graded') || (localTime > driveTime)) {
        map[s.Submission_ID] = s;
      }
    }
  });
  return Object.values(map);
}

function mergeTeachers(localList, driveList) {
  const map = {};
  driveList.forEach(t => {
    map[t.username] = t;
  });
  localList.forEach(t => {
    map[t.username] = { ...map[t.username], ...t };
  });
  return Object.values(map);
}

// 3. Two-Way Cloud Sync Actions
async function syncDrive() {
  if (isSyncing) return;
  if (!config.scriptUrl || !config.folderId) return;

  isSyncing = true;
  try {
    const url = `${config.scriptUrl}?folderId=${config.folderId}&action=getDb`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    
    const result = await res.json();
    if (!result.success) {
      console.log('Apps Script database fetch failed:', result.error);
      isSyncing = false;
      return;
    }

    if (result.exists && result.data) {
      // Merge drive data into local database
      const driveDb = result.data;
      students = mergeStudents(students, driveDb.students || []);
      assignments = mergeAssignments(assignments, driveDb.assignments || []);
      submissions = mergeSubmissions(submissions, driveDb.submissions || []);
      teachers = mergeTeachers(teachers, driveDb.teachers || []);
      
      saveStudents();
      saveAssignments();
      saveSubmissions();
      saveTeachers();
      
      // Push the merged database back to cloud
      await pushToDrive();
    } else {
      // First time initialization: push local database to cloud
      await pushToDrive();
    }
  } catch (err) {
    console.error('Error in syncDrive background sync:', err.message);
  } finally {
    isSyncing = false;
  }
}

async function pushToDrive() {
  if (!config.scriptUrl || !config.folderId) return;
  
  try {
    const url = config.scriptUrl;
    const bodyData = {
      action: "saveDb",
      folderId: config.folderId,
      dbData: { students, assignments, submissions, teachers }
    };
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData)
    });
    
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const result = await res.json();
    if (!result.success) {
      console.log('Apps Script database save failed:', result.error);
    }
  } catch (err) {
    console.error('Error pushing database to Google Drive:', err.message);
  }
}

// Initialize on require
loadData();

// Start background sync loop (every 30 seconds)
setInterval(syncDrive, 30000);

module.exports = {
  // Config helpers
  getConfig: () => config,
  updateConfig: (scriptUrl, folderId) => {
    config.scriptUrl = scriptUrl;
    config.folderId = folderId;
    saveConfig();
    // Trigger instant background sync
    syncDrive();
    return config;
  },

  // Student helpers
  getStudents: () => students,
  setStudents: (newStudents) => {
    students = newStudents;
    saveStudents();
    pushToDrive(); // Push update immediately
  },
  findStudentById: (id) => students.find(s => s.Student_ID === id || s.Student_ID === String(id)),
  updateStudent: (studentId, updatedData) => {
    const idx = students.findIndex(s => s.Student_ID === studentId || s.Student_ID === String(studentId));
    if (idx !== -1) {
      students[idx] = {
        ...students[idx],
        ...updatedData
      };
      saveStudents();
      pushToDrive(); // Push update immediately
      return students[idx];
    }
    return null;
  },
  
  // Assignment helpers
  getAssignments: () => assignments,
  addAssignment: (assignment) => {
    assignments.push(assignment);
    saveAssignments();
    pushToDrive(); // Push update immediately
    return assignment;
  },
  
  // Submission helpers
  getSubmissions: () => submissions,
  addSubmission: (submission) => {
    submission.Submission_ID = 'SUB' + Date.now();
    submission.Timestamp = new Date().toISOString();
    submissions.push(submission);
    saveSubmissions();
    pushToDrive(); // Push update immediately
    return submission;
  },
  updateSubmissionScore: (submissionId, score, status) => {
    const sub = submissions.find(s => s.Submission_ID === submissionId);
    if (sub) {
      sub.Score = Number(score);
      sub.Status = status || 'Graded';
      sub.Timestamp = new Date().toISOString(); // Update timestamp on grading
      saveSubmissions();
      pushToDrive(); // Push update immediately
      return sub;
    }
    return null;
  },
  deleteSubmission: (submissionId) => {
    const idx = submissions.findIndex(s => s.Submission_ID === submissionId);
    if (idx !== -1) {
      const removed = submissions.splice(idx, 1);
      saveSubmissions();
      pushToDrive(); // Push update immediately
      return removed[0];
    }
    return null;
  },

  // Teacher Account helpers
  getTeachers: () => teachers,
  findTeacher: (username, password) => {
    return teachers.find(t => t.username.toLowerCase() === username.toLowerCase() && t.password === password);
  },
  addTeacher: (teacherData) => {
    const exists = teachers.some(t => t.username.toLowerCase() === teacherData.username.toLowerCase());
    if (exists) return null;
    teachers.push(teacherData);
    saveTeachers();
    pushToDrive(); // Push update immediately
    return teacherData;
  },
  deleteTeacher: (username) => {
    if (username.toLowerCase() === 'admin') return null; // Protect main admin
    const idx = teachers.findIndex(t => t.username.toLowerCase() === username.toLowerCase());
    if (idx !== -1) {
      const removed = teachers.splice(idx, 1);
      saveTeachers();
      pushToDrive(); // Push update immediately
      return removed[0];
    }
    return null;
  },
  
  reload: loadData,
  syncDrive: syncDrive
};
