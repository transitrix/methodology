#!/usr/bin/env python3
"""Standard-library regression checks for horizontal bands and view invariants."""
import copy
import json
import itertools
import subprocess
import sys
import tempfile
from pathlib import Path
import re
import unittest
import xml.etree.ElementTree as ET
import render

NS = {'s': render.SVGNS}
EXAMPLE = json.loads((Path(__file__).resolve().parents[1] / 'assets/synthetic-regression.json').read_text())

def groups(svg):
    return {g.get('data-id'): g for g in ET.fromstring(svg).findall('.//s:g[@data-id]', NS)}

def rect(g):
    return g.find('s:rect', NS).attrib

def geometry(svg):
    return {key: {k: v for k, v in rect(g).items() if k in ('x', 'y', 'width', 'height')} for key, g in groups(svg).items()}

class HorizontalBands(unittest.TestCase):
    def test_bands_and_nested_lanes(self):
        for state in ('current', 'target'):
            svg = render.render_svg(EXAMPLE, state_id=state)
            gs = groups(svg)
            for key in ('risk', 'data'):
                box = rect(gs[key])
                self.assertGreater(float(box['width']), float(box['height']))
                self.assertGreater(float(box['y']), float(rect(gs['sales'])['y']) + float(rect(gs['sales'])['height']))
                self.assertIsNotNone(gs[key].find("s:text[@class='horizontal-title']", NS))
                self.assertFalse(any('rotate' in e.get('transform', '') for e in gs[key].iter()))
            self.assertIsNotNone(gs['customer-risk'].find("s:g[@data-id='checks']", NS))
            self.assertIsNotNone(gs['acquire'].find("s:g[@data-id='lead']", NS))
            # Each H-L2 remains centred under its V-L1 lane.
            for child, domain in [('customer-risk', 'sales'), ('delivery-risk', 'deliver'), ('unknown-risk', 'backlog')]:
                c, d = rect(gs[child]), rect(gs[domain])
                self.assertAlmostEqual(float(c['x']) + float(c['width'])/2, float(d['x']) + float(d['width'])/2)

    def test_single_domain_and_long_title(self):
        data = copy.deepcopy(EXAMPLE)
        state = data['states'][0]
        state['capabilities'] = [r for r in state['capabilities'] if r['id'] in ('sales', 'acquire', 'lead', 'risk', 'customer-risk', 'checks')]
        state['applications'] = []
        data['states'] = [state]
        next(r for r in state['capabilities'] if r['id']=='risk')['name'] = 'Risk <&> governance and cross-functional coordination ' * 5
        gs = groups(render.render_svg(data))
        self.assertGreaterEqual(float(rect(gs['sales'])['width']), 500)
        self.assertGreater(float(rect(gs['risk'])['width']), float(rect(gs['risk'])['height']))
        title = gs['risk'].find("s:text[@class='horizontal-title']", NS)
        self.assertGreater(len(title), 1)
        last_baseline = float(title.get('y')) + 15*(len(title)-1)
        # The long title wraps in the left gutter beside the intersection.
        label_right=max(float(t.get('x'))+len(t.text or '')*12*.62 for t in title)
        self.assertLess(label_right,float(rect(gs['sales'])['x']))
        self.assertLess(float(rect(gs['customer-risk'])['y']),last_baseline)
        self.assertLess(last_baseline,float(rect(gs['risk'])['y'])+float(rect(gs['risk'])['height']))

    def test_horizontal_labels_leave_domain_lanes_free(self):
        for layers in (False,True):
            gs=groups(render.render_svg(EXAMPLE,sort_layers=layers,show_backlog=False))
            first_column=float(rect(gs['sales'])['x'])
            for ident in ('risk','data'):
                for label in gs[ident].findall('s:text',NS):
                    if label.get('class')=='unassigned-label':continue
                    self.assertEqual(label.get('text-anchor'),'start')
                    size=float(label.get('font-size'))
                    for line in label:
                        self.assertLess(float(line.get('x'))+len(line.text or '')*size*.62,first_column)
            for ident in ('customer-risk','checks','delivery-risk','quality'):
                for label in gs[ident].findall('s:text',NS):
                    self.assertEqual(label.get('text-anchor'),'start')

    def test_views_preserve_geometry_and_exact_export(self):
        for state in ('current', 'target'):
            base = geometry(render.render_svg(EXAMPLE, state_id=state, labels=False, show_maturity=True))
            for depth in (1, 2, 3):
                svg = render.render_svg(EXAMPLE, state_id=state, system='app-crm', depth=depth, labels=False, legend=False, show_maturity=True)
                gs = groups(svg)
                self.assertEqual(geometry(svg), {k: base[k] for k in gs})
                self.assertTrue(all(int(g.get('data-depth')) <= depth for g in gs.values()))
                self.assertNotIn('data-applications=', svg)
                root = ET.fromstring(svg)
                self.assertFalse(root.findall(".//s:text[@class='system-label']", NS))
                self.assertFalse(root.findall(".//s:g[@class='legend']", NS))
                self.assertEqual(gs['risk'].get('data-support'), 'not-specified')
                if depth >= 2:
                    self.assertEqual(gs['customer-risk'].get('data-support'), 'supported' if state=='target' else 'not-specified')
                md = json.loads(root.find('s:metadata', NS).text)
                self.assertEqual(md['state_id'], state)
                self.assertEqual(md['horizon_label'], 'end of 2027' if state=='target' else '')

    def test_html_uses_same_svg_builder(self):
        html = render.render(EXAMPLE)
        payload = json.loads(re.search(r'<script id="model-data" type="application/json">(.*?)</script>', html).group(1))
        model = render.normalize(EXAMPLE, None)
        for embedded, state in zip(payload['states'], model['states']):
            for layers,backlog,labels,maturity in itertools.product((False,True),repeat=4):
                key=':'.join(str(int(x)) for x in (layers,backlog,labels,maturity))+':'
                self.assertEqual(embedded['layouts'][key],render.build_svg(model,state,layers,backlog,labels,maturity))

class CompactLabels(unittest.TestCase):
    def test_defaults_and_empty_lines(self):
        svg=render.render_svg(EXAMPLE)
        root=ET.fromstring(svg)
        self.assertFalse(root.findall(".//s:text[@class='system-label']",NS))
        self.assertFalse(root.findall(".//s:text[@class='maturity-label']",NS))
        self.assertFalse(json.loads(root.find('s:metadata',NS).text)['view']['system_labels'])
        html=render.render(EXAMPLE)
        checkbox=re.search(r'<input id="system-labels"[^>]*>',html).group()
        self.assertNotIn('checked',checkbox)
        shown=ET.fromstring(render.render_svg(EXAMPLE,labels=True,show_maturity=True))
        for text in shown.findall('.//s:text',NS):
            self.assertTrue(''.join(text.itertext()).strip())
        visible=' '.join(''.join(t.itertext()) for t in shown.findall('.//s:text',NS))
        self.assertNotIn('Systems: not specified',visible)
        self.assertNotIn('Not assessed',visible)

    def test_show_systems_grows_boxes_and_restore_compacts(self):
        for layers in (False,True):
            hidden=render.render_svg(EXAMPLE,sort_layers=layers)
            shown=render.render_svg(EXAMPLE,sort_layers=layers,labels=True)
            off,on=groups(hidden),groups(shown)
            for ident in ('acquire','quality'):
                a,b=rect(off[ident]),rect(on[ident])
                self.assertGreater(float(b['width'])*float(b['height']),float(a['width'])*float(a['height']))
                self.assertIsNone(off[ident].find("s:text[@class='system-label']",NS))
                self.assertIsNotNone(on[ident].find("s:text[@class='system-label']",NS))
            self.assertIsNone(on['unknown-risk'].find("s:text[@class='system-label']",NS))
            self.assertEqual(hidden,render.render_svg(EXAMPLE,sort_layers=layers,labels=False))
            # Maturity is another optional line stack; hiding it leaves no slot.
            mature=groups(render.render_svg(EXAMPLE,sort_layers=layers,show_maturity=True))
            self.assertGreater(float(rect(mature['quality'])['height']),float(rect(off['quality'])['height']))

    def test_cli_system_labels_opt_in(self):
        script=Path(render.__file__)
        source=script.parents[1]/'assets/synthetic-regression.json'
        with tempfile.TemporaryDirectory() as tmp:
            for enabled in (False,True):
                output=Path(tmp)/('shown.svg' if enabled else 'hidden.svg')
                args=[sys.executable,str(script),str(source),str(output)]
                if enabled:args.append('--system-labels')
                subprocess.run(args,check=True,capture_output=True)
                root=ET.fromstring(output.read_text())
                self.assertEqual(bool(root.findall(".//s:text[@class='system-label']",NS)),enabled)

