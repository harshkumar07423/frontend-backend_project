const mongoose = require('mongoose');

const uri = "mongodb+srv://harsh123:harsh7857@cluster0.xm546im.mongodb.net/bhumisetu?retryWrites=true&w=majority";

mongoose.connect(uri)
  .then(() => {
    console.log("Connected successfully to Atlas!");
    process.exit(0);
  })
  .catch(err => {
    console.error("Connection failed:", err.message);
    process.exit(1);
  });
