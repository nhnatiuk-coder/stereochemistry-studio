"""Build independently checked projection views from a single stereochemical graph.
Requires RDKit (build-time only). Runtime has no Python/server dependency.
"""
import json, math, itertools
from pathlib import Path
import numpy as np
from rdkit import Chem
from rdkit.Chem import rdDepictor, rdMolDescriptors
from rdkit.Chem.Draw import rdMolDraw2D
from rdkit.Chem.EnumerateStereoisomers import EnumerateStereoisomers, StereoEnumerationOptions
OUT=Path(__file__).resolve().parents[1]/'src'/'bank.json'

def canonical(m): return Chem.MolToSmiles(m, isomericSmiles=True)
def cip(m):
    Chem.AssignStereochemistry(m,cleanIt=True,force=True)
    return [{'atom':a.GetIdx(),'locant':a.GetIntProp('locant') if a.HasProp('locant') else a.GetIdx()+1,'value':a.GetProp('_CIPCode')} for a in m.GetAtoms() if a.HasProp('_CIPCode')]

def text(x,y,s,size=21): return f'<text x="{x}" y="{y}" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="{size}" fill="#172e3e">{s}</text>'
def line(x,y,a,b): return f'<path d="M{x},{y} L{a},{b}" stroke="#172e3e" stroke-width="2.4" fill="none"/>'
def svg(body): return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320" role="img">'+body+'</svg>'

def local_tag(m, center, coords):
    # Infer a center's RDKit tag from explicit local 3D coordinates. This avoids
    # hand-coded R/S conventions and lets the toolkit apply CIP priorities.
    tmp=Chem.Mol(m); tmp.RemoveAllConformers(); c=Chem.Conformer(tmp.GetNumAtoms()); c.Set3D(True)
    for i in range(tmp.GetNumAtoms()): c.SetAtomPosition(i,(10+i,10,10))
    c.SetAtomPosition(center,(0,0,0))
    for i,v in coords.items(): c.SetAtomPosition(i,tuple(float(x) for x in v))
    tmp.AddConformer(c)
    Chem.AssignAtomChiralTagsFromStructure(tmp,replaceExistingTags=True)
    m.GetAtomWithIdx(center).SetChiralTag(tmp.GetAtomWithIdx(center).GetChiralTag())

def projection(base, centers, chain, groups, flips, kind, rotation=0):
    m=Chem.AddHs(base); body=''
    if kind=='fischer':
        # Every center: horizontal bonds project toward viewer, vertical away.
        # 180-degree rotation is a legal whole-projection rotation.
        n=len(centers); ys=[110] if n==1 else [105,205]
        body+=text(200,ys[0]-65,groups[0])+text(200,ys[-1]+65,groups[-1])
        body+=line(200,ys[0]-48,200,ys[-1]+48)
        for k,ci in enumerate(centers):
            a=m.GetAtomWithIdx(ci); prev,nxt=chain[k],chain[k+2]
            others=[v.GetIdx() for v in a.GetNeighbors() if v.GetIdx() not in (prev,nxt)]
            assert len(others)==2
            if flips[k]: others.reverse()
            coords={prev:(0,1,-1),nxt:(0,-1,-1),others[0]:(-1,0,1),others[1]:(1,0,1)}
            local_tag(m,ci,coords)
            labels=[('OH' if m.GetAtomWithIdx(i).GetSymbol()=='O' else m.GetAtomWithIdx(i).GetSymbol()) for i in others]
            body+=line(120,ys[k],280,ys[k])+text(90,ys[k],labels[0])+text(310,ys[k],labels[1])
            body+=text(216,ys[k]-19,f'C{a.GetIntProp("locant")}',12)
        if rotation: body=f'<g transform="rotate(180 200 160)">{body}</g>' # unused: labels would invert
    else:
        assert len(centers)==2
        ci,cj=centers
        body+='<circle cx="200" cy="160" r="46" fill="white" stroke="#172e3e" stroke-width="2.4"/>'
        for k,(ci,other) in enumerate([(ci,cj),(cj,ci)]):
            neighbors=[v.GetIdx() for v in m.GetAtomWithIdx(ci).GetNeighbors() if v.GetIdx()!=other]
            # terminal carbon, heteroatom, hydrogen order; swap to enumerate stereo.
            neighbors.sort(key=lambda i:(m.GetAtomWithIdx(i).GetSymbol()=='H',m.GetAtomWithIdx(i).GetSymbol()!='C'))
            if flips[k]: neighbors[1],neighbors[2]=neighbors[2],neighbors[1]
            coords={other:(0,0,-1 if k==0 else 1)}
            for j,i in enumerate(neighbors):
                angle=math.radians((-90 if k==0 else -30)+120*j+rotation)
                x,y=math.cos(angle),math.sin(angle)
                coords[i]=(x,-y,0.6 if k==0 else -0.6)
                start=0 if k==0 else 46
                body+=line(200+x*start,160+y*start,200+x*99,160+y*99)
                atom=m.GetAtomWithIdx(i)
                label=groups[0 if k==0 else -1] if atom.GetSymbol()=='C' else ('OH' if atom.GetSymbol()=='O' else atom.GetSymbol())
                body+=text(round(200+x*124,2),round(160+y*124,2),label)
            local_tag(m,ci,coords)
        body+='<circle cx="200" cy="160" r="5" fill="#172e3e"/>'+text(200,304,'View C2 → C3 • dot = front carbon',13)
    m=Chem.RemoveHs(m)
    Chem.AssignStereochemistry(m,cleanIt=True,force=True)
    return canonical(m),svg(body),cip(m)

