import React,{useMemo,useState,useRef} from 'react';
import {Editor} from 'ketcher-react';
import {StandaloneStructServiceProvider} from 'ketcher-standalone';
import 'ketcher-react/dist/index.css';
export default function Sketcher({onReady,draft,onDraft}){
 const provider=useMemo(()=>new StandaloneStructServiceProvider(),[]);
 const [error,setError]=useState(''); const timer=useRef(null);
 return <><Editor staticResourcesUrl={import.meta.env.BASE_URL} structServiceProvider={provider} errorHandler={e=>setError(String(e?.message||e))} onInit={async k=>{
   if(draft){try{await k.setMolecule(draft)}catch{setError('The saved drawing could not be restored. Please redraw it.')}}
   onReady(k);
   k.editor.subscribe('change',()=>{clearTimeout(timer.current);timer.current=setTimeout(async()=>{try{onDraft(await k.getMolfile('v3000'))}catch{/* incomplete drawing */}},400)});
 }}/>{error&&<p className="editor-error" role="alert">{error}</p>}</>;
}
