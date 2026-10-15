// Alternative launcher for computers with Node.js 18+ and no Python.
import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';

const root=path.dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2),index=args.indexOf('--port'),base=index<0?8080:Number(args[index+1]);
if(args.includes('--check')){
  for(const p of ['index.html','src/app.js','vendor/three.module.js','vendor/three.core.js','assets/models/floor-1.glb','assets/models/floor-2.glb'])if(!existsSync(path.join(root,p)))throw new Error('Berkas tidak tersedia: '+p);
  console.log('OK. Berkas peluncuran tersedia. Node '+process.version);
}else{
  if(!Number.isInteger(base)||base<1024||base>65525)throw new Error('Gunakan --port 1024 sampai 65525.');
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.svg':'image/svg+xml','.md':'text/plain; charset=utf-8'};
  const server=http.createServer(async(req,res)=>{
    try{
      const requestPath=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
      const file=path.resolve(root,'.'+(requestPath==='/'?'/index.html':requestPath));
      if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
      if(!(await stat(file)).isFile()){res.writeHead(404);res.end('Not found');return;}
      const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':data.length,'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data);
    }catch(error){res.writeHead(error.code==='ENOENT'?404:400);res.end('File tidak ditemukan atau alamat tidak valid.');}
  });
  let port=base;
  server.on('error',err=>{if(err.code==='EADDRINUSE'&&port<base+9){port++;server.listen(port,'127.0.0.1');}else{console.error('Server tidak dapat dibuka:',err.message);process.exit(1);}});
  server.on('listening',()=>{
    const url=`http://127.0.0.1:${port}/`;
    console.log(`\nMediLink Hospital Network Explorer\nBuka: ${url}\nSemua aset tersedia lokal. Tekan Ctrl+C untuk menutup server.\n`);
    if(!args.includes('--no-open')){
      const command=process.platform==='darwin'?'open':process.platform==='win32'?'cmd':'xdg-open';
      const parameters=process.platform==='win32'?['/c','start','',url]:[url];
      const child=spawn(command,parameters,{stdio:'ignore',detached:true});child.on('error',()=>{});child.unref();
    }
  });
  server.listen(port,'127.0.0.1');
}
