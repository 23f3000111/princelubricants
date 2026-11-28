"""
Unit tests for the product document reader.

    python -m unittest discover -s tools

They cover the text rules only, so they run without pdfplumber and without the client's PDF.
"""
import importlib.util
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("read_product_doc", HERE / "read-product-doc.py")
doc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(doc)


class Headings(unittest.TestCase):
    def test_one_series(self):
        self.assertEqual(doc.series_of("FS1 – 4 products"), [("FS1", 4)])

    def test_missing_space_before_the_dash(self):
        self.assertEqual(doc.series_of("FS SUPER– 6 products"), [("FS SUPER", 6)])

    def test_two_series_on_one_line(self):
        self.assertEqual(doc.series_of("SS1 – 3 products    ;     SS SUPER – 1 product"), [("SS1", 3), ("SS SUPER", 1)])

    def test_a_name_with_spaces(self):
        self.assertEqual(doc.series_of("ATF EUROSPEC – 6 products ; others ATF – 8 products"),
                         [("ATF EUROSPEC", 6), ("others ATF", 8)])

    def test_other_paragraphs_are_not_headings(self):
        self.assertEqual(doc.series_of("Available Packaging: 1L / 4L"), [])
        self.assertEqual(doc.series_of(""), [])


class HeaderRows(unittest.TestCase):
    def test_the_column_titles_are_a_header(self):
        for first in ("Product", "Products"):
            self.assertTrue(doc.is_header([first, "Product Page Description", "Individual Page Description"]), first)

    def test_a_product_row_is_not(self):
        self.assertFalse(doc.is_header(["PRINCE® FSR SAE 5W-40", "Product Series: FSR", "Expertly geared."]))


class Menus(unittest.TestCase):
    MENU = ["Signature Ester Based Engine Oils", "Heavy-Duty Engine Oils (HDEO)", "Automatic Transmission Fluids (ATF)"]

    def test_each_section_is_the_type_its_menu_marks(self):
        titles, slips = doc.sections_of([(self.MENU, 0), (self.MENU, 1), (self.MENU, 2)])
        self.assertEqual(titles, self.MENU)
        self.assertEqual(slips, [])

    def test_a_menu_copied_from_another_document_is_read_by_its_place(self):
        # The first menu of the Commercial Vehicle document is the Passenger Car one, still
        # marking its first cell: the section is this document's first type.
        other = ["Flagship Ester Based Engine Oils", "Passenger Car Engine Oils", "Automatic Transmission Fluids (ATF)"]
        titles, slips = doc.sections_of([(other, 0), (self.MENU, 1), (self.MENU, 2)])
        self.assertEqual(titles, self.MENU)
        self.assertEqual(slips, [(0, ["Flagship Ester Based Engine Oils", "Passenger Car Engine Oils"])])

    def test_a_type_marked_twice_is_refused(self):
        with self.assertRaises(ValueError):
            doc.sections_of([(self.MENU, 0), (self.MENU, 0), (self.MENU, 2)])

    def test_a_type_never_marked_is_refused(self):
        with self.assertRaises(ValueError):
            doc.sections_of([(self.MENU, 0), (self.MENU, 2)])


class SeriesByFact(unittest.TestCase):
    def product(self, series=None):
        return {"facts": ([["Product Series", series]] if series else []) + [["Product Type", "Oil"]]}

    def test_runs_of_the_same_series_are_grouped(self):
        products = [self.product("D1 GOLD 4X4")] * 3 + [self.product("D1 GOLD")] * 4
        self.assertEqual(doc.series_by_fact(products), [("D1 GOLD 4X4", 3), ("D1 GOLD", 4)])

    def test_one_series_for_the_whole_type_is_no_grouping(self):
        self.assertEqual(doc.series_by_fact([self.product("FSR")] * 5), [])

    def test_a_series_per_product_is_no_grouping(self):
        products = [self.product("BRAKE & CLUTCH FLUID DOT 5.1"), self.product("BRAKE & CLUTCH FLUID DOT 4")]
        self.assertEqual(doc.series_by_fact(products), [])

    def test_a_product_without_a_series_is_no_grouping(self):
        self.assertEqual(doc.series_by_fact([self.product("D1")] * 2 + [self.product()] + [self.product("Devo")] * 2), [])

    @staticmethod
    def row(name, series):
        return ([name], [f"Product Series: {series}", "Product Type: Oil"], ["Text.", "Available Packaging: 1L"])

    def test_a_document_without_headings_is_grouped_by_its_products(self):
        types = [{"title": "Engine Oils", "series": [], "rows": [self.row("A", "D1"), self.row("B", "D1"), self.row("C", "Devo")]}]
        self.assertEqual([(s["title"], len(s["products"])) for s in doc.build(types, [])[0]["series"]], [("D1", 2), ("Devo", 1)])

    def test_a_document_with_headings_groups_only_where_it_has_them(self):
        types = [
            {"title": "Engine Oils", "series": [("FS1", 1)], "rows": [self.row("A", "FS1")]},
            {"title": "Fluids", "series": [], "rows": [self.row("B", "CHF"), self.row("C", "PSF"), self.row("D", "PSF")]},
        ]
        self.assertEqual([(s["title"], len(s["products"])) for s in doc.build(types, [])[1]["series"]], [("", 3)])


