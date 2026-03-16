import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Hero Section */}
      <main className="relative flex flex-col items-center justify-center px-6 pt-40 pb-32">
        {/* Radial gradient background effect */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[120px]" />
        </div>

        <div className="relative z-10 flex max-w-3xl flex-col items-center text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Now in active development
          </div>

          {/* Headline */}
          <h1 className="text-5xl leading-[1.1] font-bold tracking-tight md:text-6xl">
            Practice interviews
            <br />
            <span className="bg-gradient-to-r from-foreground to-foreground/50 bg-clip-text text-transparent">
              with your peers
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Find a study partner, tackle whiteboard questions together, and
            build confidence for your next technical interview — all in real
            time.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex items-center gap-4">
            <Link to={isAuthenticated ? "/dashboard" : "/signup"}>
              <Button size="lg" className="px-6">
                {isAuthenticated ? "Go to Dashboard" : "Get started"}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Button>
            </Link>
            {!isAuthenticated && (
              <Link to="/login">
                <Button variant="outline" size="lg" className="px-6">
                  Log in
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Feature Grid */}
        <div className="relative z-10 mt-32 grid w-full max-w-4xl grid-cols-1 gap-px overflow-hidden rounded-xl border border-border/50 bg-border/50 md:grid-cols-3">
          {[
            {
              title: "Real-time Collaboration",
              description:
                "Code together in a shared editor with live sync — just like a real whiteboard interview.",
            },
            {
              title: "Smart Matching",
              description:
                "Get matched with peers based on topic, difficulty, and skill level within seconds.",
            },
            {
              title: "Curated Questions",
              description:
                "Practice with a growing library of questions indexed by topic and difficulty.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-background p-6 transition-colors hover:bg-muted/30"
            >
              <h3 className="mb-2 text-sm font-medium">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border/50 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-6">
          <span className="text-xs text-muted-foreground">
            © 2026 PeerPrep. CS3219 Group 17.
          </span>
        </div>
      </footer>
    </div>
  );
}
