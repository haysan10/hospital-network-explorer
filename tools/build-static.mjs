import {cp,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'dist');
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const entry of ['index.html','style.css','responsive.css','src','assets','vendor'])await cp(path.join(root,entry),path.join(out,entry),{recursive:true});
console.log('Static site built from bundled offline assets.');
