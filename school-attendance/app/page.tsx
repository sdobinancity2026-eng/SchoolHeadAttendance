import Link from 'next/link';

export default function Home() {
  return (
    <main 
      className="flex min-h-screen flex-col items-center justify-center p-6 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: "url('/bg2.jpg')" }}
    >
      {/* Dark overlay to ensure text contrast over the background image */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" />

      <div className="relative z-10 w-full max-w-md space-y-6 rounded-3xl bg-white/95 p-8 text-center shadow-2xl border-t-8 border-blue-900 backdrop-blur-md">
        
        {/* DepEd Branding Badge */}
        <div className="inline-block rounded-full bg-amber-100 px-4 py-1 text-xs font-bold text-amber-800 uppercase tracking-widest border border-amber-300">
          DepEd Attendance System
        </div>

        <div>
          <h1 className="text-2xl font-black text-blue-950">
            Attendance Monitoring Portal
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-600">
            Select your role to access your dashboard:
          </p>
        </div>

        {/* Portal Navigation Options */}
        <div className="flex flex-col gap-3 pt-2">
          <Link
            href="/school-head"
            className="w-full rounded-2xl bg-blue-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition"
          >
            School Head Portal
          </Link>
          
          <Link
            href="/admin/dashboard"
            className="w-full rounded-2xl bg-amber-400 px-6 py-4 text-base font-bold text-blue-950 shadow-md hover:bg-amber-500 active:scale-95 transition border border-amber-300"
          >
            Admin Dashboard
          </Link>
        </div>

      </div>
    </main>
  );
}