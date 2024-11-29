"use client"

import { useState } from 'react';
import UploadSection from './uploadbox';
import { Mic} from 'lucide-react';
const Sidesbar = () => {
  const [isListening, setIsListening] = useState(false);

  const handleListen = () => {
    setIsListening(!isListening);
  };

  return (
    <section className="bg-[#121212] rounded-xl h-full">
      <div className="flex flex-col h-full">
        <div className="flex-grow p-4">
          <Mic className='text-green-500'></Mic>
        </div>
        <div className="w-full rounded-xl">
          <UploadSection />
        </div>
      </div>
    </section>
  );
};

export default Sidesbar;

