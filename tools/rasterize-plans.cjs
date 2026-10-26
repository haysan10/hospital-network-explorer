// Run with CODEX_PRIMARY_RUNTIME_NODE for document work, or a Node installation with sharp.
const path=require('node:path');const fs=require('node:fs/promises');
const sharp=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'sharp'):'sharp');
(async()=>{const target=path.resolve(process.argv[2]||'plan-render');await fs.mkdir(target,{recursive:true});for(const f of [1,2])await sharp(path.join(__dirname,`../assets/denah-lantai-${f}.svg`),{density:180}).png().toFile(path.join(target,`denah-${f}.png`));})();
