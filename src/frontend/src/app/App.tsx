import { useState } from "react";
import Sidebar from "../components/sidebar";
import bashamememeImage from "../assets/bashamememe.png";
import Gallery, { Song } from "../components/gallery";
import AudioPlayer from "../components/audioplayer";
import { useEffect } from "react";


function App() {
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  const handleSelectSong = (song: Song) => {
    setSelectedSong(song);
  };

  const [refreshGallery, setRefreshGallery] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"Image" | "MIDI" | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleUploadSuccess = () => {
    setRefreshGallery((prev) => prev + 1);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log('Search submitted:', searchQuery);
    setSearchQuery('');
  };

  useEffect(() => {
    fetch("http://127.0.0.1:8000/reset/", {
      method: "POST",
    })
      .then((res) => res.json())
      .then((data) => console.log("Dataset reset:", data.message))
      .catch((error) => console.error("Error resetting dataset:", error));
  }, []);

  return (
    <div className="min-h-screen bg-black px-4">
      <header className="p-2 bg-black h-20 w-full rounded-b-xl">
        <div className="flex items-center space-x-4 gap-96">
          <div className="flex items-center space-x-4">
            <img
              src={bashamememeImage}
              alt="logo"
              className="w-16 h-16 rounded-full"
            />
            <h1 className="text-5xl mt-4 font-bold text-green-500">Farizzler</h1> 
          </div>
          <form onSubmit={handleSubmit} className="flex w-full max-w-sm mx-auto mt-6">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="flex-grow px-4 py-2 text-sm text-gray-900 bg-gray-100 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2"
            />
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 border border-transparent rounded-r-md hover:bg-zinc-800/50 focus:outline-none focus:ring-2"
            >
              Search
            </button>
          </form>

        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-9 gap-3 mt-4 rounded-xl overflow-hidden">
        <div className="hidden md:block md:col-span-2 rounded-l-xl h-full">
          <Sidebar 
            onUploadSuccess={handleUploadSuccess}
            onSelectedSong={handleSelectSong}
            activeTab={activeTab} 
          />
        </div>
        <div className="col-span-1 md:col-span-7 rounded-xl ml-6 h-full">
          <Gallery
            onSelectSong={handleSelectSong}
            refreshTrigger={refreshGallery}
            activeTab={activeTab}
            setActiveTab={setActiveTab} 
          />
        </div>
      </main>

      <footer className="bg-black w-full h-full">
        <AudioPlayer selectedSong={selectedSong} />
      </footer>
    </div>
  );
}

export default App;
