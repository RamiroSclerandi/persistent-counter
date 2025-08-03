'use client';

import { useEffect, useState, useTransition } from 'react';
import { getCounter, incrementCounter, decrementCounter } from '../actions/counter';

type CounterType = {
  value: number;
  last_updated: string;
};

export default function Counter() {
  const [counter, setCounter] = useState<CounterType | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Initial fetch of the counter value in the component mount
  useEffect(() => {
    getCounter()
      .then((data) => {
        setCounter({ value: data.value, last_updated: String(data.last_updated) });
        // If it was reset, inform the user
        const lastUpdated = new Date(data.last_updated);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);
        if (diffMinutes < 1 && data.value === 0) {
          setInfo('The counter has automatically been reset for inactivity.');
        }
      })
      .catch(() => setError('Error loading counter'));
  }, []);

  // Clear info message after 5 seconds
  useEffect(() => {
    if (info) {
      const timer = setTimeout(() => setInfo(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [info]);

  // Function to handle increment and decrement actions
  const handleUpdate = async (action: 'inc' | 'dec') => {
    setError(null);
    setInfo(null);
    startTransition(() => {
      const actionFn = action === 'inc' ? incrementCounter : decrementCounter;
      actionFn()
        .then((data) => {
          setCounter({ value: data.value, last_updated: String(data.last_updated) });
          setInfo('Counter updated!');
        })
        .catch(() => setError(
          action === 'inc' ? 'Error incrementing' : 'Error decrementing'
        ));
    });
  };

  if (error) return <div className="text-red-600">{error}</div>;
  if (!counter) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="animate-pulse text-2xl">Loading counter...</div>
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-4xl font-mono">{counter.value}</div>
      <div className="flex gap-2">
        <button
          className="bg-blue-500 px-4 py-2 rounded text-white disabled:opacity-50"
          onClick={() => handleUpdate('inc')}
          disabled={isPending}
        >
          +1
        </button>
        <button
          className="bg-red-500 px-4 py-2 rounded text-white disabled:opacity-50"
          onClick={() => handleUpdate('dec')}
          disabled={isPending || counter.value === 0}
        >
          -1
        </button>
      </div>
      {isPending && (
        <div className="flex items-center gap-2 text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          Updating…
        </div>
      )}
      {info && <div className="text-green-600">{info}</div>}
      <div className="text-sm text-gray-500">
        Last update: {new Date(counter.last_updated).toLocaleString()}
      </div>
    </div>
  );
}