class BacklogVisibility(unittest.TestCase):
    def test_hide_restore_both_layouts_and_snapshots(self):
        before=copy.deepcopy(EXAMPLE)
        for state,layers,depth in itertools.product(('current','target'),(False,True),(1,2,3)):
            full=render.render_svg(EXAMPLE,state_id=state,sort_layers=layers,depth=depth)
            hidden=render.render_svg(EXAMPLE,state_id=state,sort_layers=layers,depth=depth,
                                     show_backlog=False,system='app-crm',labels=False)
            gs=groups(hidden);root=ET.fromstring(hidden)
            excluded={'backlog','idea','unknown-risk'}
            self.assertEqual(set(gs),set(groups(full))-excluded)
            self.assertLess(float(root.get('width')),float(ET.fromstring(full).get('width')))
            md=json.loads(root.find('s:metadata',NS).text)
            self.assertFalse(md['show_backlog']);self.assertFalse(md['view']['show_backlog'])
            self.assertEqual(md['view']['sort_layers'],layers)
            self.assertEqual(md['view']['system_id'],'app-crm')
            if depth>=2:
                c,d=rect(gs['customer-risk']),rect(gs['sales'])
                self.assertAlmostEqual(float(c['x'])+float(c['width'])/2,float(d['x'])+float(d['width'])/2)
            self.assertEqual(full,render.render_svg(EXAMPLE,state_id=state,sort_layers=layers,depth=depth))
        self.assertEqual(EXAMPLE,before)

    def test_only_backlog_and_no_backlog(self):
        for layers in (False,True):
            data=copy.deepcopy(EXAMPLE);data['states']=data['states'][:1]
            state=data['states'][0];state['applications']=[]
            state['capabilities']=[r for r in state['capabilities'] if r['id'] in ('backlog','idea')]
            hidden=render.render_svg(data,sort_layers=layers,show_backlog=False)
            self.assertEqual(groups(hidden),{})
            self.assertNotIn('Unplaced / backlog',hidden)
            # A placed capability called Backlog must not be hidden by name.
            state['capabilities']=[dict(id='placed',name='Backlog',layout='vertical',first_level=1,
                                        second_level=0,third_level=0,lane=0,property='Support')]
            self.assertEqual(set(groups(render.render_svg(data,sort_layers=layers,show_backlog=False))),{'placed'})

class OrientationGeometry(unittest.TestCase):
    def check_orientation(self,data):
        for state,layers,backlog,depth in itertools.product(data['states'],(False,True),(False,True),(1,2,3)):
            svg=render.render_svg(data,state_id=state['id'],sort_layers=layers,show_backlog=backlog,depth=depth)
            byid={r['id']:r for r in state['capabilities']}
            for ident,g in groups(svg).items():
                record=byid[ident];box=rect(g);w,h=float(box['width']),float(box['height'])
                self.assertEqual(g.get('data-orientation'),record['layout'])
                if record['layout']=='vertical':
                    if not record['second_level']:self.assertGreaterEqual(h+.1,1.25*w)
                else:self.assertGreaterEqual(w+.1,1.6*h)
                address=next(g.iter('{'+render.SVGNS+'}tspan')).text
                self.assertTrue(address.startswith('v.' if record['layout']=='vertical' else 'h.'))

    def test_v_columns_h_rectangles_at_all_depths(self):
        self.check_orientation(EXAMPLE)

    def test_descendant_widths_follow_parent_and_names_wrap_at_words(self):
        data=json.loads((Path(__file__).resolve().parents[1]/'assets/example.json').read_text())
        for state,layers,backlog,labels,maturity,tag in itertools.product(data['states'],(False,True),(False,True),(False,True),(False,True),('',*render.TAGS)):
            gs=groups(render.render_svg(data,state_id=state['id'],sort_layers=layers,show_backlog=backlog,labels=labels,show_maturity=maturity,tag_filter=tag))
            coords={(r['layout'],r['first_level'],r['second_level'],r['third_level']):r['id'] for r in state['capabilities']}
            for record in state['capabilities']:
                if record['layout']!='vertical' or not record['second_level'] or record['id'] not in gs:continue
                parent=coords[('vertical',record['first_level'],record['second_level'] if record['third_level'] else 0,0)]
                c,p=rect(gs[record['id']]),rect(gs[parent]);ratio=.9 if record['third_level'] else .8
                self.assertAlmostEqual(float(c['width']),float(p['width'])*ratio,delta=.11)
                self.assertAlmostEqual(float(c['x'])+float(c['width'])/2,float(p['x'])+float(p['width'])/2,delta=.11)
                # Ordinary example names must wrap between words, never as
                # fragments such as "Custome" / "r" or "reconcili" / "ation".
                name=gs[record['id']].findall('s:text',NS)[1]
                lines=[t.text or '' for t in name.findall('s:tspan',NS)]
                self.assertEqual(' '.join(lines),record['name'])

    def test_horizontal_content_expands_without_becoming_portrait(self):
        data=copy.deepcopy(EXAMPLE);data['states']=data['states'][:1]
        state=data['states'][0]
        next(r for r in state['capabilities'] if r['id']=='customer-risk')['name']='Long horizontal capability label with explicit domain assignment ' * 8
        source=next(r for r in state['capabilities'] if r['id']=='checks')
        for number in range(2,8):
            child=copy.deepcopy(source);child.update(id=f'check-{number}',third_level=number)
            state['capabilities'].append(child)
        unplaced=copy.deepcopy(source)
        unplaced.update(id='unplaced-check',name='Unplaced horizontal detail',second_level=3,third_level=1,lane=0)
        state['capabilities'].append(unplaced)
        before=copy.deepcopy(data)
        self.check_orientation(data)
        self.assertEqual(data,before)

