const express = require('express');
const request = require("request");
const app = express();
const port = 3000;

// util for printing first n rows of dataset
function db_head(db, num) {
    for(let i = 0; i < num; i++) {
        console.log(db[i]);
    }
}


// convert arbitrary string to camelcase
function get_camelcase(name) {
    // regex weird stuff
    const split_name = name.split(/[//(//)\s,-]+/);
    let camel = split_name[0];
    // first word is always lowercase
    camel = camel[0].toLowerCase() + camel.slice(1).toLowerCase();
    for(let i = 1; i < split_name.length; i++) {
        // ensure we don't split unnecessarily, or rather account for irregular splitting when encountering ''
        if(split_name[i] !== '') {
            let word = split_name[i][0].toUpperCase() + split_name[i].slice(1).toLowerCase();
            camel += word;
        }
    }

    return camel;
}

function isDate(str) {
    // a good way to verify date => create datetime object via iso8601 standard
    let date_obj = new Date(str);
    if(date_obj.getFullYear() === 1970 || isNaN(date_obj.getFullYear())) {
        return false;
    }

    return true;
    
}

app.get("/schema", (req, res) => {

    type_map = {};

    map_bool = {
        "true" : 1,
        "false" : 0,
        "TRUE" : 1,
        "FALSE" : 0
    };


    request("https://app-media.noloco.app/noloco/dublin-bikes.json", (error, response, body) => {
        if (!error && response.statusCode === 200) {
            let data = JSON.parse(body);
            // let row = data[0];

            // option map
            option_map = {};
            
            name_map = {};

            for(row of data) {
                for(const [display, val] of Object.entries(row)) {
                    const name = get_camelcase(display);
                    name_map[display] = name;
                    
                    if(val === null || name in type_map) {
                        continue;
                    }
                    
                    else if(isDate(val)) {
                        type_map[name] = "DATE";                    
                    }

                    else if(typeof(val) === "boolean" || val in map_bool) {
                        type_map[name] = "BOOLEAN";
                    }
                    
                    else if(typeof(val) === "number" || !isNaN(val)) {
                        let new_val = val;
                        if(!isNaN(val) && typeof(val) === "string") {
                            new_val = +val;
                        }

                        if(Math.floor(new_val) === new_val) {
                            type_map[name] = "INTEGER";
                        }

                        else {
                            type_map[name] = "FLOAT";
                        }

                    }

                    else if(typeof(val) === "string") {
                        type_map[name] = "TEXT";
                    }

                    

                }
            
            }
                   
        }

        let schema_lst = [];
        for(const [disp_name, name] of Object.entries(name_map)) {
            let obj_schema = {
                "display": disp_name,
                "name" : name,
                "type" : type_map[name],
                "options" : [] 
            };

            schema_lst.push(obj_schema);

        }
        
        res.send(schema_lst);

    });

});


app.post("/data", (req, res) => {
    res.send("Testing POST...");
});

app.listen(port, () => {
    console.log("Server running on port: ", port);
});