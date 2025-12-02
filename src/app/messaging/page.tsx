// src/app/messaging/page.tsx
"use client";

const conversations = [
  {
    id: "CONV-1204",
    name: "Aisyah (Tutor – Programming I)",
    lastMessage: "Okay, try to run the code again after fixing the loop.",
    time: "5 min ago",
    unread: 2,
  },
  {
    id: "CONV-1187",
    name: "Wei Jie (Tutor – Calculus)",
    lastMessage: "We can go through more examples before your quiz.",
    time: "18 min ago",
    unread: 0,
  },
  {
    id: "CONV-1179",
    name: "Harini (Tutor – Discrete Math)",
    lastMessage: "Glad it makes more sense now!",
    time: "Yesterday",
    unread: 0,
  },
];

const messages = [
  {
    from: "tutor",
    text: "Hi! I saw your request about loops in C. Can you share your current code?",
    time: "3:02 PM",
  },
  {
    from: "student",
    text: "Sure, I’m getting stuck in an infinite loop and not sure why.",
    time: "3:04 PM",
  },
  {
    from: "tutor",
    text: "No problem. It’s usually because the condition never becomes false. Let’s look at your while condition.",
    time: "3:05 PM",
  },
  {
    from: "student",
    text: "Ohh okay, I think I forgot to update the counter.",
    time: "3:06 PM",
  },
];

export default function MessagingPage() {
  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white">
          Messages & Notifications
        </h1>
        <p className="text-sm text-slate-300 max-w-2xl">
          Real-time messaging between students and tutors for session
          coordination, file sharing, and follow-up questions. This screen shows
          how a student can manage conversations.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-3 rounded-xl border border-slate-800 bg-slate-950/80 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
        {/* Left: conversation list */}
        <div className="flex flex-col gap-3 border-b border-slate-800 pb-3 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">
              Recent Conversations
            </h2>
            <span className="rounded-full bg-sky-500/10 px-2 py-1 text-[0.65rem] font-medium text-sky-300">
              3 active
            </span>
          </div>

          <div className="rounded-md border border-slate-800 bg-slate-900/80 px-2 py-1">
            <input
              className="w-full bg-transparent px-1 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
              placeholder="Search tutor or subject..."
            />
          </div>

          <div className="space-y-2 text-xs">
            {conversations.map((conv, idx) => (
              <div
                key={conv.id}
                className={`cursor-pointer rounded-lg border px-3 py-2 ${
                  idx === 0
                    ? "border-sky-500/60 bg-slate-900/90"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-600"
                }`}
              >
                <p className="text-[0.7rem] font-semibold text-slate-100">
                  {conv.name}
                </p>
                <p className="mt-1 line-clamp-1 text-[0.7rem] text-slate-400">
                  {conv.lastMessage}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2 text-[0.65rem]">
                  <span className="text-slate-500">{conv.time}</span>
                  {conv.unread > 0 && (
                    <span className="rounded-full bg-sky-500 text-[0.6rem] font-semibold text-slate-950 px-2 py-0.5">
                      {conv.unread} new
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: chat window */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <p className="text-sm font-semibold text-slate-100">
                Chat with Aisyah (Tutor – Programming I)
              </p>
              <p className="text-[0.7rem] text-slate-400">
                Topic: While loops & conditions
              </p>
            </div>
            <button className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-[0.7rem] text-slate-200 hover:border-sky-400">
              View session details
            </button>
          </div>

          <div className="mt-3 flex-1 rounded-lg border border-slate-800 bg-slate-950/90 p-3 text-xs max-h-80 overflow-y-auto">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`mb-3 flex ${
                  msg.from === "student" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-3 py-2 ${
                    msg.from === "student"
                      ? "bg-sky-500 text-slate-950"
                      : "bg-slate-800 text-slate-100"
                  }`}
                >
                  <p>{msg.text}</p>
                  <p
                    className={`mt-1 text-[0.6rem] ${
                      msg.from === "student"
                        ? "text-slate-900/70"
                        : "text-slate-300/70"
                    }`}
                  >
                    {msg.time}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button className="rounded-md border border-slate-700 bg-slate-900/70 px-2 py-2 text-[0.7rem] text-slate-200 hover:border-sky-400">
              + Attach file
            </button>
            <input
              className="flex-1 rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="Type a message to your tutor..."
            />
            <button className="rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 px-4 py-2 text-[0.7rem] font-semibold text-slate-950 shadow-[0_10px_25px_rgba(56,189,248,0.6)]">
              Send
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
