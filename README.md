# test
challenge


- /schema: GET request. Fetch dataset using request API. Then, we iterate over each entry in the row, and piece together the schema. First step is computing the camelCase variants of each name, done using Regex-splitting and rejoining.
- A name_map is created and populated, as well as an option_map. The former is designed to associate display names with their corresponding camelCase names, while the latter is designed to store frequencies of
  the different values the individual fields can take.
- The types for various fields are computed. If a field is NULL, we simply skip and check the next entry in the dataset.
- To check if a field is of type option, we look at how many different values the fields can take. This is determined by a hyperparameter I creatively named "param", which we essentially use to determine the maximum
  size of an option list. Obviously if we have thousands of "options" with low frequency that's not really an option is it? We could try make this better mathematically by checking how multimodal the distribution
  is and the magnitude of the peaks but I haven't thought too much about it.
- First a list of key:value pairs consisting of field names and their respective types is created. This is done to ensure we create the most optimum representation/don't prematurely assign types. Then we iterate over them to create the full
  schema, ie the Array of Field objects.

  - /data: POST request. Fetch dataset. Iterate over each entry, then iterate over each query.
  - Use a function-table to map each query operation to a bool function. Evaluate the bool function on the specified arguments. If NOT operator used, prepending the actual operation, ie "not eq", then the bool function return value
    is negated.
  -  For sorting, the syntax is {orderBy: {fieldName: type}} where type is in ["asc", "desc"]. I use Array.sort with custom comparison function relying on signage of a-b to determine position of a relative to b. If descending, then multiply by -1 to reverse signage thus order.
  -  Cumulative product of 1s and 0s used for computing AND chains that determine if an entry matches the filter criteria.
  -  Data normalised when returned. The most common mis-formatting is representing bools and numbers as strings, so I handle that case. Unsure about datetimes, I will likely have to write some custom date-processing functionality, but right now I can validate a datetime string by creating a Date object and checking if the year is not 1970.
  -  Use the head attribute to specify how many entries are returned: {head : num}, ie slice list up to that index.

    I would add more optimisations to make this cleaner/quicker/avoid recomputing things, e.g. store dataset + schema instead of recomputing schema each time /data is called. I also haven't gotten a chance to implement the
  last three extra features. If I stored the dataset using a JSON object whereby the key was the station ID and the value being the rest of the object, I could easily write code that efficiently fetches the corresponding station from ID and then it's a matter of simply returning/updating the fields/deleting by key.

Also, I didn't get a chance to do the final three extra features, but they are
trivial if we reformat the dataset into an object whose keys are station IDs and whose values are the data entries
for that station. Then we can retrieve through keying, or delete/modify etc.

  # How to run? 
  Run node index.js to start the server.
