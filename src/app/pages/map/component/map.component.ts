import { Component, OnInit } from '@angular/core';
import { NzDrawerService } from 'ng-zorro-antd/drawer';
import * as L from 'leaflet';

import { Garden } from 'src/app/classes/garden';

import { GardensService } from 'src/app/services/gardens/gardens.service';

import { GardenMapComponent } from './garden/garden.map.component';
import { SearchService } from 'src/app/services/search/search.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {
  private searchText = '';
  public map;
  private layerGroup;
  private bounds;

  constructor(
    private gardensService: GardensService,
    private drawerService: NzDrawerService,
    private searchService: SearchService
  ) {}

  ngOnInit(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        this.initMap(position);
      });
    }

    this.searchService.change.subscribe(search => {
      this.searchText = search;
      this.searchGardens();
    });
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
      this.bounds = this.map.getBounds();
      this.searchGardens();
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

  private searchGardens() {
    this.gardensService.getFromBounds(this.bounds, this.searchText).subscribe(gardens => {
      this.layerGroup.clearLayers();
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
  }
}
