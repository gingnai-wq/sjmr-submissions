const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const excelHelper = require('./excelHelper');
const AdmZip = require('adm-zip');
const urlModule = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files with no-cache headers to prevent browser caching old versions
app.use((req, res, next) => {
  const url = req.url.split('?')[0];
  if (url.endsWith('.js') || url.endsWith('.css') || url === '/' || url.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
  next();
});
app.use(express.static(path.join(__dirname, '../frontend')));

// Ensure uploads folders exist
const UPLOADS_DIR = path.join(__dirname, '../uploads');
const SERVER_PHOTOS_DIR = path.join(__dirname, '../uploads/photos');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(SERVER_PHOTOS_DIR)) {
  fs.mkdirSync(SERVER_PHOTOS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9ก-๙_-]/g, '_');
    cb(null, `${base}-${uniqueSuffix}${ext}`);
  }
});
const upload = multer({ storage: storage });

// Configure multer for photo uploads specifically (in uploads/photos/)
const photoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, SERVER_PHOTOS_DIR);
  },
  filename: function (req, file, cb) {
    const studentId = req.body.Student_ID || 'temp';
    const ext = path.extname(file.originalname);
    cb(null, `${studentId}${ext}`);
  }
});
const uploadPhoto = multer({ storage: photoStorage });

// Helper to restore missing student photos from Google Drive
function syncPhotosFromDrive(scriptUrl, folderId, callback) {
  if (!scriptUrl || !folderId) {
    if (callback) callback(new Error('ข้อมูลไม่ครบถ้วน'));
    return;
  }

  const url = `${scriptUrl}?folderId=${folderId}`;
  
  downloadJson(url, (err, body) => {
    if (err) {
      console.error('Error fetching file list from Google Apps Script:', err);
      if (callback) callback(err);
      return;
    }
    
    try {
      const parsed = JSON.parse(body);
      if (!parsed.success) {
        if (callback) callback(new Error(parsed.error || 'เกิดข้อผิดพลาดจาก Google Drive'));
        return;
      }
      
      const files = parsed.files || [];
      const studentsList = db.getStudents();
      const studentMap = {};
      studentsList.forEach(s => {
        studentMap[s.Student_ID] = s;
      });

      const matchCandidates = [];
      files.forEach(file => {
        const origExt = path.extname(file.name);
        const ext = origExt.toLowerCase();
        if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.png') return;
        
        const baseName = path.basename(file.name, origExt).trim();
        if (studentMap[baseName]) {
          const targetFileName = `${baseName}${ext}`;
          const targetPath = path.join(SERVER_PHOTOS_DIR, targetFileName);
          if (!fs.existsSync(targetPath)) {
            matchCandidates.push({
              studentId: baseName,
              ext: ext,
              id: file.id
            });
          }
        }
      });

      if (matchCandidates.length === 0) {
        if (callback) callback(null, 0);
        return;
      }

      console.log(`Downloading ${matchCandidates.length} missing student photos from Google Drive...`);
      let downloaded = 0;
      let successCount = 0;

      function downloadNext() {
        if (downloaded >= matchCandidates.length) {
          db.setStudents(studentsList); // Save updated student list to database
          if (callback) callback(null, successCount);
          return;
        }

        const candidate = matchCandidates[downloaded];
        const targetFileName = `${candidate.studentId}${candidate.ext}`;
        const targetPath = path.join(SERVER_PHOTOS_DIR, targetFileName);
        const downloadUrl = `https://docs.google.com/uc?export=download&id=${candidate.id}`;

        downloadFile(downloadUrl, targetPath, (downloadErr) => {
          if (!downloadErr) {
            studentMap[candidate.studentId].Photo = `/uploads/photos/${targetFileName}`;
            successCount++;
          } else {
            console.error(`Error downloading image for student ${candidate.studentId}:`, downloadErr);
          }
          downloaded++;
          downloadNext();
        });
      }

      downloadNext();
    } catch (parseErr) {
      console.error('Error parsing JSON from Apps Script:', parseErr);
      if (callback) callback(parseErr);
    }
  });
}

