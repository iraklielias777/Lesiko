import type { LegalContent } from '../types';

/**
 * Starting copy for the four legal pages. It is a draft for the operator to
 * complete in Admin → Content → Legal, not final legal advice: every value in
 * square brackets is a fact only they know (company name, ID, address, delivery
 * times), and `{store}` / `{email}` are filled from Settings at render time.
 *
 * The body format is deliberately tiny — `## ` starts a heading, `- ` a bullet,
 * a blank line a paragraph — so the textarea needs no toolbar and nothing can
 * inject markup. lib/rich-text.tsx renders it; seo-core.ts mirrors it for bots.
 */
export const DEFAULT_LEGAL: LegalContent = {
  pages: [
    {
      key: 'terms',
      title: 'Terms of Service',
      titleKa: 'მომსახურების პირობები',
      updatedAt: '2026-09-04',
      body: `## Who we are
This store is operated by [company legal name], identification number [ID number], registered at [address], Georgia (“{store}”, “we”). You can reach us at {email}.

## Placing an order
An order placed on the site is an offer to buy. The contract is formed when your payment is confirmed and the order confirmation page is shown. We may cancel an order if a product is unavailable or a listing carried an obvious pricing error; anything already paid is refunded in full.

## Prices and payment
Prices are shown in Georgian lari (GEL) and include VAT where it applies. Delivery charges are shown before you pay. Card payments are processed by Flitt; we never see or store your card details.

## Delivery
Delivery areas, times and charges are described on the Delivery page, which forms part of these terms.

## Returns
Your right to return products and how refunds are made are described on the Returns page, which also forms part of these terms.

## Product information
We describe products as accurately as we can. Colours can differ slightly between a screen and the product itself. Always read the manufacturer's label before use and stop using a product if irritation occurs.

## Your account
You are responsible for keeping your password confidential and for activity under your account. Tell us at once if you believe someone else has used it.

## Liability
Nothing in these terms limits liability that cannot be limited under the law of Georgia. Otherwise our liability in connection with an order is limited to the amount paid for it.

## Governing law
These terms are governed by the law of Georgia. Disputes are heard by the courts of Georgia unless mandatory consumer-protection rules provide otherwise.

## Changes
We may update these terms; the version shown on this page at the time of your order applies to it.`,
      bodyKa: `## ვინ ვართ
ამ მაღაზიას მართავს [კომპანიის იურიდიული სახელი], საიდენტიფიკაციო კოდი [კოდი], იურიდიული მისამართი: [მისამართი], საქართველო („{store}“, „ჩვენ“). დაგვიკავშირდით: {email}.

## შეკვეთის განთავსება
საიტზე განთავსებული შეკვეთა ყიდვის შეთავაზებაა. ხელშეკრულება იდება გადახდის დადასტურებისა და შეკვეთის დადასტურების გვერდის ჩვენების მომენტში. ჩვენ შეგვიძლია გავაუქმოთ შეკვეთა, თუ პროდუქტი მიუწვდომელია ან განცხადებაში ფასის აშკარა შეცდომა იყო; უკვე გადახდილი თანხა სრულად ბრუნდება.

## ფასები და გადახდა
ფასები მითითებულია ქართულ ლარში (GEL) და მოიცავს დღგ-ს, სადაც ის ვრცელდება. მიწოდების ღირებულება გადახდამდე ჩანს. ბარათით გადახდას ამუშავებს Flitt; ჩვენ არასდროს ვხედავთ და არ ვინახავთ თქვენი ბარათის მონაცემებს.

## მიწოდება
მიწოდების არეალი, ვადები და ღირებულება აღწერილია მიწოდების გვერდზე, რომელიც ამ პირობების ნაწილია.

## დაბრუნება
პროდუქტის დაბრუნების უფლება და თანხის დაბრუნების წესი აღწერილია დაბრუნების გვერდზე, რომელიც ასევე ამ პირობების ნაწილია.

## ინფორმაცია პროდუქტზე
პროდუქტებს რაც შეიძლება ზუსტად ვაღწერთ. ფერი ეკრანსა და რეალურ პროდუქტს შორის შეიძლება ოდნავ განსხვავდებოდეს. გამოყენებამდე ყოველთვის წაიკითხეთ მწარმოებლის ეტიკეტი და გაღიზიანების შემთხვევაში შეწყვიტეთ გამოყენება.

## თქვენი ანგარიში
თქვენ ხართ პასუხისმგებელი პაროლის კონფიდენციალურობასა და თქვენი ანგარიშით განხორციელებულ ქმედებებზე. თუ ფიქრობთ, რომ ანგარიში სხვამ გამოიყენა, დაუყოვნებლივ შეგვატყობინეთ.

## პასუხისმგებლობა
ეს პირობები არ ზღუდავს პასუხისმგებლობას, რომლის შეზღუდვაც საქართველოს კანონმდებლობით დაუშვებელია. სხვა შემთხვევაში, შეკვეთასთან დაკავშირებული ჩვენი პასუხისმგებლობა შემოიფარგლება მისთვის გადახდილი თანხით.

## მოქმედი კანონმდებლობა
ეს პირობები რეგულირდება საქართველოს კანონმდებლობით. დავებს განიხილავს საქართველოს სასამართლო, თუ მომხმარებელთა უფლებების დაცვის იმპერატიული ნორმებით სხვა რამ არ არის დადგენილი.

## ცვლილებები
ჩვენ შეგვიძლია განვაახლოთ ეს პირობები; თქვენს შეკვეთაზე ვრცელდება შეკვეთის მომენტში ამ გვერდზე მითითებული ვერსია.`
    },
    {
      key: 'privacy',
      title: 'Privacy Policy',
      titleKa: 'კონფიდენციალურობის პოლიტიკა',
      updatedAt: '2026-09-04',
      body: `## What we collect
When you order, create an account or write to us we collect the details needed to do that: name, email address, phone number, delivery address and what you ordered. Our servers also record technical data such as your IP address and browser type.

## Why we use it
To deliver your orders and handle returns, to run your account, to answer your questions, to meet accounting and tax obligations, and — only if analytics are enabled — to understand how the site is used in aggregate.

## Who we share it with
Delivery partners receive your name, address and phone number to deliver the parcel. Flitt processes your card payment; we never receive card numbers. Our hosting providers (Supabase and Vercel) store data on our behalf under contract. We do not sell personal data.

## How long we keep it
Order records are kept for as long as accounting law requires. Account details are kept until you delete your account. Support messages are kept for two years.

## Your rights
You can ask to see, correct or delete the personal data we hold about you, and object to its use for marketing, by writing to {email}. We answer within 30 days.

## Cookies
The site uses only the storage it needs to work: your bag, your language and your sign-in session. Analytics cookies are set only if analytics are enabled, and never carry your name or contact details.

## Security
Data travels encrypted (HTTPS) and is stored with access limited to the people who need it to run the store.

## Changes
We will update this page if our practices change; the date at the top shows the latest revision.`,
      bodyKa: `## რას ვაგროვებთ
შეკვეთის, ანგარიშის შექმნის ან ჩვენთან მიმოწერისას ვაგროვებთ ამისთვის საჭირო მონაცემებს: სახელს, ელფოსტას, ტელეფონის ნომერს, მიწოდების მისამართს და შეკვეთის შინაარსს. სერვერები ასევე აფიქსირებენ ტექნიკურ მონაცემებს, მაგალითად IP მისამართსა და ბრაუზერის ტიპს.

## რატომ ვიყენებთ
შეკვეთების მიწოდებისა და დაბრუნების დასამუშავებლად, ანგარიშის სამართავად, კითხვებზე პასუხისთვის, საბუღალტრო და საგადასახადო ვალდებულებების შესასრულებლად და — მხოლოდ ანალიტიკის ჩართვის შემთხვევაში — საიტის გამოყენების ზოგადი სურათის გასაგებად.

## ვის ვუზიარებთ
მიწოდების პარტნიორები იღებენ თქვენს სახელს, მისამართსა და ტელეფონის ნომერს ამანათის მისატანად. ბარათით გადახდას ამუშავებს Flitt; ბარათის ნომერს ჩვენ არ ვიღებთ. ჰოსტინგის პროვაიდერები (Supabase და Vercel) მონაცემებს ინახავენ ჩვენი სახელით, ხელშეკრულების საფუძველზე. პერსონალურ მონაცემებს არ ვყიდით.

## რამდენ ხანს ვინახავთ
შეკვეთების ჩანაწერები ინახება საბუღალტრო კანონმდებლობით დადგენილი ვადით. ანგარიშის მონაცემები ინახება ანგარიშის წაშლამდე. მხარდაჭერის მიმოწერა ინახება ორი წელი.

## თქვენი უფლებები
შეგიძლიათ მოითხოვოთ თქვენი პერსონალური მონაცემების ნახვა, შესწორება ან წაშლა და გააპროტესტოთ მათი მარკეტინგული მიზნით გამოყენება — მოგვწერეთ: {email}. ვპასუხობთ 30 დღის ვადაში.

## ქუქიები
საიტი იყენებს მხოლოდ მუშაობისთვის აუცილებელ მეხსიერებას: კალათას, ენას და ავტორიზაციის სესიას. ანალიტიკის ქუქიები ინიშნება მხოლოდ ანალიტიკის ჩართვისას და არასდროს შეიცავს თქვენს სახელს ან საკონტაქტო მონაცემებს.

## უსაფრთხოება
მონაცემები გადაიცემა დაშიფრულად (HTTPS) და ინახება ისე, რომ წვდომა აქვთ მხოლოდ იმ პირებს, ვისაც ეს მაღაზიის სამართავად სჭირდება.

## ცვლილებები
პრაქტიკის შეცვლის შემთხვევაში ამ გვერდს განვაახლებთ; ზედა თარიღი ბოლო რედაქციას აჩვენებს.`
    },
    {
      key: 'delivery',
      title: 'Delivery',
      titleKa: 'მიწოდება',
      updatedAt: '2026-09-04',
      body: `## Where we deliver
We deliver across Georgia. Orders are dispatched from Tbilisi.

## How long it takes
Tbilisi: [1–2] working days. Other cities and regions: [2–5] working days. Orders placed before [14:00] on a working day are dispatched the same day.

## What it costs
The delivery charge, and the order value above which delivery is free, are shown in your bag and at checkout before you pay.

## Tracking
Use Track your order with your order number, or open the order in your account, to see its status. We will also call you if the courier cannot reach you.

## If something is wrong
If a parcel arrives damaged, or an item is missing, write to {email} within 3 days of delivery with your order number and a photo, and we will put it right.`,
      bodyKa: `## სად მივაწვდით
მიწოდება ხორციელდება მთელი საქართველოს მასშტაბით. შეკვეთები იგზავნება თბილისიდან.

## რამდენ ხანში
თბილისი: [1–2] სამუშაო დღე. სხვა ქალაქები და რეგიონები: [2–5] სამუშაო დღე. სამუშაო დღეს [14:00] საათამდე განთავსებული შეკვეთა იმავე დღეს იგზავნება.

## რა ღირს
მიწოდების ღირებულება და თანხა, რომლის ზემოთაც მიწოდება უფასოა, ჩანს კალათაში და გადახდამდე, შეკვეთის გაფორმებისას.

## თვალყურის დევნება
შეკვეთის სტატუსის სანახავად გამოიყენეთ „შეკვეთის თვალყური“ შეკვეთის ნომრით ან გახსენით შეკვეთა თქვენს ანგარიშში. თუ კურიერი ვერ დაგიკავშირდებათ, ჩვენ თავად დაგირეკავთ.

## თუ რამე არასწორია
თუ ამანათი დაზიანებული მოვიდა ან რომელიმე ნივთი აკლია, მოგვწერეთ {email}-ზე მიწოდებიდან 3 დღის განმავლობაში, შეკვეთის ნომრითა და ფოტოთი, და ჩვენ გამოვასწორებთ.`
    },
    {
      key: 'returns',
      title: 'Returns & Refunds',
      titleKa: 'დაბრუნება და თანხის უკან დაბრუნება',
      updatedAt: '2026-09-04',
      body: `## Unopened products
You can return an unopened product with its seal intact within 14 days of delivery for a full refund of the product price.

## Opened cosmetics
For hygiene reasons, cosmetics that have been opened, tested or used cannot be returned unless they are faulty.

## Faulty or wrong items
If a product arrives damaged, faulty or different from what you ordered, tell us within 3 days of delivery and we will replace it or refund it, including the delivery cost.

## How to start a return
Write to {email} with your order number and the reason. We will confirm the return address and, for faulty or wrong items, arrange collection. For other returns, the cost of sending the product back is yours.

## Refunds
Refunds go back to the card used to pay, within 5–10 working days of the product reaching us. Your bank may take a few more days to show it.`,
      bodyKa: `## გაუხსნელი პროდუქტი
გაუხსნელი, დაულუქავი პროდუქტის დაბრუნება შესაძლებელია მიწოდებიდან 14 დღის განმავლობაში; პროდუქტის ღირებულება სრულად ბრუნდება.

## გახსნილი კოსმეტიკა
ჰიგიენური მიზეზების გამო გახსნილი, გამოცდილი ან გამოყენებული კოსმეტიკა არ ბრუნდება, გარდა წუნდებული პროდუქტისა.

## წუნდებული ან არასწორი ნივთი
თუ პროდუქტი დაზიანებული, წუნდებული ან შეკვეთისგან განსხვავებული მოვიდა, შეგვატყობინეთ მიწოდებიდან 3 დღეში და ჩვენ შევცვლით ან თანხას დაგიბრუნებთ, მიწოდების ღირებულების ჩათვლით.

## როგორ დავიწყო დაბრუნება
მოგვწერეთ {email}-ზე შეკვეთის ნომრითა და მიზეზით. ჩვენ დაგიდასტურებთ დაბრუნების მისამართს, ხოლო წუნდებული ან არასწორი ნივთის შემთხვევაში წამოღებას მოვაწყობთ. სხვა შემთხვევაში პროდუქტის უკან გამოგზავნის ხარჯს თქვენ ფარავთ.

## თანხის დაბრუნება
თანხა ბრუნდება იმავე ბარათზე, რომლითაც გადაიხადეთ, პროდუქტის ჩვენთან მოსვლიდან 5–10 სამუშაო დღეში. ბანკს შესაძლოა კიდევ რამდენიმე დღე დასჭირდეს ასახვისთვის.`
    }
  ]
};
