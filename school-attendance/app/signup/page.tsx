'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingProfiles, setFetchingProfiles] = useState(true);
  const [profilesList, setProfilesList] = useState<{ id: string; full_name: string }[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchSchoolHeadProfiles();
  }, []);

  async function fetchSchoolHeadProfiles() {
    try {
      setFetchingProfiles(true);
      // Fetch pre-populated names from profiles table sorted alphabetically
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name', { ascending: true });

      if (error) throw error;
      if (data) setProfilesList(data);
    } catch (err: any) {
      setErrorMsg(`Failed to load directory names: ${err.message}`);
    } finally {
      setFetchingProfiles(false);
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName) {
      setErrorMsg('Please select your official name from the list.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.toUpperCase().trim(),
        },
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else if (data.user) {
      alert('Account created successfully! Redirecting to login...');
      router.push('/login');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <form onSubmit={handleSignup} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl space-y-4">
        <h2 className="text-2xl font-black text-blue-950 text-center">School Head Registration</h2>
        <p className="text-xs text-slate-500 text-center">
          Select your official full name as listed in the DepEd directory.
        </p>

        {errorMsg && <p className="text-xs font-bold text-red-600 text-center">{errorMsg}</p>}

        <div>
          <label className="text-xs font-bold text-slate-600 uppercase">Full Name</label>
          <select
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={fetchingProfiles}
            className="w-full rounded-xl border p-3 text-sm focus:border-blue-600 focus:outline-none bg-white text-slate-900 disabled:opacity-50"
          >
            <option value="">
              {fetchingProfiles ? 'Loading directory...' : '-- Select Full Name --'}
            </option>
            {profilesList.map((profile) => (
              <option key={profile.id} value={profile.full_name}>
                {profile.full_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-600 uppercase">Email Address</label>
          <input
            type="email"
            required
            placeholder="head@deped.gov.ph"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border p-3 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-600 uppercase">Password</label>
          <input
            type="password"
            required
            minLength={6}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border p-3 text-sm focus:border-blue-600 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading || fetchingProfiles}
          className="w-full rounded-xl bg-blue-900 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-50 transition"
        >
          {loading ? 'Creating Account...' : 'Register Account'}
        </button>
      </form>
    </div>
  );
}