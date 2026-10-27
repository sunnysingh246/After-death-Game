import { Trees, Home, Zap, Wheat } from "lucide-react";

import { useGameStore } from "../store/gameStore";

const icons = {
  shelter: Home,
  farm: Wheat,
  powerPlant: Zap,
};

export default function GameMap() {
  const buildings = useGameStore((state) => state.buildings);

  return (
    <section className="game-map">
      <div className="map-heading">
        <div>
          <p className="eyebrow">SECTOR 07</p>
          <h2>Ruined Earth</h2>
        </div>

        <span className="map-status">UNEXPLORED WORLD</span>
      </div>

      <div className="map-grid">
        <div className="map-decoration tree tree-one">
          <Trees size={30} />
        </div>

        <div className="map-decoration tree tree-two">
          <Trees size={24} />
        </div>

        <div className="map-decoration tree tree-three">
          <Trees size={28} />
        </div>

        <div className="settlement-marker">
          <div className="marker-pulse"></div>
          <Home size={32} />
          <span>YOUR SETTLEMENT</span>
        </div>

        {buildings.map((building, index) => {
          const Icon = icons[building.type] || Home;

          return (
            <div
              key={building.id}
              className={`placed-building placed-${index % 4}`}
              title={building.name}
            >
              <Icon size={25} />
              <span>{building.name}</span>
            </div>
          );
        })}

        <div className="map-coordinates">X: 073 · Y: 019</div>
      </div>
    </section>
  );
}