class LayerSorting(unittest.TestCase):
    def setUp(self):
        self.data=copy.deepcopy(EXAMPLE)
        # Deliberately differ across hierarchy, orientation and snapshots.
        properties={'sales':'Execution','acquire':'Planning','lead':'Strategic',
                    'risk':'Support','customer-risk':'Learning','checks':'Execution',
                    'data':'MDM','quality':'Assurance','idea':'Future category'}
        for state in self.data['states']:
            for record in state['capabilities']:
                record.pop('property',None)
                if record['id'] in properties:record['property']=properties[record['id']]
        self.data['states'][1]['capabilities'][0]['property']='Strategic'

    def test_bands_explicit_values_and_lanes(self):
        svg=render.render_svg(self.data,sort_layers=True)
        root=ET.fromstring(svg);gs=groups(svg)
        self.assertEqual(set(gs),{str(r['id']) for r in self.data['states'][0]['capabilities']})
        headings=root.findall("s:text[@class='layer-heading']",NS)
        zones=root.findall("s:rect[@class='layer-zone']",NS)
        self.assertEqual({''.join(h.itertext()) for h in headings},set((*render.LAYERS,'Not specified','Unknown property')))
        # Stage order restarts within each horizontal L1 context.
        scopes={z.get('data-layer-scope') for z in zones}
        order=[*render.LAYERS,'Not specified','Unknown property']
        for scope in scopes:
            categories=[z.get('data-layer-zone') for z in zones if z.get('data-layer-scope')==scope]
            self.assertEqual(categories,sorted(categories,key=order.index))
        y=[float(h.get('y')) for h in headings]
        for r in self.data['states'][0]['capabilities']:
            g=gs[r['id']];category=render.layer(r)
            self.assertEqual(g.get('data-layer'),category)
            if r['layout']=='vertical' and r['second_level']==0:
                self.assertEqual(g.get('class'),'domain-column')
                self.assertLess(float(rect(g)['y']),min(y))
                self.assertEqual(rect(g)['fill'],'none')
                if render.layer_value(r):self.assertIn('Layer: '+render.layer_value(r),''.join(g.itertext()))
                else:self.assertFalse(g.findall("s:text[@class='property-label']",NS))
                continue
            if not r['second_level']:continue
            # A stage label must stay inside a zone of its own category and
            # domain context; a parent frame can span several cycle stages.
            label_y=float(g.find('s:text',NS).get('y'))
            scope='vertical-domains' if r['layout']=='vertical' else next(v['id'] for v in self.data['states'][0]['capabilities'] if v['layout']=='horizontal' and v['first_level']==r['first_level'] and not v['second_level'])
            self.assertTrue(any(z.get('data-layer-zone')==category and z.get('data-layer-scope')==scope and
                                float(z.get('y'))<label_y<float(z.get('y'))+float(z.get('height')) for z in zones))
        self.assertEqual(gs['deliver'].get('data-layer'),'Not specified')
        self.assertEqual(gs['lead'].get('data-layer'),'Strategic')
        self.assertEqual(gs['acquire'].get('data-layer'),'Planning')
        # Horizontal children retain their assigned V-domain columns.
        for child,domain in [('customer-risk','sales'),('delivery-risk','deliver'),('unknown-risk','backlog')]:
            c,d=rect(gs[child]),rect(gs[domain])
            self.assertAlmostEqual(float(c['x'])+float(c['width'])/2,float(d['x'])+float(d['width'])/2)
        self.assertGreater(float(rect(gs['risk'])['width']),float(rect(gs['sales'])['width']))
        self.assertIsNotNone(gs['acquire'].find("s:g[@data-id='lead']",NS))

    def test_l1_columns_contain_descendants_across_layers(self):
        for state,backlog in itertools.product(self.data['states'],(False,True)):
            svg=render.render_svg(self.data,state_id=state['id'],sort_layers=True,show_backlog=backlog)
            root=ET.fromstring(svg);gs=groups(svg)
            columns={r['first_level']:r['id'] for r in state['capabilities']
                     if r['layout']=='vertical' and r['second_level']==0 and (backlog or r['first_level']!=0)}
            self.assertEqual({g.get('data-id') for g in root.findall("s:g[@class='domain-column']",NS)},set(columns.values()))
            for r in state['capabilities']:
                if r['id'] not in gs or r['second_level']==0:continue
                lane=r['first_level'] if r['layout']=='vertical' else r['lane']
                c,d=rect(gs[r['id']]),rect(gs[columns[lane]])
                self.assertGreater(float(c['x']),float(d['x']))
                self.assertLess(float(c['x'])+float(c['width']),float(d['x'])+float(d['width']))
                self.assertGreater(float(c['y']),float(d['y']))
                self.assertLess(float(c['y'])+float(c['height']),float(d['y'])+float(d['height']))
            children=list(root)
            zones=root.findall("s:rect[@class='layer-zone']",NS)
            frames=root.findall("s:g[@class='domain-column']",NS)
            self.assertLess(max(children.index(z) for z in zones),min(children.index(g) for g in frames))
            for g in frames:
                self.assertEqual(len(root.findall(f".//s:g[@data-id='{g.get('data-id')}']",NS)),1)

    def test_all_views_and_round_trip(self):
        before=copy.deepcopy(self.data)
        for state in self.data['states']:
            bases={(labels,maturity):geometry(render.render_svg(self.data,state_id=state['id'],sort_layers=True,labels=labels,show_maturity=maturity)) for labels,maturity in itertools.product((False,True),repeat=2)}
            for system,depth,labels,maturity,legend in itertools.product(
                    ['']+[a['id'] for a in state['applications']],(1,2,3),(False,True),(False,True),(False,True)):
                svg=render.render_svg(self.data,state_id=state['id'],sort_layers=True,system=system,
                                      depth=depth,labels=labels,show_maturity=maturity,legend=legend)
                gs=groups(svg);root=ET.fromstring(svg)
                self.assertEqual(geometry(svg),{k:bases[(labels,maturity)][k] for k in gs})
                self.assertEqual(set(gs),{r['id'] for r in state['capabilities'] if
                    (3 if r['third_level'] else 2 if r['second_level'] else 1)<=depth})
                md=json.loads(root.find('s:metadata',NS).text)
                self.assertTrue(md['view']['sort_layers']);self.assertEqual(md['layout_mode'],'layers')
                self.assertEqual(md['view']['system_id'],system or None)
                self.assertEqual(md['state_id'],state['id'])
                self.assertNotIn('data-applications=',svg)
                mapped={str(c) for app in state['applications'] for c in app.get('capabilities',[])}
                self.assertEqual(len(root.findall(".//s:text[@class='system-label']",NS)),len(set(gs)&mapped) if labels else 0)
                self.assertEqual(bool(root.findall(".//s:g[@class='legend']",NS)),legend)
                if depth>=2:
                    expected='supported' if system=='app-crm' and state['id']=='target' else 'not-specified'
                    self.assertEqual(gs['customer-risk'].get('data-support'),expected)
        self.assertEqual(self.data,before)
        classic=render.render_svg(self.data)
        self.assertIsNotNone(groups(classic)['acquire'].find("s:g[@data-id='lead']",NS))
        self.assertFalse(json.loads(ET.fromstring(classic).find('s:metadata',NS).text)['view']['sort_layers'])

    def test_source_parent_containment_in_all_views(self):
        acme=json.loads((Path(__file__).resolve().parents[1]/'assets/example.json').read_text())
        for data in (self.data,acme):
            for state,layers,backlog,labels,maturity,depth in itertools.product(
                    data['states'],(False,True),(False,True),(False,True),(False,True),(1,2,3)):
                svg=render.render_svg(data,state_id=state['id'],sort_layers=layers,
                                      show_backlog=backlog,labels=labels,show_maturity=maturity,depth=depth)
                gs=groups(svg)
                self.assertEqual(len(ET.fromstring(svg).findall('.//s:g[@data-id]',NS)),len(gs))
                records={str(r['id']):r for r in state['capabilities']}
                coords={(r['layout'],r['first_level'],r['second_level'],r['third_level']):str(r['id']) for r in records.values()}
                for ident,g in gs.items():
                    r=records[ident]
                    if not r['second_level']:continue
                    parent=coords[(r['layout'],r['first_level'],r['second_level'] if r['third_level'] else 0,0)]
                    c,p=rect(g),rect(gs[parent])
                    for axis,extent in [('x','width'),('y','height')]:
                        self.assertGreater(float(c[axis]),float(p[axis]),(ident,parent,layers,axis))
                        self.assertLess(float(c[axis])+float(c[extent]),float(p[axis])+float(p[extent]),(ident,parent,layers,axis))
                    # H branches and V-L3 must also retain DOM containment, so
                    # depth filters and exports cannot detach children.
                    if r['layout']=='horizontal' or r['third_level']:
                        self.assertIsNotNone(gs[parent].find(f"s:g[@data-id='{ident}']",NS))

    def test_property_validation_and_missing(self):
        for value in (42,True,[],{}):
            data=copy.deepcopy(self.data);data['states'][0]['capabilities'][0]['property']=value
            with self.assertRaisesRegex(ValueError,'property must be text'):
                render.render_svg(data,sort_layers=True)
        for value in (None,''):
            data=copy.deepcopy(self.data);data['states'][0]['capabilities'][0]['property']=value
            self.assertEqual(groups(render.render_svg(data,sort_layers=True))['sales'].get('data-layer'),'Not specified')

