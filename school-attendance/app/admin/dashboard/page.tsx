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
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        
        {/* Header Bar with Deep Blue & Yellow Border */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl bg-blue-900 p-6 shadow-lg border-b-8 border-amber-400 text-white">
          <div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-blue-800 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-400/30">
                ADMIN PORTAL
              </span>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400"></span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-2">
              School Heads Live Monitoring
            </h1>
            <p className="text-sm text-slate-200 mt-1">
              Real-time attendance logs across division schools
            </p>
          </div>

          {/* Date Picker Filter */}
          <div className="flex items-center gap-2 bg-blue-950/60 p-3 rounded-2xl border border-blue-800">
            <label htmlFor="filter-date" className="text-xs font-bold text-amber-300 uppercase">
              Filter Date:
            </label>
            <input
              id="filter-date"
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="rounded-xl border border-amber-300/40 bg-white px-3 py-1.5 text-sm font-semibold text-blue-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        {/* Metric Cards (Blue, Yellow, Red Highlights) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md border-t-4 border-blue-600">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Records Today</p>
            <p className="text-4xl font-black text-blue-900 mt-2">{logs.length}</p>
          </div>
          
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md border-t-4 border-amber-400">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Currently On Duty</p>
            <p className="text-4xl font-black text-amber-600 mt-2">
              {logs.filter((log) => !log.time_out).length}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md border-t-4 border-red-600">
            <p className="text-xs font-bold text-red-800 uppercase tracking-wider">Shift Completed</p>
            <p className="text-4xl font-black text-red-600 mt-2">
              {logs.filter((log) => log.time_out).length}
            </p>
          </div>
        </div>

        {/* Attendance Table */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-blue-900 text-white border-b-2 border-amber-400">
                <tr>
                  <th className="p-4 font-bold uppercase text-xs tracking-wider text-amber-300">School Head</th>
                  <th className="p-4 font-bold uppercase text-xs tracking-wider">Assigned School</th>
                  <th className="p-4 font-bold uppercase text-xs tracking-wider">Time In</th>
                  <th className="p-4 font-bold uppercase text-xs tracking-wider">Time Out</th>
                  <th className="p-4 font-bold uppercase text-xs tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 font-semibold animate-pulse">
                      Fetching live attendance records...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                      No attendance logs recorded for {filterDate}.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="p-4 font-bold text-blue-950">{log.profiles?.full_name || 'N/A'}</td>
                      <td className="p-4 text-slate-600 font-medium">{log.schools?.name || 'N/A'}</td>
                      <td className="p-4 font-semibold text-blue-700">
                        {log.time_in
                          ? new Date(log.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '--'}
                      </td>
                      <td className="p-4 font-semibold">
                        {log.time_out ? (
                          <span className="text-red-600">
                            {new Date(log.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="inline-block rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900 border border-amber-300">
                            ON DUTY
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800 border border-blue-200">
                          <span className="h-2 w-2 rounded-full bg-blue-600"></span>
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