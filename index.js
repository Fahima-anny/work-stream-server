const express = require("express") ;
const app = express() ;
const port = process.env.PORT || 5000 ;

app.get("/", (req, res) => {
    res.send("My Server is running bro") ;
}) ;

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
})