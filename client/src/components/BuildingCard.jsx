import { Hammer } from "lucide-react";
import { useGameStore } from "../store/gameStore";

export default function BuildingCard({ type, title, description, cost }) {
  const build = useGameStore((state) => state.build);

  function handleBuild() {
    const result = build(type);
    window.alert(result.message);
  }

  return (
    <article className="building-card">
      <div className="building-icon">
        <Hammer size={25} />
      </div>

      <h3>{title}</h3>

      <p>{description}</p>

      <div className="building-cost">
        {Object.entries(cost).map(([resource, amount]) => (
          <span key={resource}>
            {resource}: {amount}
          </span>
        ))}
      </div>

      <button onClick={handleBuild}>Construct Building</button>
    </article>
  );
}
