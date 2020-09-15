import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { RestService } from './rest/rest.service';
import { SearchService } from './search/search.service';

@NgModule({
  imports: [HttpClientModule],
  providers: [
    RestService,
    SearchService
  ]
})
export class ServicesModule { }
