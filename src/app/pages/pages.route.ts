import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'map',
    loadChildren: () => import('./map/map.module').then(m => m.MapModule),
    pathMatch: 'full'
  },
  // {
  //   path: 'book',
  //   loadChildren: () => import('./book/book.module').then(m => m.BookModule)
  // },
  // {
  //   path: 'configs',
  //   loadChildren: () => import('./configs/configs.module').then(m => m.ConfigsModule)
  // },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PagesRoutingModule { }
