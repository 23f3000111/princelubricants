'use strict';
/*
 * The product types of each category that has a client document, by their ids in
 * docs/content/products.json. When a document arrives for another category, add its types
 * here; build-catalogue.js stops with the missing ids until every type has an entry.
 *
 *   h1           the title, in the document's words, with the part that goes gold
 *   holds        what the type holds, for its tile
 *   lede         one line about it, made from the document's own terms
 *   title        the page title, under 65 characters with the brand
 *   description  the search description, under 160 characters
 *   packs        the pack shots that stand for it: left, front, right (or two)
 *   icon         the inside of a 24 x 24 line icon
 */
module.exports = {
  'passenger-car': {
    'flagship-ester-based-engine-oils': {
      h1: 'Flagship Ester Based <span>Engine Oils</span>',
      holds: 'FS1 · FS1 EUROGEN · FS1 TECHNICA',
      lede: 'P-9 Ester-Based fully synthetic engine oils: the FS1, FS1 EUROGEN and FS1 TECHNICA series, in grades from SAE 0W-20 to SAE 5W-40.',
      title: 'Flagship Ester Based Engine Oils | PRINCE LUBRICANTS',
      description: 'PRINCE P-9 Ester-Based fully synthetic engine oils: FS1, FS1 EUROGEN and FS1 TECHNICA, SAE 0W-20 to 5W-40, with their API, ACEA and OEM specifications.',
      packs: ['fs1-mid-sap-4l-5w-30', 'fs1-4l-5w-30', 'fs1-4l-0w-40'],
      icon: '<path d="M12 2.8c3.6 4.3 6 7.4 6 11a6 6 0 0 1-12 0c0-3.6 2.4-6.7 6-11Z"/><path d="m12 10.2 1 2.1 2.4.4-1.7 1.6.4 2.3-2.1-1.1-2.1 1.1.4-2.3-1.7-1.6 2.4-.4Z"/>',
    },
    'passenger-car-engine-oils': {
      h1: 'Passenger Car <span>Engine Oils</span>',
      holds: 'FSe · FS SUPER · SS1 · SS SUPER · M1',
      lede: 'Fully synthetic, synthetic, semi-synthetic and premium mineral engine oils: the FSe, FS SUPER, SS1, SS SUPER and M1 series, in grades from SAE 0W-16 to SAE 15W-40.',
      title: 'Passenger Car Engine Oils | PRINCE LUBRICANTS',
      description: 'PRINCE engine oils for passenger cars: FSe, FS SUPER, SS1, SS SUPER and M1, from fully synthetic SAE 0W-16 to premium mineral SAE 15W-40.',
      packs: ['ss1-4l-10w-40', 'fse-4l-0w-20', 'fs-super-sp-4l-5w-40'],
      icon: '<path d="M4 12.5 5.8 7.6a2 2 0 0 1 1.9-1.3h8.6a2 2 0 0 1 1.9 1.3L20 12.5"/><path d="M3.2 12.5h17.6v5H3.2zM5 17.5v2M19 17.5v2M6.8 15h.01M17.2 15h.01"/>',
    },
    'automatic-transmission-fluids': {
      h1: 'Automatic Transmission <span>Fluids (ATF)</span>',
      holds: 'ATF EUROSPEC · ATF · DCT · CVT',
      lede: 'Fluids for automatic, dual-clutch and continuously variable transmissions: the ATF EUROSPEC series, ATF 10, ATF 6, ATF 3H, multi-vehicle ATF, DCT MAGNA LV, DCT PLUS and CVT FE.',
      title: 'Automatic Transmission Fluids (ATF) | PRINCE LUBRICANTS',
      description: 'PRINCE automatic transmission fluids: ATF EUROSPEC 9HP to 7GT, ATF 10 MERCON ULV, ATF 6, multi-vehicle ATF, DCT MAGNA LV, DCT PLUS and CVT FE.',
      packs: ['atf-dct-1l', 'atf-10-1l', 'atf-cvt-fe-1l'],
      icon: '<circle cx="12" cy="12" r="6.2"/><circle cx="12" cy="12" r="2.4"/><path d="M12 2.6v3.2M12 18.2v3.2M2.6 12h3.2M18.2 12h3.2M5.4 5.4l2.2 2.2M16.4 16.4l2.2 2.2M18.6 5.4l-2.2 2.2M7.6 16.4l-2.2 2.2"/>',
    },
    'manual-transmission-oils': {
      h1: 'Manual <span>Transmission Oils</span>',
      holds: 'PRO-SHIFT MTF',
      lede: 'PRO-SHIFT MTF: fully synthetic API GL-4 manual transmission fluids in SAE 75W, SAE 75W-80 and SAE 75W-85.',
      title: 'Manual Transmission Oils | PRINCE LUBRICANTS',
      description: 'PRINCE PRO-SHIFT MTF: fully synthetic API GL-4 manual transmission fluids in SAE 75W, SAE 75W-80 and SAE 75W-85, with their OEM specifications.',
      packs: ['pro-shift-mtf-1l-75w', 'pro-shift-mtf-1l-75w-80'],
      icon: '<path d="M5 6v12M12 6v12M19 6v6M5 12h14"/><circle cx="5" cy="4.2" r="1.7"/><circle cx="12" cy="4.2" r="1.7"/><circle cx="19" cy="4.2" r="1.7"/><circle cx="5" cy="19.8" r="1.7"/><circle cx="12" cy="19.8" r="1.7"/>',
    },
    'differential-and-hypoid-gear-oils': {
      h1: 'Differential &amp; Hypoid <span>Gear Oils</span>',
      holds: 'SUPER-SHIFT',
      lede: 'SUPER-SHIFT gear oils for differentials, hypoid axles, final drives and manual gearboxes: API GL-4 and GL-5 grades, with limited-slip (+LSD) versions.',
      title: 'Differential & Hypoid Gear Oils | PRINCE LUBRICANTS',
      description: 'PRINCE SUPER-SHIFT gear oils for differentials, hypoid axles and gearboxes: API GL-4, GL-5 and limited-slip +LSD grades from SAE 75W-80 to 85W-90.',
      packs: ['super-shift-gl4-1l-75w-80', 'super-shift-gl5-1l-75w-90', 'super-shift-lsd-1l-75w-140'],
      icon: '<circle cx="8.6" cy="12" r="5.4"/><circle cx="8.6" cy="12" r="1.8"/><path d="M14 9.3 20.5 6v12L14 14.7M17.2 7.7v8.6"/>',
    },
    'hydraulic-and-power-steering-fluids': {
      h1: 'Hydraulic &amp; Power Steering <span>Fluids</span>',
      holds: 'CHF 11S · Power Steering Fluid',
      lede: 'Central hydraulic fluid CHF 11S, and multi-vehicle power steering fluid with and without stop leak.',
      title: 'Hydraulic & Power Steering Fluids | PRINCE LUBRICANTS',
      description: 'PRINCE central hydraulic fluid CHF 11S and multi-vehicle power steering fluid, with and without stop leak, with their OEM specifications.',
      packs: ['power-steering-fluid-1l', 'hydraulic-fluid-1l', 'power-steering-fluid-wsl-1l'],
      icon: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.3"/><path d="M3.3 10.2c5.2-1.5 12.2-1.5 17.4 0M12 14.3V21M9.9 13l-5.4 4M14.1 13l5.4 4"/>',
    },
    'brake-and-clutch-fluids': {
      h1: 'Brake &amp; Clutch <span>Fluids</span>',
      holds: 'DOT 5.1 · DOT 4 · DOT 3',
      lede: 'Non-silicone brake and clutch fluids to FMVSS 116 DOT 5.1, DOT 4 and DOT 3.',
      title: 'Brake & Clutch Fluids DOT 3, 4 & 5.1 | PRINCE LUBRICANTS',
      description: 'PRINCE non-silicone brake and clutch fluids to FMVSS 116 DOT 5.1, DOT 4 and DOT 3, with their ISO 4925 and SAE standards.',
      packs: ['dot4-1l', 'dot5-1-1l', 'dot3-1l'],
      icon: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 6v.01M16.2 7.8v.01M18 12v.01M16.2 16.2v.01M12 18v.01M7.8 16.2v.01M6 12v.01M7.8 7.8v.01"/>',
    },
    'antifreeze-and-coolants': {
      h1: 'Antifreeze <span>&amp; Coolants</span>',
      holds: 'G11 · G12/G12+ · G12++/G13 · G12 EVO',
      lede: 'Premixed 50/50 antifreeze coolants with freeze protection down to −37°C: G11, G12/G12+, G12++/G13 and G12 EVO.',
      title: 'Antifreeze & Coolants G11, G12, G13 | PRINCE LUBRICANTS',
      description: 'PRINCE premixed 50/50 antifreeze coolants with freeze protection down to −37°C: G11, G12/G12+, G12++/G13 and G12 EVO, with their OEM specifications.',
      packs: ['g11-iat-1l', 'g12-plus-oat-1l', 'g13-oat'],
      icon: '<path d="M12 2.5v19M3.8 7.25l16.4 9.5M20.2 7.25l-16.4 9.5"/><path d="m9.4 4.6 2.6 2 2.6-2M9.4 19.4l2.6-2 2.6 2M3.9 11.1l3-1.2-.5-3.2M20.1 12.9l-3 1.2.5 3.2M20.1 11.1l-3-1.2.5-3.2M3.9 12.9l3 1.2-.5 3.2"/>',
    },
  },
};
