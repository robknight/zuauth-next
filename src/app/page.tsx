"use client";
import { useZupass } from '@/zupass'
import Image from 'next/image'

export default function Home() {
  const { login, ticketData } = useZupass();
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="max-w-xl w-full">
        <h1 className="my-8 text-xl font-semibold">Login Example</h1>
        <div className="my-8">
          <button className="rounded border-1 border-solid ring-1 ring-slate-500 border-slate-200 bg-slate-700 text-slate-100 hover:bg-slate-800 py-1 px-4" onClick={login}>Login</button>
        </div>
        {ticketData && <div className="my-8">
          <pre>{JSON.stringify(ticketData)}</pre>
        </div>}
      </div>
    </main>
  )
}
