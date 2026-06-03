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

function detectBlocks(row, idColIdx, nameColIdx, classColIdx, roomColIdx, statusColIdx) {
  const blocks = [{
    idColIdx,
    nameColIdx,
    classColIdx,
    roomColIdx,
    statusColIdx
  }];

  if (idColIdx === -1 || nameColIdx === -1) return blocks;

  const firstId = String(row[idColIdx] || '').trim();
  if (!firstId || firstId.length < 3) return blocks;

  const rowLength = row.length;
  
  // Try different block widths from 4 to 12
  for (let width = 4; width <= 12; width++) {
    let nextIdIdx = idColIdx + width;
    let nextNameIdx = nameColIdx + width;
    
    if (nextIdIdx < rowLength && nextNameIdx < rowLength) {
      const nextId = String(row[nextIdIdx] || '').trim();
      const nextName = String(row[nextNameIdx] || '').trim();
      
      const isIdLike = nextId && nextId.length >= 3 && nextId.length <= 15 && !isNaN(Number(nextId));
      const isNameLike = nextName && nextName.length > 2 && isNaN(Number(nextName)) && !nextName.includes('/') && !nextName.includes('ห้อง');
      
      if (isIdLike && isNameLike) {
        // Generate blocks based on this width
        for (let idx = idColIdx + width; idx < rowLength; idx += width) {
          const testIdIdx = idx;
          const testNameIdx = nameColIdx + (idx - idColIdx);
          if (testIdIdx < rowLength && testNameIdx < rowLength) {
            blocks.push({
              idColIdx: testIdIdx,
              nameColIdx: testNameIdx,
              classColIdx: classColIdx !== -1 ? classColIdx + (testIdIdx - idColIdx) : -1,
              roomColIdx: roomColIdx !== -1 ? roomColIdx + (testIdIdx - idColIdx) : -1,
              statusColIdx: statusColIdx !== -1 ? statusColIdx + (testIdIdx - idColIdx) : -1
            });
          }
        }
        console.log(`Detected side-by-side block pattern: width = ${width}, total blocks = ${blocks.length}`);
        break;
      }
    }
  }

  return blocks;
}

