import { Trees, Hammer, Wheat, Zap } from "lucide-react";

import { useGameStore } from "../store/gameStore";

export default function ResourceBar() {
  const resources = useGameStore((state) => state.resources);

  const items = [
    {
      key: "wood",
      label: "WOOD",
      icon: Trees,
    },
    {
      key: "metal",
      label: "METAL",
      icon: Hammer,
    },
    {
      key: "food",
      label: "FOOD",
      icon: Wheat,
    },
    {
      key: "energy",
      label: "ENERGY",
      icon: Zap,
    },
  ];

  return (
    <section className="resource-bar">
      {items.map(({ key, label, icon: Icon }) => (
        <div className="resource-item" key={key}>
          <Icon size={22} />

          <div>
            <p>{label}</p>
            <strong>{resources[key]}</strong>
          </div>
        </div>
      ))}
    </section>
  );
}
