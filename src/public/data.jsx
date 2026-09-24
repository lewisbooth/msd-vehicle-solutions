import React from 'react';

export const categories = [
  ['all', 'All vehicles'], ['all-cars', 'All cars'], ['all-vans', 'All vans'],
  ['car-economy', 'Economy car'], ['car-hatchback', 'Hatchback'], ['car-saloon', 'Saloon'],
  ['car-performance', 'Performance car'], ['car-suv', 'SUV'], ['car-truck', 'Truck'],
  ['car-minibus', 'Minibus'], ['van-small', 'Small van'], ['van-medium', 'Medium van'],
  ['van-large', 'Large van'], ['van-luton', 'Luton van']
];

export const coverImages = {
  '/': ['van-hire.jpg', 'van-hire-600.jpg'],
  '/sales': ['vehicle-sales.jpg', 'vehicle-sales-600.jpg'],
  '/leasing': ['vehicle-leasing.jpg', 'vehicle-leasing-600.jpg'],
  '/customs': ['custom-commercials.jpg', 'custom-commercials-600.jpg'],
  '/servicing': ['vehicle-servicing.jpg', 'vehicle-servicing-600.jpg'],
  '/contact': ['contact.jpg', 'contact-600.jpg'],
  '/van-sizes': ['loading-packages-into-van.jpg', 'loading-packages-into-van-600.jpg']
};

export const serviceCards = [
  { title: 'Car & van hire', path: '/', image: 'hire.jpg', body: 'Flexible daily and weekly hire, whether for work, moving house or getting away.' },
  { title: 'Vehicle sales', path: '/sales', image: 'sales.jpg', body: 'Explore our changing selection of new and used cars and vans.' },
  { title: 'Vehicle leasing', path: '/leasing', image: 'leasing.jpg', body: 'Personal and business lease options with a predictable monthly cost.' },
  { title: 'Custom vehicles', path: '/customs', image: 'vehicle-modifications.jpg', body: 'Bespoke van conversions, ply-lining, joinery and modifications.' },
  { title: 'Servicing & tyres', path: '/servicing', image: 'tyres-and-servicing.jpg', body: 'Vehicle servicing, repairs, tyres and wheel alignment from our own garage.' }
];

