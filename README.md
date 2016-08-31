# city-namer

<img src="http://i.imgur.com/xXSdvdj.png" alt="Application screenshot"/>

Concept: browse OpenStreetMap and find city names to localize into a
target-language.

Current status: loads place=* tags from OSM Overpass API, sorts them, and lets
you cycle through them.

Needs: optional update on map-move, close-up views of locations, neater form, and
mobile-friendly UI.

## Pilot projects

### Adding Nepali language names around Kathmandu

Kathmandu is mapped in remarkable detail, thanks to contributions from local and
remote mappers, before and after the 2015 earthquake.

Some places have an English name only, or an English name first, where it is
possible to support both and potentially show the local Nepali name first.

## Major libraries

Server-side

* <a href="https://expressjs.com/">ExpressJS</a> for server / routing
* <a href="http://mongoosejs.com/">MongooseJS</a> for MongoDB database and sessions
* Jade for page templating
* Passport for user authentication

Client-side

* jQuery, Select2, Bootstrap UI
* Leaflet maps
* <a href="https://github.com/osmlab/osm-auth">osm-auth</a> from osmlab

## License

Open source, MIT license
