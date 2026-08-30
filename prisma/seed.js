import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Clear existing data
  await prisma.activityLog.deleteMany({});
  await prisma.feedback.deleteMany({});
  await prisma.fAQ.deleteMany({});
  await prisma.gallery.deleteMany({});
  await prisma.announcement.deleteMany({});
  await prisma.score.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.registration.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.staff.deleteMany({});
  await prisma.student.deleteMany({});

  // 2. Passwords hashing
  const studentPassword = await bcrypt.hash('student123', 10);
  const staffPassword = await bcrypt.hash('staff123', 10);

  // 3. Create Students
  const students = [];
  const studentNames = [
    { name: 'Aarav Patel', roll: 'SOE2024001', dept: 'Computer Engineering', sem: 5, phone: '9876543210', email: 'student1@rku.ac.in' },
    { name: 'Diya Sharma', roll: 'SOE2024002', dept: 'Information Technology', sem: 3, phone: '9876543211', email: 'student2@rku.ac.in' },
    { name: 'Rohan Desai', roll: 'SOE2024003', dept: 'Mechanical Engineering', sem: 5, phone: '9876543212', email: 'student3@rku.ac.in' },
    { name: 'Priya Verma', roll: 'SOE2024004', dept: 'Computer Engineering', sem: 7, phone: '9876543213', email: 'student4@rku.ac.in' },
    { name: 'Karan Shah', roll: 'SOE2024005', dept: 'Electronics & Communication', sem: 5, phone: '9876543214', email: 'student5@rku.ac.in' },
    { name: 'Jaimil Trivedi', roll: 'SOE2024006', dept: 'Computer Science', sem: 6, phone: '9876543215', email: '22cs001@rku.ac.in' },
  ];

  for (const s of studentNames) {
    students.push(await prisma.student.create({
      data: {
        email: s.email,
        password: studentPassword,
        name: s.name,
        rollNo: s.roll,
        department: s.dept,
        semester: s.sem,
        phone: s.phone,
      },
    }));
  }
  console.log(`${students.length} students seeded.`);

  // 4. Create Staff
  const admin = await prisma.staff.create({
    data: { email: 'admin@rku.ac.in', password: staffPassword, name: 'Dr. Rajesh Mehta', role: 'ADMIN', phone: '9988776655' },
  });

  const facultyList = [
    { email: 'faculty@rku.ac.in', name: 'Prof. Sneha Vyas', phone: '9988776654', role: 'FACULTY' },
    { email: 'priya.sharma@rku.ac.in', name: 'Dr. Priya Sharma', phone: '9988776652', role: 'FACULTY' },
    { email: 'rajesh.verma@rku.ac.in', name: 'Prof. Rajesh Verma', phone: '9988776651', role: 'FACULTY' },
  ];
  const facultyMembers = [];
  for (const f of facultyList) {
    facultyMembers.push(await prisma.staff.create({ data: f }));
  }

  const volunteer = await prisma.staff.create({
    data: { email: 'volunteer@rku.ac.in', password: staffPassword, name: 'Milan Gadhvi', role: 'VOLUNTEER', phone: '9988776653' },
  });
  console.log(`${facultyMembers.length + 2} staff seeded.`);

  // 5. Create Categories
  const cats = [
    { name: 'Technical', desc: 'Coding, Web Dev, Robotics, and technical hackathons.' },
    { name: 'Non-Technical', desc: 'Quizzes, Poster making, and debates.' },
    { name: 'Gaming', desc: 'E-Sports, LAN gaming, and simulator competitions.' },
    { name: 'Sports', desc: 'Cricket, football, volleyball and athletics.' },
    { name: 'Cultural', desc: 'Dance, music, drama and art exhibitions.' },
    { name: 'Academic', desc: 'Research symposiums, workshops and bootcamps.' },
    { name: 'Arts', desc: 'Painting, sculpture, photography and design competitions.' },
  ];
  const categories = {};
  for (const c of cats) {
    const created = await prisma.category.create({ data: { name: c.name, description: c.desc } });
    categories[c.name] = created;
  }
  console.log('Categories seeded.');

  // 6. Create Events (mix of upcoming, ongoing, and completed)
  const today = new Date();
  const addDays = (d) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + d);
    return dt;
  };

  const eventData = [
    {
      title: 'Annual Innovation Summit 2026',
      description: 'Join global tech leaders for a day of groundbreaking keynotes, hands-on workshops, and networking sessions.',
      cat: 'Technical',
      days: 5,
      time: '09:00 AM - 06:00 PM',
      venue: 'Main Auditorium, Block A',
      max: 200,
      fee: 150,
      deadline: 3,
      facultyIdx: 1,
    },
    {
      title: 'Varsity Sports Championship',
      description: 'Annual inter-department sports championship featuring cricket, football, volleyball and badminton.',
      cat: 'Sports',
      days: 2,
      time: '08:00 AM - 05:00 PM',
      venue: 'Sports Complex, Ground 1',
      max: 300,
      fee: 50,
      deadline: 1,
      facultyIdx: 2,
    },
    {
      title: 'TechnoFest Hackathon 2026',
      description: '24-hour coding challenge where teams build solutions for real-world problems.',
      cat: 'Technical',
      days: 10,
      time: '10:00 AM (Day 1) - 10:00 AM (Day 2)',
      venue: 'CS Lab, Block C',
      max: 80,
      fee: 200,
      deadline: 7,
      facultyIdx: 1,
    },
    {
      title: 'Spring Cultural Gala',
      description: 'Celebrate creativity and culture with dance, music, drama, and art exhibitions.',
      cat: 'Cultural',
      days: -15,
      time: '05:00 PM - 10:00 PM',
      venue: 'Open Air Theatre',
      max: 500,
      fee: 0,
      deadline: -17,
      facultyIdx: 0,
      completed: true,
      rankings: true,
    },
    {
      title: 'Graduate Research Symposium',
      description: 'Present your research paper and receive feedback from expert faculty.',
      cat: 'Academic',
      days: 1,
      time: '10:00 AM - 04:00 PM',
      venue: 'Seminar Hall, Block B',
      max: 60,
      fee: 100,
      deadline: -1,
      facultyIdx: 1,
    },
    {
      title: 'Fine Arts Exhibition 2026',
      description: 'Showcase your artistic talents through painting, sculpture, photography, and digital art.',
      cat: 'Arts',
      days: -30,
      time: '10:00 AM - 06:00 PM',
      venue: 'Gallery Hall, Block D',
      max: 100,
      fee: 75,
      deadline: -32,
      facultyIdx: 0,
      completed: true,
      rankings: true,
    },
    {
      title: 'Entrepreneurship Bootcamp',
      description: 'A 2-day intensive bootcamp on startup building, pitching ideas, and getting funded.',
      cat: 'Academic',
      days: 20,
      time: '09:00 AM - 05:00 PM',
      venue: 'Incubation Center',
      max: 40,
      fee: 250,
      deadline: 15,
      facultyIdx: 2,
    },
    {
      title: 'National Coding League 2026',
      description: 'Compete with the best coders in the country in a 12-hour intense algorithm designing contest.',
      cat: 'Technical',
      days: 12,
      time: '08:00 AM - 08:00 PM',
      venue: 'Computer Center, Block A',
      max: 150,
      fee: 100,
      deadline: 8,
      facultyIdx: 1,
    },
    {
      title: 'Valorant E-Sports Tournament',
      description: '5v5 competitive Valorant tournament with exciting prizes for the top 3 teams.',
      cat: 'Gaming',
      days: 7,
      time: '02:00 PM - 10:00 PM',
      venue: 'Gaming Lab, Block C',
      max: 60,
      fee: 100,
      deadline: 4,
      facultyIdx: 0,
    },
    {
      title: 'Cyber Security Quiz',
      description: 'Test your knowledge on cybersecurity, networking, and IT history.',
      cat: 'Non-Technical',
      days: -5,
      time: '11:00 AM - 01:00 PM',
      venue: 'Seminar Hall 2',
      max: 100,
      fee: 50,
      deadline: -8,
      facultyIdx: 1,
      completed: true,
      rankings: true,
    },
  ];

  const events = [];
  for (const ev of eventData) {
    const catId = categories[ev.cat].id;
    const facId = facultyMembers[ev.facultyIdx] ? facultyMembers[ev.facultyIdx].id : facultyMembers[0].id;
    const created = await prisma.event.create({
      data: {
        title: ev.title,
        description: ev.description,
        categoryId: catId,
        coordinatorId: facId,
        date: addDays(ev.days),
        time: ev.time,
        venue: ev.venue,
        maxParticipants: ev.max,
        registrationFee: ev.fee,
        registrationDeadline: addDays(ev.deadline),
        isCompleted: ev.completed || false,
        scoresEntered: ev.rankings || ev.completed || false,
        rankingsDeclared: ev.rankings || false,
        volunteers: volunteer ? { connect: [{ id: volunteer.id }] } : undefined,
      },
    });
    events.push(created);
  }
  console.log(`${events.length} events seeded.`);

  // 7. Create Registrations and Scores
  const qr = (stuId, evId) => `PASS-${stuId.substring(0, 6)}-${evId.substring(0, 6)}-${Date.now()}${Math.floor(Math.random() * 1000)}`;

  // Student 1 registered for event 0, 1, 4
  const regsToCreate = [
    { stuIdx: 0, evIdx: 0, status: 'REGISTERED', pay: true, payStatus: 'SUCCESS' },
    { stuIdx: 0, evIdx: 1, status: 'REGISTERED', pay: true, payStatus: 'SUCCESS' },
    { stuIdx: 0, evIdx: 4, status: 'PENDING', pay: true, payStatus: 'PENDING' },
    { stuIdx: 0, evIdx: 3, status: 'REGISTERED', pay: false, payStatus: null, score: true, points: 88.5, rank: 2 },
    { stuIdx: 0, evIdx: 5, status: 'REGISTERED', pay: true, payStatus: 'SUCCESS', score: true, points: 76.0, rank: 4 },
    { stuIdx: 1, evIdx: 0, status: 'REGISTERED', pay: true, payStatus: 'SUCCESS' },
    { stuIdx: 1, evIdx: 3, status: 'REGISTERED', pay: false, payStatus: null, score: true, points: 95.0, rank: 1 },
    { stuIdx: 3, evIdx: 3, status: 'REGISTERED', pay: false, payStatus: null, score: true, points: 89.0, rank: 2 },
    { stuIdx: 2, evIdx: 1, status: 'REGISTERED', pay: true, payStatus: 'FAILED' },
    { stuIdx: 4, evIdx: 2, status: 'REGISTERED', pay: true, payStatus: 'SUCCESS' },
    { stuIdx: 5, evIdx: 9, status: 'REGISTERED', pay: true, payStatus: 'SUCCESS' },
  ];

  for (const r of regsToCreate) {
    const stuId = students[r.stuIdx].id;
    const evId = events[r.evIdx].id;
    const eventObj = events[r.evIdx];
    const fee = Number(eventObj.registrationFee);
    const registration = await prisma.registration.create({
      data: {
        studentId: stuId,
        eventId: evId,
        qrCodePass: qr(stuId, evId),
        status: r.status,
        fullName: students[r.stuIdx].name,
        enrollmentNumber: students[r.stuIdx].rollNo,
        collegeName: 'School of Engineering, RK University',
        department: students[r.stuIdx].department,
        branch: students[r.stuIdx].department,
        semester: `${students[r.stuIdx].semester}`,
        phoneNumber: students[r.stuIdx].phone,
      },
    });
    if (r.pay && fee > 0) {
      await prisma.payment.create({
        data: {
          registrationId: registration.id,
          amount: fee,
          status: r.payStatus,
          transactionId: r.payStatus === 'SUCCESS' ? `TXN${Math.random().toString(36).substring(2, 10).toUpperCase()}` : null,
          paymentDate: r.payStatus === 'SUCCESS' ? addDays(events[r.evIdx].date.getDate() - 3) : null,
          paymentMethod: r.payStatus === 'SUCCESS' ? 'UPI' : null,
        },
      });
    }
    if (r.score) {
      await prisma.score.create({
        data: {
          eventId: evId,
          studentId: stuId,
          points: r.points,
          rank: r.rank,
        },
      });
    }
  }
  console.log('Registrations, Payments & Scores seeded.');

  // 8. Gallery
  await prisma.gallery.createMany({
    data: [
      { imageUrl: '', description: 'Innovation Summit Opening Ceremony', year: 2025 },
      { imageUrl: '', description: 'Cultural Gala Finale Dance Performance', year: 2025 },
      { imageUrl: '', description: 'Championship Trophy Ceremony', year: 2025 },
      { imageUrl: '', description: 'Research Paper Presentations', year: 2024 },
      { imageUrl: '', description: 'Fine Arts Exhibition Gallery', year: 2024 },
      { imageUrl: '', description: 'Winners of 24-hour Hackathon', year: 2024 },
      { imageUrl: '', description: 'Music and Drama Night', year: 2023 },
      { imageUrl: '', description: 'Cricket Finals', year: 2023 },
    ],
  });
  console.log('Gallery seeded.');

  // 9. Announcements
  await prisma.announcement.createMany({
    data: [
      { title: 'TechnoFest Registrations Open', message: 'Registrations for TechnoFest Hackathon 2026 are now open. Register before the deadline!', sentById: admin.id },
      { title: 'Rankings Declared: Cultural Gala', message: 'Results for Spring Cultural Gala have been declared. Check your scores in the app.', sentById: facultyMembers[0].id, eventId: events[3].id },
    ],
  });
  console.log('Announcements seeded.');

  // 10. FAQs
  await prisma.fAQ.createMany({
    data: [
      { question: 'Who can register for Technoplanet events?', answer: 'All active students of RK University can participate by registering with their official RKU email address.' },
      { question: 'How do I check in to my registered events?', answer: 'Each registered event will generate a QR Code Event Pass in your mobile app dashboard. Show this QR code to the coordinator at the venue for check-in.' },
      { question: 'What if I miss the registration deadline?', answer: 'Late registrations are accepted only for free events on a case-by-case basis. Please contact the event coordinator directly.' },
    ],
  });

  console.log('FAQs seeded.');
  console.log('\n✅ Database seeding complete!');
  console.log('\n--- Login Credentials ---');
  console.log('Students: student1@rku.ac.in / student2@rku.ac.in / ... → password: student123');
  console.log('         22cs001@rku.ac.in → password: student123');
  console.log('Faculty:  faculty@rku.ac.in / priya.sharma@rku.ac.in / rajesh.verma@rku.ac.in → password: staff123');
  console.log('Volunteer: volunteer@rku.ac.in → password: staff123');
  console.log('Admin:    admin@rku.ac.in → password: staff123\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
