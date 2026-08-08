const app = require("./myApp");

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Node is listening on port ${PORT}...`);
});
