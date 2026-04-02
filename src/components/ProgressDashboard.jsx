import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// --- HELPERS ---

/**
 * Parses a string like "100kg" or "225lbs" into a number (kg).
 * Defaults to kg if no unit found.
 */
const parseToKg = (weightStr) => {
  if (!weightStr) return 0;
  const num = parseFloat(weightStr);
  if (isNaN(num)) return 0;
  
  if (weightStr.toLowerCase().includes('lb')) {
    return num * 0.453592;
  }
  return num;
};

/**
 * Calculates total volume in kg for a single workout log.
 */
const calculateLogVolume = (log) => {
  let volume = 0;
  (log.exercises || []).forEach((ex) => {
    (ex.actualSets || []).forEach((set) => {
      const w = parseToKg(set.weight);
      const r = parseInt(set.reps) || 0;
      volume += w * r;
    });
  });
  return Math.round(volume);
};

/**
 * Calculates streaks from an array of unique sorted date strings (YYYY-MM-DD).
 */
const getStreaks = (dates) => {
  if (dates.length === 0) return { current: 0, best: 0 };
  
  let best = 0;
  let current = 0;
  let tempStreak = 1;
  
  const today = new Date();
  today.setHours(0,0,0,0);
  
  // Sort dates descending for current streak calculation
  const sortedDates = [...dates].sort((a, b) => new Date(b) - new Date(a));
  
  // Check if worked out today or yesterday (to keep current streak alive)
  const lastWorkoutDate = new Date(sortedDates[0]);
  const diffDays = Math.ceil((today - lastWorkoutDate) / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 1) {
    current = 1;
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const d1 = new Date(sortedDates[i]);
      const d2 = new Date(sortedDates[i+1]);
      const diff = Math.round((d1 - d2) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        current++;
      } else {
        break;
      }
    }
  }

  // Best streak (ascending check)
  const ascDates = [...dates].sort((a,b) => new Date(a) - new Date(b));
  let running = 1;
  for (let i = 0; i < ascDates.length - 1; i++) {
    const d1 = new Date(ascDates[i]);
    const d2 = new Date(ascDates[i+1]);
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      running++;
    } else {
      best = Math.max(best, running);
      running = 1;
    }
  }
  best = Math.max(best, running, current);

  return { current, best };
};

// --- COMPONENTS ---

