import { useEffect, useState } from "react";
import axios from "axios";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Song {
  id: number;
  cover: string | null;
  title: string;
}

const Gallery = () => {
  const [activeTab, setActiveTab] = useState<"Image" | "MIDI">("Image");
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const placeholder = "https://via.placeholder.com/100";

  // For Pagination
  const itemsPerPage = 12; // 4x3 grid
  const totalPages = Math.max(1, Math.ceil(songs.length / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = songs.slice(indexOfFirstItem, indexOfLastItem);
  
  useEffect(() => {
    // Fetch data from the backend when the tab changes
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`http://127.0.0.1:8000/gallery/${activeTab}`);
        console.log("Gallery data:", response.data);
        setSongs(response.data);
        // setCurrentPage(1); // Reset to first page when switching tabs, optional
      } catch (error) {
        console.error("Error fetching gallery data:", error);
        setSongs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  // Go between pages
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="bg-[#121212] rounded-xl p-4 h-[550px] flex flex-col">
      {/* Buttons stay at the top */}
      <div className="flex justify-center space-x-4 mb-4">
        {["Image", "MIDI"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as "Image" | "MIDI")}
            className={`px-4 py-2 rounded-lg text-sm ${
              activeTab === tab
                ? "bg-white text-black"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-grow flex flex-col justify-between">
        {/* Grid Container */}
        <div className="flex justify-center items-start pt-2">
          {isLoading ? (
            <div className="text-zinc-400">Loading...</div>
          ) : songs.length === 0 ? (
            <div className="text-zinc-400">No {activeTab}s found</div>
          ) : (
            <div className="grid grid-cols-4 grid-rows-3 gap-3">
              {currentItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#1A1A1A] p-1 rounded-lg hover:scale-105 transition-transform flex flex-col items-center w-48"
                >
                  <img
                    src={item.cover || placeholder}
                    alt={item.title}
                    className="w-full h-24 object-cover rounded-md"
                  />
                  <div className="mt-1 text-white text-center">
                    <h3 className="text-xs font-medium">{item.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Buttons - don't show if there are no songs*/}
        {!isLoading && songs.length > 0 && (
          <div className="flex justify-center items-center gap-4 mt-4">
            <button
              onClick={prevPage}
              disabled={currentPage === 1}
              className={`px-2 py-2 rounded-full text-sm flex items-center ${
                currentPage === 1
                  ? "bg-zinc-900 text-zinc-600 cursor-not-allowed"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-zinc-400 text-sm">
              {songs.length > 0 ? currentPage : 0} of {songs.length > 0 ? totalPages : 0}
            </span>

            <button
              onClick={nextPage}
              disabled={currentPage === totalPages}
              className={`px-2 py-2 rounded-full text-sm flex items-center ${
                currentPage === totalPages
                  ? "bg-zinc-900 text-zinc-600 cursor-not-allowed"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Gallery;