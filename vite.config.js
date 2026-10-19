import {defineConfig} from 'vite';
import {copyFileSync,mkdirSync} from 'node:fs';
const dir=new URL('./node_modules/@rdkit/rdkit/dist/',import.meta.url);
export default defineConfig({base:'./',optimizeDeps:{entries:['index.html']},define:{global:'globalThis','process.env':{},'process.platform':JSON.stringify('browser')},resolve:{alias:{events:'events/'}},plugins:[{name:'local-rdkit',buildStart(){mkdirSync('public/rdkit',{recursive:true});for(const f of ['RDKit_minimal.js','RDKit_minimal.wasm'])copyFileSync(new URL(f,dir),'public/rdkit/'+f)}}],build:{commonjsOptions:{transformMixedEsModules:true},minify:false,chunkSizeWarningLimit:20000,rollupOptions:{onwarn(warning,warn){if(warning.code==='MODULE_LEVEL_DIRECTIVE')return;warn(warning)}}},server:{host:'0.0.0.0'}});
