'use client';

import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useRouter } from 'next/navigation';

const SECURITY_QUESTIONS = [
  "What was your childhood nickname?",
  "What is the name of your first pet?",
  "In what city were you born?",
  "What is your mother's maiden name?",
  "What was the name of your first school?",
  "What was the make and model of your first car?",
  "What is your favorite movie?",
  "What is your oldest sibling's middle name?",
  "What street did you grow up on?",
  "What was the name of your favorite teacher?",
  "What is your favorite childhood hero?",
  "Where did you go on your first vacation?",
  "What is the name of the hospital where you were born?",
  "What was your favorite food as a child?",
  "What is the first name of your best friend in high school?",
  "What was the name of your first stuffed animal?",
  "In what city or town did your parents meet?",
  "What was the first concert you attended?",
  "What is your favorite book?",
  "What was the name of your first employer?"
];

async function hashString(message: string) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function Home() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch the user data directly
  const users = useLiveQuery(() => db.users.toArray());
  const user = users?.[0]; 

  // Form States
  const [journalName, setJournalName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [error, setError] = useState('');
  
  // View Toggle State
  const [isRecovering, setIsRecovering] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      const passwordHash = await hashString(password);
      const answerHash = await hashString(securityAnswer.toLowerCase().trim()); 

      const userId = await db.users.add({
        journalName,
        passwordHash,
        securityQuestion,
        answerHash,
        createdAt: new Date().toISOString(),
      });

      await db.activityLogs.add({
        userId,
        action: 'Account created',
        timestamp: new Date().toLocaleString(),
      });

      sessionStorage.setItem('pedexpress_key', password);
      router.push('/dashboard');
      
    } catch (err) {
      setError("Failed to create account. Please try again.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) return;

    try {
      const inputHash = await hashString(password);

      if (user.passwordHash === inputHash) {
        await db.activityLogs.add({
          userId: user.id!,
          action: 'Logged in',
          timestamp: new Date().toLocaleString(),
        });
        
        sessionStorage.setItem('pedexpress_key', password);
        router.push('/dashboard');
      } else {
        setError("Incorrect password.");
      }
    } catch (err) {
      setError("Login failed.");
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) return;

    if (password !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    try {
      const inputAnswerHash = await hashString(securityAnswer.toLowerCase().trim());

      if (user.answerHash === inputAnswerHash) {
        const newPasswordHash = await hashString(password);

        await db.users.update(user.id!, {
          passwordHash: newPasswordHash
        });

        await db.entries.clear();

        await db.activityLogs.add({
          userId: user.id!,
          action: 'Password reset & entries cleared',
          timestamp: new Date().toLocaleString(),
        });

        sessionStorage.setItem('pedexpress_key', password);
        router.push('/dashboard');
      } else {
        setError("Incorrect security answer.");
      }
    } catch (err) {
      setError("Failed to reset password.");
    }
  };

  if (!isMounted || users === undefined) {
    return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500">Loading environment...</div>;
  }

  // === UI: SIGN UP (If no account exists) ===
  if (users.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-lg border border-slate-100">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-teal-700 tracking-tight mb-2">PEDExpress</h1>
            <p className="text-sm text-slate-500 font-medium">Express freely & securely.</p>
          </div>
          
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100">{error}</div>}
          
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Journal Name</label>
              <input type="text" required value={journalName} onChange={e => setJournalName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all text-slate-800" placeholder="e.g., Mystic" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all text-slate-800" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Confirm</label>
                <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all text-slate-800" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Security Question</label>
              <select value={securityQuestion} onChange={e => setSecurityQuestion(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all text-slate-800">
                {SECURITY_QUESTIONS.map((q, i) => (
                  <option key={i} value={q}>{q}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Answer</label>
              <input type="text" required value={securityAnswer} onChange={e => setSecurityAnswer(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all text-slate-800" placeholder="Keep this memorable..." />
            </div>
            
            <button type="submit" className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 mt-4">
              Create Journal
            </button>
          </form>
        </div>
      </main>
    );
  }

  // === UI: PASSWORD RECOVERY ===
  if (isRecovering && user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg border border-slate-100">
          <div className="text-center mb-6">
            <h2 className="text-xl font-extrabold text-slate-800 mb-1">Account Recovery</h2>
            <p className="text-sm text-slate-500 font-medium">Resetting access for <span className="font-bold text-teal-700">{user.journalName}</span></p>
          </div>

          <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-xs text-amber-800 font-medium text-center leading-relaxed">
              <span className="font-bold">Security Notice:</span> Resetting your password will permanently delete your previous entries, as they are cryptographically locked with your old password.
            </p>
          </div>

          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-center text-sm font-medium rounded-lg border border-red-100">{error}</div>}

          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Question</label>
              <p className="text-sm font-medium text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100">{user.securityQuestion}</p>
            </div>
            <div>
              <input type="text" required placeholder="Your Answer" value={securityAnswer} onChange={e => setSecurityAnswer(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all text-slate-800" />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <input type="password" required placeholder="New Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all text-slate-800 text-sm" />
              <input type="password" required placeholder="Confirm" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all text-slate-800 text-sm" />
            </div>
            
            <button type="submit" className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all mt-2">
              Reset & Wipe Journal
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <button onClick={() => { setIsRecovering(false); setError(''); setPassword(''); }} className="text-sm text-slate-400 hover:text-slate-600 font-medium transition-colors">
              Cancel & go back
            </button>
          </div>
        </div>
      </main>
    );
  }

  // === UI: LOG IN (If account exists) ===
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 font-sans">
      <div className="w-full max-w-sm rounded-2xl bg-white p-10 shadow-lg border border-slate-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-100 text-teal-600 mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 mb-1">Welcome Back, {user?.journalName}</h2>          <p className="text-sm text-slate-500 font-medium">Enter your password to unlock.</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-center text-sm font-medium rounded-lg border border-red-100">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <input type="password" required placeholder="Journal Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all text-slate-800 text-center tracking-widest font-mono" />
          </div>
          <button type="submit" className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5">
            Unlock Journal
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button onClick={() => { setIsRecovering(true); setError(''); setPassword(''); }} className="text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors">
            Forgot password?
          </button>
        </div>
      </div>
    </main>
  );
}