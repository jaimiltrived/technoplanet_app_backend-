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
  const student1 = await prisma.student.create({
    data: {
      email: 'student1@rku.ac.in',
      password: studentPassword,
      name: 'Aarav Patel',
      rollNo: 'SOE2024001',
      department: 'Computer Engineering',
      semester: 5,
      phone: '9876543210',
    },
  });

  const student2 = await prisma.student.create({
    data: {
      email: 'student2@rku.ac.in',
      password: studentPassword,
      name: 'Diya Sharma',
      rollNo: 'SOE2024002',
      department: 'Information Technology',
      semester: 3,
      phone: '9876543211',
    },
  });

  console.log('Students seeded.');

  // 4. Create Staff (Admin, Faculty, Volunteer)
  const admin = await prisma.staff.create({
    data: {
      email: 'admin@rku.ac.in',
      password: staffPassword,
      name: 'Dr. Rajesh Mehta',
      role: 'ADMIN',
      phone: '9988776655',
    },
  });

  const faculty = await prisma.staff.create({
    data: {
      email: 'faculty@rku.ac.in',
      password: staffPassword,
      name: 'Prof. Sneha Vyas',
      role: 'FACULTY',
      phone: '9988776654',
    },
  });

  const volunteer = await prisma.staff.create({
    data: {
      email: 'volunteer@rku.ac.in',
      password: staffPassword,
      name: 'Milan Gadhvi',
      role: 'VOLUNTEER',
      phone: '9988776653',
    },
  });

  console.log('Staff seeded.');

  // 5. Create Categories
  const techCategory = await prisma.category.create({
    data: {
      name: 'Technical',
      description: 'Coding, Web Dev, Robotics, and technical hackathons.',
    },
  });

  const nonTechCategory = await prisma.category.create({
    data: {
      name: 'Non-Technical',
      description: 'Quizzes, Poster making, and debates.',
    },
  });

  const gamingCategory = await prisma.category.create({
    data: {
      name: 'Gaming',
      description: 'E-Sports, LAN gaming, and simulator competitions.',
    },
  });

  console.log('Categories seeded.');

  // 6. Create Events
  const event1 = await prisma.event.create({
    data: {
      title: 'Code-A-Thon 2026',
      description: 'The ultimate 6-hour coding battle to solve real-world problems.',
      categoryId: techCategory.id,
      coordinatorId: faculty.id,
      date: new Date('2026-09-10T10:00:00Z'),
      time: '10:00 AM - 04:00 PM',
      venue: 'Lab-5, Main Engineering Building',
      maxParticipants: 50,
      registrationFee: 100.0,
      registrationDeadline: new Date('2026-09-05T23:59:59Z'),
      volunteers: {
        connect: [{ id: volunteer.id }],
      },
    },
  });

  const event2 = await prisma.event.create({
    data: {
      title: 'Cyber Quiz',
      description: 'Test your knowledge on cybersecurity, networking, and IT history.',
      categoryId: nonTechCategory.id,
      coordinatorId: faculty.id,
      date: new Date('2026-09-11T11:00:00Z'),
      time: '11:00 AM - 01:00 PM',
      venue: 'Seminar Hall 2',
      maxParticipants: 100,
      registrationFee: 50.0,
      registrationDeadline: new Date('2026-09-06T23:59:59Z'),
    },
  });

  console.log('Events seeded.');

  // 7. Create FAQs
  await prisma.fAQ.createMany({
    data: [
      {
        question: 'Who can register for Technoplanet events?',
        answer: 'All active students of RK University can participate by registering with their official RKU email address.',
      },
      {
        question: 'How do I check in to my registered events?',
        answer: 'Each registered event will generate a QR Code Event Pass in your mobile app dashboard. Show this QR code to the coordinator at the venue for check-in.',
      },
    ],
  });

  console.log('FAQs seeded.');
  console.log('Database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
