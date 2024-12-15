import { useState } from "react";
import Sidebar from "../components/sidebar";
import bashamememeImage from "../assets/bashamememe.png";
import wisadelImage from "../assets/wisadel.png";
import Gallery, { Song } from "../components/gallery";
import AudioPlayer from "../components/audioplayer";
import { useEffect } from "react";


function App() {
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  const handleSelectSong = (song: Song) => {
    setSelectedSong(song);
  };

  // const [refreshGallery, setRefreshGallery] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"Image" | "MIDI" | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [galleryData, setGalleryData] = useState<Song[]>([]);

  const handleUploadSuccess = () => {
    // setRefreshGallery((prev) => prev + 1);
    setSearchQuery('');
    fetchGallery();
  };

  const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  }


  useEffect(() => {
    fetch("http://127.0.0.1:8000/reset/", {
      method: "POST",
    })
      .then((res) => res.json())
      .then((data) => console.log("Dataset reset:", data.message))
      .catch((error) => console.error("Error resetting dataset:", error));
  }, []);

  const fetchGallery = async () => {
    try {
      // Send the search query, even if it's empty
      const response = await fetch(`http://127.0.0.1:8000/gallery?search=${searchQuery}`);
      const data = await response.json();
      setGalleryData(data);
    } catch (error) {
      console.error("Error fetching gallery data:", error);
    }
  };

  useEffect(() => {

    fetchGallery();
  }, [searchQuery]);
  

  return (
    <div className="min-h-screen bg-black px-4">
      <header className="p-2 bg-black h-20 w-full rounded-b-xl">
        <div className="flex items-center space-x-4 gap-80">
          <div className="flex items-center space-x-4">
            <img
              src={bashamememeImage}
              alt="logo"
              className="w-16 h-16 rounded-full"
            />
            <h1 className="text-5xl mt-4 font-bold text-green-500">Farizzler</h1> 
            <img
              src={wisadelImage}
              alt="logo"
              className="w-16 h-16 rounded-full"
            />
          </div>
          <form className="flex w-full max-w-sm mx-auto mt-6">
            <input
              type="search"
              value={searchQuery}
              onChange={handleQueryChange}
              placeholder="Search..."
              className="flex-grow px-4 py-2 text-sm text-gray-900 bg-gray-100 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
            />
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
            // refreshTrigger={refreshGallery}
            activeTab={activeTab}
            setActiveTab={setActiveTab} 
            galleryData={galleryData}
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
