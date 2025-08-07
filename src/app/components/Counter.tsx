'use client';

import { useEffect, useState, useTransition } from 'react';
import { incrementCounter, decrementCounter } from '../actions/counter';
import { supabase } from '../../lib/supabaseClient';

type CounterProps = {
  readonly initialValue: number;
  readonly lastUpdated: Date;
}

export default function Counter({ initialValue, lastUpdated }: CounterProps) {
  const [counter, setCounter] = useState<{ value: number; last_updated: Date }>({
    value: initialValue,
    last_updated: lastUpdated,
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('realtime-counter')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Counter',
        },
        (payload) => {
          setCounter({
            value: payload.new.value,
            last_updated: new Date(payload.new.last_updated),
          });

          // Mostrar mensaje solo si fue reseteado por inactividad
          const lastUpdated = new Date(payload.new.last_updated);
          const now = new Date();
          const diffMinutes = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);
          if (diffMinutes < 1 && payload.new.value === 0) {
            setInfo('The counter has automatically been reset for inactivity.');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
          setCounter({ value: data.value, last_updated: new Date(data.last_updated) });
          setInfo('Counter updated!');
        })
        .catch(() =>
          setError(
            action === 'inc' ? 'Error incrementing' : 'Error decrementing'
          )
        );
    });
  };

  if (error) return <div className="text-red-600">{error}</div>;

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
        Last update: {counter.last_updated instanceof Date ? counter.last_updated.toLocaleString() : counter.last_updated}
      </div>
    </div>
  );
}