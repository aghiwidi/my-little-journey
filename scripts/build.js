const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist');
function rm(p){fs.rmSync(p,{recursive:true,force:true})}
function cp(src,dst){fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst)}
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(path.join(dir,d.name)):[path.join(dir,d.name)])}
rm(dist);fs.mkdirSync(dist,{recursive:true});
for(const f of files(root)){const rel=path.relative(root,f);if(['dist','node_modules','.git','worker','content'].includes(rel.split(path.sep)[0]) || rel==='wrangler.toml' || rel.startsWith('scripts'+path.sep)||rel==='package.json'||rel==='package-lock.json'||rel==='.pages.yml'||rel==='README.md'||rel==='.gitignore')continue;if(path.basename(f)==='.gitkeep')continue;cp(f,path.join(dist,rel))}
function read(dir){return files(path.join(root,dir)).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(f,'utf8')))}
const videos=read('content/videos').filter(x=>x.status==='published'),articles=read('content/jurnal').filter(x=>x.status==='published'),site=JSON.parse(fs.readFileSync(path.join(root,'content/settings/site.json'),'utf8'));
fs.mkdirSync(path.join(dist,'data'),{recursive:true});
fs.writeFileSync(path.join(dist,'data/videos.json'),JSON.stringify(videos));
fs.writeFileSync(path.join(dist,'data/jurnal.json'),JSON.stringify(articles));
fs.writeFileSync(path.join(dist,'data/site.json'),JSON.stringify(site));
console.log(`Build complete: ${videos.length} videos, ${articles.length} journal entries, site settings loaded.`);
