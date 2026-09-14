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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterDate, setFilterDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Fallback to '1234' if env variable is undefined or empty
  const ADMIN_PIN = (process.env.NEXT_PUBLIC_ADMIN_PIN || '1234').trim();

  // Check if session was already authenticated in this browser tab
  useEffect(() => {
    const authSession = sessionStorage.getItem('admin_authenticated');
    if (authSession === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === ADMIN_PIN) {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_authenticated', 'true');
      setPinError('');
    } else {
      setPinError('Invalid Passcode. Please try again.');
    }
  };

  const handleLockDashboard = () => {
    sessionStorage.removeItem('admin_authenticated');
    setIsAuthenticated(false);
    setPinInput('');
  };

  useEffect(() => {
    if (!isAuthenticated) return;

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
  }, [filterDate, isAuthenticated]);

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

  // Export current table logs to CSV
  const handleExportCSV = () => {
    if (!logs || logs.length === 0) {
      alert(`No attendance records available for ${filterDate} to export.`);
      return;
    }

    const headers = ['School Head', 'Assigned School', 'Time In', 'Time Out', 'Status', 'Date Recorded'];
    const rows = logs.map((log) => [
      `"${log.profiles?.full_name || 'N/A'}"`,
      `"${log.schools?.name || 'N/A'}"`,
      log.time_in ? `"${new Date(log.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}"` : '"--"',
      log.time_out ? `"${new Date(log.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}"` : '"ON DUTY"',
      `"${log.status}"`,
      `"${log.created_at}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `deped_attendance_${filterDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PIN Access Guard Screen
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
        <form onSubmit={handlePinSubmit} className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl border-t-8 border-amber-400 space-y-4">
          <div className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-900 uppercase tracking-wider">
            Admin Access Restricted
          </div>
          <h2 className="text-xl font-extrabold text-blue-950">Enter Security Passcode</h2>
          <p className="text-xs text-slate-500">Provide the passcode to access division logs.</p>
          <input
            type="password"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="••••"
            maxLength={6}
            autoFocus
            className="w-full rounded-2xl border-2 border-slate-200 p-3 text-center text-2xl font-mono tracking-widest text-blue-950 focus:border-blue-600 focus:outline-none"
          />
          {pinError && <p className="text-xs font-bold text-red-600">{pinError}</p>}
          <button
            type="submit"
            className="w-full rounded-2xl bg-blue-900 py-3 font-bold text-white shadow-lg hover:bg-blue-800 active:scale-95 transition"
          >
            Unlock Dashboard
          </button>
        </form>
      </div>
    );
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

          <div className="flex flex-wrap items-center gap-3">
            {/* CSV Export Button */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-emerald-700 active:scale-95 transition border border-emerald-400/40"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>

            {/* Lock Button */}
            <button
              onClick={handleLockDashboard}
              className="flex items-center gap-1.5 rounded-2xl bg-blue-950 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-amber-300 shadow-md hover:bg-blue-800 active:scale-95 transition border border-blue-800"
            >
              🔒 Lock
            </button>

            {/* Date Picker Filter */}
            <div className="flex items-center gap-2 bg-blue-950/60 p-2.5 rounded-2xl border border-blue-800">
              <label htmlFor="filter-date" className="text-xs font-bold text-amber-300 uppercase">
                Date:
              </label>
              <input
                id="filter-date"
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="rounded-xl border border-amber-300/40 bg-white px-3 py-1 text-sm font-semibold text-blue-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Metric Cards */}
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