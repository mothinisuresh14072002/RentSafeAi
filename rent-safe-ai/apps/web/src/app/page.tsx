import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans text-zinc-900 dark:text-zinc-50">
      <main className="flex-1 flex flex-col items-center justify-center p-8 sm:p-24 text-center">
        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6">
          Welcome to <span className="text-blue-600 dark:text-blue-400">RentSafeAi</span>
        </h1>
        <p className="max-w-2xl text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 mb-12">
          Your intelligent platform for safe and seamless property rentals. We leverage AI to make the renting experience better for both owners and reviewers.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-6 w-full max-w-md justify-center">
          <Link
            href="/owner"
            className="flex h-14 items-center justify-center rounded-full bg-blue-600 px-8 text-white font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
          >
            I'm a Property Owner
          </Link>
          <Link
            href="/reviewer"
            className="flex h-14 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-8 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            I'm a Reviewer
          </Link>
        </div>
      </main>
      
      <footer className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        &copy; {new Date().getFullYear()} RentSafeAi. All rights reserved.
      </footer>
    </div>
  );
}
