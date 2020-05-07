import { Component, Input } from '@angular/core';
import { NzDrawerRef } from 'ng-zorro-antd/drawer';

import { Garden } from 'src/app/classes/garden';

@Component({
  selector: 'app-garden-map',
  templateUrl: './garden.map.component.html',
  styleUrls: ['./garden.map.component.scss']
})
export class GardenMapComponent {
  @Input() garden: Garden;

  constructor(private drawerRef: NzDrawerRef<Garden>) {}

  close(): void {
    this.drawerRef.close(this.garden);
  }
}