class CycleLayersAndTags(unittest.TestCase):
    def setUp(self):
        self.data=copy.deepcopy(EXAMPLE)
        for state in self.data['states']:
            for r in state['capabilities']:
                r.pop('property',None);r['layer']=None;r['tags']=[]
            for ident,stage,labels in [('acquire','Planning',[]),('lead','Assurance',['MDM','Support']),
                                      ('customer-risk','Execution',['ESG']),('checks','Assurance',['MDM'])]:
                next(r for r in state['capabilities'] if r['id']==ident).update(layer=stage,tags=labels)

    def test_legacy_mapping_and_explicit_precedence_without_mutation(self):
        data=copy.deepcopy(self.data);rows=data['states'][0]['capabilities']
        root=next(r for r in rows if r['id']=='sales');root.pop('layer');root['property']='MDM'
        child=next(r for r in rows if r['id']=='acquire');child.update(property='Execution',layer='Planning')
        before=copy.deepcopy(data);svg=render.render_svg(data,sort_layers=True);gs=groups(svg)
        self.assertEqual(gs['sales'].get('data-layer'),'Not specified')
        self.assertEqual(json.loads(gs['sales'].get('data-tags')),['MDM'])
        self.assertEqual(gs['acquire'].get('data-layer'),'Planning')
        self.assertEqual(json.loads(gs['acquire'].get('data-tags')),[])
        self.assertEqual(data,before)
        self.assertFalse(ET.fromstring(svg).findall("s:rect[@data-layer-zone='MDM']",NS))
        self.assertIn('MDM',''.join(gs['sales'].find("s:text[@class='tag-label']",NS).itertext()))

    def test_filter_keeps_only_matches_ancestors_and_lane_context(self):
        for state,layers,backlog,depth,tag in itertools.product(self.data['states'],(False,True),(False,True),(1,2,3),render.TAGS):
            svg=render.render_svg(self.data,state_id=state['id'],sort_layers=layers,show_backlog=backlog,depth=depth,tag_filter=tag)
            gs=groups(svg);expected={'MDM':{'lead','acquire','sales','checks','customer-risk','risk'},
                                    'Support':{'lead','acquire','sales'},'ESG':{'customer-risk','sales','risk'}}[tag]
            records={r['id']:r for r in state['capabilities']}
            expected={i for i in expected if (3 if records[i]['third_level'] else 2 if records[i]['second_level'] else 1)<=depth}
            self.assertEqual(set(gs),expected)
            for ident,g in gs.items():
                self.assertEqual(g.get('data-tag-match'),'match' if tag in records[ident]['tags'] else 'context')
            md=json.loads(ET.fromstring(svg).find('s:metadata',NS).text)
            self.assertEqual(md['view']['tag_filter'],tag)
            self.assertEqual(md['layer_vocabulary'],list(render.LAYERS))
            self.assertNotIn('data-applications=',svg)
        # Tagging a root never makes its untagged descendants match.
        next(r for r in self.data['states'][0]['capabilities'] if r['id']=='sales')['tags']=['Support']
        self.assertEqual(set(groups(render.render_svg(self.data,tag_filter='Support'))),{'lead','acquire','sales'})

    def test_validation_positive_and_negative_and_empty_results(self):
        for field,value,error in [('layer','MDM','layer'),('layer',42,'layer'),('tags','MDM','tags'),
                                  ('tags',['other'],'tags'),('tags',[None],'tags'),('tags',['ESG','ESG'],'Duplicate')]:
            data=copy.deepcopy(self.data);data['states'][0]['capabilities'][0][field]=value
            with self.assertRaisesRegex(ValueError,error):render.render_svg(data)
        for stage in render.LAYERS:
            data=copy.deepcopy(self.data);data['states'][0]['capabilities'][0]['layer']=stage
            self.assertEqual(groups(render.render_svg(data))['sales'].get('data-layer'),stage)
        for state in self.data['states']:
            for r in state['capabilities']:r['tags']=[]
        svg=render.render_svg(self.data,sort_layers=True,tag_filter='MDM')
        self.assertFalse(groups(svg));self.assertIn('No capabilities match tag MDM.',svg)
        with self.assertRaisesRegex(ValueError,'Unknown tag filter'):render.render_svg(self.data,tag_filter='other')

    def test_acme_stages_tags_and_context_across_views(self):
        data=json.loads((Path(__file__).resolve().parents[1]/'assets/example.json').read_text())
        self.assertEqual({r['layer'] for r in data['states'][0]['capabilities'] if r.get('layer')},set(render.LAYERS))
        for state,layers,backlog,depth,tag,labels,maturity in itertools.product(data['states'],(False,True),(False,True),(1,2,3),('',*render.TAGS),(False,True),(False,True)):
            svg=render.render_svg(data,state_id=state['id'],sort_layers=layers,show_backlog=backlog,depth=depth,tag_filter=tag,labels=labels,show_maturity=maturity,legend=False)
            root=ET.fromstring(svg);gs=groups(svg)
            self.assertEqual(len(root.findall('.//s:g[@data-id]',NS)),len(gs))
            candidates=[r for r in state['capabilities'] if backlog or not
                        (r['layout']=='vertical' and not r['first_level'] or r['layout']=='horizontal' and r['second_level'] and not r['lane'])]
            coords={(r['layout'],r['first_level'],r['second_level'],r['third_level']):r for r in candidates}
            matches={r['id'] for r in candidates if not tag or tag in r.get('tags',[])}
            expected=set(matches)
            for r in candidates:
                if r['id'] not in matches:continue
                if r['second_level']:expected.add(coords[(r['layout'],r['first_level'],0,0)]['id'])
                if r['third_level']:expected.add(coords[(r['layout'],r['first_level'],r['second_level'],0)]['id'])
                if r['layout']=='horizontal' and r['second_level'] and r['lane']:
                    expected.add(coords[('vertical',r['lane'],0,0)]['id'])
            expected={r['id'] for r in candidates if r['id'] in expected and (3 if r['third_level'] else 2 if r['second_level'] else 1)<=depth}
            self.assertEqual(set(gs),expected)
            for r in candidates:
                if r['id'] not in gs:continue
                g=gs[r['id']]
                self.assertEqual(json.loads(g.get('data-tags')),r.get('tags',[]))
                self.assertEqual(bool(g.find("s:text[@class='tag-label']",NS) is not None),bool(r.get('tags')))
                self.assertEqual(g.get('data-tag-match'),'match' if r['id'] in matches else 'context')
                if not r['second_level']:continue
                parent=coords[(r['layout'],r['first_level'],r['second_level'] if r['third_level'] else 0,0)]
                c,p=rect(g),rect(gs[parent['id']])
                for axis,extent in [('x','width'),('y','height')]:
                    self.assertGreater(float(c[axis]),float(p[axis]))
                    self.assertLess(float(c[axis])+float(c[extent]),float(p[axis])+float(p[extent]))
            self.assertFalse({z.get('data-layer-zone') for z in root.findall("s:rect[@class='layer-zone']",NS)}&set(render.TAGS))
            hroots=[rect(gs[r['id']]) for r in candidates if r['layout']=='horizontal' and not r['second_level'] and r['id'] in gs]
            for first,second in zip(hroots,hroots[1:]):
                self.assertLess(float(first['y'])+float(first['height']),float(second['y']))
            self.assertNotIn('data-applications=',svg)

    def test_all_html_tag_variants_equal_direct_builder_and_cli(self):
        model=render.normalize(self.data,None);doc=render.render(self.data)
        payload=json.loads(re.search(r'<script id="model-data" type="application/json">(.*?)</script>',doc).group(1))
        for embedded,state in zip(payload['states'],model['states']):
            self.assertEqual(len(embedded['layouts']),64)
            for layers,backlog,labels,maturity,tag in itertools.product((False,True),(False,True),(False,True),(False,True),('',*render.TAGS)):
                key=':'.join(str(int(x)) for x in (layers,backlog,labels,maturity))+':'+tag
                self.assertEqual(embedded['layouts'][key],render.build_svg(model,state,layers,backlog,labels,maturity,tag))
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory)/'model.json';target=Path(directory)/'map.svg';source.write_text(json.dumps(self.data))
            result=subprocess.run([sys.executable,str(Path(render.__file__)),str(source),str(target),'--sort-layers','--tag','MDM'],capture_output=True,text=True)
            self.assertEqual(result.returncode,0,result.stderr)
            self.assertEqual(target.read_text(),render.render_svg(self.data,sort_layers=True,tag_filter='MDM'))

