import { Nav } from "@/components/home/mobile-nav";
import { Footer } from "@/components/home/footer";

export const metadata = {
  title: "House Rules — Modo Fundraising 2026",
  description: "Las reglas que hacen que el programa funcione para todos.",
};

const CATEGORIAS = [
  {
    id: "comunidad",
    label: "Comunidad",
    icon: "🤝",
    reglas: [
      {
        nro: 1,
        titulo: "Lo que se habla en el programa, queda en el programa",
        desc: "Los founders comparten información sensible sobre sus rondas, números y procesos. Esa información es confidencial. No se comparte fuera del grupo ni en redes sociales.",
        obligatoria: true,
      },
      {
        nro: 2,
        titulo: "No hay competencia, hay comunidad",
        desc: "Varios founders pueden estar levantando rondas similares al mismo tiempo. Eso no los hace competidores — los hace aliados. Ayudarse entre founders es una de las fuentes de valor más grandes del programa.",
        obligatoria: true,
      },
    ],
  },
  {
    id: "asistencia",
    label: "Asistencia",
    icon: "📡",
    reglas: [
      {
        nro: 3,
        titulo: "Las clases son en vivo por una razón",
        desc: "El valor del programa está en la interacción, no solo en el contenido. Las clases en vivo tienen preguntas, debates y feedback en tiempo real que no existe en la grabación. Comprometete a estar.",
        obligatoria: false,
      },
      {
        nro: 4,
        titulo: "Si no podés asistir, avisá",
        desc: "La vida pasa. Si no podés estar en una sesión, avisá con anticipación en el grupo. No es obligatorio, pero es respeto al equipo y a tus compañeros.",
        obligatoria: false,
      },
    ],
  },
  {
    id: "misiones",
    label: "Misiones",
    icon: "🎯",
    reglas: [
      {
        nro: 5,
        titulo: "Las misiones son para hacerlas, no para tenerlas",
        desc: "Cada misión está diseñada para que la apliques directamente a tu proceso de fundraising. El que no hace las misiones no está en el programa — está viendo el programa. La diferencia es enorme.",
        obligatoria: true,
      },
      {
        nro: 6,
        titulo: "Compartir tu progreso en las sesiones Rockstar",
        desc: "Las sesiones Rockstar funcionan cuando todos comparten su avance. No tenés que tener todo perfecto — tenés que haber intentado. Compartir trabajo en progreso es parte del aprendizaje.",
        obligatoria: false,
      },
    ],
  },
  {
    id: "feedback",
    label: "Feedback",
    icon: "💬",
    reglas: [
      {
        nro: 7,
        titulo: "El feedback es un regalo, no un ataque",
        desc: "En las sesiones de revisión de pitch decks y estrategias, el feedback puede ser duro. Está orientado a hacerte mejor, no a bajarte el ánimo. Recibilo y dalo desde ese lugar.",
        obligatoria: false,
      },
      {
        nro: 8,
        titulo: "Llenar el formulario de feedback cada semana",
        desc: "El programa mejora con tu input. Tarda 2 minutos. Es la Tarea 1 de cada misión. Si algo no funciona, queremos saberlo — no para justificarnos, sino para arreglarlo.",
        obligatoria: true,
      },
    ],
  },
  {
    id: "inversores",
    label: "Inversores",
    icon: "💼",
    reglas: [
      {
        nro: 9,
        titulo: "No hacer cold outreach a inversores del programa sin permiso",
        desc: "Los VCs que participan como speakers o mentores lo hacen en un contexto específico. Contactarlos directamente sin una intro del equipo de Impacta VC puede quemar esa relación para todos. Siempre pedí la intro primero.",
        obligatoria: true,
      },
      {
        nro: 10,
        titulo: "Ser honesto sobre el estado de tu ronda",
        desc: "No hay que inflar números ni fingir más tracción de la que tenés. Los inversores son muy buenos detectando esto — y cuando lo detectan, el daño es irreparable. La honestidad es la base de cualquier relación de inversión duradera.",
        obligatoria: true,
      },
    ],
  },
  {
    id: "comportamiento",
    label: "Comportamiento",
    icon: "🛡️",
    reglas: [
      {
        nro: 11,
        titulo: "Respeto total — tolerancia cero",
        desc: "El programa es un espacio seguro para founders de todos los backgrounds. Cualquier forma de acoso, discriminación o conducta irrespetuosa resulta en expulsión inmediata sin reembolso.",
        obligatoria: true,
      },
      {
        nro: 12,
        titulo: "No grabar ni redistribuir las sesiones",
        desc: "Las clases y masterclasses tienen derechos de autor. No está permitido grabar, descargar ni redistribuir el contenido fuera de la plataforma del programa.",
        obligatoria: true,
      },
    ],
  },
];

export default function HouseRulesPage() {
  return (
    <div className="bg-[#0a0e1a] text-white min-h-screen font-[var(--font-montserrat)]">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a] via-[#0d1b3e] to-[#0a0e1a]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#00e5c015_0%,_transparent_50%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-20">
          <div className="max-w-3xl">
            <p className="text-[#00e5c0] text-sm font-bold uppercase tracking-widest mb-4">El contrato social del programa</p>
            <h1 className="text-5xl md:text-6xl font-black leading-none mb-4 tracking-tight">
              House <span className="text-[#00e5c0]">Rules</span>
            </h1>
            <p className="text-white/60 text-lg leading-relaxed">
              Modo Fundraising funciona porque todos juegan con las mismas reglas.
              Estas no son restricciones — son los acuerdos que hacen que valga la pena estar acá.
            </p>
          </div>
        </div>
      </section>

      {/* Leyenda */}
      <section className="border-y border-white/10 py-5">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap gap-4 items-center text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00e5c0]" />
            <span className="text-white/50">Obligatoria — incumplimiento puede resultar en expulsión</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white/20" />
            <span className="text-white/50">Recomendada — para tu propio beneficio</span>
          </div>
        </div>
      </section>

      {/* Reglas por categoría */}
      <section className="max-w-4xl mx-auto px-4 py-16 space-y-14">
        {CATEGORIAS.map((cat) => (
          <div key={cat.id}>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">{cat.icon}</span>
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#00e5c0]">{cat.label}</h2>
            </div>
            <div className="space-y-4">
              {cat.reglas.map((regla) => (
                <div
                  key={regla.nro}
                  className={`bg-white/5 border rounded-2xl p-6 transition-all ${
                    regla.obligatoria
                      ? "border-[#00e5c0]/20 hover:border-[#00e5c0]/40"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        regla.obligatoria ? "bg-[#00e5c0]" : "bg-white/20"
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-black text-white text-base">{regla.titulo}</h3>
                        {regla.obligatoria && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#00e5c0]/15 text-[#00e5c0] border border-[#00e5c0]/30 font-semibold flex-shrink-0">
                            Obligatoria
                          </span>
                        )}
                      </div>
                      <p className="text-white/60 text-sm leading-relaxed font-[var(--font-questrial)]">{regla.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Closing note */}
      <section className="bg-white/5 border-y border-white/10 py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-4xl mb-4">🤜🤛</div>
          <h2 className="text-3xl font-black mb-4">El trato</h2>
          <p className="text-white/60 leading-relaxed font-[var(--font-questrial)]">
            Nosotros ponemos el contenido, la red y los inversores.
            Vos ponés el trabajo, la honestidad y el respeto.
            Así funciona esto.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
