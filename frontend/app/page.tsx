import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main className="pt-32 px-4">
        <div className="max-w-6xl mx-auto py-12">
          {/* Home page content will go here */}
        </div>
      </main>
    </div>
  );
}