function importStudents(filePath = STUDENT_LIST_PATH) {
  if (!fs.existsSync(filePath)) {
    console.warn(`Student list file not found at ${filePath}. Using empty/default students list.`);
    return [];
  }

  try {
    const wb = xlsx.readFile(filePath);
    const allStudents = [];

    // Filter sheets: Parse all sheets except ignored metadata/report/utility sheets
    const IGNORED_SHEETS = [
      'assignment_list', 'submissions_master', 'sheetinfo', 'metadata', 'report', 'student_master',
      'ภาพรวม', 'ข้อมูลของผู้เข้าร่วม', 'ข้อมูลเวลา', 'รายละเอียดแบบทดสอบ',
      'ผลสัมฤทธิ์', 'สรุปเกรด', 'สถิติ', 'สรุป', 'ผลสอบ', 'คะแนน', 'ประถมศึกษา', 'ค่าห้อง', 'ค่าใช้จ่าย',
      'จำนวนนักเรียน'
    ];
    const sheetsToParse = wb.SheetNames.filter(sheetName => {
      const lowerName = sheetName.trim().toLowerCase();
      return !IGNORED_SHEETS.some(ignored => lowerName.includes(ignored));
    });

    sheetsToParse.forEach(sheetName => {
      const sheet = wb.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

      let idColIdx = -1;
      let nameColIdx = -1;
      let firstNameColIdx = -1;
      let lastNameColIdx = -1;
      let prefixColIdx = -1;
      let classColIdx = -1;
      let roomColIdx = -1;
      let statusColIdx = -1;
      let headerRowFound = false;
      let blocks = [];

      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.length === 0) continue;

        const rowStr = row.map(c => String(c || '').trim());

        if (!headerRowFound) {
          let tempIdIdx = -1;
          let tempNameIdx = -1;
          let tempFirstNameIdx = -1;
          let tempLastNameIdx = -1;
          let tempPrefixIdx = -1;
          let tempClassIdx = -1;
          let tempRoomIdx = -1;
          let tempStatusIdx = -1;

          rowStr.forEach((val, idx) => {
            if (!val) return;
            const cleanVal = val.toLowerCase().replace(/[\s_-]/g, '');

            // 1. Check Student ID (avoid national ID card)
            if (!cleanVal.includes('ประชาชน') && !cleanVal.includes('บัตร') && (
              cleanVal.includes('เลขประจำตัวนักเรียน') ||
              cleanVal.includes('เลขประจำตัว') ||
              cleanVal.includes('รหัสประจำตัว') ||
              cleanVal.includes('รหัสนักเรียน') ||
              cleanVal.includes('รหัสผู้เรียน') ||
              cleanVal.includes('รหัส') ||
              cleanVal.includes('studentid') ||
              cleanVal.includes('stdid') ||
              cleanVal === 'id' ||
              cleanVal === 'code' ||
              cleanVal === 'no' ||
              cleanVal === 'stdno'
            )) {
              tempIdIdx = idx;
            }

            // 2. Check Name (combined or first name)
            if (
              cleanVal.includes('ชื่อนามสกุล') ||
              cleanVal.includes('ชื่อสกุล') ||
              cleanVal.includes('ชื่อผู้เรียน') ||
              cleanVal.includes('ชื่อนักเรียน') ||
              cleanVal.includes('fullname') ||
              cleanVal === 'name' ||
              cleanVal === 'studentname' ||
              cleanVal === 'ชื่อ-สกุล' ||
              cleanVal === 'ชื่อ-นามสกุล'
            ) {
              tempNameIdx = idx;
            } else if (cleanVal === 'ชื่อ' || cleanVal === 'firstname' || cleanVal === 'first_name') {
              tempFirstNameIdx = idx;
            }

            // 3. Check Last Name
            if (
              cleanVal.includes('นามสกุล') ||
              cleanVal === 'สกุล' ||
              cleanVal === 'lastname' ||
              cleanVal === 'last_name' ||
              cleanVal === 'surname'
            ) {
              tempLastNameIdx = idx;
            }

            // 4. Check Prefix
            if (
              cleanVal.includes('คำนำหน้า') ||
              cleanVal === 'title' ||
              cleanVal === 'prefix'
            ) {
              tempPrefixIdx = idx;
            }

            // 5. Check Class
            if (
              cleanVal.includes('ชั้นเรียน') ||
              cleanVal.includes('ระดับชั้น') ||
              cleanVal === 'ชั้น' ||
              cleanVal === 'class' ||
              cleanVal === 'grade'
            ) {
              tempClassIdx = idx;
            }

            // 6. Check Room
            if (
              cleanVal.includes('ห้องเรียน') ||
              cleanVal === 'ห้อง' ||
              cleanVal === 'room'
            ) {
              tempRoomIdx = idx;
            }

            // 7. Check Status
            if (
              cleanVal.includes('สถานะ') ||
              cleanVal === 'status'
            ) {
              tempStatusIdx = idx;
            }
          });

          // A valid header row must have ID and at least some name column
          const hasId = tempIdIdx !== -1;
          const hasName = tempNameIdx !== -1 || tempFirstNameIdx !== -1;

          if (hasId && hasName) {
            headerRowFound = true;
            idColIdx = tempIdIdx;
            nameColIdx = tempNameIdx !== -1 ? tempNameIdx : tempFirstNameIdx;
            firstNameColIdx = tempFirstNameIdx;
            lastNameColIdx = tempLastNameIdx;
            prefixColIdx = tempPrefixIdx;
            classColIdx = tempClassIdx;
            roomColIdx = tempRoomIdx;
            statusColIdx = tempStatusIdx;
          }
          continue;
        }

        // If we just found the header and haven't initialized blocks list
        if (blocks.length === 0) {
          blocks = detectBlocks(row, idColIdx, nameColIdx, classColIdx, roomColIdx, statusColIdx);
        }

        // Process data row with all detected blocks
        blocks.forEach(block => {
          if (block.idColIdx >= row.length) return;

          let studentId = String(row[block.idColIdx] || '').trim();
          // Remove decimal .0 if it exists (e.g. "4983.0" -> "4983")
          if (studentId.endsWith('.0')) {
            studentId = studentId.substring(0, studentId.length - 2);
          }
          if (!studentId || studentId.length < 3) {
            return;
          }

          // Determine full name
          let fullName = '';
          if (block.nameColIdx !== -1 && block.nameColIdx < row.length) {
            if (block.nameColIdx !== firstNameColIdx + (block.idColIdx - idColIdx)) {
              // Combined name
              fullName = String(row[block.nameColIdx] || '').trim();
            } else {
              // Separate name
              const offset = block.idColIdx - idColIdx;
              const pIdx = prefixColIdx !== -1 ? prefixColIdx + offset : -1;
              const fIdx = firstNameColIdx !== -1 ? firstNameColIdx + offset : -1;
              const lIdx = lastNameColIdx !== -1 ? lastNameColIdx + offset : -1;

              const prefix = pIdx !== -1 && pIdx < row.length ? String(row[pIdx] || '').trim() : '';
              const firstName = fIdx !== -1 && fIdx < row.length ? String(row[fIdx] || '').trim() : '';
              const lastName = lIdx !== -1 && lIdx < row.length ? String(row[lIdx] || '').trim() : '';
              
              if (firstName || lastName) {
                fullName = `${prefix} ${firstName} ${lastName}`.replace(/\s+/g, ' ').trim();
              }
            }
          }

          // Skip rows with invalid name or placeholders
          if (!fullName || fullName === 'ชื่อ' || fullName === 'ชื่อ - นามสกุล' || fullName === 'ชื่อ-นามสกุล') {
            return;
          }

          // Determine class name
          let className = sheetName;
          const classVal = block.classColIdx !== -1 && block.classColIdx < row.length && row[block.classColIdx] 
            ? String(row[block.classColIdx]).trim() 
            : '';
          const roomVal = block.roomColIdx !== -1 && block.roomColIdx < row.length && row[block.roomColIdx] 
            ? String(row[block.roomColIdx]).trim() 
            : '';

          if (classVal && roomVal) {
            if (classVal.includes('/') || classVal.includes('ห้อง')) {
              className = classVal;
            } else {
              let formattedClass = classVal;
              if (!formattedClass.startsWith('ม.') && !formattedClass.startsWith('ป.') && 
                  !formattedClass.startsWith('ม') && !formattedClass.startsWith('ป') &&
                  !formattedClass.startsWith('อ.') && !formattedClass.startsWith('อ')) {
                if (sheetName.startsWith('ม.') || sheetName.startsWith('ป.') || sheetName.startsWith('อ.')) {
                  formattedClass = sheetName.substring(0, 2) + classVal;
                } else if (sheetName.startsWith('ม') || sheetName.startsWith('ป') || sheetName.startsWith('อ')) {
                  formattedClass = sheetName.substring(0, 1) + '.' + classVal;
                }
              }
              className = `${formattedClass}/${roomVal}`;
            }
          } else if (classVal) {
            className = classVal;
          }

          // Remove decimal .0 if class ends with it
          if (className.endsWith('.0')) {
            className = className.substring(0, className.length - 2);
          }

          // Determine status
          let status = 'กำลังศึกษาอยู่';
          if (block.statusColIdx !== -1 && block.statusColIdx < row.length && row[block.statusColIdx]) {
            const statusVal = String(row[block.statusColIdx]).trim();
            // Status should be a text status (not an ID or date)
            if (statusVal && isNaN(Number(statusVal)) && statusVal.length < 20) {
              status = statusVal;
            }
          }

          // Copy photo logic (unchanged)
          let photoLink = '';
          if (fs.existsSync(EXCEL_PHOTOS_DIR)) {
            const extensions = ['.jpg', '.jpeg', '.png'];
            for (let ext of extensions) {
              const localPhotoPath = path.join(EXCEL_PHOTOS_DIR, `${studentId}${ext}`);
              if (fs.existsSync(localPhotoPath)) {
                const serverPhotoName = `${studentId}${ext}`;
                const serverPhotoPath = path.join(SERVER_PHOTOS_DIR, serverPhotoName);
                try {
                  fs.copyFileSync(localPhotoPath, serverPhotoPath);
                  photoLink = `/uploads/photos/${serverPhotoName}`;
                  console.log(`Copied photo for student ${studentId} from Excel photos folder.`);
                } catch (copyErr) {
                  console.error(`Error copying photo for student ${studentId}:`, copyErr);
                }
                break;
              }
            }
          }

          allStudents.push({
            Student_ID: studentId,
            FullName: fullName,
            Class: className,
            Email: `${studentId}@sjmr.ac.th`,
            Status: status,
            Photo: photoLink || ''
          });
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
