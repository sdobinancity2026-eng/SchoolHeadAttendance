'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { calculateDistanceMeters } from '@/lib/location';

export default function SchoolHeadDashboard() {
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [school, setSchool] = useState<any>(null);
  const [activeLog, setActiveLog] = useState<any>(null);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setFetchingData(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setStatusMessage('User session not found. Please log in.');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, schools(*)')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserName(profile.full_name);
        if (profile.schools) setSchool(profile.schools);
      }

      const today = new Date().toISOString().split('T')[0];
      const { data: log } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('created_at', today)
        .maybeSingle();

      if (log) setActiveLog(log);
    } catch (err: any) {
      setStatusMessage(`Error loading data: ${err.message}`);
    } finally {
      setFetchingData(false);
    }
  }

  const handleAttendanceAction = async (type: 'TIME_IN' | 'TIME_OUT') => {
    if (!school) {
      setStatusMessage('No assigned school found for your profile.');
      return;
    }

    setLoading(true);
    setStatusMessage('Acquiring high-accuracy GPS coordinates...');

    if (!navigator.geolocation) {
      setStatusMessage('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const distance = calculateDistanceMeters(
          latitude,
          longitude,
          school.latitude,
          school.longitude
        );

        const allowedRadius = school.allowed_radius_meters || 100;

        if (distance > allowedRadius) {
          setStatusMessage(
            `LOCATION ERROR: You are ${Math.round(distance)}m away. Must be within ${allowedRadius}m of ${school.name}.`
          );
          setLoading(false);
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (type === 'TIME_IN') {
          const { data, error } = await supabase
            .from('attendance_logs')
            .insert([{ 
              user_id: user.id, 
              school_id: school.id, 
              time_in: new Date().toISOString(),
              time_in_lat: latitude, 
              time_in_lng: longitude, 
              status: 'ON_SITE',
              created_at: new Date().toISOString().split('T')[0]
            }])
            .select().single();

          if (!error) {
            setActiveLog(data);
            setStatusMessage(`SUCCESS: Timed In successfully! (${Math.round(distance)}m from campus)`);
          } else {
            setStatusMessage(`Error recording Time In: ${error.message}`);
          }
        } else {
          const { data, error } = await supabase
            .from('attendance_logs')
            .update({ 
              time_out: new Date().toISOString(), 
              time_out_lat: latitude, 
              time_out_lng: longitude 
            })
            .eq('id', activeLog.id)
            .select().single();

          if (!error) {
            setActiveLog(data);
            setStatusMessage(`SUCCESS: Timed Out successfully! (${Math.round(distance)}m from campus)`);
          } else {
            setStatusMessage(`Error recording Time Out: ${error.message}`);
          }
        }
        setLoading(false);
      },
      (err) => {
        setStatusMessage(`GPS Error: ${err.message}`);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  if (fetchingData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-blue-900 text-white">
        <p className="font-semibold animate-pulse">Loading Attendance Portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto max-w-md space-y-4">
        
        {/* Blue Header Card with Yellow Accent */}
        <header className="rounded-3xl bg-blue-900 p-6 text-white shadow-lg border-b-8 border-amber-400">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-blue-800 px-3 py-1 text-xs font-bold text-amber-300">
              OFFICIAL ATTENDANCE
            </span>
            <span className="text-xs text-slate-300">
              {new Date().toLocaleDateString()}
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-bold">{userName || 'School Head'}</h1>
          <p className="text-sm text-slate-200">{school?.name || 'Unassigned School'}</p>
        </header>

        {/* Action Panel */}
        <div className="rounded-3xl bg-white p-6 shadow-md border border-slate-200 text-center space-y-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Shift Action
          </p>

          {!activeLog ? (
            <button
              onClick={() => handleAttendanceAction('TIME_IN')}
              disabled={loading}
              className="w-full rounded-2xl bg-blue-600 py-5 text-xl font-black text-white shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition"
            >
              {loading ? 'CHECKING GPS...' : 'TIME IN'}
            </button>
          ) : !activeLog.time_out ? (
            <button
              onClick={() => handleAttendanceAction('TIME_OUT')}
              disabled={loading}
              className="w-full rounded-2xl bg-red-600 py-5 text-xl font-black text-white shadow-xl shadow-red-200 hover:bg-red-700 active:scale-95 disabled:opacity-50 transition"
            >
              {loading ? 'CHECKING GPS...' : 'TIME OUT'}
            </button>
          ) : (
            <div className="rounded-2xl bg-amber-100 p-4 text-amber-900 font-bold border border-amber-300">
              Duty Completed for Today
            </div>
          )}

          {/* Alert Message Box */}
          {statusMessage && (
            <div className={`rounded-xl p-3 text-xs font-bold ${
              statusMessage.startsWith('LOCATION') || statusMessage.startsWith('GPS') || statusMessage.startsWith('Error')
                ? 'bg-red-100 text-red-800 border border-red-300'
                : statusMessage.startsWith('SUCCESS')
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-amber-100 text-amber-900 border border-amber-300'
            }`}>
              {statusMessage}
            </div>
          )}
        </div>

        {/* Activity Summary */}
        {activeLog && (
          <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-200 space-y-2 text-sm">
            <h3 className="font-bold text-blue-900 border-b pb-2">Today's Timings</h3>
            <div className="flex justify-between">
              <span className="text-slate-500">Time In:</span>
              <span className="font-bold text-blue-700">
                {activeLog.time_in 
                  ? new Date(activeLog.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '--'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Time Out:</span>
              <span className="font-bold text-red-600">
                {activeLog.time_out
                  ? new Date(activeLog.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'On Duty'}
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}