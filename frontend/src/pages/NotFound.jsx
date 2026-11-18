import { Link } from 'react-router-dom';
import Petals from '../components/Petals.jsx';

export default function NotFound() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-gradient-to-b from-burgundy-dark to-midnight px-6 text-center">
      <Petals density={0.5} />
      <div className="relative z-10">
        <p className="eyebrow mb-4">Error 404</p>
        <h1 className="gold-text font-script text-7xl md:text-9xl">Lost?</h1>
        <p className="mx-auto mt-4 max-w-md font-serif text-xl italic text-ivory/75">
          This page doesn&rsquo;t exist, but the way back to us does.
        </p>
        <Link to="/" className="btn-gold mt-10">
          Take me home
        </Link>
      </div>
    </main>
  );
}