class SystemCoverage(unittest.TestCase):
    def setUp(self):
        self.data=copy.deepcopy(EXAMPLE)
        self.data['coverage_system_id']='app-crm'
        for state in self.data['states']:
            app=next(a for a in state['applications'] if a['id']=='app-crm')
            app['capabilities']=['acquire']
            app['technical_capabilities']=[{'id':'tech-leads','name':'Lead intake','capabilities':['lead']}]

    def test_explicit_direct_and_technical_geometry_and_cutouts(self):
        before=copy.deepcopy(self.data)
        for layers,depth in itertools.product((False,True),(1,2,3)):
            plain=render.render_svg(self.data,sort_layers=layers,depth=depth)
            covered=render.render_svg(self.data,sort_layers=layers,depth=depth,coverage=True)
            self.assertEqual(geometry(plain),geometry(covered))
            root=ET.fromstring(covered);overlays=root.findall("s:g[@class='coverage-overlay']",NS)
            self.assertEqual(len(overlays),0 if depth==1 else 1)
            if not overlays:continue
            overlay=overlays[0]
            self.assertEqual(overlay.get('data-coverage-depth'),str(depth))
            ids=json.loads(overlay.get('data-covered-capabilities'))
            self.assertEqual(set(ids),{'acquire','lead'} if depth==3 else {'acquire'})
            sources=json.loads(overlay.get('data-coverage-sources'))
            self.assertEqual(sources['direct_application'],['acquire'])
            self.assertEqual(sources['technical_capabilities'],{'tech-leads':['lead']} if depth==3 else {})
            self.assertEqual(overlay.find("s:text[@class='coverage-system-name']",NS).text,'CRM')
            polygon=overlay.find("s:polygon[@class='coverage-polygon']",NS)
            points=[tuple(map(float,point.split(','))) for point in polygon.get('points').split()]
            self.assertGreaterEqual(len(points),4)
            self.assertLess(float(polygon.get('fill-opacity')),1)
            self.assertEqual(overlay.get('pointer-events'),'none')
            cutouts={r.get('data-excluded-capability') for r in overlay.findall('.//s:rect',NS)}
            self.assertTrue(set(groups(covered))-set(ids)<=cutouts)
            self.assertFalse(set(ids)&cutouts)
            self.assertNotIn('data-applications=',covered)
        self.assertEqual(self.data,before)
        # Root mapping does not make unrelated children covered.
        next(a for a in self.data['states'][0]['applications'] if a['id']=='app-crm')['capabilities']=['sales']
        svg=render.render_svg(self.data,coverage=True)
        overlay=ET.fromstring(svg).find("s:g[@class='coverage-overlay']",NS)
        ids=json.loads(overlay.get('data-covered-capabilities'))
        self.assertEqual(set(ids),{'sales','lead'})
        self.assertNotIn('acquire',ids)
        direct=groups(render.render_svg(self.data,coverage=True,system='app-crm'))
        self.assertEqual(direct['lead'].get('data-support'),'not-specified')
        self.assertEqual(direct['sales'].get('data-support'),'supported')

    def test_unlinked_box_inside_hull_is_cut_out(self):
        records=[dict(id='root',name='Domain',layout='vertical',first_level=1,second_level=0,third_level=0,lane=0)]
        for i in (1,2,3):records.append(dict(id=f'box-{i}',name=f'Ability {i}',layout='vertical',first_level=1,second_level=i,third_level=0,lane=0))
        data={'coverage_system_id':'system','capabilities':records,'applications':[{'id':'system','name':'System','capabilities':['box-1','box-3']}]}
        svg=render.render_svg(data,coverage=True);root=ET.fromstring(svg);gs=groups(svg)
        overlay=root.find("s:g[@class='coverage-overlay']",NS)
        polygon=overlay.find("s:polygon[@class='coverage-polygon']",NS)
        points=[tuple(map(float,p.split(','))) for p in polygon.get('points').split()]
        b=rect(gs['box-2']);x=float(b['x'])+float(b['width'])/2;y=float(b['y'])+float(b['height'])/2
        self.assertTrue(all((v[0]-u[0])*(y-u[1])-(v[1]-u[1])*(x-u[0])>=-.1 for u,v in zip(points,points[1:]+points[:1])))
        hole=overlay.find(".//s:rect[@data-excluded-capability='box-2']",NS)
        self.assertEqual(hole.get('fill'),'black')
        self.assertLess(float(hole.get('x')),x);self.assertGreater(float(hole.get('x'))+float(hole.get('width')),x)
        self.assertLess(float(hole.get('y')),y);self.assertGreater(float(hole.get('y'))+float(hole.get('height')),y)
        self.assertNotIn('box-2',json.loads(overlay.get('data-covered-capabilities')))

    def test_no_mapping_off_and_filtered_results(self):
        for state in self.data['states']:
            app=next(a for a in state['applications'] if a['id']=='app-crm')
            app['capabilities']=[];app['technical_capabilities']=[]
        root=ET.fromstring(render.render_svg(self.data,coverage=True))
        self.assertFalse(root.findall("s:g[@class='coverage-overlay']",NS))
        self.assertTrue(json.loads(root.find('s:metadata',NS).text)['view']['coverage'])
        self.assertFalse(ET.fromstring(render.render_svg(self.data)).findall("s:g[@class='coverage-overlay']",NS))
        data=copy.deepcopy(EXAMPLE)
        root=ET.fromstring(render.render_svg(data,coverage=True))
        self.assertEqual(json.loads(root.find('s:metadata',NS).text)['view']['coverage_system_ids'],sorted(str(a['id']) for a in data['states'][0]['applications']))

    def test_invalid_pilot_and_technical_mappings(self):
        data=copy.deepcopy(self.data);data['coverage_system_id']='missing'
        with self.assertRaisesRegex(ValueError,'coverage_system_id'):render.render_svg(data)
        for value in ({},[{}],[{'id':'x','name':'X','capabilities':['missing']}],
                      [{'id':'x','name':'X','capabilities':['lead','lead']}],
                      [{'id':'x','name':'X','capabilities':[]},{'id':'x','name':'X','capabilities':[]}]):
            data=copy.deepcopy(self.data)
            next(a for a in data['states'][0]['applications'] if a['id']=='app-crm')['technical_capabilities']=value
            with self.assertRaises(ValueError):render.render_svg(data)

    def test_acme_coverage_across_filters_and_states(self):
        data=json.loads((Path(__file__).resolve().parents[1]/'assets/example.json').read_text())
        for state,layers,depth,tag,backlog,labels in itertools.product(data['states'],(False,True),(1,2,3),('',*render.TAGS),(False,True),(False,True)):
            svg=render.render_svg(data,state_id=state['id'],sort_layers=layers,depth=depth,tag_filter=tag,show_backlog=backlog,labels=labels,coverage=True)
            gs=groups(svg);app=next(a for a in state['applications'] if a['id']==data['coverage_system_id'])
            expected=(set(app['capabilities'])|{i for t in app['technical_capabilities'] for i in t['capabilities']})&gs.keys()
            root=ET.fromstring(svg);overlays=root.findall("s:g[@class='coverage-overlay']",NS)
            self.assertEqual(len(overlays),int(bool(expected)))
            if expected:
                overlay=overlays[0]
                self.assertEqual(set(json.loads(overlay.get('data-covered-capabilities'))),expected)
                self.assertEqual(overlay.get('data-coverage-system'),data['coverage_system_id'])
                # An unlinked inventory-master-data card must be cut out in
                # Current, even if its geometry is near the hull boundary.
                excluded={r.get('data-excluded-capability') for r in overlay.findall('.//s:rect',NS)}
                self.assertEqual(set(gs)-expected,excluded)
            md=json.loads(root.find('s:metadata',NS).text)
            self.assertTrue(md['view']['coverage'])
            self.assertEqual(md['view']['coverage_system_id'],data['coverage_system_id'])


