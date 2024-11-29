"use client";

import { useState } from "react";
import UploadSection from "./uploadbox";
import { Mic } from "lucide-react";

const Sidesbar = () => {
  const [isListening, setIsListening] = useState(false);

  const handleListen = () => {
    setIsListening((prevState) => !prevState);
    console.log(`Listening: ${!isListening}`);
  };

  return (
    <section className="bg-[#121212] rounded-xl h-full">
      <div className="flex flex-col h-full">
        <div className="flex-grow p-4 flex justify-center items-center">
          <button
            onClick={handleListen}
            className={`relative w-32 h-32 rounded-full flex items-center justify-center focus:outline-none ${
              isListening ? "bg-green-500 animate-pulse" : "bg-black"
            }`}
          >
            <Mic
              className={`w-16 h-16 ${
                isListening ? "text-white" : "text-green-500"
              }`}
            />
          </button>
        </div>
        <div className="w-full rounded-xl">
          <UploadSection />
        </div>
      </div>
    </section>
  );
};

export default Sidesbar;
