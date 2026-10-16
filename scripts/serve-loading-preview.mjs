// Local QA server: compress text like Pages so Lighthouse comparisons do not
// penalise a combined stylesheet simply because Python serves it uncompressed.
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const root=path.resolve(process.argv[2]);
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
http.createServer(async(request,response)=>{
  try {
    const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
    if(!file.startsWith(root+path.sep)){response.writeHead(403).end();return;}
    const type=types[path.extname(file)]||'application/octet-stream';
    let body=await readFile(file);
    const headers={'content-type':type,'cache-control':'no-store'};
    if(/gzip/.test(request.headers['accept-encoding']||'')&&/^(text\/|application\/json)/.test(type)){
      body=gzipSync(body);headers['content-encoding']='gzip';headers.vary='Accept-Encoding';
    }
    response.writeHead(200,headers).end(body);
  }catch{response.writeHead(404).end('Not found');}
}).listen(Number(process.argv[3]),'127.0.0.1');