// Initialize database with students from Excel if database is empty
async function initDb() {
  // Sync with Google Drive first if config is set to retrieve any previously saved data
  if (db.getConfig().scriptUrl && db.getConfig().folderId) {
    console.log('Attempting initial Google Drive sync on startup...');
    try {
      await db.syncDrive();
      // Restore missing student photos in background
      console.log('Starting background restore of missing student photos...');
      syncPhotosFromDrive(db.getConfig().scriptUrl, db.getConfig().folderId);
    } catch (e) {
      console.error('Initial Google Drive sync failed:', e);
    }
  }

  const currentStudents = db.getStudents();
  if (currentStudents.length === 0) {
    console.log('Database is empty. Attempting to seed students from Excel...');
    const imported = excelHelper.importStudents();
    if (imported.length > 0) {
      db.setStudents(imported);
      console.log(`Seeded database with ${imported.length} students.`);
    } else {
      const testStudents = [
        { Student_ID: "1001", FullName: "สมชาย ใจดี", Class: "ม.6/1", Email: "1001@sjmr.ac.th", Status: "กำลังศึกษาอยู่" },
        { Student_ID: "1002", FullName: "สมศรี รักเรียน", Class: "ม.6/1", Email: "1002@sjmr.ac.th", Status: "กำลังศึกษาอยู่" },
        { Student_ID: "1003", FullName: "กิตติพงษ์ สู้เรียน", Class: "ม.6/2", Email: "1003@sjmr.ac.th", Status: "กำลังศึกษาอยู่" }
      ];
      db.setStudents(testStudents);
      console.log('Seeded database with fallback test students.');
    }
  } else {
    console.log(`Database loaded with ${currentStudents.length} students.`);
  }
}

// ---------------- API ENDPOINTS ----------------

// 1. Verify Student ID
app.get('/api/student/:id', (req, res) => {
  const studentId = req.params.id;
  const student = db.findStudentById(studentId);
  
  if (!student) {
    return res.status(404).json({ success: false, message: 'ไม่พบรหัสประจำตัวนักเรียนนี้ในระบบ' });
  }

  // Get submissions for this student
  const studentSubmissions = db.getSubmissions().filter(s => s.Student_ID === studentId);

  res.json({
    success: true,
    student: student,
    submissions: studentSubmissions
  });
});

// 2. Get all assignments
app.get('/api/assignments', (req, res) => {
  res.json(db.getAssignments());
});