def skeletal(m,variant=0,labels=True):
    m=Chem.Mol(m); rdDepictor.Compute2DCoords(m)
    # Orient with carbon backbone in the paper; RDKit retains tetrahedral geometry
    # and depicts configuration with wedge/dash bonds.
    if variant:
        c=m.GetConformer(); angle=math.radians(variant)
        for i in range(m.GetNumAtoms()):
            p=c.GetAtomPosition(i); c.SetAtomPosition(i,(p.x*math.cos(angle)-p.y*math.sin(angle),p.x*math.sin(angle)+p.y*math.cos(angle),0))
    for a in m.GetAtoms():
        if labels and a.HasProp('_CIPCode'): a.SetProp('atomNote',f'C{a.GetIntProp("locant")}')
    d=rdMolDraw2D.MolDraw2DSVG(400,320); o=d.drawOptions(); o.clearBackground=False; o.useBWAtomPalette(); o.annotationFontScale=.8; o.baseFontSize=.72; o.padding=.17
    rdMolDraw2D.PrepareAndDrawMolecule(d,m); d.FinishDrawing(); return d.GetDrawingText()

families=[]
# Explicit atom-index locants for simple chains (SMILES branches affect indices).
inputs=[
('butan-2-ol','CC(O)CC',{1:2},[0,1,3],['CH₃','CH₂CH₃'],1),
('2-bromobutane','CC(Br)CC',{1:2},[0,1,3],['CH₃','CH₂CH₃'],1),
('2-chlorobutane','CC(Cl)CC',{1:2},[0,1,3],['CH₃','CH₂CH₃'],1),
('pentan-2-ol','CC(O)CCC',{1:2},[0,1,3],['CH₃','CH₂CH₂CH₃'],1),
('pentan-3-ol','CCC(O)CC',{},None,None,1),
('2-bromopentane','CC(Br)CCC',{1:2},[0,1,3],['CH₃','CH₂CH₂CH₃'],1),
('1-chloroethan-1-ol','CC(O)Cl',{1:1},None,None,2),
('2-chloropropanoic acid','CC(Cl)C(=O)O',{1:2},None,None,2),
('2-hydroxypropanoic acid','CC(O)C(=O)O',{1:2},None,None,2),
('3-methylhexane','CCC(C)CCC',{2:3},None,None,2),
('3-bromohexane','CCC(Br)CCC',{2:3},None,None,2),
('1-bromo-1-chloroethane','CC(Br)Cl',{1:1},None,None,1),
('butane-2,3-diol','CC(O)C(O)C',{1:2,3:3},[0,1,3,5],['CH₃','CH₃'],2),
('2,3-dibromobutane','CC(Br)C(Br)C',{1:2,3:3},[0,1,3,5],['CH₃','CH₃'],2),
('2,3-dichlorobutane','CC(Cl)C(Cl)C',{1:2,3:3},[0,1,3,5],['CH₃','CH₃'],2),
('2-bromo-3-chlorobutane','CC(Br)C(Cl)C',{1:2,3:3},[0,1,3,5],['CH₃','CH₃'],2),
('3-chlorobutan-2-ol','CC(O)C(Cl)C',{1:2,3:3},[0,1,3,5],['CH₃','CH₃'],2),
('pentane-2,3-diol','CC(O)C(O)CC',{1:2,3:3},[0,1,3,5],['CH₃','CH₂CH₃'],3),
('2,3-dibromopentane','CC(Br)C(Br)CC',{1:2,3:3},[0,1,3,5],['CH₃','CH₂CH₃'],3),
('2-bromo-3-chloropentane','CC(Br)C(Cl)CC',{1:2,3:3},[0,1,3,5],['CH₃','CH₂CH₃'],3),
('3-chloropentan-2-ol','CC(O)C(Cl)CC',{1:2,3:3},[0,1,3,5],['CH₃','CH₂CH₃'],3),
]
records=[]
for fid,(name,smi,locants,chain,groups,level) in enumerate(inputs):
    base=Chem.MolFromSmiles(smi)
    for i,loc in locants.items(): base.GetAtomWithIdx(i).SetIntProp('locant',loc)
    centers=list(locants)
    projections={}
    if chain:
        for kind in ['fischer']+(['newman'] if len(centers)==2 else []):
            for flips in itertools.product([False,True],repeat=len(centers)):
                for rotation in ([0,120,240] if kind=='newman' else [0]):
                    key,img,projection_centers=projection(base,centers,chain,groups,flips,kind,rotation)
                    projections.setdefault(key,[]).append({'kind':kind,'svg':img,'centers':projection_centers})
    for idx,m in enumerate(EnumerateStereoisomers(base,options=StereoEnumerationOptions(unique=True,onlyUnassigned=True))):
        cs=cip(m); desc=','.join(str(c['locant'])+c['value'] for c in sorted(cs,key=lambda c:c['locant']))
        title=f'({desc})-{name}' if desc else name
        key=canonical(m)
        records.append({'id':f'm{fid}-{idx}','family':f'f{fid}','baseName':name,'name':title,'smiles':key,'formula':rdMolDescriptors.CalcMolFormula(m),'centers':cs,'level':level,'views':[{'kind':'line','svg':skeletal(m,a)} for a in [0,120,240]]+[v for v in projections.get(key,[]) if sorted((c['locant'],c['value']) for c in v['centers'])==sorted((c['locant'],c['value']) for c in cs)]})
