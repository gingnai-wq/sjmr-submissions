const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const STUDENT_LIST_PATH = 'c:/Users/User/OneDrive/Desktop/02_งานบริหารและทะเบียน/สำเนาของ รายชื่อนักเรียน-15Sep68.xlsx';
const TEMPLATE_PATH = 'c:/Users/User/OneDrive/Desktop/02_งานบริหารและทะเบียน/SJMR_Student_Submission_Template.xlsx';
const EXPORT_PATH = 'c:/Users/User/OneDrive/Desktop/02_งานบริหารและทะเบียน/SJMR_Student_Submissions_Report.xlsx';

// Photos directories
const EXCEL_PHOTOS_DIR = 'c:/Users/User/OneDrive/Desktop/02_งานบริหารและทะเบียน/photos';
const SERVER_PHOTOS_DIR = path.join(__dirname, '../uploads/photos');

// Ensure server photos directory exists
if (!fs.existsSync(SERVER_PHOTOS_DIR)) {
  fs.mkdirSync(SERVER_PHOTOS_DIR, { recursive: true });
}

function importStudents(filePath = STUDENT_LIST_PATH) {
  if (!fs.existsSync(filePath)) {
    console.warn(`Student list file not found at ${filePath}. Using empty/default students list.`);
    return [];
  }

  try {
    const wb = xlsx.readFile(filePath);
    const allStudents = [];

    wb.SheetNames.forEach(sheetName => {
      if (!sheetName.startsWith('ม.') && !sheetName.startsWith('ป.')) {
        return;
      }

      const sheet = wb.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

      let idColIdx = -1;
      let nameColIdx = -1;
      let classColIdx = -1;
      let statusColIdx = -1;
      let headerRowFound = false;

      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0) continue;

        if (!headerRowFound) {
          const rowStr = row.map(c => String(c || '').trim());
          const hasIdHeader = rowStr.some(c => c.includes('เลขประจำตัวนักเรียน') || c.includes('เลขประจำตัว'));
          const hasNameHeader = rowStr.some(c => c.includes('ชื่อ - นามสกุล') || c.includes('ชื่อ-นามสกุล') || c.includes('ชื่อ'));

          if (hasIdHeader && hasNameHeader) {
            headerRowFound = true;
            rowStr.forEach((val, idx) => {
              if (val.includes('เลขประจำตัวนักเรียน') || val.includes('เลขประจำตัว') && !val.includes('ประชาชน')) {
                idColIdx = idx;
              }
              if (val.includes('ชื่อ') && val.includes('นามสกุล')) {
                nameColIdx = idx;
              }
              if (val.includes('ชั้นเรียน') || val.includes('ชั้น')) {
                classColIdx = idx;
              }
              if (val.includes('สถานะ')) {
                statusColIdx = idx;
              }
            });
            if (idColIdx === -1) {
              idColIdx = rowStr.findIndex(c => c.includes('เลขประจำตัว'));
            }
          }
          continue;
        }

        const studentId = String(row[idColIdx] || '').trim();
        const fullName = String(row[nameColIdx] || '').trim();
        
        if (!studentId || isNaN(Number(studentId)) || studentId.length < 3) {
          continue;
        }

        if (!fullName || fullName.includes('ชื่อ - นามสกุล')) {
          continue;
        }

        const className = classColIdx !== -1 && row[classColIdx] 
          ? String(row[classColIdx]).trim() 
          : sheetName;

        const status = statusColIdx !== -1 && row[statusColIdx]
          ? String(row[statusColIdx]).trim()
          : 'กำลังศึกษาอยู่';

        // Check if there is a local photo for this student ID
        let photoLink = '';
        if (fs.existsSync(EXCEL_PHOTOS_DIR)) {
          // Check for .jpg, .jpeg, .png extensions
          const extensions = ['.jpg', '.jpeg', '.png'];
          for (let ext of extensions) {
            const localPhotoPath = path.join(EXCEL_PHOTOS_DIR, `${studentId}${ext}`);
            if (fs.existsSync(localPhotoPath)) {
              // Copy to server uploads/photos directory
              const serverPhotoName = `${studentId}${ext}`;
              const serverPhotoPath = path.join(SERVER_PHOTOS_DIR, serverPhotoName);
              try {
                fs.copyFileSync(localPhotoPath, serverPhotoPath);
                photoLink = `/uploads/photos/${serverPhotoName}`;
                console.log(`Copied photo for student ${studentId} from Excel photos folder.`);
              } catch (copyErr) {
                console.error(`Error copying photo for student ${studentId}:`, copyErr);
              }
              break; // Found photo, no need to check other extensions
            }
          }
        }

        allStudents.push({
          Student_ID: studentId,
          FullName: fullName,
          Class: className,
          Email: `${studentId}@sjmr.ac.th`,
          Status: status,
          Photo: photoLink || '' // Will fall back to avatar if blank
        });
      }
    });

    console.log(`Successfully imported ${allStudents.length} students from Excel.`);
    return allStudents;
  } catch (err) {
    console.error('Error importing students from Excel:', err);
    return [];
  }
}

