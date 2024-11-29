import { useEffect, useState } from "react";
import axios from "axios";

interface Song {
  id: number;
  cover: string | null;
  title: string;
}

const Gallery = () => {
  const [activeTab, setActiveTab] = useState<"Image" | "MIDI">("Image");
  const [songs, setSongs] = useState<Song[]>([]);
  const placeholder = "https://via.placeholder.com/100";

  useEffect(() => {
    // Fetch data from the backend when the tab changes
    const fetchData = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:8000/gallery/${activeTab}`);
        console.log("Gallery data:", response.data);
        setSongs(response.data);
      } catch (error) {
        console.error("Error fetching gallery data:", error);
      }
    };

    fetchData();
  }, [activeTab]);

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

      <div className="flex-grow flex justify-center items-start pt-2">
        <div className="grid grid-cols-4 grid-rows-3 gap-3">
          {songs.map((item) => (
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
      </div>
    </div>
  );
};

export default Gallery;
