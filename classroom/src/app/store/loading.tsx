import LandingHeader from "@/app/_components/LandingHeader";
import Footer from "@/app/_components/Footer";

function StoreLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-24">
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-56 shrink-0">
          <div className="lg:sticky lg:top-[90px] space-y-6 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="h-4 w-16 rounded bg-white/10" />
                <div className="mt-3 flex flex-wrap gap-2">
                  {Array.from({ length: i === 0 ? 1 : 4 }).map((__, j) => (
                    <div key={j} className="h-8 w-20 rounded-md bg-white/[0.08] animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="mb-5">
            <p className="text-[14px] text-white/50">
              총 <span className="inline-block h-4 w-10 rounded bg-white/10 align-[-2px] animate-pulse" />개의 상품
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-9 sm:gap-x-6 sm:gap-y-12">
            {Array.from({ length: 9 }).map((_, idx) => (
              <div key={idx}>
                <div className="relative aspect-video overflow-hidden rounded-xl bg-white/[0.06] animate-pulse" />
                <div className="mt-3 px-0.5 space-y-2">
                  <div className="h-4 w-5/6 rounded bg-white/10 animate-pulse" />
                  <div className="h-4 w-2/3 rounded bg-white/10 animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-white/10 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#161616] text-white flex flex-col">
      <LandingHeader />
      <main className="flex-1 pt-[70px]">
        <section className="mx-auto max-w-6xl px-4 pt-10 pb-6 text-left md:text-center">
          <div className="h-8 w-44 rounded bg-white/10 mx-0 md:mx-auto animate-pulse" />
          <div className="mt-3 h-4 w-72 rounded bg-white/10 mx-0 md:mx-auto animate-pulse" />
        </section>
        <StoreLoadingSkeleton />
      </main>
      <Footer />
    </div>
  );
}

