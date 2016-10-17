import chroma from 'chroma-js';
import L from 'leaflet';
import * as topojson from 'topojson';

const mapDataRequest = fetch('data/ne_50m_admin_0_countries_wo_antarctica.json')
	.then((res) => res.json());

const warDataRequest = fetch('data/wars.json')
	.then((res) => res.json());

Promise.all([ mapDataRequest, warDataRequest ])
	.then(function ([ mapData, warData ]) {

		const colorScale = chroma
			.scale(['#ffd8d8', '#ff6464'])
			.domain([0, 50000000]);

		const map = L.map('world').setView([45, 0], 2);
		const topoLayer = new L.GeoJSON(undefined, {
			style: {
				fillColor: 'white',
				fillOpacity: 1,
				color: 'black',
				weight: 1,
				opacity: 0.1
			}
		});

		for (const key of Object.keys(mapData.objects)) {
			const geojson = topojson.feature(mapData, mapData.objects[key]);
			topoLayer.addData(geojson);
		}

		topoLayer.eachLayer(function (layer) {
			const inWars = warData.filter(function (war) {
				return war.nations.includes(layer.feature.id);
			});

			const countriesAffected = {};

			inWars.forEach(function (war) {
				war.nations.forEach(function (country) {
					// Don't include self
					if (country === layer.feature.id) {
						return;
					}

					if (!countriesAffected[country]) {
						countriesAffected[country] = 0;
					}

					countriesAffected[country] += war.deaths;
				});
			});

			layer.on({
				mouseover() {
					layer.setStyle({
						fillColor: '#a2a2ff'
					});

					eachLayerWithIds(Object.keys(countriesAffected), function (layer, id) {
						layer.setStyle({
							fillColor: colorScale(countriesAffected[id])
						});
					});
				},
				mouseout(e) {
					topoLayer.resetStyle(e.target);

					eachLayerWithIds(Object.keys(countriesAffected), function (layer) {
						topoLayer.resetStyle(layer);
					});
				}
			});
		});

		topoLayer.addTo(map);

		function eachLayerWithIds(ids, cb) {
			topoLayer.eachLayer(function (layer) {
				if (ids.includes(layer.feature.id)) {
					cb(layer, layer.feature.id);
				}
			});
		}
	});