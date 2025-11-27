export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col items-center justify-center text-center p-8">
      <h1 className="text-5xl font-extrabold text-blue-700 mb-4 drop-shadow-sm">
        TutorLink
      </h1>
      <p className="text-gray-700 text-lg max-w-xl">
        Connect with peers, share knowledge, and learn smarter together — right
        inside USM’s academic ecosystem.
      </p>

      <div className="flex gap-4 mt-8">
        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
          Get Started
        </button>
        <button className="border border-blue-600 text-blue-700 px-6 py-3 rounded-lg hover:bg-blue-50 transition">
          Learn More
        </button>
      </div>
    </main>
  );
}

