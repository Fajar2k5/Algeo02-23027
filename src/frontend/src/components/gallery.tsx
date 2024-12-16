import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import VoiceCaptureButton from "./recorder";

export interface Song {
  id: number;
  cover: string | null;
  title: string;
  src: string;
  similarity_score?: number;
}

interface GalleryProps {
  onSelectSong: (song: Song) => void;
  activeTab: "Image" | "MIDI" | null;
  setActiveTab: React.Dispatch<React.SetStateAction<"Image" | "MIDI" | null>>;
  galleryData: Song[]; 
}

const Gallery: React.FC<GalleryProps> = ({
  onSelectSong,
  activeTab,
  setActiveTab,
  galleryData, 
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true); 

  const placeholder = "https://via.placeholder.com/100";
  const itemsPerPage = 12;
  const totalPages = Math.max(1, Math.ceil(galleryData.length / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = galleryData.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    setIsLoading(true);
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [galleryData]);

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

  const handleTabClick = (tab: "Image" | "MIDI") => {
    setActiveTab((prevTab: "Image" | "MIDI" | null) => (prevTab === tab ? null : tab));
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [galleryData]);

  const handleQueryResult = (data: Song[]) => {
    galleryData = data;
  }

  return (
    <div className="bg-[#121212] rounded-xl p-4 h-[600px] flex flex-col">
      <div className="relative mb-4">
      <div className="absolute left-1">
        <VoiceCaptureButton onQueryResult={handleQueryResult}/>
      </div>

      <div className="flex justify-center space-x-4">
        {["Image", "MIDI"].map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabClick(tab as "Image" | "MIDI")}
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
    </div>


      <div className="flex-grow flex flex-col justify-between">
        <div className="flex justify-center items-start pt-2">
          {isLoading ? (
            <div className="text-zinc-400">Loading...</div>
          ) : galleryData.length === 0 ? (
            <div className="text-zinc-400">No songs found</div>
          ) : (
            <div className="grid grid-cols-4 grid-rows-3 gap-3">
              {currentItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#1A1A1A] p-1 rounded-lg hover:scale-105 transition-transform flex flex-col items-center w-48 cursor-pointer"
                  onClick={() => onSelectSong(item)}
                >
                  <img
                    src={item.cover || placeholder}
                    alt={item.title}
                    className="w-full h-24 object-cover rounded-md"
                  />
                  <div className="mt-1 text-white text-center">
                    <h3 className="text-xs font-medium truncate w-full">{item.title}</h3>
                    {item.similarity_score !== undefined && (
                      <p className="text-xs text-gray-400">{(item.similarity_score * 100).toFixed(2)}%</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!isLoading && galleryData.length > 0 && (
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
              {galleryData.length > 0 ? currentPage : 0} of {galleryData.length > 0 ? totalPages : 0}
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