class MultiSystemCoverage(unittest.TestCase):
    def setUp(self):
        self.data=json.loads((Path(render.__file__).parent.parent/'assets/example.json').read_text())
        self.ids=['DEMO-APPLICATION-DATA','DEMO-APPLICATION-GOVERNANCE','DEMO-APPLICATION-WAREHOUSE']

    def test_selection_overlap_colors_masks_and_geometry(self):
        for state,layers in itertools.product(self.data['states'],(False,True)):
            model=render.normalize(self.data,None);st=next(s for s in model['states'] if s['id']==state['id'])
            base=render.build_svg(model,st,layers,tag_filter='MDM')
            plain=render.prune_export(render.apply_view(base,st))
            for depth,selected in itertools.product((1,2,3),([],self.ids[:1],self.ids[:2],self.ids)):
                svg=render.prune_export(render.apply_view(base,st,depth=depth,coverage=True,coverage_systems=selected))
                root=ET.fromstring(svg);overlays=root.findall("s:g[@class='coverage-overlay']",NS)
                gs=groups(svg);md=json.loads(root.find('s:metadata',NS).text)
                self.assertEqual(md['view']['coverage_system_ids'],sorted(selected))
                self.assertEqual(geometry(svg),{k:v for k,v in geometry(plain).items() if int(groups(plain)[k].get('data-depth'))<=depth})
                masks=[m.get('id') for m in root.findall('.//s:mask',NS)]
                self.assertEqual(len(masks),len(set(masks)))
                colors=[]
                for overlay in overlays:
                    aid=overlay.get('data-coverage-system');self.assertIn(aid,selected)
                    app=next(a for a in state['applications'] if str(a['id'])==aid)
                    expected=(set(app.get('capabilities',[]))|{i for t in app.get('technical_capabilities',[]) for i in t['capabilities']}) & gs.keys()
                    self.assertEqual(set(json.loads(overlay.get('data-covered-capabilities'))),expected)
                    poly=overlay.find("s:polygon[@class='coverage-polygon']",NS);color=poly.get('fill');colors.append(color)
                    self.assertEqual(color,md['coverage_colors'][aid])
                    self.assertIn(poly.get('mask')[5:-1],masks)
                self.assertEqual(len(colors),len(set(colors)))
                if depth==3 and len(selected)==3 and state['kind']!='historical':
                    self.assertEqual(len(overlays),3)
                    shared=set.intersection(*(set(json.loads(g.get('data-covered-capabilities'))) for g in overlays))
                    self.assertIn('DEMO-CAPABILITY-H3.2.1',shared)
                    self.assertIn('DEMO-CAPABILITY-H3.1',shared)

    def test_invalid_and_empty_selections_and_master_switch(self):
        for selected in ('bad',['missing'],[self.ids[0],self.ids[0]],[1]):
            with self.assertRaises(ValueError):render.render_svg(self.data,coverage=True,coverage_systems=selected)
        for on,selected in ((True,[]),(False,self.ids)):
            root=ET.fromstring(render.render_svg(self.data,coverage=on,coverage_systems=selected))
            self.assertFalse(root.findall("s:g[@class='coverage-overlay']",NS))
        root=ET.fromstring(render.render_svg(self.data,coverage=True,coverage_systems=['DEMO-APPLICATION-ESG']))
        self.assertFalse(root.findall("s:g[@class='coverage-overlay']",NS))
        colors=render.coverage_colors(render.normalize(self.data,None))
        self.assertEqual(len(colors),len(set(colors.values())))

    def test_cli_repeated_system_selection(self):
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory)/'model.json';target=Path(directory)/'map.svg';source.write_text(json.dumps(self.data))
            command=[sys.executable,str(Path(render.__file__)),str(source),str(target)]
            failed=subprocess.run(command+['--coverage-system',self.ids[0]],capture_output=True,text=True)
            self.assertNotEqual(failed.returncode,0)
            good=subprocess.run(command+['--coverage','--coverage-system',self.ids[0],'--coverage-system',self.ids[1]],capture_output=True,text=True)
            self.assertEqual(good.returncode,0,good.stderr)
            root=ET.fromstring(target.read_text())
            self.assertEqual({g.get('data-coverage-system') for g in root.findall("s:g[@class='coverage-overlay']",NS)},set(self.ids[:2]))


class DateTimeline(unittest.TestCase):
    def setUp(self):
        self.data={'states':[{'id':'year','label':'Recorded year','kind':'current','as_of':'2026-06-15',
          'effective_from':'2026-01-01','effective_to':'2027-01-01',
          'capabilities':[
            {'id':'root','name':'Domain','layout':'vertical','first_level':1,'second_level':0,'third_level':0,'lane':0,'maturity':[{'change_date':'2026-01-01','level':1},{'change_date':'2026-03-01','level':2}]},
            {'id':'child','name':'Business ability','layout':'vertical','first_level':1,'second_level':1,'third_level':0,'lane':0,'start_date':'2026-04-01','end_date':'2026-06-30'},
            {'id':'leaf','name':'Nested ability','layout':'vertical','first_level':1,'second_level':1,'third_level':1,'lane':0,'start_date':'2026-05-01','end_date':'2026-06-30'}],
          'applications':[{'id':'app','name':'System','start_date':'2026-03-01','end_date':'2026-10-31','capabilities':['child'],
            'technical_capabilities':[{'id':'tech','name':'Technical ability','start_date':'2026-05-01','end_date':'2026-05-31','capabilities':['leaf']}]}]}]}

    def test_date_boundaries_lifetimes_maturity_and_coverage(self):
        for when,expected,covered,level in [
          ('2026-01-01',{'root'},set(),'Initial'),('2026-03-31',{'root'},set(),'Managed'),
          ('2026-04-01',{'root','child'},{'child'},'Managed'),
          ('2026-05-15',{'root','child','leaf'},{'child','leaf'},'Managed'),
          ('2026-06-01',{'root','child','leaf'},{'child'},'Managed'),
          ('2026-06-30',{'root','child','leaf'},{'child'},'Managed'),
          ('2026-07-01',{'root'},set(),'Managed'),('2026-12-31',{'root'},set(),'Managed')]:
            for layers in (False,True):
                svg=render.render_svg(self.data,view_date=when,coverage=True,show_maturity=True,sort_layers=layers)
                self.assertEqual(set(groups(svg)),expected)
                root=ET.fromstring(svg);md=json.loads(root.find('s:metadata',NS).text)
                self.assertEqual(md['view_date'],when);self.assertEqual(md['as_of'],when)
                self.assertEqual(md['view']['view_date'],when)
                self.assertEqual(md['snapshot_as_of'],'2026-06-15')
                overlays=root.findall("s:g[@class='coverage-overlay']",NS)
                self.assertEqual(set().union(*(set(json.loads(g.get('data-covered-capabilities'))) for g in overlays)),covered)
                self.assertIn(level,' '.join(root.itertext()))
        for when in ('2025-12-31','2027-01-01','2029-01-01','invalid'):
            with self.assertRaises(ValueError):render.render_svg(self.data,view_date=when)

    def test_period_validation_and_gaps(self):
        for edits in ({'effective_to':'2026-01-01'},{'effective_from':None},{'effective_from':'bad'}):
            data=copy.deepcopy(self.data);data['states'][0].update(edits)
            with self.assertRaises(ValueError):render.normalize(data)
        data=copy.deepcopy(self.data);second=copy.deepcopy(data['states'][0]);second.update(id='next',kind='target',effective_from='2026-12-31',effective_to='2028-01-01');data['states'].append(second)
        with self.assertRaisesRegex(ValueError,'overlap'):render.normalize(data)
        second['effective_from']='2027-02-01'
        with self.assertRaisesRegex(ValueError,'No state data'):render.render_svg(data,view_date='2027-01-15')
        svg=render.render_svg(data,view_date='2027-02-01');root=ET.fromstring(svg)
        self.assertEqual(json.loads(root.find('s:metadata',NS).text)['state_kind'],'target')
        self.assertIn('Planned scenario',' '.join(root.itertext()))
        with self.assertRaisesRegex(ValueError,'does not apply'):render.render_svg(data,view_date='2027-02-01',state_id='year')
        for path in ('app','tech'):
            bad=copy.deepcopy(self.data);item=bad['states'][0]['applications'][0]
            if path=='tech':item=item['technical_capabilities'][0]
            item.update(start_date='2027-01-01',end_date='2026-01-01')
            with self.assertRaisesRegex(ValueError,'reversed lifetime'):render.normalize(bad)
        bad=copy.deepcopy(self.data);bad['states'][0]['capabilities'][0]['end_date']='2026-04-30'
        with self.assertRaisesRegex(ValueError,'inactive parent'):render.timeline_frames(render.normalize(bad))

    def test_frames_match_arbitrary_dates_without_daily_interpolation(self):
        model=render.normalize(self.data);frames=render.timeline_frames(model)
        self.assertEqual([s['frame_from'].isoformat() for s in frames],['2026-01-01','2026-03-01','2026-04-01','2026-05-01','2026-06-01','2026-07-01','2026-11-01'])
        for frame in frames:
            last=(frame['frame_to'] or render.date('2027-01-01'))-render.dt.timedelta(days=1)
            actual=render.state_on(model,last)
            self.assertEqual([r['id'] for r in frame['records']],[r['id'] for r in actual['records']])
            self.assertEqual(frame['applications'],actual['applications'])
            self.assertEqual([render.maturity(r,frame['as_of']) for r in frame['records']],[render.maturity(r,last) for r in actual['records']])
        # Legacy snapshots still work but cannot silently stand in for a dated timeline.
        with self.assertRaisesRegex(ValueError,'No state data'):render.render_svg(EXAMPLE,view_date='2026-10-23')

    def test_acme_history_current_future_and_exact_date_exports(self):
        data=json.loads((Path(render.__file__).parent.parent/'assets/example.json').read_text());model=render.normalize(data)
        for when,expected in [('2026-06-15','historical'),('2026-10-01','current'),('2026-10-23','current'),('2027-06-15','target')]:
            st=render.state_on(model,when);self.assertEqual(st['id'],expected)
            for layers in (False,True):
                svg=render.render_svg(data,view_date=when,sort_layers=layers,coverage=True,coverage_systems=['DEMO-APPLICATION-DATA'],tag_filter='MDM')
                self.assertIn(when,' '.join(ET.fromstring(svg).itertext()))
                self.assertEqual('DEMO-CAPABILITY-H3.2.1' in groups(svg),when>='2026-10-22')
        for when in ('2026-05-31','2028-01-01'):
            with self.assertRaisesRegex(ValueError,'No state data'):render.render_svg(data,view_date=when)
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory)/'model.json';target=Path(directory)/'map.svg';source.write_text(json.dumps(data))
            command=[sys.executable,str(Path(render.__file__)),str(source),str(target),'--date','2027-06-15']
            result=subprocess.run(command,capture_output=True,text=True);self.assertEqual(result.returncode,0,result.stderr)
            self.assertEqual(target.read_text(),render.render_svg(data,view_date='2027-06-15'))


