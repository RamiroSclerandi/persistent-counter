import Counter from './components/Counter';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold mb-6">Contador Persistente</h1>
      <Counter />
    </main>
  );
}