// 这是一个“桥接”文件，让 Vercel 能找到根目录下的 server.js
const app = require('../server'); // 引入根目录的 server.js

module.exports = app;