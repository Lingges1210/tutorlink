// prisma/seed-presentation.ts
import {
  PrismaClient,
  UserRole,
  SessionStatus,
  ProposalStatus,
  NotificationStatus,
  PointsType,
  RedemptionStatus,
  SOSStatus,
  SOSMode,
  SOSTutorDecision,
  StudyPlanStyle,
  StudyPlanItemType,
  PreferredStudyTime,
  UserReportCategory,
  UserReportPriority,
  UserReportStatus,
  AdminActionType,
  AccountLockStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Demo123!";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
function hoursFrom(base: Date, h: number) {
  return new Date(base.getTime() + h * 60 * 60 * 1000);
}
function minsFrom(base: Date, m: number) {
  return new Date(base.getTime() + m * 60 * 1000);
}

async function main() {
  console.log("🌱 Seeding TutorLink presentation data...");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  /* ---------------------------------------------------
     1) CLEANUP
  --------------------------------------------------- */
  await prisma.surveyResponse.deleteMany();
  await prisma.userReport.deleteMany();
  await prisma.adminAuditLog.deleteMany();

  await prisma.topicConfidence.deleteMany();
  await prisma.studyPlanItem.deleteMany();
  await prisma.studyPlan.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.studyPack.deleteMany();
  await prisma.studyMaterial.deleteMany();
  await prisma.studySubject.deleteMany();

  await prisma.sOSTutorResponse.deleteMany();
  await prisma.sOSRequest.deleteMany();
  await prisma.tutorPresence.deleteMany();
  await prisma.userPresence.deleteMany();

  await prisma.chatTyping.deleteMany();
  await prisma.chatAttachment.deleteMany();
  await prisma.chatRead.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatChannel.deleteMany();

  await prisma.sessionReview.deleteMany();
  await prisma.sessionTopic.deleteMany();
  await prisma.sessionCompletion.deleteMany();
  await prisma.sessionRating.deleteMany();
  await prisma.session.deleteMany();

  await prisma.studentTopicProgress.deleteMany();
  await prisma.studentSubjectProgress.deleteMany();
  await prisma.topic.deleteMany();

  await prisma.rewardRedemption.deleteMany();
  await prisma.reward.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.pointsTransaction.deleteMany();
  await prisma.pointsWallet.deleteMany();

  await prisma.notification.deleteMany();

  await prisma.tutorSubject.deleteMany();
  await prisma.tutorApplication.deleteMany();
  await prisma.userRoleAssignment.deleteMany();

  await prisma.subject.deleteMany();
  await prisma.user.deleteMany();

  /* ---------------------------------------------------
     2) STATIC MASTER DATA
  --------------------------------------------------- */
  const subjects = await Promise.all([
    prisma.subject.create({
      data: {
        code: "CAT404",
        title: "Web Engineering & Technologies",
        aliases: "Web Engineering,Next.js,Prisma",
      },
    }),
    prisma.subject.create({
      data: {
        code: "CMT322",
        title: "Software Process & Quality",
        aliases: "SPQ,Process Quality",
      },
    }),
    prisma.subject.create({
      data: {
        code: "CST435",
        title: "Cloud Computing",
        aliases: "Cloud,AWS,Docker",
      },
    }),
    prisma.subject.create({
      data: {
        code: "WIA2003",
        title: "Data Structures",
        aliases: "DSA,Data Structure",
      },
    }),
    prisma.subject.create({
      data: {
        code: "WIX3001",
        title: "Database Systems",
        aliases: "DB,SQL,ERD",
      },
    }),
    prisma.subject.create({
      data: {
        code: "MAT101",
        title: "Discrete Mathematics",
        aliases: "Discrete Math,Logic",
      },
    }),
  ]);

  const subjectMap = Object.fromEntries(subjects.map((s) => [s.code, s]));

  const badges = await Promise.all([
    prisma.badge.create({
      data: {
        key: "FIRST_SESSION",
        name: "First Session",
        description: "Completed your first tutoring session",
        icon: "sparkles",
      },
    }),
    prisma.badge.create({
      data: {
        key: "HELP_SEEKER",
        name: "Help Seeker",
        description: "Requested SOS help",
        icon: "life-buoy",
      },
    }),
    prisma.badge.create({
      data: {
        key: "TOP_STREAK",
        name: "On Fire",
        description: "Maintained a learning streak",
        icon: "flame",
      },
    }),
    prisma.badge.create({
      data: {
        key: "QUIZ_MASTER",
        name: "Quiz Master",
        description: "Scored highly on a study pack quiz",
        icon: "trophy",
      },
    }),
  ]);

  const badgeMap = Object.fromEntries(badges.map((b) => [b.key, b]));

  const rewards = await Promise.all([
    prisma.reward.create({
      data: {
        key: "BOOST_24H",
        name: "XP Boost 24H",
        description: "Earn bonus progress for 24 hours",
        pointsCost: 120,
        stock: 50,
        durationHrs: 24,
      },
    }),
    prisma.reward.create({
      data: {
        key: "DOUBLE_24H",
        name: "Double Points 24H",
        description: "Double reward points for one day",
        pointsCost: 220,
        stock: 30,
        durationHrs: 24,
      },
    }),
    prisma.reward.create({
      data: {
        key: "STREAK_SHIELD",
        name: "Streak Shield",
        description: "Protect your streak for one missed day",
        pointsCost: 80,
        stock: 100,
      },
    }),
  ]);

  const rewardMap = Object.fromEntries(rewards.map((r) => [r.key, r]));

  /* ---------------------------------------------------
     3) USERS
  --------------------------------------------------- */
  const admin = await prisma.user.create({
    data: {
      email: "admin@student.usm.my",
      name: "Admin Aishah",
      programme: "Administration",
      passwordHash,
      role: UserRole.ADMIN,
      verificationStatus: "VERIFIED",
      accountLockStatus: AccountLockStatus.ACTIVE,
      roleAssignments: {
        create: [{ role: UserRole.ADMIN }],
      },
    },
  });

  const student1 = await prisma.user.create({
    data: {
      email: "student1@student.usm.my",
      name: "Aiman Student",
      programme: "Computer Science",
      matricNo: "S10001",
      passwordHash,
      role: UserRole.STUDENT,
      verificationStatus: "VERIFIED",
      accountLockStatus: AccountLockStatus.ACTIVE,
      avgRating: 0,
      ratingCount: 0,
      roleAssignments: { create: [{ role: UserRole.STUDENT }] },
    },
  });

  const student2 = await prisma.user.create({
    data: {
      email: "student2@student.usm.my",
      name: "Bella Student",
      programme: "Software Engineering",
      matricNo: "S10002",
      passwordHash,
      role: UserRole.STUDENT,
      verificationStatus: "VERIFIED",
      accountLockStatus: AccountLockStatus.ACTIVE,
      roleAssignments: { create: [{ role: UserRole.STUDENT }] },
    },
  });

  const student3 = await prisma.user.create({
    data: {
      email: "student3@student.usm.my",
      name: "Chandra Student",
      programme: "Information Systems",
      matricNo: "S10003",
      passwordHash,
      role: UserRole.STUDENT,
      verificationStatus: "PENDING_REVIEW",
      accountLockStatus: AccountLockStatus.LOCKED,
      lockedAt: daysAgo(1),
      lockReason: "Demo locked account for admin review flow",
      lockedByAdminId: admin.id,
      roleAssignments: { create: [{ role: UserRole.STUDENT }] },
    },
  });

  const tutor1 = await prisma.user.create({
    data: {
      email: "tutor1@student.usm.my",
      name: "Daniel Tutor",
      programme: "Computer Science",
      matricNo: "T20001",
      passwordHash,
      role: UserRole.TUTOR,
      isTutorApproved: true,
      verificationStatus: "VERIFIED",
      accountLockStatus: AccountLockStatus.ACTIVE,
      avgRating: 4.8,
      ratingCount: 12,
      roleAssignments: { create: [{ role: UserRole.TUTOR }] },
    },
  });

  const tutor2 = await prisma.user.create({
    data: {
      email: "tutor2@student.usm.my",
      name: "Esha Tutor",
      programme: "Software Engineering",
      matricNo: "T20002",
      passwordHash,
      role: UserRole.TUTOR,
      isTutorApproved: true,
      verificationStatus: "VERIFIED",
      accountLockStatus: AccountLockStatus.ACTIVE,
      avgRating: 4.6,
      ratingCount: 8,
      roleAssignments: { create: [{ role: UserRole.TUTOR }] },
    },
  });

  const tutor3 = await prisma.user.create({
    data: {
      email: "tutor3@student.usm.my",
      name: "Faris Tutor",
      programme: "Cloud Engineering",
      matricNo: "T20003",
      passwordHash,
      role: UserRole.TUTOR,
      isTutorApproved: false,
      verificationStatus: "PENDING_REVIEW",
      accountLockStatus: AccountLockStatus.ACTIVE,
      roleAssignments: { create: [{ role: UserRole.TUTOR }] },
    },
  });

  const allUsers = [admin, student1, student2, student3, tutor1, tutor2, tutor3];

  /* ---------------------------------------------------
     4) TUTOR APPLICATIONS / TUTOR SUBJECTS / PRESENCE
  --------------------------------------------------- */
  await prisma.tutorApplication.createMany({
    data: [
      {
        userId: tutor1.id,
        subjects: "CAT404,WIX3001",
        cgpa: 3.81,
        availability: "Weeknights and Saturday",
        status: "APPROVED",
        createdAt: daysAgo(15),
        reviewedAt: daysAgo(14),
      },
      {
        userId: tutor2.id,
        subjects: "CST435,WIA2003",
        cgpa: 3.67,
        availability: "Afternoons and Sunday",
        status: "APPROVED",
        createdAt: daysAgo(12),
        reviewedAt: daysAgo(11),
      },
      {
        userId: tutor3.id,
        subjects: "CAT404,CMT322",
        cgpa: 3.45,
        availability: "Flexible",
        status: "PENDING",
        createdAt: daysAgo(2),
      },
    ],
  });

  await prisma.tutorSubject.createMany({
    data: [
      { tutorId: tutor1.id, subjectId: subjectMap.CAT404.id },
      { tutorId: tutor1.id, subjectId: subjectMap.WIX3001.id },
      { tutorId: tutor2.id, subjectId: subjectMap.CST435.id },
      { tutorId: tutor2.id, subjectId: subjectMap.WIA2003.id },
    ],
  });

  await prisma.tutorPresence.createMany({
    data: [
      { tutorId: tutor1.id, isOnline: true, lastSeenAt: new Date() },
      { tutorId: tutor2.id, isOnline: true, lastSeenAt: new Date() },
      { tutorId: tutor3.id, isOnline: false, lastSeenAt: daysAgo(1) },
    ],
  });

  await prisma.userPresence.createMany({
    data: allUsers.map((u) => ({
      userId: u.id,
      isOnline: true,
      lastSeenAt: new Date(),
    })),
  });

  /* ---------------------------------------------------
     5) TOPICS / PROGRESS
  --------------------------------------------------- */
  const topicReact = await prisma.topic.create({
    data: { subjectId: subjectMap.CAT404.id, name: "React State Management" },
  });
  const topicPrisma = await prisma.topic.create({
    data: { subjectId: subjectMap.CAT404.id, name: "Prisma Relations" },
  });
  const topicSQL = await prisma.topic.create({
    data: { subjectId: subjectMap.WIX3001.id, name: "SQL Joins" },
  });
  const topicDocker = await prisma.topic.create({
    data: { subjectId: subjectMap.CST435.id, name: "Docker Basics" },
  });

  await prisma.studentSubjectProgress.createMany({
    data: [
      {
        studentId: student1.id,
        subjectId: subjectMap.CAT404.id,
        totalSessions: 3,
        totalMinutes: 180,
        lastSessionAt: daysAgo(1),
        avgConfGain: 2.2,
      },
      {
        studentId: student1.id,
        subjectId: subjectMap.WIX3001.id,
        totalSessions: 2,
        totalMinutes: 120,
        lastSessionAt: daysAgo(4),
        avgConfGain: 1.8,
      },
      {
        studentId: student2.id,
        subjectId: subjectMap.CST435.id,
        totalSessions: 1,
        totalMinutes: 60,
        lastSessionAt: daysAgo(2),
        avgConfGain: 2.5,
      },
    ],
  });

  await prisma.studentTopicProgress.createMany({
    data: [
      { studentId: student1.id, subjectId: subjectMap.CAT404.id, topicId: topicReact.id, timesCovered: 2, lastCoveredAt: daysAgo(1) },
      { studentId: student1.id, subjectId: subjectMap.CAT404.id, topicId: topicPrisma.id, timesCovered: 1, lastCoveredAt: daysAgo(3) },
      { studentId: student1.id, subjectId: subjectMap.WIX3001.id, topicId: topicSQL.id, timesCovered: 2, lastCoveredAt: daysAgo(4) },
      { studentId: student2.id, subjectId: subjectMap.CST435.id, topicId: topicDocker.id, timesCovered: 1, lastCoveredAt: daysAgo(2) },
    ],
  });

  /* ---------------------------------------------------
     6) SESSIONS + CHAT
  --------------------------------------------------- */
  const pastBase = daysAgo(3);
  pastBase.setHours(20, 0, 0, 0);

  const upcomingBase = daysFromNow(1);
  upcomingBase.setHours(21, 0, 0, 0);

  const session1 = await prisma.session.create({
    data: {
      studentId: student1.id,
      tutorId: tutor1.id,
      subjectId: subjectMap.CAT404.id,
      scheduledAt: pastBase,
      endsAt: minsFrom(pastBase, 60),
      durationMin: 60,
      status: SessionStatus.COMPLETED,
      createdAt: daysAgo(5),
      completedAt: minsFrom(pastBase, 60),
      dailyRoomName: "demo-room-1",
      dailyRoomUrl: "https://demo.daily.co/room1",
    },
  });

  const session2 = await prisma.session.create({
    data: {
      studentId: student1.id,
      tutorId: tutor1.id,
      subjectId: subjectMap.WIX3001.id,
      scheduledAt: daysFromNow(2),
      endsAt: minsFrom(daysFromNow(2), 90),
      durationMin: 90,
      status: SessionStatus.ACCEPTED,
      createdAt: daysAgo(1),
      dailyRoomName: "demo-room-2",
      dailyRoomUrl: "https://demo.daily.co/room2",
    },
  });

  const session3 = await prisma.session.create({
    data: {
      studentId: student2.id,
      tutorId: tutor2.id,
      subjectId: subjectMap.CST435.id,
      scheduledAt: upcomingBase,
      endsAt: minsFrom(upcomingBase, 60),
      durationMin: 60,
      status: SessionStatus.PENDING,
      proposedAt: daysAgo(1),
      proposedEndAt: minsFrom(upcomingBase, 60),
      proposedNote: "Can we move this to 9 PM?",
      proposalStatus: ProposalStatus.PENDING,
      proposedByUserId: tutor2.id,
      createdAt: daysAgo(2),
    },
  });

  const session4 = await prisma.session.create({
    data: {
      studentId: student3.id,
      tutorId: tutor2.id,
      subjectId: subjectMap.WIA2003.id,
      scheduledAt: daysAgo(7),
      endsAt: minsFrom(daysAgo(7), 60),
      durationMin: 60,
      status: SessionStatus.CANCELLED,
      cancelledAt: daysAgo(6),
      cancelReason: "Student unavailable",
      createdAt: daysAgo(8),
    },
  });

  const chat1 = await prisma.chatChannel.create({
    data: {
      sessionId: session1.id,
      studentId: student1.id,
      tutorId: tutor1.id,
      lastMessageAt: minsFrom(pastBase, 30),
      closeAt: daysFromNow(10),
    },
  });

  const chat2 = await prisma.chatChannel.create({
    data: {
      sessionId: session2.id,
      studentId: student1.id,
      tutorId: tutor1.id,
      lastMessageAt: new Date(),
      closeAt: daysFromNow(10),
    },
  });

  await prisma.chatMessage.createMany({
    data: [
      {
        channelId: chat1.id,
        senderId: student1.id,
        text: "Hi tutor, I’m confused about Prisma one-to-many relations.",
        createdAt: minsFrom(pastBase, 5),
      },
      {
        channelId: chat1.id,
        senderId: tutor1.id,
        text: "No worries, let’s walk through it with your schema.",
        createdAt: minsFrom(pastBase, 7),
      },
      {
        channelId: chat2.id,
        senderId: tutor1.id,
        text: "For tomorrow, please prepare your SQL JOIN questions.",
        createdAt: daysAgo(0),
      },
    ],
  });

  await prisma.chatRead.createMany({
    data: [
      { channelId: chat1.id, userId: student1.id, lastReadAt: minsFrom(pastBase, 40) },
      { channelId: chat1.id, userId: tutor1.id, lastReadAt: minsFrom(pastBase, 40) },
      { channelId: chat2.id, userId: tutor1.id, lastReadAt: new Date() },
      { channelId: chat2.id, userId: student1.id, lastReadAt: daysAgo(0) },
    ],
  });

  /* ---------------------------------------------------
     7) SESSION COMPLETION / RATINGS / REVIEW / SURVEY
  --------------------------------------------------- */
  const completion1 = await prisma.sessionCompletion.create({
    data: {
      sessionId: session1.id,
      summary: "Covered React state updates and Prisma one-to-many relationship modelling.",
      confidenceBefore: 4,
      confidenceAfter: 7,
      nextSteps: "Review schema relations and practice CRUD routes.",
    },
  });

  await prisma.sessionTopic.createMany({
    data: [
      { completionId: completion1.id, topicId: topicReact.id },
      { completionId: completion1.id, topicId: topicPrisma.id },
    ],
  });

  await prisma.sessionRating.create({
    data: {
      sessionId: session1.id,
      studentId: student1.id,
      tutorId: tutor1.id,
      rating: 5,
      comment: "Very clear explanation and patient teaching style.",
      confirmed: true,
    },
  });

  await prisma.sessionReview.create({
    data: {
      sessionId: session1.id,
      studentId: student1.id,
      tutorId: tutor1.id,
      rating: 5,
      feedback: "Session was helpful and easy to follow.",
      confirmed: true,
    },
  });

  await prisma.surveyResponse.create({
    data: {
      userId: student1.id,
      sessionId: session1.id,
      rating: 5,
      easierToFindTutor: true,
      improvedUnderstanding: true,
      wouldRecommend: true,
      comment: "TutorLink made revision much easier.",
    },
  });

  /* ---------------------------------------------------
     8) POINTS / BADGES / REWARDS
  --------------------------------------------------- */
  await prisma.pointsWallet.createMany({
    data: [
      { userId: student1.id, total: 420 },
      { userId: student2.id, total: 180 },
      { userId: tutor1.id, total: 550 },
      { userId: tutor2.id, total: 330 },
    ],
  });

  await prisma.pointsTransaction.createMany({
    data: [
      { userId: student1.id, type: PointsType.EARN, amount: 120, description: "Completed session", sessionId: session1.id, createdAt: daysAgo(3) },
      { userId: student1.id, type: PointsType.BONUS, amount: 50, description: "First session badge bonus", createdAt: daysAgo(3) },
      { userId: student2.id, type: PointsType.EARN, amount: 80, description: "Study activity bonus", createdAt: daysAgo(2) },
      { userId: tutor1.id, type: PointsType.EARN, amount: 150, description: "Completed tutoring session", sessionId: session1.id, createdAt: daysAgo(3) },
      { userId: tutor2.id, type: PointsType.EARN, amount: 100, description: "Accepted tutoring session", sessionId: session3.id, createdAt: daysAgo(1) },
    ],
  });

  await prisma.userBadge.createMany({
    data: [
      { userId: student1.id, badgeId: badgeMap.FIRST_SESSION.id, awardedAt: daysAgo(3) },
      { userId: student1.id, badgeId: badgeMap.TOP_STREAK.id, awardedAt: daysAgo(1) },
      { userId: student2.id, badgeId: badgeMap.HELP_SEEKER.id, awardedAt: daysAgo(0) },
      { userId: tutor1.id, badgeId: badgeMap.QUIZ_MASTER.id, awardedAt: daysAgo(2) },
    ],
  });

  await prisma.rewardRedemption.create({
    data: {
      userId: student1.id,
      rewardId: rewardMap.BOOST_24H.id,
      status: RedemptionStatus.ACTIVE,
      expiresAt: daysFromNow(1),
    },
  });

  /* ---------------------------------------------------
     9) SOS
  --------------------------------------------------- */
  const sos1 = await prisma.sOSRequest.create({
    data: {
      studentId: student2.id,
      subjectId: subjectMap.CAT404.id,
      description: "Need urgent help understanding Next.js route handlers before tomorrow.",
      mode: SOSMode.CHAT,
      status: SOSStatus.SEARCHING,
      expiresAt: hoursFrom(new Date(), 2),
      createdAt: minsFrom(new Date(), -25),
    },
  });

  const sos2 = await prisma.sOSRequest.create({
    data: {
      studentId: student1.id,
      subjectId: subjectMap.WIX3001.id,
      description: "Need quick clarification on SQL joins and grouping.",
      mode: SOSMode.ONLINE,
      status: SOSStatus.ACCEPTED,
      acceptedTutorId: tutor1.id,
      acceptedAt: minsFrom(new Date(), -40),
      expiresAt: hoursFrom(new Date(), 1),
      createdAt: minsFrom(new Date(), -55),
    },
  });

  await prisma.sOSTutorResponse.createMany({
    data: [
      {
        sosId: sos1.id,
        tutorId: tutor1.id,
        decision: SOSTutorDecision.ACCEPT,
        reason: "Available now",
        createdAt: minsFrom(new Date(), -20),
      },
      {
        sosId: sos2.id,
        tutorId: tutor1.id,
        decision: SOSTutorDecision.ACCEPT,
        reason: "Can help immediately",
        createdAt: minsFrom(new Date(), -40),
      },
    ],
  });

  /* ---------------------------------------------------
     10) NOTIFICATIONS
  --------------------------------------------------- */
  await prisma.notification.createMany({
    data: [
      {
        userId: student1.id,
        type: "SESSION_ACCEPTED",
        title: "Session confirmed",
        body: "Your WIX3001 session with Daniel Tutor has been confirmed.",
        data: { sessionId: session2.id, viewer: "STUDENT" },
        status: NotificationStatus.SENT,
        createdAt: daysAgo(1),
      },
      {
        userId: student1.id,
        type: "NEW_CHAT_MESSAGE",
        title: "New chat message",
        body: "Daniel Tutor sent you a preparation note for tomorrow's session.",
        data: { sessionId: session2.id, viewer: "STUDENT" },
        status: NotificationStatus.DELIVERED,
        createdAt: minsFrom(new Date(), -10),
      },
      {
        userId: student2.id,
        type: "SOS_MATCHING",
        title: "SOS request live",
        body: "Your SOS request is now visible to available tutors.",
        data: { href: "/sos", viewer: "STUDENT" },
        status: NotificationStatus.SENT,
        createdAt: minsFrom(new Date(), -20),
      },
      {
        userId: tutor1.id,
        type: "NEW_SOS_REQUEST",
        title: "New SOS request",
        body: "A student needs urgent help for CAT404.",
        data: { href: "/sos?tab=TUTOR", viewer: "TUTOR" },
        status: NotificationStatus.SENT,
        createdAt: minsFrom(new Date(), -20),
      },
      {
        userId: admin.id,
        type: "PENDING_VERIFICATION",
        title: "Pending verification",
        body: "1 tutor application and 1 user verification need review.",
        data: { href: "/admin/verification-queue" },
        status: NotificationStatus.SENT,
        createdAt: minsFrom(new Date(), -15),
      },
    ],
  });

  /* ---------------------------------------------------
     11) REPORTS + AUDIT LOGS
  --------------------------------------------------- */
  await prisma.userReport.createMany({
    data: [
      {
        reporterUserId: student1.id,
        reportedUserId: tutor2.id,
        sessionId: session3.id,
        category: UserReportCategory.SESSION_ISSUE,
        status: UserReportStatus.OPEN,
        priority: UserReportPriority.MEDIUM,
        subject: "Tutor proposed a late reschedule",
        description: "Need admin help reviewing the proposed new session time.",
        createdAt: daysAgo(1),
      },
      {
        reporterUserId: student2.id,
        reportedUserId: student3.id,
        category: UserReportCategory.GENERAL_COMPLAINT,
        status: UserReportStatus.IN_REVIEW,
        priority: UserReportPriority.HIGH,
        subject: "Inappropriate language in discussion",
        description: "User used disrespectful language in class chat discussion.",
        reviewedByAdminId: admin.id,
        reviewedAt: minsFrom(new Date(), -90),
        createdAt: daysAgo(2),
      },
    ],
  });

  await prisma.adminAuditLog.createMany({
    data: [
      {
        adminId: admin.id,
        targetUserId: student3.id,
        actionType: AdminActionType.USER_LOCK,
        entityType: "User",
        entityId: student3.id,
        reason: "Locked for presentation demo",
        createdAt: daysAgo(1),
      },
      {
        adminId: admin.id,
        targetUserId: tutor3.id,
        actionType: AdminActionType.TUTOR_APP_REJECT,
        entityType: "TutorApplication",
        reason: "Pending review example for dashboard",
        createdAt: minsFrom(new Date(), -80),
      },
    ],
  });

  /* ---------------------------------------------------
     12) STUDY MODULE
  --------------------------------------------------- */
  const studySubject1 = await prisma.studySubject.create({
    data: {
      userId: student1.id,
      name: "CAT404 Web Engineering",
    },
  });

  const studySubject2 = await prisma.studySubject.create({
    data: {
      userId: student1.id,
      name: "WIX3001 Database Systems",
    },
  });

  const material1 = await prisma.studyMaterial.create({
    data: {
      userId: student1.id,
      title: "CAT404 API Routes Notes",
      rawText: "Next.js route handlers, server actions, Prisma CRUD, validation and auth flow notes.",
      studySubjectId: studySubject1.id,
      objectPath: "demo/cat404-api-routes.pdf",
      fileName: "cat404-api-routes.pdf",
      createdAt: daysAgo(2),
      updatedAt: daysAgo(1),
    },
  });

  const material2 = await prisma.studyMaterial.create({
    data: {
      userId: student1.id,
      title: "WIX3001 SQL Joins Revision",
      rawText: "INNER JOIN, LEFT JOIN, GROUP BY, aggregate functions, normalisation summary.",
      studySubjectId: studySubject2.id,
      objectPath: "demo/wix3001-sql-joins.pdf",
      fileName: "wix3001-sql-joins.pdf",
      createdAt: daysAgo(4),
      updatedAt: daysAgo(2),
    },
  });

  const pack1 = await prisma.studyPack.create({
    data: {
      materialId: material1.id,
      summary: "This pack covers route handlers, request validation, database access with Prisma, and safe auth-aware patterns in Next.js.",
      concepts: ["Route Handlers", "Prisma CRUD", "Validation", "Authentication", "Error Handling"],
      flashcards: [
        { q: "What is a route handler in Next.js?", a: "A server-side function inside app/api that handles HTTP methods." },
        { q: "Why use Prisma in route handlers?", a: "To safely query and update the database using typed models." },
      ],
      quiz: [
        {
          q: "Which file location defines a Next.js route handler?",
          options: ["app/api/.../route.ts", "pages/api.ts", "components/api.ts", "lib/route.ts"],
          answerIndex: 0,
          explanation: "Route handlers are created in app/api/**/route.ts.",
          difficulty: "easy",
          topic: "Route Handlers",
        },
        {
          q: "Why is validation important before Prisma writes?",
          options: ["For styling", "To prevent invalid or unsafe data", "To speed up CSS", "To reduce routing"],
          answerIndex: 1,
          explanation: "Validation prevents malformed or unsafe input from reaching the database.",
          difficulty: "medium",
          topic: "Validation",
        },
      ],
      createdAt: daysAgo(1),
    },
  });

  await prisma.quizAttempt.create({
    data: {
      packId: pack1.id,
      userId: student1.id,
      score: 2,
      total: 2,
      answers: [0, 1],
      createdAt: minsFrom(new Date(), -50),
    },
  });

  const planStart = new Date();
  planStart.setHours(0, 0, 0, 0);
  const planEnd = daysFromNow(6);
  planEnd.setHours(0, 0, 0, 0);

  const plan = await prisma.studyPlan.create({
    data: {
      userId: student1.id,
      title: "Final Revision Sprint",
      startDate: planStart,
      endDate: planEnd,
      examDate: daysFromNow(7),
      hoursPerWeek: 10,
      style: StudyPlanStyle.SHORT_BURSTS,
      preferredTime: PreferredStudyTime.NIGHT,
      subjects: [
        { name: "CAT404 Web Engineering", level0to10: 6, weakTopics: ["Prisma relations", "route validation"] },
        { name: "WIX3001 Database Systems", level0to10: 5, weakTopics: ["SQL joins", "group by"] },
      ],
      availability: {
        days: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
        hoursByDay: { MON: 1, TUE: 1, WED: 2, THU: 2, FRI: 1, SAT: 3 },
      },
    },
  });

  const today = new Date();
  today.setHours(20, 0, 0, 0);

  await prisma.studyPlanItem.createMany({
    data: [
      {
        planId: plan.id,
        date: today,
        subjectName: "CAT404 Web Engineering",
        topic: "Prisma relations",
        task: "Study Prisma one-to-many relations and relation fields",
        durationMin: 45,
        type: StudyPlanItemType.STUDY,
        reason: "Weak topic identified from previous session.",
        status: "PENDING",
        timeBlock: "Night • 8:00–8:45 PM",
      },
      {
        planId: plan.id,
        date: minsFrom(today, 60),
        subjectName: "WIX3001 Database Systems",
        topic: "SQL joins",
        task: "Practice 8 SQL JOIN questions",
        durationMin: 45,
        type: StudyPlanItemType.PRACTICE,
        reason: "Practice improves recall speed before exam.",
        status: "DONE",
        timeBlock: "Night • 9:00–9:45 PM",
      },
      {
        planId: plan.id,
        date: daysFromNow(1),
        subjectName: "CAT404 Web Engineering",
        topic: "Route validation",
        task: "Review route validation and error handling patterns",
        durationMin: 30,
        type: StudyPlanItemType.REVIEW,
        reason: "Spaced revision for a recently studied topic.",
        status: "PENDING",
        timeBlock: "Night • 8:00–8:30 PM",
      },
      {
        planId: plan.id,
        date: daysFromNow(2),
        subjectName: "WIX3001 Database Systems",
        topic: "SQL joins",
        task: "Get help on confusing JOIN edge cases",
        durationMin: 30,
        type: StudyPlanItemType.TUTOR,
        reason: "Escalated weak topic for tutor support.",
        status: "PENDING",
        timeBlock: "Night • 8:30–9:00 PM",
      },
    ],
  });

  await prisma.topicConfidence.createMany({
    data: [
      { userId: student1.id, subjectName: "CAT404 Web Engineering", topic: "Prisma relations", confidence0to10: 5 },
      { userId: student1.id, subjectName: "WIX3001 Database Systems", topic: "SQL joins", confidence0to10: 6 },
    ],
  });

  /* ---------------------------------------------------
     13) EXTRA DEMO NOTIFICATIONS AFTER STUDY SEED
  --------------------------------------------------- */
  await prisma.notification.createMany({
    data: [
      {
        userId: student1.id,
        type: "STUDY_PLAN_READY",
        title: "Study plan ready",
        body: "Your Final Revision Sprint plan is ready.",
        data: { href: "/study/plan", viewer: "STUDENT" },
        status: NotificationStatus.SENT,
        createdAt: minsFrom(new Date(), -5),
      },
      {
        userId: student1.id,
        type: "QUIZ_RESULT",
        title: "Quiz completed",
        body: "You scored 2/2 on your latest study pack.",
        data: { href: `/study/hub/quiz/${pack1.id}`, viewer: "STUDENT" },
        status: NotificationStatus.SENT,
        createdAt: minsFrom(new Date(), -4),
      },
    ],
  });

  console.log("Presentation seed complete.");
  console.log("");
  console.log("Demo logins:");
  console.log("admin@student.usm.my    / Demo123!");
  console.log("student1@student.usm.my / Demo123!");
  console.log("student2@student.usm.my / Demo123!");
  console.log("student3@student.usm.my / Demo123!");
  console.log("tutor1@student.usm.my   / Demo123!");
  console.log("tutor2@student.usm.my   / Demo123!");
  console.log("tutor3@student.usm.my   / Demo123!");
}

main()
  .catch((e) => {
    console.error("Seed failed");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });