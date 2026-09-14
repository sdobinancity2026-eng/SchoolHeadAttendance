import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 dark:bg-zinc-900">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance Monitoring System</h1>
        <p className="text-sm text-gray-500">Select a portal to continue:</p>
        
        <div className="flex flex-col gap-3 pt-4">
          <Link
            href="/school-head/attendance"
            className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-md hover:bg-blue-700 transition"
          >
            School Head Portal
          </Link>
          <Link
            href="/admin/dashboard"
            className="w-full rounded-xl bg-zinc-800 px-5 py-3 font-semibold text-white shadow-md hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 transition"
          >
            Admin Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}