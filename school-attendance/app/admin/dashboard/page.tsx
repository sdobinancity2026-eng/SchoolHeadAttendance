'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface AttendanceRecord {
  id: string;
  time_in: string;
  time_out?: string;
  status: string;
  created_at: string;
  profiles: {
    full_name: string;
  };
  schools: {
    name: string;
  };
}

export default function AdminDashboardPage() {
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    fetchLogs(filterDate);

    // Set up Realtime Subscription for incoming Time In / Time Out activity
    const channel = supabase
      .channel('admin_attendance_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_logs' },
        () => {
          // Re-fetch attendance records whenever a new row is inserted or updated
          fetchLogs(filterDate);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterDate]);

  async function fetchLogs(selectedDate: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*, profiles(full_name), schools(name)')
      .eq('created_at', selectedDate)
      .order('time_in', { ascending: false });

    if (!error && data) {
      setLogs(data as unknown as AttendanceRecord[]);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
      <div className="mx-auto max-w-6xl space-y-6">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm border border-gray-100 dark:border-zinc-800 dark:bg-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Admin Attendance Monitor</h1>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
              Live feeds update automatically when School Heads time in or out.
            </p>
          </div>

          {/* Date Picker Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="filter-date" className="text-xs font-semibold text-gray-500 uppercase">
              Date:
            </label>
            <input
              id="filter-date"
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        </div>

        {/* Stats Summary Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-800">
            <p className="text-xs font-semibold text-gray-400 uppercase">Total Records Today</p>
            <p className="text-3xl font-extrabold mt-1">{logs.length}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-800">
            <p className="text-xs font-semibold text-emerald-500 uppercase">Currently On Duty</p>
            <p className="text-3xl font-extrabold mt-1">
              {logs.filter((log) => !log.time_out).length}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-800">
            <p className="text-xs font-semibold text-blue-500 uppercase">Shift Completed</p>
            <p className="text-3xl font-extrabold mt-1">
              {logs.filter((log) => log.time_out).length}
            </p>
          </div>
        </div>

        {/* Real-Time Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-gray-50 dark:bg-zinc-900/50 border-b border-gray-100 dark:border-zinc-800">
                <tr>
                  <th className="p-4 font-semibold text-gray-500 dark:text-zinc-400">School Head</th>
                  <th className="p-4 font-semibold text-gray-500 dark:text-zinc-400">Assigned School</th>
                  <th className="p-4 font-semibold text-gray-500 dark:text-zinc-400">Time In</th>
                  <th className="p-4 font-semibold text-gray-500 dark:text-zinc-400">Time Out</th>
                  <th className="p-4 font-semibold text-gray-500 dark:text-zinc-400">Location Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400">
                      Loading real-time log data...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400">
                      No attendance logs found for {filterDate}.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-900/30 transition">
                      <td className="p-4 font-medium">{log.profiles?.full_name || 'N/A'}</td>
                      <td className="p-4 text-gray-600 dark:text-zinc-300">{log.schools?.name || 'N/A'}</td>
                      <td className="p-4 text-gray-600 dark:text-zinc-300">
                        {log.time_in
                          ? new Date(log.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '--'}
                      </td>
                      <td className="p-4 text-gray-600 dark:text-zinc-300">
                        {log.time_out
                          ? new Date(log.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : <span className="text-amber-600 dark:text-amber-400 font-medium">On Duty</span>}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}