class ContextLegend(unittest.TestCase):
    def setUp(self):
        self.data=copy.deepcopy(EXAMPLE);self.data['coverage_system_id']='app-crm'

    def test_default_empty_footer_and_metadata_provenance(self):
        root=ET.fromstring(render.render_svg(self.data))
        legend=root.find("s:g[@class='legend']",NS)
        self.assertEqual(len(legend),0)
        self.assertEqual(float(root.get('height')),float(root.get('data-content-bottom'))+20)
        visible=' '.join(''.join(n.itertext()) for n in root.findall('.//s:text',NS))
        for text in ('Model revision:','Methodology baseline:','Adapter:','Renderer:','View adapter only'):
            self.assertNotIn(text,visible)
        md=json.loads(root.find('s:metadata',NS).text)
        self.assertEqual(md['renderer_version'],render.RENDERER_VERSION)
        self.assertIn('not full methodology conformance',md['view_contract'])
        self.assertIn('Missing mapping',md['mapping_semantics'])

    def test_enabled_mode_entries_and_legend_off(self):
        for maturity,labels,coverage in itertools.product((False,True),repeat=3):
            svg=render.render_svg(self.data,show_maturity=maturity,labels=labels,coverage=coverage)
            root=ET.fromstring(svg);text=' '.join(root.find("s:g[@class='legend']",NS).itertext())
            self.assertEqual('Maturity:' in text,maturity)
            self.assertEqual('System labels:' in text,labels)
            self.assertEqual('Coverage:' in text,coverage)
            self.assertNotIn('Outline:',text)
            if coverage:self.assertIn('area is not a percentage',text)
            hidden=ET.fromstring(render.render_svg(self.data,show_maturity=maturity,labels=labels,coverage=coverage,legend=False))
            self.assertFalse(hidden.findall("s:g[@class='legend']",NS))
            self.assertEqual(float(hidden.get('height')),float(hidden.get('data-content-bottom'))+20)
            self.assertEqual(geometry(svg),geometry(ET.tostring(hidden,encoding='unicode')))
        text=' '.join(ET.fromstring(render.render_svg(self.data,system='app-crm',sort_layers=True)).find("s:g[@class='legend']",NS).itertext())
        self.assertIn('Outline:',text);self.assertIn('Bands:',text)

    def test_maturity_visual_key_samples_and_footer_bounds(self):
        shown=render.render_svg(self.data,show_maturity=True)
        root=ET.fromstring(shown);tiles=root.findall(".//s:g[@class='maturity-legend-item']",NS)
        self.assertEqual([t.get('data-maturity-level') for t in tiles],list(map(str,range(6))))
        for i,tile in enumerate(tiles):
            sample=tile.find('s:rect',NS)
            self.assertIn('caprect',sample.get('class').split());self.assertIn(f'm{i}',sample.get('class').split())
            self.assertEqual(sample.get('stroke-width'),'3')
            self.assertIn(render.LEVELS[i],''.join(tile.itertext()))
            self.assertIn(render.MATURITY_LEGEND[i]['description'],''.join(tile.itertext()))
            self.assertLess(float(sample.get('x'))+float(sample.get('width')),float(root.get('width')))
            self.assertLess(float(sample.get('y'))+float(sample.get('height')),float(root.get('height')))
        for kwargs in ({},{'show_maturity':True,'legend':False},{'show_maturity':False}):
            hidden=ET.fromstring(render.render_svg(self.data,**kwargs))
            self.assertFalse(hidden.findall(".//s:g[@class='maturity-legend-item']",NS))
        hidden=render.render_svg(self.data,show_maturity=True,legend=False)
        self.assertEqual(geometry(shown),geometry(hidden))
        self.assertGreater(float(root.get('height')),float(ET.fromstring(hidden).get('height')))

    def test_unmapped_coverage_and_context_filter(self):
        data=copy.deepcopy(self.data)
        for state in data['states']:
            next(a for a in state['applications'] if a['id']=='app-crm')['capabilities']=[]
            next(r for r in state['capabilities'] if r['id']=='lead')['tags']=['MDM']
        root=ET.fromstring(render.render_svg(data,coverage=True,tag_filter='MDM'))
        text=' '.join(root.find("s:g[@class='legend']",NS).itertext())
        self.assertIn('Muted boxes:',text);self.assertNotIn('Coverage:',text)
        for state in data['states']:
            for record in state['capabilities']:
                record['tags']=[t for t in record.get('tags',[]) if t!='ESG']
                if record.get('property')=='ESG':record['property']=None
        root=ET.fromstring(render.render_svg(data,coverage=True,tag_filter='ESG'))
        self.assertEqual(len(root.find("s:g[@class='legend']",NS)),0)


class CoverageShapes(unittest.TestCase):
    def test_rectangular_and_independent_rounding(self):
        hull=[(0,0),(100,0),(100,50),(40,80),(0,50)]
        self.assertEqual(render.coverage_shape_points(hull),hull)
        rectangle=render.coverage_shape_points(hull,'rectangular')
        self.assertEqual(rectangle,[(0,0),(100,0),(100,80),(0,80)])
        for shape,count in [('angled',len(hull)),('rectangular',4)]:
            rounded=render.coverage_shape_points(hull,shape,True)
            self.assertEqual(len(rounded),count*9)
            self.assertTrue(all(0<=x<=100 and 0<=y<=80 for x,y in rounded))
            self.assertNotIn((0,0),rounded)
        with self.assertRaisesRegex(ValueError,'coverage shape'):render.coverage_shape_points(hull,'circle')

    def test_native_shapes_masks_overlap_and_restore(self):
        data=json.loads((Path(render.__file__).parent.parent/'assets/example.json').read_text())
        ids=['APPLICATION-CRM-1','APPLICATION-OMS-1','DEMO-APPLICATION-GOVERNANCE']
        for shape,rounded,layers,depth in itertools.product(('angled','rectangular'),(False,True),(False,True),(2,3)):
            svg=render.render_svg(data,view_date='2026-10-23',show_backlog=False,coverage=True,coverage_systems=ids,functional_overlap=True,coverage_shape=shape,round_coverage=rounded,sort_layers=layers,depth=depth)
            root=ET.fromstring(svg);md=json.loads(root.find('s:metadata',NS).text)
            self.assertEqual(md['view']['coverage_shape'],shape);self.assertEqual(md['view']['round_coverage'],rounded)
            self.assertTrue(root.findall(".//s:g[@class='functional-overlap-region']",NS))
            for g in root.findall("s:g[@class='coverage-overlay']",NS):
                polygon=g.find("s:polygon[@class='coverage-polygon']",NS)
                self.assertEqual(polygon.get('points'),g.find('s:defs/s:mask/s:polygon',NS).get('points'))
                hull=[tuple(map(float,p.split(','))) for p in polygon.get('data-coverage-hull').split()]
                expected=render.coverage_shape_points(hull,shape,rounded)
                self.assertEqual(polygon.get('points'),' '.join(f'{x:.4f},{y:.4f}' for x,y in expected))
            render.apply_coverage_shape(root,'angled',False)
            for g in root.findall("s:g[@class='coverage-overlay']",NS):
                p=g.find("s:polygon[@class='coverage-polygon']",NS)
                actual=[tuple(map(float,v.split(','))) for v in p.get('points').split()]
                expected=[tuple(map(float,v.split(','))) for v in p.get('data-coverage-hull').split()]
                self.assertEqual(actual,expected)
        with self.assertRaisesRegex(ValueError,'coverage shape'):render.render_svg(data,coverage_shape='circle')