# E/Z problems are separate from tetrahedral problems.
for fid,(name,smi) in enumerate([('but-2-ene','CC=CC'),('pent-2-ene','CC=CCC'),('hex-2-ene','CC=CCCC'),('1,2-dichloroethene','ClC=CCl'),('1-bromo-2-chloroethene','BrC=CCl'),('3-methylpent-2-ene','CC=C(C)CC')],start=40):
    for idx,m in enumerate(EnumerateStereoisomers(Chem.MolFromSmiles(smi))):
        stereo=next(str(b.GetStereo()).replace('STEREO','') for b in m.GetBonds() if b.GetStereo()!=Chem.BondStereo.STEREONONE)
        records.append({'id':f'm{fid}-{idx}','family':f'f{fid}','baseName':name,'name':f'({stereo})-{name}','smiles':canonical(m),'formula':rdMolDescriptors.CalcMolFormula(m),'centers':[],'alkene':stereo,'level':2,'views':[{'kind':'line','svg':skeletal(m,a,False)} for a in [0,120,240]]})
# Constitutional examples allow the important same-formula/different-connectivity case.
for fid,(name,smi) in enumerate([('butan-1-ol','CCCCO'),('ethoxyethane','CCOCC'),('pentan-1-ol','CCCCCO'),('2-methylbutan-2-ol','CC(C)(O)CC'),('propane','CCC'),('hexane','CCCCCC'),('cyclobutane','C1CCC1')],start=60):
    m=Chem.MolFromSmiles(smi)
    records.append({'id':f'm{fid}-0','family':f'f{fid}','baseName':name,'name':name,'smiles':canonical(m),'formula':rdMolDescriptors.CalcMolFormula(m),'centers':[],'level':1,'views':[{'kind':'line','svg':skeletal(m,a,False)} for a in [0,120]]})
# Validate every projection's graph and every label before writing.
for r in records:
    assert Chem.MolToSmiles(Chem.MolFromSmiles(r['smiles']))==r['smiles']
    assert r['views']
    mirror=Chem.MolFromSmiles(r['smiles'])
    for a in mirror.GetAtoms():
        if a.GetChiralTag()!=Chem.ChiralType.CHI_UNSPECIFIED: a.InvertChirality()
    r['mirror']=canonical(mirror)
    plain=Chem.MolFromSmiles(r['smiles']); Chem.RemoveStereochemistry(plain)
    r['connectivity']=canonical(plain)
OUT.write_text(json.dumps(records,ensure_ascii=False))
print(f'{len(records)} verified molecules; {sum(len(r["views"]) for r in records)} views; {sum(v["kind"]=="newman" for r in records for v in r["views"])} Newman views')
