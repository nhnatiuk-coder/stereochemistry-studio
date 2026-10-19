import React,{useState,useMemo,useEffect} from 'react';
import {kindNames,relations} from './chemistry.js';
import {problemCatalog,filterCatalog} from './catalog.js';

const catalog=problemCatalog();
const labels={assign:'Assign R/S',draw:'Draw from a Name',pairs:'Compare Compounds'};
const tiers=['','Intro','Intermediate','Advanced'];
function Structure({m,index,label}){return <div className="molecule" role="img" aria-label={label} dangerouslySetInnerHTML={{__html:m.views[index].svg}}/>;}
function ViewPicker({m,value,onChange,label,perspective}){
  return <label className="catalog-view">{label}<select value={value} onChange={e=>onChange(Number(e.target.value))}>{m.views.map((v,i)=>(perspective==='all'||v.kind===perspective)&&<option key={i} value={i}>{kindNames[v.kind]} · view {i+1}</option>)}</select></label>;
}
function Problem({q,answers,perspective}){
  const first=m=>perspective==='all'||q.task==='draw'?0:m.views.findIndex(v=>v.kind===perspective);
  const [va,setVa]=useState(first(q.a)),[vb,setVb]=useState(q.b&&q.a.id===q.b.id&&q.b.views.length>1&&perspective==='all'?1:q.b?first(q.b):0);
  return <article className="panel catalog-problem" data-problem-id={q.id}>
    <div className="catalog-meta"><span className="pill">{q.id}</span><span>{tiers[Math.max(q.a.level,q.b?.level||0)]}</span></div>
    <h2>{q.task==='assign'?'Assign R or S to each labeled stereocenter.':q.task==='draw'?`Draw ${q.a.name}.`:'How are these two compounds related?'}</h2>
    {q.task==='assign'?<><p className="view-label">{kindNames[q.kind]}</p><Structure m={q.a} index={q.va} label="R/S problem structure"/></>:q.task==='pairs'?<div className="pair"><div><ViewPicker m={q.a} value={va} onChange={setVa} label="Compound A" perspective={perspective}/><Structure m={q.a} index={va} label="Compound A"/></div><div><ViewPicker m={q.b} value={vb} onChange={setVb} label="Compound B" perspective={perspective}/><Structure m={q.b} index={vb} label="Compound B"/></div></div>:<p>Draw the complete named structure in Ketcher, including the specified absolute configurations. Any equivalent correct orientation is accepted.</p>}
    {answers&&<div className="solution"><h3>Instructor answer</h3><p><b>{q.answer}</b></p>{q.task==='pairs'?<p>{q.explanation}</p>:<><p>{q.a.name} · Formula: {q.a.formula}</p><p>{q.a.centers.map(c=>`Carbon ${c.locant} is ${c.value}`).join('; ')}. Apply CIP priorities with the lowest-priority group pointing away; reverse the apparent direction when that group points toward you.</p>{q.task==='draw'&&<><ViewPicker m={q.a} value={va} onChange={setVa} label="Example correct drawing" perspective="all"/><Structure m={q.a} index={va} label={`Correct structure for ${q.a.name}`}/></>}</>}</div>}
  </article>;
}
export default function Instructor(){
  const [filters,setFilters]=useState({task:'assign',level:'all',perspective:'all',relationship:'all',search:''});
  const [page,setPage]=useState(0),[answers,setAnswers]=useState(true);
  const items=useMemo(()=>filterCatalog(catalog,filters),[filters]);
  const counts=useMemo(()=>Object.fromEntries(Object.keys(labels).map(t=>[t,catalog.filter(q=>q.task===t).length])),[]);
  const size=12,pages=Math.max(1,Math.ceil(items.length/size));
  useEffect(()=>setPage(0),[filters]);
  function set(k,v){setFilters(s=>({...s,[k]:v}));setPage(0)}
  const pagination=<div className="catalog-pagination"><button disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous page</button><span>Page {page+1} of {pages}</span><button disabled={page+1>=pages} onClick={()=>setPage(p=>p+1)}>Next page</button></div>;
  return <><div className="page-title"><span className="pill">Instructor page</span><h1>Preview the complete problem bank.</h1><p>Browse every R/S drawing, every named drawing prompt, and every unordered compound pairing available to the practice generator. Answers are shown below each problem.</p></div>
    <section className="panel catalog-controls"><div className="catalog-tabs" role="group" aria-label="Problem type">{Object.entries(labels).map(([v,label])=><button key={v} className={filters.task===v?'primary':''} onClick={()=>set('task',v)}>{label} ({counts[v]})</button>)}</div>
    <div className="catalog-filters"><label>Search problems<input type="search" value={filters.search} onChange={e=>set('search',e.target.value)} placeholder="Name, formula, answer, or problem ID"/></label><label>Difficulty<select value={filters.level} onChange={e=>set('level',e.target.value)}><option value="all">All difficulties</option>{tiers.slice(1).map((t,i)=><option key={t} value={i+1}>{t}</option>)}</select></label>
    {filters.task!=='draw'&&<label>Projection<select value={filters.perspective} onChange={e=>set('perspective',e.target.value)}><option value="all">All projections</option>{Object.entries(kindNames).map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>}
    {filters.task==='pairs'&&<label>Relationship<select value={filters.relationship} onChange={e=>set('relationship',e.target.value)}><option value="all">All relationships</option>{relations.map(r=><option key={r}>{r}</option>)}</select></label>}</div>
    <label className="catalog-answer-toggle"><input type="checkbox" checked={answers} onChange={e=>setAnswers(e.target.checked)}/>Show answers and explanations</label>
    <p className="muted">{items.length} matching problems. {filters.task==='pairs'?'Each pair appears once; use its projection selectors to inspect every available drawing combination. Pair difficulty is the higher of the two molecules’ levels.':''}</p><p className="note">This page is available to anyone with its link; it is not password protected.</p></section>
    {pagination}<div className="catalog-list">{items.slice(page*size,(page+1)*size).map(q=><Problem key={q.id+filters.perspective} q={q} answers={answers} perspective={filters.perspective}/>)}</div>{!items.length&&<p role="status">No problems match these filters.</p>}{pagination}
  </>;
}
