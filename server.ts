import "dotenv/config";
import app from "./myApp";
import connectDB from "./src/config/db";

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Node is listening on port ${PORT}...`);
  });
});
