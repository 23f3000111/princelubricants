"""
Unit tests for how a client document becomes catalogue data.

    python -m unittest discover -s tools
"""
import importlib.util
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("build_products", HERE / "build-products.py")
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


class Ids(unittest.TestCase):
    def test_the_brand_and_the_word_sae_are_left_out(self):
        self.assertEqual(build.product_id("PRINCE® FS1 SAE 0W-30"), "fs1-0w-30")
        self.assertEqual(build.product_id("PRINCE® FS1 EUROGEN SAE 0W-20 C6/C5"), "fs1-eurogen-0w-20-c6-c5")

    def test_plus_signs_are_spelled_out(self):
        self.assertEqual(build.product_id("PRINCE® SUPER-SHIFT GL-5 +LSD SAE 75W-90"), "super-shift-gl-5-plus-lsd-75w-90")
        self.assertEqual(build.product_id("PRINCE® ATF EUROSPEC 7GT FE+"), "atf-eurospec-7gt-fe-plus")

    def test_the_freezing_point_is_left_out(self):
        self.assertEqual(build.product_id("PRINCE® 50/50 ANTIFREEZE/COOLANT G11 −37°C"), "50-50-antifreeze-coolant-g11")
        self.assertEqual(build.product_id("PRINCE® 50/50 ANTIFREEZE/COOLANT G12++/G13 −37°C"), "50-50-antifreeze-coolant-g12-plus-plus-g13")

    def test_a_type_id_leaves_out_what_is_in_brackets(self):
        self.assertEqual(build.type_id("Automatic Transmission Fluids (ATF)"), "automatic-transmission-fluids")
        self.assertEqual(build.type_id("Differential & Hypoid Gear Oils"), "differential-and-hypoid-gear-oils")


class Documents(unittest.TestCase):
    DOC = {"types": [
        {"title": "Engine Oils (EO)", "series": [{"title": "FS1", "products": [{
            "name": "PRINCE® FS1 SAE 0W-30", "facts": [["Product Type", "Oil"]], "description": ["One.", "Two."],
            "sections": [{"label": "Intended Applications", "text": "Cars."},
                         {"label": "Industry Standards & Specifications", "items": ["API SP", "API CF", "ACEA A3/B4", "MB 229.5"]}],
            "packaging": {"sizes": ["1L", "4L"], "note": "as applicable"}}]}]},
        {"title": "Brake Fluids", "series": [{"title": "", "products": [{
            "name": "PRINCE® DOT 4", "facts": [], "description": ["D."], "sections": [],
            "packaging": {"sizes": ["1L"], "note": ""}}]}]},
    ]}

    def setUp(self):
        self.types = build.from_document(self.DOC, packs={"fs1-0w-30": ["fs1-4l-0w-30"]}, lines={"FS1": "A line."}, titles={})

    def test_types_hold_their_series_as_ranges(self):
        self.assertEqual([t["id"] for t in self.types], ["engine-oils", "brake-fluids"])
        self.assertEqual(self.types[0]["title"], "Engine Oils (EO)")
        self.assertEqual([(r["id"], r["title"], r["desc"]) for r in self.types[0]["ranges"]], [("fs1", "FS1", "A line.")])

    def test_a_type_without_series_has_one_unnamed_range(self):
        self.assertEqual([(r["id"], r["title"]) for r in self.types[1]["ranges"]], [("products", "")])

    def test_a_product_keeps_every_part_of_the_document(self):
        p = self.types[0]["ranges"][0]["products"][0]
        self.assertEqual(p["id"], "fs1-0w-30")
        self.assertEqual(p["name"], "PRINCE® FS1 SAE 0W-30")
        self.assertEqual(p["facts"], [["Product Type", "Oil"]])
        self.assertEqual(p["intro"], ["One.", "Two."])
        self.assertEqual(p["sizes"], ["1L", "4L"])
        self.assertEqual(p["sizeNote"], "as applicable")
        self.assertEqual(p["sections"], [
            {"label": "Intended Applications", "blocks": [{"p": "Cars."}]},
            {"label": "Industry Standards & Specifications", "blocks": [{"chips": ["API SP", "API CF", "ACEA A3/B4", "MB 229.5"]}]},
        ])

    def test_the_short_line_is_the_first_three_standards(self):
        self.assertEqual(self.types[0]["ranges"][0]["products"][0]["spec"], "API SP · API CF · ACEA A3/B4")
        self.assertEqual(self.types[1]["ranges"][0]["products"][0]["spec"], "")

    def test_a_product_without_a_pack_shot_has_no_images(self):
        self.assertEqual(self.types[0]["ranges"][0]["products"][0]["images"], ["fs1-4l-0w-30"])
        self.assertEqual(self.types[1]["ranges"][0]["products"][0]["images"], [])

    def test_a_series_can_be_retitled_for_the_site(self):
        types = build.from_document(self.DOC, packs={}, lines={}, titles={"FS1": "FS1 SERIES"})
        self.assertEqual(types[0]["ranges"][0]["title"], "FS1 SERIES")

    def test_a_pack_for_a_product_the_document_does_not_have_is_refused(self):
        with self.assertRaises(SystemExit):
            build.from_document(self.DOC, packs={"fs1-5w-30": ["x"]}, lines={}, titles={})


if __name__ == "__main__":
    unittest.main()
