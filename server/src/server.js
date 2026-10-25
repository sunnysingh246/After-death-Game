require("dotenv").config()
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const connectDb = require("./config/db");

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
    },
});

io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("Player disconnected:", socket.id);
    });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
    if (process.env.MONGODB_URI || process.env.MONGO_URI) {
        await connectDb();
    } else {
        console.warn("MongoDB URI not set; starting without database access.");
    }

    server.listen(PORT, () => {
        console.log(`AFTER DEATH server running on port ${PORT}`);
    });
}

startServer();
