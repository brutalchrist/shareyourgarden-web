import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { MapComponent } from './component/map.component';
import { MapRoutingModule } from './map.route';

@NgModule({
  declarations: [ MapComponent ],
  imports: [
    MapRoutingModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule
  ],
  providers: [],
  exports: [ FormsModule ]
})
export class MapModule { }
