# api-call-simplifier

A small library that makes it easy to write a client to work with the API.

## Installation

```shell
$ npm i -S api-call-simplifier
```

## Usage

### NodeJS example

```javascript
const axios = require('axios');
const API = require('api-call-simplifier');


const { apiCall, resource } = API(axios.create({
    baseURL: 'https://jsonplaceholder.typicode.com',
}));

const api = {
    posts: resource('/posts'),
    comments: resource('/comments'),
    albums: resource('/albums'),
    photos: resource('/photos'),
    todos: resource('/todos'),
    users: resource('/users'),
    post: {
        comments: resource('/posts/<id>/comments')
    }
};
```

### NuxtJS example

[![Edit demo-api-call-simplifier](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/vibrant-noyce-wpgg7?fontsize=14&hidenavigation=1&module=%2Fcore%2Fapi.js&theme=dark&view=editor)

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

[comment]: <> (## History)

[comment]: <> (TODO: Write history)

[comment]: <> (## Credits)

[comment]: <> (TODO: Write credits)

[comment]: <> (## License)

[comment]: <> (TODO: Write license)
