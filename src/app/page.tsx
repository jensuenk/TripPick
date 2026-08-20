"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Heart, Mountain, Palmtree, Sparkles, Users } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="gradient-hero relative flex min-h-dvh flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -top-10 left-[10%] text-sky-300/40"
          animate={{ y: [0, 12, 0], rotate: [0, 6, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Mountain className="size-28" strokeWidth={1} />
        </motion.div>
        <motion.div
          className="absolute top-24 right-[8%] text-indigo-300/30"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Mountain className="size-40" strokeWidth={1} />
        </motion.div>
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/30">
            <Mountain className="size-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">TripPick</span>
        </div>
        <Link href="/new">
          <Button size="sm" variant="secondary">
            Reis maken
          </Button>
        </Link>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-5 pb-16 pt-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-sky-700 shadow-sm ring-1 ring-sky-200 backdrop-blur"
        >
          <Sparkles className="size-3.5" />
          Gemaakt voor familievakanties
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="max-w-2xl text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl"
        >
          Kies samen de perfecte{" "}
          <span className="bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent">
            familiebestemming
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.12 }}
          className="mt-5 max-w-xl text-base text-muted-foreground text-pretty sm:text-lg"
        >
          Verzamel bestemmingen, deel een privélink met je groep,
          vergelijk ski- of zomervakanties en stem samen tot iedereen
          akkoord is.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2 }}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Link href="/new">
            <Button
              size="lg"
              className="h-12 gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 px-6 text-base text-white shadow-xl shadow-sky-500/30 hover:from-sky-600 hover:to-indigo-700"
            >
              Reis maken
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-14 grid w-full max-w-3xl gap-3 sm:grid-cols-3"
        >
          {[
            {
              icon: Users,
              title: "Geen login nodig",
              text: "Open de link, kies je naam, en je bent erbij.",
            },
            {
              icon: Heart,
              title: "De favoriete bestemming",
              text: "Leuk, misschien of nee — zie wat de groep wil.",
            },
            {
              icon: Palmtree,
              title: "Ski én zomer",
              text: "Liften, stranden, vluchten en prijzen — in één oogopslag.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl bg-white/75 p-4 text-left shadow-sm ring-1 ring-white/80 backdrop-blur"
            >
              <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <item.icon className="size-4" />
              </div>
              <div className="font-semibold">{item.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </motion.div>
      </section>
    </main>
  );
}
