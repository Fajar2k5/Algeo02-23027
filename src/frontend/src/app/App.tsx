import Sidesbar from '../components/sidebar';
import bashamememeImage from '../assets/bashamememe.png';
import Gallery from '../components/gallery';

function App() {
  return (
    <div className="min-h-screen bg-black px-4">
      <header className="p-2 bg-black h-24 w-full rounded-b-xl">
        <div className="flex items-center space-x-4">
          <img
            src={bashamememeImage}
            alt="logo"
            className="w-20 h-20 rounded-full"
          />
          <h1 className="text-5xl mt-4 font-bold text-green-500">Farizzler</h1>
        </div>
      </header>


      <main className="grid grid-cols-1 md:grid-cols-6 gap-3 mt-4 rounded-xl overflow-hidden">
        <div className="hidden md:block md:col-span-1 rounded-l-xl">
          <Sidesbar />
        </div>
        <div className="col-span-1 md:col-span-5 rounded-xl">
          <Gallery />
        </div>
      </main>

      <footer className="p-4 bg-black w-full h-12">
        {/* Add your footer content here */}
      </footer>
    </div>
  );
}

export default App;