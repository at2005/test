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

            // option map, this is kind of a frequency counter for the values different fields take in our dataset
            option_map = {};
            // name map, maps display to camelcase names
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
                        // convert string values here, mainly to check if float or integer
                        if(!isNaN(val) && typeof(val) === "string") {
                            new_val = +val;
                        }

                        // how to distinguish between integers and floats? well the former does 
                        // not differ from its original value if ceil or floor applied
                        if(Math.floor(new_val) === new_val) {
                            type_map[name] = "INTEGER";
                        } else {
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

            let opts = [];
            let type_ = type_map[name];
            check_opt = option_map[name];
            if(type_map[name] === "TEXT") {
                // hyperparameter we can tune, we basically see how spread out the values are
                // if they are super spread out, then we know it is likely not to be an option!
                param = 5;
                if(Object.keys(check_opt).length <= param) {
                    opts = Object.keys(check_opt);
                    type_ = "OPTION";
                }
            }

            let obj_schema = {
                "display": disp_name,
                "name" : name,
                "type" : type_,
                "options" : opts
            };

            schema_lst.push(obj_schema);
            
        }
        // return a bunch of stuff for good measure
        resolve([schema_lst, name_map, type_map]);
        
    });});
        
}


app.get("/schema", (req, res) => {
    create_schema().then((result) => {
        res.send(result[0]);
    });
})


// normalise poorly formatted data to appropriate values
function normalise(datapoint, real_type) {
    if(typeof(datapoint) !== real_type) {
        if(real_type === "FLOAT" || real_type === "INTEGER") {
            // convert to number as only case where two would differ is if it consists of text
            return +datapoint
        }

        else if(real_type === "BOOLEAN") {
            // if we are given a number, ie 1 or 0 instead of t/f, then we can
            // simply convert it:
            if(typeof(datapoint) === "number") {
                return datapoint > 0 ? 1 : 0;
            } else {
                // use JS weird quirks to check
                return real_type.toLowerCase()  === true;
            }
        } 
    }

    return datapoint;
}

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
        let must_order = false;
        let ordering = "";
        let col_name_order = "";
        let type_ordering = "";
        let order_disp = "";

        if("orderBy" in req) {
            must_order = true;
            ordering = req["orderBy"];
            col_name_order = Object.keys(ordering)[0];
            type_ordering = ordering[col_name_order];
        }

        filtered_lst = [];

        create_schema().then(res => {
            let schema = res[0];
            let name_map = res[1];
            let type_map = res[2];
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

                // use function map instead of if-else statements, cleaner
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

                let afunc = op_map[op.split(" ").at(-1)];
                
                let cond_eval =  afunc(disp, val);
                                
                if(op.split(" ").length > 1) {
                    // then we assume command is "not",
                    // so we not our previously computed boolean value
                    cond_eval = !cond_eval;
                }
                
                // cumulative product is practically repeated AND statements, one zero and the whole thing is rendered invalid, which
                // is what we want!
                bval *= cond_eval;

            }
            
            if(bval) {
                std_entry = {};
                for(const [key, val] of Object.entries(entry)) {
                  std_entry[name_map[key]] = normalise(val, type_map[name_map[key]]);  
                } 
                filtered_lst.push(std_entry);
            }
            
        }

        
         if(must_order) {
            filtered_lst.sort((a, b) => {
                let factor = type_ordering === "asc" ? 1 : -1;
                return factor * (a[order_disp] - b[order_disp]);
            });
        }  
        
        if("head" in req) {
            res.send(filtered_lst.slice(0,req["head"]));
        } else {
            res.send(filtered_lst);
        }

     });
     });


});



app.listen(port, () => {
    console.log("Server running on port: ", port);
});
//         let req = {
//             "where" : {"bonus" : {"eq" : true}, 
//                     "availableBikes" : {"gt" : 23},
//                     "stationId" : {"not eq" : 98}
//                     },
//             "orderBy" : {"availableBikes" : "desc"}

//             // "head" : 2
//         };


//      // conditional object, ie where clause
//      get_dataset().then(dset => {
//         const cond_obj = req["where"];
//         let must_order = false;
//         let ordering = "";
//         let col_name_order = "";
//         let type_ordering = "";
//         let order_disp = "";

//         if("orderBy" in req) {
//             must_order = true;
//             ordering = req["orderBy"];
//             col_name_order = Object.keys(ordering)[0];
//             type_ordering = ordering[col_name_order];
//         }

//         filtered_lst = [];

//         create_schema().then(res => {
//             let schema = res[0];
//             let name_map = res[1];
//             let type_map = res[2];
//          // we want to iterate over each entry
//          for(entry of dset) {
//             // and then each query
//             let bval = 1;
//             for(const [col, filter_clause] of Object.entries(cond_obj)) {
//                 // and pick out which name we're querying/talking about, ie the display name corresponding to the standardised name
//                 let disp = "";
                
//                 for(el of schema) {
//                     if(el.name === col) {
//                         disp = el.display;
//                     }

//                     if(must_order) {
//                         if(el.name === col_name_order) {
//                             order_disp = el.display;
//                         }
//                     }
//                 }

//                 let op_map = {
//                     "gt" : (col_name, val_cmp) => {
//                         if(entry[col_name] > val_cmp) {
//                             return true;
//                         } return false; },
                    
//                     "eq" : (col_name, val_cmp) => {
//                         if(entry[col_name] === val_cmp) {
//                             return true;
//                         } return false;}, 
                    
//                     "lt" : (col_name, val_cmp) => {
//                         if(entry[col_name] < val_cmp) {
//                             return true;
//                         } return false; }
//                 };
                
//                 let op = Object.keys(filter_clause)[0];
                
//                 let val = filter_clause[op];

//                 let afunc = op_map[op.split(" ").at(-1)];
                
//                 let cond_eval =  afunc(disp, val);
                
//                 // console.log(op.split(" "));

//                 if(op.split(" ").length > 1) {
//                     // then we assume command is "not"
//                     cond_eval = !cond_eval;
//                 }
                
//                 // call function and push if it meets criterion
//                 bval *= cond_eval;

//             }
            
//             if(bval) {
//                 std_entry = {};
//                 for(const [key, val] of Object.entries(entry)) {
//                   std_entry[name_map[key]] = normalise(val, type_map[name_map[key]]);  
//                 } 
//                 filtered_lst.push(std_entry);
//             }
            
//         }

        
//          if(must_order) {
//             filtered_lst.sort((a, b) => {
//                 let factor = type_ordering === "asc" ? 1 : -1;
//                 return factor * (a[order_disp] - b[order_disp]);
//             });
//         }  
        
//         if("head" in req) {
//             console.log(filtered_lst.slice(0,req["head"]));
//         } else {
//             console.log(filtered_lst);
//         }


//      });
//      });


// });