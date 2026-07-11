import { Link } from "wouter";
import { ArrowLeft, Activity, BarChart3, Zap, Shield, Users, Brain, Target, TrendingUp } from "lucide-react";
import { usePageTitle } from "@/lib/usePageTitle";

export default function About() {
  usePageTitle("O nas");
  return (
    <div className="bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/">
          <span className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-8 cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Powrót do strony głównej
          </span>
        </Link>

        <div className="flex items-center gap-3 mt-4 mb-6">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ background: "hsl(200,50%,96%)", border: "1px solid hsl(200,50%,78%)" }}>
            <Activity className="w-6 h-6" style={{ color: "hsl(200,90%,35%)" }} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              O Nexus Sight
            </h1>
            <p className="text-sm text-muted-foreground">Twoje okno na statystyki League of Legends</p>
          </div>
        </div>

        <div className="prose-custom">
          <section>
            <h2>Czym jest Nexus Sight?</h2>
            <p>
              Nexus Sight to darmowe, polskojęzyczne narzędzie do analizy statystyk graczy League of Legends.
              Stworzyliśmy je z myślą o graczach, którzy chcą lepiej zrozumieć swoją grę, śledzić postępy
              i doskonalić umiejętności.
            </p>
            <p>
              Nasze narzędzie łączy w sobie funkcje popularnych serwisów typu OP.GG z unikalnymi algorytmami
              analizy AI, które dostarczają głębszych wniosków niż standardowe statystyki.
            </p>
          </section>

          <section>
            <h2>Co oferujemy?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
              {[
                { icon: BarChart3, title: "Głęboka analiza AI", desc: "22 algorytmy analizy obejmujące archetyp stylu gry, wskaźnik tiltu, warunki zwycięstwa i krzywą mocy." },
                { icon: Zap, title: "Live Game", desc: "Podgląd aktywnej gry z rangami, runami, czarowniami i banami wszystkich 10 uczestników." },
                { icon: Shield, title: "Historia meczy", desc: "Szczegółowa historia meczy z KDA, OP Score, składem drużyn i porównaniem z lane oponentem." },
                { icon: Users, title: "Szacowana ranga AI", desc: "Algorytm obliczający realną rangę na podstawie faktycznego poziomu gry, nie tylko wyniku LP." },
                { icon: Brain, title: "Porady coachingowe", desc: "Spersonalizowane wskazówki oparte na analizie Twoich słabych i mocnych stron." },
                { icon: Target, title: "Analiza early game", desc: "Szczegółowe statystyki fazy linii — CS, kontrola wardów, różnica złota i presja na mapie." },
                { icon: TrendingUp, title: "Krzywa mocy", desc: "Analiza, w której fazie gry (early/mid/late) jesteś najsilniejszy i najsłabszy." },
                { icon: Activity, title: "Mistrzostwo bohaterów", desc: "Pula postaci, procent wygranych na każdym bohaterze i rekomendacje championów." },
              ].map((f) => (
                <div key={f.title} className="glass-panel p-3 flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: "hsl(200,50%,96%)", border: "1px solid hsl(200,50%,85%)" }}>
                    <f.icon className="w-4 h-4" style={{ color: "hsl(200,90%,35%)" }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground mb-0.5">{f.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2>Technologia</h2>
            <p>
              Nexus Sight korzysta z oficjalnego API Riot Games, aby pobierać publicznie dostępne dane o graczach.
              Nasze autorskie algorytmy analizy przetwarzają dane z ostatnich meczy, generując unikalne wskaźniki
              i wizualizacje niedostępne w standardowych narzędziach.
            </p>
            <p>
              Aplikacja jest zbudowana w technologii TypeScript z wykorzystaniem React, i działa w pełni
              w przeglądarce — bez konieczności instalacji czy rejestracji.
            </p>
          </section>

          <section>
            <h2>Obsługiwane regiony</h2>
            <p>
              Nexus Sight obsługuje wszystkie oficjalne serwery League of Legends: EUW, EUNE, NA, KR, BR,
              LAN, LAS, OCE, TR, RU, JP oraz serwery SEA (PH, SG, TW, TH, VN).
            </p>
          </section>

          <section>
            <h2>Zastrzeżenia prawne</h2>
            <p>
              Nexus Sight nie jest zatwierdzony przez Riot Games i nie odzwierciedla poglądów ani opinii Riot Games
              ani żadnej osoby oficjalnie zaangażowanej w tworzenie lub zarządzanie właściwościami Riot Games.
              Riot Games oraz wszystkie powiązane właściwości są znakami towarowymi lub zarejestrowanymi znakami
              towarowymi Riot Games, Inc.
            </p>
          </section>

          <section>
            <h2>Kontakt</h2>
            <p>
              Masz pytania, sugestie lub chcesz zgłosić problem? Skontaktuj się z nami:
            </p>
            <ul>
              <li>E-mail: <strong>nexussight.kontakt@gmail.com</strong></li>
            </ul>
            <p>
              Zapoznaj się również z naszą{" "}
              <Link href="/privacy"><span className="text-primary hover:underline cursor-pointer">Polityką Prywatności</span></Link>{" "}
              oraz{" "}
              <Link href="/terms"><span className="text-primary hover:underline cursor-pointer">Regulaminem</span></Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
