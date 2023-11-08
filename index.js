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


function create_schema() {
    type_map = {};

    map_bool = {
        "true" : 1,
        "false" : 0,
        "TRUE" : 1,
        "FALSE" : 0
    };

    return new Promise ((resolve, reject) => {
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
                    if(name in option_map) {
                        if(val in option_map[name]) {
                            option_map[name][val] += 1;
                        } else {
                            option_map[name][val] = 1;
                        }   
                    } else {
                        option_map[name] = {};
                    }
                    

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

            check_opt = option_map[name];
            for(const [vals, freqs] of Object.entries(check_opt)) {
                
            }

            let obj_schema = {
                "display": disp_name,
                "name" : name,
                "type" : type_map[name],
                "options" : [] 
            };

            schema_lst.push(obj_schema);

        }

        resolve(schema_lst);
        
    });});
        
}


app.get("/schema", (req, res) => {
    create_schema().then((result) => {
        res.send(result);
    });
})


function get_dataset() {
    return new Promise( (resolve, reject) => {
        request("https://app-media.noloco.app/noloco/dublin-bikes.json", (error, response, body) => {
            if (!error && response.statusCode === 200) {
                let data = JSON.parse(body);
                resolve(data);
            }});
    });
}

app.post("/data", (req, res) => {

    // conditional object, ie where clause
    get_dataset().then(dset => {
        const cond_obj = req["where"];
        create_schema().then(res_schema => {
            let schema = res_schema;
        // we want to iterate over each query
        for(const [col, filter_clause] of Object.entries(cond_obj)) {
            // and pick out which name we're querying/talking about, ie the display name corresponding to the standardised name
            let disp = "";
            for(el of schema) {
                if(el.name === col) {
                    disp = el.display;
                }
            }

            filtered_lst = [];

            // and then we want to pick out all the entries that satisfy filter_clause
            for(entry of dset) {
                let op_map = {
                    "gt" : (col_name, val_cmp) => {
                        if(entry[col_name] > val_cmp) {
                            return true;
                        }},
                    
                    "eq" : (col_name, val_cmp) => {
                        if(entry[col_name] === val_cmp) {
                            return true;
                        }}, 
                    
                    "lt" : (col_name, val_cmp) => {
                        if(entry[col_name] < val_cmp) {
                            return true;
                        }}
                };

                let op = Object.keys(filter_clause)[0]; 
                // console.log(filter_clause);
                let val = filter_clause[op]; 
                let afunc = op_map[op];

                if(afunc(disp, val)) {
                    filtered_lst.push(entry);
                }

            }

            res.send(filtered_lst);

        }
 });
 });

});

app.listen(port, () => {
    // console.log("Server running on port: ", port);

        let req = {
            "where" : {"bonus" : {"eq" : true}, 
                    "availableBikes" : {"gt" : 23},
                    "stationId" : {"eq" : 98}
        },
            "orderby" : {"availableBikes" : "desc"},

            "head" : 2
        };

     // conditional object, ie where clause
     get_dataset().then(dset => {
        const cond_obj = req["where"];
        let must_order = false;
        let ordering = "";
        let col_name_order = "";
        let type_ordering = "";
        let order_disp = "";

        if("orderby" in req) {
            must_order = true;
            ordering = req["orderby"];
            col_name_order = Object.keys(ordering)[0];
            type_ordering = ordering[col_name_order];
        }

        filtered_lst = [];

        create_schema().then(res => {
            let schema = res;
         // we want to iterate over each entry
         for(entry of dset) {
            // and then each query
            let bval = 1;
            for(const [col, filter_clause] of Object.entries(cond_obj)) {
                // and pick out which name we're querying/talking about, ie the display name corresponding to the standardised name
                let disp = "";
                
                for(el of schema) {
                    if(el.name === col) {
                        disp = el.display;
                    }

                    if(must_order) {
                        if(el.name === col_name_order) {
                            order_disp = el.display;
                        }
                    }
                }

                let op_map = {
                    "gt" : (col_name, val_cmp) => {
                        if(entry[col_name] > val_cmp) {
                            return true;
                        } return false; },
                    
                    "eq" : (col_name, val_cmp) => {
                        if(entry[col_name] === val_cmp) {
                            return true;
                        } return false;}, 
                    
                    "lt" : (col_name, val_cmp) => {
                        if(entry[col_name] < val_cmp) {
                            return true;
                        } return false; }
                };

                let op = Object.keys(filter_clause)[0]; 
                let val = filter_clause[op]; 
                let afunc = op_map[op];
                // call function and push if it meets criterion
                bval *= afunc(disp, val);
                // if(afunc(disp, val)) {
                //     filtered_lst.push(entry);
                // }

            }

            if(bval) {
                filtered_lst.push(entry);
            }
            
        
        }


         if(must_order) {
            filtered_lst.sort((a, b) => {
                let factor = type_ordering === "asc" ? 1 : -1;
                return factor * (a[order_disp] - b[order_disp]);
            });
        }  
        
        if("head" in req) {
            
            console.log(filtered_lst.slice(0,req["head"]));
            
        }


     });
     });


});