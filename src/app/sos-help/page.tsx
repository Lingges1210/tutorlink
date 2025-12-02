// src/app/sos-help/page.tsx
"use client";

const availableTutors = [
  {
    name: "Aisyah (CS Year 3)",
    subject: "Data Structures & Algorithms",
    avgResponse: "3 min",
    status: "Online",
  },
  {
    name: "Wei Jie (EEE Year 2)",
    subject: "Circuit Theory & Maths",
    avgResponse: "5 min",
    status: "Online",
  },
  {
    name: "Harini (Maths Year 4)",
    subject: "Calculus & Linear Algebra",
    avgResponse: "7 min",
    status: "Busy",
  },
];

const recentRequests = [
  {
    id: "SOS-2031",
    subject: "Programming I – loops",
    status: "Connected to tutor",
    time: "10 mins ago",
  },
  {
    id: "SOS-2029",
    subject: "Calculus – chain rule",
    status: "Completed",
    time: "Today, 11:20 AM",
  },
  {
    id: "SOS-2025",
    subject: "Circuit Theory – KCL/KVL",
    status: "Completed",
    time: "Yesterday",
  },
];

export default function SosHelpPage() {
  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white">
          SOS Academic Help
        </h1>
        <p className="text-sm text-slate-300 max-w-2xl">
          Rapid academic assistance for urgent questions. Submit an SOS request,
          and TutorLink will route it to an available tutor who can respond
          quickly.
        </p>
      </header>

      {/* New SOS request form (mock) */}
      <section className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
        <h2 className="text-sm font-semibold text-white">
          Create New SOS Request
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Use this form when you are stuck and need rapid help before an exam,
          quiz or assignment deadline.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-200">
              Course / Subject
            </label>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              placeholder="e.g. Programming I, Data Structures, Calculus II"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-200">
              Topic / Problem
            </label>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              placeholder="Briefly describe what you are stuck on"
            />
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-200">
              Urgency Level
            </label>
            <select className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500">
              <option>In the next 30 minutes</option>
              <option>Within 1 hour</option>
              <option>Later today</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-200">
              Preferred Mode
            </label>
            <select className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500">
              <option>Chat only</option>
              <option>Chat + Voice call</option>
              <option>Chat + Screen sharing</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-200">
              Attach Screenshot (optional)
            </label>
            <button className="w-full rounded-md border border-dashed border-slate-700 bg-slate-900/60 px-3 py-2 text-xs text-slate-400 hover:border-rose-400 hover:text-rose-200">
              Upload question image
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[0.7rem] text-slate-400">
            When you submit, your request will be broadcast to available tutors
            who match this subject. The first to accept will start the SOS
            session.
          </p>
          <button className="rounded-full bg-gradient-to-r from-rose-500 via-orange-500 to-amber-400 px-4 py-2 text-xs font-semibold text-slate-950 shadow-[0_12px_30px_rgba(248,113,113,0.6)]">
            Submit SOS Request
          </button>
        </div>
      </section>

      {/* Available tutors & recent requests */}
      <section className="grid gap-5 lg:grid-cols-3">
        {/* Available tutors */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-950/80 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
          <h2 className="text-sm font-semibold text-white">
            Available Tutors Right Now (Sample)
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            These are tutors who are currently online and can respond quickly to
            SOS requests.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {availableTutors.map((tutor) => (
              <div
                key={tutor.name}
                className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-3 text-xs"
              >
                <p className="font-semibold text-slate-100">{tutor.name}</p>
                <p className="mt-1 text-slate-300">{tutor.subject}</p>
                <p className="mt-1 text-[0.7rem] text-slate-400">
                  Avg. response:{" "}
                  <span className="font-medium text-rose-200">
                    {tutor.avgResponse}
                  </span>
                </p>
                <span
                  className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${
                    tutor.status === "Online"
                      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                      : "bg-amber-500/10 text-amber-300 border border-amber-500/50"
                  }`}
                >
                  {tutor.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent SOS requests */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
          <h2 className="text-sm font-semibold text-white">
            Your Recent SOS Requests
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Example of how a student can see the status of past urgent help
            requests.
          </p>

          <div className="mt-4 space-y-3 text-xs">
            {recentRequests.map((req) => (
              <div
                key={req.id}
                className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2"
              >
                <p className="text-[0.7rem] font-semibold text-slate-200">
                  {req.id}
                </p>
                <p className="mt-1 text-slate-300">{req.subject}</p>
                <p className="mt-1 text-[0.7rem] text-slate-400">{req.time}</p>
                <p className="mt-1 text-[0.7rem] font-medium text-emerald-300">
                  {req.status}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
