import { useState } from 'react';
import { Search, Music, Disc3, Radio, PlayCircle } from 'lucide-react';
import bashamememeImage from '../assets/bashamememe.png';

const Sidesbar = () => {
  const [isListening, setIsListening] = useState(false);

  const handleListen = () => {
    setIsListening(!isListening);
  };

  return (
    <div className="w-64 min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 bg-[#121212] flex justify-between items-center">
        <div className="flex items-center space-x-4">
        <img src={bashamememeImage} alt="logo" className="w-20 h-20 rounded-full" />
          <h1 className="text-xl font-bold text-green-500">Farizzler</h1>
        </div>
        {/* <div className="flex space-x-4">
          <Music className="text-gray-400 hover:text-white" size={20} />
          <Radio className="text-gray-400 hover:text-white" size={20} />
        </div> */}
      </header>

      <main className="w-16 items-center justify-center space-y-8 p-4">
        <div 
          className={`w-16 h-16 rounded-full flex items-center justify-center 
          ${isListening 
            ? 'bg-green-600 animate-pulse' 
            : 'bg-gray-800 hover:bg-gray-700'}`}
          onClick={handleListen}
        >
          <Search 
            size={16} 
            className={`${isListening ? 'text-white' : 'text-green-500'}`} 
          />
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold">
            {isListening ? 'Listening...' : 'Tap to Recognize'}
          </h2>
          <p className="text-gray-400 mt-2">
            {isListening 
              ? 'Identifying the song...' 
              : 'Search the song'}
          </p>
        </div>
      </main>

      <footer className="p-4 bg-[#121212] flex justify-around items-center">
        <PlayCircle 
          className="text-gray-400 hover:text-white" 
          size={32} 
        />
        <div className="h-1 w-1/2 bg-gray-700 rounded-full">
          {isListening && (
            <div className="h-full bg-green-500 rounded-full w-1/3"></div>
          )}
        </div>
      </footer>
    </div>
  );
};

export default Sidesbar;