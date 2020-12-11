# ga-check-yaml-array
Simple Github Action to check whether the array in YAML file is sorted correctly

## Parameters
### `file`
YAML file to be checked if the array is sorted (required)
### `sortKey`
Sort Key if the array is an object or not atomic, it will sort based on the name of the key given
### `uniqueKeys`
Comma separated string, with the key names where the value of the keys should be unique
### `requiredKeyTypes`
Comma separated string, with column separated string as each key type pair, with the key names of required keys and its type
### `optionalKeyTypes`
Comma separated string, with column separated string as each key type pair, with the key names of optional keys and its type'

## How to use
```
-   name: Checkout GH Action
    uses: actions/checkout@v2                            
    with:
        repository: rjmasikome/ga-check-yaml-array
        ref: dev-v1        
        path: .github/actions                  
    
-   name: Check YAML Array (Private Action)
    # Same directory as path on the prev step, where the action.yaml or Dockerfile
    uses: ./.github/actions
    with:
        file: config/sources.yaml
        sortKey: clientId
        uniqueKeys: clientId
        requiredKeyTypes: clientId:string,description:string
        optionalKeyTypes: sa_enabled:boolean,migrated:boolean,redirectUris:string[]
```