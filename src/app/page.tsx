import { getCounter } from './actions/counter';
import Counter from './components/Counter';

// No cache for the main page so getCounter() is executed in every request.
export const revalidate = 0;

export default async function HomePage() {
  const counter = await getCounter();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold mb-6">Persistent counter</h1>
      <Counter initialValue={counter.value} lastUpdated={counter.last_updated}/>
    </main>
  );
}