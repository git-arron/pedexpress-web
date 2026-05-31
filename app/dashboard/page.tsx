'use client';

import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, JournalEntry } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { encryptText, decryptText } from '@/lib/encryption';

const EMOTIONS = [
  { label: 'Happy', emoji: '😊' },
  { label: 'Excited', emoji: '🤩' },
  { label: 'Love', emoji: '🥰' },
  { label: 'Calm', emoji: '😌' },
  { label: 'Proud', emoji: '😎' },
  { label: 'Amused', emoji: '😆' },
  { label: 'Tired', emoji: '😴' },
  { label: 'Sad', emoji: '😢' },
  { label: 'Lonely', emoji: '🥀' },
  { label: 'Anxious', emoji: '😰' },
  { label: 'Fearful', emoji: '😨' },
  { label: 'Frustrated', emoji: '😤' },
  { label: 'Angry', emoji: '😠' },
  { label: 'Confused', emoji: '🤔' },
];

const WEATHER = [
  { label: 'Sunny', emoji: '☀️' },
  { label: 'Partly Cloudy', emoji: '⛅' },
  { label: 'Cloudy', emoji: '☁️' },
  { label: 'Rainy', emoji: '🌧️' },
  { label: 'Stormy', emoji: '⛈️' },
  { label: 'Foggy', emoji: '🌫️' },
  { label: 'Windy', emoji: '💨' },
  { label: 'Clear Night', emoji: '🌙' },
];

const PedExpressLogo = () => (
  <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mr-3 drop-shadow-sm">
    <rect width="512" height="512" rx="120" fill="#0F766E"/>
    <path d="M176 150H300C376 150 376 270 300 270H236V362" stroke="white" strokeWidth="52" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="340" cy="330" r="36" fill="#FBBF24"/>
  </svg>
);

