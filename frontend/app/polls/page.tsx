import Navbar from "@/components/Navbar";
import LocationPolls from "@/components/LocationPolls";

export default function PollsPage() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <main className="pt-32 px-4">
        <div className="max-w-6xl mx-auto py-12">
          <LocationPolls />
        </div>
      </main>
    </div>
  );
}
