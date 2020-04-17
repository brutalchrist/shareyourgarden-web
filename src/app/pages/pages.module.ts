import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

import { PagesRoutingModule } from './pages.route';

@NgModule({
  declarations: [ ],
  imports: [
    PagesRoutingModule,
    RouterModule,
    CommonModule
  ],
  providers: [],
  exports: []
})
export class PagesModule { }
