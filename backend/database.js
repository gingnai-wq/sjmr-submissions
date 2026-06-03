const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');
const ASSIGNMENTS_FILE = path.join(DATA_DIR, 'assignments.json');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let students = [];
let assignments = [];
let submissions = [];

function loadData() {
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

loadData();

module.exports = {
  getStudents: () => students,
  setStudents: (newStudents) => {
    students = newStudents;
    saveStudents();
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
      return students[idx];
    }
    return null;
  },
  
  getAssignments: () => assignments,
  addAssignment: (assignment) => {
    assignments.push(assignment);
    saveAssignments();
    return assignment;
  },
  
  getSubmissions: () => submissions,
  addSubmission: (submission) => {
    submission.Submission_ID = 'SUB' + Date.now();
    submission.Timestamp = new Date().toISOString();
    submissions.push(submission);
    saveSubmissions();
    return submission;
  },
  updateSubmissionScore: (submissionId, score, status) => {
    const sub = submissions.find(s => s.Submission_ID === submissionId);
    if (sub) {
      sub.Score = Number(score);
      sub.Status = status || 'Graded';
      saveSubmissions();
      return sub;
    }
    return null;
  },
  deleteSubmission: (submissionId) => {
    const idx = submissions.findIndex(s => s.Submission_ID === submissionId);
    if (idx !== -1) {
      const removed = submissions.splice(idx, 1);
      saveSubmissions();
      return removed[0];
    }
    return null;
  },
  
  reload: loadData
};
