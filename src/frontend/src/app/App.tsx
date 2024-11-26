import Sidesbar from '../components/sidebar';

function App() {
  return (
    <div className="min-h-screen bg-black flex">
      <Sidesbar />
      <div className="flex-1 flex flex-col">
        <header className="p-4 bg-[#121212] flex justify-between items-center h-24 w-full"></header>

        <div className='w-1 h-[485px] mb-2 mt-2 bg-[#121212]'></div>
        
        <main className="flex-1 overflow-auto">
        </main>
        
        <footer className="p-4 bg-[#121212] flex justify-between items-center h-16 w-full">
        </footer>
      </div>
    </div>
  );
}

export default App;