export const pages = {
  '/': {
    heading: 'Car & van hire in Stoke-on-Trent', eyebrow: 'Moorland Self Drive',
    lead: 'Flexible car and van hire, from a family business that has served Staffordshire since 1986.',
    intro: <>Moorland Self Drive has offered flexible car and van <a href="/">hire</a>, <a href="/sales">sales</a> and <a href="/leasing">leasing</a> for personal and commercial use across Staffordshire since 1986. Today we offer bespoke vehicle <a href="/customs">modifications</a> and <a href="/servicing">servicing</a> through our on-site MSD Custom Commercials garage. Whatever the job, call us or drop in today to see what we have to offer.</>,
    features: [
      { title: 'Cars for hire', image: 'sales/cars-for-sale.jpg', alt: 'Lineup of cars', text: 'Hire the perfect car for your next family holiday, business trip or weekend adventure.', href: '/vehicles/listing/hire?size=all-cars', cta: 'See car deals' },
      { title: 'Vans for hire', image: 'sales/vans-for-sale.jpg', alt: 'Lineup of vans', text: 'Choose from a range of self-drive vans, great for furniture shopping, delivering parcels or moving house.', href: '/vehicles/listing/hire?size=all-vans', cta: 'See van deals' }
    ],
    whyTitle: 'Why hire with Moorland Self Drive?',
    why: ['Short and long-term hire', 'Clean, low-mileage vehicles', 'Open 7 days a week', 'Business and personal use', 'Tough ply-lined vans', 'Simple all-in-one pricing', 'Reliable family-run service'],
    featured: 'hire', featuredHeading: 'Latest hire deals'
  },
  '/sales': {
    heading: 'New & used vehicles for sale', eyebrow: 'Vehicle sales',
    lead: 'Find your next car or van with a local team that knows its vehicles.',
    intro: <>With more than 30 years of family-run vehicle sales, we are proud to deliver attentive service and competitive prices. Our selection of <a href="/vehicles/listing/sales?size=all-cars">cars</a> and <a href="/vehicles/listing/sales?size=all-vans">vans</a> changes regularly, and many are also available to <a href="/leasing">lease</a> or <a href="/">hire</a>.</>,
    features: [
      { title: 'Cars for sale', image: 'sales/cars-for-sale.jpg', alt: 'Lineup of cars', text: 'Find a car that suits your day-to-day life and drive it away with confidence.', href: '/vehicles/listing/sales?size=all-cars', cta: 'See car deals' },
      { title: 'Vans for sale', image: 'sales/vans-for-sale.jpg', alt: 'Lineup of vans', text: 'Browse vans in a range of shapes and sizes for your business or personal use.', href: '/vehicles/listing/sales?size=all-vans', cta: 'See van deals' }
    ],
    whyTitle: 'Why buy with Moorland Self Drive?',
    why: ['MOT certificate', 'HPI clear', 'Full valet', 'Flexible finance', 'Warranties available', 'On-site servicing and repair'],
    featured: 'sales', featuredHeading: 'Latest vehicles for sale'
  },
  '/leasing': {
    heading: 'Car & van leasing deals', eyebrow: 'Vehicle leasing',
    lead: 'A vehicle that fits your needs, with an affordable fixed monthly cost.',
    intro: <>Our business and personal leasing deals cover a range of cars and vans. Our flexible options include Personal Contract Purchase (PCP), Hire Purchase (HP), Personal Contract Hire (PCH) and Business Contract Hire (BCH). Many vehicles are also available to <a href="/">hire</a> or <a href="/sales">buy</a>.</>,
    features: [
      { title: 'Cars for lease', image: 'sales/cars-for-sale.jpg', alt: 'Lineup of cars', text: 'Browse our current selection of affordable car lease deals.', href: '/vehicles/listing/lease?size=all-cars', cta: 'See car deals' },
      { title: 'Vans for lease', image: 'sales/vans-for-sale.jpg', alt: 'Lineup of vans', text: 'Find a van lease deal for the job you need to do.', href: '/vehicles/listing/lease?size=all-vans', cta: 'See van deals' }
    ],
    whyTitle: 'Why lease with Moorland Self Drive?',
    why: ['Business or personal use', 'Affordable fixed monthly cost', 'Servicing packages', 'Tax and MOT packages', 'Flexible finance', 'Friendly local advice'],
    featured: 'lease', featuredHeading: 'Latest lease deals'
  },
  '/customs': {
    heading: 'Van conversions & custom vehicles', eyebrow: 'MSD Custom Commercials',
    lead: 'Built around how you work, travel and live.',
    intro: <>Our custom van conversions and joinery can turn your vehicle into a practical work van or a comfortable home for camping and travel. Add a bulkhead and tinted windows, or make the interior durable with ply-lined storage. See our recent work on <a href="https://www.facebook.com/msdcustomcommercials" target="_blank" rel="noreferrer">Facebook</a> and <a href="https://www.instagram.com/msdcustomcommercials" target="_blank" rel="noreferrer">Instagram</a>.</>,
    features: [{ title: 'A van that works for you', image: 'van-conversions/vw-transporter-watermark.jpg', alt: 'Custom Volkswagen Transporter', text: 'Our garage handles bespoke conversions, joinery and laser cutting. Tell us what you have in mind and we will work through the options with you.', href: '/contact', cta: 'Talk to the team' }],
    whyTitle: 'Van conversion services',
    why: ['Bespoke conversions', 'Ply-lining', 'Bulkheads', 'Custom joinery and units', 'Window tinting', 'Air suspension', 'Electronics and stereos', 'Beds and camping interiors', 'Animal transport', 'Tow bars and roof racks']
  },
  '/servicing': {
    heading: 'Vehicle service & repair centre', eyebrow: 'MSD Custom Commercials',
    lead: 'Care for your car or van from an experienced local team.',
    intro: <>Regular servicing and maintenance helps protect your vehicle. From high-performance cars to everyday vans, our mechanics work on many makes and models. Whether you need a full service, a fluid top-up or a tyre change, call our garage to discuss what needs doing.</>,
    features: [{ title: 'Experienced mechanics, close to home', image: 'servicing/m3-oil-filter.jpg', alt: 'Mechanic working on a vehicle', text: 'Maintenance and repairs from an on-site workshop in Knypersley.', href: '/contact', cta: 'Get in touch' }],
    whyTitle: 'Maintenance services',
    why: ['Full service', 'Tyre change and rotation', 'Oil and filter change', 'Bodywork repairs', 'Fluid top-up', 'Wheel alignment and balance', 'Spark plugs', 'Tracking adjustment', 'Air and fuel filters', 'Brake pads']
  },
  '/van-sizes': {
    heading: 'Which van should you choose?', eyebrow: 'Van size guide',
    lead: 'Pick the right van for the job, from a few tools to an entire house move.',
    intro: <>Whether you are moving furniture, delivering parcels or carrying tools, our vans are ready for the job. Use this guide to choose the most suitable size, or <a href="/contact">give us a call</a> if you are unsure. Each vehicle listing shows its individual dimensions and load capacity.</>,
    features: [
      { title: 'Small van', image: 'van-sizes/small-van.jpg', alt: 'Small van', text: 'Items up to 120cm, tools and DIY projects. Typically two seats.', href: '/vehicles/listing/hire?size=van-small', cta: 'Hire a small van' },
      { title: 'Medium van', image: 'van-sizes/medium-van.jpg', alt: 'Medium van', text: 'Items up to 240cm, including some sofas and mattresses. Typically three seats.', href: '/vehicles/listing/hire?size=van-medium', cta: 'Hire a medium van' },
      { title: 'Large van', image: 'van-sizes/large-van.jpg', alt: 'Large van', text: 'Items up to 400cm and multiple furniture items. Typically three seats.', href: '/vehicles/listing/hire?size=van-large', cta: 'Hire a large van' },
      { title: 'Luton van', image: 'van-sizes/xl-van.jpg', alt: 'Luton van', text: 'Extra load space for moving house, with a tail lift on selected vehicles.', href: '/vehicles/listing/hire?size=van-luton', cta: 'Hire a Luton van' }
    ],
    whyTitle: 'Ready to book?', why: ['Check the dimensions of each vehicle', 'Ask about access and loading', 'Call our team on 01782 517782']
  }
};
