import { create } from "zustand";

const INITIAL_RESOURCES = {
    wood: 100,
    metal: 80,
    food: 150,
    energy: 50,
};

const BUILDINGS = {
    shelter: {
        name: "Shelter",
        cost: { wood: 30, metal: 10 },
        description: "Provides protection for survivors.",
    },
    farm: {
        name: "Hydroponic Farm",
        cost: { wood: 20, metal: 15, energy: 5 },
        description: "Produces food for your civilization.",
    },
    powerPlant: {
        name: "Power Plant",
        cost: { wood: 25, metal: 30 },
        description: "Generates energy for your settlement.",
    },
};

export const useGameStore = create((set, get) => ({
    resources: INITIAL_RESOURCES,

    buildings: [],

    civilizationName: "New Dawn",

    gameStarted: false,

    startGame: () => {
        set({ gameStarted: true });
    },

    build: (buildingType) => {
        const building = BUILDINGS[buildingType];

        if (!building) {
            return { success: false, message: "Unknown building." };
        }

        const { resources, buildings } = get();

        const canAfford = Object.entries(building.cost).every(
            ([resource, amount]) => resources[resource] >= amount
        );

        if (!canAfford) {
            return {
                success: false,
                message: "Not enough resources!",
            };
        }

        const updatedResources = { ...resources };

        Object.entries(building.cost).forEach(([resource, amount]) => {
            updatedResources[resource] -= amount;
        });

        set({
            resources: updatedResources,
            buildings: [
                ...buildings,
                {
                    id: crypto.randomUUID(),
                    type: buildingType,
                    name: building.name,
                },
            ],
        });

        return {
            success: true,
            message: `${building.name} constructed successfully!`,
        };
    },

    produceResources: () => {
        const { buildings, resources } = get();

        const updatedResources = { ...resources };

        buildings.forEach((building) => {
            if (building.type === "farm") {
                updatedResources.food += 10;
            }

            if (building.type === "powerPlant") {
                updatedResources.energy += 5;
            }
        });

        set({ resources: updatedResources });
    },

    resetGame: () => {
        set({
            resources: { ...INITIAL_RESOURCES },
            buildings: [],
            civilizationName: "New Dawn",
            gameStarted: false,
        });
    },
}));

useGameStore.subscribe((state) => {
    try {
        localStorage.setItem(
            "after-death-save",
            JSON.stringify({
                resources: state.resources,
                buildings: state.buildings,
                civilizationName: state.civilizationName,
                gameStarted: state.gameStarted,
            })
        );
    } catch (error) {
        console.error("Could not save game:", error);
    }
});