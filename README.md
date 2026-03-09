# TutorLink

TutorLink is a campus-based peer tutoring web application designed for Universiti Sains Malaysia (USM) students. It provides a centralized platform for students to request academic help, connect with peer tutors, manage tutoring sessions, communicate in real time, track learning progress, and engage through gamification features.

The platform is built as a modern web application using **Next.js** and **TypeScript**, with a scalable architecture intended to support secure authentication, tutor matching, session booking, analytics, and admin management.

---

## Features

- **User Management**
  - Student registration and login
  - USM email verification
  - Profile management
  - Role-based access for Student, Tutor, and Admin

- **Tutor Matching & Booking**
  - Search tutors by subject or course
  - Smart tutor suggestions
  - Session request and booking management
  - Tutor availability handling

- **Notification & Messaging**
  - Real-time in-app chat
  - Booking confirmation notifications
  - Session reminders
  - File sharing in chat

- **Progress Tracking & Analytics**
  - Session completion tracking
  - Study history and topic coverage
  - Student analytics dashboard
  - Exportable progress reports

- **Gamification**
  - Points and badges
  - Weekly leaderboard
  - Reward redemption
  - Study streak tracking

- **SOS Academic Help**
  - Urgent academic help requests
  - Real-time routing to available tutors
  - SOS request tracking and response handling

- **Admin Management**
  - User account moderation
  - Tutor application approval/rejection
  - System-wide analytics
  - Activity summary reports

---

## Tech Stack

This project is developed with:

- **Next.js**
- **React**
- **TypeScript**
- **Node.js**
- **PostgreSQL** (planned / backend database)
- **GitHub** for version control

---

## Project Structure

Below is a typical structure for the project based on the current Next.js App Router setup and the TutorLink system modules:

```bash
tutorlink/
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   ├── login/
│   ├── register/
│   ├── dashboard/
│   │   ├── student/
│   │   ├── tutor/
│   │   └── admin/
│   ├── messaging/
│   ├── sos/
│   ├── leaderboard/
│   └── api/
├── components/
│   ├── ui/
│   ├── session/
│   ├── messaging/
│   ├── dashboard/
│   └── gamification/
├── lib/
│   ├── auth/
│   ├── db/
│   ├── utils/
│   └── services/
├── prisma/ or database/
├── public/
├── styles/
├── types/
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md