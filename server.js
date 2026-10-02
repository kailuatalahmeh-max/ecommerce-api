const app = require("./myApp");
const errorHandler = require("./src/middlewares/errorMiddleware");

const PORT = process.env.PORT || 5000;

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Node is listening on port ${PORT}...`);
});
