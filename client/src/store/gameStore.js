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

const STORAGE_KEY = "after-death-save";

function loadSavedGame() {
    if (typeof window === "undefined") return {};

    try {
        const serialized = window.localStorage.getItem(STORAGE_KEY);
        if (!serialized) return {};

        const savedGame = JSON.parse(serialized);
        if (!savedGame || typeof savedGame !== "object" || Array.isArray(savedGame)) {
            throw new Error("Saved game must be an object.");
        }

        const resources = { ...INITIAL_RESOURCES };
        for (const key of Object.keys(INITIAL_RESOURCES)) {
            const value = savedGame.resources?.[key];
            if (Number.isFinite(value) && value >= 0) resources[key] = value;
        }

        const buildings = Array.isArray(savedGame.buildings)
            ? savedGame.buildings
                .filter((building) =>
                    building &&
                    typeof building.id === "string" &&
                    Object.hasOwn(BUILDINGS, building.type)
                )
                .map((building) => ({
                    id: building.id,
                    type: building.type,
                    name: BUILDINGS[building.type].name,
                }))
            : [];

        return {
            resources,
            buildings,
            civilizationName:
                typeof savedGame.civilizationName === "string"
                    ? savedGame.civilizationName
                    : "New Dawn",
            gameStarted: typeof savedGame.gameStarted === "boolean"
                ? savedGame.gameStarted
                : false,
        };
    } catch (error) {
        console.error("Could not load game:", error);
        return {};
    }
}

const savedGame = loadSavedGame();

export const useGameStore = create((set, get) => ({
    resources: savedGame.resources || { ...INITIAL_RESOURCES },

    buildings: savedGame.buildings || [],

    civilizationName: savedGame.civilizationName ?? "New Dawn",
    gameStarted: savedGame.gameStarted ?? false,

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
            STORAGE_KEY,
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