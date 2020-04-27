import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import { GardensService } from 'src/app/services/gardens/gardens.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {
  public map;
  private layerGroup;

  constructor(private gardensService: GardensService) {}

  ngOnInit(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        this.initMap(position);
      });
    }
  }

  private initMap(position): void {
    this.map = L.map('map', {
      center: [ position.coords.latitude, position.coords.longitude ],
      zoom: 18
    });
    const tiles = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 16,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }
    );

    tiles.addTo(this.map);

    this.layerGroup = L.layerGroup().addTo(this.map);

    this.map.on('moveend', () => {
      const bounds = this.map.getBounds();

      this.layerGroup.clearLayers();

      this.gardensService.getFromBounds(bounds).subscribe(gardens => {
        gardens.map(garden => {
          const icon = L.icon({
            iconSize: [ 25, 41 ],
            iconAnchor: [ 13, 0 ],
            iconUrl: 'leaflet/marker-icon.png',
            shadowUrl: 'leaflet/marker-shadow.png'
          });

          L.marker(
            [garden.location.coordinates[1], garden.location.coordinates[0]],
            { icon }
          )
            .addTo(this.layerGroup);
        });
      });
    });
  }
}
