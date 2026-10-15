import {mkdir,rm,cp} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'dist');
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const file of ['index.html','style.css','src','assets','vendor'])await cp(path.join(root,file),path.join(out,file),{recursive:true});
console.log('Static site ready: dist');
