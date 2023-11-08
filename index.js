const express = require('express');
const request = require("request");
const app = express();
const port = 3000;

function bd_head(db, num) {
    for(let i = 0; i < num; i++) {
        console.log(db[i]);
    }
}

function get_camelcase(name) {
    const split_name = name.split(" ");
    console.log(split_name);
    for(let i = 0; i < split_name.length; i++) {
        console.log(split_name[i]);
    }
}

app.get("/schema", (req, res) => {
    get_camelcase("hello there buddy");
    // request("https://app-media.noloco.app/noloco/dublin-bikes.json", (error, response, body) => {
    //     if (!error && response.statusCode === 200) {
    //         let data = JSON.parse(body);
    //         bd_head(data, 10);
    //         console.log(data);
        
    //     }
    //     res.send("Testing GET...");
    // });

});


app.post("/data", (req, res) => {
    res.send("Testing POST...");
});

app.listen(port, () => {
    console.log("Hello world");
});