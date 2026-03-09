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

⚙️ Installation

Clone the repository

git clone https://github.com/yourusername/tutorlink.git

Move into the project

cd tutorlink

Install dependencies

npm install
🚀 Running the Project

Start the development server:

npm run dev

Open your browser:

http://localhost:3000
🔧 Environment Variables

Create a .env.local file.

Example:

DATABASE_URL=your_database_url
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
🧪 Available Scripts
Command	Description
npm run dev	Run development server
npm run build	Build production app
npm run start	Run production build
npm run lint	Run linter
📈 Future Improvements

AI tutor recommendation

AI study assistant

Mobile app version

LMS integration

Advanced analytics dashboard

🤝 Contributing

Contributions are welcome!

Steps:

Fork the repository

Create a new branch

git checkout -b feature/new-feature

Commit changes

git commit -m "Added new feature"

Push branch

git push origin feature/new-feature

Open a Pull Request

📜 License

This project is developed for academic purposes and educational use.