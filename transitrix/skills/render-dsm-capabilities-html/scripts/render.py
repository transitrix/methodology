#!/usr/bin/env python3
"""Render a validated, explicit classic DSM Report grid. Python standard library only."""
import argparse, datetime as dt, html, json, pathlib, sys

LEVELS = ['No capability', 'Initial', 'Managed', 'Defined', 'Quantitatively Managed', 'Optimizing']
# Management stages and subject/role tags are independent adapter dimensions.
LAYERS = ('Strategic', 'Learning', 'Planning', 'Execution', 'Assurance')
TAGS = ('ESG', 'MDM', 'Support')
LAYER_COLORS = dict(zip((*LAYERS, 'Not specified', 'Unknown property'),
                       ('#e6e4f6', '#e1f1ec', '#e1edf9', '#fff0d6', '#e0f2f3', '#e9edf2', '#f4e7dd')))
def layer_value(r):
    if 'layer' in r:return r['layer']
    value=r.get('property')
    return None if value in TAGS else value

def layer(r):
    value=layer_value(r)
    if value in (None, ''):return 'Not specified'
    return value if value in LAYERS else 'Unknown property'

def tags(r):
    values=list(r.get('tags',[]))
    if r.get('property') in TAGS and r['property'] not in values:values.append(r['property'])
    return [t for t in TAGS if t in values]

def esc(x): return html.escape(str(x), quote=True)
def date(x):
    if x in (None, ''): return None
    return x if isinstance(x,dt.date) else dt.date.fromisoformat(x)
def assessment_name(m):
    if 'maturity_level_dict' in m:
        obj=m['maturity_level_dict']
        if not isinstance(obj,dict) or not isinstance(obj.get('name'),str) or not obj['name'].strip():
            raise ValueError('maturity_level_dict.name must be nonempty text')
        name=obj['name']
        if 'level' in m:
            level=m['level']
            if type(level) is not int or not 0<=level<=5: raise ValueError('Maturity level must be an integer 0..5')
            if name != LEVELS[level]: raise ValueError('Maturity name and level disagree')
        return name
    level=m.get('level')
    if type(level) is not int or not 0<=level<=5: raise ValueError('Maturity level must be an integer 0..5')
    return LEVELS[level]

def prepare(data, as_of):
    if not isinstance(data, dict) or not isinstance(data.get('capabilities'), list):
        raise ValueError('Expected an object with capabilities array')
    records = data['capabilities']; ids=set(); keys=set(); index={}; warnings=[]
    if not records: raise ValueError('Capability array is empty')
    for field in ('title','organisation'):
        if field in data and not isinstance(data[field],str): raise ValueError(f'{field} must be text')
    sets={str(r.get('universal_item_set_id')) for r in records if isinstance(r,dict)}
    if len(sets)>1: raise ValueError('Select exactly one capability set before rendering')
    for r in records:
        if not isinstance(r, dict): raise ValueError('Capability must be an object')
        for f in ('id','name','layout','first_level','second_level','third_level','lane'):
            if f not in r: raise ValueError(f'Missing {f}: {r.get("id", "unknown")}')
        if not isinstance(r['id'], (str,int)) or isinstance(r['id'],bool): raise ValueError('ID must be string or integer')
        if not isinstance(r['name'],str) or not r['name'].strip(): raise ValueError('Name must be nonempty text')
        if r.get('property') is not None and not isinstance(r['property'],str):
            raise ValueError('Capability property must be text or null')
        if 'layer' in r and r['layer'] not in (None, '', *LAYERS):
            raise ValueError('Capability layer must be a recognized management stage or null')
        values=r.get('tags',[])
        if not isinstance(values,list) or any(not isinstance(t,str) or t not in TAGS for t in values):
            raise ValueError('Capability tags must be an array of ESG, MDM or Support')
        if len(set(values))!=len(values):raise ValueError('Duplicate capability tag')
        ident=str(r['id'])
        if ident in ids: raise ValueError(f'Duplicate ID {ident}')
        ids.add(ident)
        if r['layout'] not in ('vertical','horizontal'): raise ValueError(f'Unknown layout for {ident}')
        for f in ('first_level','second_level','third_level','lane'):
            if type(r[f]) is not int or r[f] < 0: raise ValueError(f'{ident}: {f} must be a nonnegative integer')
        a,b,c=r['first_level'],r['second_level'],r['third_level']
        if c and not b: raise ValueError(f'{ident}: L3 requires L2 coordinate')
        if r['layout']=='horizontal' and a==0: raise ValueError('Horizontal first_level=0 is ambiguous; use H root and lane=0 for unplaced children')
        key=(r['layout'],a,b,c)
        if key in keys: raise ValueError(f'Duplicate coordinate {key}')
        keys.add(key); index[key]=r
        start,end=date(r.get('start_date')),date(r.get('end_date'))
        if start and end and start>end: raise ValueError(f'{ident}: reversed lifetime')
        if not isinstance(r.get('maturity',[]),list): raise ValueError(f'{ident}: maturity must be a list')
        for m in r.get('maturity',[]):
            if not isinstance(m,dict) or not date(m.get('change_date')): raise ValueError(f'{ident}: maturity needs change_date')
            assessment_name(m)
    for r in records:
        a,b,c=r['first_level'],r['second_level'],r['third_level']; orient=r['layout']
        parent=index.get((orient,a,b,0) if c else (orient,a,0,0)) if b else None
        if b and parent is None: raise ValueError(f'{r["id"]}: missing same-orientation parent')
        if c and r['lane'] != parent['lane']: raise ValueError(f'{r["id"]}: lane differs from parent')
        if orient=='horizontal' and b and r['lane'] and ('vertical',r['lane'],0,0) not in index:
            raise ValueError(f'{r["id"]}: lane has no vertical root')
    def active(r):
        start,end=date(r.get('start_date')),date(r.get('end_date'))
        return as_of is None or ((start is None or start<=as_of) and (end is None or as_of<=end))
    selected=[r for r in records if active(r)]
    for r in selected:
        a,b,c=r['first_level'],r['second_level'],r['third_level']; orient=r['layout']
        if b:
            p=index[(orient,a,b,0) if c else (orient,a,0,0)]
            if not active(p): raise ValueError(f'{r["id"]}: active child has inactive parent at as-of date')
        if orient=='horizontal' and b and r['lane'] and not active(index[('vertical',r['lane'],0,0)]):
            raise ValueError(f'{r["id"]}: active intersection targets inactive vertical root')
    return sorted(selected,key=lambda r:(r['first_level'],r['second_level'],r['third_level'])), warnings

def maturity(r, as_of):
    if as_of is None:
        if r.get('maturity'): raise ValueError(f'{r["id"]}: dated maturity needs an explicit as_of date, not a horizon label')
        return '', 'Not assessed'
    eligible=[m for m in r.get('maturity',[]) if date(m['change_date'])<=as_of]
    if not eligible: return '', 'Not assessed'
    latest=max(date(m['change_date']) for m in eligible)
    names={assessment_name(m) for m in eligible if date(m['change_date'])==latest}
    if len(names)!=1: raise ValueError(f'{r["id"]}: conflicting maturity on {latest}')
    name=names.pop()
    return (f'm{LEVELS.index(name)}' if name in LEVELS else 'unknown'), name if name in LEVELS else f'Unknown assessment: {name}'

METHODOLOGY_REVISION='888c03d33c2d899ec85a612901075b67811614e5'
METHODOLOGY_BASELINE='3c75d0403dd4e2dc618bc9535ea293d0495e1ec1'
METHODOLOGY_CONTRACT_STATUS='merged core-methodology correction; not released'
ADAPTER_VERSION='dsm-capability-html/6'
RENDERER_VERSION='6.8.2'
SVGNS='http://www.w3.org/2000/svg'

def normalize(data, current_date=None):
    """Explicit snapshots; never infer a target from current relationships or dates."""
    if not isinstance(data,dict): raise ValueError('Model must be an object')
    raw=data.get('states')
    if raw is None:
        raw=[{'id':'current','label':'Current state','kind':'current','capabilities':data.get('capabilities'),
              'applications':data.get('applications',[]),'as_of':current_date.isoformat() if current_date else data.get('as_of')}]
    if not isinstance(raw,list) or not raw:raise ValueError('states must be a nonempty array')
    states=[];seen=set()
    for source in raw:
        if not isinstance(source,dict):raise ValueError('State must be an object')
        state=dict(source)
        for field in ('id','label','kind'):
            if not isinstance(state.get(field),str) or not state[field].strip():raise ValueError(f'State {field} must be nonempty text')
        if state['id'] in seen:raise ValueError('Duplicate state ID')
        seen.add(state['id'])
        if state['kind'] not in ('historical','current','target'):raise ValueError('State kind must be historical, current or target')
        start,end=date(state.get('effective_from')),date(state.get('effective_to'))
        if ('effective_from' in state or 'effective_to' in state) and start is None:raise ValueError('Dated state requires effective_from')
        if start and end and start>=end:raise ValueError('State effective_to must be after effective_from (exclusive)')
        horizon=state.get('horizon_label','')
        if not isinstance(horizon,str):raise ValueError('horizon_label is descriptive text, not an inferred date')
        as_of=date(state.get('as_of'))
        if as_of is None and state['kind']=='current':as_of=current_date
        snapshot_as_of=as_of
        if as_of is None and start:as_of=start
        records,_=prepare({'capabilities':state.get('capabilities')},as_of)
        for r in records:maturity(r,as_of)
        allids={str(r['id']) for r in state['capabilities']}
        apps=state.get('applications',[])
        if not isinstance(apps,list):raise ValueError('applications must be an array')
        appids=set()
        for app in apps:
            if not isinstance(app,dict) or not isinstance(app.get('id'),(str,int)) or isinstance(app.get('id'),bool):raise ValueError('APPLICATION needs an ID')
            validate_lifetime(app,'APPLICATION')
            aid=str(app['id'])
            if aid in appids:raise ValueError('Duplicate APPLICATION ID within state')
            appids.add(aid)
            if not isinstance(app.get('name'),str) or not app['name'].strip():raise ValueError('APPLICATION needs a name')
            if app.get('type','APPLICATION')!='APPLICATION':raise ValueError('Only APPLICATION mappings are supported; no technical-capability layer')
            if 'capabilities' in app:
                links=app['capabilities']
                if not isinstance(links,list) or any(not isinstance(x,(str,int)) or isinstance(x,bool) for x in links):raise ValueError('APPLICATION capabilities must be an array of explicit capability IDs')
                if len({str(x) for x in links})!=len(links):raise ValueError('Duplicate APPLICATION capability link')
                unknown={str(x) for x in links}-allids
                if unknown:raise ValueError(f'APPLICATION {aid} references unknown capabilities: {sorted(unknown)}')
            technical=app.get('technical_capabilities',[])
            if not isinstance(technical,list):raise ValueError('technical_capabilities must be an array')
            tids=set()
            for ability in technical:
                if not isinstance(ability,dict) or not isinstance(ability.get('id'),str) or not ability['id'].strip() or not isinstance(ability.get('name'),str) or not ability['name'].strip():
                    raise ValueError('Technical capability needs nonempty text id and name')
                validate_lifetime(ability,'Technical capability')
                if ability['id'] in tids:raise ValueError('Duplicate technical capability ID within APPLICATION')
                tids.add(ability['id']);links=ability.get('capabilities')
                if not isinstance(links,list) or any(not isinstance(x,(str,int)) or isinstance(x,bool) for x in links):
                    raise ValueError('Technical capability needs explicit capabilities array')
                if len({str(x) for x in links})!=len(links):raise ValueError('Duplicate technical capability link')
                if {str(x) for x in links}-allids:raise ValueError('Technical capability references unknown business capability')
            for field in ('unsupported_capabilities','coverage_percent'):

                if field in app:raise ValueError(f'{field} is outside this adapter; do not infer unsupported status or percentages')
        pilot=data.get('coverage_system_id','')
        if not isinstance(pilot,str):raise ValueError('coverage_system_id must be text')
        if pilot and pilot not in appids:raise ValueError('coverage_system_id must reference an APPLICATION in every state')
        state.update(records=records,all_applications=apps,applications=active_applications(apps,as_of),as_of=as_of,snapshot_as_of=snapshot_as_of,effective_from=start,effective_to=end,horizon_label=horizon)
        states.append(state)
    periods=sorted((state for state in states if state['effective_from']),key=lambda s:s['effective_from'])
    for left,right in zip(periods,periods[1:]):
        if left['effective_to'] is None or left['effective_to']>right['effective_from']:raise ValueError('State date periods overlap; choose one explicit timeline')
    if data.get('view_date') is not None and date(data['view_date']) is None:raise ValueError('view_date must be a date')
    if data.get('view_date') and not periods:raise ValueError('view_date requires dated state periods')
    for field in ('title','organisation','model_revision'):
        if field in data and not isinstance(data[field],str):raise ValueError(f'{field} must be text')
    return {'title':data.get('title','Business capability map'),'organisation':data.get('organisation',''),
            'model_revision':data.get('model_revision','Not specified'),'coverage_system_id':data.get('coverage_system_id',''),'view_date':date(data.get('view_date')),'states':states}