function exportSubmissions(submissions, students, assignments) {
  try {
    const wb = xlsx.utils.book_new();

    const ws1Data = students.map(s => ({
      Student_ID: s.Student_ID,
      'Full Name': s.FullName,
      Class: s.Class,
      Email: s.Email,
      Status: s.Status
    }));
    const ws1 = xlsx.utils.json_to_sheet(ws1Data);
    xlsx.utils.book_append_sheet(wb, ws1, 'STUDENT_MASTER');

    const ws2Data = assignments.map(a => ({
      Assignment_ID: a.Assignment_ID,
      Assignment_Name: a.Assignment_Name,
      Due_Date: a.Due_Date,
      Max_Score: a.Max_Score,
      QR_Link: a.QR_Link
    }));
    const ws2 = xlsx.utils.json_to_sheet(ws2Data);
    xlsx.utils.book_append_sheet(wb, ws2, 'ASSIGNMENT_LIST');

    const ws3Data = submissions.map(sub => {
      const student = students.find(s => s.Student_ID === sub.Student_ID) || {};
      const assignment = assignments.find(a => a.Assignment_ID === sub.Assignment_ID) || {};
      return {
        Timestamp: sub.Timestamp,
        Student_ID: sub.Student_ID,
        'Full Name': student.FullName || sub.FullName || '',
        Class: student.Class || '',
        Assignment_ID: sub.Assignment_ID,
        Assignment_Name: assignment.Assignment_Name || '',
        File_Link: sub.File_Link,
        Score: sub.Score !== undefined ? sub.Score : '',
        Status: sub.Status || 'Submitted'
      };
    });
    const ws3 = xlsx.utils.json_to_sheet(ws3Data);
    xlsx.utils.book_append_sheet(wb, ws3, 'SUBMISSIONS_MASTER');

    assignments.forEach(assign => {
      const assignSubmissions = submissions.filter(s => s.Assignment_ID === assign.Assignment_ID);
      const cleanName = assign.Assignment_Name.split(' ')[0] || assign.Assignment_ID;
      const sheetName = `${assign.Assignment_ID}_${cleanName}`.substring(0, 30);
      
      const wsAssignData = assignSubmissions.map(sub => {
        const student = students.find(s => s.Student_ID === sub.Student_ID) || {};
        return {
          Timestamp: sub.Timestamp,
          Student_ID: sub.Student_ID,
          'Full Name': student.FullName || sub.FullName || '',
          Assignment_ID: sub.Assignment_ID,
          File_Link: sub.File_Link,
          Score: sub.Score !== undefined ? sub.Score : '',
          Status: sub.Status || 'Submitted'
        };
      });

      students.forEach(student => {
        const hasSubmitted = assignSubmissions.some(s => s.Student_ID === student.Student_ID);
        if (!hasSubmitted) {
          wsAssignData.push({
            Timestamp: '',
            Student_ID: student.Student_ID,
            'Full Name': student.FullName,
            Assignment_ID: assign.Assignment_ID,
            File_Link: '',
            Score: '',
            Status: 'Not Submitted'
          });
        }
      });

      wsAssignData.sort((a, b) => a.Student_ID.localeCompare(b.Student_ID));

      const wsAssign = xlsx.utils.json_to_sheet(wsAssignData);
      xlsx.utils.book_append_sheet(wb, wsAssign, sheetName);
    });

    xlsx.writeFile(wb, EXPORT_PATH);
    console.log(`Successfully exported submissions to ${EXPORT_PATH}`);
    return EXPORT_PATH;
  } catch (err) {
    console.error('Error exporting submissions to Excel:', err);
    return null;
  }
}

module.exports = {
  importStudents,
  exportSubmissions
};
