"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

const ROTATING_WORDS = [
  "Propósito", "Ingenio", "Perseverancia", "Disciplina",
  "Resiliencia", "Constancia", "Pasión", "Visión",
  "Liderazgo", "Responsabilidad", "Compromiso", "Empatía", "Decisión"
];

const APPLY_URL = "/apply";

function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const now = new Date().getTime();
      const diff = targetDate.getTime() - now;
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  const pad = (n: number) => String(n).padStart(2, "0");
  const items = [
    { label: "Días", value: pad(timeLeft.days) },
    { label: "Hrs", value: pad(timeLeft.hours) },
    { label: "Min", value: pad(timeLeft.minutes) },
    { label: "Seg", value: pad(timeLeft.seconds) },
  ];

  return (
    <div className="flex gap-3">
      {items.map(({ label, value }) => (
        <div key={label} className="flex flex-col items-center">
          <span className="text-2xl font-bold text-[#00e5c0] tabular-nums">{value}</span>
          <span className="text-xs text-white/60 uppercase tracking-widest">{label}</span>
        </div>
      ))}
    </div>
  );
}

function WordCarousel() {
  const [wordIdx, setWordIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [phase, setPhase] = useState<"typing" | "pause" | "deleting">("typing");

  useEffect(() => {
    const word = ROTATING_WORDS[wordIdx];

    if (phase === "typing") {
      if (displayed.length < word.length) {
        const t = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 60);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setPhase("pause"), 1400);
        return () => clearTimeout(t);
      }
    }

    if (phase === "pause") {
      const t = setTimeout(() => setPhase("deleting"), 200);
      return () => clearTimeout(t);
    }

    if (phase === "deleting") {
      if (displayed.length > 0) {
        const t = setTimeout(() => setDisplayed(d => d.slice(0, -1)), 35);
        return () => clearTimeout(t);
      } else {
        setWordIdx(i => (i + 1) % ROTATING_WORDS.length);
        setPhase("typing");
      }
    }
  }, [phase, displayed, wordIdx]);

  return (
    <span className="text-[#00e5c0] inline-flex items-center">
      {displayed}
      <span className="ml-1 w-[3px] h-[0.85em] bg-[#00e5c0] inline-block animate-pulse rounded-sm" />
    </span>
  );
}