def validate_lifetime(item,label):
    start,end=date(item.get('start_date')),date(item.get('end_date'))
    if start and end and start>end:raise ValueError(f'{label}: reversed lifetime')

def active_on(item,when):
    start,end=date(item.get('start_date')),date(item.get('end_date'))
    return when is None or ((start is None or start<=when) and (end is None or when<=end))

def active_applications(apps,when):
    return [dict(app,technical_capabilities=[dict(t) for t in app.get('technical_capabilities',[]) if active_on(t,when)]) for app in apps if active_on(app,when)]

def state_on(model,when,state_id=None):
    when=date(when)
    if when is None:raise ValueError('View date must be explicit')
    matches=[s for s in model['states'] if s['effective_from'] and s['effective_from']<=when and (s['effective_to'] is None or when<s['effective_to'])]
    if not matches:raise ValueError(f'No state data for date {when.isoformat()}')
    state=matches[0]
    if state_id and state_id!=state['id']:raise ValueError('Selected state does not apply on view date')
    records,_=prepare({'capabilities':state['capabilities']},when)
    for record in records:maturity(record,when)
    return dict(state,records=records,applications=active_applications(state['all_applications'],when),as_of=when,view_date=when)

def timeline_frames(model):
    """Only explicit date boundaries/events; no interpolation or calendar-day explosion."""
    frames=[]
    for state in sorted((s for s in model['states'] if s['effective_from']),key=lambda s:s['effective_from']):
        start,end=state['effective_from'],state['effective_to'];events={start}
        items=list(state['capabilities'])+list(state['all_applications'])
        items.extend(t for a in state['all_applications'] for t in a.get('technical_capabilities',[]))
        for item in items:
            event=date(item.get('start_date'))
            if event and event>=start and (end is None or event<end):events.add(event)
            event=date(item.get('end_date'))
            if event and event<dt.date.max:
                event+=dt.timedelta(days=1)
                if event>=start and (end is None or event<end):events.add(event)
            for m in item.get('maturity',[]):
                event=date(m['change_date'])
                if event>=start and (end is None or event<end):events.add(event)
        ordered=sorted(events)
        for i,event in enumerate(ordered):
            frame=state_on(model,event,state['id'])
            frame.update(frame_from=event,frame_to=ordered[i+1] if i+1<len(ordered) else end)
            frames.append(frame)
    return frames

def date_caption(state,when=None):
    when=when or state.get('view_date')
    basis=state.get('snapshot_as_of')
    return f'Date: {when.isoformat()} · Snapshot basis: {basis.isoformat() if basis else "not specified"} · {"Planned scenario; not an observed outcome" if state["kind"]=="target" else "Recorded snapshot basis; no implied daily observation"}' if when else ''


def convex_hull(points):
    """Deterministic monotone-chain hull; no area/coverage percentage semantics."""
    points=sorted(set(points))
    def cross(o,a,b):return (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])
    if len(points)<3:return points
    lower=[];upper=[]
    for point in points:
        while len(lower)>=2 and cross(lower[-2],lower[-1],point)<=0:lower.pop()
        lower.append(point)
    for point in reversed(points):
        while len(upper)>=2 and cross(upper[-2],upper[-1],point)<=0:upper.pop()
        upper.append(point)
    return lower[:-1]+upper[:-1]


COVERAGE_PADDING=2  # Native SVG units: keep neighboring domain overlays separated.

COVERAGE_COLORS=('#0d9488','#d97706','#7c3aed','#db2777','#2563eb','#65a30d','#dc2626','#475569')

def coverage_colors(model):
    ids=sorted({str(a['id']) for state in model['states'] for a in state.get('all_applications',state['applications'])})
    return {aid:(COVERAGE_COLORS[i] if i<len(COVERAGE_COLORS) else f'hsl({(i*137.508)%360:.2f},65%,42%)') for i,aid in enumerate(ids)}

def coverage_markup(app,boxes,occupied,color='#0d9488',occupied_by_depth=None):
    """One system, one hull per depth. Cut-outs protect unrelated capabilities."""
    direct={str(i) for i in app.get('capabilities',[])}
    technical=app.get('technical_capabilities',[])
    links=direct|{str(i) for t in technical for i in t['capabilities']}
    result=[]
    for depth in (1,2,3):
        if occupied_by_depth is not None:occupied=occupied_by_depth[depth]
        visible={ident:b for ident,b in boxes.items() if b['depth']<=depth}
        covered={ident:b for ident,b in visible.items() if ident in links}
        if not covered:continue
        pad=COVERAGE_PADDING
        hull=convex_hull([(max(12,x+dx),max(12,y+dy)) for b in covered.values()
                          for x,y,w,h in [b['rect']] for dx,dy in [(-pad,-pad),(w+pad,-pad),(w+pad,h+pad),(-pad,h+pad)]])
        points=' '.join(f'{x:.1f},{y:.1f}' for x,y in hull)
        cutouts=[]
        for ident,b in visible.items():
            if ident in covered:continue
            x,y,w,h=b['rect']
            # A context container may geometrically enclose mapped descendants
            # or H intersections. Exclude its label header, not those targets.
            contains=any(x<=c['rect'][0] and y<=c['rect'][1] and x+w>=c['rect'][0]+c['rect'][2] and y+h>=c['rect'][1]+c['rect'][3] for c in covered.values())
            if contains:
                if b['horizontal_root']:w=min(w,212)
                h=min(h,b['header'])
            cutouts.append((ident,(x-2,y-2,w+4,h+4)))
        mask=f'coverage-mask-{str(app["id"]).encode().hex()}-{depth}'
        ids=sorted(covered)
        active_technical=[t['id'] for t in technical if covered.keys() & {str(i) for i in t['capabilities']}]
        sources={'direct_application':[i for i in ids if i in direct],
                 'technical_capabilities':{t['id']:[i for i in ids if i in {str(v) for v in t['capabilities']}] for t in technical if t['id'] in active_technical}}
        result.append(f'<g class="coverage-overlay" data-coverage-system="{esc(app["id"])}" data-coverage-depth="{depth}" data-coverage-visible="no" data-covered-capabilities="{esc(json.dumps(ids))}" data-coverage-sources="{esc(json.dumps(sources))}" style="display:none" pointer-events="none"><title>{esc(app["name"])} coverage — explicit business-capability mappings; polygon area is not a percentage</title>')
        result.append(f'<defs><mask id="{mask}" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%"><polygon points="{points}" fill="white"/>')
        for ident,(x,y,w,h) in cutouts:
            result.append(f'<rect class="coverage-cutout" data-excluded-capability="{esc(ident)}" x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="5" fill="black"/>')
        result.append(f'</mask></defs><polygon class="coverage-polygon" data-coverage-hull="{points}" points="{points}" mask="url(#{mask})" fill="{color}" fill-opacity=".16" stroke="{color}" stroke-opacity=".65" stroke-width="2"/>')
        # Place the watermark inside the hull, preferring empty space rather
        # than capability text. Fall back to a very light central watermark.
        xmin=min(x for x,y in hull);xmax=max(x for x,y in hull);ymin=min(y for x,y in hull);ymax=max(y for x,y in hull)
        def inside(x,y):return all((b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0])>=-.01 for a,b in zip(hull,hull[1:]+hull[:1]))
        def overlaps(a,b):return a[0]<b[0]+b[2] and a[0]+a[2]>b[0] and a[1]<b[1]+b[3] and a[1]+a[3]>b[1]
        center=((xmin+xmax)/2,(ymin+ymax)/2);position=None
        for size in (32,24,18,14):
            tw=len(app['name'])*size*.62;th=size+4
            if tw>xmax-xmin-8:continue
            candidates=[]
            for y in range(int(ymin+th),int(ymax-4),max(12,size)):
                for x in range(int(xmin+tw/2+4),int(xmax-tw/2-3),max(16,size)):
                    box=(x-tw/2,y-th,tw,th+4)
                    if not all(inside(px,py) for px,py in [(box[0],box[1]),(box[0]+tw,box[1]),(box[0]+tw,box[1]+th+4),(box[0],box[1]+th+4)]):continue
                    if any(overlaps(box,b) for b in occupied):continue
                    if any(overlaps(box,b) for ident,b in cutouts):continue
                    candidates.append(((x-center[0])**2+(y-center[1])**2,x,y))
            if candidates:
                _,x,y=min(candidates);position=(x,y,size);break
        if position:
            x,y,size=position
        else:
            # Dense maps may have no empty label slot. Prefer a faint label
            # inside an actually mapped card rather than an unlinked cut-out.
            fallback=[]
            for b in covered.values():
                bx,by,bw,bh=b['rect']
                size=min(24,(bw-8)/(len(app['name'])*.62),(bh-8)/1.3)
                tw=len(app['name'])*size*.62;th=size+4
                for y in (by+th+2,by+bh/2+size/3,by+bh-4):
                    x=bx+bw/2;box=(x-tw/2,y-th,tw,th+4)
                    if all(inside(px,py) for px,py in [(box[0],box[1]),(box[0]+tw,box[1]),(box[0]+tw,box[1]+th+4),(box[0],box[1]+th+4)]) and not any(overlaps(box,hole) for ident,hole in cutouts):
                        fallback.append(((x-center[0])**2+(y-center[1])**2,x,y,size))
            _,x,y,size=min(fallback) if fallback else (0,center[0],center[1],12)
        result.append(f'<text class="coverage-system-name" mask="url(#{mask})" x="{x:.1f}" y="{y:.1f}" font-size="{size:.1f}" font-weight="600" fill="{color}" fill-opacity="{.32 if position else .13}" text-anchor="middle">{esc(app["name"])}</text></g>')
        if occupied_by_depth is not None:occupied.append((x-len(app['name'])*size*.31,y-size-4,len(app['name'])*size*.62,size+8))
    return ''.join(result)


