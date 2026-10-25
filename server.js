require("dotenv").config();
const app = require("./myApp");
const connectDB = require("./src/config/db").default

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Node is listening on port ${PORT}...`);
  });
});
