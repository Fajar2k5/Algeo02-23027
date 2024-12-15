"use client";

// import { useState } from "react";
import UploadSection from "./uploadbox";
// import { Mic } from "lucide-react";

// Define the props interface
interface SidebarProps {
  onUploadSuccess: () => void; // Callback to notify parent
}

const Sidebar: React.FC<SidebarProps> = ({ onUploadSuccess }) => {
  // const [isListening, setIsListening] = useState(false);

  // const handleListen = () => {
  //   setIsListening((prevState) => !prevState);
  //   console.log(`Listening: ${!isListening}`);
  // };

  return (
    <section className="bg-[#121212] rounded-xl h-full">
      <div className="flex flex-col h-full">
        <div className="flex-grow p-4 flex justify-center items-center">
          
        </div>
        <div className="w-full rounded-xl ">
          {/* Pass the callback to UploadSection */}
          <UploadSection onUploadSuccess={onUploadSuccess} />
        </div>
      </div>
    </section>
  );
};

export default Sidebar;
