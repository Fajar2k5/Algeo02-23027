import { useState } from 'react';
import { Search, PlayCircle } from 'lucide-react';

const Sidesbar = () => {
  const [isListening, setIsListening] = useState(false);

  const handleListen = () => {
    setIsListening(!isListening);
  };

  return (
    <section className="bg-[#121212] rounded-xl">
      <div className="container mx-auto text-center">
        <div className='border-1 border-[#121212] rounded-2xl inline-block h-[530px]'>

        </div>
      </div>
    </section>
  );
};

export default Sidesbar;