export default function Dashboard() {
  const router = useRouter();
  
  const [isMounted, setIsMounted] = useState(false);
  const [sessionPassword, setSessionPassword] = useState('');
  
  // New state for the search bar
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    setIsMounted(true);
    const key = sessionStorage.getItem('pedexpress_key');
    if (key) {
      setSessionPassword(key);
    } else {
      router.push('/');
    }
  }, [router]);

  const entries = useLiveQuery(() => db.entries.reverse().toArray());
  const users = useLiveQuery(() => db.users.toArray());
  
  const [activeEntry, setActiveEntry] = useState<JournalEntry | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [emotion, setEmotion] = useState('Happy');
  const [weather, setWeather] = useState('Sunny');

  const userName = users && users.length > 0 ? users[0].journalName : '';
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const handleNewEntry = () => {
    setActiveEntry(null);
    setTitle('');
    setContent('');
    setEmotion('Happy');
    setWeather('Sunny');
  };

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) return;

    const encryptedContent = await encryptText(content, sessionPassword);

    if (activeEntry && activeEntry.id) {
      await db.entries.update(activeEntry.id, {
        title,
        content: encryptedContent,
        emotion,
        weather,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await db.entries.add({
        userId: 1,
        title: title || 'Untitled Entry',
        content: encryptedContent,
        emotion,
        weather,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      await db.activityLogs.add({
        userId: 1,
        action: 'Wrote an entry',
        timestamp: new Date().toLocaleString(),
      });
    }
    
    handleNewEntry();
  };

  const handleDelete = async (id: number) => {
    await db.entries.delete(id);
    await db.activityLogs.add({
      userId: 1,
      action: 'Deleted an entry',
      timestamp: new Date().toLocaleString(),
    });
    handleNewEntry();
  };

  const selectEntry = async (entry: JournalEntry) => {
    setActiveEntry(entry);
    setTitle(entry.title);
    setEmotion(entry.emotion);
    setWeather(entry.weather);
    
    const decryptedContent = await decryptText(entry.content, sessionPassword);
    setContent(decryptedContent);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('pedexpress_key');
    router.push('/');
  };

  if (!isMounted) return null;
  if (entries === undefined || users === undefined) return <div className="flex h-screen items-center justify-center text-slate-500">Loading workspace...</div>;

  const filteredEntries = entries.filter(entry => 
    entry.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      <div className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10 flex-shrink-0">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center">
            <PedExpressLogo />
            <h1 className="font-extrabold text-xl tracking-tight text-teal-800">PEDExpress</h1>
          </div>
          <button onClick={handleNewEntry} className="px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 font-medium rounded-lg text-sm transition-colors border border-teal-100">
            + New
          </button>
        </div>
        
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">🔍</span>
            <input 
              type="text" 
              placeholder="Search journals..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center opacity-60">
              <span className="text-4xl mb-3">📝</span>
              <p className="text-slate-500 text-sm font-medium">No entries yet.</p>
              <p className="text-slate-400 text-xs mt-1">Start expressing yourself freely.</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center opacity-60">
              <span className="text-4xl mb-3">🔍</span>
              <p className="text-slate-500 text-sm font-medium">No matching entries.</p>
              <p className="text-slate-400 text-xs mt-1">Try a different keyword.</p>
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const activeEmote = EMOTIONS.find(e => e.label === entry.emotion)?.emoji || '😊';
              const activeWeath = WEATHER.find(w => w.label === entry.weather)?.emoji || '☀️';
              
              return (
                <div 
                  key={entry.id} 
                  onClick={() => selectEntry(entry)}
                  className={`p-4 border-b border-slate-50 cursor-pointer transition-all duration-200 ${
                    activeEntry?.id === entry.id 
                    ? 'bg-teal-50/50 border-l-4 border-l-teal-500' 
                    : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                  }`}
                >
                  <h3 className="font-bold text-slate-800 truncate mb-1">{entry.title}</h3>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-500 font-medium">{new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    <div className="flex gap-1 text-sm bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100">
                      <span title={entry.emotion}>{activeEmote}</span>
                      <span className="text-slate-300">|</span>
                      <span title={entry.weather}>{activeWeath}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
           <button onClick={handleLogout} className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
             Lock & Log Out
           </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
        
        <div className="px-8 py-6 border-b border-slate-100 bg-white shadow-sm z-10">
          <div className="flex flex-col gap-2 w-full max-w-4xl mx-auto">
            <div className="flex items-center gap-4 w-full">
              <span className="text-sm font-bold text-slate-400 whitespace-nowrap uppercase tracking-wider w-36 flex-shrink-0">I'm feeling...</span>
              <div className="flex gap-2 overflow-x-auto py-2 px-1 w-full hide-scrollbar">
                {EMOTIONS.map((emo) => (
                  <button
                    key={emo.label}
                    onClick={() => setEmotion(emo.label)}
                    title={emo.label}
                    className={`flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full text-xl transition-all ${emotion === emo.label ? 'bg-teal-100 shadow-sm ring-2 ring-teal-400 z-10' : 'hover:bg-slate-100 grayscale opacity-40 hover:grayscale-0 hover:opacity-100'}`}
                  >
                    {emo.emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 w-full">
              <span className="text-sm font-bold text-slate-400 whitespace-nowrap uppercase tracking-wider w-36 flex-shrink-0">The weather is...</span>
              <div className="flex gap-2 overflow-x-auto py-2 px-1 w-full hide-scrollbar">
                {WEATHER.map((wea) => (
                  <button
                    key={wea.label}
                    onClick={() => setWeather(wea.label)}
                    title={wea.label}
                    className={`flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full text-xl transition-all ${weather === wea.label ? 'bg-amber-100 shadow-sm ring-2 ring-amber-400 z-10' : 'hover:bg-slate-100 grayscale opacity-40 hover:grayscale-0 hover:opacity-100'}`}
                  >
                    {wea.emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 px-12 py-10 overflow-y-auto w-full max-w-4xl mx-auto pb-32">
          <p className="flex items-center gap-2 text-teal-600 text-sm font-bold mb-4 tracking-wide uppercase">
            <span>{greeting}{userName ? `, ${userName}` : ''}</span>
            <span className="text-teal-300">|</span>
            <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </p>

          <input
            type="text"
            placeholder="Give your entry a title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-4xl font-extrabold text-slate-800 border-none outline-none mb-8 bg-transparent placeholder-slate-200 transition-colors focus:placeholder-slate-100"
          />
          <textarea
            placeholder="Write from the heart... your thoughts are encrypted and secure."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-[60vh] text-lg text-slate-700 border-none outline-none resize-none bg-transparent placeholder-slate-300 leading-relaxed tracking-wide"
          />
        </div>

        <div className="absolute bottom-8 right-12 flex gap-3 z-20">
          {activeEntry && (
            <button onClick={() => handleDelete(activeEntry.id!)} className="px-6 py-3 text-sm font-bold text-red-500 bg-white border border-red-100 hover:bg-red-50 rounded-full shadow-lg transition-all transform hover:-translate-y-1">
              Delete Entry
            </button>
          )}
          <button onClick={handleSave} className="px-8 py-3 text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
            Save Entry
          </button>
        </div>

      </div>
    </div>
  );
}