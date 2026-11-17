import copy
import importlib.util
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('diagram_colors', ROOT / 'tools/diagram_colors.py')
colors = importlib.util.module_from_spec(spec)
spec.loader.exec_module(colors)


class DiagramColorsTest(unittest.TestCase):
    def setUp(self):
        self.palette = {'schema': colors.VERSION, 'common': {
            'roles': {'node_border': '#123456', 'connection': '#AABBCC'},
            'types': {'action/Project': {'fill': '#DDEEFF', 'text': '#112233'}}},
            'variants': {'dark': {'roles': {'node_border': '#ABCDEF'},
                        'types': {'action/Project': {'text': '#FEDCBA'}}}}}

    def test_template_is_noop(self):
        template = ROOT / 'transitrix/skills/onboard/templates/operations/diagram-colors.template.yaml'
        doc = colors.load_settings(template.read_text())
        self.assertEqual(colors.validate(doc), [])
        for mode in colors.VARIANTS:
            self.assertEqual(colors.resolve_color(doc, mode, [('roles', 'node_border')], '#custom-legacy'),
                             ('#custom-legacy', 'legacy'))

    def test_variant_isolation_and_partial_paint(self):
        self.assertEqual(colors.validate(self.palette), [])
        original = copy.deepcopy(self.palette)
        result, sources = colors.resolve_palette(self.palette, 'dark')
        self.assertEqual(result['roles'], {'node_border': '#ABCDEF', 'connection': '#AABBCC'})
        self.assertEqual(result['types']['action/Project'], {'fill': '#DDEEFF', 'text': '#FEDCBA'})
        self.assertEqual(sources[('roles', 'node_border')], 'dark')
        self.assertEqual(colors.resolve_color(self.palette, 'light', [('roles', 'node_border')], 'old'),
                         ('#123456', 'common'))
        self.assertEqual(colors.resolve_color(self.palette, 'high_contrast', [('roles', 'node_border')], 'old'),
                         ('#123456', 'common'))
        self.assertEqual(self.palette, original)

    def test_specific_candidate_then_generic_then_existing_customized_value(self):
        candidates = [('types', 'action/Project', 'fill'), ('roles', 'node_fill')]
        self.palette['common']['roles']['node_fill'] = '#EEEEEE'
        self.assertEqual(colors.resolve_color(self.palette, 'dark', candidates, '#legacy'), ('#DDEEFF', 'common'))
        del self.palette['common']['types']['action/Project']['fill']
        self.assertEqual(colors.resolve_color(self.palette, 'dark', candidates, '#legacy'), ('#EEEEEE', 'common'))
        del self.palette['common']['roles']['node_fill']
        self.assertEqual(colors.resolve_color(self.palette, 'dark', candidates, '#legacy'), ('#legacy', 'legacy'))

    def test_semantic_channel_does_not_take_generic_fill(self):
        self.palette['common']['roles']['node_fill'] = '#EEEEEE'
        self.assertEqual(colors.resolve_color(self.palette, 'light', [('roles', 'maturity.1')], '#existing'),
                         ('#existing', 'legacy'))

    def test_invalid_inputs_and_unknowns_are_refused(self):
        invalid = [None, [], {}, {'schema': 'unknown'}, {'schema': colors.VERSION, 'id': 'MODEL-1'}]
        for roles in [{'typo': '#123456'}, {'node_fill': None}, {'node_fill': '#fff'},
                      {'node_fill': 'red'}, {'node_fill': 'var(--x)'}, {'node_fill': '#12345678'},
                      {'node_fill': True}, {'goal_level.8': '#123456'}, {'maturity.6': '#123456'},
                      {'status.failed.fill': '#123456'}]:
            invalid.append({'schema': colors.VERSION, 'common': {'roles': roles}})
        invalid += [{'schema': colors.VERSION, 'common': None},
                    {'schema': colors.VERSION, 'variants': {'light': {'roles': {'node_fill': '#x'}}}},
                    {'schema': colors.VERSION, 'variants': {'automatic': {}}},
                    {'schema': colors.VERSION, 'common': {'types': {'7': {'fill': '#123456'}}}},
                    {'schema': colors.VERSION, 'common': {'types': {'action/Project': {'opacity': '#123456'}}}}]
        for doc in invalid:
            with self.subTest(doc=doc):
                self.assertTrue(colors.validate(doc))
                with self.assertRaises(colors.SettingsError): colors.resolve_palette(doc, 'light')

    def test_duplicate_alias_tag_and_multiple_document_refusal(self):
        for text in ['schema: a\nschema: b\n', 'schema: x\ncommon: {roles: {node_fill: a, node_fill: b}}',
                     'schema: x\ncommon: &p {}\nvariants: {light: *p}',
                     'schema: !!str x', 'schema: x\n---\nschema: x', 'true: value']:
            with self.subTest(text=text):
                with self.assertRaises(colors.SettingsError): colors.load_settings(text)

    def test_all_schema_roles_and_modes_are_understood(self):
        roles = {name: '#123456' for name in colors.SCHEMA['$defs']['roles']['properties']}
        roles.update({'goal_level.7': '#654321', 'tree_level.2': '#123456', 'maturity.unset': '#112233',
                      'layer.action': '#112233', 'status.warning.text': '#123456'})
        self.assertEqual(colors.validate({'schema': colors.VERSION, 'common': {'roles': roles}}), [])
        with self.assertRaises(colors.SettingsError): colors.resolve_palette(self.palette, 'automatic')

    def test_cli_is_readonly_and_distinguishes_absent_invalid(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / 'colors.yaml'
            cmd = [sys.executable, str(ROOT / 'tools/diagram_colors.py'), str(path)]
            absent = subprocess.run(cmd, capture_output=True, text=True)
            self.assertEqual(absent.returncode, 0)
            self.assertIn('"present": false', absent.stdout)
            self.assertFalse(path.exists())
            path.write_text('schema: invalid\n')
            before = path.read_bytes()
            invalid = subprocess.run(cmd, capture_output=True, text=True)
            self.assertEqual(invalid.returncode, 1)
            self.assertEqual(before, path.read_bytes())


if __name__ == '__main__':
    unittest.main()