class Rows(unittest.TestCase):
    def test_a_row_without_a_name_continues_the_product_above(self):
        rows = [
            (["PRINCE® A"], ["Product Type: ATF"], ["First line and "]),
            ([], [], ["second line.", "", "Available Packaging: 1L"]),
            (["PRINCE® B"], [], ["Other."]),
        ]
        self.assertEqual(doc.merge_rows(rows), [
            (["PRINCE® A"], ["Product Type: ATF"], ["First line and second line.", "", "Available Packaging: 1L"]),
            (["PRINCE® B"], [], ["Other."]),
        ])

    def test_a_finished_paragraph_is_not_joined_to_a_labelled_one(self):
        rows = [
            (["PRINCE® A"], [], ["It ends here. "]),
            ([], [], ["Intended Applications: Cars."]),
        ]
        self.assertEqual(doc.merge_rows(rows)[0][2], ["It ends here. ", "Intended Applications: Cars."])

    def test_a_sentence_that_goes_on_after_a_page_break_is_joined(self):
        rows = [
            (["PRINCE® A"], [], ["A system. Superior shear "]),
            ([], [], ["stability."]),
        ]
        self.assertEqual(doc.merge_rows(rows)[0][2], ["A system. Superior shear stability."])

    def test_a_new_sentence_after_a_page_break_stays_in_its_paragraph(self):
        # The first paragraph runs to the foot of the page: nothing separates the two halves,
        # so they are one paragraph even though a sentence ends exactly at the break.
        rows = [
            (["PRINCE® A"], [], ["Exceptional shift quality. "]),
            ([], [], ["Superior shear stability."]),
        ]
        self.assertEqual(doc.merge_rows(rows)[0][2], ["Exceptional shift quality. Superior shear stability."])

    def test_a_blank_line_before_the_break_starts_a_new_paragraph(self):
        rows = [
            (["PRINCE® A"], [], ["Exceptional shift quality. ", " "]),
            ([], [], ["Superior shear stability."]),
        ]
        self.assertEqual(doc.merge_rows(rows)[0][2], ["Exceptional shift quality. ", " ", "Superior shear stability."])

    def test_facts_run_on_by_label(self):
        rows = [
            (["PRINCE® A"], ["Product Type: ATF", "Performance Specifications: ZF 8HP Series "], ["x."]),
            ([], ["Transmission Compatibility: 8-Speed", "Category: ATF"], []),
        ]
        self.assertEqual(doc.merge_rows(rows)[0][1],
                         ["Product Type: ATF", "Performance Specifications: ZF 8HP Series ", "Transmission Compatibility: 8-Speed", "Category: ATF"])

    def test_a_blank_row_adds_nothing(self):
        rows = [(["PRINCE® A"], ["Product Type: ATF"], ["x."]), ([" "], [" "], [" "])]
        self.assertEqual(doc.merge_rows(rows), [(["PRINCE® A"], ["Product Type: ATF"], ["x."])])


class Facts(unittest.TestCase):
    def test_label_and_value(self):
        self.assertEqual(doc.fact("Category: Passenger Car Motor Oil (PCMO) "), ("Category", "Passenger Car Motor Oil (PCMO)"))

    def test_only_the_first_colon_splits(self):
        self.assertEqual(doc.fact("Performance Specifications: Scania STO 1:0"), ("Performance Specifications", "Scania STO 1:0"))

    def test_a_line_without_a_label_is_refused(self):
        with self.assertRaises(ValueError):
            doc.fact("Engine Oil")


