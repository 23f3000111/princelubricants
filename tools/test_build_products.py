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

    def test_the_freezing_point_is_left_out_inside_the_name_too(self):
        self.assertEqual(build.product_id("PRINCE® MAXX COOL SPORT −37°C YELLOW"), "maxx-cool-sport-yellow")
        self.assertEqual(build.product_id("PRINCE® MAXX COOL FACTORY −37°C BLUE"), "maxx-cool-factory-blue")

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

    def test_the_notices_are_kept(self):
        doc = {"types": [{"title": "Coolants", "series": [{"title": "", "products": [{
            "name": "PRINCE® GT COOLING", "facts": [], "description": ["D."], "sections": [],
            "notices": [{"label": "CAUTION", "text": "NO ANTIFREEZE PROTECTION."}],
            "packaging": {"sizes": ["1L"], "note": ""}}]}]}]}
        p = build.from_document(doc, packs={}, lines={}, titles={})[0]["ranges"][0]["products"][0]
        self.assertEqual(p["notices"], [{"label": "CAUTION", "text": "NO ANTIFREEZE PROTECTION."}])


class Successors(unittest.TestCase):
    """Which new product an old site's product page leads to."""

    ENGINE = ["fsr-5w-40", "fsr-10w-40", "fsr-gt-endurance-10w-50", "fsr-gt-endurance-15w-50", "fsr-gt-extreme-10w-60"]

    def test_the_same_name_leads_to_its_page(self):
        self.assertEqual(build.successor("fsr-5w-40", self.ENGINE), "fsr-5w-40")

    def test_a_renamed_product_leads_to_the_one_that_shares_most_of_its_words_and_its_grade(self):
        self.assertEqual(build.successor("fsr-gt-racing-10w-50", self.ENGINE), "fsr-gt-endurance-10w-50")
        self.assertEqual(build.successor("devo-ci-4-15w-40", ["devo-shpd-15w-40-ci-4", "devo-all-fleet-15w-40-cg-4"]), "devo-shpd-15w-40-ci-4")
        self.assertEqual(build.successor("coolant-g13-oat-37-c", ["50-50-antifreeze-coolant-g11", "50-50-antifreeze-coolant-g12-plus-plus-g13"]),
                         "50-50-antifreeze-coolant-g12-plus-plus-g13")

    def test_a_new_name_inside_the_old_one_is_its_successor(self):
        self.assertEqual(build.successor("atf-3h-dexron-iii-h-mercon", ["atf-6-mercon-lv-dexron-vi", "atf-3h"]), "atf-3h")

    def test_of_the_new_names_around_the_old_one_the_closest_is_its_successor(self):
        gold = ["d1-gold-4x4-5w-40-ck-4-sn", "d1-gold-5w-40-ck-4-sn"]
        self.assertEqual(build.successor("d1-gold-5w-40", gold), "d1-gold-5w-40-ck-4-sn")
        self.assertIsNone(build.successor("coolant-gt-cooling", ["gt-cooling-light-blue-racing-coolant", "gt-cooling-purple-racing-coolant"]))

    def test_a_grade_the_new_range_does_not_have_leads_nowhere(self):
        self.assertIsNone(build.successor("fsr-gt-racing-0w-40", self.ENGINE))

    def test_another_family_with_the_grade_is_not_a_successor(self):
        self.assertIsNone(build.successor("maxx-ultra-4t-20w-50", ["maxx-ultra-4t-10w-30", "maxx-launch-4t-20w-50"]))

    def test_a_tie_leads_nowhere(self):
        self.assertIsNone(build.successor("d1-10w-30", ["d1-sport-10w-30-ck-4-sn", "d1-plus-10w-30-ck-4-sn", "d1-longlife-10w-30-ci-4"]))
        self.assertIsNone(build.successor("devo-ch-4-15w-40", ["devo-shpd-15w-40-ci-4", "devo-all-fleet-15w-40-cg-4"]))

    def test_one_shared_word_is_not_enough(self):
        self.assertIsNone(build.successor("cvt-universal", ["cvt-fe", "dct-plus"]))


class Sharing(unittest.TestCase):
    """A product that two documents have gets one page, in the first category that has it."""

    def doc(self, *names, intro="Same words."):
        return {"types": [{"title": "Brake & Clutch Fluids", "series": [{"title": "", "products": [{
            "name": name, "facts": [["Product Type", "Brake Fluid"]], "description": [intro], "sections": [],
            "packaging": {"sizes": ["1L"], "note": ""}} for name in names]}]}]}

    def setUp(self):
        self.owner = build.from_document(self.doc("PRINCE® DOT 4", "PRINCE® DOT 3"), packs={"dot-4": ["dot4-1l"]}, lines={}, titles={})
        self.pages = {}
        build.share("passenger-car", self.owner, self.pages, own_pages=set())

    def test_a_product_the_first_category_has_is_listed_with_a_link_to_its_page(self):
        types = build.from_document(self.doc("PRINCE® DOT 5.1", "PRINCE® DOT 4"), packs={}, lines={}, titles={})
        build.share("commercial-vehicle", types, self.pages, own_pages=set())
        own, listed = types[0]["ranges"][0]["products"]
        self.assertNotIn("page", own)
        self.assertEqual(listed["page"], "passenger-car/dot-4")
        self.assertEqual(listed["images"], ["dot4-1l"])
        self.assertEqual(listed["facts"], [["Product Type", "Brake Fluid"]])

    def test_the_page_says_where_else_its_product_is_listed(self):
        types = build.from_document(self.doc("PRINCE® DOT 4"), packs={}, lines={}, titles={})
        build.share("commercial-vehicle", types, self.pages, own_pages=set())
        page = self.owner[0]["ranges"][0]["products"][0]
        self.assertEqual(page["alsoIn"], [{"category": "commercial-vehicle", "type": "brake-and-clutch-fluids"}])
        self.assertNotIn("alsoIn", self.owner[0]["ranges"][0]["products"][1])

    def test_a_product_with_its_own_words_can_keep_a_page_of_its_own(self):
        types = build.from_document(self.doc("PRINCE® DOT 4", intro="Other words."), packs={}, lines={}, titles={})
        build.share("powersports", types, self.pages, own_pages={("powersports", "dot-4")})
        self.assertNotIn("page", types[0]["ranges"][0]["products"][0])
        self.assertNotIn("alsoIn", self.owner[0]["ranges"][0]["products"][0])

    def test_two_pages_at_one_address_are_refused(self):
        types = build.from_document(self.doc("PRINCE® DOT 4", "PRINCE® DOT 4"), packs={}, lines={}, titles={})
        with self.assertRaises(SystemExit):
            build.share("powersports", types, {}, own_pages=set())


if __name__ == "__main__":
    unittest.main()