export default function ProgressDashboard({ clientId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [containerWidth, setContainerWidth] = useState(0);
  
  const targetUid = clientId || auth.currentUser?.uid;

  // Use a callback ref to ensure we catch the element even if it mounts late
  const containerRef = React.useCallback(node => {
    if (node !== null) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          setContainerWidth(entry.contentRect.width);
        }
      });
      resizeObserver.observe(node);
      // Clean up is harder with simple callback refs, but for this component 
      // which lives on the dashboard, it's safe.
    }
  }, []);

  useEffect(() => {
    if (!targetUid) return;

    const q = query(
      collection(db, "workoutLogs"),
      where("clientId", "==", targetUid),
      orderBy("completedAt", "desc")
    );

    // If a trainer is viewing a client, we must filter by trainerId to satisfy security rules
    // (unless we want trainers to see logs from other trainers, which requires a rules update)
    let finalQuery = q;
    if (clientId && auth.currentUser?.uid !== clientId) {
      finalQuery = query(q, where("trainerId", "==", auth.currentUser.uid));
    }

    const unsubscribe = onSnapshot(finalQuery, (snapshot) => {
      const logList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Normalize date to YYYY-MM-DD for consistency
        dateStr: doc.data().completedAt?.toDate?.().toISOString().split('T')[0] || ""
      }));
      setLogs(logList);
      setLoading(false);
    }, (error) => {
      console.warn("Analytics permission denied or error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [targetUid]);

  // Derived Data
  const stats = useMemo(() => {
    const uniqueDates = Array.from(new Set(logs.map(l => l.dateStr).filter(d => d)));
    const streaks = getStreaks(uniqueDates);
    
    // Chart data (Last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const chartData = logs
      .filter(l => l.completedAt?.toDate?.() >= thirtyDaysAgo)
      .map(l => ({
        date: l.completedAt?.toDate?.().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        volume: calculateLogVolume(l),
        rawDate: l.completedAt?.toDate?.()
      }))
      .sort((a, b) => a.rawDate - b.rawDate);

    // Heatmap data (Last 90 days)
    const ninetyDays = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      ninetyDays.push({
        date: ds,
        active: uniqueDates.includes(ds)
      });
    }

    // Personal Records (MAP)
    // We use a Map for O(1) lookups/updates while iterating through logs
    const prMap = new Map();
    logs.forEach(log => {
      (log.exercises || []).forEach(ex => {
        const exerciseName = ex.name?.trim() || "Unknown Exercise";
        const maxWeightInLog = (ex.actualSets || []).reduce((max, set) => {
          const w = parseToKg(set.weight);
          return Math.max(max, w);
        }, 0);

        if (!prMap.has(exerciseName) || maxWeightInLog > prMap.get(exerciseName)) {
          prMap.set(exerciseName, maxWeightInLog);
        }
      });
    });

    const prs = Array.from(prMap.entries())
      .filter(([name, weight]) => weight > 0)
      .map(([name, weight]) => ({ name, weight }))
      .sort((a, b) => b.weight - a.weight);

    return { streaks, chartData, ninetyDays, prs };
  }, [logs]);

  if (loading) return <div className="p-4 text-center">Loading Analytics...</div>;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. STREAKS SECTION */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <span className="text-3xl mb-1">🔥</span>
          <span className="text-2xl font-bold text-orange-600">{stats.streaks.current}</span>
          <span className="text-xs text-gray-500 uppercase font-semibold">Current Streak</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <span className="text-3xl mb-1">🏆</span>
          <span className="text-2xl font-bold text-blue-600">{stats.streaks.best}</span>
          <span className="text-xs text-gray-500 uppercase font-semibold">Best Streak</span>
        </div>
      </div>

      {/* 2. STRENGTH CHART */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
          📈 Strength Progress <span className="text-sm font-normal text-gray-400">(Volume in kg)</span>
        </h3>
        <div ref={containerRef} style={{ width: '100%', minHeight: 256, minWidth: 0, position: 'relative' }}>
          {containerWidth > 0 && stats.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={256}>
              <LineChart data={stats.chartData} margin={{ left: -20, right: 10, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  fontSize={12} 
                  tick={{ fill: '#999' }} 
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  fontSize={12} 
                  tick={{ fill: '#999' }} 
                  axisLine={false} 
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="#4F46E5" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#4F46E5' }} 
                  activeDot={{ r: 6 }} 
                  animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : !loading && stats.chartData.length === 0 ? (
            <div style={{ height: 256 }} className="flex items-center justify-center text-gray-400 text-sm italic">
              No workout data for the last 30 days
            </div>
          ) : (
            <div style={{ height: 256 }} className="flex items-center justify-center text-gray-300 text-sm animate-pulse">
              Measuring...
            </div>
          )}
        </div>
      </div>

      {/* 3. HEATMAP SECTION */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold mb-4 text-gray-800">🗓️ Workout Frequency <span className="text-sm font-normal text-gray-400">(Last 90 days)</span></h3>
        <div className="grid grid-cols-10 sm:grid-cols-13 lg:grid-cols-18 gap-2">
          {stats.ninetyDays.map((day, i) => (
            <div 
              key={i}
              title={day.date}
              className={`aspect-square rounded-sm ${day.active ? 'bg-green-500' : 'bg-gray-100'} transition-all hover:scale-110`}
            />
          ))}
        </div>
        <div className="mt-4 flex items-center justify-end gap-2 text-xs text-gray-400">
          <span>Less</span>
          <div className="w-3 h-3 bg-gray-100 rounded-sm" />
          <div className="w-3 h-3 bg-green-500 rounded-sm" />
          <span>More</span>
        </div>
      </div>

      {/* 4. PERSONAL RECORDS (MAP OPTIMIZED) */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
          🏆 Personal Records <span className="text-sm font-normal text-gray-400">(All-time Max)</span>
        </h3>
        {stats.prs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stats.prs.slice(0, 6).map((pr, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="font-medium text-gray-700">{pr.name}</span>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                  {Math.round(pr.weight)} kg
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400 text-sm italic py-4 text-center">
            Log workouts to see your Hall of Fame records!
          </div>
        )}
      </div>
    </div>
  );
}

// --- TRAINER VIEW COMPONENT ---

export function ClientProgressCard({ clientId }) {
  return (
    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-bold text-gray-700">Client Gains Snapshot</h4>
        <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
          LIVE ANALYTICS
        </div>
      </div>
      <ProgressDashboard clientId={clientId} />
    </div>
  );
}
