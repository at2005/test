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
    let camel = split_name[0];
    for(let i = 1; i < split_name.length; i++) {
        let word = split_name[i][0].toUpperCase() + split_name[i].slice(1);
        camel += word;
    }

    return camel;
}

app.get("/schema", (req, res) => {
    console.log(get_camelcase("hello there buddy"));
    res.send("Hello");
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