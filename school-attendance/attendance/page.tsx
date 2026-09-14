'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { calculateDistanceMeters } from '@/lib/location';

interface School {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  allowed_radius_meters: number;
}

interface AttendanceLog {
  id: string;
  time_in: string;
  time_out?: string;
  status: string;
}

export default function SchoolHeadAttendancePage() {
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [activeLog, setActiveLog] = useState<AttendanceLog | null>(null);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Helper to get local date in YYYY-MM-DD format (prevents UTC timezone shift)
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  async function loadDashboardData() {
    try {
      setFetchingData(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setStatusMessage('User session not found. Please log in.');
        return;
      }

      // 1. Fetch user profile and assigned school
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, schools(*)')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        setStatusMessage('Profile or assigned school not found.');
        return;
      }

      setUserName(profile.full_name);
      if (profile.schools) {
        setSchool(profile.schools as unknown as School);
      }

      // 2. Fetch today's attendance log using local date
      const today = getLocalDateString();
      const { data: log } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('created_at', today)
        .maybeSingle();

      if (log) {
        setActiveLog(log);
      }
    } catch (err: any) {
      setStatusMessage(`Error loading data: ${err.message}`);
    } finally {
      setFetchingData(false);
    }
  }

  const handleAttendanceAction = async (type: 'TIME_IN' | 'TIME_OUT') => {
    if (!school) {
      setStatusMessage('No school record assigned to your profile.');
      return;
    }

    if (school.latitude === null || school.longitude === null) {
      setStatusMessage('School location coordinates are not set by the administrator.');
      return;
    }

    setLoading(true);
    setStatusMessage('Acquiring high-accuracy GPS coordinates...');

    if (!navigator.geolocation) {
      setStatusMessage('Geolocation is not supported on this device/browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Geofencing Check: Calculate distance to assigned school
        const distanceMeters = calculateDistanceMeters(
          latitude,
          longitude,
          school.latitude,
          school.longitude
        );

        const radius = school.allowed_radius_meters || 200;
        const isWithinRange = distanceMeters <= radius;

        if (!isWithinRange) {
          setStatusMessage(
            `Location Error: You are ${Math.round(distanceMeters)}m away. You must be within ${radius}m of ${school.name}.`
          );
          setLoading(false);
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const now = new Date().toISOString();
        const today = getLocalDateString();

        if (type === 'TIME_IN') {
          const { data, error } = await supabase
            .from('attendance_logs')
            .insert([
              {
                user_id: user.id,
                school_id: school.id,
                time_in: now,
                time_in_lat: latitude,
                time_in_lng: longitude,
                status: 'ON_SITE',
                created_at: today,
              },
            ])
            .select()
            .single();

          if (error) {
            setStatusMessage(`Failed to Time In: ${error.message}`);
          } else {
            setActiveLog(data);
            setStatusMessage('Successfully Timed In!');
          }
        } else if (type === 'TIME_OUT' && activeLog) {
          const { data, error } = await supabase
            .from('attendance_logs')
            .update({
              time_out: now,
              time_out_lat: latitude,
              time_out_lng: longitude,
            })
            .eq('id', activeLog.id)
            .select()
            .single();

          if (error) {
            setStatusMessage(`Failed to Time Out: ${error.message}`);
          } else {
            setActiveLog(data);
            setStatusMessage('Successfully Timed Out!');
          }
        }
        setLoading(false);
      },
      (error) => {
        setStatusMessage(`GPS Error: ${error.message}. Please enable location permissions.`);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  if (fetchingData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-zinc-900">
        <div className="text-sm font-medium text-gray-500">Loading profile data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
      <div className="mx-auto max-w-md space-y-6">
        {/* Header */}
        <header className="rounded-2xl bg-blue-600 p-6 text-white shadow-lg dark:bg-blue-700">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">School Head Portal</p>
          <h1 className="text-2xl font-bold">{userName || 'School Head'}</h1>
          <p className="mt-1 text-sm opacity-90">{school ? school.name : 'Unassigned School'}</p>
        </header>

        {/* Action Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-800 text-center space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Today</p>
            <h2 className="text-lg font-bold">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </h2>
          </div>

          <div className="pt-2">
            {!activeLog ? (
              <button
                onClick={() => handleAttendanceAction('TIME_IN')}
                disabled={loading}
                className="w-full rounded-xl bg-emerald-600 py-4 text-lg font-bold text-white shadow-md hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition"
              >
                {loading ? 'Validating Location...' : 'TIME IN'}
              </button>
            ) : !activeLog.time_out ? (
              <button
                onClick={() => handleAttendanceAction('TIME_OUT')}
                disabled={loading}
                className="w-full rounded-xl bg-rose-600 py-4 text-lg font-bold text-white shadow-md hover:bg-rose-700 active:scale-95 disabled:opacity-50 transition"
              >
                {loading ? 'Validating Location...' : 'TIME OUT'}
              </button>
            ) : (
              <div className="rounded-xl bg-emerald-50 p-4 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium">
                Shift Completed for Today
              </div>
            )}
          </div>

          {/* Status Message Display */}
          {statusMessage && (
            <div className="rounded-lg bg-amber-50 p-3 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              {statusMessage}
            </div>
          )}
        </div>

        {/* Shift Details */}
        {activeLog && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-800 space-y-3">
            <h3 className="text-sm font-semibold text-gray-500">Today's Activity</h3>
            <div className="flex justify-between text-sm border-b pb-2 dark:border-zinc-700">
              <span>Time In:</span>
              <span className="font-semibold">
                {activeLog.time_in
                  ? new Date(activeLog.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '--:--'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Time Out:</span>
              <span className="font-semibold">
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