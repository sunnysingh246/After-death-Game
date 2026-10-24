const mongoose = require("mongoose")

async function connectDb() {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log("MONGODB connected successfully")
    } catch (error) {
        console.error("Failed to connect with database", error.message)
        process.exit(1)
    }
}

module.exports = connectDb