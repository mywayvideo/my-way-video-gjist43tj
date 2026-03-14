import { Link } from 'react-router-dom'
import { AIPrompt } from '@/components/AIPrompt'
import { ProductCard } from '@/components/ProductCard'
import { MOCK_PRODUCTS, CATEGORIES } from '@/lib/mockData'
import { ShieldCheck, Truck, HeadphonesIcon } from 'lucide-react'

export default function Index() {
  return (
    <div className="flex flex-col gap-24 pb-24">
      {/* Hero / Command Center */}
      <section className="relative pt-32 pb-20 px-4 flex flex-col items-center justify-center min-h-[70vh] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.05)_0%,transparent_50%)]"></div>

        <div className="text-center space-y-6 z-10 w-full max-w-4xl animate-fade-in-up">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
            Inteligência em
            <br />
            Audiovisual PRO
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Seu assistente técnico pessoal. Encontre equipamentos ideais, simule projetos e consulte
            especialistas em segundos.
          </p>

          <div className="pt-8 w-full animate-fade-in" style={{ animationDelay: '200ms' }}>
            <AIPrompt />
          </div>

          <div
            className="pt-8 flex flex-wrap justify-center gap-2 opacity-80 animate-fade-in"
            style={{ animationDelay: '400ms' }}
          >
            {[
              'Câmera para streaming',
              'Lentes anamórficas',
              'Kit iluminação podcast',
              'Prazo para RJ',
            ].map((suggestion) => (
              <Link
                key={suggestion}
                to={`/search?q=${encodeURIComponent(suggestion)}`}
                className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-full transition-colors"
              >
                {suggestion}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Categorias */}
      <section className="container mx-auto px-4">
        <h2 className="text-2xl font-bold mb-8 uppercase tracking-wide border-b border-white/10 pb-4">
          Navegar por Setor
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              to={`/search?q=${cat.name}`}
              className="group relative aspect-video rounded-xl overflow-hidden bg-muted"
            >
              <img
                src={cat.image}
                alt={cat.name}
                className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent flex items-end p-6">
                <span className="text-xl font-bold">{cat.name}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Value Proposition */}
      <section className="bg-muted/30 border-y border-white/5 py-16">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="flex flex-col items-center gap-4 p-6">
            <div className="bg-background p-4 rounded-full text-accent shadow-elevation">
              <HeadphonesIcon className="w-8 h-8" />
            </div>
            <h3 className="font-semibold text-lg">Consultoria Técnica</h3>
            <p className="text-sm text-muted-foreground">
              Especialistas prontos para otimizar o setup do seu projeto.
            </p>
          </div>
          <div className="flex flex-col items-center gap-4 p-6">
            <div className="bg-background p-4 rounded-full text-accent shadow-elevation">
              <Truck className="w-8 h-8" />
            </div>
            <h3 className="font-semibold text-lg">Logística Expressa</h3>
            <p className="text-sm text-muted-foreground">
              Entregas seguradas para todo o Brasil com prazos imbatíveis.
            </p>
          </div>
          <div className="flex flex-col items-center gap-4 p-6">
            <div className="bg-background p-4 rounded-full text-accent shadow-elevation">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="font-semibold text-lg">Garantia PRO</h3>
            <p className="text-sm text-muted-foreground">
              Suporte avançado e reposição emergencial para não parar seu set.
            </p>
          </div>
        </div>
      </section>

      {/* Destaques */}
      <section className="container mx-auto px-4">
        <h2 className="text-2xl font-bold mb-8 uppercase tracking-wide border-b border-white/10 pb-4 flex items-center gap-2">
          Recomendados pela IA{' '}
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
          </span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {MOCK_PRODUCTS.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  )
}
