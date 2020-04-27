import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import LatLngBounds from 'leaflet';

import { Garden } from 'src/app/classes/garden';
import { RestService } from 'src/app/services/rest/rest.service';

@Injectable({
  providedIn: 'root'
})
export class GardensService {
  private prefix = '/gardens';

  constructor(@Inject(RestService) private rest: RestService) {}

  public getFromBounds(bounds: LatLngBounds): Observable<Garden[]> {
    return new Observable<Garden[]>(observe => {
      const polygon = [
        [
          bounds.getNorthWest().lng,
          bounds.getNorthWest().lat
        ],
        [
          bounds.getNorthEast().lng,
          bounds.getNorthEast().lat
        ],
        [
          bounds.getSouthEast().lng,
          bounds.getSouthEast().lat
        ],
        [
          bounds.getSouthWest().lng,
          bounds.getSouthWest().lat
        ],
        [
          bounds.getNorthWest().lng,
          bounds.getNorthWest().lat
        ]
      ];
      const url = `${this.prefix}?polygon=${JSON.stringify(polygon)}`;

      this.rest.get(url).subscribe((data: any[]) => {
        observe.next(data.map(garden => new Garden(garden)));
        observe.complete();
      });
    });
  }
}