def build_svg(model,state,sort_layers=False,show_backlog=True,labels=False,show_maturity=False,tag_filter=''):
    import math,textwrap,xml.etree.ElementTree as ET
    rows=state['records'];as_of=state['as_of'];apps=state['applications']
    if not show_backlog:
        rows=[r for r in rows if not (r['layout']=='vertical' and r['first_level']==0)
              and not (r['layout']=='horizontal' and r['second_level']>0 and r['lane']==0)]
    if tag_filter and tag_filter not in TAGS:raise ValueError('Unknown tag filter')
    matches={str(r['id']) for r in rows if tag_filter in tags(r)} if tag_filter else {str(r['id']) for r in rows}
    if tag_filter:
        index={(r['layout'],r['first_level'],r['second_level'],r['third_level']):r for r in rows}
        keep=set(matches)
        for r in rows:
            if str(r['id']) not in matches:continue
            a,b,c=r['first_level'],r['second_level'],r['third_level'];o=r['layout']
            if b:keep.add(str(index[(o,a,0,0)]['id']))
            if c:keep.add(str(index[(o,a,b,0)]['id']))
            if o=='horizontal' and b and r['lane']:
                keep.add(str(index[('vertical',r['lane'],0,0)]['id']))
        rows=[r for r in rows if str(r['id']) in keep]
    def wrap(value,width,size=12):
        return textwrap.wrap(str(value),width=max(4,int(width/(size*.62))),break_long_words=True,break_on_hyphens=False) or ['']
    def support(r):return [a for a in apps if str(r['id']) in {str(x) for x in a.get('capabilities',[])}]
    def kids(r):
        if r['third_level']:return []
        a,b=r['first_level'],r['second_level'];o=r['layout']
        return [v for v in rows if v['layout']==o and v['first_level']==a and ((v['second_level']==b and v['third_level']>0 and v['lane']==r['lane']) if b else (v['second_level']>0 and v['third_level']==0))]
    def parts(r,w,column=False):
        address=f'{r["layout"][0]}.{r["first_level"]}.{r["second_level"]}.{r["third_level"]}/{r["lane"]}'
        result=[('',10,'#52616b',wrap(address,w-24,10)),
                ('',12,'#1e1e1e',wrap(r['name'],w-24))]
        if tags(r):result.append(('tag-label',10,'#334155',wrap(' · '.join(tags(r)),w-34,10)))
        assessment,name=maturity(r,as_of)
        if show_maturity and assessment:
            result.append(('maturity-label',10,'#1e1e1e',wrap(name,w-24,10)))
        systems=support(r)
        if labels and systems:
            result.append(('system-label',10,'#00626b',wrap('Systems: '+', '.join(a['name'] for a in systems),w-24,10)))
        if column and layer_value(r):
            result.append(('property-label',10,'#475569',wrap('Layer: '+layer_value(r),w-24,10)))
        return result
    def header_height(r,w,column=False):
        blocks=parts(r,w,column)
        # Last baseline + descender, not a reserved next text line.
        return 17+sum((size+3)*len(lines)+4 for _,size,_,lines in blocks)-blocks[-1][1]-4
    sizes={}
    def box_size(r,w,depth,nested=True):
        key=(str(r['id']),round(w,4),depth,nested)
        if key in sizes:return sizes[key]
        actual=w
        cw=actual*(.8 if depth==1 else .9)
        children=sum(box_height(c,cw,depth+1)+10 for c in kids(r)) if depth<3 and nested else 0
        content=header_height(r,actual)+(12+children if children else 0)+8
        # Vertical orientation is expressed by the domain/stack, not by
        # squeezing descendant cards into portrait aspect ratios.
        height=max(54,content,actual*1.25 if r['layout']=='vertical' and depth==1 else 0)
        sizes[key]=(actual,height)
        return sizes[key]
    def box_height(r,w,depth,nested=True):return box_size(r,w,depth,nested)[1]
    out=[];zones=[];boxes={};occupied=[]
    def text(x,y,lines,size=12,color='#1e1e1e',anchor='middle',cls=''):
        for i,line in enumerate(lines):
            tw=len(line)*size*.62
            tx=x-tw/2 if anchor=='middle' else x
            occupied.append((tx-2,y+i*(size+3)-size-2,tw+4,size+6))
        out.append(f'<text class="{cls}" x="{x:.1f}" y="{y:.1f}" font-size="{size}" fill="{color}" text-anchor="{anchor}">')
        for i,line in enumerate(lines):out.append(f'<tspan x="{x:.1f}" dy="{0 if i==0 else size+3}">{esc(line)}</tspan>')
        out.append('</text>')
    def meta(r,depth,cls=''):
        address=f'{r["layout"][0]}.{r["first_level"]}.{r["second_level"]}.{r["third_level"]}/{r["lane"]}'
        ids=json.dumps([str(a['id']) for a in support(r)],ensure_ascii=True)
        tag_match='match' if str(r['id']) in matches else 'context'
        return f'<g class="{cls}" data-id="{esc(r["id"])}" data-orientation="{r["layout"]}" data-depth="{depth}" data-layer="{esc(layer(r))}" data-tags="{esc(json.dumps(tags(r)))}" data-tag-match="{tag_match}" data-applications="{esc(ids)}"><title>{esc(r["name"])} — layer: {esc(layer_value(r) or "Not specified")}; tags: {esc(", ".join(tags(r)) or "none")}</title><desc>{esc(address)}; maturity: {esc(maturity(r,as_of)[1])}; direct APPLICATION mappings: {esc(", ".join(a["name"] for a in support(r)) or "not specified")}. No inheritance or unsupported inference.</desc>'
    def rectangles(r,x,y,w,h,depth,column=False):
        boxes[str(r['id'])]={'rect':(round(x,1),round(y,1),round(w,1),round(h,1)),'depth':depth,
                             'header':header_height(r,left-52 if r['layout']=='horizontal' and depth==1 else w,column)+12,
                             'horizontal_root':r['layout']=='horizontal' and depth==1}
        fill='none' if column else '#c9d5f2' if depth==2 else 'white';stroke='#94a3b8' if column else '#e2e8f0' if depth==1 else fill
        cls=maturity(r,as_of)[0]
        return f'<rect class="caprect {cls}" x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{12 if depth==1 else 8}" fill="{fill}" stroke="{stroke}" stroke-width="3"/><rect class="support-outline" x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{12 if depth==1 else 8}" fill="none" stroke="none" stroke-width="5"/>'
    def draw_labels(r,x,y,w,anchor='middle',column=False,horizontal_title=False):
        cursor=y+17
        for index,(cls,size,color,lines) in enumerate(parts(r,w,column)):
            if index==1 and horizontal_title:cls='horizontal-title'
            if cls=='tag-label':
                for i,line in enumerate(lines):
                    tw=min(w-24,len(line)*size*.62+10)
                    tx=x-tw/2 if anchor=='middle' else x-4
                    out.append(f'<rect class="tag-chip" x="{tx:.1f}" y="{cursor+i*(size+3)-10:.1f}" width="{tw:.1f}" height="13" rx="4" fill="#e2e8f0"/>')
            text(x,cursor,lines,size,color,anchor,cls)
            cursor+=(size+3)*len(lines)+4
        return y+header_height(r,w,column)+12
    def draw_box(r,x,y,w,depth,forced_height=None,nested=True,column=False):
        actual,h=box_size(r,w,depth,nested)
        x+=(w-actual)/2;w=actual;h=forced_height or h
        out.append(meta(r,depth,'domain-column' if column else '')+rectangles(r,x,y,w,h,depth,column))
        tx=x+12 if r['layout']=='horizontal' else x+w/2
        anchor='start' if r['layout']=='horizontal' else 'middle'
        cursor=draw_labels(r,tx,y,w,anchor,column)
        if depth<3 and nested:
            cw=w*(.8 if depth==1 else .9)
            for child in kids(r):
                ch=box_height(child,cw,depth+1);draw_box(child,x+(w-cw)/2,cursor,cw,depth+1);cursor+=ch+10
        out.append('</g>')
    def draw_horizontal_root(r,y,h,open_group=False):
        out.append(meta(r,1,'horizontal-band')+rectangles(r,20,y,width-40,h,1))
        draw_labels(r,32,y,left-52,'start',horizontal_title=True)
        if not open_group:out.append('</g>')
    verts=[r for r in rows if r['layout']=='vertical' and r['first_level']>0 and r['second_level']==0]
    horiz=[r for r in rows if r['layout']=='horizontal' and r['second_level']==0]
    backlog=next((r for r in rows if r['layout']=='vertical' and r['first_level']==0 and r['second_level']==0),None)
    columns=([backlog] if backlog or any(r['layout']=='horizontal' and r['second_level']>0 and r['lane']==0 for r in rows) else [])+verts
    if not columns:columns=[None]
    lanes=[r['first_level'] if r else 0 for r in columns]
    # Keep a horizontal band readable even with only one supplied domain.
    colw=max(280,500/len(columns)) if horiz else 280
    gap=16;left=240 if horiz else 160 if sort_layers else 84
    def depth_of(r): return 3 if r['third_level'] else 2 if r['second_level'] else 1
    def layered_plan(top):
        # Labels belong to their explicit property zones. Parent frames enclose
        # descendants even when those descendants have a different property.
        slots={};bands=[];cursor=top
        index={(r['layout'],r['first_level'],r['second_level'],r['third_level']):r for r in rows}
        def parent(r):
            if not r['second_level']:return None
            return index[(r['layout'],r['first_level'],r['second_level'] if r['third_level'] else 0,0)]
        def place(r,center,cy,offered,category):
            d=depth_of(r);actual,h=box_size(r,offered,d,False)
            slots[str(r['id'])]=(center-actual/2,cy,actual,h)
            local=[c for c in kids(r) if layer(c)==category]
            child_y=cy+header_height(r,actual)+12
            for child in local:
                child_y=place(child,center,child_y,actual*.9,category)+10
            return max(cy+h,child_y+8 if local else cy+h)
        def group_stages(records,cursor,scope):
            for category in (*LAYERS,'Not specified','Unknown property'):
                members=[r for r in records if layer(r)==category]
                if not members:continue
                zone_top=cursor-8;heading=cursor+18;cursor+=34
                starts=[r for r in members if not parent(r)['second_level'] or layer(parent(r))!=category]
                heights=[]
                for i,lane in enumerate(lanes):
                    cell=[r for r in starts if (r['layout']=='vertical' and r['first_level']==lane) or
                          (r['layout']=='horizontal' and r['lane']==lane)]
                    cy=cursor
                    for r in cell:
                        cw=colw*.8*(.9 if depth_of(r)==3 else 1)
                        cy=place(r,left+i*(colw+gap)+colw/2,cy,cw,category)+gap
                    heights.append(cy)
                cursor=max(heights)
                bands.append((category,zone_top,heading,cursor,scope));cursor+=gap
            return cursor
        cursor=group_stages([r for r in rows if r['layout']=='vertical' and r['second_level']],cursor,'vertical-domains')
        # Each cross-cutting L1 owns its own cycle groups. It never becomes a
        # subject-area layer or spans other unrelated horizontal capabilities.
        for root in horiz:
            start=cursor;ident=str(root['id'])
            header=max(54,header_height(root,left-52,True)+12)
            cursor+=header+gap
            cursor=group_stages([r for r in rows if r['layout']=='horizontal' and r['first_level']==root['first_level'] and r['second_level']],cursor,ident)
            slots[ident]=(20,start,width-40,cursor-start+8);cursor+=gap
        bounds={}
        def enclose(r):
            ident=str(r['id']);x,top,w,h=slots[ident]
            descendants=[enclose(c) for c in kids(r)]
            if descendants:
                bottom=max(top+h,max(cy+ch+12 for cx,cy,cw,ch in descendants))
                top=min(top,min(cy-12 for cx,cy,cw,ch in descendants))
                h=bottom-top
            bounds[ident]=(x,top,w,h)
            return bounds[ident]
        for r in rows:
            if r['layout']=='horizontal' and not r['second_level'] or r['layout']=='vertical' and r['second_level'] and not r['third_level']:
                enclose(r)
        return slots,bounds,bands,cursor
    # Preflight the actual enclosing geometry, including parents that span
    # property zones. Widen lanes when needed to preserve H landscape shapes.
    for attempt in range(32):
        width=left+len(columns)*(colw+gap)+20
        ratios=[1.0]
        if sort_layers:
            _,planned,_,_=layered_plan(0)
        for r in rows:
            if r['layout']!='horizontal':continue
            depth=3 if r['third_level'] else 2 if r['second_level'] else 1
            if sort_layers:
                _,_,w,h=planned[str(r['id'])]
            elif depth==1:
                w=width-40;cw=colw*.8
                h=max([54,header_height(r,left-52)+8]+[sum(box_height(c,cw,2)+10 for c in kids(r) if c['lane']==lane)+32 for lane in lanes])
            else:
                w=colw*.8*(.9 if depth==3 else 1)
                h=box_height(r,w,depth)
            ratios.append(1.6*h/w)
        factor=max(ratios)
        if factor<=1.000001:break
        # Ten-unit widths keep nested 80%/90% cells exactly centred at the
        # SVG's one-decimal coordinate precision.
        colw=10*math.ceil(colw*factor*1.01/10)
    else:
        raise ValueError('Horizontal content could not fit readable landscape boxes')
    text(24,36,wrap(model['title'],width-60,24),24,anchor='start');y=36+27*len(wrap(model['title'],width-60,24))
    caption_date=state.get('snapshot_as_of') if state.get('view_date') else as_of
    statecaption=state['label']+(' · '+state['horizon_label'] if state['horizon_label'] else '')+(' · As of '+caption_date.isoformat() if caption_date else ' · No exact snapshot date')
    for caption in [model['organisation'],statecaption,('Target scenario, not a current fact' if state['kind']=='target' else 'Historical snapshot' if state['kind']=='historical' else 'Current-state snapshot')]:
        if caption:
            lines=wrap(caption,width-48,12);text(24,y,lines,12,anchor='start');y+=15*len(lines)+4
    if state.get('view_date'):
        lines=wrap(date_caption(state),width-48,12);text(24,y,lines,12,'#475569','start','date-context');y+=15*len(lines)+4
    # Stable header slot; view controls change text but never map geometry.
    text(24,y,['View selection'],11,'#475569','start','view-selection')
    longest=sum(len(a['name'])+2 for a in apps)+max([len(a['name']) for a in apps]+[3])+240
    y+=max(80,14*(longest//max(20,int((width-48)/7))+6))
    if not rows:
        text(24,y+24,[f'No capabilities match tag {tag_filter}.'],14,anchor='start');y+=60
    elif sort_layers:
        # V-L1 is the domain column itself, spanning every property band.
        # Reserve its header before laying out descendants in their own layers.
        column_slot=len(out);column_top=y
        column_header_height=max([64]+[header_height(r,colw,True)+8 for r in columns if r])
        y+=column_header_height+gap
        slots,bounds,bands,y=layered_plan(y)
        for category,zone_top,heading,zone_bottom,scope in bands:
            text(32,heading,[category],16,'#004d67','start','layer-heading')
            zones.append(f'<rect class="layer-zone" data-layer-zone="{esc(category)}" data-layer-scope="{esc(scope)}" x="24" y="{zone_top:.1f}" width="{width-48:.1f}" height="{zone_bottom-zone_top:.1f}" rx="14" fill="{LAYER_COLORS[category]}" pointer-events="none"/>')
        def draw_layered(r):
            ident=str(r['id']);d=depth_of(r);x,top,w,h=bounds[ident]
            children=kids(r);cls='horizontal-band' if d==1 else 'hierarchy-container' if children else ''
            out.append(meta(r,d,cls)+rectangles(r,x,top,w,h,d,column=bool(children)))
            sx,sy,sw,sh=slots[ident]
            if d==1:
                draw_labels(r,32,sy,left-52,'start',column=True,horizontal_title=True)
            else:
                draw_labels(r,sx+12 if r['layout']=='horizontal' else sx+sw/2,sy,sw,
                            'start' if r['layout']=='horizontal' else 'middle')
            for child in children:draw_layered(child)
            out.append('</g>')
        for r in rows:
            if r['layout']=='horizontal' and not r['second_level'] or r['layout']=='vertical' and r['second_level'] and not r['third_level']:
                draw_layered(r)
        column_bottom=max(y-gap,column_top+350,column_top+colw*1.25)
        # Paint L1 column frames after zones but before all layer foregrounds.
        start=len(out)
        for i,r in enumerate(columns):
            x=left+i*(colw+gap)
            if r:
                draw_box(r,x,column_top,colw,1,column_bottom-column_top,nested=False,column=True)
            else:
                out.append(f'<rect class="empty-domain-column" x="{x}" y="{column_top}" width="{colw}" height="{column_bottom-column_top}" rx="12" fill="none" stroke="#94a3b8" stroke-width="3"/>')
                text(x+colw/2,column_top+24,wrap('Unplaced / backlog' if show_backlog else 'No placed domains',colw-20))
        column_markup=out[start:];del out[start:]
        out[column_slot:column_slot]=column_markup
        y=column_bottom+gap
    else:
        topheight=max([350]+[box_height(r,colw,1) for r in columns if r])
        for i,r in enumerate(columns):
            x=left+i*(colw+gap)
            if r:draw_box(r,x,y,colw,1,topheight)
            else:out.append(f'<rect x="{x}" y="{y}" width="{colw}" height="{topheight}" rx="12" fill="white" stroke="#e2e8f0" stroke-width="3"/>');text(x+colw/2,y+24,['Unplaced / backlog' if show_backlog else 'No placed domains']) if not r else None
        y+=topheight+gap
        for root in horiz:
            cells=[[r for r in kids(root) if r['lane']==lane] for lane in lanes];cw=colw*.8
            # Labels occupy the gutter beside, rather than above, lane cells.
            rowheight=max([54,header_height(root,left-52)+8]+[sum(box_height(r,cw,2)+10 for r in cell)+32 for cell in cells])
            draw_horizontal_root(root,y,rowheight,open_group=True)
            for i,cell in enumerate(cells):
                x=left+i*(colw+gap)+(colw-cw)/2;cy=y+16
                for r in cell:draw_box(r,x,cy,cw,2);cy+=box_height(r,cw,2)+10
            out.append('</g>');y+=rowheight+gap
    out.append('<g class="legend" style="display:none"/>')
    colors=coverage_colors(model);occupied_by_depth={depth:list(occupied) for depth in (1,2,3)}
    overlay=''.join(coverage_markup(app,boxes,occupied,colors[str(app['id'])],occupied_by_depth) for app in sorted(apps,key=lambda a:str(a['id'])))
    css='''g[data-tag-match="context"]>.caprect,g[data-tag-match="context"]>text{opacity:.5}.support-outline{pointer-events:none}svg[data-system-selected="yes"] g[data-support="supported"]>.support-outline{stroke:#00a6a6}svg[data-system-labels="off"] .system-label{display:none}svg[data-maturity="off"] .maturity-label{display:none}svg[data-legend="off"] .legend{display:none}svg[data-max-depth="1"] g[data-depth="2"],svg[data-max-depth="1"] g[data-depth="3"],svg[data-max-depth="2"] g[data-depth="3"]{display:none}svg[data-maturity="on"] .caprect.m0{stroke:#0f172a;stroke-opacity:.14;stroke-dasharray:6 4;opacity:.55}svg[data-maturity="on"] .caprect.m1{stroke:#0f172a;stroke-opacity:.28;stroke-dasharray:6 4;opacity:.65}svg[data-maturity="on"] .caprect.m2{stroke:#0f172a;stroke-opacity:.45;opacity:.78}svg[data-maturity="on"] .caprect.m3{stroke:#0f172a;stroke-opacity:.62;opacity:.88}svg[data-maturity="on"] .caprect.m4{stroke:#004d67;stroke-opacity:.82;opacity:.95}svg[data-maturity="on"] .caprect.m5{stroke:#004d67;opacity:1}'''
    metadata={'methodology_revision':METHODOLOGY_REVISION,'methodology_baseline_revision':METHODOLOGY_BASELINE,'methodology_contract_status':METHODOLOGY_CONTRACT_STATUS,'adapter_version':ADAPTER_VERSION,'renderer_version':RENDERER_VERSION,'model_revision':model['model_revision'],'state_id':state['id'],'state_kind':state['kind'],'horizon_label':state['horizon_label'],'as_of':as_of.isoformat() if as_of else None,'layout_mode':'layers' if sort_layers else 'classic','show_backlog':show_backlog,'tag_filter':tag_filter or None,'layer_vocabulary':list(LAYERS),'tag_vocabulary':list(TAGS),'classification_mapping':'explicit layer/tags; legacy property mapped without inheritance','coverage_system_id':model.get('coverage_system_id') or None,'coverage_colors':colors,'view_contract':'Local view adapter, not full methodology conformance. Explicit snapshots and planned scenarios; horizon labels are not inferred dates.','mapping_semantics':'Mappings do not inherit. Missing mapping means not specified, not unsupported. Area is not a coverage percentage.','functional_overlap_semantics':'Boundary of the union of pairwise intersections of selected outer system polygons: points inside at least two polygons. Capability cut-out masks do not affect this contour; it does not prove redundant functionality.','view_date':state.get('view_date').isoformat() if state.get('view_date') else None,'snapshot_as_of':state.get('snapshot_as_of').isoformat() if state.get('snapshot_as_of') else None,'effective_from':state.get('effective_from').isoformat() if state.get('effective_from') else None,'effective_to':state.get('effective_to').isoformat() if state.get('effective_to') else None}
    svg=f'<svg xmlns="{SVGNS}" width="{width}" height="{y+20}" viewBox="0 0 {width} {y+20}" role="img" aria-label="{esc(model["title"])}" font-family="Arial, sans-serif" data-content-bottom="{y}"><title>{esc(model["title"])}</title><metadata id="view-metadata">{esc(json.dumps(metadata,ensure_ascii=False))}</metadata><style>{css}</style><rect width="100%" height="100%" fill="#f5f7fa"/>'+''.join(zones)+''.join(out)+overlay+'</svg>'
    try:ET.fromstring(svg)
    except ET.ParseError as error:raise ValueError(f'Model text cannot be represented as SVG XML: {error}') from error
    return svg

LEGEND_LABELS={
    'layers':'Bands: management-cycle stages',
    'context':'Muted boxes: parent/domain context',
    'labels':'System labels: direct mappings only',
    'outline':'Outline: direct mapping to ',
    'coverage':'Coverage: ',
    'shared':'Overlap: explicit shared mappings; area is not a percentage',
    'functional_overlap':'Red contour: intersection of 2+ system coverage polygons',
    'maturity':'Maturity:'
}

MATURITY_LEGEND=[{'level':i,'name':name,'description':description} for i,(name,description) in enumerate(zip(LEVELS,[
    'Capability absent','Ad hoc, unpredictable','Planned and tracked','Standardized practices','Measured and controlled','Continuous improvement']))]


def add_maturity_legend(group,width,y):
    import math,xml.etree.ElementTree as ET
    ns='{'+SVGNS+'}';tilewidth=min(216,width-48);columns=max(1,int((width-48+12)//(tilewidth+12)))
    header=ET.SubElement(group,ns+'text',{'x':'24.0','y':f'{y+10:.1f}','font-size':'12','fill':'#475569','text-anchor':'start'})
    header.text=LEGEND_LABELS['maturity']
    for i,item in enumerate(MATURITY_LEGEND):
        x=24+(i%columns)*(tilewidth+12);top=y+22+(i//columns)*52
        tile=ET.SubElement(group,ns+'g',{'class':'maturity-legend-item','data-maturity-level':str(item['level'])})
        ET.SubElement(tile,ns+'rect',{'class':f'maturity-legend-swatch caprect m{item["level"]}','x':f'{x:.1f}','y':f'{top:.1f}','width':'36','height':'26','rx':'6','fill':'#c9d5f2','stroke':'#c9d5f2','stroke-width':'3'})
        for text,tx,ty,size,fill,anchor in [(str(item['level']),x+18,top+17,'11','#0f172a','middle'),(item['name'],x+48,top+9,'11','#334155','start'),(item['description'],x+48,top+25,'10','#64748b','start')]:
            ET.SubElement(tile,ns+'text',{'x':f'{tx:.1f}','y':f'{ty:.1f}','font-size':size,'fill':fill,'text-anchor':anchor}).text=text
    return y+22+math.ceil(len(MATURITY_LEGEND)/columns)*52+6


def update_legend(root,state,selection):
    import xml.etree.ElementTree as ET
    import textwrap
    ns='{'+SVGNS+'}';group=root.find(ns+"g[@class='legend']")
    if group is None:return
    group.clear();group.set('class','legend')
    bottom=float(root.get('data-content-bottom'));width=float(root.get('width'))
    maturity_key=False
    items=[];visible=[g for g in root.iter(ns+'g') if g.get('data-id') is not None and int(g.get('data-depth','1'))<=selection['depth']]
    apps={str(a['id']):a for a in state['applications']}
    if selection['legend'] and visible:
        if selection['sort_layers'] and root.findall(ns+"rect[@class='layer-zone']"):items.append((LEGEND_LABELS['layers'],None))
        if selection['tag_filter'] and any(g.get('data-tag-match')=='context' for g in visible):items.append((LEGEND_LABELS['context'],None))
        if selection['system_labels'] and any(g.find(ns+"text[@class='system-label']") is not None for g in visible):items.append((LEGEND_LABELS['labels'],None))
        if selection['system_id'] and any(g.get('data-support')=='supported' for g in visible):items.append((LEGEND_LABELS['outline']+apps[selection['system_id']]['name'],'#00a6a6'))
        active=[g for g in root.findall(ns+"g[@class='coverage-overlay']") if g.get('data-coverage-visible')=='yes']
        colors=json.loads(root.find(ns+'metadata').text)['coverage_colors']
        for overlay in active:
            aid=overlay.get('data-coverage-system');items.append((LEGEND_LABELS['coverage']+apps[aid]['name'],colors[aid]))
        if active:items.append((LEGEND_LABELS['shared'],None))
        if root.find(ns+"g[@class='functional-overlap']") is not None:items.append((LEGEND_LABELS['functional_overlap'],'#dc2626'))
        if selection['maturity'] and any(g.find(ns+"text[@class='maturity-label']") is not None for g in visible):maturity_key=True
    x=24.;baseline=bottom+18;rowheight=14.
    for label,color in items:
        label=' '.join(label.split())
        prefix=16 if color else 0
        lines=textwrap.wrap(label,width=max(4,int((width-48-prefix)/(11*.62))),break_long_words=True,break_on_hyphens=False)
        itemwidth=max(len(line) for line in lines)*11*.62+prefix
        if x>24 and x+itemwidth>width-24:x=24.;baseline+=rowheight+6;rowheight=14.
        if color:ET.SubElement(group,ns+'rect',{'x':f'{x:.1f}','y':f'{baseline-9:.1f}','width':'10','height':'10','rx':'2','fill':color})
        node=ET.SubElement(group,ns+'text',{'x':f'{x+prefix:.1f}','y':f'{baseline:.1f}','font-size':'11','fill':'#475569','text-anchor':'start'})
        for i,line in enumerate(lines):ET.SubElement(node,ns+'tspan',{'x':f'{x+prefix:.1f}','dy':'14' if i else '0'}).text=line
        rowheight=max(rowheight,14*len(lines));x+=itemwidth+18
    height=baseline+rowheight+6 if items else bottom+20
    if maturity_key:height=add_maturity_legend(group,width,baseline+rowheight+14 if items else bottom+12)
    group.set('style','display:inline' if items or maturity_key else 'display:none')
    root.set('height',f'{height:g}');root.set('viewBox',f'0 0 {width:g} {height:g}')


def coverage_shape_points(hull,shape='angled',rounded=False):
    """Choose an enclosing rectangle or the original hull; round convex corners inward."""
    import math
    if shape not in ('angled','rectangular'):raise ValueError('Unknown coverage shape')
    points=list(hull)
    if shape=='rectangular':
        xmin=min(x for x,y in points);xmax=max(x for x,y in points);ymin=min(y for x,y in points);ymax=max(y for x,y in points)
        points=[(xmin,ymin),(xmax,ymin),(xmax,ymax),(xmin,ymax)]
    if not rounded:return points
    result=[]
    for i,corner in enumerate(points):
        previous=points[i-1];following=points[(i+1)%len(points)]
        before=math.hypot(previous[0]-corner[0],previous[1]-corner[1]);after=math.hypot(following[0]-corner[0],following[1]-corner[1])
        radius=min(10,before/2,after/2)
        start=tuple(corner[k]+(previous[k]-corner[k])*radius/before for k in (0,1))
        end=tuple(corner[k]+(following[k]-corner[k])*radius/after for k in (0,1))
        for step in range(9):
            t=step/8
            result.append(tuple(math.floor(((1-t)**2*start[k]+2*(1-t)*t*corner[k]+t*t*end[k])*10000+.5)/10000 for k in (0,1)))
    return result


def apply_coverage_shape(root,shape='angled',rounded=False):
    ns='{'+SVGNS+'}'
    if shape not in ('angled','rectangular'):raise ValueError('Unknown coverage shape')
    for group in root.findall(ns+"g[@class='coverage-overlay']"):
        polygon=group.find(ns+"polygon[@class='coverage-polygon']")
        original=polygon.get('data-coverage-hull',polygon.get('points'))
        hull=[tuple(map(float,p.split(','))) for p in original.split()]
        points=' '.join(f'{x:.4f},{y:.4f}' for x,y in coverage_shape_points(hull,shape,rounded))
        polygon.set('points',points)
        group.find(ns+'defs/'+ns+'mask/'+ns+'polygon').set('points',points)
    root.set('data-coverage-shape',shape);root.set('data-coverage-rounded','yes' if rounded else 'no')


def polygon_intersection(subject,clip):
    """Intersect convex coverage hulls; touching edges have no area."""
    def cross(a,b,p):return (b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0])
    output=list(subject)
    for a,b in zip(clip,clip[1:]+clip[:1]):
        source=output;output=[]
        if not source:break
        previous=source[-1];dp=cross(a,b,previous)
        for current in source:
            dc=cross(a,b,current)
            if (dc>=-1e-8)!=(dp>=-1e-8):
                t=dp/(dp-dc);output.append((previous[0]+t*(current[0]-previous[0]),previous[1]+t*(current[1]-previous[1])))
            if dc>=-1e-8:output.append(current)
            previous=current;dp=dc
    area=abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(output,output[1:]+output[:1])))/2
    return output if area>1e-6 else []


def update_functional_overlap(root,state,enabled):
    """Outline the union of pairwise outer-hull intersections, independent of box cut-outs."""
    import xml.etree.ElementTree as ET
    ns='{'+SVGNS+'}'
    for old in root.findall(ns+"g[@class='functional-overlap']"):root.remove(old)
    if not enabled:return []
    active=root.findall(ns+"g[@class='coverage-overlay'][@data-coverage-visible='yes']")
    regions=[]
    for i,left in enumerate(active):
        for right in active[i+1:]:
            polygons=[g.find(ns+"polygon[@class='coverage-polygon']") for g in (left,right)]
            points=[[tuple(map(float,p.split(','))) for p in poly.get('points').split()] for poly in polygons]
            intersection=polygon_intersection(*points)
            if intersection:regions.append((sorted([left.get('data-coverage-system'),right.get('data-coverage-system')]),intersection))
    if not regions:return []
    group=ET.SubElement(root,ns+'g',{'class':'functional-overlap','pointer-events':'none'})
    defs=ET.SubElement(group,ns+'defs')
    attrs={'id':'functional-overlap-edge','filterUnits':'userSpaceOnUse','x':'0','y':'0','width':root.get('width'),'height':root.get('data-content-bottom'),'color-interpolation-filters':'sRGB'}
    edge=ET.SubElement(defs,ns+'filter',attrs)
    for tag,attrs in [('feMorphology',{'in':'SourceAlpha','operator':'dilate','radius':'1.5','result':'outer'}),('feMorphology',{'in':'SourceAlpha','operator':'erode','radius':'1.5','result':'inner'}),('feComposite',{'in':'outer','in2':'inner','operator':'out','result':'edge'}),('feFlood',{'flood-color':'#dc2626','result':'red'}),('feComposite',{'in':'red','in2':'edge','operator':'in'})]:ET.SubElement(edge,ns+tag,attrs)
    boundary=ET.SubElement(group,ns+'g',{'class':'functional-overlap-outline','filter':'url(#functional-overlap-edge)'})
    pairs=[]
    for ids,points in regions:
        pair=ET.SubElement(boundary,ns+'g',{'class':'functional-overlap-region','data-overlap-systems':json.dumps(ids,ensure_ascii=False,separators=(',',':'))})
        ET.SubElement(pair,ns+'polygon',{'points':' '.join(f'{x:.4f},{y:.4f}' for x,y in points),'fill':'white'})
        pairs.append(ids)
    return pairs


def apply_view(svg,state,system='',depth=3,labels=False,show_maturity=False,legend=True,coverage=False,coverage_systems=None,functional_overlap=False,coverage_shape='angled',round_coverage=False):
    import xml.etree.ElementTree as ET
    ET.register_namespace('',SVGNS);root=ET.fromstring(svg)
    apply_coverage_shape(root,coverage_shape,round_coverage)
    apps={str(a['id']):a for a in state['applications']}
    if system and system not in apps:raise ValueError('Selected system is not in selected state')
    if depth not in (1,2,3):raise ValueError('Depth must be 1, 2 or 3')
    root.attrib.update({'data-max-depth':str(depth),'data-system-labels':'on' if labels else 'off','data-maturity':'on' if show_maturity else 'off','data-legend':'on' if legend else 'off','data-system-selected':'yes' if system else 'no'})
    pilot=json.loads(root.find('{'+SVGNS+'}metadata').text).get('coverage_system_id')
    if coverage_systems is not None:
        if not isinstance(coverage_systems,(list,tuple)) or any(not isinstance(a,str) for a in coverage_systems):raise ValueError('coverage_systems must be a list of system IDs')
        if len(set(coverage_systems))!=len(coverage_systems):raise ValueError('Duplicate selected coverage system')
        if set(coverage_systems)-apps.keys():raise ValueError('Selected coverage system is not in selected state')
    selected=sorted(coverage_systems if coverage_systems is not None else ([pilot] if pilot in apps else [] if pilot else apps)) if coverage else []
    for group in root.findall("{*}g[@class='coverage-overlay']"):
        visible=group.get('data-coverage-system') in selected and int(group.get('data-coverage-depth'))==depth
        group.set('data-coverage-visible','yes' if visible else 'no')
        group.set('style','display:inline' if visible else 'display:none')
    for g in root.iter('{'+SVGNS+'}g'):
        if 'data-id' in g.attrib:g.set('data-support','supported' if system and system in json.loads(g.get('data-applications','[]')) else 'not-specified')
    overlaps_enabled=bool(functional_overlap and coverage and len(selected)>=2)
    overlaps=update_functional_overlap(root,state,overlaps_enabled)
    selection={'coverage_shape':coverage_shape,'round_coverage':bool(round_coverage),'functional_overlap':overlaps_enabled,'functional_overlap_system_pairs':overlaps,'view_date':json.loads(root.find('{'+SVGNS+'}metadata').text).get('view_date'),'system_id':system or None,'depth':depth,'system_labels':labels,'maturity':show_maturity,'legend':legend,'sort_layers':json.loads(root.find('{'+SVGNS+'}metadata').text)['layout_mode']=='layers','show_backlog':json.loads(root.find('{'+SVGNS+'}metadata').text)['show_backlog'],'tag_filter':json.loads(root.find('{'+SVGNS+'}metadata').text)['tag_filter'],'coverage':bool(coverage),'coverage_system_id':selected[0] if len(selected)==1 else None,'coverage_system_ids':selected}
    meta=root.find('{'+SVGNS+'}metadata');md=json.loads(meta.text);md['view']=selection;meta.text=json.dumps(md,ensure_ascii=False)
    update_legend(root,state,selection)
    textnode=next(e for e in root.iter('{'+SVGNS+'}text') if e.get('class')=='view-selection')
    caption=f'Layout: {"Layers" if selection["sort_layers"] else "Classic"} · Backlog: {"on" if selection["show_backlog"] else "off"} · Tag: {selection["tag_filter"] or "All"} · System: {apps[system]["name"] if system else "All"} · Depth: {depth} · System labels: {"on" if labels else "off"} · Maturity: {"on" if show_maturity else "off"} · Legend: {"on" if legend else "off"} · Coverage: {", ".join(apps[a]["name"] for a in selected) if coverage and selected else "none" if coverage else "off"}'
    import textwrap
    for child in list(textnode):textnode.remove(child)
    for i,line in enumerate(textwrap.wrap(caption,width=max(20,int((float(root.get('width'))-48)/7)),break_long_words=True)):
        child=ET.SubElement(textnode,'{'+SVGNS+'}tspan',{'x':textnode.get('x'),'dy':'0' if i==0 else '14'});child.text=line
    return ET.tostring(root,encoding='unicode')

def prune_export(svg):
    """Keep the selected visible content and reproducibility metadata, not hidden model detail."""
    import xml.etree.ElementTree as ET
    ET.register_namespace('',SVGNS);root=ET.fromstring(svg)
    depth=int(root.get('data-max-depth','3'))
    hidden=set()
    if root.get('data-system-labels')=='off':hidden.add('system-label')
    if root.get('data-maturity')=='off':hidden.add('maturity-label')
    if root.get('data-legend')=='off':hidden.add('legend')
    def walk(parent):
        for element in list(parent):
            classes=set(element.get('class','').split())
            if element.get('data-coverage-visible')=='no' or (element.get('data-depth') and int(element.get('data-depth'))>depth) or classes & hidden or (element.tag=='{'+SVGNS+'}desc' and parent.get('data-id') is not None):
                parent.remove(element);continue
            element.attrib.pop('data-applications',None)
            walk(element)
    walk(root)
    return ET.tostring(root,encoding='unicode')

HTML_JS=r'''
const payload=JSON.parse(document.getElementById('model-data').textContent);
const stateInput=document.getElementById('state'),systemInput=document.getElementById('system');
const coverageChoices=document.getElementById('coverage-systems');
const allCoverage=new Map(payload.coverage_applications.map(a=>[String(a.id),a.name]));
Array.from(allCoverage).sort((a,b)=>a[0].localeCompare(b[0],'en')).forEach(([id,name])=>{const label=document.createElement('label'),input=document.createElement('input'),swatch=document.createElement('span'),title=document.createElement('span');input.type='checkbox';input.value=id;input.checked=payload.coverage_default_ids.includes(id);input.addEventListener('change',updateView);swatch.className='coverage-swatch';swatch.style.background=payload.coverage_colors[id];title.className='coverage-system-label';title.textContent=name;label.append(input,swatch,title);coverageChoices.append(label)});
function selectedCoverage(){return Array.from(coverageChoices.querySelectorAll('input:checked:not(:disabled)')).map(i=>i.value).sort()}
const dateInput=document.getElementById('view-date'),dateStatus=document.getElementById('date-status');
const timeSlider=document.getElementById('time-slider'),timeValue=document.getElementById('time-value');
const dayNumber=value=>Math.floor(Date.parse(value+'T00:00:00Z')/86400000);
const dayDate=value=>new Date(Number(value)*86400000).toISOString().slice(0,10);
let timelineMin=payload.frames.length?dayNumber(payload.frames[0].frame_from):0;
const lastFrame=payload.frames[payload.frames.length-1];
let timelineMax=lastFrame?(lastFrame.frame_to?dayNumber(lastFrame.frame_to)-1:Math.min(dayNumber('9999-12-31'),Math.max(dayNumber(lastFrame.frame_from),dayNumber(payload.initial_date||localToday()))+365)):0;
let pendingScrub=null,renderedState=null,renderedKey='';
function syncSlider(){const when=dateInput.value;timeSlider.disabled=!payload.frames.length;if(!payload.frames.length){timeValue.textContent='No dated timeline';return}if(when){const day=dayNumber(when);timelineMin=Math.min(timelineMin,day);timelineMax=Math.max(timelineMax,day);timeSlider.min=String(timelineMin);timeSlider.max=String(timelineMax);timeSlider.value=String(day);timeSlider.setAttribute('aria-valuetext',when);timeValue.textContent=when}else{timeValue.textContent='Snapshot mode';timeSlider.setAttribute('aria-valuetext','Snapshot mode; move to select a date')}document.getElementById('time-first').textContent=dayDate(timelineMin);document.getElementById('time-last').textContent=dayDate(timelineMax)}
function scrubTime(){dateInput.value=dayDate(timeSlider.value);timeValue.textContent=dateInput.value;timeSlider.setAttribute('aria-valuetext',dateInput.value);if(pendingScrub===null)pendingScrub=requestAnimationFrame(()=>{pendingScrub=null;loadDate()})}
timeSlider.addEventListener('input',scrubTime);timeSlider.addEventListener('change',()=>{if(pendingScrub!==null){cancelAnimationFrame(pendingScrub);pendingScrub=null}dateInput.value=dayDate(timeSlider.value);loadDate()});
payload.frames.forEach(frame=>{const tick=document.createElement('option');tick.value=String(dayNumber(frame.frame_from));tick.label=frame.frame_from;document.getElementById('time-events').append(tick)});
function currentState(){const when=dateInput.value;return when?payload.frames.find(s=>s.frame_from<=when&&(!s.frame_to||when<s.frame_to)):payload.states.find(s=>s.id===stateInput.value)}
function localToday(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function dateCaption(state){return `Date: ${dateInput.value} · Snapshot basis: ${state.snapshot_as_of||'not specified'} · ${state.kind==='target'?'Planned scenario; not an observed outcome':'Recorded snapshot basis; no implied daily observation'}`}
function wrapText(node,caption,svg){node.replaceChildren();const limit=Math.max(4,Math.floor((Number(svg.getAttribute('width'))-48)/(Number(node.getAttribute('font-size'))*.62)));const words=caption.split(/\s+/);let lines=[''];words.forEach(word=>{while(word.length>limit){if(lines[lines.length-1])lines.push('');lines[lines.length-1]=word.slice(0,limit);word=word.slice(limit);lines.push('')}if((lines[lines.length-1]+' '+word).trim().length>limit)lines.push(word);else lines[lines.length-1]=(lines[lines.length-1]+' '+word).trim()});lines.forEach((line,i)=>{const t=document.createElementNS('http://www.w3.org/2000/svg','tspan');t.setAttribute('x',node.getAttribute('x'));t.setAttribute('dy',i?String(Number(node.getAttribute('font-size'))+3):'0');t.textContent=line;node.appendChild(t)})}
function loadDate(){if(pendingScrub!==null){cancelAnimationFrame(pendingScrub);pendingScrub=null}syncSlider();const state=currentState();if(dateInput.value)stateInput.value=state?state.id:'';loadState()}
function loadState(){const state=currentState(),old=systemInput.value;systemInput.replaceChildren(new Option('All systems',''));if(state)state.applications.forEach(a=>systemInput.add(new Option(a.name,String(a.id))));systemInput.value=state&&state.applications.some(a=>String(a.id)===old)?old:'';loadLayout()}
function loadLayout(){syncSlider();const state=currentState(),when=dateInput.value;const key=['sort-layers','show-backlog','system-labels','maturity'].map(id=>document.getElementById(id).checked?'1':'0').join(':');const map=document.getElementById('map');document.getElementById('export-svg').disabled=!state;document.getElementById('print').disabled=!state;document.getElementById('date-prev').disabled=!payload.frames.some(s=>s.frame_from<when);document.getElementById('date-next').disabled=!payload.frames.some(s=>s.frame_from>when);
if(state){const layoutKey=key+':'+document.getElementById('tag-filter').value;if(state!==renderedState||layoutKey!==renderedKey||!map.querySelector('svg')){map.innerHTML='<div id="map-stage"><div id="map-content">'+state.layouts[layoutKey]+'</div></div>';renderedState=state;renderedKey=layoutKey}dateStatus.textContent=when?`${when} · ${state.label} · ${state.effective_from} ≤ date ${state.effective_to?'< '+state.effective_to:'(open end)'} · ${state.kind==='target'?'Planned scenario':'Snapshot-based view'}`:'Snapshot mode — no date selected. '+state.label}else{renderedState=null;renderedKey='';map.replaceChildren();const message=document.createElement('p');message.textContent=when?`No state data for date ${when}. Choose a date within a supplied period or select a snapshot.`:'Choose a date or select a snapshot.';map.append(message);dateStatus.textContent=message.textContent;document.getElementById('technical-details').replaceChildren();applyViewport()}
coverageChoices.querySelectorAll('input').forEach(i=>{const app=state&&state.applications.find(a=>String(a.id)===i.value);i.disabled=!app;i.parentElement.querySelector('.coverage-system-label').textContent=app?app.name:allCoverage.get(i.value);i.parentElement.title=i.disabled?'Not available in this state':''});document.getElementById('coverage').disabled=!state||!state.applications.length;if(!state)document.getElementById('functional-overlap').disabled=true;document.getElementById('coverage-count').textContent=`${selectedCoverage().length} selected`;if(state)updateView()}
function coverageShapePoints(hull,shape,rounded){let points=hull;if(shape==='rectangular'){const xs=hull.map(p=>p[0]),ys=hull.map(p=>p[1]),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);points=[[xmin,ymin],[xmax,ymin],[xmax,ymax],[xmin,ymax]]}if(!rounded)return points;const result=[];points.forEach((corner,i)=>{const previous=points[(i+points.length-1)%points.length],following=points[(i+1)%points.length],before=Math.hypot(previous[0]-corner[0],previous[1]-corner[1]),after=Math.hypot(following[0]-corner[0],following[1]-corner[1]),radius=Math.min(10,before/2,after/2),start=corner.map((v,k)=>v+(previous[k]-v)*radius/before),end=corner.map((v,k)=>v+(following[k]-v)*radius/after);for(let step=0;step<=8;step++){const t=step/8;result.push(corner.map((v,k)=>Math.round(((1-t)**2*start[k]+2*(1-t)*t*v+t*t*end[k])*10000)/10000))}});return result}
function applyCoverageShape(svg,shape,rounded){svg.querySelectorAll('.coverage-overlay').forEach(group=>{const polygon=group.querySelector('.coverage-polygon'),hull=polygon.getAttribute('data-coverage-hull').split(/\s+/).map(p=>p.split(',').map(Number)),points=coverageShapePoints(hull,shape,rounded).map(([x,y])=>`${x.toFixed(4)},${y.toFixed(4)}`).join(' ');polygon.setAttribute('points',points);group.querySelector('defs mask polygon').setAttribute('points',points)});svg.setAttribute('data-coverage-shape',shape);svg.setAttribute('data-coverage-rounded',rounded?'yes':'no')}
function polygonIntersection(subject,clip){const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);let output=subject;for(let i=0;i<clip.length;i++){const a=clip[i],b=clip[(i+1)%clip.length],source=output;output=[];if(!source.length)break;let previous=source[source.length-1],dp=cross(a,b,previous);for(const current of source){const dc=cross(a,b,current);if((dc>=-1e-8)!==(dp>=-1e-8)){const t=dp/(dp-dc);output.push([previous[0]+t*(current[0]-previous[0]),previous[1]+t*(current[1]-previous[1])])}if(dc>=-1e-8)output.push(current);previous=current;dp=dc}}const area=Math.abs(output.reduce((sum,a,i)=>{const b=output[(i+1)%output.length];return sum+a[0]*b[1]-b[0]*a[1]},0))/2;return area>1e-6?output:[]}
function updateFunctionalOverlap(svg,state,enabled){svg.querySelectorAll('g.functional-overlap').forEach(g=>g.remove());if(!enabled)return [];const active=Array.from(svg.querySelectorAll('.coverage-overlay[data-coverage-visible="yes"]')),regions=[];for(let i=0;i<active.length;i++)for(const right of active.slice(i+1)){const left=active[i],polygons=[left,right].map(g=>g.querySelector('.coverage-polygon')),points=polygons.map(p=>p.getAttribute('points').trim().split(/\s+/).map(p=>p.split(',').map(Number))),intersection=polygonIntersection(...points);if(intersection.length)regions.push({ids:[left,right].map(g=>g.getAttribute('data-coverage-system')).sort(),points:intersection})}if(!regions.length)return [];const ns='http://www.w3.org/2000/svg',add=(parent,tag,attrs)=>{const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));parent.append(e);return e},group=add(svg,'g',{class:'functional-overlap','pointer-events':'none'}),defs=add(group,'defs',{}),edge=add(defs,'filter',{id:'functional-overlap-edge',filterUnits:'userSpaceOnUse',x:'0',y:'0',width:svg.getAttribute('width'),height:svg.getAttribute('data-content-bottom'),'color-interpolation-filters':'sRGB'});for(const [tag,attrs] of [['feMorphology',{in:'SourceAlpha',operator:'dilate',radius:'1.5',result:'outer'}],['feMorphology',{in:'SourceAlpha',operator:'erode',radius:'1.5',result:'inner'}],['feComposite',{in:'outer',in2:'inner',operator:'out',result:'edge'}],['feFlood',{'flood-color':'#dc2626',result:'red'}],['feComposite',{in:'red',in2:'edge',operator:'in'}]])add(edge,tag,attrs);const boundary=add(group,'g',{class:'functional-overlap-outline',filter:'url(#functional-overlap-edge)'});for(const {ids,points} of regions){const pair=add(boundary,'g',{class:'functional-overlap-region','data-overlap-systems':JSON.stringify(ids)});add(pair,'polygon',{points:points.map(([x,y])=>`${x.toFixed(4)},${y.toFixed(4)}`).join(' '),fill:'white'})}return regions.map(r=>r.ids)}
function addMaturityLegend(group,width,y){const ns='http://www.w3.org/2000/svg',add=(parent,tag,attrs,text)=>{const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(text!==undefined)e.textContent=text;parent.append(e);return e},tilewidth=Math.min(216,width-48),columns=Math.max(1,Math.floor((width-48+12)/(tilewidth+12)));add(group,'text',{x:'24.0',y:(y+10).toFixed(1),'font-size':'12',fill:'#475569','text-anchor':'start'},payload.legend_labels.maturity);payload.maturity_legend.forEach((item,i)=>{const x=24+(i%columns)*(tilewidth+12),top=y+22+Math.floor(i/columns)*52,tile=add(group,'g',{class:'maturity-legend-item','data-maturity-level':String(item.level)});add(tile,'rect',{class:`maturity-legend-swatch caprect m${item.level}`,x:x.toFixed(1),y:top.toFixed(1),width:'36',height:'26',rx:'6',fill:'#c9d5f2',stroke:'#c9d5f2','stroke-width':'3'});for(const [text,tx,ty,size,fill,anchor] of [[String(item.level),x+18,top+17,'11','#0f172a','middle'],[item.name,x+48,top+9,'11','#334155','start'],[item.description,x+48,top+25,'10','#64748b','start']])add(tile,'text',{x:tx.toFixed(1),y:ty.toFixed(1),'font-size':size,fill,'text-anchor':anchor},text)});return y+22+Math.ceil(payload.maturity_legend.length/columns)*52+6}
function updateLegend(svg,state,view){const ns='http://www.w3.org/2000/svg',group=svg.querySelector('g.legend');if(!group)return;group.replaceChildren();const width=Number(svg.getAttribute('width')),bottom=Number(svg.getAttribute('data-content-bottom')),items=[],words=payload.legend_labels;const visible=Array.from(svg.querySelectorAll('g[data-id]')).filter(g=>Number(g.getAttribute('data-depth'))<=view.depth);
let maturityKey=false;if(view.legend&&visible.length){if(view.sort_layers&&svg.querySelector('.layer-zone'))items.push([words.layers,null]);if(view.tag_filter&&visible.some(g=>g.getAttribute('data-tag-match')==='context'))items.push([words.context,null]);if(view.system_labels&&visible.some(g=>Array.from(g.children).some(n=>n.classList.contains('system-label'))))items.push([words.labels,null]);if(view.system_id&&visible.some(g=>g.getAttribute('data-support')==='supported'))items.push([words.outline+state.applications.find(a=>String(a.id)===view.system_id).name,'#00a6a6']);const active=Array.from(svg.querySelectorAll('.coverage-overlay[data-coverage-visible="yes"]'));active.forEach(g=>{const id=g.getAttribute('data-coverage-system');items.push([words.coverage+state.applications.find(a=>String(a.id)===id).name,payload.coverage_colors[id]])});if(active.length)items.push([words.shared,null]);if(svg.querySelector('g.functional-overlap'))items.push([words.functional_overlap,'#dc2626']);if(view.maturity&&visible.some(g=>Array.from(g.children).some(n=>n.classList.contains('maturity-label'))))maturityKey=true}
let x=24,baseline=bottom+18,rowheight=14;for(const [label,color] of items){const prefix=color?16:0,limit=Math.max(4,Math.floor((width-48-prefix)/(11*.62)));let lines=[''];label.split(/\s+/).forEach(word=>{while(word.length>limit){if(lines[lines.length-1])lines.push('');lines[lines.length-1]=word.slice(0,limit);word=word.slice(limit);lines.push('')}if((lines[lines.length-1]+' '+word).trim().length>limit)lines.push(word);else lines[lines.length-1]=(lines[lines.length-1]+' '+word).trim()});const itemwidth=Math.max(...lines.map(line=>line.length))*11*.62+prefix;if(x>24&&x+itemwidth>width-24){x=24;baseline+=rowheight+6;rowheight=14}if(color){const rect=document.createElementNS(ns,'rect');Object.entries({x,y:baseline-9,width:10,height:10,rx:2,fill:color}).forEach(([k,v])=>rect.setAttribute(k,k==='x'||k==='y'?Number(v).toFixed(1):String(v)));group.append(rect)}const text=document.createElementNS(ns,'text');Object.entries({x:x+prefix,y:baseline,'font-size':11,fill:'#475569','text-anchor':'start'}).forEach(([k,v])=>text.setAttribute(k,k==='x'||k==='y'?Number(v).toFixed(1):String(v)));lines.forEach((line,i)=>{const span=document.createElementNS(ns,'tspan');span.setAttribute('x',(x+prefix).toFixed(1));span.setAttribute('dy',i?'14':'0');span.textContent=line;text.append(span)});group.append(text);rowheight=Math.max(rowheight,14*lines.length);x+=itemwidth+18}let height=items.length?baseline+rowheight+6:bottom+20;if(maturityKey)height=addMaturityLegend(group,width,items.length?baseline+rowheight+14:bottom+12);group.style.display=items.length||maturityKey?'inline':'none';svg.setAttribute('height',String(height));svg.setAttribute('viewBox',`0 0 ${width} ${height}`)}
function updateTechnicalNotes(md){const details=document.getElementById('technical-details');details.replaceChildren();for(const [label,value] of [['Model revision',md.model_revision],['Methodology contract',md.methodology_revision],['Reviewed baseline',md.methodology_baseline_revision],['Contract status',md.methodology_contract_status],['Adapter',md.adapter_version],['Renderer',md.renderer_version],['State',md.state_id],['View date',md.view_date],['Snapshot basis',md.snapshot_as_of],['View contract',md.view_contract],['Mapping semantics',md.mapping_semantics],['Functional overlap',md.functional_overlap_semantics]]){const term=document.createElement('dt'),description=document.createElement('dd');term.textContent=label;description.textContent=value||'Not specified';details.append(term,description)}}
let zoomScale=1,fitActive=false,viewportFrame=null;
const mapViewport=document.getElementById('map'),zoomRange=document.getElementById('zoom-range');
function applyViewport(reset=false){const svg=mapViewport.querySelector('svg'),stage=document.getElementById('map-stage'),content=document.getElementById('map-content');for(const id of ['zoom-in','zoom-out','zoom-reset','zoom-range','fit-map'])document.getElementById(id).disabled=!svg;if(!svg||!stage)return;const width=Number(svg.getAttribute('width')),height=Number(svg.getAttribute('height'));if(fitActive)zoomScale=Math.min(1,Math.max(1,mapViewport.clientWidth-25)/width,Math.max(1,mapViewport.clientHeight-25)/height);stage.style.width=`${width*zoomScale}px`;stage.style.height=`${height*zoomScale}px`;content.style.width=`${width}px`;content.style.height=`${height}px`;content.style.transform=`scale(${zoomScale})`;const percentage=zoomScale*100;zoomRange.min=String(Math.min(1,Math.floor(percentage)));zoomRange.value=String(Math.round(percentage));zoomRange.setAttribute('aria-valuetext',`${percentage.toFixed(1)}%`);document.getElementById('zoom-value').textContent=`${Number(percentage.toFixed(1))}%`;document.getElementById('fit-map').setAttribute('aria-pressed',String(fitActive));if(reset){mapViewport.scrollLeft=0;mapViewport.scrollTop=0}}
function scheduleViewport(){if(viewportFrame===null)viewportFrame=requestAnimationFrame(()=>{viewportFrame=null;applyViewport()})}
function setZoom(scale){const stage=document.getElementById('map-stage');if(!stage)return;const centerX=(mapViewport.scrollLeft+mapViewport.clientWidth/2-stage.offsetLeft)/zoomScale,centerY=(mapViewport.scrollTop+mapViewport.clientHeight/2-stage.offsetTop)/zoomScale;fitActive=false;zoomScale=Math.max(.01,Math.min(3,scale));applyViewport();mapViewport.scrollLeft=stage.offsetLeft+centerX*zoomScale-mapViewport.clientWidth/2;mapViewport.scrollTop=stage.offsetTop+centerY*zoomScale-mapViewport.clientHeight/2}
function fitMap(){fitActive=true;applyViewport(true)}
document.getElementById('fit-map').addEventListener('click',fitMap);document.getElementById('zoom-in').addEventListener('click',()=>setZoom(zoomScale*1.25));document.getElementById('zoom-out').addEventListener('click',()=>setZoom(zoomScale/1.25));document.getElementById('zoom-reset').addEventListener('click',()=>setZoom(1));zoomRange.addEventListener('input',()=>setZoom(Number(zoomRange.value)/100));window.addEventListener('resize',scheduleViewport);if(typeof ResizeObserver!=='undefined')new ResizeObserver(scheduleViewport).observe(mapViewport);
function setDiagramOnly(on){document.getElementById('diagram-only').checked=on;document.body.classList.toggle('diagram-only',on);const toggle=document.getElementById('show-controls');toggle.textContent=on?'Show controls':'Hide controls';toggle.setAttribute('aria-expanded',String(!on));if(on){fitMap();document.getElementById('show-controls').focus()}else{applyViewport();document.getElementById('diagram-only').focus()}}
document.getElementById('diagram-only').addEventListener('change',event=>setDiagramOnly(event.target.checked));document.getElementById('show-controls').addEventListener('click',()=>setDiagramOnly(!document.body.classList.contains('diagram-only')));document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.body.classList.contains('diagram-only'))setDiagramOnly(false)});
function updateView(){const svg=document.querySelector('#map svg'),state=currentState(),system=systemInput.value;if(!svg||!state)return;const depth=document.getElementById('depth').value;const labels=document.getElementById('system-labels').checked,maturity=document.getElementById('maturity').checked,legend=document.getElementById('legend').checked,coverage=document.getElementById('coverage').checked&&!document.getElementById('coverage').disabled;const selected=coverage?selectedCoverage():[];document.getElementById('coverage-count').textContent=`${selectedCoverage().length} selected`;svg.querySelectorAll('.coverage-overlay').forEach(g=>{const visible=selected.includes(g.getAttribute('data-coverage-system'))&&Number(g.getAttribute('data-coverage-depth'))===Number(depth);g.setAttribute('data-coverage-visible',visible?'yes':'no');g.style.display=visible?'inline':'none'});
svg.setAttribute('data-max-depth',depth);svg.setAttribute('data-system-labels',labels?'on':'off');svg.setAttribute('data-maturity',maturity?'on':'off');svg.setAttribute('data-legend',legend?'on':'off');svg.setAttribute('data-system-selected',system?'yes':'no');svg.querySelectorAll('g[data-id]').forEach(g=>g.setAttribute('data-support',system&&JSON.parse(g.getAttribute('data-applications')).includes(system)?'supported':'not-specified'));
const coverageShape=document.getElementById('coverage-shape').value,roundCoverage=document.getElementById('round-coverage').checked;applyCoverageShape(svg,coverageShape,roundCoverage);const overlapInput=document.getElementById('functional-overlap');overlapInput.disabled=!coverage||selected.length<2;const overlapEnabled=overlapInput.checked&&!overlapInput.disabled;const overlapIds=updateFunctionalOverlap(svg,state,overlapEnabled);
const meta=svg.querySelector('metadata');const md=JSON.parse(meta.textContent);if(dateInput.value){md.as_of=dateInput.value;md.view_date=dateInput.value;const node=svg.querySelector('.date-context');if(node)wrapText(node,dateCaption(state),svg)}md.view={coverage_shape:coverageShape,round_coverage:roundCoverage,functional_overlap:overlapEnabled,functional_overlap_system_pairs:overlapIds,view_date:md.view_date,system_id:system||null,depth:Number(depth),system_labels:labels,maturity,legend,sort_layers:document.getElementById('sort-layers').checked,show_backlog:document.getElementById('show-backlog').checked,tag_filter:document.getElementById('tag-filter').value||null,coverage,coverage_system_id:selected.length===1?selected[0]:null,coverage_system_ids:selected};meta.textContent=JSON.stringify(md);updateLegend(svg,state,md.view);updateTechnicalNotes(md);
const name=system?state.applications.find(a=>String(a.id)===system).name:'All';const caption=`Layout: ${md.view.sort_layers?'Layers':'Classic'} · Backlog: ${md.view.show_backlog?'on':'off'} · Tag: ${md.view.tag_filter||'All'} · System: ${name} · Depth: ${depth} · System labels: ${labels?'on':'off'} · Maturity: ${maturity?'on':'off'} · Legend: ${legend?'on':'off'} · Coverage: ${coverage?(selected.map(id=>state.applications.find(a=>String(a.id)===id).name).join(', ')||'none'):'off'}`;const target=svg.querySelector('.view-selection');target.replaceChildren();const limit=Math.max(20,Math.floor((Number(svg.getAttribute('width'))-48)/7));const words=caption.split(/\s+/);let lines=[''];words.forEach(word=>{while(word.length>limit){if(lines[lines.length-1])lines.push('');lines[lines.length-1]=word.slice(0,limit);word=word.slice(limit);lines.push('')}if((lines[lines.length-1]+' '+word).trim().length>limit)lines.push(word);else lines[lines.length-1]=(lines[lines.length-1]+' '+word).trim()});lines.forEach((line,i)=>{const t=document.createElementNS('http://www.w3.org/2000/svg','tspan');t.setAttribute('x',target.getAttribute('x'));t.setAttribute('dy',i?'14':'0');t.textContent=line;target.appendChild(t)});applyViewport()}
stateInput.addEventListener('change',()=>{const state=payload.states.find(s=>s.id===stateInput.value);dateInput.value=state&&state.effective_from?(state.snapshot_as_of&&state.snapshot_as_of>=state.effective_from&&(!state.effective_to||state.snapshot_as_of<state.effective_to)?state.snapshot_as_of:state.effective_from):'';loadDate()});
dateInput.addEventListener('change',loadDate);document.getElementById('date-today').addEventListener('click',()=>{dateInput.value=localToday();loadDate()});
for(const [id,next] of [['date-prev',false],['date-next',true]])document.getElementById(id).addEventListener('click',()=>{const dates=payload.frames.map(s=>s.frame_from).filter(d=>next?d>dateInput.value:d<dateInput.value).sort();const value=next?dates[0]:dates[dates.length-1];if(value){dateInput.value=value;loadDate()}});
['sort-layers','show-backlog','system-labels','maturity','tag-filter'].forEach(id=>document.getElementById(id).addEventListener('change',loadLayout));['system','depth','legend','coverage','functional-overlap','coverage-shape','round-coverage'].forEach(id=>document.getElementById(id).addEventListener('change',updateView));
document.getElementById('export-svg').addEventListener('click',()=>{const current=document.querySelector('#map svg');const clone=current.cloneNode(true);const depth=Number(clone.getAttribute('data-max-depth'));clone.querySelectorAll('.coverage-overlay[data-coverage-visible="no"]').forEach(g=>g.remove());clone.querySelectorAll('g[data-depth]').forEach(g=>{if(Number(g.getAttribute('data-depth'))>depth)g.remove()});if(clone.getAttribute('data-system-labels')==='off')clone.querySelectorAll('.system-label').forEach(e=>e.remove());if(clone.getAttribute('data-maturity')==='off')clone.querySelectorAll('.maturity-label').forEach(e=>e.remove());if(clone.getAttribute('data-legend')==='off')clone.querySelectorAll('.legend').forEach(e=>e.remove());clone.querySelectorAll('g[data-id]').forEach(g=>{g.removeAttribute('data-applications');Array.from(g.children).filter(e=>e.localName==='desc').forEach(e=>e.remove())});const xml=new XMLSerializer().serializeToString(clone);const url=URL.createObjectURL(new Blob([xml],{type:'image/svg+xml;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='capability-map.svg';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)});document.getElementById('print').addEventListener('click',()=>window.print());dateInput.disabled=!payload.frames.length;document.getElementById('date-today').disabled=!payload.frames.length;dateInput.value=payload.frames.length?(payload.initial_date||localToday()):'';loadDate();
'''

def render(data, as_of=None, view_date=None):
    model=normalize(data,as_of)
    colors=coverage_colors(model)
    if view_date and not any(s['effective_from'] for s in model['states']):raise ValueError('--date requires dated state periods')
    def embed(state):
        return {'id':state['id'],'label':state['label'],'kind':state['kind'],
                'snapshot_as_of':state['snapshot_as_of'].isoformat() if state.get('snapshot_as_of') else None,
                'effective_from':state['effective_from'].isoformat() if state.get('effective_from') else None,
                'effective_to':state['effective_to'].isoformat() if state.get('effective_to') else None,
                'frame_from':state['frame_from'].isoformat() if state.get('frame_from') else None,
                'frame_to':state['frame_to'].isoformat() if state.get('frame_to') else None,
                'applications':state['applications'],'layouts':{
                f'{int(layers)}:{int(backlog)}:{int(labels)}:{int(maturity)}:{tag}':build_svg(model,state,layers,backlog,labels,maturity,tag)
                for layers in (False,True) for backlog in (False,True)
                for labels in (False,True) for maturity in (False,True) for tag in ('',*TAGS)}}
    payload={'maturity_legend':MATURITY_LEGEND,'legend_labels':LEGEND_LABELS,'coverage_colors':colors,'coverage_default_ids':[model['coverage_system_id']] if model.get('coverage_system_id') else [],
             'initial_date':(date(view_date) or model['view_date']).isoformat() if date(view_date) or model['view_date'] else None,
             'coverage_applications':[{'id':aid,'name':next(a['name'] for s in model['states'] for a in s['all_applications'] if str(a['id'])==aid)} for aid in colors],
             'states':[embed(s) for s in model['states']], 'frames':[embed(s) for s in timeline_frames(model)]}
    encoded=json.dumps(payload,ensure_ascii=True).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
    options=''.join(f'<option value="{esc(s["id"])}">{esc(s["label"])}{esc(" · "+s["horizon_label"] if s["horizon_label"] else "")}</option>' for s in model['states'])
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(model['title'])}</title>
<style>
body{{margin:0;height:100dvh;display:flex;flex-direction:column;overflow:hidden;background:#f5f7fa;color:#1e1e1e;font:14px Arial,sans-serif}}
header{{flex-shrink:0;max-height:65dvh;overflow:auto;padding:12px 20px;background:white;position:sticky;top:0;z-index:1;border-bottom:1px solid #dbe1e8}}
.control-grid{{display:grid;grid-template-columns:minmax(280px,1fr) minmax(420px,1.45fr) auto;gap:10px}}
.control-group{{margin:0;padding:8px 12px 10px;border:1px solid #dbe1e8;border-radius:8px;min-width:0}}
.control-group legend{{padding:0 5px;font-size:12px;font-weight:700;color:#475569}}
.time-group{{grid-column:1/-1}}.control-row{{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center}}
.control-row label{{display:inline-flex;align-items:center;gap:5px}}button,select,input[type=date]{{padding:6px}}
#state{{max-width:380px}}#system{{max-width:210px}}button{{cursor:pointer}}button:disabled{{cursor:default}}
.timeline{{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;margin-top:8px}}
.timeline label{{font-size:12px;color:#475569}}#time-slider{{width:100%;min-width:160px;margin:0;accent-color:#0f766e;cursor:ew-resize}}
#time-value{{font-variant-numeric:tabular-nums;font-weight:700;min-width:85px}}
.timeline-bounds{{display:flex;justify-content:space-between;margin:2px 97px 0 61px;font-size:11px;color:#64748b}}
#date-status{{margin:6px 0 0}}.coverage-choices{{display:flex;flex-wrap:wrap;gap:6px 14px;padding:7px 0 0}}
.coverage-choices label{{display:flex;align-items:center;gap:5px;font-size:12px}}.coverage-swatch{{display:inline-block;width:11px;height:11px;border-radius:3px}}
summary{{cursor:pointer;font-size:12px;color:#475569}}.systems-list{{margin-top:7px}}.diagram-notes{{margin-top:7px}}
.export-buttons{{display:flex;flex-direction:column;gap:7px}}#map{{position:relative;flex:1;min-height:0;overflow:auto;padding:12px;box-sizing:border-box}}#map-stage{{position:relative;margin:0 auto;overflow:hidden}}#map-content{{position:absolute;left:0;top:0;transform-origin:0 0}}#map svg{{display:block}}.view-tools{{flex-shrink:0;display:flex;align-items:center;gap:8px;padding:7px 16px;background:white;border-bottom:1px solid #dbe1e8}}#zoom-range{{width:140px;accent-color:#0f766e}}#zoom-value{{min-width:53px;text-align:center;font-variant-numeric:tabular-nums}}
.note{{font-size:12px;color:#475569}}#technical-details{{display:grid;grid-template-columns:150px 1fr;gap:5px 12px;font-size:12px;color:#475569}}#technical-details dt{{font-weight:700}}#technical-details dd{{margin:0;overflow-wrap:anywhere}}#show-controls{{margin-left:auto;background:white;border:1px solid #cbd5e1;border-radius:6px;padding:6px 12px}}body.diagram-only header{{display:none}}@media(max-width:1000px){{.control-grid{{grid-template-columns:1fr 1fr}}.export-group{{grid-column:1/-1}}.export-buttons{{flex-direction:row}}}}
@media print{{body{{display:block;height:auto;overflow:visible}}header,.view-tools{{display:none!important}}#map{{overflow:visible;padding:0}}#map-stage{{width:auto!important;height:auto!important}}#map-content{{position:static;transform:none!important;width:auto!important;height:auto!important}}#map svg{{width:100%;height:auto}}}}
</style></head><body><header id="diagram-controls"><div class="control-grid">
<fieldset class="control-group time-group"><legend>Time</legend>
<div class="control-row"><label>View date <input id="view-date" type="date"></label><button id="date-today">Today</button><button id="date-prev">Previous change</button><button id="date-next">Next change</button><label>State <select id="state">{options}</select></label></div>
<div class="timeline"><label for="time-slider">Timeline</label><input id="time-slider" type="range" min="0" max="0" step="1" list="time-events" aria-describedby="date-status"><output id="time-value" for="time-slider"></output></div>
<datalist id="time-events"></datalist><div class="timeline-bounds"><span id="time-first"></span><span id="time-last"></span></div><p id="date-status" role="status" class="note"></p></fieldset>
<fieldset class="control-group"><legend>Capability view</legend><div class="control-row">
<label><input id="sort-layers" type="checkbox">Sort by layers</label><label><input id="show-backlog" type="checkbox">Backlog</label>
<label>Depth <select id="depth"><option>1</option><option>2</option><option selected>3</option></select></label>
<label>Tag <select id="tag-filter"><option value="">All tags</option><option>ESG</option><option>MDM</option><option>Support</option></select></label>
<label><input id="maturity" type="checkbox">Maturity</label><label><input id="legend" type="checkbox" checked>Legend</label><label><input id="diagram-only" type="checkbox">Diagram only</label></div></fieldset>
<fieldset class="control-group"><legend>Systems &amp; coverage</legend><div class="control-row">
<label><input id="coverage" type="checkbox">Coverage polygons</label><label title="Rectangular uses the coverage bounding rectangle; Angled follows the convex hull">Polygon shape <select id="coverage-shape"><option value="angled">Angled</option><option value="rectangular">Rectangular</option></select></label><label><input id="round-coverage" type="checkbox">Round corners</label><label title="Enable Coverage polygons and select at least two systems to outline polygon intersections"><input id="functional-overlap" type="checkbox" disabled>Functional overlap</label><label>System <select id="system"></select></label><label><input id="system-labels" type="checkbox">System labels</label></div>
<details class="systems-list" open><summary>Coverage systems — <span id="coverage-count"></span></summary><div id="coverage-systems" class="coverage-choices"></div></details></fieldset>
<fieldset class="control-group export-group"><legend>Export</legend><div class="export-buttons"><button id="export-svg">Download SVG</button><button id="print">Print / PDF</button></div></fieldset>
</div><details class="diagram-notes"><summary>Diagram notes</summary><p class="note">Classic DSM Report adaptation. Explicit dated snapshots and planned scenarios; no interpolation or forecast. Date gaps show no data. A missing system mapping means not specified, never unsupported. Five management layers; ESG, MDM and Support are box tags. Tag filters keep direct matches and muted parent/domain context; tags and system mappings do not inherit. Unclassified stages stay Not specified. Hiding backlog removes its column and unplaced assignments. System labels are off by default. Boxes resize to fit visible labels; Coverage polygons are off by default. Select one or more systems above; colors overlap where explicit mappings share a capability. Direct and explicit technical mappings; area is not a percentage. SVG exports this exact view.</p><dl id="technical-details"></dl></details></header>
<div class="view-tools" role="group" aria-label="Map scale"><button id="zoom-out" type="button" aria-label="Zoom out">−</button><input id="zoom-range" type="range" min="1" max="300" step="1" value="100" aria-label="Map zoom"><output id="zoom-value" for="zoom-range">100%</output><button id="zoom-in" type="button" aria-label="Zoom in">+</button><button id="zoom-reset" type="button">100%</button><button id="fit-map" type="button" aria-pressed="false">Fit to screen</button><button id="show-controls" type="button" aria-controls="diagram-controls" aria-expanded="true">Hide controls</button></div><main id="map"></main><noscript>This interactive HTML needs local JavaScript. Use direct .svg output for a script-free artifact.</noscript><script id="model-data" type="application/json">{encoded}</script><script>{HTML_JS}</script></body></html>'''

def render_svg(data,as_of=None,show_maturity=False,state_id=None,system='',depth=3,labels=False,legend=True,sort_layers=False,show_backlog=True,tag_filter='',coverage=False,coverage_systems=None,view_date=None,functional_overlap=False,coverage_shape='angled',round_coverage=False):
    model=normalize(data,as_of);state=next((s for s in model['states'] if s['id']==state_id),None) if state_id else model['states'][0]
    if state is None:raise ValueError('Unknown state ID')
    requested=date(view_date) or (model['view_date'] if not state_id else None)
    if requested:state=state_on(model,requested,state_id)
    return prune_export(apply_view(build_svg(model,state,sort_layers,show_backlog,labels,show_maturity,tag_filter),state,system,depth,labels,show_maturity,legend,coverage,coverage_systems,functional_overlap,coverage_shape,round_coverage))

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('input');p.add_argument('output');p.add_argument('--as-of');p.add_argument('--date',dest='view_date',help='Select the explicit state period and evaluate lifetimes/maturity on YYYY-MM-DD');p.add_argument('--maturity',action='store_true');p.add_argument('--state');p.add_argument('--system',default='');p.add_argument('--depth',type=int,choices=(1,2,3),default=3);labels_group=p.add_mutually_exclusive_group();labels_group.add_argument('--system-labels',dest='system_labels',action='store_true');labels_group.add_argument('--no-system-labels',dest='system_labels',action='store_false');p.set_defaults(system_labels=False);p.add_argument('--no-legend',action='store_true');p.add_argument('--coverage',action='store_true',help='Show coverage polygons; defaults to legacy pilot, or all systems without one (SVG output)');p.add_argument('--coverage-system',action='append',dest='coverage_systems',help='Select a coverage system ID; repeat for multiple systems; requires --coverage (SVG output)');p.add_argument('--coverage-shape',choices=('angled','rectangular'),default='angled',help='Coverage outline form (SVG output)');p.add_argument('--round-coverage',action='store_true',help='Round coverage polygon corners (SVG output)');p.add_argument('--functional-overlap',action='store_true',help='Outline intersections of 2+ selected system coverage polygons in red (SVG output)');p.add_argument('--tag',default='',choices=('',*TAGS),help='Keep direct tag matches and parent/domain context (SVG output)');p.add_argument('--sort-layers',action='store_true',help='Group explicit management stages into horizontal bands (SVG output)');p.add_argument('--no-backlog',action='store_true',help='Omit backlog column and unplaced assignments (SVG output)');a=p.parse_args()
    if a.functional_overlap and not a.coverage:p.error('--functional-overlap requires --coverage')
    if a.coverage_systems and not a.coverage:p.error('--coverage-system requires --coverage')
    try:
        data=json.loads(pathlib.Path(a.input).read_text(encoding='utf-8'));as_of=date(a.as_of)
        content=render_svg(data,as_of,a.maturity,a.state,a.system,a.depth,a.system_labels,not a.no_legend,a.sort_layers,not a.no_backlog,a.tag,a.coverage,a.coverage_systems,a.view_date,a.functional_overlap,a.coverage_shape,a.round_coverage) if pathlib.Path(a.output).suffix.lower()=='.svg' else render(data,as_of,a.view_date)
        pathlib.Path(a.output).write_text(content,encoding='utf-8')
    except (ValueError,KeyError,TypeError,OSError) as e:p.exit(2,f'Invalid model: {e}\n')
if __name__=='__main__':main()
