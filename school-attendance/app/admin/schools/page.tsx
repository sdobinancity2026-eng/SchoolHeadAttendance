'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface School {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  radius_meters: number;
}

interface Profile {
  id: string;
  full_name: string;
  school_id: string | null;
}

export default function AdminManageSchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [heads, setHeads] = useState<Profile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New School Form State
  const [schoolName, setSchoolName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('200');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: schoolsData } = await supabase.from('schools').select('*').order('name');
    const { data: headsData } = await supabase.from('profiles').select('*').order('full_name');

    if (schoolsData) setSchools(schoolsData);
    if (headsData) setHeads(headsData);
    setLoading(false);
  }

  // Get current admin browser position as quick preset
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toString());
        setLongitude(position.coords.longitude.toString());
      },
      (error) => alert(`Error getting position: ${error.message}`),
      { enableHighAccuracy: true }
    );
  };

  // Add new school with GPS coordinates
  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName || !latitude || !longitude) {
      alert('Please fill in school name and GPS coordinates.');
      return;
    }

    const { error } = await supabase.from('schools').insert({
      name: schoolName,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius_meters: parseInt(radius) || 200,
    });

    if (error) {
      alert(`Failed to add school: ${error.message}`);
    } else {
      alert('School created successfully!');
      setSchoolName('');
      setLatitude('');
      setLongitude('');
      fetchData();
    }
  };

  // Assign a School Head to a specific School
  const handleAssignHead = async (profileId: string, newSchoolId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ school_id: newSchoolId || null })
      .eq('id', profileId);

    if (error) {
      alert(`Error updating assignment: ${error.message}`);
    } else {
      fetchData();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-8">
        
        {/* Header */}
        <div className="rounded-3xl bg-blue-900 p-6 shadow-lg border-b-8 border-amber-400 text-white">
          <h1 className="text-2xl font-extrabold">School & Head GPS Assignment</h1>
          <p className="text-sm text-slate-200 mt-1">
            Configure school geofence boundaries and link designated School Heads.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Form: Add New School with GPS */}
          <div className="rounded-3xl bg-white p-6 shadow-md border border-slate-200 space-y-4">
            <h2 className="text-lg font-extrabold text-blue-950 border-b pb-2">Add New School & Geofence</h2>
            <form onSubmit={handleCreateSchool} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">School Name</label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="e.g. Central Elementary School"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-blue-600 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="14.3412"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-blue-600 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="121.0825"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-blue-600 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  className="w-full rounded-xl bg-slate-100 py-2 text-xs font-bold text-blue-900 border border-slate-300 hover:bg-slate-200"
                >
                  📍 Fill Current GPS Coordinates
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Allowed Radius (Meters)</label>
                <input
                  type="number"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  placeholder="200"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-blue-600 focus:outline-none"
                />
                <span className="text-xs text-slate-400">Default is 200m radius from center coordinate.</span>
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-blue-900 py-3 font-bold text-white shadow-md hover:bg-blue-800 transition"
              >
                Save School & Geofence
              </button>
            </form>
          </div>

          {/* List: Assign School Heads */}
          <div className="rounded-3xl bg-white p-6 shadow-md border border-slate-200 space-y-4">
            <h2 className="text-lg font-extrabold text-blue-950 border-b pb-2">Assign School Heads</h2>
            
            {loading ? (
              <p className="text-sm text-slate-500">Loading assignments...</p>
            ) : heads.length === 0 ? (
              <p className="text-sm text-slate-500">No registered profiles found.</p>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {heads.map((head) => (
                  <div key={head.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <p className="font-bold text-sm text-blue-950">{head.full_name}</p>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold text-slate-500">School:</label>
                      <select
                        value={head.school_id || ''}
                        onChange={(e) => handleAssignHead(head.id, e.target.value)}
                        className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="">-- Unassigned --</option>
                        {schools.map((school) => (
                          <option key={school.id} value={school.id}>
                            {school.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Existing Schools Table */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md">
          <div className="p-4 bg-blue-900 text-white font-bold border-b-2 border-amber-400">
            Registered Schools & Geofence Settings
          </div>
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold">
              <tr>
                <th className="p-3">School Name</th>
                <th className="p-3">Latitude</th>
                <th className="p-3">Longitude</th>
                <th className="p-3">Geofence Radius</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schools.map((s) => (
                <tr key={s.id}>
                  <td className="p-3 font-semibold text-blue-950">{s.name}</td>
                  <td className="p-3 font-mono text-xs">{s.latitude ?? 'Not Set'}</td>
                  <td className="p-3 font-mono text-xs">{s.longitude ?? 'Not Set'}</td>
                  <td className="p-3 font-bold text-emerald-700">{s.radius_meters}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}