class SoftBreaks(unittest.TestCase):
    # A line break typed inside a Word paragraph puts two lines of the list in one paragraph.
    LABELS = {"Product Type", "Technology", "Visual Appearance"}

    def test_a_second_label_inside_a_paragraph_starts_its_own_line(self):
        self.assertEqual(doc.lines_of(["Product Type: Ethylene Glycol-Based Coolant Technology: Phosphated Silicated (P-Si-OAT) "], self.LABELS),
                         ["Product Type: Ethylene Glycol-Based Coolant", "Technology: Phosphated Silicated (P-Si-OAT)"])

    def test_the_same_words_without_a_colon_do_not_split(self):
        self.assertEqual(doc.lines_of(["Technology: Hybrid Organic Acid Technology (HOAT)"], self.LABELS),
                         ["Technology: Hybrid Organic Acid Technology (HOAT)"])

    def test_a_label_that_ends_with_another_label_is_whole(self):
        self.assertEqual(doc.lines_of(["API Service Category: API SP"], {"Category", "API Service Category"}),
                         ["API Service Category: API SP"])

    def test_words_before_the_first_label_are_kept(self):
        self.assertEqual(doc.lines_of(["stray words Technology: OAT"], self.LABELS), ["stray words", "Technology: OAT"])

    def test_blank_paragraphs_are_dropped(self):
        self.assertEqual(doc.lines_of(["Visual Appearance: Blue", " "], self.LABELS), ["Visual Appearance: Blue"])

    def test_a_label_known_from_other_documents_splits_too(self):
        # In the Powersports document "Technology" is never a line of its own.
        self.assertEqual(doc.lines_of(["Product Type: Ethylene Glycol-Based Coolant Technology: Hybrid Organic Acid Technology (HOAT)"], {"Product Type"}),
                         ["Product Type: Ethylene Glycol-Based Coolant", "Technology: Hybrid Organic Acid Technology (HOAT)"])

    def test_a_label_inside_a_longer_one_does_not_split_it(self):
        self.assertEqual(doc.lines_of(["Transmission Compatibility: 8-Speed Automatic Transmissions"], set()),
                         ["Transmission Compatibility: 8-Speed Automatic Transmissions"])


class Lists(unittest.TestCase):
    def test_splits_on_commas(self):
        self.assertEqual(doc.split_list("API SP, API CF, ACEA A3/B4"), ["API SP", "API CF", "ACEA A3/B4"])

    def test_keeps_a_comma_inside_brackets(self):
        self.assertEqual(doc.split_list("MB 236.17, MB 236.16 (legacy specification, subject to application compatibility)"),
                         ["MB 236.17", "MB 236.16 (legacy specification, subject to application compatibility)"])

    def test_drops_the_full_stop_that_ends_the_list(self):
        self.assertEqual(doc.split_list("ZF LifeguardFluid 8 (S671.090.312), ZF TE-ML 11 (applicable 8HP-series transmissions)."),
                         ["ZF LifeguardFluid 8 (S671.090.312)", "ZF TE-ML 11 (applicable 8HP-series transmissions)"])


class Body(unittest.TestCase):
    def test_description_sections_and_packaging(self):
        out = doc.body([
            "Experience superior performance. ", " ",
            "Intended Applications: Engineered for cars. ", " ",
            "Industry Standards, Specifications, & Recommendations: API SP, API CF", " ",
            "Available Packaging: 1L / 4L / 5L (as applicable) ", " ", " ",
        ])
        self.assertEqual(out["description"], ["Experience superior performance."])
        self.assertEqual(out["sections"], [
            {"label": "Intended Applications", "text": "Engineered for cars."},
            {"label": "Industry Standards, Specifications, & Recommendations", "items": ["API SP", "API CF"]},
        ])
        self.assertEqual(out["packaging"], {"sizes": ["1L", "4L", "5L"], "note": "as applicable"})

    def test_an_unlabelled_second_paragraph_is_description(self):
        out = doc.body(["One.", " ", "Two.", " ", "Available Packaging: 1L (as applicable)"])
        self.assertEqual(out["description"], ["One.", "Two."])
        self.assertEqual(out["packaging"]["sizes"], ["1L"])

    def test_every_list_label_the_client_uses(self):
        for label in ("Industry Standards & Specifications", "OEM Specifications & Recommendations",
                      "Key OEM Performance Specifications", "Key OEM Performance Specification", "Recommended OEM Fluid Specifications"):
            out = doc.body(["D.", f"{label}: A 1, B 2", "Available Packaging: 1L"])
            self.assertEqual(out["sections"], [{"label": label, "items": ["A 1", "B 2"]}])

    def test_a_mistyped_list_label_is_read_as_the_one_meant(self):
        for typed, meant in (("Industry Standards, Specifications & Recommendations", "Industry Standards, Specifications, & Recommendations"),
                             ("Industry Standards, & Specifications", "Industry Standards & Specifications")):
            out = doc.body(["D.", f"{typed}: API SP, JASO MA2", "Intended Applications: Bikes.", "Available Packaging: 1L"])
            self.assertEqual(out["description"], ["D."], typed)
            self.assertEqual(out["sections"][0], {"label": meant, "items": ["API SP", "JASO MA2"]}, typed)

    def test_industry_standards_alone_is_a_list(self):
        out = doc.body(["D.", "Industry Standards: ASTM D3306, ASTM D4985", "Available Packaging: 4L"])
        self.assertEqual(out["sections"], [{"label": "Industry Standards", "items": ["ASTM D3306", "ASTM D4985"]}])

    def test_safety_notices_are_kept_apart_in_their_order(self):
        out = doc.body(["D.", "Important: Do not dilute further.", "CAUTION: THIS PRODUCT OFFERS NO ANTIFREEZE PROTECTION.",
                        "Intended Applications: Race cars.", "Available Packaging: 1L"])
        self.assertEqual(out["description"], ["D."])
        self.assertEqual(out["notices"], [{"label": "Important", "text": "Do not dilute further."},
                                          {"label": "CAUTION", "text": "THIS PRODUCT OFFERS NO ANTIFREEZE PROTECTION."}])
        self.assertEqual(out["sections"], [{"label": "Intended Applications", "text": "Race cars."}])

    def test_a_product_without_notices_has_none(self):
        self.assertEqual(doc.body(["D.", "Available Packaging: 1L"])["notices"], [])

    def test_a_colon_inside_a_sentence_is_not_a_label(self):
        out = doc.body(["Premixed at a 50:50 ratio, it protects.", "Available Packaging: 1L"])
        self.assertEqual(out["description"], ["Premixed at a 50:50 ratio, it protects."])

    def test_a_product_without_packaging_is_refused(self):
        with self.assertRaises(ValueError):
            doc.body(["Only a description."])


