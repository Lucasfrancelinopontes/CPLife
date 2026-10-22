import Link from "next/link";

const features = [
  {
    title: "Tags oficiais",
    description: "Encontre questões usando a taxonomia oficial do Codeforces.",
    icon: "01",
  },
  {
    title: "OR e AND",
    description: "Combine tags para explorar uma categoria ou cruzar habilidades.",
    icon: "02",
  },
  {
    title: "Faixa de rating",
    description: "Defina um rating mínimo e máximo para treinar no nível certo.",
    icon: "03",
  },
  {
    title: "Ordenação",
    description: "Organize o catálogo por rating ou pela quantidade de soluções.",
    icon: "04",
  },
  {
    title: "Paginação",
    description: "Navegue pelo catálogo com resultados distribuídos em páginas.",
    icon: "05",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80">
        <nav
          className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8"
          aria-label="Navegação principal"
        >
          <Link href="/" className="flex items-center gap-3 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
            <span className="rounded-md bg-sky-600 px-2 py-1 font-mono text-sm font-extrabold tracking-wide text-white">
              CPLife
            </span>
            <span className="hidden text-sm text-slate-400 sm:inline">Treino competitivo com propósito</span>
          </Link>
          <Link
            href="/question-bank"
            className="rounded-md border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-sky-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Banco de questões
          </Link>
        </nav>
      </header>

      <main>
        <section className="relative isolate">
          <div className="pointer-events-none absolute -right-24 top-8 -z-10 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 lg:pb-28">
            <div>
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-sky-300">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-300" aria-hidden="true" />
                Competitive programming
              </p>
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-6xl">
                Sua próxima questão começa aqui.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
                O CPLife ajuda você a explorar questões de programação competitiva,
                organizar filtros e encontrar desafios adequados para o seu treino.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/question-bank"
                  className="inline-flex items-center justify-center rounded-md bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-sky-950/40 transition hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  Explorar questões do Codeforces
                  <span className="ml-2" aria-hidden="true">-&gt;</span>
                </Link>
                <a
                  href="#sobre"
                  className="inline-flex items-center justify-center rounded-md border border-slate-700 px-5 py-3 text-sm font-bold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  Conhecer o CPLife
                </a>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:justify-self-end">
              <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/60">
                <div className="mb-6 flex items-center gap-2 border-b border-slate-800 pb-4" aria-hidden="true">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                  <span className="ml-auto font-mono text-xs text-slate-600">cplife/search</span>
                </div>
                <div className="space-y-4 font-mono text-sm">
                  <p className="text-slate-500"><span className="text-sky-400">$</span> encontrar próxima questão</p>
                  <p className="text-slate-300">tags <span className="text-cyan-300">[dp, graphs]</span></p>
                  <p className="text-slate-300">rating <span className="text-emerald-300">[1200..1700]</span></p>
                  <div className="rounded-lg border border-sky-400/20 bg-sky-400/5 p-3">
                    <p className="text-xs text-slate-500">resultado recomendado</p>
                    <p className="mt-1 text-sky-300">#1847C · Mysterious Present</p>
                  </div>
                  <p className="text-xs text-slate-500"><span className="text-emerald-400">✓</span> filtros prontos para começar</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="sobre" className="border-y border-slate-800/80 bg-slate-900/30">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-sky-400">Menos ruído, mais prática</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">Uma busca feita para o seu próximo treino.</h2>
              <p className="mt-4 leading-7 text-slate-400">
                Comece com uma ideia de habilidade, ajuste a dificuldade e percorra
                o catálogo até encontrar um desafio que faça sentido agora.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {features.map((feature) => (
                <article key={feature.title} className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
                  <span className="font-mono text-sm font-bold text-sky-400">{feature.icon}</span>
                  <h3 className="mt-6 font-bold text-slate-100">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-sky-400/20 bg-sky-400/5 p-8 sm:p-10 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Pronto para escolher a próxima?</h2>
              <p className="mt-2 max-w-xl text-slate-400">Abra o catálogo e transforme alguns minutos livres em prática deliberada.</p>
            </div>
            <Link
              href="/question-bank"
              className="shrink-0 rounded-md bg-sky-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Ir para o banco de questões
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="font-bold text-slate-100">CPLife</p>
            <p className="mt-1 text-slate-500">Uma ferramenta para treinar programação competitiva com intenção.</p>
          </div>
          <div className="flex gap-5">
            <Link href="/question-bank" className="text-sky-400 hover:text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">Buscar questões</Link>
            <a href="https://github.com/Lucasfrancelinopontes/CPLife" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
