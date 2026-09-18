'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';

const features = [
  { title: 'Owner verification', text: 'Build a clear verification trail before a property can move through the listing workflow.' },
  { title: 'Safer rental discovery', text: 'Give renters useful property information while clearly separating verification signals from legal ownership.' },
  { title: 'Human review + AI assistance', text: 'Use AI to organize evidence and surface risk signals while keeping important decisions reviewable.' },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <nav className="flex items-center justify-between">
            <Link href="/" className="text-xl font-extrabold tracking-tight text-white">RentSafe <span className="text-indigo-300">AI</span></Link>
            <Link href="/login"><Button className="bg-white text-indigo-900 hover:bg-indigo-50">Sign in</Button></Link>
          </nav>
          <div className="max-w-3xl py-20 sm:py-24">
            <span className="inline-flex rounded-full border border-indigo-300/30 bg-white/10 px-3 py-1 text-sm font-semibold text-indigo-100">Trust-first rental verification</span>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-white sm:text-6xl">Rent with more confidence. List with a clearer verification journey.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-indigo-100">RentSafe AI helps property owners organize verification and helps renters understand available trust signals—without treating AI as proof of legal ownership.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/login"><Button className="bg-white text-indigo-900 hover:bg-indigo-50">Get started with OTP →</Button></Link>
              <a href="#how-it-works" className="rounded-lg border border-white/20 px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-white/10">See how it works</a>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-wider text-indigo-600">Built for clarity</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">One place for the rental verification journey</h2>
          <p className="mt-3 text-slate-600">Owners, renters, and reviewers get focused workflows instead of a confusing collection of forms.</p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="h-full">
              <CardBody className="h-full p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-lg font-bold text-indigo-700">✓</div>
                <h3 className="text-lg font-bold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{feature.text}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-indigo-600">For property owners</p>
            <h2 className="mt-2 text-2xl font-bold">Complete verification, then build your listing.</h2>
            <p className="mt-3 text-slate-600">Your dashboard shows what is complete, what needs attention, and when you can move to the next step.</p>
            <Link href="/login"><Button className="mt-5">Open owner portal</Button></Link>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-slate-600">For reviewers</p>
            <h2 className="mt-2 text-2xl font-bold">Review evidence with an auditable workflow.</h2>
            <p className="mt-3 text-slate-600">Reviewer tools are kept separate from public rental discovery so sensitive verification work stays in the appropriate role.</p>
            <Link href="/login"><Button variant="secondary" className="mt-5">Open secure login</Button></Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <span>© 2026 RentSafe AI</span>
        <span>AI assists verification; it does not independently establish legal ownership.</span>
      </footer>
    </main>
  );
}