import { Component, OnInit } from '@angular/core';
import { NzDrawerService } from 'ng-zorro-antd/drawer';
import * as L from 'leaflet';

import { Garden } from 'src/app/classes/garden';

import { GardensService } from 'src/app/services/gardens/gardens.service';

import { GardenMapComponent } from './garden/garden.map.component';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {
  public map;
  private layerGroup;

  constructor(
    private gardensService: GardensService,
    private drawerService: NzDrawerService
  ) {}

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
            {
              icon,
              title: garden.name,
              data: garden
            }
          )
            .on('click', this.markerOnClick)
            .addTo(this.layerGroup);
        });
      });
    });
  }

  public markerOnClick = (event) => {
    const garden = event.target.options.data;
    const drawerRef = this.drawerService.create<GardenMapComponent, { garden: Garden }, Garden>({
      nzTitle: garden.name,
      nzContent: GardenMapComponent,
      nzWidth: 640,
      nzContentParams: { garden }
    });
  }
}
