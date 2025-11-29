import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";

export default function Home() {
  return (
    <div className="min-h-dvh bg-black">
      <Navbar />
      <main className="bg-black">
        <Hero />
      </main>
    </div>
  );
}
