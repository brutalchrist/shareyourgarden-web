import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';

import { MapRoutingModule } from './map.route';

import { MapComponent } from './component/map.component';
import { GardenMapComponent } from './component/garden/garden.map.component';

@NgModule({
  declarations: [ MapComponent, GardenMapComponent ],
  imports: [
    MapRoutingModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    NzDrawerModule,
    NzTableModule,
    NzTabsModule,
    NzDescriptionsModule
  ],
  providers: [],
  exports: [ FormsModule ]
})
export class MapModule { }
