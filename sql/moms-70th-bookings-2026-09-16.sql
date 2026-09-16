-- Mom's 70th (trip 6): both bases booked, applied live 2026-09-16.
-- Burleigh Court (Brimscombe, Stroud GL5 2PF) Oct 16-19; Airbnb near Lancaster
-- Gate / Paddington, hosted by Clarissa, Oct 19 3pm to Oct 25 11am.
begin;

update koji_logistics set label = 'Burleigh Court (Cotswolds)', value_md = $q$Oct 16-19 - 3 nights - [Burleigh Court](https://www.google.com/maps/search/?api=1&query=Burleigh+Court+Brimscombe+Stroud+GL5+2PF), The Roundabouts, Brimscombe, Stroud GL5 2PF. Tel [01453 883804](tel:+441453883804). If the sat nav rejects the postcode, search "Spinney Court" instead. Local taxi [01453 767878](tel:+441453767878). Stroud station is 10 minutes away by car. Booked.$q$ where id = 30;

update koji_logistics set label = 'London Airbnb', value_md = $q$Oct 19-25 - 6 nights - Check-in 3:00 PM - Check-out 11:00 AM - [Airbnb near Lancaster Gate](https://www.google.com/maps/search/?api=1&query=Lancaster+Gate+Station+London), hosted by Clarissa; the exact address and entry details are in the Airbnb app. Paddington (Heathrow Express) is about 10 minutes on foot, Lancaster Gate (Central line) about 5, and Hyde Park is across Bayswater Road. Booked.$q$ where id = 29;

update koji_logistics set value_md = $q$Everyone flies home Sun Oct 25 - Mom departs 11:20am (at the airport by ~8:20am, out of the Airbnb by ~7:45am), Nathan & Dez 3:20pm (at the airport by ~12:20pm), Marshall & Francesca 5:05pm (~2:00pm). Airbnb checkout is 11am; bags can wait at the left-luggage counter in [Paddington](https://www.google.com/maps/search/?api=1&query=Paddington+Station+London) station. Mom's early flight is why the trip ends in London rather than the Cotswolds.$q$ where id = 112;

update koji_stops set body_md = $q$Marshall and Francesca land last, at 10:15am. Collect bags, pick up the rental at a [Heathrow](https://www.google.com/maps/search/?api=1&query=Heathrow+Airport+car+rental) depot, and head west. The Cotswolds are about 1h45 by road and the route skips London. Without a car: Heathrow Express to [Paddington](https://www.google.com/maps/search/?api=1&query=Paddington+Station+London), a direct train to [Stroud](https://www.google.com/maps/search/?api=1&query=Stroud+Railway+Station) (~1h20), then a 10-minute taxi to the hotel ([01453 767878](tel:+441453767878)).$q$ where id = 177;

update koji_stops set body_md = $q$Check in at [Burleigh Court](https://www.google.com/maps/search/?api=1&query=Burleigh+Court+Brimscombe+Stroud+GL5+2PF), a country house hotel at The Roundabouts, Brimscombe, on the hill between Stroud and Minchinhampton (tel [01453 883804](tel:+441453883804); if the sat nav rejects GL5 2PF, search "Spinney Court"). Cirencester is about 20 minutes away; Stow, Bourton, and the Slaughters are a 35 to 40 minute drive north. Ask about early rooms at lunch.$q$ where id = 179;

update koji_stops set body_md = $q$Dinner in [The Burleigh Restaurant](https://www.google.com/maps/search/?api=1&query=Burleigh+Court+Brimscombe+Stroud+GL5+2PF) at the hotel the first night keeps everyone off the road and in bed early. Two alternatives if the group has the energy: [Prithvi](https://www.google.com/maps/search/?api=1&query=Prithvi+Cheltenham) in Cheltenham (about 30 minutes), a Michelin-starred modern Indian restaurant, and [The Woolpack](https://www.google.com/maps/search/?api=1&query=The+Woolpack+Inn+Slad) in Slad (about 15 minutes), the village pub Laurie Lee wrote about and drank in. *Reserve either way.*$q$ where id = 181;

update koji_stops set body_md = $q$Check out and head to London. Either return the rental near [Paddington](https://www.google.com/maps/search/?api=1&query=Paddington+Station+London), or take a 10-minute taxi to [Stroud](https://www.google.com/maps/search/?api=1&query=Stroud+Railway+Station) and the direct train to Paddington (~1h20). The Airbnb is a 10-minute walk from Paddington and check-in is 3pm, so plan on lunch before the flat rather than a bag drop.$q$ where id = 488;

update koji_stops set title = 'Settle into the Airbnb', body_md = $q$Check-in at the [Airbnb](https://www.google.com/maps/search/?api=1&query=Lancaster+Gate+Station+London) opens at 3pm (address and entry details in the Airbnb app). Drop bags, tea or a nap, and regroup at 4:45 for the walk to the Abbey.$q$ where id = 147;

update koji_stops set body_md = $q$Last night with all five together. Nothing booked yet; keep it near Paddington or Lancaster Gate since Mom leaves early. A Saturday night means booking ahead.$q$ where id = 480;

update koji_stops set body_md = $q$Delta 17 departs at **11:20am** (a schedule change from 1:00pm). Be at [Heathrow Airport](https://www.google.com/maps/search/?api=1&query=Heathrow+Airport+London) by about 8:20am: leave the Airbnb around 7:45am, walk or taxi the 10 minutes to [Paddington](https://www.google.com/maps/search/?api=1&query=Paddington+Station+London), and take the Heathrow Express (15 minutes, every 15 minutes).$q$ where id = 481;

update koji_stops set body_md = $q$United 935 departs at **3:20pm**; be at [Heathrow Airport](https://www.google.com/maps/search/?api=1&query=Heathrow+Airport+London) by about 12:20pm. Airbnb checkout is 11am.$q$ where id = 482;

update koji_stops set body_md = $q$Virgin Atlantic 23 departs at **5:05pm**; be at [Heathrow Airport](https://www.google.com/maps/search/?api=1&query=Heathrow+Airport+London) by about 2:00pm. Checkout is 11am, so leave bags at the left-luggage counter in [Paddington](https://www.google.com/maps/search/?api=1&query=Paddington+Station+London) and take a last walk in Hyde Park.$q$ where id = 483;

-- Day 1 has no location; its weather badge was London's. Blank it rather than
-- pick one of three departure cities (the app skips days without coordinates
-- only when the trip itself has none, so this is a no-op for now; recorded for
-- when koji_days gets a per-day "no weather" flag).

commit;