class Accounting(unittest.TestCase):
    TYPES = [{"title": "T", "series": [{"title": "S", "products": [{
        "name": "PRINCE® A", "facts": [["Product Type", "ATF"]], "description": ["One."],
        "notices": [{"label": "CAUTION", "text": "No antifreeze."}],
        "sections": [{"label": "Intended Applications", "text": "Cars."}, {"label": "OEM Specifications & Recommendations", "items": ["A 1", "B 2"]}],
        "packaging": {"sizes": ["1L", "4L"], "note": "as applicable"}}]}]}]

    def test_every_part_of_a_product_is_counted(self):
        self.assertEqual(doc.words(doc.texts_of(self.TYPES)), doc.words([
            "PRINCE® A", "Product Type: ATF", "One.", "CAUTION: No antifreeze.", "Intended Applications: Cars.",
            "OEM Specifications & Recommendations: A 1, B 2", "Available Packaging: 1L / 4L (as applicable)"]))

    def test_a_lost_word_shows(self):
        self.assertNotEqual(doc.words(doc.texts_of(self.TYPES)), doc.words(["PRINCE® A", "Product Type: ATF fluid"]))


class UnknownLabels(unittest.TestCase):
    def test_a_paragraph_that_opens_like_a_label_is_reported(self):
        self.assertTrue(doc.looks_labelled("Performance Benefits: Keeps the engine clean."))

    def test_a_label_with_commas_and_ampersands_is_reported(self):
        self.assertTrue(doc.looks_labelled("Industry Standards, Approvals & Notes: API SP, JASO MA2"))

    def test_ordinary_sentences_are_not(self):
        for text in ("Premixed at a 50:50 ratio, it protects.", "PRINCE® A is an oil. Its use: cars.", "Precision where it matters, protection where it counts."):
            self.assertFalse(doc.looks_labelled(text), text)


class Corrections(unittest.TestCase):
    FIXES = [{"product": "PRINCE® A", "was": "hydrocraked", "now": "hydrocracked"}]

    def test_replaces_in_the_named_product_only(self):
        self.assertEqual(doc.correct("PRINCE® A", "a hydrocraked base", self.FIXES, set()), "a hydrocracked base")
        self.assertEqual(doc.correct("PRINCE® B", "a hydrocraked base", self.FIXES, set()), "a hydrocraked base")

    def test_one_correction_can_name_several_products(self):
        fixes = [{"product": ["PRINCE® A", "PRINCE® B"], "was": "anime-free", "now": "amine-free"}]
        self.assertEqual(doc.correct("PRINCE® B", "an anime-free coolant", fixes, set()), "an amine-free coolant")
        self.assertEqual(doc.correct("PRINCE® C", "an anime-free coolant", fixes, set()), "an anime-free coolant")

    def test_remembers_which_corrections_were_used(self):
        used = set()
        doc.correct("PRINCE® A", "hydrocraked", self.FIXES, used)
        self.assertEqual(used, {0})


if __name__ == "__main__":
    unittest.main()
