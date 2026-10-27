import { ArrowRight, Skull, Globe, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { useGameStore } from "../store/gameStore";

export default function Home() {
  const startGame = useGameStore((state) => state.startGame);

  return (
    <main className="home-page">
      <div className="home-overlay"></div>

      <section className="hero-content">
        <p className="eyebrow">YEAR 2089 · AFTER THE COLLAPSE</p>

        <h1>
          THE WORLD
          <br />
          <span>IS NOT DEAD.</span>
        </h1>

        <p className="hero-description">
          Civilization has fallen. Resources are scarce. The future belongs to those who rebuild.
        </p>

        <div className="home-actions">
          <button className="primary-button" onClick={startGame}>
            ENTER THE WASTELAND
            <ArrowRight size={20} />
          </button>

          <Link className="world-button" to="/world">
            <Globe size={18} />
            ENTER WORLD
          </Link>
        </div>

        <div className="world-stats">
          <div>
            <Skull size={20} />
            <span>WORLD STATUS</span>
            <strong>COLLAPSED</strong>
          </div>

          <div>
            <Globe size={20} />
            <span>SECTOR</span>
            <strong>07 / UNKNOWN</strong>
          </div>

          <div>
            <Users size={20} />
            <span>SURVIVORS</span>
            <strong>SCATTERED</strong>
          </div>
        </div>
      </section>

      <div className="hero-footer">SURVIVE · BUILD · RECLAIM</div>
    </main>
  );
}
