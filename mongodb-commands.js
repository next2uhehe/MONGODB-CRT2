// Run in mongosh. Select the same database name as DB_NAME in .env.
use('StudentPerformance');

// 1. The project uses two collections: students and courses.
if (!db.getCollectionNames().includes('students')) db.createCollection('students');
if (!db.getCollectionNames().includes('courses')) db.createCollection('courses');

// 2. Indexes: unique IDs prevent duplicate students/courses; compound indexes
// support branch + semester filtering; the marks index supports course lookups.
db.students.createIndex({ studentId: 1 }, { unique: true });
db.students.createIndex({ email: 1 }, { unique: true });
db.students.createIndex({ department: 1, semester: 1 });
db.students.createIndex({ 'marks.courseCode': 1 });
db.courses.createIndex({ courseCode: 1 }, { unique: true });
db.courses.createIndex({ department: 1, semester: 1 });

// 3. Seed an illustrative AI & Data Science curriculum for semesters 3 and 5.
// Semester 3 codes begin AD3 (AD301, AD302...); semester 5 begins AD5 (AD501...).
if (db.courses.countDocuments() === 0) {
  db.courses.insertMany([
    { courseCode: 'AD301', courseName: 'Data Structures & Algorithms', department: 'AI & Data Science', branchCode: 'AD', semester: 3, credits: 4 },
    { courseCode: 'AD302', courseName: 'Object-Oriented Programming', department: 'AI & Data Science', branchCode: 'AD', semester: 3, credits: 4 },
    { courseCode: 'AD303', courseName: 'Discrete Mathematics', department: 'AI & Data Science', branchCode: 'AD', semester: 3, credits: 3 },
    { courseCode: 'AD304', courseName: 'Digital Logic Design', department: 'AI & Data Science', branchCode: 'AD', semester: 3, credits: 3 },
    { courseCode: 'AD501', courseName: 'Machine Learning', department: 'AI & Data Science', branchCode: 'AD', semester: 5, credits: 4 },
    { courseCode: 'AD502', courseName: 'Database Management Systems', department: 'AI & Data Science', branchCode: 'AD', semester: 5, credits: 4 },
    { courseCode: 'AD503', courseName: 'Software Engineering', department: 'AI & Data Science', branchCode: 'AD', semester: 5, credits: 3 },
    { courseCode: 'AD504', courseName: 'Edge Computing', department: 'AI & Data Science', branchCode: 'AD', semester: 5, credits: 3 },
    { courseCode: 'AD505', courseName: 'Data Visualization', department: 'AI & Data Science', branchCode: 'AD', semester: 5, credits: 3 }
  ]);
}

// 4. Insert example students only if the students collection is empty.
// IDs are unique sample values; the running web application generates IDs itself.
if (db.students.countDocuments() === 0) {
  db.students.insertMany([
    { studentId: 'AD3-26-DEMO01', name: 'Sara Khan', email: 'demo-ad3-1@example.com', department: 'AI & Data Science', branchCode: 'AD', semester: 3, marks: [{ courseCode: 'AD301', marks: 91 }, { courseCode: 'AD302', marks: 85 }, { courseCode: 'AD303', marks: 88 }, { courseCode: 'AD304', marks: 92 }] },
    { studentId: 'AD3-26-DEMO02', name: 'Dev Patel', email: 'demo-ad3-2@example.com', department: 'AI & Data Science', branchCode: 'AD', semester: 3, marks: [{ courseCode: 'AD301', marks: 82 }, { courseCode: 'AD302', marks: 79 }, { courseCode: 'AD303', marks: 87 }, { courseCode: 'AD304', marks: 90 }] },
    { studentId: 'AD5-26-DEMO01', name: 'Aarav Sharma', email: 'demo-ad5-1@example.com', department: 'AI & Data Science', branchCode: 'AD', semester: 5, marks: [{ courseCode: 'AD501', marks: 86 }, { courseCode: 'AD502', marks: 91 }, { courseCode: 'AD503', marks: 78 }, { courseCode: 'AD504', marks: 88 }, { courseCode: 'AD505', marks: 84 }] },
    { studentId: 'AD5-26-DEMO02', name: 'Diya Singh', email: 'demo-ad5-2@example.com', department: 'AI & Data Science', branchCode: 'AD', semester: 5, marks: [{ courseCode: 'AD501', marks: 94 }, { courseCode: 'AD502', marks: 89 }, { courseCode: 'AD503', marks: 92 }, { courseCode: 'AD504', marks: 85 }, { courseCode: 'AD505', marks: 90 }] }
  ]);
}

// 5. Update a student's mark. Match email first, then use the unique registration number.
const exampleStudent = db.students.findOne({ email: 'demo-ad5-1@example.com' });
if (exampleStudent) {
  db.students.updateOne(
    { studentId: exampleStudent.studentId, 'marks.courseCode': 'AD501' },
    { $set: { 'marks.$.marks': 92, updatedAt: new Date() } }
  );
}

// 6. Aggregation: course student counts and average/highest/lowest marks.
// Only count a mark when the course matches the student's own branch and semester.
db.students.aggregate([
  { $unwind: '$marks' },
  { $lookup: { from: 'courses', localField: 'marks.courseCode', foreignField: 'courseCode', as: 'course' } },
  { $unwind: '$course' },
  { $match: { $expr: { $and: [
    { $eq: ['$department', '$course.department'] },
    { $eq: ['$semester', '$course.semester'] }
  ] } } },
  { $group: {
    _id: '$course.courseCode',
    studentIds: { $addToSet: '$studentId' },
    averageMarks: { $avg: '$marks.marks' },
    highestMarks: { $max: '$marks.marks' },
    lowestMarks: { $min: '$marks.marks' },
    courseName: { $first: '$course.courseName' },
    department: { $first: '$course.department' },
    semester: { $first: '$course.semester' }
  } },
  { $project: {
    _id: 0,
    courseCode: '$_id',
    courseName: 1,
    department: 1,
    semester: 1,
    totalStudents: { $size: '$studentIds' },
    averageMarks: { $round: ['$averageMarks', 2] },
    highestMarks: 1,
    lowestMarks: 1
  } },
  { $sort: { semester: 1, department: 1, courseCode: 1 } }
]).toArray();

// 7. Verification / practical demonstration.
db.students.find({}, { _id: 0, name: 1, studentId: 1, department: 1, semester: 1, marks: 1 }).limit(10);
db.courses.find({}, { _id: 0, courseCode: 1, courseName: 1, department: 1, semester: 1 }).sort({ department: 1, semester: 1, courseCode: 1 }).limit(30);
db.courses.getIndexes();