export default function LandingPage() {
  const programStart = new Date("2026-05-20T12:00:00-04:00");

  return (
    <div className="bg-[#0a0e1a] text-white min-h-screen font-[var(--font-montserrat)]">

      {/* ── Top bar ── */}
      <div className="bg-[#00e5c0]/10 border-b border-[#00e5c0]/20 py-2 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
          <span className="text-white/80">
            <strong className="text-white">Modo Fundraising 2026</strong> — Postulaciones abiertas
          </span>
          <CountdownTimer targetDate={programStart} />
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-[#0a0e1a]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Image src="/logo-mf.png" alt="Modo Fundraising" width={80} height={50} className="object-contain brightness-0 invert" />
          <div className="hidden md:flex items-center gap-6 text-sm text-white/70">
            <a href="#programa" className="hover:text-white transition-colors">Programa</a>
            <a href="#requisitos" className="hover:text-white transition-colors">Requisitos</a>
            <a href="#ias" className="hover:text-white transition-colors">IAS</a>
            <a href="#equipo" className="hover:text-white transition-colors">Equipo</a>
          </div>
          <Link
            href={APPLY_URL}
            className="bg-[#00e5c0] hover:bg-[#00c9aa] text-[#0a0e1a] font-bold text-sm px-5 py-2 rounded-full transition-colors"
          >
            Postula aquí →
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a] via-[#0d1b3e] to-[#0a0e1a]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#00e5c020_0%,_transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-24 md:py-36">
          <div className="max-w-3xl">
            <Image src="/ifsp/master-logo.svg" alt="IFSP" width={480} height={120} className="object-contain mb-8 max-w-full" />
            <div className="inline-flex items-center gap-2 bg-[#00e5c0]/10 border border-[#00e5c0]/30 rounded-full px-4 py-1.5 text-sm text-[#00e5c0] mb-8">
              <span className="w-2 h-2 bg-[#00e5c0] rounded-full animate-pulse" />
              5ta edición · Inicia 20 de mayo 2026
            </div>
            <p className="text-xl md:text-2xl text-white/80 mb-4 font-medium">
              Diseña tu propia estrategia de fundraising y aprende las herramientas, técnicas y tácticas
              que usan los mejores para levantar ronda tras ronda.
            </p>
            <p className="text-white/60 text-lg mb-10">
              Si quieres levantar una ronda pre-seed, seed o Pre Serie A este año, déjanos ayudarte.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href={APPLY_URL}
                className="inline-flex items-center justify-center gap-2 bg-[#00e5c0] hover:bg-[#00c9aa] text-[#0a0e1a] font-bold text-lg px-8 py-4 rounded-xl transition-all shadow-[0_0_40px_#00e5c030]"
              >
                👉 Postula aquí
              </Link>
              <a
                href="#programa"
                className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 text-white font-semibold text-lg px-8 py-4 rounded-xl transition-colors"
              >
                Ver programa ↓
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <div className="border-y border-white/10 bg-white/5">
        <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: "+400", label: "Startups LatAm" },
            { value: "+US$180M", label: "Capital levantado" },
            { value: "5ta", label: "Edición" },
            { value: "6", label: "Meses de programa" },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="text-3xl font-black text-[#00e5c0]">{value}</div>
              <div className="text-white/50 text-sm mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Por qué el programa ── */}
      <section id="programa" className="max-w-6xl mx-auto px-4 py-24">
        <div className="grid md:grid-cols-2 gap-12 items-start mb-16">
          <div>
            <h2 className="text-4xl md:text-5xl font-black leading-tight">
              ¿Para qué<br />
              <span className="text-[#00e5c0]">creamos el IFSP?</span>
            </h2>
          </div>
          <div className="text-white/70 text-lg leading-relaxed pt-2">
            <strong className="text-white">Compartir el conocimiento colectivo</strong> aprendido,
            y desde la experiencia, enseñarlo a las nuevas generaciones de emprendedores, para que puedan{" "}
            <strong className="text-white">cumplir sus propósitos</strong>.
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { img: "/ifsp/hl-1.webp", text: "Aprende a levantar capital en este programa diseñado por Founders que lo han hecho con los VCs más relevantes del mundo y/o que han vendido compañías en valuaciones entre U$20M y +U$1B." },
            { img: "/ifsp/hl-2.webp", text: "Sube tu nivel de fundraising y suma a los mejores VC que podrías tener, según la etapa de tu startup." },
            { img: "/ifsp/hl-3.webp", text: "Adquiere conocimiento importantísimo para jugar el juego del VC y moverte en ligas mayores, y aprende como llevar tu startup a la valuación que merece." },
            { img: "/ifsp/hl-4.webp", text: "Inspírate con los founders más cracks del ecosistema, que fueron capaces de llevar a sus compañías al siguiente nivel." },
          ].map(({ img, text }) => (
            <div key={img} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#00e5c0]/30 hover:bg-[#00e5c0]/5 transition-all">
              <Image src={img} alt="" width={80} height={80} className="mb-4 object-contain" />
              <p className="text-white/70 text-sm leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA word carousel ── */}
      <section className="bg-gradient-to-r from-[#0d1b3e] to-[#0a0e1a] border-y border-white/10 py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="text-2xl md:text-3xl font-bold text-white/80 mb-2">Buscamos emprendedores con</div>
          <div className="text-5xl md:text-7xl font-black min-h-[1.2em] flex items-center justify-center">
            <WordCarousel />
          </div>
          <div className="text-2xl md:text-3xl font-bold text-white/80 mt-2 mb-10">Dispuestos a darlo todo</div>
          <Link
            href={APPLY_URL}
            className="inline-flex items-center gap-2 bg-[#00e5c0] hover:bg-[#00c9aa] text-[#0a0e1a] font-bold text-lg px-10 py-4 rounded-xl transition-all shadow-[0_0_40px_#00e5c030]"
          >
            👉 Postula aquí
          </Link>
        </div>
      </section>

      {/* ── Objetivos ── */}
      <section className="max-w-6xl mx-auto px-4 py-24">
        <h2 className="text-4xl md:text-5xl font-black mb-2">Objetivos</h2>
        <p className="text-[#00e5c0] text-3xl font-black mb-12">del Programa</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { img: "/ifsp/obj-a.webp", text: "Enseñarte a que tu compañía tenga un tamaño de interés mayor a lo que quieres levantar." },
            { img: "/ifsp/obj-b.webp", text: "Darte la posibilidad de que puedas escoger a los mejores inversores en tus próximas rondas." },
            { img: "/ifsp/obj-c.webp", text: "Hacer tu compañía más atractiva y visible en el ecosistema de los inversionistas." },
            { img: "/ifsp/obj-d.webp", text: "Construir las compañías que el planeta necesita." },
          ].map(({ img, text }) => (
            <div key={img} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-[#00e5c0]/40 transition-all flex flex-col items-center text-center gap-4">
              <Image src={img} alt="" width={80} height={80} className="object-contain" />
              <p className="text-white/70 text-sm leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Qué ganarás ── */}
      <section className="bg-white/5 border-y border-white/10 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-black mb-12 text-center">
            <span className="text-[#00e5c0]">¿Qué ganarás?</span>
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-6">
            {[
              { img: "/ifsp/icon-conocimiento.webp", label: "Conocimiento" },
              { img: "/ifsp/icon-networking.webp", label: "Network" },
              { img: "/ifsp/icon-comunidad.webp", label: "Comunidad" },
              { img: "/ifsp/icon-crecimiento.webp", label: "Crecimiento" },
              { img: "/ifsp/icon-visibilidad.webp", label: "Visibilidad" },
              { img: "/ifsp/icon-reconocimiento.webp", label: "Reconocimiento" },
            ].map(({ img, label }) => (
              <div key={label} className="flex flex-col items-center gap-3 text-center group">
                <div className="w-20 h-20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Image src={img} alt={label} width={80} height={80} className="object-contain" />
                </div>
                <span className="text-sm font-semibold text-white/80">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modalidad ── */}
      <section className="max-w-6xl mx-auto px-4 py-24">
        <div className="grid md:grid-cols-2 gap-12 items-start mb-12">
          <div>
            <h2 className="text-4xl md:text-5xl font-black leading-tight">
              Modalidad<br />
              <span className="text-[#00e5c0]">Online — live</span>
            </h2>
          </div>
          <p className="text-white/70 text-lg leading-relaxed pt-2">
            <span className="text-[#00e5c0] font-semibold">Nos encantaría hacerlo presencial.</span>{" "}
            Pero sería imposible darle un carácter global 🌎
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { value: "20 MAYO", label: "INICIO PROGRAMA" },
            { value: "6", label: "MESES" },
            { value: "ONLINE", label: "MODALIDAD" },
            { value: "$249 USD", label: "FEE MENSUAL", note: "(solo startups seleccionadas)" },
            { value: "MAR Y JUE", label: "CLASES LIVE" },
            { value: "12:00 GTM-4", label: "HORA CHILE" },
          ].map(({ value, label, note }) => (
            <div
              key={label}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center hover:border-[#00e5c0]/30 transition-all"
            >
              <div className="text-xl font-black text-[#00e5c0] leading-tight">{value}</div>
              <div className="text-white/60 text-xs mt-1 uppercase tracking-wider">{label}</div>
              {note && <div className="text-white/40 text-[10px] mt-1">{note}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ── Requisitos ── */}
      <section id="requisitos" className="bg-gradient-to-b from-[#0d1b3e]/50 to-[#0a0e1a] border-y border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-24">
          <div className="grid md:grid-cols-2 gap-16">
            <div>
              <h2 className="text-4xl md:text-5xl font-black mb-8">
                <span className="text-[#00e5c0]">Requisitos</span><br />para postular
              </h2>
              <ul className="space-y-4">
                {[
                  { bold: "Querer levantar una ronda entre $300K USD y $5M USD", rest: " durante este año." },
                  { bold: "No más del 50% de tu ronda", rest: " comprometida." },
                  { bold: "Runway mínimo de 6 meses", rest: " desde el inicio del programa." },
                  { bold: "Hablar y/o entender inglés", rest: ", algunas clases se dictarán en ese idioma." },
                  { bold: "Puedes postular en cualquier momento.", rest: " Comenzarás desde la fase en curso y podrás acceder a clases anteriores on demand." },
                  { bold: "Aceptar las House Rules", rest: " del programa." },
                ].map(({ bold, rest }) => (
                  <li key={bold} className="flex gap-3 items-start text-white/70">
                    <span className="text-[#00e5c0] mt-0.5 flex-shrink-0">✓</span>
                    <span><strong className="text-white">{bold}</strong>{rest}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={APPLY_URL}
                className="mt-8 inline-flex items-center gap-2 bg-[#00e5c0] hover:bg-[#00c9aa] text-[#0a0e1a] font-bold px-8 py-4 rounded-xl transition-all shadow-[0_0_40px_#00e5c030]"
              >
                👉 Postula aquí
              </Link>
            </div>

            <div>
              <h2 className="text-4xl md:text-5xl font-black mb-4">Variables</h2>
              <p className="text-[#00e5c0] text-2xl font-black mb-4">de selección</p>
              <p className="text-white/60 mb-8 text-sm">
                <span className="text-[#00e5c0]">Somos transparentes en lo que evaluamos</span> al momento de revisar
                las postulaciones para ayudarte a estar lo mejor preparado para ser seleccionado ⚡
              </p>
              <div className="space-y-4">
                {[
                  { title: "Mercado", desc: "La industria debe tener proyecciones de crecimiento y oportunidades de desarrollo." },
                  { title: "Equipo", desc: "Experiencia, cohesión, trayectoria y logros de los founders, asesores y quienes los avalan." },
                  { title: "Escalabilidad", desc: "El modelo de negocios debe permitir escalar de manera regional o global." },
                  { title: "Compromiso", desc: "Founders dedicados 100% que comprendan que levantar capital es un full time job." },
                ].map(({ title, desc }) => (
                  <div key={title} className="border border-white/10 rounded-xl p-5 flex gap-4 hover:border-[#00e5c0]/30 transition-colors">
                    <div className="text-[#00e5c0] font-black text-sm mt-0.5 w-28 flex-shrink-0">{title}</div>
                    <div className="text-white/60 text-sm leading-relaxed">{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── IAS ── */}
      <section id="ias" className="max-w-6xl mx-auto px-4 py-24">
        <div className="text-center mb-12">
          <p className="text-white/50 text-sm uppercase tracking-widest mb-2">Add-on exclusivo</p>
          <h2 className="text-4xl md:text-5xl font-black">
            Impacta Advisory Sessions
          </h2>
          <p className="text-[#00e5c0] text-2xl font-black">#IAS26</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <p className="text-white/70 leading-relaxed mb-4">
              Sesiones 1:1 personalizadas de 30 minutos semanales, en simultáneo al desarrollo del programa.
              El IAS implica tener al equipo de Impacta VC como <strong className="text-white">Advisory Board</strong> y
              parte activa de tu proceso de fundraising.
            </p>
            <p className="text-white/70 leading-relaxed">
              Precio: <strong className="text-[#00e5c0] text-xl">US$ 990 / mes</strong> · Cupos limitados
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="bg-[#00e5c0]/5 border border-[#00e5c0]/20 rounded-2xl p-6">
              <h4 className="font-bold text-[#00e5c0] mb-3">Beneficios</h4>
              <ul className="space-y-2 text-white/70 text-sm">
                {[
                  "Mayor posibilidad de éxito para levantar tu ronda",
                  "Private Slack channel",
                  "Database Access: red de Co-Inversores",
                  "Forward intro request con nuestra red",
                ].map(b => <li key={b} className="flex gap-2"><span className="text-[#00e5c0]">→</span>{b}</li>)}
              </ul>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h4 className="font-bold text-white/60 mb-3">El IAS no puede garantizar</h4>
              <ul className="space-y-2 text-white/50 text-sm">
                {[
                  "Una inversión desde Impacta VC",
                  "Introducciones con inversionistas",
                  "El levantamiento de la ronda",
                ].map(b => <li key={b} className="flex gap-2"><span>✕</span>{b}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Equipo ── */}
      <section id="equipo" className="bg-white/5 border-y border-white/10 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-black mb-2 text-center">Tu equipo de</h2>
          <p className="text-[#00e5c0] text-3xl font-black mb-12 text-center">Fundraising</p>
          <div className="grid sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
            {[
              { name: "Victor Lau", role: "Chief Financial Officer", company: "Impacta VC" },
              { name: "Corinne Lebrun", role: "Chief Purpose Officer", company: "Impacta VC" },
              { name: "Catalina Taricco", role: "COO — CMO", company: "Impacta VC" },
            ].map(({ name, role, company }) => (
              <div key={name} className="bg-[#0a0e1a] border border-white/10 rounded-2xl p-6 text-center hover:border-[#00e5c0]/30 transition-colors">
                <div className="w-16 h-16 rounded-full bg-[#00e5c0]/10 border border-[#00e5c0]/20 mx-auto mb-4 flex items-center justify-center text-2xl">
                  👤
                </div>
                <div className="font-bold text-white">{name}</div>
                <div className="text-[#00e5c0] text-xs mt-1">{role}</div>
                <div className="text-white/40 text-xs">{company}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Rockstar guests ── */}
      <section className="max-w-6xl mx-auto px-4 py-24">
        <div className="grid md:grid-cols-2 gap-12 items-start mb-12">
          <div>
            <h2 className="text-4xl md:text-5xl font-black leading-tight">
              Rockstar guests
              <br />
              <span className="text-[#00e5c0]">every week</span>
            </h2>
          </div>
          <p className="text-white/60 leading-relaxed pt-2">
            Invitamos semanalmente a personas reconocidas en el ecosistema, capaces de llevar a sus
            compañías al siguiente nivel o de tener la visión de invertir en empresas de alto valor.
          </p>
        </div>
        <div className="border border-white/10 rounded-2xl p-8 text-center bg-white/5">
          <p className="text-white/50 text-sm">Los rockstar guests de 2026 se anunciarán próximamente.</p>
          <p className="text-white/30 text-xs mt-2">Generaciones anteriores: +80 founders e inversores de clase mundial</p>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-gradient-to-b from-[#0d1b3e]/50 to-[#0a0e1a] py-24 text-center px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-black mb-4">¿Listo para<br /><span className="text-[#00e5c0]">levantar tu ronda?</span></h2>
          <p className="text-white/60 mb-10 text-lg">
            Únete a +400 startups LatAm que ya han levantado +US$180M con el programa.
          </p>
          <Link
            href={APPLY_URL}
            className="inline-flex items-center gap-2 bg-[#00e5c0] hover:bg-[#00c9aa] text-[#0a0e1a] font-black text-xl px-12 py-5 rounded-xl transition-all shadow-[0_0_60px_#00e5c040]"
          >
            👉 Postula aquí
          </Link>
          <p className="text-white/30 text-sm mt-4">Solo startups seleccionadas · Cupos limitados</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/30">
          <Image src="/logo-mf.png" alt="Modo Fundraising" width={60} height={38} className="object-contain brightness-0 invert opacity-40" />
          <p>© 2026 Impacta VC · hello@impacta.vc</p>
          <div className="flex gap-4">
            <span>Santiago</span>
            <span>·</span>
            <span>Montevideo</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