// 3. Create a new assignment (Teacher)
app.post('/api/assignments', (req, res) => {
  const { Assignment_ID, Assignment_Name, Due_Date, Max_Score, Subject_ID } = req.body;

  if (!Assignment_ID || !Assignment_Name || !Due_Date || !Max_Score) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  // Check if ID already exists
  const exists = db.getAssignments().some(a => a.Assignment_ID === Assignment_ID);
  if (exists) {
    return res.status(400).json({ success: false, message: 'รหัสการบ้านนี้มีอยู่แล้วในระบบ' });
  }

  const newAssignment = db.addAssignment({
    Assignment_ID,
    Assignment_Name,
    Subject_ID: Subject_ID || "S001",
    Due_Date,
    Max_Score: Number(Max_Score),
    QR_Link: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${Assignment_ID}`
  });

  res.status(201).json({ success: true, assignment: newAssignment });
});

// 4. Submit assignment (Student)
app.post('/api/submit', upload.single('file'), (req, res) => {
  const { Student_ID, Assignment_ID, Notes } = req.body;
  const file = req.file;

  if (!Student_ID || !Assignment_ID) {
    if (file) fs.unlinkSync(file.path);
    return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
  }

  const student = db.findStudentById(Student_ID);
  if (!student) {
    if (file) fs.unlinkSync(file.path);
    return res.status(404).json({ success: false, message: 'ไม่พบรหัสนักเรียน' });
  }

  const fileLink = file ? `/uploads/${file.filename}` : '';
  const submissions = db.getSubmissions();
  const existingSubIdx = submissions.findIndex(s => s.Student_ID === Student_ID && s.Assignment_ID === Assignment_ID);

  const submissionData = {
    Student_ID,
    FullName: student.FullName,
    Assignment_ID,
    File_Link: fileLink || (existingSubIdx !== -1 ? submissions[existingSubIdx].File_Link : ''),
    Notes: Notes || '',
    Score: existingSubIdx !== -1 ? submissions[existingSubIdx].Score : null,
    Status: 'Submitted'
  };

  if (existingSubIdx !== -1) {
    const oldFile = submissions[existingSubIdx].File_Link;
    if (file && oldFile && oldFile.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '..', oldFile);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    
    submissions[existingSubIdx] = {
      ...submissions[existingSubIdx],
      ...submissionData,
      Timestamp: new Date().toISOString(),
      Status: submissions[existingSubIdx].Status === 'Graded' ? 'Resubmitted' : 'Submitted'
    };
    db.updateSubmissionScore(submissions[existingSubIdx].Submission_ID, submissions[existingSubIdx].Score, submissions[existingSubIdx].Status);
    res.json({ success: true, message: 'ส่งงานใหม่อีกครั้งสำเร็จ', submission: submissions[existingSubIdx] });
  } else {
    const newSub = db.addSubmission(submissionData);
    res.status(201).json({ success: true, message: 'ส่งงานสำเร็จ', submission: newSub });
  }
});

// 5. Get all submissions (Teacher)
app.get('/api/submissions', (req, res) => {
  const subs = db.getSubmissions();
  const studentsList = db.getStudents();
  
  const detailedSubs = subs.map(s => {
    const student = studentsList.find(st => st.Student_ID === s.Student_ID) || {};
    return {
      ...s,
      Class: student.Class || '',
      Email: student.Email || ''
    };
  });
  
  res.json(detailedSubs);
});

function hasGradingPermission(teacherUsername, teacherRole, assignmentId) {
  if (teacherRole === 'Admin' || (teacherUsername && teacherUsername.toLowerCase() === 'admin')) return true;
  
  const assignments = db.getAssignments();
  const assign = assignments.find(a => a.Assignment_ID === assignmentId);
  if (!assign) return false;
  
  const subjects = db.getSubjects();
  const subj = subjects.find(s => s.Subject_ID === assign.Subject_ID);
  if (!subj) return true;
  
  const name = subj.Subject_Name;
  if (name.includes('ชุมนุม') || name.includes('ลูกเสือ') || subj.Teacher_Username === 'any') {
    return true;
  }
  
  return teacherUsername && subj.Teacher_Username.toLowerCase() === teacherUsername.toLowerCase();
}

// 6. Grade submission (Teacher)
app.post('/api/grade', (req, res) => {
  const { Submission_ID, Score, Status, Teacher_Username, Teacher_Role } = req.body;

  if (!Submission_ID || Score === undefined) {
    return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
  }

  const submissions = db.getSubmissions();
  const sub = submissions.find(s => s.Submission_ID === Submission_ID);
  if (!sub) {
    return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลการส่งงานที่ระบุ' });
  }

  if (!hasGradingPermission(Teacher_Username, Teacher_Role, sub.Assignment_ID)) {
    return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์ตรวจคะแนนในวิชานี้ (สิทธิ์เฉพาะครูประจำวิชา หรือผู้ดูแลระบบเท่านั้น)' });
  }

  const updated = db.updateSubmissionScore(Submission_ID, Score, Status || 'Graded');

  if (!updated) {
    return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลการส่งงานที่ระบุ' });
  }

  res.json({ success: true, message: 'บันทึกคะแนนเรียบร้อย', submission: updated });
});

// 7. Export submissions to Excel
app.post('/api/export', (req, res) => {
  const fileExported = excelHelper.exportSubmissions(
    db.getSubmissions(),
    db.getStudents(),
    db.getAssignments()
  );

  if (fileExported) {
    res.json({ success: true, message: 'ส่งออกข้อมูลเรียบร้อยแล้ว', path: fileExported });
  } else {
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการส่งออกข้อมูล' });
  }
});

// 8. Sync with Google Sheets API
app.post('/api/sync-sheets', (req, res) => {
  res.json({ 
    success: true, 
    message: 'ซิงก์ข้อมูลกับ Google Sheets สำเร็จ (จำลองการทำงาน)', 
    timestamp: new Date().toISOString() 
  });
});

// 9. Quick Grade via scan
app.post('/api/quick-grade', (req, res) => {
  const { Student_ID, Assignment_ID, Score, Teacher_Username, Teacher_Role } = req.body;

  if (!Student_ID || !Assignment_ID || Score === undefined) {
    return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
  }

  if (!hasGradingPermission(Teacher_Username, Teacher_Role, Assignment_ID)) {
    return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์ตรวจคะแนนในวิชานี้ (สิทธิ์เฉพาะครูประจำวิชา หรือผู้ดูแลระบบเท่านั้น)' });
  }

  let student = db.findStudentById(Student_ID);
  let isNewStudent = false;

  if (!student) {
    isNewStudent = true;
    student = {
      Student_ID: String(Student_ID),
      FullName: `นักเรียนใหม่ (รหัส: ${Student_ID})`,
      Class: "ม.ทั่วไป",
      Email: `${Student_ID}@sjmr.ac.th`,
      Status: "กำลังศึกษาอยู่"
    };
    const currentStudents = db.getStudents();
    currentStudents.push(student);
    db.setStudents(currentStudents);
    console.log(`Automatically created new student during scan: ${Student_ID}`);
  }

  const assignment = db.getAssignments().find(a => a.Assignment_ID === Assignment_ID);
  if (!assignment) {
    return res.status(404).json({ success: false, message: `ไม่พบรหัสการบ้าน ${Assignment_ID}` });
  }

  const submissions = db.getSubmissions();
  const existingSubIdx = submissions.findIndex(s => s.Student_ID === Student_ID && s.Assignment_ID === Assignment_ID);

  const submissionData = {
    Student_ID: String(Student_ID),
    FullName: student.FullName,
    Assignment_ID,
    File_Link: existingSubIdx !== -1 ? submissions[existingSubIdx].File_Link : '',
    Notes: existingSubIdx !== -1 ? submissions[existingSubIdx].Notes : 'ตรวจผ่านการสแกนบาร์โค้ดโดยคุณครู',
    Score: Number(Score),
    Status: 'Graded'
  };

  if (existingSubIdx !== -1) {
    submissions[existingSubIdx] = {
      ...submissions[existingSubIdx],
      ...submissionData,
      Timestamp: new Date().toISOString()
    };
    db.updateSubmissionScore(submissions[existingSubIdx].Submission_ID, Number(Score), 'Graded');
    res.json({ success: true, message: `อัปเดตคะแนนของ ${student.FullName} สำเร็จ`, submission: submissions[existingSubIdx], student: student, isNewStudent });
  } else {
    const newSub = db.addSubmission(submissionData);
    res.status(201).json({ success: true, message: `บันทึกคะแนน ${student.FullName} สำเร็จ`, submission: newSub, student: student, isNewStudent });
  }
});

// 10. Re-import / Reload student list from Excel
app.post('/api/import-excel', (req, res) => {
  try {
    const imported = excelHelper.importStudents();
    if (imported.length > 0) {
      db.setStudents(imported);
      res.json({ success: true, message: `นำเข้าข้อมูลนักเรียนสำเร็จ ${imported.length} คน จากไฟล์ Excel` });
    } else {
      res.status(400).json({ success: false, message: 'ไม่พบข้อมูลนักเรียนที่จะนำเข้าได้จากไฟล์ Excel บน Desktop' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการโหลดไฟล์ Excel' });
  }
});

// 10.1. Upload and import student list from Excel file (Teacher/Web UI)
app.post('/api/import-excel-file', upload.single('excel'), (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ success: false, message: 'กรุณาอัปโหลดไฟล์ Excel (.xlsx)' });
  }

  try {
    const imported = excelHelper.importStudents(file.path);
    // Delete the uploaded temp file after parsing
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    if (imported.length > 0) {
      db.setStudents(imported);
      res.json({ success: true, message: `นำเข้าข้อมูลนักเรียนสำเร็จ ${imported.length} คน จากไฟล์ Excel เรียบร้อย` });
    } else {
      res.status(400).json({ success: false, message: 'ไม่พบข้อมูลนักเรียนที่สามารถแยกวิเคราะห์ได้จากไฟล์ Excel นี้ กรุณาตรวจสอบหัวตารางคอลัมน์' });
    }
  } catch (err) {
    console.error(err);
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการโหลดและวิเคราะห์ไฟล์ Excel' });
  }
});

// 10.2. Upload and import student photos from a ZIP file (Teacher/Web UI)
app.post('/api/import-photos-zip', upload.single('zip'), (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ success: false, message: 'กรุณาอัปโหลดไฟล์ ZIP (.zip)' });
  }

  try {
    const zipPath = file.path;
    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();
    
    let copyCount = 0;
    const studentsList = db.getStudents();
    
    // Create a fast map of student IDs to find them quickly
    const studentMap = {};
    studentsList.forEach(s => {
      studentMap[s.Student_ID] = s;
    });

    zipEntries.forEach(entry => {
      if (entry.isDirectory) return;
      
      const fileName = path.basename(entry.entryName);
      if (fileName.startsWith('._') || fileName.startsWith('~$')) return; // Ignore macOS metadata/temp files
      
      const origExt = path.extname(fileName);
      const ext = origExt.toLowerCase();
      if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.png') return;
      
      const baseName = path.basename(fileName, origExt).trim();
      
      // If the baseName corresponds to a valid student ID
      if (studentMap[baseName]) {
        const targetFileName = `${baseName}${ext}`;
        const targetPath = path.join(SERVER_PHOTOS_DIR, targetFileName);
        
        // Extract this specific file and write it to targetPath
        const fileContent = entry.getData();
        fs.writeFileSync(targetPath, fileContent);
        
        // Update student profile photo path
        studentMap[baseName].Photo = `/uploads/photos/${targetFileName}`;
        copyCount++;
      }
    });

    if (copyCount > 0) {
      db.setStudents(studentsList); // Save updated student list to database
      // Delete temp uploaded zip file
      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
      }
      res.json({ success: true, message: `นำเข้าและจับคู่รูปถ่ายนักเรียนสำเร็จ ${copyCount} รูป` });
    } else {
      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
      }
      res.status(400).json({ success: false, message: 'ไม่พบไฟล์รูปถ่ายที่ตั้งชื่อตามรหัสประจำตัวนักเรียนในไฟล์ ZIP (ตัวอย่างการตั้งชื่อไฟล์รูป: 6032.jpg)' });
    }
  } catch (err) {
    console.error(err);
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการแตกไฟล์ ZIP และบันทึกรูปถ่าย' });
  }
});

// Helper to recursively fetch JSON, following HTTP/HTTPS redirects
function downloadJson(url, callback) {
  const lib = url.startsWith('https') ? require('https') : require('http');
  lib.get(url, (res) => {
    const isRedirect = [301, 302, 303, 307, 308].includes(res.statusCode);
    if (isRedirect && res.headers.location) {
      return downloadJson(res.headers.location, callback);
    }
    if (res.statusCode !== 200) {
      return callback(new Error(`Failed to fetch JSON: status ${res.statusCode}`));
    }
    
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      callback(null, body);
    });
  }).on('error', (err) => {
    callback(err);
  });
}

// Helper to recursively download a file, following redirects
function downloadFile(url, targetPath, callback) {
  const lib = url.startsWith('https') ? require('https') : require('http');
  lib.get(url, (res) => {
    const isRedirect = [301, 302, 303, 307, 308].includes(res.statusCode);
    if (isRedirect && res.headers.location) {
      return downloadFile(res.headers.location, targetPath, callback);
    }
    
    if (res.statusCode !== 200) {
      return callback(new Error(`Failed to download file: status ${res.statusCode}`));
    }
    
    const fileStream = fs.createWriteStream(targetPath);
    res.pipe(fileStream);
    fileStream.on('finish', () => {
      fileStream.close();
      callback(null);
    });
  }).on('error', (err) => {
    callback(err);
  });
}

// 10.3. Download and import student photos from Google Drive via Google Apps Script (Teacher/Web UI)
app.post('/api/import-photos-drive', (req, res) => {
  const { scriptUrl, folderId } = req.body;
  if (!scriptUrl || !folderId) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุ URL ของ Google Apps Script และ Folder ID' });
  }

  // Auto-save/update cloud database configuration
  db.updateConfig(scriptUrl, folderId);

  syncPhotosFromDrive(scriptUrl, folderId, (err, count) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'ไม่สามารถซิงก์รูปถ่ายจาก Google Drive ได้: ' + err.message });
    }
    res.json({ success: true, message: `ซิงก์รูปถ่ายนักเรียนจาก Google Drive สำเร็จ ${count} รูป` });
  });
});

// Helper to make a POST request and follow standard Google Apps Script redirects
function postRequest(url, postData, callback) {
  const parsedUrl = urlModule.parse(url);
  const lib = url.startsWith('https') ? require('https') : require('http');
  
  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port,
    path: parsedUrl.path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  const req = lib.request(options, (res) => {
    // If redirected, follow the redirect with GET to retrieve Apps Script's returned payload
    const isRedirect = [301, 302, 303, 307, 308].includes(res.statusCode);
    if (isRedirect && res.headers.location) {
      return downloadJson(res.headers.location, callback);
    }
    
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      callback(null, body);
    });
  });
  
  req.on('error', (err) => {
    callback(err);
  });
  
  req.write(postData);
  req.end();
}

// Helper to upload a local file to Google Drive via Apps Script Web App
function uploadFileToDrive(scriptUrl, folderId, filePath, callback) {
  if (!fs.existsSync(filePath)) {
    return callback(new Error('Local file not found.'));
  }
  
  try {
    const fileContent = fs.readFileSync(filePath);
    const base64Content = fileContent.toString('base64');
    const filename = path.basename(filePath);
    
    const postData = JSON.stringify({
      folderId: folderId,
      filename: filename,
      content: base64Content
    });
    
    postRequest(scriptUrl, postData, callback);
  } catch (err) {
    callback(err);
  }
}

// 10.4. Export submissions report and upload it to Google Drive (Teacher/Web UI)
app.post('/api/export-drive', (req, res) => {
  const { scriptUrl, folderId } = req.body;
  if (!scriptUrl || !folderId) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุ URL ของ Google Apps Script และ Folder ID' });
  }

  // Auto-save/update cloud database configuration
  db.updateConfig(scriptUrl, folderId);

  // 1. Export submissions to local Excel file first
  const fileExported = excelHelper.exportSubmissions(
    db.getSubmissions(),
    db.getStudents(),
    db.getAssignments()
  );

  if (!fileExported) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างไฟล์ Excel ในเครื่อง' });
  }

  // 2. Upload the local Excel file to Google Drive via Apps Script
  uploadFileToDrive(scriptUrl, folderId, fileExported, (err, responseBody) => {
    if (err) {
      console.error('Error uploading file to Drive:', err);
      return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการส่งไฟล์ไปที่ Google Drive: ' + err.message });
    }

    try {
      const parsed = JSON.parse(responseBody);
      if (parsed.success) {
        res.json({ success: true, message: `ส่งออกและอัปเดตไฟล์รายงานบน Google Drive สำเร็จ!` });
      } else {
        res.status(400).json({ success: false, message: parsed.error || 'Google Drive ปฏิเสธการอัปโหลดไฟล์' });
      }
    } catch (parseErr) {
      console.error('Error parsing response from Apps Script:', parseErr, responseBody);
      res.status(500).json({ success: false, message: 'ข้อมูลตอบรับจาก Google Apps Script ไม่ถูกต้อง' });
    }
  });
});

// 11. Update student details and photo (Teacher/Web UI) (NEW)
app.post('/api/student/update', uploadPhoto.single('photo'), (req, res) => {
  const { Student_ID, FullName, Class, Email } = req.body;
  const file = req.file;

  if (!Student_ID) {
    if (file) fs.unlinkSync(file.path);
    return res.status(400).json({ success: false, message: 'กรุณาระบุรหัสประจำตัวนักเรียน' });
  }

  const student = db.findStudentById(Student_ID);
  if (!student) {
    if (file) fs.unlinkSync(file.path);
    return res.status(404).json({ success: false, message: 'ไม่พบนักเรียนในระบบ' });
  }

  const updatedData = {
    FullName: FullName || student.FullName,
    Class: Class || student.Class,
    Email: Email || student.Email
  };

  if (file) {
    updatedData.Photo = `/uploads/photos/${file.filename}`;
  }

  const updated = db.updateStudent(Student_ID, updatedData);

  res.json({
    success: true,
    message: `อัปเดตข้อมูลของ ${updated.FullName} เรียบร้อยแล้ว`,
    student: updated
  });
});

// 12. Get all students directory (Teacher/Web UI) (NEW)
app.get('/api/students', (req, res) => {
  res.json(db.getStudents());
});

// 13. Save Config Endpoint (NEW)
app.post('/api/save-config', async (req, res) => {
  const { scriptUrl, folderId } = req.body;
  if (!scriptUrl || !folderId) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุ URL ของ Google Apps Script และ Folder ID' });
  }
  const config = db.updateConfig(scriptUrl, folderId);
  try {
    console.log('Awaiting initial Drive sync for save-config handshake...');
    await db.syncDrive();
    // Also trigger background restore of missing student photos
    console.log('Starting background restore of missing student photos...');
    syncPhotosFromDrive(scriptUrl, folderId);
  } catch (err) {
    console.error('Error during syncDrive in save-config:', err);
  }
  res.json({ success: true, message: 'บันทึกการเชื่อมโยงระบบคลาวด์สำเร็จ!', config });
});

// 14. Teacher Auth & Management Endpoints (NEW)
app.post('/api/teacher/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อผู้ใช้งานและรหัสผ่าน' });
  }
  const teacher = db.findTeacher(username, password);
  if (teacher) {
    res.json({
      success: true,
      message: `เข้าสู่ระบบสำเร็จ ยินดีต้อนรับ ${teacher.fullName}`,
      teacher: {
        username: teacher.username,
        fullName: teacher.fullName,
        role: teacher.role
      }
    });
  } else {
    res.status(401).json({ success: false, message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
  }
});

app.get('/api/teachers', (req, res) => {
  const list = db.getTeachers().map(t => ({
    username: t.username,
    fullName: t.fullName,
    role: t.role
  }));
  res.json(list);
});

app.post('/api/teacher/create', (req, res) => {
  const { username, password, fullName, role } = req.body;
  if (!username || !password || !fullName) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลครูให้ครบถ้วน' });
  }
  const newTeacher = db.addTeacher({
    username: username.trim(),
    password: password,
    fullName: fullName.trim(),
    role: role || 'Teacher'
  });
  if (newTeacher) {
    res.json({ success: true, message: `เพิ่มบัญชีคุณครู ${fullName} เรียบร้อยแล้ว` });
  } else {
    res.status(400).json({ success: false, message: 'มีชื่อผู้ใช้งานนี้อยู่ในระบบแล้ว' });
  }
});

app.post('/api/teacher/delete', (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อผู้ใช้งานที่ต้องการลบ' });
  }
  const deleted = db.deleteTeacher(username);
  if (deleted) {
    res.json({ success: true, message: `ลบบัญชีคุณครูเรียบร้อยแล้ว` });
  } else {
    res.status(400).json({ success: false, message: 'ไม่สามารถลบบัญชีนี้ได้ (บัญชีแอดมินหลักไม่สามารถลบได้)' });
  }
});

// 14.1 Subjects Management API (NEW)
app.get('/api/subjects', (req, res) => {
  res.json(db.getSubjects());
});

app.post('/api/subjects', (req, res) => {
  const { Subject_ID, Subject_Name, Teacher_Username } = req.body;
  if (!Subject_ID || !Subject_Name || !Teacher_Username) {
    return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
  }
  const newSub = db.addSubject({
    Subject_ID: Subject_ID.trim(),
    Subject_Name: Subject_Name.trim(),
    Teacher_Username: Teacher_Username.trim()
  });
  if (newSub) {
    res.status(201).json({ success: true, message: `สร้างรายวิชา ${Subject_Name} สำเร็จ`, subject: newSub });
  } else {
    res.status(400).json({ success: false, message: 'มีรหัสรายวิชานี้ในระบบอยู่แล้ว' });
  }
});

app.post('/api/subjects/delete', (req, res) => {
  const { Subject_ID } = req.body;
  if (!Subject_ID) {
    return res.status(400).json({ success: false, message: 'ไม่ระบุรหัสวิชา' });
  }
  const deleted = db.deleteSubject(Subject_ID);
  if (deleted) {
    res.json({ success: true, message: 'ลบรายวิชาเรียบร้อยแล้ว' });
  } else {
    res.status(404).json({ success: false, message: 'ไม่พบวิชาดังกล่าวในระบบ' });
  }
});

// 14.2 Attendance Management API (NEW)
app.get('/api/attendance', (req, res) => {
  res.json(db.getAttendance());
});

app.post('/api/attendance/scan', (req, res) => {
  const { Student_ID, Subject_ID, Recorded_By, Status } = req.body;
  if (!Student_ID || !Subject_ID) {
    return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
  }

  let student = db.findStudentById(Student_ID);
  let isNewStudent = false;

  if (!student) {
    isNewStudent = true;
    student = {
      Student_ID: String(Student_ID),
      FullName: `นักเรียนใหม่ (รหัส: ${Student_ID})`,
      Class: "ม.ทั่วไป",
      Email: `${Student_ID}@sjmr.ac.th`,
      Status: "กำลังศึกษาอยู่"
    };
    const currentStudents = db.getStudents();
    currentStudents.push(student);
    db.setStudents(currentStudents);
  }

  const today = new Date().toLocaleDateString('en-CA');
  const attList = db.getAttendance();
  const existing = attList.find(a => a.Student_ID === String(Student_ID) && a.Subject_ID === Subject_ID && a.Date === today);

  if (existing) {
    existing.Status = Status || 'Present';
    existing.Timestamp = new Date().toISOString();
    existing.Recorded_By = Recorded_By || 'system';
    db.updateAttendance(existing.Attendance_ID, existing.Status);
    res.json({ success: true, message: `อัปเดตสถานะการเข้าเรียนของ ${student.FullName} เป็น ${existing.Status === 'Present' ? 'มาเรียน' : 'ขาดเรียน'}`, attendance: existing, student, isNewStudent });
  } else {
    const newAtt = db.addAttendance({
      Student_ID: String(Student_ID),
      Subject_ID: Subject_ID,
      Date: today,
      Status: Status || 'Present',
      Recorded_By: Recorded_By || 'system'
    });
    res.status(201).json({ success: true, message: `เช็คชื่อเข้าเรียน ${student.FullName} เรียบร้อยแล้ว`, attendance: newAtt, student, isNewStudent });
  }
});

app.post('/api/attendance/update', (req, res) => {
  const { Student_ID, Subject_ID, Date: dateStr, Status, Recorded_By } = req.body;
  if (!Student_ID || !Subject_ID || !dateStr || !Status) {
    return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
  }

  const attList = db.getAttendance();
  const existing = attList.find(a => a.Student_ID === String(Student_ID) && a.Subject_ID === Subject_ID && a.Date === dateStr);

  if (existing) {
    existing.Status = Status;
    existing.Timestamp = new Date().toISOString();
    existing.Recorded_By = Recorded_By || 'teacher';
    db.updateAttendance(existing.Attendance_ID, Status);
    res.json({ success: true, message: 'อัปเดตสถานะการเข้าเรียนสำเร็จ', attendance: existing });
  } else {
    const newAtt = db.addAttendance({
      Student_ID: String(Student_ID),
      Subject_ID: Subject_ID,
      Date: dateStr,
      Status: Status,
      Recorded_By: Recorded_By || 'teacher'
    });
    res.status(201).json({ success: true, message: 'บันทึกสถานะการเข้าเรียนสำเร็จ', attendance: newAtt });
  }
});

// 15. Agent AI Usage Logging Endpoints (NEW)
app.post('/api/log', (req, res) => {
  const { action, role, details } = req.body;
  if (!action || !role) {
    return res.status(400).json({ success: false, message: 'ข้อมูลล็อกไม่สมบูรณ์' });
  }
  const entry = db.addUsageLog({ action, role, details: details || {} });
  res.json({ success: true, entry });
});

app.get('/api/logs', (req, res) => {
  res.json(db.getUsageLogs());
});

// Start the server
app.listen(PORT, async () => {
  console.log(`=========================================`);
  console.log(` Server is running on: http://localhost:${PORT}`);
  console.log(`=========================================`);
  await initDb();
});
