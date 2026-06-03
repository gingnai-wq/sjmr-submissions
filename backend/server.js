const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const excelHelper = require('./excelHelper');
const AdmZip = require('adm-zip');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
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

// Initialize database with students from Excel if database is empty
function initDb() {
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
  const { Assignment_ID, Assignment_Name, Due_Date, Max_Score } = req.body;

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

// 6. Grade submission (Teacher)
app.post('/api/grade', (req, res) => {
  const { Submission_ID, Score, Status } = req.body;

  if (!Submission_ID || Score === undefined) {
    return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
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
  const { Student_ID, Assignment_ID, Score } = req.body;

  if (!Student_ID || !Assignment_ID || Score === undefined) {
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
      
      const ext = path.extname(fileName).toLowerCase();
      if (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.png') return;
      
      const baseName = path.basename(fileName, ext).trim();
      
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

// Start the server
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` Server is running on: http://localhost:${PORT}`);
  console.log(`=========================================`);
  initDb();
});