class FunctionalOverlap(unittest.TestCase):
    def setUp(self):
        self.data=copy.deepcopy(EXAMPLE)
        for state in self.data['states']:
            state['applications']=[{'id':'a','name':'System A <&>','capabilities':['acquire'],'technical_capabilities':[{'id':'t1','name':'First ability','capabilities':['acquire']}]},
                {'id':'b','name':'System B','capabilities':['lead'],'technical_capabilities':[{'id':'t2','name':'Second ability','capabilities':['acquire']}]},
                {'id':'c','name':'System C','capabilities':['acquire']}]

    def test_adjacent_acme_domains_do_not_overlap_from_padding(self):
        data=json.loads((Path(render.__file__).parent.parent/'assets/example.json').read_text())
        ids=['APPLICATION-CRM-1','APPLICATION-OMS-1']
        for layers,depth in itertools.product((False,True),(1,2,3)):
            svg=render.render_svg(data,view_date='2026-10-23',sort_layers=layers,depth=depth,show_backlog=False,coverage=True,coverage_systems=ids,functional_overlap=True)
            root=ET.fromstring(svg)
            overlays=root.findall("s:g[@class='coverage-overlay']",NS)
            self.assertEqual(len(overlays),2)
            hulls=[[tuple(map(float,p.split(','))) for p in g.find("s:polygon[@class='coverage-polygon']",NS).get('points').split()] for g in overlays]
            self.assertLess(max(x for x,y in hulls[1]),min(x for x,y in hulls[0]))
            self.assertFalse(root.findall("s:g[@class='functional-overlap']",NS))
            self.assertEqual(json.loads(root.find('s:metadata',NS).text)['view']['functional_overlap_system_pairs'],[])

    def test_convex_polygon_intersections(self):
        square=[(0,0),(10,0),(10,10),(0,10)]
        self.assertEqual(render.polygon_intersection(square,[(20,0),(30,0),(30,10),(20,10)]),[])
        self.assertEqual(render.polygon_intersection(square,[(10,0),(20,0),(20,10),(10,10)]),[])
        overlap=render.polygon_intersection(square,[(5,-5),(15,-5),(15,5),(5,5)])
        self.assertEqual(set(overlap),{(5,0),(10,0),(10,5),(5,5)})
        inner=[(2,2),(8,2),(8,8),(2,8)]
        self.assertEqual(set(render.polygon_intersection(square,inner)),set(inner))

    def test_polygon_regions_and_union_boundary(self):
        plain=render.render_svg(self.data,coverage=True,coverage_systems=['a','b','c'])
        svg=render.render_svg(self.data,coverage=True,coverage_systems=['a','b','c'],functional_overlap=True)
        self.assertEqual(geometry(plain),geometry(svg))
        root=ET.fromstring(svg);regions=root.findall(".//s:g[@class='functional-overlap-region']",NS)
        self.assertEqual(len(regions),3)
        self.assertFalse(root.findall("s:g[@class='functional-overlap']/s:rect",NS))
        boundary=root.find(".//s:g[@class='functional-overlap-outline']",NS)
        self.assertEqual(boundary.get('filter'),'url(#functional-overlap-edge)')
        for pair in regions:
            self.assertEqual(len(json.loads(pair.get('data-overlap-systems'))),2)
            self.assertIsNone(pair.get('mask'))
            self.assertFalse(pair.findall('.//*[@mask]'))
            self.assertTrue(pair.find('s:polygon',NS).get('points'))
        self.assertIn('Red contour:',' '.join(root.find("s:g[@class='legend']",NS).itertext()))

    def test_box_cutouts_do_not_change_the_outer_overlap_boundary(self):
        svg=render.render_svg(self.data,coverage=True,coverage_systems=['a','b','c'],functional_overlap=True)
        root=ET.fromstring(svg)
        self.assertTrue(root.findall(".//s:rect[@class='coverage-cutout']",NS))
        boundary=root.find("s:g[@class='functional-overlap']",NS)
        before=ET.tostring(boundary)
        for hole in root.findall(".//s:rect[@class='coverage-cutout']",NS):
            hole.set('width','10000');hole.set('height','10000')
        render.update_functional_overlap(root,{},True)
        self.assertEqual(ET.tostring(root.find("s:g[@class='functional-overlap']",NS)),before)

    def test_off_single_system_and_coverage_master(self):
        for coverage,flag,ids in ((True,False,['a','b']),(False,True,['a','b']),(True,True,['a']),(True,True,[])):
            root=ET.fromstring(render.render_svg(self.data,coverage=coverage,functional_overlap=flag,coverage_systems=ids))
            self.assertFalse(root.findall("s:g[@class='functional-overlap']",NS))
            md=json.loads(root.find('s:metadata',NS).text)
            self.assertFalse(md['view']['functional_overlap']);self.assertEqual(md['view']['functional_overlap_system_pairs'],[])
        root=ET.fromstring(render.render_svg(self.data,coverage=True,coverage_systems=['a','b'],functional_overlap=True,legend=False))
        self.assertEqual(len(root.findall(".//s:g[@class='functional-overlap-region']",NS)),1)
        self.assertFalse(root.findall("s:g[@class='legend']",NS))

    def test_acme_date_depth_and_filters(self):
        data=json.loads((Path(render.__file__).parent.parent/'assets/example.json').read_text());model=render.normalize(data)
        ids=['DEMO-APPLICATION-DATA','DEMO-APPLICATION-GOVERNANCE','DEMO-APPLICATION-WAREHOUSE']
        for when,layers,depth,tag in itertools.product(('2026-06-15','2026-10-21','2026-10-23','2027-01-01'),(False,True),(1,2,3),('', 'MDM','ESG')):
            state=render.state_on(model,when)
            svg=render.render_svg(data,view_date=when,sort_layers=layers,depth=depth,tag_filter=tag,show_backlog=False,coverage=True,coverage_systems=ids,functional_overlap=True)
            root=ET.fromstring(svg)
            active=root.findall("s:g[@class='coverage-overlay'][@data-coverage-visible='yes']",NS)
            expected=[]
            for i,left in enumerate(active):
                for right in active[i+1:]:
                    points=[[tuple(map(float,p.split(','))) for p in g.find("s:polygon[@class='coverage-polygon']",NS).get('points').split()] for g in (left,right)]
                    if render.polygon_intersection(*points):expected.append(sorted([left.get('data-coverage-system'),right.get('data-coverage-system')]))
            regions=root.findall(".//s:g[@class='functional-overlap-region']",NS)
            actual=[json.loads(n.get('data-overlap-systems')) for n in regions]
            self.assertEqual(actual,expected)
            self.assertEqual(json.loads(root.find('s:metadata',NS).text)['view']['functional_overlap_system_pairs'],expected)
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory)/'model.json';target=Path(directory)/'map.svg';source.write_text(json.dumps(data))
            command=[sys.executable,str(Path(render.__file__)),str(source),str(target),'--functional-overlap']
            bad=subprocess.run(command,capture_output=True,text=True);self.assertNotEqual(bad.returncode,0)
            good=subprocess.run(command+['--coverage','--coverage-system',ids[0],'--coverage-system',ids[1]],capture_output=True,text=True)
            self.assertEqual(good.returncode,0,good.stderr)
            self.assertTrue(ET.fromstring(target.read_text()).findall(".//s:g[@class='functional-overlap-region']",NS))

if __name__ == '__main__':
    unittest.main()
