-- Four URLs seeded in 0004/0011 now 404 on Unsplash, leaving broken tiles on
-- the homepage and one product card. Swapped for ids verified to return 200.

update public.products
   set images = replace(images::text,
         'photo-1631729371254-42c2a89dd40d',
         'photo-1503236823255-94609f598e71')::jsonb
 where images::text like '%photo-1631729371254-42c2a89dd40d%';

update public.categories
   set image = 'https://images.unsplash.com/photo-1556227834-09f1de7a7d14?auto=format&fit=crop&q=80&w=800'
 where slug = 'body-hands';

update public.categories
   set image = 'https://images.unsplash.com/photo-1503236823255-94609f598e71?auto=format&fit=crop&q=80&w=800'
 where slug = 'brushes';

update public.site_content
   set content = replace(content::text,
         'photo-1551024601-562963341c54',
         'photo-1580870069867-74c57ee1bb07')::jsonb
 where key = 'homepage_skin_types';

update public.site_content
   set content = replace(content::text,
         'photo-1596462502278-27bfdd403348',
         'photo-1613966802194-d46a163af70d')::jsonb
 where key = 'social_content';
