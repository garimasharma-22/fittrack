
import "dotenv/config";
import app from "./app";
import { connectDatabase } from "./config/database";

const PORT = Number(process.env.PORT) || 5000;

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`FitTrack API running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start FitTrack:", error);
    process.exit(1);
  }
};

void startServer();
