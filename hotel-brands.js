/* Hotel brands by chain, for the Brand picker on the Hotel step.
   From general knowledge, not a live source; edit freely. A chain is matched when the chain name the user picked
   (from their own Setup programs) contains one of the "match" words (case-insensitive); first match wins. */
window.CROSSWIND_HOTEL_BRANDS = [
  { match: ['marriott', 'bonvoy'], brands: ['Courtyard', 'Residence Inn', 'Fairfield', 'TownePlace Suites', 'SpringHill Suites', 'Marriott', 'Sheraton', 'Four Points', 'Element', 'Aloft', 'Renaissance', 'AC Hotels', 'Westin', 'Ritz-Carlton'] },
  { match: ['hilton'], brands: ['Hampton', 'Hilton Garden Inn', 'Homewood Suites', 'Home2 Suites', 'DoubleTree', 'Embassy Suites', 'Hilton', 'Tru', 'Canopy', 'Curio', 'Conrad', 'Waldorf Astoria'] },
  { match: ['ihg'], brands: ['Holiday Inn Express', 'Holiday Inn', 'Candlewood Suites', 'Staybridge Suites', 'Crowne Plaza', 'Hotel Indigo', 'avid', 'EVEN Hotels', 'InterContinental', 'Kimpton'] },
  { match: ['hyatt'], brands: ['Hyatt Place', 'Hyatt House', 'Hyatt Regency', 'Grand Hyatt', 'Park Hyatt', 'Hyatt Centric', 'Andaz'] },
  { match: ['best western'], brands: ['Best Western', 'Best Western Plus', 'Best Western Premier', 'SureStay', 'SureStay Plus', 'SureStay Collection'] },
  { match: ['wyndham'], brands: ['Days Inn', 'Super 8', 'La Quinta', 'Ramada', 'Wingate', 'Microtel', 'Baymont', 'Howard Johnson', 'Travelodge', 'AmericInn', 'Wyndham', 'Wyndham Garden', 'Wyndham Grand', 'Hawthorn Suites'] },
  { match: ['choice'], brands: ['Comfort Inn', 'Comfort Suites', 'Quality Inn', 'Sleep Inn', 'Clarion', 'Econo Lodge', 'Rodeway Inn', 'MainStay Suites', 'Cambria', 'WoodSpring Suites', 'Suburban Studios'] },
  { match: ['radisson'], brands: ['Radisson', 'Radisson Blu', 'Radisson RED', 'Country Inn & Suites', 'Park Inn', 'Park Plaza'] }
];

/* Major hotel chains for the Chain dropdown on the Hotel step, listed after the user's own programs.
   A chain is left out when one of the user's programs contains one of its "match" words (case-insensitive). */
window.CROSSWIND_MAJOR_HOTEL_CHAINS = [
  { name: 'Best Western', match: ['best western'] },
  { name: 'Choice Hotels', match: ['choice'] },
  { name: 'Drury Hotels', match: ['drury'] },
  { name: 'Extended Stay America', match: ['extended stay'] },
  { name: 'Hilton', match: ['hilton'] },
  { name: 'Hyatt', match: ['hyatt'] },
  { name: 'IHG', match: ['ihg', 'holiday inn'] },
  { name: 'Marriott', match: ['marriott', 'bonvoy'] },
  { name: 'Radisson', match: ['radisson'] },
  { name: 'Red Roof', match: ['red roof'] },
  { name: 'Wyndham', match: ['wyndham'] }
];
